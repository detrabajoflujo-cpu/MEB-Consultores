package com.crm.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "notas")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Nota {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prospecto_id", nullable = false)
    private Prospecto prospecto;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String texto;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private TipoNota tipo = TipoNota.general;

    @Builder.Default
    private Boolean resuelta = false;

    private String autor;

    private LocalDateTime fechaCreacion;

    @PrePersist
    protected void onCreate() {
        fechaCreacion = LocalDateTime.now();
    }

    public enum TipoNota {
        documento, llamada, urgente, general
    }
}
