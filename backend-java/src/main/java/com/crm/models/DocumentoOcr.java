package com.crm.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentoOcr {
    private String tipoDocumento;
    private String urlDrive;
    private Expediente.EstadoDocumento estado;
    private Double puntajeCalidad; // 0.0 - 1.0
    private String observaciones;
    private String base64Preview;
    private DatosFinancieros datosExtraidos;
    private boolean expedienteCompleto;
    private boolean expedienteCierreCompleto;
    private String siguienteDocumentoRequerido;
}
