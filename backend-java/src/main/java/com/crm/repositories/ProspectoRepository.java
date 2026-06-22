package com.crm.repositories;

import com.crm.models.Prospecto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProspectoRepository extends JpaRepository<Prospecto, Long> {
    Optional<Prospecto> findByCurp(String curp);
    Optional<Prospecto> findByNss(String nss);
    Optional<Prospecto> findByTelefonoContacto(String telefono);
    List<Prospecto> findAllByOrderByFechaIngresoDesc();
    List<Prospecto> findByEstatus(Prospecto.EstatusProspecto estatus);
}
