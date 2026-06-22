package com.crm.controllers;

import com.crm.models.Prospecto;
import com.crm.services.ExpedienteService;
import com.crm.services.ValidacionService;
import com.crm.services.GoogleSheetsService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Webhook de WhatsApp Cloud API.
 * Módulo I — Ingesta y Validación.
 *
 * Endpoints:
 *  GET  /webhook/whatsapp  → Verificación del webhook (Meta)
 *  POST /webhook/whatsapp  → Recibe mensajes de WhatsApp
 */
@RestController
@RequestMapping("/webhook")
@Slf4j
@RequiredArgsConstructor
public class WebhookController {

    @Value("${whatsapp.verify-token}")
    private String verifyToken;

    private final ExpedienteService expedienteService;
    private final ValidacionService validacionService;
    private final ObjectMapper objectMapper;

    /**
     * Verificación del Webhook (paso requerido por Meta).
     */
    @GetMapping("/whatsapp")
    public ResponseEntity<String> verificarWebhook(
            @RequestParam("hub.mode") String mode,
            @RequestParam("hub.verify_token") String token,
            @RequestParam("hub.challenge") String challenge) {

        log.info("Verificación webhook recibida. Mode: {}", mode);

        if ("subscribe".equals(mode) && verifyToken.equals(token)) {
            log.info("Webhook verificado exitosamente");
            return ResponseEntity.ok(challenge);
        }

        log.warn("Fallo en verificación de webhook");
        return ResponseEntity.status(403).body("Forbidden");
    }

    /**
     * Recibe eventos de WhatsApp (mensajes, estados).
     * n8n también puede disparar este endpoint con datos preprocesados.
     */
    @PostMapping("/whatsapp")
    public ResponseEntity<Map<String, Object>> recibirMensaje(@RequestBody String payload) {
        try {
            log.info("Webhook WhatsApp recibido en Backend");
            
            // Reenviar a n8n basado en el tipo de mensaje
            try {
                org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
                org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
                headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
                org.springframework.http.HttpEntity<String> request = new org.springframework.http.HttpEntity<>(payload, headers);
                
                String targetWebhook = "http://crm-n8n:5678/webhook/whatsapp-ingesta"; // Por defecto (Texto / Módulo 1)
                
                try {
                    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(payload);
                    String tipo = root.path("entry").get(0).path("changes").get(0).path("value").path("messages").get(0).path("type").asText("");
                    if ("image".equals(tipo) || "document".equals(tipo)) {
                        targetWebhook = "http://crm-n8n:5678/webhook/whatsapp-documentos"; // Módulo 4
                    } else if ("interactive".equals(tipo)) {
                        String btnId = root.path("entry").get(0).path("changes").get(0)
                                .path("value").path("messages").get(0)
                                .path("interactive").path("button_reply").path("id").asText("");
                                
                        if ("BTN_TRAMITE_PROPIO".equals(btnId) || "BTN_TRAMITE_TERCERO".equals(btnId)) {
                            targetWebhook = "http://crm-n8n:5678/webhook/whatsapp-ingesta"; // Módulo 1
                        } else {
                            targetWebhook = "http://crm-n8n:5678/webhook/whatsapp-interactivo"; // Módulo 2 y 3 (Botones)
                        }
                    }
                } catch (Exception ignore) {
                }
                
                
                restTemplate.postForEntity(targetWebhook, request, String.class);
                log.info("Payload reenviado exitosamente a n8n ({})", targetWebhook);
            } catch (Exception ex) {
                log.error("Error reenviando payload a n8n: {}", ex.getMessage());
            }

            return ResponseEntity.ok(Map.of("status", "ok"));

        } catch (Exception e) {
            log.error("Error procesando webhook: {}", e.getMessage());
            return ResponseEntity.ok(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    /**
     * Endpoint para que n8n dispare el registro de un prospecto validado.
     */
    @PostMapping("/n8n/prospecto")
    public ResponseEntity<Map<String, Object>> registrarDesdeN8n(@RequestBody Map<String, String> datos) {
        try {
            String curp = datos.getOrDefault("curp", "").toUpperCase().trim();
            String nss = datos.getOrDefault("nss", "").trim();
            String nombre = datos.getOrDefault("nombre_completo", "").toUpperCase().trim();
            String telefono = datos.getOrDefault("telefono", "").trim();
            String canal = datos.getOrDefault("origen_canal", "Meta Ads");

            ValidacionService.ResultadoValidacion val =
                validacionService.validarProspecto(curp, nss, null, telefono);

            if (!val.isValido()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "valido", false,
                    "error", val.mensajeError()
                ));
            }

            Prospecto prospecto = expedienteService.registrarProspecto(nombre, telefono, curp, nss, canal);

            return ResponseEntity.ok(Map.of(
                "valido", true,
                "prospecto_id", prospecto.getId(),
                "estatus", prospecto.getEstatus().name(),
                "curp_valida", prospecto.getCurpValida(),
                "nss_valido", prospecto.getNssValido()
            ));

        } catch (IllegalArgumentException e) {
            if (e.getMessage().startsWith("DUPLICATE:")) {
                return ResponseEntity.badRequest().body(Map.of(
                    "valido", false,
                    "error", e.getMessage().replace("DUPLICATE: ", "")
                ));
            }
            log.error("Error validando prospecto: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Error registrando prospecto desde n8n: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Endpoint de validación directa (usado por n8n antes de registrar).
     */
    @PostMapping("/validar")
    public ResponseEntity<Map<String, Object>> validarDatos(@RequestBody Map<String, String> datos) {
        String curp = datos.getOrDefault("curp", "");
        String nss = datos.getOrDefault("nss", "");
        String clabe = datos.getOrDefault("clabe", "");
        String telefono = datos.getOrDefault("telefono", "");

        String duplicateError = expedienteService.checkDuplicates(curp, nss);
        if (duplicateError != null) {
            return ResponseEntity.ok(Map.of(
                "valido", false,
                "error", duplicateError
            ));
        }

        ValidacionService.ResultadoValidacion resultado =
            validacionService.validarProspecto(curp, nss, clabe, telefono);

        return ResponseEntity.ok(Map.of(
            "valido", resultado.isValido(),
            "curp_valida", resultado.curpValida(),
            "nss_valido", resultado.nssValido(),
            "clabe_valida", resultado.clabeValida(),
            "telefono_valido", resultado.telefonoValido(),
            "error", resultado.mensajeError() != null ? resultado.mensajeError() : ""
        ));
    }

    private void procesarMensajeTexto(String telefono, String texto, JsonNode value) {
        // Lógica extensible para procesar comandos por WhatsApp
        // Por ahora registra el evento para que n8n lo procese
        log.info("Mensaje a procesar por n8n: {} → {}", telefono, texto);
    }
}
