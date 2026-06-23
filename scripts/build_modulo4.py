import json

def create_workflow():
    nodes = []
    connections = {}

    def add_node(node):
        nodes.append(node)
        
    def connect(source_name, target_name, source_index=0, target_index=0):
        if source_name not in connections:
            connections[source_name] = {"main": [[]]}
        while len(connections[source_name]["main"]) <= source_index:
            connections[source_name]["main"].append([])
        connections[source_name]["main"][source_index].append({"node": target_name, "type": "main", "index": target_index})

    # Webhook
    add_node({
        "parameters": { "httpMethod": "POST", "path": "modulo4", "options": {} },
        "id": "webhook-mod-4", "name": "Webhook Modulo 4",
        "type": "n8n-nodes-base.webhook", "typeVersion": 1, "position": [0, 0]
    })

    # Extraer Datos
    add_node({
        "parameters": {
            "keepOnlySet": True,
            "values": { "string": [
                { "name": "phone", "value": "={{ $json.body.payload.entry[0].changes[0].value.messages[0].from.replace(/^521/, '52') }}" },
                { "name": "media_id", "value": "={{ $json.body.payload.entry[0].changes[0].value.messages[0].image ? $json.body.payload.entry[0].changes[0].value.messages[0].image.id : ($json.body.payload.entry[0].changes[0].value.messages[0].document ? $json.body.payload.entry[0].changes[0].value.messages[0].document.id : '') }}" }
            ] },
            "options": {}
        },
        "id": "extraer-datos", "name": "Extraer Datos",
        "type": "n8n-nodes-base.set", "typeVersion": 2, "position": [200, 0]
    })
    connect("Webhook Modulo 4", "Extraer Datos")

    # Verificar Archivo
    add_node({
        "parameters": { "conditions": { "string": [ { "value1": "={{ $json.media_id }}", "operation": "isNotEmpty" } ] } },
        "id": "has-media", "name": "Verificar Archivo",
        "type": "n8n-nodes-base.if", "typeVersion": 1, "position": [400, 0]
    })
    connect("Extraer Datos", "Verificar Archivo")

    # Error Sin Archivo
    add_node({
        "parameters": {
            "method": "POST",
            "url": "=https://graph.facebook.com/v17.0/{{ $('Webhook Modulo 4').first().json.body.payload.entry[0].changes[0].value.metadata.phone_number_id }}/messages",
            "authentication": "predefinedCredentialType", "nodeCredentialType": "whatsAppApi",
            "sendBody": True, "specifyBody": "json",
            "jsonBody": "={{ JSON.stringify({ \"messaging_product\": \"whatsapp\", \"to\": $json.phone, \"type\": \"text\", \"text\": { \"body\": \"⚠️ Por favor, envíanos el documento en formato de IMAGEN (foto clara) o PDF.\" } }) }}"
        },
        "id": "error-no-media", "name": "Error Sin Archivo",
        "type": "n8n-nodes-base.httpRequest", "typeVersion": 4, "position": [600, 200],
        "credentials": { "whatsAppApi": { "id": "gSEnpEOi1zRXy9fn", "name": "WhatsApp account" } }
    })
    connect("Verificar Archivo", "Error Sin Archivo", 1, 0)

    # Obtener URL Archivo
    add_node({
        "parameters": {
            "method": "GET",
            "url": "=https://graph.facebook.com/v17.0/{{ $json.media_id }}",
            "authentication": "predefinedCredentialType", "nodeCredentialType": "whatsAppApi", "options": {}
        },
        "id": "get-media-url", "name": "Obtener URL Archivo",
        "type": "n8n-nodes-base.httpRequest", "typeVersion": 4, "position": [600, -100],
        "credentials": { "whatsAppApi": { "id": "gSEnpEOi1zRXy9fn", "name": "WhatsApp account" } }
    })
    connect("Verificar Archivo", "Obtener URL Archivo", 0, 0)

    # Obtener Expediente
    add_node({
        "parameters": {
            "operation": "executeQuery",
            "query": "SELECT e.id as expediente_id, e.ine_ambos_lados, e.comprobante_domicilio, e.resolucion_pension, e.estados_cuenta, e.nombre_carpeta_drive, e.url_carpeta_drive, p.nombre_completo, p.curp, p.nss FROM expedientes e JOIN prospectos p ON e.prospecto_id = p.id WHERE p.telefono_contacto = '{{ $('Extraer Datos').first().json.phone }}';"
        },
        "id": "get-expediente", "name": "Obtener Expediente",
        "type": "n8n-nodes-base.postgres", "typeVersion": 2, "position": [800, -100],
        "credentials": { "postgres": { "id": "1", "name": "Postgres account" } }
    })
    connect("Obtener URL Archivo", "Obtener Expediente")

    # ¿Tiene Carpeta?
    add_node({
        "parameters": {
            "conditions": {
                "string": [
                    {
                        "value1": "={{ $json.url_carpeta_drive }}",
                        "operation": "isEmpty"
                    }
                ]
            }
        },
        "id": "tiene-carpeta", "name": "¿Tiene Carpeta?",
        "type": "n8n-nodes-base.if", "typeVersion": 1, "position": [1000, -100]
    })
    connect("Obtener Expediente", "¿Tiene Carpeta?")

    # NO TIENE CARPETA (TRUE) -> Crear
    add_node({
        "parameters": {
            "resource": "folder",
            "operation": "create",
            "name": "={{ $('Obtener Expediente').first().json.nombre_completo }} {{ $('Obtener Expediente').first().json.curp }} {{ $('Obtener Expediente').first().json.nss }}",
            "options": {
                "parents": ["{{ $env[\"GOOGLE_DRIVE_MASTER_FOLDER_ID\"] }}"]
            }
        },
        "id": "crear-carpeta-drive-mod4", "name": "Crear Carpeta Drive Mod 4",
        "type": "n8n-nodes-base.googleDrive", "typeVersion": 3, "position": [1200, -200],
        "credentials": { "googleDriveOAuth2Api": { "id": "xH344n6lX17B6nFm", "name": "Google Drive account" } }
    })
    connect("¿Tiene Carpeta?", "Crear Carpeta Drive Mod 4", 0, 0)

    # Guardar ID Carpeta en BD
    add_node({
        "parameters": {
            "operation": "executeQuery",
            "query": "UPDATE expedientes SET nombre_carpeta_drive = '{{ $json.id }}', url_carpeta_drive = '{{ $json.webViewLink }}' WHERE id = {{ $('Obtener Expediente').first().json.expediente_id }} RETURNING nombre_carpeta_drive;"
        },
        "id": "guardar-carpeta-db-mod4", "name": "Guardar Carpeta BD Mod 4",
        "type": "n8n-nodes-base.postgres", "typeVersion": 2.3, "position": [1400, -200],
        "credentials": { "postgres": { "id": "1", "name": "Postgres account" } }
    })
    connect("Crear Carpeta Drive Mod 4", "Guardar Carpeta BD Mod 4")

    # Determinar Siguiente Doc
    add_node({
        "parameters": {
            "jsCode": "const doc = $('Obtener Expediente').first().json;\nlet folder_id = doc.nombre_carpeta_drive;\ntry {\n  const new_folder = $('Guardar Carpeta BD Mod 4').first().json.nombre_carpeta_drive;\n  if (new_folder) folder_id = new_folder;\n} catch(e) {}\n\nlet doc_type = '';\nif (doc.ine_ambos_lados !== 'APROBADO') doc_type = 'ine';\nelse if (doc.comprobante_domicilio !== 'APROBADO') doc_type = 'cfe';\nelse if (doc.resolucion_pension !== 'APROBADO') doc_type = 'resolucion';\nelse if (doc.estados_cuenta !== 'APROBADO') doc_type = 'estados';\nif (doc_type === '') { return []; }\nreturn { json: { ...doc, doc_type, folder_id } };"
        },
        "id": "determine-doc", "name": "Determinar Siguiente Doc",
        "type": "n8n-nodes-base.code", "typeVersion": 2, "position": [1600, -100]
    })
    connect("¿Tiene Carpeta?", "Determinar Siguiente Doc", 1, 0)
    connect("Guardar Carpeta BD Mod 4", "Determinar Siguiente Doc")

    # Evaluar Documento
    add_node({
        "parameters": {
            "dataType": "string",
            "value1": "={{ $json.doc_type }}",
            "rules": {
                "rules": [
                    { "value2": "ine", "output": 0 },
                    { "value2": "cfe", "output": 1 },
                    { "value2": "resolucion", "output": 2 },
                    { "value2": "estados", "output": 3 }
                ]
            }
        },
        "id": "switch-documento", "name": "Evaluar Documento",
        "type": "n8n-nodes-base.switch", "typeVersion": 1, "position": [1800, -100]
    })
    connect("Determinar Siguiente Doc", "Evaluar Documento")

    prompts = {
        "ine": "Verifica que el documento sea una Identificación Oficial (INE) por ambos lados y sea legible.",
        "cfe": "Verifica que sea un comprobante de domicilio oficial (recibo de luz, agua, teléfono o gas) con fecha de emisión o vencimiento no mayor a 3 meses respecto a hoy (hoy es {{ $now.toFormat('dd/MM/yyyy') }}). Debe ser legible.",
        "resolucion": "Verifica que sea una Resolución de Pensión del IMSS y sea legible.",
        "estados": "Verifica que sea un estado de cuenta bancario reciente (no mayor a 2 meses respecto a hoy, hoy es {{ $now.toFormat('dd/MM/yyyy') }}) y legible."
    }

    cols = { "ine": "ine_ambos_lados", "cfe": "comprobante_domicilio", "resolucion": "resolucion_pension", "estados": "estados_cuenta" }
    next_msgs = {
        "ine": "¡INE validado correctamente! ✅\n\nPor favor, envíanos tu *Comprobante de Domicilio (Agua, Luz, Teléfono o Gas, máximo 3 meses de antigüedad)*.",
        "cfe": "¡Comprobante validado! ✅\n\nAhora envíanos tu *Resolución de Pensión del IMSS*.",
        "resolucion": "¡Resolución validada! ✅\n\nFinalmente, envíanos tus *Estados de Cuenta (últimos 2 meses)*.",
        "estados": "¡Excelente! ✅ Todos tus documentos han sido validados con éxito. Los archivos fueron guardados en una carpeta de Google Drive, seguros y sin ninguna filtración de información.\n\nPara terminar con este proceso, necesitamos que nos envíes una *foto biométrica* (una \"selfie\" tuya de medio cuerpo sosteniendo tu INE cerca del rostro)."
    }

    # Descargar Archivo
    add_node({
        "parameters": {
            "method": "GET",
            "url": "={{ $('Obtener URL Archivo').first().json.url }}",
            "authentication": "predefinedCredentialType", "nodeCredentialType": "whatsAppApi",
            "responseFormat": "file", "dataPropertyName": "data", "options": {}
        },
        "id": "download-media", "name": "Descargar Archivo",
        "type": "n8n-nodes-base.httpRequest", "typeVersion": 3, "position": [2200, -100],
        "credentials": { "whatsAppApi": { "id": "gSEnpEOi1zRXy9fn", "name": "WhatsApp account" } }
    })

    for i, doc in enumerate(["ine", "cfe", "resolucion", "estados"]):
        node_name = f"Preparar Prompt {doc.upper()}"
        add_node({
            "parameters": {
                "keepOnlySet": False,
                "values": { "string": [
                    { "name": "prompt", "value": f"={prompts[doc]}" },
                    { "name": "columna", "value": cols[doc] },
                    { "name": "next_msg", "value": next_msgs[doc] }
                ] },
                "options": {}
            },
            "id": f"set-prompt-{doc}", "name": node_name,
            "type": "n8n-nodes-base.set", "typeVersion": 2, "position": [2000, -200 + i*150]
        })
        connect("Evaluar Documento", node_name, i, 0)
        connect(node_name, "Descargar Archivo")

    # Convertir a Base64
    add_node({
        "parameters": {
            "jsCode": "const items = $input.all();\nfor (let item of items) {\n  if (item.binary && item.binary.data) {\n    const binaryData = await this.helpers.getBinaryDataBuffer(0, 'data');\n    item.json.file_base64 = binaryData.toString('base64');\n    item.json.mimeType = item.binary.data.mimeType || 'image/jpeg';\n    if (item.json.mimeType.includes('pdf')) item.json.ext = 'pdf';\n    else if (item.json.mimeType.includes('png')) item.json.ext = 'png';\n    else item.json.ext = 'jpg';\n  }\n}\nreturn items;"
        },
        "id": "convert-base64", "name": "Convertir a Base64",
        "type": "n8n-nodes-base.code", "typeVersion": 2, "position": [2400, -100]
    })
    connect("Descargar Archivo", "Convertir a Base64")
    
    # Llamar API OCR
    add_node({
        "parameters": {
            "method": "POST", "url": "http://ocr-service:8000/validate",
            "sendBody": True, "specifyBody": "keypair",
            "bodyParameters": {
                "parameters": [
                    { "name": "prompt", "value": "={{ $json.prompt }}" },
                    { "name": "file_base64", "value": "={{ $json.file_base64 }}" }
                ]
            },
            "options": {}
        },
        "id": "call-ocr-api", "name": "Llamar API OCR",
        "type": "n8n-nodes-base.httpRequest", "typeVersion": 4, "position": [2600, -100]
    })
    connect("Convertir a Base64", "Llamar API OCR")

    # ¿Es Válido?
    add_node({
        "parameters": { "conditions": { "boolean": [ { "value1": "={{ $json.valido }}", "value2": True } ] } },
        "id": "eval-ocr", "name": "¿Es Válido?",
        "type": "n8n-nodes-base.if", "typeVersion": 1, "position": [2800, -100]
    })
    connect("Llamar API OCR", "¿Es Válido?")

    # Restaurar Binario
    add_node({
        "parameters": {
            "jsCode": "const items = $input.all();\nfor (let item of items) {\n  const baseData = $('Convertir a Base64').first().json;\n  item.binary = {\n    data: {\n      data: baseData.file_base64,\n      mimeType: baseData.mimeType || 'image/jpeg',\n      fileName: baseData.columna + '.' + (baseData.ext || 'jpg')\n    }\n  };\n}\nreturn items;"
        },
        "id": "restore-binary", "name": "Restaurar Binario",
        "type": "n8n-nodes-base.code", "typeVersion": 2, "position": [3000, -100]
    })
    connect("¿Es Válido?", "Restaurar Binario", 0, 0)

    # Subir a Drive
    add_node({
        "parameters": {
            "operation": "upload",
            "fileContent": "data",
            "fileName": "={{ $('Convertir a Base64').first().json.columna }}.{{ $('Convertir a Base64').first().json.ext || 'jpg' }}",
            "parents": ["={{ $('Determinar Siguiente Doc').first().json.folder_id }}"],
            "options": {}
        },
        "id": "upload-drive", "name": "Subir a Drive",
        "type": "n8n-nodes-base.googleDrive", "typeVersion": 3, "position": [3200, -100],
        "credentials": { "googleDriveOAuth2Api": { "id": "xH344n6lX17B6nFm", "name": "Google Drive account" } }
    })
    connect("Restaurar Binario", "Subir a Drive")

    # DB APROBADO
    add_node({
        "parameters": {
            "operation": "executeQuery",
            "query": "UPDATE expedientes SET {{ $('Convertir a Base64').first().json.columna }} = 'APROBADO', motivos_rechazo_doc = '' WHERE prospecto_id = (SELECT id FROM prospectos WHERE telefono_contacto = '{{ $('Extraer Datos').first().json.phone }}');"
        },
        "id": "db-aprobado", "name": "DB APROBADO",
        "type": "n8n-nodes-base.postgres", "typeVersion": 2, "position": [3400, -200],
        "credentials": { "postgres": { "id": "1", "name": "Postgres account" } }
    })
    connect("Subir a Drive", "DB APROBADO")

    # Enviar Mensaje Final
    add_node({
        "parameters": {
            "method": "POST",
            "url": "=https://graph.facebook.com/v17.0/{{ $('Webhook Modulo 4').first().json.body.payload.entry[0].changes[0].value.metadata.phone_number_id }}/messages",
            "authentication": "predefinedCredentialType", "nodeCredentialType": "whatsAppApi",
            "sendBody": True, "specifyBody": "json",
            "jsonBody": "={{ JSON.stringify({ \"messaging_product\": \"whatsapp\", \"to\": $('Extraer Datos').first().json.phone, \"type\": \"text\", \"text\": { \"body\": $('Convertir a Base64').first().json.next_msg } }) }}"
        },
        "id": "send-success", "name": "Enviar Mensaje Final",
        "type": "n8n-nodes-base.httpRequest", "typeVersion": 4, "position": [3600, -200],
        "credentials": { "whatsAppApi": { "id": "gSEnpEOi1zRXy9fn", "name": "WhatsApp account" } }
    })
    connect("DB APROBADO", "Enviar Mensaje Final")

    # ¿Es el último doc?
    add_node({
        "parameters": { "conditions": { "string": [ { "value1": "={{ $('Convertir a Base64').first().json.columna }}", "value2": "estados_cuenta" } ] } },
        "id": "check-final", "name": "¿Es el último doc?",
        "type": "n8n-nodes-base.if", "typeVersion": 1, "position": [3200, -200]
    })
    connect("Enviar Mensaje Final", "¿Es el último doc?")

    # Ir a Módulo 5
    add_node({
        "parameters": {
            "operation": "executeQuery",
            "query": "UPDATE bot_sessions SET current_module = 'MODULO_5', current_step = 'EMPAQUETADO_DICTAMEN' WHERE phone_number = '{{ $('Extraer Datos').first().json.phone }}';"
        },
        "id": "go-mod5", "name": "Ir a Módulo 5",
        "type": "n8n-nodes-base.postgres", "typeVersion": 2, "position": [3400, -300],
        "credentials": { "postgres": { "id": "1", "name": "Postgres account" } }
    })
    connect("¿Es el último doc?", "Ir a Módulo 5", 0, 0)

    # DB RECHAZADO
    add_node({
        "parameters": {
            "operation": "executeQuery",
            "query": "UPDATE expedientes SET {{ $('Convertir a Base64').first().json.columna }} = 'RECHAZADO', motivos_rechazo_doc = '{{ $json.motivo_rechazo }}' WHERE prospecto_id = (SELECT id FROM prospectos WHERE telefono_contacto = '{{ $('Extraer Datos').first().json.phone }}');"
        },
        "id": "db-rechazado", "name": "DB RECHAZADO",
        "type": "n8n-nodes-base.postgres", "typeVersion": 2, "position": [2400, 100],
        "credentials": { "postgres": { "id": "1", "name": "Postgres account" } }
    })
    connect("¿Es Válido?", "DB RECHAZADO", 1, 0)

    # Enviar Mensaje Rechazo
    add_node({
        "parameters": {
            "method": "POST",
            "url": "=https://graph.facebook.com/v17.0/{{ $('Webhook Modulo 4').first().json.body.payload.entry[0].changes[0].value.metadata.phone_number_id }}/messages",
            "authentication": "predefinedCredentialType", "nodeCredentialType": "whatsAppApi",
            "sendBody": True, "specifyBody": "json",
            "jsonBody": "={{ JSON.stringify({ \"messaging_product\": \"whatsapp\", \"to\": $('Extraer Datos').first().json.phone, \"type\": \"text\", \"text\": { \"body\": \"⚠️ El documento no pudo ser validado.\\n\\nMotivo: \" + $('Llamar API OCR').first().json.motivo_rechazo + \"\\n\\nPor favor, envíalo nuevamente y asegúrate de que sea claro y legible.\" } }) }}"
        },
        "id": "send-error-doc", "name": "Enviar Mensaje Rechazo",
        "type": "n8n-nodes-base.httpRequest", "typeVersion": 4, "position": [2600, 100],
        "credentials": { "whatsAppApi": { "id": "gSEnpEOi1zRXy9fn", "name": "WhatsApp account" } }
    })
    connect("DB RECHAZADO", "Enviar Mensaje Rechazo")

    workflow = { "name": "Modulo 4: Auditoria Documental", "nodes": nodes, "connections": connections }
    with open('n8n-workflows/modulo-4-documentos.json', 'w', encoding='utf-8') as f:
        json.dump(workflow, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    create_workflow()
