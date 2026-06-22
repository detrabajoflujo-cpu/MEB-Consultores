# Ecosistema CRM de Automatización — Documentación Técnica

**Proyecto:** Sistema Inteligente de Gestión de Expedientes Financieros  
**Versión:** 1.0  
**Clasificación:** Confidencial — Uso interno y cliente

---

## Resumen Ejecutivo

Este documento describe la arquitectura, el stack tecnológico y la hoja de ruta de implementación del **Ecosistema CRM de Automatización**, una solución diseñada para transformar el proceso de captación y gestión de prospectos financieros en un pipeline completamente automatizado, trazable y auditable.

El sistema integra canales de adquisición digital (Meta Ads + WhatsApp Business), validación inteligente de identidad, análisis documental con Inteligencia Artificial, y despacho estructurado de expedientes al equipo operativo — todo orquestado mediante flujos automatizados en **n8n**, sin intervención manual hasta los puntos de decisión estratégica.

```
Meta Ads → WhatsApp Business API → Validación IA → OCR Documental → Drive → Mesa de Dictaminación
```

---

## Pipeline Operativo del Sistema

El flujo completo del sistema sigue las siguientes etapas en orden:

**1. Captación** — El prospecto responde un anuncio en Meta Ads y es redirigido a WhatsApp Business. El sistema captura automáticamente su número telefónico sin solicitarlo.

**2. Validación de Identidad** — El bot recopila CURP y NSS, los valida mediante expresiones regulares y, de forma preferente, contra RENAPO (CURP) y el registro del IMSS (NSS). Si algún dato falla, solicita corrección automáticamente.

**3. Enriquecimiento Financiero** — El sistema procesa las Resoluciones de Pensión (Hojas Amarillas) mediante visión por IA, extrayendo monto de pensión, institución bancaria y CLABE interbancaria. Esta información se cruza con el registro del prospecto usando CURP o teléfono como llave.

**4. Contacto por Agente de Voz IA** — Una vez que el expediente base está completo, el sistema dispara una llamada automatizada al prospecto para evaluar su interés y agendar seguimiento humano.

**5. Recolección Documental** — El bot de WhatsApp guía al prospecto en la entrega de su expediente completo. Cada documento pasa por un análisis de legibilidad OCR antes de ser aceptado.

**6. Empaquetado y Despacho** — Los documentos validados se organizan automáticamente en Google Drive bajo nomenclatura estandarizada. El expediente completo se notifica al equipo operativo con un payload estructurado listo para dictaminación.

**7. Formalización Contractual** — El asesor humano interviene para solicitar videoconvenio o contrato firmado. Un superior valida y aprueba manualmente antes del despacho final.

---

## Stack Tecnológico

### Backend — Java con Spring Boot

Java es la tecnología de backend correcta para este proyecto. Su robustez empresarial garantiza el manejo seguro de datos financieros sensibles (CURP, NSS, CLABE), y Spring Boot permite construir APIs REST que n8n consume en tiempo real mediante Webhooks.

**Justificación de la elección:**

| Criterio | Detalle |
|---|---|
| Seguridad | Manejo cifrado de datos financieros regulados |
| Concurrencia | Procesamiento de lotes de hasta 10 documentos simultáneos |
| Integraciones | Librerías maduras y oficiales para Google Drive, Sheets y APIs externas |
| Mantenibilidad | Código tipado, estructurado y fácil de escalar por cualquier desarrollador |

**Dependencias principales (`pom.xml`):**

```xml
<!-- API REST -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

<!-- Google Drive y Sheets -->
<dependency>
    <groupId>com.google.apis</groupId>
    <artifactId>google-api-services-drive</artifactId>
    <version>v3-rev20220508-2.0.0</version>
</dependency>

<!-- Validación de campos (CURP, NSS, CLABE) -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>

<!-- OCR local con Tesseract -->
<dependency>
    <groupId>net.sourceforge.tess4j</groupId>
    <artifactId>tess4j</artifactId>
    <version>5.8.0</version>
</dependency>

<!-- Notificaciones en tiempo real -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-websocket</artifactId>
</dependency>
```

