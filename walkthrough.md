# ¡Actualización Completada! Arquitectura Sin Estado (State Machine)

He transformado todo el inicio de tu ecosistema para que no dependa de los frágiles nodos de *Wait*, sino de tu robusta base de datos **PostgreSQL**. Esta arquitectura le otorga memoria casi infinita al Orquestador, permitiéndole saber exactamente qué hacer con cualquier imagen o mensaje sin importar cuántos días pasen.

## 🛠️ ¿Qué cambió exactamente?

### 1. Base de Datos (`bot_sessions`)
He creado una tabla ultraligera en tu base de datos llamada `bot_sessions`. Esta tabla actúa como el "cerebro" del Enrutador.
- **¿Qué guarda?:** El número de teléfono (`phone_number`), el Módulo actual (`current_module`) y el paso exacto dentro de ese Módulo (`current_step`).
- **Impacto:** Modificó el archivo `init.sql` para que sea persistente en cada instalación.

### 2. Módulo 0 (Enrutador Maestro)
Se transformó en un Orquestador Inteligente:
- Ahora, cuando recibe un mensaje, ya no enruta a ciegas las imágenes al Módulo 4.
- Usa el **Nodo Postgres** para hacer un `SELECT` en la tabla `bot_sessions` buscando el teléfono del usuario.
- Si el usuario no existe, le asigna `MODULO_1` y el paso `NUEVO_LEAD` por defecto.
- Enruta el mensaje y le transfiere el *estado actual* al módulo correspondiente.

### 3. Módulo 1 (Captación y Triaje)
**¡Adiós nodos rosas!** El Módulo 1 ahora es 100% *Stateless* (Sin Estado).
- Tiene un nodo `Switch` al principio que evalúa la variable `current_step` enviada por el Enrutador.
- **Rama NUEVO_LEAD:** Envía la bienvenida y usa el Nodo Postgres para ejecutar un `INSERT/UPDATE` cambiando el estado del usuario a `ESPERANDO_BOTON`.
- **Rama ESPERANDO_BOTON:** Recibe la pulsación del botón interactivo, pide los datos, y actualiza la BD a `ESPERANDO_DATOS`.
- **Rama ESPERANDO_DATOS:** Extrae la CURP y NSS, llama a la BD de Java para crear el Expediente oficial, y finaliza actualizando la BD de sesiones a `current_module = 'MODULO_2'` y `current_step = 'ESPERANDO_HOJA_AMARILLA'`.

> [!TIP]
> **Beneficio Inmediato:** Con esto, si el cliente manda su CURP y luego manda una imagen (Hoja Amarilla) horas o días después, el Enrutador consultará la BD, verá que está en `MODULO_2`, y enviará la imagen directamente al flujo de análisis OCR de Hoja Amarilla, ¡sin equivocarse mandándola al Módulo 4!

## 🚀 Pasos para probar esta obra de arte

Para que esto empiece a funcionar en tu n8n, por favor realiza los siguientes pasos:

1. **Credenciales Postgres:** En tu n8n, ve a *Credentials*, añade una nueva de tipo **Postgres** y llénala con los datos del `docker-compose` (Host: `postgres`, Port: `5432`, DB: `crm_db`, User: `crm_user`, Pass: `crm_pass`). Nómbrala algo como "Postgres Local".
2. **Importar Flujos:** Elimina tus flujos viejos del Módulo 0 y Módulo 1, y re-importa los dos archivos:
   - [modulo-0-proxy.json](file:///c:/Users/Angel-PC/Downloads/PuntoClinico-Avances/PuntoClinico-Avances/n8n-workflows/modulo-0-proxy.json)
   - [modulo-1-captacion.json](file:///c:/Users/Angel-PC/Downloads/PuntoClinico-Avances/PuntoClinico-Avances/n8n-workflows/modulo-1-captacion.json)
3. **Vincular Credenciales:** Al importar, n8n te pedirá que asocies las credenciales. Asocia la de *WhatsApp API* a los nodos de envío, y asocia la credencial de *Postgres Local* a los nuevos nodos grises de base de datos.
4. **Activación:** Activa el switch superior derecho en ambos módulos.
5. **¡Prueba de Fuego!:** Manda un nuevo "Hola" desde tu celular. El proceso fluirá rapidísimo de inicio a fin. Y si revisas tu PostgreSQL, verás que la tabla `bot_sessions` va actualizándose mágicamente en cada paso.
