package com.crm.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "prospectos")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Prospecto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Identificación
    @Column(unique = true)
    private String curp;

    @Column(unique = true)
    private String nss;

    private String nombreCompleto;
    private String telefonoContacto;
    private String origenCanal;

    // Estado
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private EstatusProspecto estatus = EstatusProspecto.NUEVO;

    // Validaciones
    @Builder.Default
    private Boolean curpValida = false;

    @Builder.Default
    private Boolean nssValido = false;

    // Metadatos y Asignación (Módulo 3)
    private Boolean solicitoLlamadaIA;
    private String agenteAsignado;
    private LocalDateTime fechaHoraCita;

    private String correoElectronico;
    private String correoSipre;
    
    @Builder.Default
    private Boolean contactado = false;

    private LocalDateTime fechaIngreso;
    private LocalDateTime fechaUltimaActualizacion;

    @PrePersist
    protected void onCreate() {
        fechaIngreso = LocalDateTime.now();
        fechaUltimaActualizacion = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        fechaUltimaActualizacion = LocalDateTime.now();
    }

    public enum EstatusProspecto {
        NUEVO, VALIDANDO, VIABLE, NO_VIABLE, EN_PROCESO, FORMALIZADO, RECHAZADO
    }
}
