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
            exp.setResolucionPension(Expediente.EstadoDocumento.APROBADO);
        } else {
            p.setEstatus(Prospecto.EstatusProspecto.NO_VIABLE);
            exp.setEstatusExpediente(Expediente.EstatusExpediente.RECHAZADO);
            exp.setResolucionPension(Expediente.EstadoDocumento.RECHAZADO);
        }

        prospectoRepository.save(p);
        return expedienteRepository.save(exp);
    }
}