---

### Frontend — React con TypeScript

El **Dashboard de Control Operativo** es la interfaz interna desde la que el equipo supervisa lotes, revisa el estado OCR de cada documento y donde el Superior ejecuta la aprobación manual de expedientes antes del despacho final.

React con TypeScript es la elección ideal: permite construir una interfaz dinámica, tipada y mantenible que refleja en tiempo real el estado del pipeline.

**Setup inicial del proyecto:**

```bash
npm create vite@latest crm-dashboard -- --template react-ts
cd crm-dashboard

# Interfaz y componentes
npm install tailwindcss @shadcn/ui

# Tablas de prospectos y lotes
npm install @tanstack/react-table

# Gráficas de conversión y estatus
npm install recharts

# Comunicación con el backend Java
npm install axios

# Actualizaciones en tiempo real
npm install socket.io-client

# Validación de formularios internos
npm install react-hook-form zod
```

**Vistas principales del dashboard:**

| Vista | Función |
|---|---|
| `Dashboard.tsx` | Panel general de lotes activos y conversiones |
| `Prospecto.tsx` | Expediente individual con estatus OCR por documento |
| `Aprobacion.tsx` | Panel exclusivo del Superior para validar y despachar |
| `Notificaciones.tsx` | Historial de payloads enviados al chat grupal |

---

## Arquitectura del Repositorio

```
ecosistema-crm/
│
├── backend-java/
│   └── src/main/java/com/crm/
│       ├── controllers/
│       │   ├── WebhookController.java        ← Recibe eventos de WhatsApp y n8n
│       │   ├── ExpedienteController.java      ← Gestión de expedientes
│       │   └── OcrController.java             ← Procesamiento documental
│       ├── services/
│       │   ├── ValidacionService.java         ← Regex CURP, NSS y CLABE
│       │   ├── GoogleDriveService.java        ← Creación de carpetas y carga de archivos
│       │   ├── GoogleSheetsService.java       ← Lectura y escritura de bases de control
│       │   └── OcrService.java                ← Análisis documental con IA Vision
│       ├── models/
│       │   ├── Prospecto.java                 ← Estructura del payload JSON
│       │   └── Expediente.java
│       └── config/
│           ├── GoogleApiConfig.java
│           └── SecurityConfig.java
│
├── frontend-react/
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── Prospecto.tsx
│       │   └── Aprobacion.tsx
│       ├── components/
│       │   ├── TablaProspectos.tsx
│       │   ├── SemaforoOcr.tsx
│       │   └── PayloadViewer.tsx
│       └── services/
│           └── api.ts
│
├── n8n-workflows/
│   ├── 01-ingesta-validacion.json
│   ├── 02-enriquecimiento-financiero.json
│   ├── 03-agente-llamada.json
│   ├── 04-recoleccion-documental.json
│   ├── 05-formalizacion-contractual.json
│   └── 06-despacho-final.json
│
└── docker-compose.yml
```

---

## Implementación Técnica por Etapa

### Etapa 1 — Validación de Identidad

El sistema recibe CURP y NSS del prospecto a través de WhatsApp, los valida con los patrones oficiales y, si son correctos, los registra en la hoja de captura de Google Sheets. Si alguno falla, el bot solicita corrección automáticamente.

