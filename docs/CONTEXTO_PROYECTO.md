# Contexto del Proyecto: CRM Automation — Ecosistema n8n (Punto Clínico)

Este documento centraliza todo el contexto técnico, funcional y de diseño del proyecto. Está redactado para que cualquier desarrollador, líder técnico o nuevo integrante del equipo pueda comprender rápidamente qué es la aplicación, cómo está construida, qué funcionalidades posee y cómo escalar su desarrollo.

---

## 1. Visión General del Proyecto

**Nombre en código:** ProyectoCitas / Punto Clínico CRM / Ecosistema n8n
**Propósito:** Es un sistema de Gestión de Relaciones con Clientes (CRM) diseñado a la medida para gestionar *expedientes financieros, trámites de pensión y prospectos*. Su valor principal reside en la recolección estructurada de documentos (INE, CURP, NSS, Estados de Cuenta), el cálculo de retroactivos/pensiones y su eventual integración con flujos de trabajo automatizados usando **n8n**.

Actualmente, el sistema funciona de manera autónoma en el navegador utilizando una base de datos local (Mock DB en `localStorage`), lo que lo hace muy veloz y apto para demostraciones, permitiendo que la persistencia se migre en el futuro a una base de datos real (ej. PostgreSQL / Supabase / Firebase).

---

## 2. Stack Tecnológico

El frontend está construido sobre tecnologías modernas y sin dependencias pesadas innecesarias, con el objetivo de ser rápido, escalable y mantenible:

- **Framework:** React 18
- **Lenguaje:** TypeScript (Estricto tipado estático)
- **Bundler:** Vite (Proporciona HMR ultrarrápido y compilación optimizada)
- **Estilos:** Vanilla CSS (`index.css`) con **CSS Variables** nativas. *No se utiliza TailwindCSS ni Bootstrap*. Toda la UI está construida con un sistema de diseño propio basado en variables semánticas.
- **Estado Global:** React Context API (`auth.tsx` y `store.tsx`).
- **Persistencia:** LocalStorage sincronizado con el contexto para simular una base de datos real.
- **Rutas:** `react-router-dom` (SPA - Single Page Application).
- **Íconos:** SVG en línea o utilidades ligeras.

---

## 3. Arquitectura de Datos (Modelos Principales)

El núcleo de datos gira en torno a tres entidades clave:

### A. Prospectos (`Prospecto`)
Representa a los clientes o leads del sistema. Almacena:
- **Datos Personales:** Nombre, CURP, NSS, Teléfono, Correo.
- **Estatus:** Puede ser `VIABLE`, `EN_PROCESO`, `FORMALIZADO`, `RECHAZADO`.
- **Finanzas:** Monto de pensión actual, aumento proyectado, retroactivo ficticio/final, banco, y CLABE.
- **Documentación:** Estado de los documentos (INE, Comprobante de Domicilio, Resolución de pensión, Estados de cuenta, etc.) los cuales pueden estar `PENDIENTE`, `EN_REVISION`, `APROBADO` o `RECHAZADO`.
- **Enlaces Externos:** URLs a carpetas de Google Drive donde se almacenan los documentos físicos.

### B. Notas y Recordatorios (`Nota`)
Un sistema de auditoría y seguimiento.
- Cada prospecto puede tener múltiples notas.
- **Tipos de Nota:** `DOCUMENTO`, `LLAMADA`, `SISTEMA`, `URGENTE`.
- **Uso:** Sirven para que los asesores dejen constancia de interacciones ("No contestó", "Falta estado de cuenta") y aparecen en la línea de tiempo (Timeline) del **Dashboard** como recordatorios pendientes.

### C. Usuarios y Roles (`User`)
Sistema de Control de Acceso Basado en Roles (RBAC).
- `super_admin` / `admin`: Acceso total. Pueden gestionar al equipo, revocar accesos y exportar bases de datos.
- `editor`: Puede interactuar con prospectos y subir notas, pero no tiene acceso a configuraciones de equipo o seguridad avanzada.
- `viewer`: Rol de solo lectura para auditores o secretariado que solo necesita visualizar estatus sin modificar registros.

---

