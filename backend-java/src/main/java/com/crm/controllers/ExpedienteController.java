package com.crm.controllers;

import com.crm.models.Expediente;
import com.crm.models.Nota;
import com.crm.models.Prospecto;
import com.crm.repositories.NotaRepository;
import com.crm.repositories.ProspectoRepository;
import com.crm.services.ExpedienteService;
import com.crm.dto.CalificacionRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * CRUD de expedientes y prospectos.
 * Consumido principalmente por el Dashboard React.
 */
@RestController
@RequestMapping("/expedientes")
@Slf4j
@RequiredArgsConstructor
public class ExpedienteController {

    private final ExpedienteService expedienteService;
    private final ProspectoRepository prospectoRepository;
    private final NotaRepository notaRepository;

    // ================================================================
    // Prospectos — CRUD
    // ================================================================

    @GetMapping("/prospectos")
    public ResponseEntity<List<Map<String, Object>>> listarProspectos() {
        List<Prospecto> prospectos = expedienteService.listarProspectos();
        List<Map<String, Object>> result = prospectos.stream().map(p -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", p.getId());
            map.put("curp", p.getCurp());
            map.put("nss", p.getNss());
            map.put("nombreCompleto", p.getNombreCompleto());
            map.put("telefonoContacto", p.getTelefonoContacto());
            map.put("origenCanal", p.getOrigenCanal());
            map.put("estatus", p.getEstatus());
            map.put("curpValida", p.getCurpValida());
            map.put("nssValido", p.getNssValido());
            map.put("fechaIngreso", p.getFechaIngreso());
            map.put("fechaUltimaActualizacion", p.getFechaUltimaActualizacion());

            var expOpt = expedienteService.obtenerExpedientePorCurp(p.getCurp());
            if (expOpt.isPresent()) {
                Expediente e = expOpt.get();
                map.put("montoPensionActual", e.getMontoPensionActual());
                map.put("institucionBancaria", e.getInstitucionBancaria());
                map.put("cuentaClabe", e.getCuentaClabe());
                map.put("nombreCarpetaDrive", e.getNombreCarpetaDrive());
                map.put("urlCarpetaDrive", e.getUrlCarpetaDrive());
                map.put("ineAmbosLados", e.getIneAmbosLados());
                map.put("comprobanteDomicilio", e.getComprobanteDomicilio());
                map.put("resolucionPension", e.getResolucionPension());
                map.put("estadosCuenta", e.getEstadosCuenta());
                map.put("resumenMovimientos", e.getResumenMovimientos());
                map.put("fotoConIne", e.getFotoConIne());
            }
            return map;
        }).collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /**
     * Crea un prospecto directamente desde el frontend (sin pasar por WhatsApp/n8n).
     */
    @PostMapping("/prospectos")
    public ResponseEntity<?> crearProspecto(@RequestBody Map<String, String> body) {
        try {
            String nombre    = body.getOrDefault("nombreCompleto", "").toUpperCase().trim();
            String curp      = body.getOrDefault("curp", "").toUpperCase().trim();
            String nss       = body.getOrDefault("nss", "").trim();
            String telefono  = body.getOrDefault("telefonoContacto", "").trim();
            String canal     = body.getOrDefault("origenCanal", "CRM Manual");

            Prospecto p = expedienteService.registrarProspecto(nombre, telefono, curp, nss, canal);
            return ResponseEntity.ok(p);
        } catch (Exception e) {
            log.error("Error creando prospecto: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Actualiza campos de un prospecto existente (estatus, observaciones, datos extendidos).
     */
    @PutMapping("/prospectos/{id}")
    public ResponseEntity<?> actualizarProspecto(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        try {
            Prospecto p = prospectoRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Prospecto no encontrado: " + id));

            if (body.containsKey("estatus")) {
                String estatus = (String) body.get("estatus");
                p.setEstatus(Prospecto.EstatusProspecto.valueOf(estatus));
            }
            if (body.containsKey("observaciones")) {
                // Guardado en el campo de observaciones del expediente (vía anotación o campo extra)
                // Por compatibilidad lo ignoramos aquí — el frontend lo guarda en notas
            }
            if (body.containsKey("telefonoContacto")) {
                p.setTelefonoContacto((String) body.get("telefonoContacto"));
            }
            if (body.containsKey("origenCanal")) {
                p.setOrigenCanal((String) body.get("origenCanal"));
            }
            if (body.containsKey("solicitoLlamadaIA")) {
                p.setSolicitoLlamadaIA((Boolean) body.get("solicitoLlamadaIA"));
            }
            if (body.containsKey("agenteAsignado")) {
                p.setAgenteAsignado((String) body.get("agenteAsignado"));
            }
            if (body.containsKey("fechaHoraCita")) {
                p.setFechaHoraCita(java.time.LocalDateTime.parse((String) body.get("fechaHoraCita")));
            }

            Prospecto guardado = prospectoRepository.save(p);
            return ResponseEntity.ok(guardado);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Estatus inválido: " + e.getMessage()));
        } catch (Exception e) {
            log.error("Error actualizando prospecto {}: {}", id, e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Elimina un prospecto y su expediente asociado.
     */
    @DeleteMapping("/prospectos/{id}")
    public ResponseEntity<?> eliminarProspecto(@PathVariable Long id) {
        try {
            if (!prospectoRepository.existsById(id)) {
                return ResponseEntity.notFound().build();
            }
            notaRepository.findByProspectoOrderByFechaCreacionDesc(
                    prospectoRepository.findById(id).get()
            ).forEach(notaRepository::delete);
            prospectoRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("eliminado", true, "id", id));
        } catch (Exception e) {
            log.error("Error eliminando prospecto {}: {}", id, e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    // ================================================================
    // Expediente por ID / CURP
    // ================================================================

    @GetMapping("/{id}")
    public ResponseEntity<Expediente> obtenerExpediente(@PathVariable Long id) {
        return expedienteService.obtenerExpediente(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/curp/{curp}")
    public ResponseEntity<Expediente> obtenerPorCurp(@PathVariable String curp) {
        return expedienteService.obtenerExpedientePorCurp(curp)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/curp/{curp}/calificacion")
    public ResponseEntity<?> calificarPorCurp(
            @PathVariable String curp,
            @RequestBody CalificacionRequest req) {
        try {
            Expediente exp = expedienteService.calificarExpediente(
                curp,
                req.getMontoPension(),
                req.getInstitucionBancaria(),
                req.getTipoCredito(),
                req.getRetenciones(),
                req.isViable()
            );
            return ResponseEntity.ok(exp);
        } catch (Exception e) {
            log.error("Error al calificar expediente con CURP {}: {}", curp, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/inicializar-drive")
    public ResponseEntity<Map<String, String>> inicializarDrive(@PathVariable Long id) {
        try {
            String url = expedienteService.inicializarCarpetaDrive(id);
            return ResponseEntity.ok(Map.of("url_drive", url));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/aprobar")
    public ResponseEntity<Expediente> aprobarExpediente(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        try {
            String aprobadoPor = body.getOrDefault("aprobado_por", "Sistema");
            Expediente aprobado = expedienteService.aprobarExpediente(id, aprobadoPor);
            return ResponseEntity.ok(aprobado);
        } catch (Exception e) {
            log.error("Error aprobando expediente {}: {}", id, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> obtenerEstadisticas() {
        List<Prospecto> todos = expedienteService.listarProspectos();
        long viables     = todos.stream().filter(p -> p.getEstatus() == Prospecto.EstatusProspecto.VIABLE).count();
        long enProceso   = todos.stream().filter(p -> p.getEstatus() == Prospecto.EstatusProspecto.EN_PROCESO).count();
        long formalizados = todos.stream().filter(p -> p.getEstatus() == Prospecto.EstatusProspecto.FORMALIZADO).count();
        long rechazados  = todos.stream().filter(p -> p.getEstatus() == Prospecto.EstatusProspecto.RECHAZADO).count();
        long validando   = todos.stream().filter(p -> p.getEstatus() == Prospecto.EstatusProspecto.VALIDANDO).count();
        long nuevos      = todos.stream().filter(p -> p.getEstatus() == Prospecto.EstatusProspecto.NUEVO).count();

        return ResponseEntity.ok(Map.of(
            "total",        todos.size(),
            "viables",      viables,
            "en_proceso",   enProceso,
            "formalizados", formalizados,
            "rechazados",   rechazados,
            "validando",    validando,
            "nuevos",       nuevos
        ));
    }

    // ================================================================
    // Notas — CRUD completo
    // ================================================================

    @GetMapping("/notas/{prospectoId}")
    public ResponseEntity<?> listarNotas(@PathVariable Long prospectoId) {
        return prospectoRepository.findById(prospectoId)
            .map(p -> ResponseEntity.ok(notaRepository.findByProspectoOrderByFechaCreacionDesc(p)))
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/notas/urgentes")
    public ResponseEntity<List<Nota>> notasUrgentes() {
        return ResponseEntity.ok(
            notaRepository.findByTipoAndResueltaFalseOrderByFechaCreacionDesc(Nota.TipoNota.urgente)
        );
    }

    @PostMapping("/notas/{prospectoId}")
    public ResponseEntity<?> crearNota(
            @PathVariable Long prospectoId,
            @RequestBody Map<String, Object> body) {
        try {
            Prospecto p = prospectoRepository.findById(prospectoId)
                    .orElseThrow(() -> new RuntimeException("Prospecto no encontrado"));

            Nota nota = Nota.builder()
                .prospecto(p)
                .texto((String) body.getOrDefault("texto", ""))
                .tipo(Nota.TipoNota.valueOf((String) body.getOrDefault("tipo", "general")))
                .resuelta(false)
                .autor((String) body.getOrDefault("autor", "Sistema"))
                .build();

            return ResponseEntity.ok(notaRepository.save(nota));
        } catch (Exception e) {
            log.error("Error creando nota: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/notas/{notaId}/resolver")
    public ResponseEntity<?> resolverNota(@PathVariable Long notaId) {
        return notaRepository.findById(notaId).map(n -> {
            n.setResuelta(true);
            return ResponseEntity.ok(notaRepository.save(n));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/notas/{notaId}")
    public ResponseEntity<?> eliminarNota(@PathVariable Long notaId) {
        if (!notaRepository.existsById(notaId)) return ResponseEntity.notFound().build();
        notaRepository.deleteById(notaId);
        return ResponseEntity.ok(Map.of("eliminado", true));
    }
}
