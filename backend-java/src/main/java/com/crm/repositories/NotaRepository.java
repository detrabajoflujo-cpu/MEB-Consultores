package com.crm.repositories;

import com.crm.models.Nota;
import com.crm.models.Prospecto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotaRepository extends JpaRepository<Nota, Long> {
    List<Nota> findByProspectoOrderByFechaCreacionDesc(Prospecto prospecto);
    List<Nota> findByTipoAndResueltaFalseOrderByFechaCreacionDesc(Nota.TipoNota tipo);
}
