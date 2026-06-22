package com.crm.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class CalificacionRequest {
    private BigDecimal montoPension;
    private String institucionBancaria;
    private String tipoCredito;
    private BigDecimal retenciones;
    private boolean viable;
}