## 4. Estructura de Directorios

La estructura del código dentro de `frontend-react/src` es la siguiente:

```text
src/
├── assets/             # Imágenes estáticas y recursos SVG.
├── components/         # Componentes reutilizables de React.
│   ├── ProtectedRoute.tsx  # Wrapper de react-router para bloquear vistas a usuarios sin login.
│   ├── SidebarNav.tsx      # Navegación principal izquierda.
│   └── PanelNotas.tsx      # Componente visual para gestionar las notas de un prospecto.
├── pages/              # Vistas principales de la aplicación (Rutas).
│   ├── Dashboard.tsx   # Panel principal con gráficas, métricas y timeline de recordatorios.
│   ├── Prospectos.tsx  # Listado de clientes (Vista de Tarjetas y Tabla).
│   ├── Expediente.tsx  # Vista detallada de 1 solo prospecto (Tabs: General, Finanzas, Docs, Notas, n8n).
│   ├── Aprobacion.tsx  # Bandeja de revisión para altos mandos (validar expedientes completos).
│   ├── Settings.tsx    # Configuración de apariencia, perfil, seguridad, y equipo de trabajo.
│   └── Login.tsx       # Pantalla de autenticación y bienvenida.
├── services/           # Lógica de negocio, estado global y mock de base de datos.
│   ├── auth.tsx        # Contexto de autenticación (Login/Logout/RBAC).
│   ├── store.tsx       # Contexto global que simula el backend (CRUD de prospectos y notas).
│   └── dbSeed.ts       # Datos semilla generados para poblar la plataforma la primera vez.
├── App.tsx             # Configuración de Router y Providers.
├── main.tsx            # Punto de entrada de React.
└── index.css           # Sistema de diseño, temas oscuro/claro y tipografía.
```

---

## 5. Sistema de Diseño (UI/UX)

La aplicación sigue un enfoque de diseño **Minimalista, Plano (Flat Design) y Profesional**, altamente inspirado en plataformas SaaS modernas orientadas a productividad (como Vercel, Linear o Notion).

**Características Clave del UI:**
- **Tipografía:** Se utiliza `Helvetica Neue / Helvetica / Arial`. Con pesos visuales fuertes (`font-weight: 700`) en los encabezados para dar autoridad y legibilidad.
- **Sin Sombras Excesivas:** Se omitieron los `box-shadow` exagerados. Las tarjetas (`cards`) y paneles se delimitan mediante bordes muy sutiles (`1px solid var(--border)`) y contrastes de fondo, dando una apariencia "glass" o plana.
- **Temas (Dark Mode / Light Mode):** Soportado nativamente a través de un atributo `data-theme` inyectado en la etiqueta `<html>`. Las variables CSS (`--bg`, `--bg-elevated`, `--text-1`) se permutan automáticamente según la elección del usuario.
- **Colores Semánticos:**
  - `Accent (Acento)`: Dinámico (configurable desde Settings).
  - `Green`: Éxito / Viable.
  - `Red`: Urgencia / Rechazo / Peligro.
  - `Yellow/Orange`: Pendiente / Advertencias.

---

## 6. Funcionalidades y Flujos de Usuario Principales

### Flujo de Expedientes (Pipeline)
1. **Captura:** Un prospecto ingresa (ya sea manual o por n8n). Se valida su CURP y NSS.
2. **Recolección:** Se visualiza en `Prospectos.tsx` (vista de tarjetas). El asesor entra al `Expediente.tsx` del prospecto y actualiza el estado de los documentos físicos (Ej: INE -> Aprobado).
3. **Seguimiento:** Si falta un documento, el asesor crea una `Nota` urgente. Esta nota aparecerá en el **Dashboard** en el apartado de Recordatorios.
4. **Cálculos Financieros:** En la pestaña "Finanzas" se alimentan los aumentos de pensión y retroactivos.
5. **Formalización:** Cuando el expediente está "Completo", pasa a estatus `FORMALIZADO`.

