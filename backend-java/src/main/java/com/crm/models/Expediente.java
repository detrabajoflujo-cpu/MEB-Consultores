package com.crm.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "expedientes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Expediente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "prospecto_id")
    private Prospecto prospecto;

    // Datos financieros (extraídos por OCR/IA)
    private BigDecimal montoPensionActual;
    private String institucionBancaria;
    private String cuentaClabe;
    private String tipoCredito;
    private BigDecimal retenciones;

    private BigDecimal aumentoPension;
    private BigDecimal retroactivoFicticio;
    private BigDecimal retroactivoFinal;
    
    @Builder.Default
    private Boolean pagado = false;
    
    private String linkConstancia;

    // Google Drive
    private String nombreCarpetaDrive;
    private String urlCarpetaDrive;

    // Estado OCR de documentos
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private EstadoDocumento ineAmbosLados = EstadoDocumento.PENDIENTE;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private EstadoDocumento comprobanteDomicilio = EstadoDocumento.PENDIENTE;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private EstadoDocumento resolucionPension = EstadoDocumento.PENDIENTE;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private EstadoDocumento estadosCuenta = EstadoDocumento.PENDIENTE;


    @Enumerated(EnumType.STRING)
    @Builder.Default
    private EstadoDocumento resumenMovimientos = EstadoDocumento.PENDIENTE;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private EstadoDocumento fotoConIne = EstadoDocumento.PENDIENTE;

    // Formalización
    private String evidenciaTipo; // Videoconvenio / Contrato Digital
    @Builder.Default
    private Boolean aprobacionSuperior = false;
    private String aprobadoPor;

    // Estado general del expediente
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private EstatusExpediente estatusExpediente = EstatusExpediente.EN_RECOLECCION;

    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaUltimaActualizacion;

    @PrePersist
    protected void onCreate() {
        fechaCreacion = LocalDateTime.now();
        fechaUltimaActualizacion = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        fechaUltimaActualizacion = LocalDateTime.now();
    }

    public enum EstadoDocumento {
        PENDIENTE, APROBADO, RECHAZADO, ILEGIBLE
    }

    public enum EstatusExpediente {
        EN_RECOLECCION, COMPLETO, APROBADO, DESPACHADO, RECHAZADO
    }

    /**
     * Verifica si el expediente inicial (Módulo 4) está completo.
     * No incluye la foto con INE que se pide en Módulo 5.
     */
    public boolean isAuditoriaDocumentalCompleta() {
        return ineAmbosLados == EstadoDocumento.APROBADO
            && comprobanteDomicilio == EstadoDocumento.APROBADO
            && resolucionPension == EstadoDocumento.APROBADO
            && estadosCuenta == EstadoDocumento.APROBADO
            && resumenMovimientos == EstadoDocumento.APROBADO;
    }

    /**
     * Verifica si TODO el expediente está completo para firma.
     */
    public boolean isExpedienteCompleto() {
        return isAuditoriaDocumentalCompleta() && fotoConIne == EstadoDocumento.APROBADO;
    }
}
