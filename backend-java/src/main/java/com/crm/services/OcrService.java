package com.crm.services;

import com.crm.models.DatosFinancieros;
import com.crm.models.DocumentoOcr;
import com.crm.models.Expediente;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Servicio OCR con IA Vision.
 * Módulo II — Extracción de las 6 variables de la Hoja Amarilla + Calificación Financiera.
 * Módulo IV — Validación estricta de documentos del expediente (solo escaneos).
 *
 * REGLAS CRÍTICAS DE PROFORMA V4.1:
 * - Perfiles: NOMINA (>5K + 0 retenciones) | DOMICILIADO (retenciones + banco OK) | NO_APTO
 * - Bancos autorizados solo: BBVA, Banamex, Banorte, HSBC, Santander
 * - Documentos: SOLO escaneos PDF. Fotos de celular → RECHAZADO (excepto FOTO_INE)
 * - Estados de cuenta: 2 meses consecutivos
 * - Resumen movimientos: 60 días, caduca a los 2 días de expedición
 * - Comprobante domicilio: máx 3 meses de antigüedad
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class OcrService {

    @Value("${openai.api-key}")
    private String openaiKey;

    @Value("${openai.model}")
    private String openaiModel;

    @Value("${openai.api-url}")
    private String openaiUrl;

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    /** Bancos autorizados para perfil DOMICILIADO — Proforma V4.1 §5.2 */
    private static final Set<String> BANCOS_AUTORIZADOS = Set.of(
        "bbva", "banamex", "banorte", "hsbc", "santander",
        "bancomer", "citibanamex", "citi" // variantes comunes del nombre
    );

    // =========================================================================
    //  MÓDULO II — Extracción Hoja Amarilla + Calificación Financiera
    // =========================================================================

    /**
     * Extrae las 6 variables de la Hoja Amarilla y clasifica el perfil financiero.
     * Proforma V4.1 §5 — Matriz de Calificación Binaria.
     */
    public DatosFinancieros extraerDatosHojaAmarilla(MultipartFile imagen) {
        try {
            String base64 = Base64.getEncoder().encodeToString(imagen.getBytes());
            String mimeType = imagen.getContentType() != null ? imagen.getContentType() : "image/jpeg";

            String prompt = """
                Eres un extractor especializado en documentos IMSS México (Resolución de Pensión / Hoja Amarilla).
                
                Extrae EXACTAMENTE estas 6 variables del documento y responde SOLO en JSON válido:
                {
                  "nombre_completo": "TEXTO o null",
                  "curp": "18 caracteres o null",
                  "nss": "11 dígitos exactos o null",
                  "monto_pension_actual": número sin comas ni símbolo o null,
                  "institucion_bancaria": "nombre exacto del banco o null",
                  "tiene_retenciones": true o false
                }
                
                Reglas estrictas:
                - "tiene_retenciones" = true si hay CUALQUIER retención activa en el documento (ISSSTE, préstamos, pensión alimenticia, etc.)
                - "tiene_retenciones" = false si NO aparece ninguna retención
                - Para "institucion_bancaria" usar: BBVA, Banamex, Banorte, HSBC, Santander u otro nombre exacto
                - Si un dato no es legible, devuelve null
                - Responde SOLO el JSON, sin texto adicional, sin bloques markdown
                """;

            var requestBody = Map.of(
                "model", openaiModel,
                "max_tokens", 500,
                "messages", List.of(Map.of(
                    "role", "user",
                    "content", List.of(
                        Map.of("type", "text", "text", prompt),
                        Map.of("type", "image_url", "image_url",
                            Map.of("url", "data:" + mimeType + ";base64," + base64,
                                   "detail", "high"))
                    )
                ))
            );

            String respuesta = webClientBuilder.build()
                .post()
                .uri(openaiUrl + "/chat/completions")
                .header("Authorization", "Bearer " + openaiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .block();

            DatosFinancieros datos = parsearRespuestaIA(respuesta);

            // === CALIFICACIÓN FINANCIERA — Proforma V4.1 §5 ===
            clasificarPerfil(datos);

            return datos;

        } catch (Exception e) {
            log.error("Error al procesar Hoja Amarilla: {}", e.getMessage());
            return DatosFinancieros.builder()
                .observaciones("Error al procesar: " + e.getMessage())
                .confianzaOcr(0.0)
                .perfilCalificacion("ERROR")
                .build();
        }
    }

    /**
     * Aplica la matriz de calificación binaria de la Proforma V4.1 §5.
     *
     * NOMINA:      Pensión > 5000 MXN Y retenciones = false
     * DOMICILIADO: (retenciones = true O pensión < 5000) Y banco autorizado
     * NO_APTO:     Domiciliado pero banco NO autorizado
     */
    private void clasificarPerfil(DatosFinancieros datos) {
        BigDecimal monto = datos.getMontoPensionActual();
        Boolean retenciones = datos.getTieneRetenciones();
        String banco = datos.getInstitucionBancaria();

        boolean tieneDatos = monto != null && retenciones != null;
        if (!tieneDatos) {
            datos.setPerfilCalificacion("PENDIENTE_REVISION");
            datos.setBancoAutorizado(false);
            return;
        }

        boolean bancoOk = banco != null && BANCOS_AUTORIZADOS.contains(banco.toLowerCase().trim());
        datos.setBancoAutorizado(bancoOk);

        boolean esPensionAlta = monto.compareTo(new BigDecimal("5000")) > 0;
        boolean sinRetenciones = !retenciones;

        if (esPensionAlta && sinRetenciones) {
            // Perfil NÓMINA: flujo independiente
            datos.setPerfilCalificacion("NOMINA");
            log.info("Clasificación: NÓMINA — Pensión: {} | Retenciones: false", monto);

        } else if (bancoOk) {
            // Perfil DOMICILIADO: apto para agente de IA
            // REGLA CLAVE: Si tiene retenciones Y banco autorizado → DOMICILIADO (sin importar monto)
            datos.setPerfilCalificacion("DOMICILIADO");
            log.info("Clasificación: DOMICILIADO — Banco: {} | Retenciones: {} | Monto: {}",
                banco, retenciones, monto);

        } else {
            // NO APTO: banco no autorizado
            datos.setPerfilCalificacion("NO_APTO");
            log.info("Clasificación: NO_APTO — Banco no autorizado: {}", banco);
        }
    }

    // =========================================================================
    //  MÓDULO IV — Validación Estricta de Documentos
    // =========================================================================

    /**
     * Valida documentos del expediente con reglas estrictas de la Proforma V4.1 §7.
     *
     * REGLA DE ORO: Solo escaneos PDF. Fotos de celular → RECHAZADO inmediato.
     * Excepción ÚNICA: FOTO_INE (por naturaleza es fotografía).
     */
    public DocumentoOcr validarDocumento(MultipartFile imagen, String tipoDocumento) {
        try {
            String base64 = Base64.getEncoder().encodeToString(imagen.getBytes());
            String mimeType = imagen.getContentType() != null ? imagen.getContentType() : "image/jpeg";

            String prompt = buildPromptPorTipo(tipoDocumento);

            var requestBody = Map.of(
                "model", openaiModel,
                "max_tokens", 400,
                "messages", List.of(Map.of(
                    "role", "user",
                    "content", List.of(
                        Map.of("type", "text", "text", prompt),
                        Map.of("type", "image_url", "image_url",
                            Map.of("url", "data:" + mimeType + ";base64," + base64))
                    )
                ))
            );

            String respuesta = webClientBuilder.build()
                .post()
                .uri(openaiUrl + "/chat/completions")
                .header("Authorization", "Bearer " + openaiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .block();

            return parsearValidacionDocumento(respuesta, tipoDocumento);

        } catch (Exception e) {
            log.error("Error al validar documento {}: {}", tipoDocumento, e.getMessage());
            return DocumentoOcr.builder()
                .tipoDocumento(tipoDocumento)
                .estado(Expediente.EstadoDocumento.RECHAZADO)
                .observaciones("Error al procesar: " + e.getMessage())
                .puntajeCalidad(0.0)
                .build();
        }
    }

    /**
     * Construye el prompt de validación según el tipo de documento.
     * Proforma V4.1 §7.1 — Criterios de aceptación y motivos de rechazo.
     */
    private String buildPromptPorTipo(String tipo) {
        return switch (tipo.toUpperCase()) {

            case "INE" -> """
                Analiza esta imagen de una INE (Credencial para Votar) mexicana y responde en JSON:
                
                REGLAS DE ACEPTACIÓN (Proforma V4.1):
                - Debe ser un ESCANEO de escáner físico, NO una fotografía de celular
                - Debe mostrar AMBOS lados (frente y reverso)
                - Debe ser 100% legible, sin bordes cortados ni reflejos
                - Los datos (nombre, CURP, folio) deben ser completamente visibles
                
                MOTIVOS DE RECHAZO:
                - Foto tomada con celular → rechazar inmediatamente
                - Solo un lado → rechazar
                - Borrosa o recortada → rechazar
                
                Responde SOLO en JSON válido:
                {
                  "legible": true/false,
                  "tiene_frente": true/false,
                  "tiene_reverso": true/false,
                  "parece_escaneo": true/false,
                  "datos_visibles": true/false,
                  "puntaje_calidad": número 0.0-1.0,
                  "motivo_rechazo": "texto específico o null si aprobado",
                  "observaciones": "texto"
                }
                """;

            case "COMPROBANTE_DOMICILIO" -> """
                Analiza este comprobante de domicilio y responde en JSON.
                
                REGLAS DE ACEPTACIÓN (Proforma V4.1):
                - Debe ser ESCANEO de escáner físico, NO fotografía de celular
                - Puede ser: recibo de luz (CFE), agua o telefonía fija
                - Máximo 3 meses de antigüedad desde la fecha de hoy
                - Debe mostrar nombre, domicilio y fecha claramente
                - Debe estar completo (sin páginas faltantes ni márgenes cortados)
                
                MOTIVOS DE RECHAZO:
                - Foto tomada con celular → rechazar
                - Antigüedad mayor a 3 meses → rechazar
                - Documento incompleto o borroso → rechazar
                
                Responde SOLO en JSON válido:
                {
                  "legible": true/false,
                  "parece_escaneo": true/false,
                  "fecha_visible": true/false,
                  "fecha_estimada": "YYYY-MM o null",
                  "posiblemente_vencido": true/false,
                  "domicilio_visible": true/false,
                  "tipo_comprobante": "CFE/AGUA/TELEFONIA/OTRO",
                  "puntaje_calidad": número 0.0-1.0,
                  "motivo_rechazo": "texto específico o null si aprobado",
                  "observaciones": "texto"
                }
                """;

            case "RESOLUCION_PENSION" -> """
                Analiza este documento de Resolución de Pensión del IMSS y responde en JSON.
                
                REGLAS DE ACEPTACIÓN (Proforma V4.1):
                - Debe ser ESCANEO de escáner físico, NO fotografía de celular
                - Debe estar completo (sin páginas faltantes ni márgenes cortados)
                - Debe ser legible en su totalidad
                
                MOTIVOS DE RECHAZO:
                - Foto tomada con celular → rechazar
                - Páginas incompletas → rechazar
                - Ilegible → rechazar
                
                Responde SOLO en JSON válido:
                {
                  "legible": true/false,
                  "parece_escaneo": true/false,
                  "completo": true/false,
                  "puntaje_calidad": número 0.0-1.0,
                  "motivo_rechazo": "texto específico o null si aprobado",
                  "observaciones": "texto"
                }
                """;

            case "ESTADO_CUENTA" -> """
                Analiza este estado de cuenta bancario y responde en JSON.
                
                REGLAS DE ACEPTACIÓN (Proforma V4.1 §7.1):
                - Debe ser ESCANEO de escáner físico, NO fotografía de celular
                - Debe cubrir los ÚLTIMOS 2 MESES CONSECUTIVOS (no pueden haber brechas entre periodos)
                - Debe mostrar claramente: nombre del titular, número de cuenta, banco y periodo
                - Debe estar completo y ser legible
                
                MOTIVOS DE RECHAZO:
                - Foto tomada con celular → rechazar
                - No cubre 2 meses consecutivos → rechazar
                - Meses no consecutivos (salto de mes) → rechazar
                - Borroso o incompleto → rechazar
                
                Responde SOLO en JSON válido:
                {
                  "legible": true/false,
                  "parece_escaneo": true/false,
                  "periodo_visible": true/false,
                  "meses_cubiertos": número estimado,
                  "meses_consecutivos": true/false,
                  "banco_visible": true/false,
                  "titular_visible": true/false,
                  "puntaje_calidad": número 0.0-1.0,
                  "motivo_rechazo": "texto específico o null si aprobado",
                  "observaciones": "texto"
                }
                """;

            case "RESUMEN_MOVIMIENTOS" -> """
                Analiza este resumen de movimientos bancarios y responde en JSON.
                
                REGLAS DE ACEPTACIÓN (Proforma V4.1 §7.1):
                - Debe ser ESCANEO de escáner físico, NO fotografía de celular
                - Debe cubrir un rango de EXACTAMENTE 60 DÍAS o más
                - CADUCA: si fue expedido hace más de 2 días, se considera vencido
                - Debe pertenecer al banco correcto del lead (no otro banco)
                - Debe ser legible y completo
                
                MOTIVOS DE RECHAZO:
                - Foto tomada con celular → rechazar
                - Cubre menos de 60 días → rechazar
                - Borroso o incompleto → rechazar
                
                Responde SOLO en JSON válido:
                {
                  "legible": true/false,
                  "parece_escaneo": true/false,
                  "fecha_expedicion_visible": true/false,
                  "fecha_expedicion_estimada": "YYYY-MM-DD o null",
                  "dias_cubiertos_estimados": número o null,
                  "cubre_60_dias": true/false,
                  "banco_visible": true/false,
                  "titular_visible": true/false,
                  "puntaje_calidad": número 0.0-1.0,
                  "motivo_rechazo": "texto específico o null si aprobado",
                  "observaciones": "texto"
                }
                """;

            case "FOTO_INE" -> """
                Analiza esta fotografía de validación biométrica (persona sosteniendo su INE).
                
                NOTA: Este es el ÚNICO documento donde se acepta fotografía (no escaneo).
                
                REGLAS DE ACEPTACIÓN (Proforma V4.1 §7.2 y §10):
                - Debe verse el rostro de la persona claramente
                - Debe ver la INE sostenida a la altura del rostro, ambas manos visibles
                - Debe ser al menos de medio cuerpo
                - Los datos de la INE deben ser legibles en la foto
                
                MOTIVOS DE RECHAZO:
                - Rostro no visible o muy oscuro
                - INE no visible o muy borrosa
                - Foto muy alejada (no se ven detalles)
                
                Responde SOLO en JSON válido:
                {
                  "rostro_visible": true/false,
                  "ine_presente": true/false,
                  "ine_legible": true/false,
                  "medio_cuerpo": true/false,
                  "puntaje_calidad": número 0.0-1.0,
                  "motivo_rechazo": "texto específico o null si aprobado",
                  "observaciones": "texto"
                }
                """;

            default -> """
                Analiza este documento y responde en JSON.
                
                REGLA: Debe ser un escaneo de escáner, NO una fotografía de celular.
                
                Responde SOLO en JSON válido:
                {
                  "legible": true/false,
                  "parece_escaneo": true/false,
                  "completo": true/false,
                  "puntaje_calidad": número 0.0-1.0,
                  "motivo_rechazo": "texto específico o null si aprobado",
                  "observaciones": "texto"
                }
                """;
        };
    }

    // =========================================================================
    //  Parsers de respuesta
    // =========================================================================

    private DatosFinancieros parsearRespuestaIA(String respuestaJson) {
        try {
            JsonNode root = objectMapper.readTree(respuestaJson);
            String contenido = root.path("choices").get(0).path("message").path("content").asText();
            contenido = contenido.replace("```json", "").replace("```", "").trim();

            JsonNode datos = objectMapper.readTree(contenido);

            return DatosFinancieros.builder()
                .nombreCompleto(getTextOrNull(datos, "nombre_completo"))
                .curp(getTextOrNull(datos, "curp"))
                .nss(getTextOrNull(datos, "nss"))
                .montoPensionActual(datos.has("monto_pension_actual") && !datos.get("monto_pension_actual").isNull()
                    ? new BigDecimal(datos.get("monto_pension_actual").asText()) : null)
                .institucionBancaria(getTextOrNull(datos, "institucion_bancaria"))
                .tieneRetenciones(datos.has("tiene_retenciones") && !datos.get("tiene_retenciones").isNull()
                    ? datos.get("tiene_retenciones").asBoolean() : null)
                .confianzaOcr(0.9)
                .build();

        } catch (Exception e) {
            log.error("Error al parsear respuesta IA: {}", e.getMessage());
            return DatosFinancieros.builder()
                .observaciones("No se pudo parsear la respuesta de la IA")
                .confianzaOcr(0.0)
                .build();
        }
    }

    private DocumentoOcr parsearValidacionDocumento(String respuestaJson, String tipo) {
        try {
            JsonNode root = objectMapper.readTree(respuestaJson);
            String contenido = root.path("choices").get(0).path("message").path("content").asText();
            contenido = contenido.replace("```json", "").replace("```", "").trim();

            JsonNode datos = objectMapper.readTree(contenido);

            boolean legible   = datos.has("legible") && datos.get("legible").asBoolean();
            boolean escaneo   = !datos.has("parece_escaneo") || datos.get("parece_escaneo").asBoolean();
            double  puntaje   = datos.has("puntaje_calidad") ? datos.get("puntaje_calidad").asDouble() : 0.5;
            String  motivoRec = datos.has("motivo_rechazo") && !datos.get("motivo_rechazo").isNull()
                                ? datos.get("motivo_rechazo").asText() : null;
            String  obs       = datos.has("observaciones") ? datos.get("observaciones").asText() : "";

            // Para FOTO_INE el escaneo no aplica
            boolean fotoIne = "FOTO_INE".equalsIgnoreCase(tipo);
            boolean aprobado;

            if (fotoIne) {
                boolean rostro = datos.has("rostro_visible") && datos.get("rostro_visible").asBoolean();
                boolean ine    = datos.has("ine_presente")   && datos.get("ine_presente").asBoolean();
                aprobado = rostro && ine && puntaje >= 0.65;
            } else {
                // Regla de oro: sin escaneo → RECHAZADO inmediato
                aprobado = legible && escaneo && puntaje >= 0.70 && motivoRec == null;
            }

            // Validaciones extra por tipo de documento
            if (aprobado && "ESTADO_CUENTA".equalsIgnoreCase(tipo)) {
                boolean consecutivos = !datos.has("meses_consecutivos") || datos.get("meses_consecutivos").asBoolean();
                int meses = datos.has("meses_cubiertos") ? datos.get("meses_cubiertos").asInt() : 0;
                if (!consecutivos || meses < 2) {
                    aprobado = false;
                    motivoRec = "Los estados de cuenta deben cubrir los últimos 2 meses consecutivos. " + obs;
                }
            }

            if (aprobado && "RESUMEN_MOVIMIENTOS".equalsIgnoreCase(tipo)) {
                boolean cubre60 = datos.has("cubre_60_dias") && datos.get("cubre_60_dias").asBoolean();
                if (!cubre60) {
                    aprobado = false;
                    motivoRec = "El resumen de movimientos debe cubrir exactamente 60 días. " + obs;
                }
            }

            // Mensaje de rechazo específico (NUNCA genérico — Proforma V4.1 §7.3)
            String mensajeRechazo = null;
            if (!aprobado) {
                if (!escaneo && !fotoIne) {
                    mensajeRechazo = "❌ *" + formatTipoDoc(tipo) + " RECHAZADO*\n\n" +
                        "*Motivo:* Documento enviado como fotografía de celular. " +
                        "El IMSS rechaza documentos con sombras o bordes cortados. " +
                        "Por favor escanéalo con un escáner físico (puedes ir a un cibercafé) y envíalo en PDF. " +
                        "La única excepción es la foto sosteniendo la INE, que se solicita al final del proceso.";
                } else if (motivoRec != null) {
                    mensajeRechazo = "❌ *" + formatTipoDoc(tipo) + " RECHAZADO*\n\n*Motivo:* " + motivoRec;
                } else {
                    mensajeRechazo = "❌ *" + formatTipoDoc(tipo) + " RECHAZADO*\n\n*Motivo:* " + obs;
                }
            }

            return DocumentoOcr.builder()
                .tipoDocumento(tipo)
                .estado(aprobado
                    ? Expediente.EstadoDocumento.APROBADO
                    : Expediente.EstadoDocumento.RECHAZADO)
                .puntajeCalidad(puntaje)
                .observaciones(aprobado ? obs : mensajeRechazo)
                .build();

        } catch (Exception e) {
            return DocumentoOcr.builder()
                .tipoDocumento(tipo)
                .estado(Expediente.EstadoDocumento.ILEGIBLE)
                .puntajeCalidad(0.0)
                .observaciones("Error al parsear validación: " + e.getMessage())
                .build();
        }
    }

    private String getTextOrNull(JsonNode node, String field) {
        return node.has(field) && !node.get(field).isNull() ? node.get(field).asText() : null;
    }

    private String formatTipoDoc(String tipo) {
        return switch (tipo.toUpperCase()) {
            case "INE"                  -> "INE";
            case "COMPROBANTE_DOMICILIO"-> "Comprobante de Domicilio";
            case "RESOLUCION_PENSION"   -> "Resolución de Pensión";
            case "ESTADO_CUENTA"        -> "Estado de Cuenta";
            case "RESUMEN_MOVIMIENTOS"  -> "Resumen de Movimientos";
            case "FOTO_INE"             -> "Foto con INE";
            default                     -> tipo;
        };
    }
}