### Panel de Configuración (Settings)
Centraliza la administración del entorno.
- **Perfil y Apariencia:** Preferencias estéticas (Modos de color).
- **Notificaciones:** Simulación de webhooks y alertas por correo.
- **Seguridad:** Generación de **Claves API** (preparado para que n8n pueda autenticarse con el CRM de manera segura). Registro de sesiones de navegador activas.
- **Equipo:** Gestión de roles y usuarios mediante tabla (Solo disponible para Admins).
- **Sistema:** Eliminación o exportación de datos en formato CSV.

---

## 7. Próximos Pasos y Escalabilidad (Roadmap)

Dado que el frontend está robustamente estructurado, estos son los pasos técnicos para el futuro del proyecto:

1. **Migración a Backend Real (API Rest / GraphQL):**
   - Remplazar los métodos actuales en `store.tsx` (que leen/escriben a `localStorage`) por llamadas a una API externa utilizando `fetch` o `axios`.
   - Reemplazar la simulación de `auth.tsx` por tokens JWT o sesiones basadas en cookies (ej. Firebase Auth, Supabase Auth, o Auth0).
2. **Integración Definitiva con n8n:**
   - Habilitar los Webhooks definidos en `Settings.tsx` para que cada cambio de estatus de un prospecto dispare un flujo en n8n (ej. enviar un WhatsApp automático al cliente si su INE fue rechazada).
3. **Conexión Real con Google Drive:**
   - Sustituir las URLs estáticas de carpetas por integración con la API de Google Drive, permitiendo incrustar previsualizaciones de PDF o subir archivos directamente desde el CRM.

---

## 8. Requisitos para la Integración con n8n

Para que **n8n** interactúe de forma real con este CRM, se necesita una arquitectura en donde n8n y el CRM se comuniquen. Actualmente el CRM vive en el navegador (LocalStorage), por lo que para conectar n8n necesitas lo siguiente:

### A. Entorno de Ejecución de n8n
Necesitas tener n8n instalado. Puede ser:
- **n8n Cloud:** Gestionado por ellos (de pago).
- **Auto-alojado (Self-Hosted):** Instalado en un VPS (DigitalOcean, AWS, Hetzner) usando Docker o NPM, o de manera local en tu computadora para pruebas.

### B. Comunicación del CRM hacia n8n (Webhooks)
Si quieres que una acción en el CRM dispare una automatización (por ejemplo, dar clic en "Aprobar Documento" y que n8n envíe un WhatsApp):
1. Debes crear un workflow en n8n que empiece con el nodo **"Webhook"**.
2. Copiar la **URL de Prueba/Producción** que te da el nodo Webhook en n8n.
3. Pegar esa URL en el panel de `Settings` -> `Notificaciones` -> `Webhook URL (Integraciones)` del CRM.
4. Programar en el código frontend (ej. `src/services/store.tsx`) que cada vez que cambie un estatus, se haga un `fetch('TU_WEBHOOK_URL', { method: 'POST', body: ... })`.

### C. Comunicación de n8n hacia el CRM (Base de Datos Real)
Si n8n hace algo por su cuenta (como recibir un correo de un cliente) y quieres que eso aparezca automáticamente en el CRM (ej. crear un nuevo Prospecto):
1. **n8n NO puede escribir en el LocalStorage de tu navegador.**
2. Por lo tanto, **es obligatorio migrar este proyecto a una base de datos real** accesible por internet (las mejores opciones gratuitas/baratas son **Supabase**, **Firebase** o **MongoDB Atlas**).
3. Una vez tengas Supabase (por ejemplo), n8n usará el nodo de *PostgreSQL* o *HTTP Request* para insertar el nuevo cliente directamente en tu base de datos en la nube.
4. Tu CRM (frontend) simplemente leerá de esa misma base de datos en la nube, y el cliente aparecerá en tu pantalla mágicamente.

---

## 9. Cómo Ejecutar el Proyecto (One-Click)

En la carpeta principal del proyecto encontrarás un archivo llamado `iniciar_proyecto.bat`. Este script de Windows automatiza el arranque. 

**¿Qué hace el script?**
1. Instala dependencias si te falta alguna (`npm install`).
2. Levanta el servidor de desarrollo ultrarrápido (`npm run dev`).
3. Abre automáticamente tu navegador predeterminado en la dirección del proyecto (por lo general `http://localhost:5173`).