```java
@Service
public class ValidacionService {

    // NSS: exactamente 11 dígitos numéricos
    private static final Pattern NSS_PATTERN = Pattern.compile("^\\d{11}$");

    // CURP: estructura oficial mexicana de 18 caracteres
    private static final Pattern CURP_PATTERN = Pattern.compile(
        "^[A-Z]{1}[AEIOU]{1}[A-Z]{2}\\d{2}(0[1-9]|1[0-2])" +
        "(0[1-9]|[12]\\d|3[01])[HM]{1}" +
        "(AS|BC|BS|CC|CS|CH|CL|CM|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|" +
        "QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)" +
        "[B-DF-HJ-NP-TV-Z]{3}[A-Z\\d]{1}\\d{1}$"
    );

    public boolean validarNSS(String nss) {
        return NSS_PATTERN.matcher(nss.trim()).matches();
    }

    public boolean validarCURP(String curp) {
        return CURP_PATTERN.matcher(curp.trim().toUpperCase()).matches();
    }
}
```

**Flujo en n8n:**
1. Nodo **Webhook** → recibe mensaje de WhatsApp Cloud API
2. Nodo **Code** → extrae número telefónico del remitente automáticamente
3. Nodo **HTTP Request** → consulta endpoint Java `/api/validar`
4. Nodo **IF** → válido: escribe en Google Sheets / inválido: envía plantilla de corrección

---

### Etapa 2 — Análisis de Hojas Amarillas con IA

El sistema procesa en lotes de hasta 10 imágenes simultáneas. Un modelo de visión (Claude Vision o GPT-4o) extrae de forma estructurada el monto de pensión, la institución bancaria y la CLABE interbancaria. Los datos se cruzan automáticamente con el registro del prospecto.

```java
@Service
public class OcrService {

    public DatosFinancieros extraerHojaAmarilla(MultipartFile imagen) throws IOException {
        String base64 = Base64.getEncoder().encodeToString(imagen.getBytes());

        String prompt = """
            Eres un extractor de datos de documentos oficiales del IMSS.
            A partir de esta imagen de una Resolución de Pensión, extrae únicamente:
            - monto_pension_actual (número decimal, sin símbolos)
            - institucion_bancaria (nombre completo del banco)
            - cuenta_clabe (exactamente 18 dígitos, sin espacios)
            Responde exclusivamente en JSON con esas tres llaves. Sin texto adicional.
            """;

        // Llamada a la API de visión (Claude o GPT-4o)
        String respuesta = llamarApiVision(base64, prompt);
        return parsearJSON(respuesta);
    }
}
```

**Flujo en n8n:**
1. Nodo **Google Drive Trigger** → detecta nuevas imágenes en la carpeta del lote
2. Nodo **Split In Batches** → divide en grupos de 10
3. Nodo **HTTP Request** → llama `/api/ocr/hoja-amarilla`
4. Nodo **Google Sheets** → actualiza el registro del prospecto con los datos extraídos

---

### Etapa 3 — Agente de Voz IA

Una vez completo el perfil financiero del prospecto, n8n dispara automáticamente una llamada de voz mediante un agente de IA (Bland.ai o Vapi.ai). El resultado de la llamada determina la rama del flujo:

```
n8n → POST https://api.bland.ai/v1/calls
      { "phone": "+52XXXXXXXXXX", "script": "...", "webhook_url": "..." }

← Webhook de respuesta:
   "Sí, de inmediato"  → Cita con asesor humano
   "Lo pensaré"        → Seguimiento automático por WhatsApp
   "No contestó"       → Mensaje automático + reintento programado
```

---

### Etapa 4 — Recolección Documental por WhatsApp

El bot guía al prospecto en la entrega de su expediente. Cada documento recibido pasa por análisis OCR antes de ser aceptado. Solo cuando todos los documentos están aprobados, el sistema procede al empaquetado.

**Documentos requeridos y criterios de validación:**

| Documento | Criterio de aprobación OCR |
|---|---|
| INE (frente y reverso) | Legibilidad de nombre, CURP y número de folio |
| Comprobante de domicilio | Fecha de emisión no mayor a 3 meses |
| Resolución de Pensión completa | Documento íntegro y legible |
| 2 Estados de cuenta (últimos 2 meses) | CLABE de 18 dígitos legible y coincidente |
| Resumen de movimientos 60 días | Legibilidad general del historial |
| Foto sosteniendo INE (medio cuerpo) | Rostro visible + INE presente en encuadre |

