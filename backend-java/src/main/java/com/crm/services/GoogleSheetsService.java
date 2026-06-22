package com.crm.services;

import com.crm.models.Prospecto;
import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.SheetsScopes;
import com.google.api.services.sheets.v4.model.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.FileInputStream;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * Servicio Google Sheets — Base de control de prospectos.
 * Módulo I — Escritura inicial.
 * Módulo II — Actualización con datos OCR.
 */
@Service
@Slf4j
public class GoogleSheetsService {

    @Value("${google.credentials.path}")
    private String credentialsPath;

    @Value("${google.sheets.spreadsheet-id}")
    private String spreadsheetId;

    private static final String RANGO_DATOS = "Prospectos!A:Z";
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private Sheets sheetsService;

    private Sheets getSheetsService() throws Exception {
        if (sheetsService != null) return sheetsService;

        try (InputStream is = new FileInputStream(credentialsPath)) {
            GoogleCredential credential = GoogleCredential
                .fromStream(is)
                .createScoped(Collections.singleton(SheetsScopes.SPREADSHEETS));

            sheetsService = new Sheets.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                credential
            ).setApplicationName("Ecosistema-CRM").build();

            return sheetsService;
        }
    }

    /**
     * Registra un nuevo prospecto en la hoja de control.
     */
    public void registrarProspecto(Prospecto prospecto) {
        try {
            List<Object> fila = Arrays.asList(
                prospecto.getTelefonoContacto(),
                prospecto.getNombreCompleto(),
                prospecto.getCurp(),
                prospecto.getNss(),
                prospecto.getOrigenCanal(),
                prospecto.getCurpValida() ? "✅ VÁLIDA" : "❌ INVÁLIDA",
                prospecto.getNssValido() ? "✅ VÁLIDO" : "❌ INVÁLIDO",
                prospecto.getEstatus().name(),
                LocalDateTime.now().format(FORMATTER),
                ""  // URL Drive (se llenará después)
            );

            ValueRange body = new ValueRange().setValues(List.of(fila));

            getSheetsService().spreadsheets().values()
                .append(spreadsheetId, RANGO_DATOS, body)
                .setValueInputOption("USER_ENTERED")
                .setInsertDataOption("INSERT_ROWS")
                .execute();

            log.info("Prospecto registrado en Sheets: {}", prospecto.getCurp());

        } catch (Exception e) {
            log.error("Error al registrar en Sheets: {}", e.getMessage());
        }
    }

    /**
     * Actualiza datos financieros (OCR) del prospecto en Sheets usando CURP como llave.
     */
    public void actualizarDatosOcr(String curp, String montoPension, String banco,
                                    String clabe, String urlDrive) {
        try {
            // Buscar la fila por CURP (columna C = índice 2)
            Integer fila = buscarFilaPorCurp(curp);
            if (fila == null) {
                log.warn("CURP no encontrada en Sheets: {}", curp);
                return;
            }

            // Actualizar columnas K-N con datos OCR
            String rango = String.format("Prospectos!K%d:N%d", fila, fila);
            List<Object> datos = Arrays.asList(montoPension, banco, clabe, urlDrive);

            ValueRange body = new ValueRange().setValues(List.of(datos));
            getSheetsService().spreadsheets().values()
                .update(spreadsheetId, rango, body)
                .setValueInputOption("USER_ENTERED")
                .execute();

            log.info("Datos OCR actualizados para CURP: {}", curp);

        } catch (Exception e) {
            log.error("Error al actualizar OCR en Sheets: {}", e.getMessage());
        }
    }

    private Integer buscarFilaPorCurp(String curp) {
        try {
            ValueRange response = getSheetsService().spreadsheets().values()
                .get(spreadsheetId, "Prospectos!C:C")
                .execute();

            List<List<Object>> valores = response.getValues();
            if (valores == null) return null;

            for (int i = 1; i < valores.size(); i++) {
                if (!valores.get(i).isEmpty() && curp.equals(valores.get(i).get(0).toString())) {
                    return i + 1; // 1-indexed en Sheets
                }
            }
            return null;
        } catch (Exception e) {
            log.error("Error buscando CURP en Sheets: {}", e.getMessage());
            return null;
        }
    }
}
