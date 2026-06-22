package com.crm.services;

import org.springframework.stereotype.Service;
import java.util.regex.Pattern;

/**
 * Servicio de validación de identificadores mexicanos.
 * Módulo I — Validación con Regex.
 */
@Service
public class ValidacionService {

    // NSS: exactamente 11 dígitos
    private static final Pattern NSS_PATTERN = Pattern.compile("^\\d{11}$");

    // CURP: patrón oficial mexicano de 18 caracteres
    private static final Pattern CURP_PATTERN = Pattern.compile(
        "^[A-Z]{1}[AEIOU]{1}[A-Z]{2}\\d{2}(0[1-9]|1[0-2])" +
        "(0[1-9]|[12]\\d|3[01])[HM]{1}" +
        "(AS|BC|BS|CC|CS|CH|CL|CM|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)" +
        "[B-DF-HJ-NP-TV-Z]{3}[A-Z\\d]{1}\\d{1}$"
    );

    // CLABE interbancaria: exactamente 18 dígitos
    private static final Pattern CLABE_PATTERN = Pattern.compile("^\\d{18}$");

    // Teléfono mexicano: opcional +52 o 52 o 521, seguido de 10 dígitos
    private static final Pattern TELEFONO_MX_PATTERN = Pattern.compile("^(\\+?521?)?[0-9]{10}$");

    public boolean validarNSS(String nss) {
        if (nss == null || nss.isBlank()) return false;
        return NSS_PATTERN.matcher(nss.trim()).matches();
    }

    public boolean validarCURP(String curp) {
        if (curp == null || curp.isBlank()) return false;
        return CURP_PATTERN.matcher(curp.trim().toUpperCase()).matches();
    }

    public boolean validarCLABE(String clabe) {
        if (clabe == null || clabe.isBlank()) return false;
        String limpia = clabe.replaceAll("\\s", "");
        return CLABE_PATTERN.matcher(limpia).matches() && validarDigitoControlClabe(limpia);
    }

    public boolean validarTelefono(String telefono) {
        if (telefono == null || telefono.isBlank()) return false;
        return TELEFONO_MX_PATTERN.matcher(telefono.trim()).matches();
    }

    /**
     * Valida el dígito de control de la CLABE interbancaria.
     * Algoritmo oficial de BANXICO.
     */
    private boolean validarDigitoControlClabe(String clabe) {
        if (clabe.length() != 18) return false;
        int[] pesos = {3, 7, 1};
        int suma = 0;
        for (int i = 0; i < 17; i++) {
            suma += (Character.getNumericValue(clabe.charAt(i)) * pesos[i % 3]) % 10;
        }
        int digitoControl = (10 - (suma % 10)) % 10;
        return digitoControl == Character.getNumericValue(clabe.charAt(17));
    }

    /**
     * Resultado de validación completo para un prospecto.
     */
    public record ResultadoValidacion(
        boolean curpValida,
        boolean nssValido,
        boolean clabeValida,
        boolean telefonoValido,
        String mensajeError
    ) {
        public boolean isValido() {
            return curpValida && nssValido;
        }
    }

    public ResultadoValidacion validarProspecto(String curp, String nss, String clabe, String telefono) {
        boolean curpOk = validarCURP(curp);
        boolean nssOk = validarNSS(nss);
        boolean clabeOk = clabe == null || clabe.isBlank() || validarCLABE(clabe);
        boolean telOk = validarTelefono(telefono);

        StringBuilder errores = new StringBuilder();
        if (!curpOk) errores.append("CURP inválida. ");
        if (!nssOk) errores.append("NSS inválido. ");
        if (!clabeOk) errores.append("CLABE inválida. ");
        if (!telOk) errores.append("Teléfono inválido. ");

        return new ResultadoValidacion(curpOk, nssOk, clabeOk, telOk,
            errores.isEmpty() ? null : errores.toString().trim());
    }
}