Simplemente da doble clic en `iniciar_proyecto.bat` y todo funcionará al instante.

---

## 10. Configuración de Llaves API (Módulos Externos n8n)

Para poner en marcha los módulos de automatización externos con n8n no necesitas "comprar" llaves inmediatamente; la mayoría ofrecen capas gratuitas o crédito de prueba para empezar. 

Estas credenciales deberán guardarse en un archivo `.env` ubicado en la carpeta principal de tu entorno n8n (o en la carpeta `ProyectoCitas` si tu n8n vive ahí) y en una carpeta `credentials/` para Google.

### 1. WhatsApp (Módulos I y VI) — ¡Gratis para desarrollo!
Meta (Facebook) te regala un entorno de prueba para desarrolladores.
- **¿Dónde se consigue?**
  1. Ve a `developers.facebook.com` y entra con tu cuenta de Facebook.
  2. Ve a Mis Apps -> Crear App -> "Otros" -> "Business".
  3. Añade el producto **WhatsApp**. Meta te dará un panel de API Setup.
  4. Copia el **Token Temporal** y el **Phone Number ID**.
- **¿Dónde se coloca?**
  Abre el archivo `.env` y pega tus datos:
  ```env
  WHATSAPP_TOKEN="pega_tu_token_aqui"
  WHATSAPP_PHONE_ID="pega_tu_phone_number_id_aqui"
  ```

### 2. Google Drive (Módulo IV) — ¡Gratis!
Google te permite usar su API de Drive sin costo para este volumen de uso.
- **¿Dónde se consigue?**
  1. Ve a la **Google Cloud Console**. Crea un proyecto nuevo.
  2. Busca "Google Drive API" y dale a Habilitar.
  3. Ve a Credenciales -> Crear Credenciales -> Cuenta de Servicio (Service Account).
  4. Una vez creada, ve a "Claves" -> Agregar Clave -> Crear clave nueva -> JSON. Se descargará un archivo a tu PC.
- **¿Dónde se coloca?**
  Renombra el archivo descargado a `google-service-account.json` y muévelo adentro de la carpeta: `C:\Users\Angel-PC\Downloads\ProyectoCitas\credentials\`.

### 3. Agente de Voz Bland.ai (Módulo III) — ($2 USD de Regalo)
Sirve para hacer llamadas telefónicas automatizadas con IA. Cobra centavos por minuto, pero te regalan saldo inicial.
- **¿Dónde se consigue?**
  1. Regístrate en `bland.ai`.
  2. Ve a API Keys (menú izquierdo) y dale a "Create Key".
- **¿Dónde se coloca?**
  Abre tu archivo `.env` y pega la llave:
  ```env
  BLAND_AI_KEY="pega_tu_api_key_aqui"
  ```

### 4. OpenAI / ChatGPT (Módulo II - OCR) — (Requiere recarga de $5 USD)
Se utiliza para extraer datos de las imágenes (fotos del INE y estado de cuenta) mediante IA con visión, y validar si son legibles o están borrosas.
- **¿Dónde se consigue?**
  1. Ve a `platform.openai.com/api-keys` e inicia sesión.
  2. Es necesario recargar al menos $5 USD en *Billing* si es una cuenta nueva para habilitar la API.
  3. Da clic en "Create new secret key" y cópiala (empieza con `sk-...`).
- **¿Dónde se coloca?**
  En tu archivo `.env` pega la llave:
  ```env
  OPENAI_API_KEY="sk-AQUI_TU_OPENAI_KEY"
  ```

### 🔄 Último Paso: Reiniciar
Una vez que hayas guardado tus llaves en el archivo `.env` y en la carpeta `credentials`, tienes que reiniciar tus contenedores de n8n para que las lea. Desde tu terminal ejecuta:
```bash
docker-compose down
docker-compose up -d
```
En cuanto lo hagas, todos los módulos en n8n estarán habilitados y listos para ejecutar los flujos, desde que llega un mensaje de WhatsApp hasta que el Agente de voz hace una llamada automáticamente y ChatGPT extrae los datos del INE.