**Nomenclatura de carpeta en Google Drive (estandarizada):**

```
[NOMBRE_COMPLETO] [CURP] [NSS]
Ejemplo: FERNANDA PALACIOS RIOS PALR850312MDFLN01 12345678901
```

---

### Etapa 5 — Formalización y Despacho Final

Una vez que el Superior aprueba el videoconvenio o contrato escaneado, el sistema ejecuta de forma simultánea:

- Actualización del estatus del prospecto en Google Sheets
- Generación del payload final estructurado
- Despacho automático al chat grupal del equipo (WhatsApp o Telegram)

**Estructura del payload final:**

```json
{
  "prospecto": {
    "origen": "Meta Ads",
    "nombre_completo": "FERNANDA PALACIOS RIOS",
    "telefono": "+527771234567",
    "curp": "PALR850312MDFLN01",
    "nss": "12345678901"
  },
  "analisis_financiero": {
    "monto_pension_actual": 4500.00,
    "institucion_bancaria": "BBVA",
    "clabe_interbancaria": "012345678901234567"
  },
  "estatus": "VIABLE",
  "expediente": {
    "carpeta_drive": "FERNANDA PALACIOS RIOS PALR850312MDFLN01 12345678901",
    "url_acceso": "https://drive.google.com/drive/folders/...",
    "documentos": {
      "ine_ambos_lados": "Aprobado",
      "comprobante_domicilio": "Aprobado",
      "resolucion_pension": "Aprobado",
      "estados_de_cuenta": "Aprobado",
      "foto_con_ine": "Aprobado"
    }
  },
  "formalizacion": {
    "tipo": "Videoconvenio",
    "aprobacion_superior": true
  }
}
```

---

## Integraciones y Credenciales Requeridas

| Servicio | Función en el sistema | Acceso |
|---|---|---|
| **Meta / WhatsApp Cloud API** | Canal principal de comunicación con prospectos | developers.facebook.com |
| **Google Cloud (Service Account)** | Google Drive y Google Sheets | console.cloud.google.com |
| **Claude Vision / GPT-4o Vision** | Análisis OCR de documentos e imágenes | console.anthropic.com / platform.openai.com |
| **Bland.ai o Vapi.ai** | Agente de voz IA para llamadas automatizadas | bland.ai / vapi.ai |
| **n8n** | Motor de automatización y orquestación de flujos | n8n.io (self-hosted o cloud) |
| **RENAPO API** | Validación oficial de CURP en tiempo real | Requiere convenio con gob.mx |

> **Nota sobre RENAPO:** La validación directa contra RENAPO requiere un convenio de colaboración oficial. Durante la fase inicial, el sistema utiliza el patrón Regex oficial como filtro primario, con una tasa de detección de errores superior al 95%. La integración con RENAPO se activa como segunda capa una vez formalizado el convenio.

---

## Infraestructura y Despliegue

**Levantar el entorno con Docker:**

```bash
git clone https://github.com/tu-org/ecosistema-crm.git
cd ecosistema-crm

# Levantar n8n y base de datos
docker-compose up -d

# Backend Java
cd backend-java && ./mvnw spring-boot:run

# Frontend React
cd frontend-react && npm install && npm run dev
# Dashboard disponible en: http://localhost:5173
```

**`docker-compose.yml`:**

```yaml
version: '3.8'
services:
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=cambiar_en_produccion

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: crm_db
      POSTGRES_USER: crm_user
      POSTGRES_PASSWORD: crm_pass

volumes:
  n8n_data:
```

> Para producción se recomienda desplegar n8n en un servidor con IP pública (Railway, Render o DigitalOcean) ya que los Webhooks de WhatsApp requieren un endpoint accesible desde internet.

---

*Documento de arquitectura técnica — Ecosistema CRM de Automatización v1.0*  
*Confidencial — Distribución restringida al equipo del proyecto y cliente*
