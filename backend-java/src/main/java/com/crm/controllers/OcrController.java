package com.crm.controllers;

import com.crm.models.DatosFinancieros;
import com.crm.models.DocumentoOcr;
import com.crm.models.Prospecto;
import com.crm.models.Expediente;
import com.crm.repositories.ProspectoRepository;
import com.crm.repositories.ExpedienteRepository;
import com.crm.services.OcrService;
import com.crm.services.GoogleDriveService;
import com.crm.services.GoogleSheetsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * Controlador de procesamiento OCR de documentos.
 * Módulo II — Hoja Amarilla (batch).
 * Módulo IV — Validación de documentos del expediente.
 */
@RestController
@RequestMapping("/ocr")
@Slf4j
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class OcrController {

    private final OcrService ocrService;
    private final GoogleDriveService driveService;
    private final GoogleSheetsService sheetsService;
    private final ProspectoRepository prospectoRepository;
    private final ExpedienteRepository expedienteRepository;

    /**
     * Extrae datos de la Hoja Amarilla (Resolución de Pensión IMSS).
     * Llamado por n8n en Módulo II — lote de hasta 10 imágenes.
     */
    @PostMapping("/hoja-amarilla")
    public ResponseEntity<DatosFinancieros> procesarHojaAmarilla(
            @RequestParam("imagen") MultipartFile imagen,
            @RequestParam("curp") String curp) {

        log.info("Procesando Hoja Amarilla para CURP: {}", curp);

        DatosFinancieros datos = ocrService.extraerDatosHojaAmarilla(imagen);

        // Actualizar en Sheets automáticamente
        if (datos.getMontoPensionActual() != null) {
            try {
                sheetsService.actualizarDatosOcr(
                    curp,
                    datos.getMontoPensionActual().toString(),
                    datos.getInstitucionBancaria(),
                    datos.getCuentaClabe(),
                    null
                );
            } catch (Exception e) {
                log.warn("No se pudo actualizar Sheets: {}", e.getMessage());
            }
        }

        return ResponseEntity.ok(datos);
    }

    /**
     * Valida un documento del expediente por tipo.
     * Tipos: INE, COMPROBANTE_DOMICILIO, RESOLUCION_PENSION,
     *        ESTADO_CUENTA, FOTO_INE
     */
    @PostMapping("/validar-documento")
    public ResponseEntity<DocumentoOcr> validarDocumento(
            @RequestParam("imagen") MultipartFile imagen,
            @RequestParam("tipo") String tipo,
            @RequestParam(value = "carpeta_id", required = false) String carpetaId,
            @RequestParam(value = "telefono", required = false) String telefono) {

        log.info("Validando documento tipo: {} para Telefono: {}", tipo, telefono);

        DocumentoOcr resultado = ocrService.validarDocumento(imagen, tipo);

        // Si el documento es aprobado y tenemos el teléfono, subir a la carpeta del prospecto
        if (resultado.getEstado() == Expediente.EstadoDocumento.APROBADO && telefono != null && !telefono.isBlank()) {
            try {
                // Normalizar teléfono igual que en ExpedienteService
                String telLimpio = telefono.replaceAll("[\\s+\\-()]", "");
                if (telLimpio.matches("521\\d{10}")) {
                    telLimpio = "52" + telLimpio.substring(3);
                }
                
                var prospectoOpt = prospectoRepository.findByTelefonoContacto(telLimpio);
                if (prospectoOpt.isPresent()) {
                    Prospecto p = prospectoOpt.get();
                    String curp = p.getCurp() != null ? p.getCurp() : "SD";
                    String nss = p.getNss() != null ? p.getNss() : "SD";
                    String nombreArchivo = tipo + "_" + curp + "_"
                        + System.currentTimeMillis() + getExtension(imagen.getOriginalFilename());
                    
                    // Crear o recuperar ID de carpeta del prospecto
                    String cId = driveService.crearCarpetaProspecto(p.getNombreCompleto(), curp, nss);
                    
                    try {
                        String urlDrive = driveService.subirDocumento(imagen, cId, nombreArchivo);
                        resultado.setUrlDrive(urlDrive);
                    } catch (Exception e) {
                        log.warn("Error al subir imagen a Drive (Continuando flujo...): {}", e.getMessage());
                    }
                    
                    // EXTRAER DATOS FINANCIEROS INMEDIATAMENTE SI ES RESOLUCION PENSION
                    if ("RESOLUCION_PENSION".equalsIgnoreCase(tipo)) {
                        log.info("Extrayendo datos de hoja amarilla en tiempo real...");
                        DatosFinancieros datos = ocrService.extraerDatosHojaAmarilla(imagen);
                        resultado.setDatosExtraidos(datos);
                        
                        if (datos.getMontoPensionActual() != null) {
                            try {
                                sheetsService.actualizarDatosOcr(
                                    curp,
                                    datos.getMontoPensionActual().toString(),
                                    datos.getInstitucionBancaria(),
                                    datos.getCuentaClabe(),
                                    null
                                );
                            } catch (Exception e) {
                                log.error("Error al actualizar Sheets en validacion: {}", e.getMessage());
                            }
                        }
                    }

                    // Asegurar que el expediente tenga el link de la carpeta
                    var expOpt = expedienteRepository.findByProspecto(p);
                    if (expOpt.isPresent()) {
                        Expediente exp = expOpt.get();

                        // Actualizar estado del documento específico
                        if ("INE".equalsIgnoreCase(tipo)) {
                            exp.setIneAmbosLados(Expediente.EstadoDocumento.APROBADO);
                        } else if ("COMPROBANTE_DOMICILIO".equalsIgnoreCase(tipo)) {
                            exp.setComprobanteDomicilio(Expediente.EstadoDocumento.APROBADO);
                        } else if ("RESOLUCION_PENSION".equalsIgnoreCase(tipo)) {
                            exp.setResolucionPension(Expediente.EstadoDocumento.APROBADO);
                            if (resultado.getDatosExtraidos() != null) {
                                exp.setMontoPensionActual(resultado.getDatosExtraidos().getMontoPensionActual());
                                exp.setInstitucionBancaria(resultado.getDatosExtraidos().getInstitucionBancaria());
                                exp.setCuentaClabe(resultado.getDatosExtraidos().getCuentaClabe());
                            }
                        } else if ("ESTADO_CUENTA".equalsIgnoreCase(tipo)) {
                            exp.setEstadosCuenta(Expediente.EstadoDocumento.APROBADO);
                        } else if ("RESUMEN_MOVIMIENTOS".equalsIgnoreCase(tipo)) {
                            exp.setResumenMovimientos(Expediente.EstadoDocumento.APROBADO);
                        } else if ("FOTO_INE".equalsIgnoreCase(tipo)) {
                            exp.setFotoConIne(Expediente.EstadoDocumento.APROBADO);
                        }

                        // Calcular completitud y siguiente paso
                        boolean isAuditoriaCompleta = exp.isAuditoriaDocumentalCompleta();
                        boolean isCierreCompleto = exp.isExpedienteCompleto();
                        
                        resultado.setExpedienteCompleto(isAuditoriaCompleta);
                        resultado.setExpedienteCierreCompleto(isCierreCompleto);

                        if (!isAuditoriaCompleta) {
                            if (exp.getIneAmbosLados() != Expediente.EstadoDocumento.APROBADO) {
                                resultado.setSiguienteDocumentoRequerido("INE");
                            } else if (exp.getComprobanteDomicilio() != Expediente.EstadoDocumento.APROBADO) {
                                resultado.setSiguienteDocumentoRequerido("COMPROBANTE_DOMICILIO");
                            } else if (exp.getResolucionPension() != Expediente.EstadoDocumento.APROBADO) {
                                resultado.setSiguienteDocumentoRequerido("RESOLUCION_PENSION");
                            } else if (exp.getEstadosCuenta() != Expediente.EstadoDocumento.APROBADO) {
                                resultado.setSiguienteDocumentoRequerido("ESTADO_CUENTA");
                            } else if (exp.getResumenMovimientos() != Expediente.EstadoDocumento.APROBADO) {
                                resultado.setSiguienteDocumentoRequerido("RESUMEN_MOVIMIENTOS");
                            }
                        } else if (!isCierreCompleto && "FOTO_INE".equalsIgnoreCase(tipo)) {
                            // If auditoria is done, but cierre is not complete
                            resultado.setSiguienteDocumentoRequerido("FOTO_INE");
                        }

                        if (exp.getUrlCarpetaDrive() == null) {
                            exp.setUrlCarpetaDrive(driveService.obtenerUrlCarpeta(cId));
                        }
                        expedienteRepository.save(exp);
                    }
                }
            } catch (Exception e) {
                log.warn("No se pudo subir a Drive: {}", e.getMessage());
            }
        } else if (carpetaId != null && !carpetaId.isBlank() && resultado.getEstado() == Expediente.EstadoDocumento.APROBADO) {
            try {
                String nombreArchivo = tipo + "_" + System.currentTimeMillis() + getExtension(imagen.getOriginalFilename());
                String urlDrive = driveService.subirDocumento(imagen, carpetaId, nombreArchivo);
                resultado.setUrlDrive(urlDrive);
            } catch (Exception e) {
                log.warn("No se pudo subir a Drive: {}", e.getMessage());
            }
        }

        return ResponseEntity.ok(resultado);
    }

    /**
     * Endpoint de salud para verificar que OCR está listo.
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
            "status", "ok",
            "service", "OCR Service",
            "model", "GPT-4o Vision"
        ));
    }

    private String getExtension(String filename) {
        if (filename == null) return ".jpg";
        int dot = filename.lastIndexOf('.');
        return dot > 0 ? filename.substring(dot) : ".jpg";
    }
}
