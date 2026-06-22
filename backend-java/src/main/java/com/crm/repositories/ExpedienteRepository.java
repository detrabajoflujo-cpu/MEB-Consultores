package com.crm.repositories;

import com.crm.models.Expediente;
import com.crm.models.Prospecto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExpedienteRepository extends JpaRepository<Expediente, Long> {
    Optional<Expediente> findByProspecto(Prospecto prospecto);
    List<Expediente> findByEstatusExpediente(Expediente.EstatusExpediente estatus);
    List<Expediente> findByAprobacionSuperiorFalse();
}
