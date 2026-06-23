package com.crm.services;

import com.crm.models.Expediente;
import com.crm.models.Prospecto;
import com.crm.repositories.ExpedienteRepository;
import com.crm.repositories.ProspectoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Servicio principal de gestión de expedientes.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class ExpedienteService {

    private final ProspectoRepository prospectoRepository;
    private final ExpedienteRepository expedienteRepository;
    private final GoogleDriveService driveService;
    private final GoogleSheetsService sheetsService;
    private final ValidacionService validacionService;

    /**
     * Normaliza el teléfono: quita +, espacios, y el "1" móvil mexicano.
     * Ej: "+5219613309389" → "529613309389"
     */
    private String normalizarTelefono(String tel) {
        if (tel == null) return "";
        String limpio = tel.replaceAll("[\\s+\\-()]", "");
        // Si tiene 521 + 10 dígitos → quitar el 1
        if (limpio.matches("521\\d{10}")) {
            limpio = "52" + limpio.substring(3);
        }
        return limpio;
    }

    public String checkDuplicates(String curp, String nss) {
        if (curp != null && !curp.isBlank() && prospectoRepository.findByCurp(curp.toUpperCase().trim()).isPresent()) {
            return "Esta CURP ya está registrada en nuestro sistema. El proceso ya está en curso para esta persona.";
        }
        if (nss != null && !nss.isBlank() && prospectoRepository.findByNss(nss.trim()).isPresent()) {
            return "Este Número de Seguridad Social ya está registrado en nuestro sistema.";
        }
        return null;
    }

    /**
     * Registra un nuevo prospecto desde WhatsApp (Módulo I).
     * Si el teléfono ya existe, actualiza los datos del prospecto existente.
     */
    public Prospecto registrarProspecto(String nombre, String telefono, String curp,
                                        String nss, String canal) {
        String telNorm = normalizarTelefono(telefono);

        // Buscar si ya existe un prospecto con el mismo teléfono
        Optional<Prospecto> existente = prospectoRepository.findByTelefonoContacto(telNorm);
        if (existente.isEmpty()) {
            // Intentar con variante 521
            String tel521 = telefono != null ? telefono.replaceAll("[\\s+\\-()]", "") : "";
            existente = prospectoRepository.findByTelefonoContacto(tel521);
        }

        if (existente.isPresent()) {
            // Ya existe: actualizar datos del prospecto existente
            Prospecto p = existente.get();
            if (curp != null && !curp.isBlank()) p.setCurp(curp.toUpperCase().trim());
            if (nss != null && !nss.isBlank()) p.setNss(nss.trim());
            if (nombre != null && !nombre.isBlank()) p.setNombreCompleto(nombre.toUpperCase().trim());

            ValidacionService.ResultadoValidacion validacion =
                validacionService.validarProspecto(p.getCurp(), p.getNss(), null, p.getTelefonoContacto());
            p.setCurpValida(validacion.curpValida());
            p.setNssValido(validacion.nssValido());
            if (validacion.isValido()) p.setEstatus(Prospecto.EstatusProspecto.VIABLE);

            log.info("Prospecto existente actualizado por teléfono: {}", telNorm);
            return prospectoRepository.save(p);
        }

        // Validar duplicados por CURP/NSS
        String duplicateError = checkDuplicates(curp, nss);
        if (duplicateError != null) {
            throw new IllegalArgumentException("DUPLICATE: " + duplicateError);
        }

        ValidacionService.ResultadoValidacion validacion =
            validacionService.validarProspecto(curp, nss, null, telefono);

        Prospecto prospecto = Prospecto.builder()
            .nombreCompleto(nombre.toUpperCase())
            .telefonoContacto(telNorm)
            .curp(curp != null ? curp.toUpperCase() : null)
            .nss(nss)
            .origenCanal(canal != null ? canal : "WhatsApp")
            .curpValida(validacion.curpValida())
            .nssValido(validacion.nssValido())
            .estatus(validacion.isValido() ? Prospecto.EstatusProspecto.VIABLE : Prospecto.EstatusProspecto.VALIDANDO)
            .build();

        Prospecto guardado = prospectoRepository.save(prospecto);

        // Crear expediente vacío
        Expediente expediente = Expediente.builder()
            .prospecto(guardado)
            .nombreCarpetaDrive(String.format("%s %s %s", nombre.toUpperCase(), curp, nss))
            .build();
        expedienteRepository.save(expediente);

        // Registrar en Google Sheets
        try {
            sheetsService.registrarProspecto(guardado);
        } catch (Exception e) {
            log.warn("No se pudo registrar en Sheets: {}", e.getMessage());
        }

        return guardado;
    }

    /**
     * Crea la carpeta en Drive y actualiza el expediente (Módulo IV).
     */
    public String inicializarCarpetaDrive(Long expedienteId) {
        Expediente exp = expedienteRepository.findById(expedienteId)
            .orElseThrow(() -> new RuntimeException("Expediente no encontrado: " + expedienteId));

        Prospecto p = exp.getProspecto();
        String carpetaId = driveService.crearCarpetaProspecto(
            p.getNombreCompleto(), p.getCurp(), p.getNss());
        String urlCarpeta = driveService.obtenerUrlCarpeta(carpetaId);

        exp.setUrlCarpetaDrive(urlCarpeta);
        expedienteRepository.save(exp);

        return urlCarpeta;
    }

    /**
     * Aprueba un expediente (Módulo V — Panel del Superior).
     */
    public Expediente aprobarExpediente(Long expedienteId, String aprobadoPor) {
        Expediente exp = expedienteRepository.findById(expedienteId)
            .orElseThrow(() -> new RuntimeException("Expediente no encontrado: " + expedienteId));

        exp.setAprobacionSuperior(true);
        exp.setAprobadoPor(aprobadoPor);
        exp.setEstatusExpediente(Expediente.EstatusExpediente.APROBADO);

        Prospecto p = exp.getProspecto();
        p.setEstatus(Prospecto.EstatusProspecto.FORMALIZADO);
        prospectoRepository.save(p);

        return expedienteRepository.save(exp);
    }

    public Expediente actualizarExpedienteCompleto(Long prospectoId, java.util.Map<String, Object> body) {
        Prospecto p = prospectoRepository.findById(prospectoId)
            .orElseThrow(() -> new RuntimeException("Prospecto no encontrado: " + prospectoId));
        Expediente exp = expedienteRepository.findByProspecto(p)
            .orElseThrow(() -> new RuntimeException("Expediente no encontrado para prospecto: " + prospectoId));

        // Datos del prospecto
        if (body.containsKey("nombreCompleto")) p.setNombreCompleto(((String) body.get("nombreCompleto")).toUpperCase());
        if (body.containsKey("curp")) p.setCurp(((String) body.get("curp")).toUpperCase());
        if (body.containsKey("nss")) p.setNss((String) body.get("nss"));
        if (body.containsKey("telefonoContacto")) p.setTelefonoContacto((String) body.get("telefonoContacto"));
        if (body.containsKey("correoElectronico")) p.setCorreoElectronico((String) body.get("correoElectronico"));
        if (body.containsKey("correoSipre")) p.setCorreoSipre((String) body.get("correoSipre"));
        if (body.containsKey("contactado")) p.setContactado((Boolean) body.get("contactado"));
        if (body.containsKey("origenCanal")) p.setOrigenCanal((String) body.get("origenCanal"));
        if (body.containsKey("estatus") && body.get("estatus") != null && !((String) body.get("estatus")).isBlank()) {
            p.setEstatus(Prospecto.EstatusProspecto.valueOf((String) body.get("estatus")));
        }

        // Validar CURP y NSS si cambiaron
        if (body.containsKey("curp") || body.containsKey("nss")) {
            ValidacionService.ResultadoValidacion val = validacionService.validarProspecto(p.getCurp(), p.getNss(), null, p.getTelefonoContacto());
            p.setCurpValida(val.curpValida());
            p.setNssValido(val.nssValido());
        }
        prospectoRepository.save(p);

        // Datos Financieros / Expediente
        if (body.containsKey("montoPensionActual")) exp.setMontoPensionActual(parseBigDecimal(body.get("montoPensionActual")));
        if (body.containsKey("institucionBancaria")) exp.setInstitucionBancaria((String) body.get("institucionBancaria"));
        if (body.containsKey("cuentaClabe")) exp.setCuentaClabe((String) body.get("cuentaClabe"));
        if (body.containsKey("aumentoPension")) exp.setAumentoPension(parseBigDecimal(body.get("aumentoPension")));
        if (body.containsKey("retroactivoFicticio")) exp.setRetroactivoFicticio(parseBigDecimal(body.get("retroactivoFicticio")));
        if (body.containsKey("retroactivoFinal")) exp.setRetroactivoFinal(parseBigDecimal(body.get("retroactivoFinal")));
        if (body.containsKey("linkConstancia")) exp.setLinkConstancia((String) body.get("linkConstancia"));
        if (body.containsKey("evidenciaTipo")) exp.setEvidenciaTipo((String) body.get("evidenciaTipo"));
        if (body.containsKey("pagado")) exp.setPagado((Boolean) body.get("pagado"));
        if (body.containsKey("estatusExpediente") && body.get("estatusExpediente") != null && !((String) body.get("estatusExpediente")).isBlank()) {
            exp.setEstatusExpediente(Expediente.EstatusExpediente.valueOf((String) body.get("estatusExpediente")));
        }
        if (body.containsKey("nombreCarpetaDrive")) exp.setNombreCarpetaDrive((String) body.get("nombreCarpetaDrive"));
        
        return expedienteRepository.save(exp);
    }

    private java.math.BigDecimal parseBigDecimal(Object val) {
        if (val == null) return null;
        if (val instanceof Number) return new java.math.BigDecimal(val.toString());
        if (val instanceof String && !((String) val).isBlank()) return new java.math.BigDecimal((String) val);
        return null;
    }

    public List<Prospecto> listarProspectos() {
        return prospectoRepository.findAllByOrderByFechaIngresoDesc();
    }

    public Optional<Expediente> obtenerExpedientePorCurp(String curp) {
        return prospectoRepository.findByCurp(curp)
            .flatMap(p -> expedienteRepository.findByProspecto(p));
    }

    public Optional<Expediente> obtenerExpediente(Long id) {
        return expedienteRepository.findById(id);
    }

    /**
     * Aplica la calificación financiera del Módulo 2 (OCR de Hoja Amarilla).
     */
    public Expediente calificarExpediente(String curp, java.math.BigDecimal montoPension, String banco, String tipoCredito, java.math.BigDecimal retenciones, boolean viable) {
        Expediente exp = obtenerExpedientePorCurp(curp)
            .orElseThrow(() -> new RuntimeException("Expediente no encontrado para la CURP: " + curp));

        exp.setMontoPensionActual(montoPension);
        exp.setInstitucionBancaria(banco);
        exp.setTipoCredito(tipoCredito);
        exp.setRetenciones(retenciones);
        
        Prospecto p = exp.getProspecto();
        if (viable) {
            p.setEstatus(Prospecto.EstatusProspecto.VIABLE);
        } else {
            p.setEstatus(Prospecto.EstatusProspecto.NO_VIABLE);
            exp.setEstatusExpediente(Expediente.EstatusExpediente.RECHAZADO);
            exp.setResolucionPension(Expediente.EstadoDocumento.RECHAZADO);
        }

        prospectoRepository.save(p);
        return expedienteRepository.save(exp);
    }
}
