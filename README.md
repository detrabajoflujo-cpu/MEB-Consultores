# 🚀 Ecosistema CRM de Automatización con n8n

> **Sistema de Gestión de Expedientes Financieros**  
> Stack: **Java Spring Boot** · **React + TypeScript** · **n8n** · **PostgreSQL** · **Docker**

---

## 📁 Estructura del Proyecto

```
ProyectoCitas/
├── backend-java/              ← Spring Boot API (Puerto 8080)
│   ├── src/main/java/com/crm/
│   │   ├── controllers/       ← WebhookController, ExpedienteController, OcrController
│   │   ├── services/          ← ValidacionService, OcrService, DriveService, SheetsService
│   │   ├── models/            ← Prospecto, Expediente, DatosFinancieros, DocumentoOcr
│   │   ├── repositories/      ← ProspectoRepository, ExpedienteRepository
│   │   └── config/            ← SecurityConfig, WebSocketConfig
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── init.sql
│   ├── Dockerfile
│   └── pom.xml
│
├── frontend-react/            ← Dashboard React + TS (Puerto 5173)
│   ├── src/
│   │   ├── components/        ← SidebarNav, Header, TablaProspectos, EstadoOcr, PayloadViewer, StatsCard
│   │   ├── pages/             ← Dashboard, Prospectos, Expediente, Aprobacion
│   │   └── services/          ← api.ts (Axios), mockData.ts
│   ├── .env.example
│   └── package.json
│
├── n8n-workflows/             ← Workflows JSON importables en n8n
│   ├── modulo-1-ingesta-validacion.json
│   ├── modulo-2-ocr-enriquecimiento.json
│   ├── modulo-3-llamada-agente.json
│   ├── modulo-4-recoleccion-expediente.json
│   ├── modulo-5-formalizacion.json
│   └── modulo-6-despacho-final.json
│
├── docker-compose.yml         ← n8n + PostgreSQL + Backend
├── .env.example               ← Variables de entorno
└── README.md
```

---

## ⚡ Inicio Rápido

### 1. Dashboard React (sin backend)

```bash
cd frontend-react
copy .env.example .env
npm install
npm run dev
# → http://localhost:5173
```

> El frontend usa datos mock por defecto (`VITE_USE_MOCK=true`). Funciona sin backend.

### 2. Stack completo con Docker

```bash
# 1. Copiar variables de entorno y configurar
copy .env.example .env
# Edita .env con tus claves reales

# 2. Levantar n8n + PostgreSQL
docker-compose up -d

# 3. Backend Java (requiere JDK 17 + Maven)
cd backend-java
./mvnw spring-boot:run

# 4. Frontend
cd frontend-react
npm run dev
```

**URLs:**
| Servicio | URL |
|---|---|
| 🖥️ Dashboard React | http://localhost:5173 |
| ⚙️ Backend Java API | http://localhost:8080/api |
| 🔧 n8n Workflows | http://localhost:5678 |
| 🐘 PostgreSQL | localhost:5432 |

---

## 🔌 Importar Workflows en n8n

1. Abre **http://localhost:5678** (usuario: `admin` / contraseña: `admin123`)
2. Menú → **Workflows** → **Import from File**
3. Importa cada JSON de la carpeta `n8n-workflows/`
4. Configura las credenciales de WhatsApp, Google Drive/Sheets
5. Activa los workflows

---

## 🔑 Credenciales necesarias (`.env`)

| Variable | Dónde obtenerla |
|---|---|
| `WHATSAPP_TOKEN` | developers.facebook.com → App → WhatsApp |
| `WHATSAPP_PHONE_ID` | developers.facebook.com → App → WhatsApp |
| `OPENAI_API_KEY` | platform.openai.com/api-keys |
| `BLAND_AI_KEY` | app.bland.ai → API Keys |
| `GOOGLE_DRIVE_FOLDER_ID` | ID de la carpeta raíz en Drive |
| `GOOGLE_SHEETS_ID` | ID de la hoja de control en Sheets |

**Para Google Cloud:** Descarga el JSON del Service Account y guárdalo como `credentials/google-service-account.json`.

---

## 🧩 Módulos del Sistema

| Módulo | Función | Estado |
|---|---|---|
| **I** — Ingesta & Validación | WhatsApp → Regex CURP/NSS → Sheets | ✅ Implementado |
| **II** — OCR/IA | Hoja Amarilla → GPT-4o Vision → Sheets | ✅ Implementado |
| **III** — Llamada Agente | Bland.ai → Script → Resultado | ✅ Implementado |
| **IV** — Recolección Docs | WhatsApp → OCR → Drive | ✅ Implementado |
| **V** — Formalización | Panel Superior → Aprobación | ✅ Implementado |
| **VI** — Despacho Final | Payload JSON → Grupo WhatsApp | ✅ Implementado |

---

## 📊 API Endpoints

| Método | Endpoint | Descripción |
|---|---|---|
| GET  | `/api/expedientes/prospectos` | Lista todos los prospectos |
| GET  | `/api/expedientes/{id}` | Detalle de un expediente |
| GET  | `/api/expedientes/stats` | Estadísticas globales |
| POST | `/api/expedientes/{id}/aprobar` | Aprueba un expediente |
| POST | `/api/webhook/validar` | Valida CURP/NSS/CLABE |
| POST | `/api/webhook/n8n/prospecto` | Registra prospecto desde n8n |
| POST | `/api/webhook/whatsapp` | Webhook de WhatsApp Cloud API |
| GET  | `/api/webhook/whatsapp` | Verificación del webhook (Meta) |
| POST | `/api/ocr/hoja-amarilla` | OCR de Resolución de Pensión |
| POST | `/api/ocr/validar-documento` | Valida documento por tipo |

---

## 🏗️ Arquitectura

```
Meta Ads → WhatsApp Cloud API
                    ↓
            n8n Webhook (Módulo I)
                    ↓
        Spring Boot /api/webhook/validar
          (Regex CURP + NSS + CLABE)
                    ↓
              ¿Válido?
         Sí ↙         ↘ No
   Registrar DB      Notificar Error
   Google Sheets     WhatsApp
         ↓
   n8n Módulo II → OCR/IA (GPT-4o)
         ↓
   n8n Módulo III → Bland.ai (llamada)
         ↓
   n8n Módulo IV → Recolección docs
         ↓
   Dashboard React → Panel Aprobación
         ↓
   n8n Módulo VI → Payload → Grupo
```

---

*Ecosistema CRM Automatizado — Basado en GUIA_INICIO_ECOSISTEMA_CRM_n8n.md*
