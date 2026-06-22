package com.crm.services;

import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.FileList;
import com.google.api.services.drive.model.Permission;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.List;

/**
 * Servicio Google Drive — Crear carpetas y subir documentos.
 * Módulo IV — Recolección de Expediente.
 */
@Service
@Slf4j
public class GoogleDriveService {

    @Value("${google.credentials.path}")
    private String credentialsPath;

    @Value("${google.drive.root-folder-id}")
    private String rootFolderId;

    private Drive driveService;

    private Drive getDriveService() throws Exception {
        if (driveService != null) return driveService;

        java.io.File credFile = new java.io.File(credentialsPath);
        if (!credFile.exists()) {
            throw new RuntimeException("Archivo de credenciales Google no encontrado en: " + credentialsPath);
        }

        try (InputStream is = new FileInputStream(credFile)) {
            GoogleCredential credential = GoogleCredential
                .fromStream(is)
                .createScoped(Collections.singleton(DriveScopes.DRIVE));

            driveService = new Drive.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                credential
            ).setApplicationName("Ecosistema-CRM").build();

            return driveService;
        }
    }

    /**
     * Crea la carpeta del prospecto en Drive con nomenclatura oficial:
     * [NOMBRE_COMPLETO] [CURP] [NSS]
     */
    public String crearCarpetaProspecto(String nombreCompleto, String curp, String nss) {
        String nombreCarpeta = String.format("%s %s %s",
            nombreCompleto.toUpperCase(), curp.toUpperCase(), nss);
        log.info("[MODO PRUEBA] Simulación de creación de carpeta Drive para: {}", nombreCarpeta);
        // Retornamos un ID de carpeta ficticio
        return "mock_folder_id_" + System.currentTimeMillis();
    }

    /**
     * Sube un documento a la carpeta del prospecto.
     */
    public String subirDocumento(MultipartFile archivo, String carpetaId, String nombreDocumento) {
        log.info("[MODO PRUEBA] Simulación de subida de documento: {} a carpeta {}", nombreDocumento, carpetaId);
        // Retornamos un link ficticio
        return "https://drive.google.com/file/d/mock_file_id_" + System.currentTimeMillis() + "/view";
    }

    /**
     * Obtiene el link de la carpeta del prospecto.
     */
    public String obtenerUrlCarpeta(String carpetaId) {
        return "https://drive.google.com/drive/folders/" + carpetaId;
    }

    private String buscarCarpetaPorNombre(String nombre) {
        return null;
    }
}
