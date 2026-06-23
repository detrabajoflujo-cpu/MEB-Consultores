# Guía de Despliegue en Easypanel

Esta guía detalla paso a paso cómo desplegar el ecosistema completo del CRM de Punto Clínico en un servidor propio utilizando **Easypanel**.

## 📋 Requisitos Previos

1. **Servidor VPS** (DigitalOcean, Hetzner, AWS, etc.) con Ubuntu 20.04 o superior.
2. **Easypanel Instalado** en tu servidor (`curl -sSL https://get.easypanel.io | sh`).
3. **Repositorio en GitHub/GitLab** con todo tu código fuente.
4. **Dominio** apuntando a la IP de tu servidor (ej. `midominio.com`).

---

## 🏗️ Paso 1: Crear el Proyecto en Easypanel

1. Accede a tu panel de Easypanel (usualmente `http://<IP-DE-TU-SERVIDOR>:3000`).
2. En la pantalla principal, haz clic en **"Create Project"**.
3. Nómbralo (ej. `punto-clinico-crm`).

---

## 🗄️ Paso 2: Base de Datos (PostgreSQL)

El primer servicio a crear es la base de datos para que los demás puedan conectarse a ella.

1. Dentro de tu proyecto en Easypanel, haz clic en **"Create Service"** -> **"Database"** -> **"PostgreSQL"**.
2. **Name**: `crm-postgres`
3. **Database Name**: `crm_db`
4. **User**: `crm_user`
5. **Password**: Genera o elige una contraseña segura.
6. Haz clic en **Create**.
7. *Nota importante:* En la pestaña "Overview" de la base de datos verás una URL de conexión interna similar a `postgres://crm_user:PASSWORD@crm-postgres:5432/crm_db`. Guárdala, la necesitarás para el backend.

---

## ⚙️ Paso 3: Backend (Java / Spring Boot)

1. En tu proyecto de Easypanel, haz clic en **"Create Service"** -> **"App"**.
2. **Name**: `crm-backend`
3. Ve a la pestaña **Source** y selecciona **GitHub** (o la plataforma que uses). Vincula tu cuenta y selecciona el repositorio de este proyecto.
4. **Root Directory**: Escribe `/backend-java` (esto le dice a Easypanel dónde buscar el código fuente de Java).
5. Ve a la pestaña **Environment** y añade tus variables:
   ```env
   SPRING_DATASOURCE_URL=jdbc:postgresql://crm-postgres:5432/crm_db
   SPRING_DATASOURCE_USERNAME=crm_user
   SPRING_DATASOURCE_PASSWORD=tu_contraseña_generada
   OPENAI_API_KEY=tu_api_key
   WHATSAPP_TOKEN=tu_token
   WHATSAPP_PHONE_ID=tu_phone_id
   WHATSAPP_VERIFY_TOKEN=tu_verify_token
   BLAND_AI_KEY=tu_bland_key
   TZ=America/Mexico_City
   ```
6. *Montaje de volumen (Credenciales Google):* Si usas JSON de Google, ve a **Advanced -> Mounts**, crea un "Volume Mount" en la ruta `/app/credentials`. Luego puedes usar la función de "Files" de Easypanel para crear tu archivo JSON allí, o usar Base64 en variables de entorno.
7. Ve a la pestaña **Domains**, añade tu dominio (ej. `api.midominio.com`) o usa el de prueba de Easypanel. Asegúrate de habilitar HTTPS.
8. Haz clic en **Deploy**.

---

## 📄 Paso 4: OCR Service (Python)

1. Haz clic en **"Create Service"** -> **"App"**.
2. **Name**: `crm-ocr`
3. **Source**: Selecciona tu repositorio.
4. **Root Directory**: Escribe `/ocr-service`.
5. **Environment**:
   ```env
   OPENAI_API_KEY=tu_api_key_de_openai
   ```
6. (Opcional) Asigna un dominio si necesitas que sea accesible desde afuera, aunque si el n8n o backend se comunican internamente, la URL interna será `http://crm-ocr:8000`.
7. Haz clic en **Deploy**.

---

## 🤖 Paso 5: n8n (Automatizaciones)

Como n8n es una imagen de Docker preexistente, lo desplegaremos usando su imagen oficial.

1. Haz clic en **"Create Service"** -> **"App"**.
2. **Name**: `crm-n8n`
3. En la pestaña **Source**, selecciona **Docker Image**.
4. **Image**: `n8nio/n8n:latest`
5. **Environment**:
   ```env
   N8N_ENCRYPTION_KEY=tu_clave_secreta_aqui_generada
   N8N_HOST=n8n.midominio.com
   N8N_PROTOCOL=https
   N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false
   WEBHOOK_URL=https://n8n.midominio.com/
   # Tus variables para usar en n8n
   WHATSAPP_TOKEN=tu_token
   WHATSAPP_PHONE_ID=tu_id
   OPENAI_API_KEY=tu_api_key
   BACKEND_URL=http://crm-backend:8080
   OCR_URL=http://crm-ocr:8000
   ```
   *(Nota: Easypanel ya no requiere variables de Auth Básica porque usarás el sistema de usuarios integrado)*.
6. En la pestaña **Advanced -> Mounts**, añade dos volúmenes:
   - Tipo: `Volume`, Mount Path: `/home/node/.n8n`
   - Tipo: `Volume`, Mount Path: `/home/node/workflows`
7. En la pestaña **Domains**, añade `n8n.midominio.com` (activa HTTPS y expón el puerto `5678`).
8. Haz clic en **Deploy**.

---

## 🖥️ Paso 6: Frontend (React)

1. Haz clic en **"Create Service"** -> **"App"**.
2. **Name**: `crm-frontend`
3. **Source**: Selecciona tu repositorio.
4. **Root Directory**: Escribe `/frontend-react`.
5. **Environment**:
   ```env
   VITE_API_URL=https://api.midominio.com/api
   VITE_USE_MOCK=false
   ```
   *Es muy importante que la URL aquí apunte al dominio público que le asignaste al Backend en el Paso 3.*
6. **Build Settings**: En Easypanel, para aplicaciones React/Vite estáticas, puedes establecer el "Build Command" en `npm run build` y el "Publish Directory" (o "Build Directory") en `dist`.
7. En la pestaña **Domains**, añade tu dominio principal (ej. `crm.midominio.com` o `midominio.com`) y activa HTTPS.
8. Haz clic en **Deploy**.

---

## 🚀 Paso 7: Pruebas y Consideraciones Finales

1. **Configurar n8n:** Visita `https://n8n.midominio.com`. Al ser la primera vez, te pedirá que crees tu cuenta de administrador con un correo electrónico.
2. **Migraciones / Init DB:** Si tu backend de Java usa Flyway o Hibernate para crear las tablas, se crearán solas. Si usabas el archivo `init.sql`, en Easypanel puedes ir a la base de datos de PostgreSQL, usar la consola y pegar el contenido de tu `init.sql` para crear la estructura.
3. **Webhooks:** Ve a Meta Developers, Bland.ai, o tu proveedor de WhatsApp y actualiza la URL del Webhook para que apunte a la nueva URL de producción de n8n o del Backend (ej. `https://n8n.midominio.com/webhook/...`).

¡Felicidades! Todo tu ecosistema ahora estará corriendo en la nube.
