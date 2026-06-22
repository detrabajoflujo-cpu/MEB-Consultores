package com.crm.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

/**
 * Datos extraídos de la Hoja Amarilla (Resolución de Pensión IMSS).
 * Proforma V4.1 — Módulo II: 6 variables + clasificación financiera.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DatosFinancieros {

    // === Variables extraídas por OCR (6 campos de la Proforma) ===
    private String nombreCompleto;
    private String curp;
    private String nss;                      // 11 dígitos — parámetro principal de cruce
    private BigDecimal montoPensionActual;
    private String institucionBancaria;
    private Boolean tieneRetenciones;        // true = tiene retenciones activas

    // === Calificación Financiera (Módulo II — Matriz Binaria) ===
    /** NOMINA | DOMICILIADO | NO_APTO */
    private String perfilCalificacion;

    /** true si banco es BBVA, Banamex, Banorte, HSBC o Santander */
    private Boolean bancoAutorizado;

    /** URL de la cuenta bancaria CLABE (no se requiere en este flujo) */
    private String cuentaClabe;

    // === Metadatos OCR ===
    private Double confianzaOcr;    // 0.0 - 1.0
    private String observaciones;
}
