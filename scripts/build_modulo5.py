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
        "parameters": { "httpMethod": "POST", "path": "modulo5", "options": {} },
        "id": "webhook-mod-5", "name": "Webhook Modulo 5",
        "type": "n8n-nodes-base.webhook", "typeVersion": 1, "position": [0, 0]
    })

    # Extraer Datos
    add_node({
        "parameters": {
            "keepOnlySet": True,
            "values": { "string": [
                { "name": "phone", "value": "={{ $json.body.payload.entry[0].changes[0].value.messages[0].from.replace(/^521/, '52') }}" },
                { "name": "media_id", "value": "={{ $json.body.payload.entry[0].changes[0].value.messages[0].image ? $json.body.payload.entry[0].changes[0].value.messages[0].image.id : '' }}" }
            ] },
            "options": {}
        },
        "id": "extraer-datos", "name": "Extraer Datos",
        "type": "n8n-nodes-base.set", "typeVersion": 2, "position": [200, 0]
    })
    connect("Webhook Modulo 5", "Extraer Datos")

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
            "url": "=https://graph.facebook.com/v17.0/{{ $('Webhook Modulo 5').first().json.body.payload.entry[0].changes[0].value.metadata.phone_number_id }}/messages",
            "authentication": "predefinedCredentialType", "nodeCredentialType": "whatsAppApi",
            "sendBody": True, "specifyBody": "json",
            "jsonBody": "={{ JSON.stringify({ \"messaging_product\": \"whatsapp\", \"to\": $('Extraer Datos').first().json.phone, \"type\": \"text\", \"text\": { \"body\": \"⚠️ Por favor, envíanos tu foto biométrica como una IMAGEN válida de WhatsApp.\" } }) }}"
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
            "query": "SELECT e.id as expediente_id, p.id as prospecto_id, e.nombre_carpeta_drive FROM expedientes e JOIN prospectos p ON e.prospecto_id = p.id WHERE p.telefono_contacto = '{{ $('Extraer Datos').first().json.phone }}';"
        },
        "id": "get-expediente", "name": "Obtener Expediente",
        "type": "n8n-nodes-base.postgres", "typeVersion": 2, "position": [800, -100],
        "credentials": { "postgres": { "id": "1", "name": "Postgres account" } }
    })
    connect("Obtener URL Archivo", "Obtener Expediente")

    # Set Prompt
    add_node({
        "id": "set-prompt", "name": "Set Prompt",
        "type": "n8n-nodes-base.set", "typeVersion": 1, "position": [1000, -100],
        "parameters": {
            "keepOnlySet": False,
            "values": { "string": [
                { "name": "prompt", "value": "Verifica que la imagen proporcionada sea una foto biométrica (una selfie de la persona tomada de medio cuerpo o rostro, sosteniendo claramente su Identificación Oficial INE cerca de su rostro). No evalúes la calidad artística, solo verifica que sea una selfie sosteniendo un INE." }
            ] },
            "options": {}
        }
    })
    connect("Obtener Expediente", "Set Prompt")

    # Descargar Archivo
    add_node({
        "parameters": {
            "method": "GET",
            "url": "={{ $('Obtener URL Archivo').first().json.url }}",
            "authentication": "predefinedCredentialType", "nodeCredentialType": "whatsAppApi",
            "responseFormat": "file", "dataPropertyName": "data", "options": {}
        },
        "id": "download-media", "name": "Descargar Archivo",
        "type": "n8n-nodes-base.httpRequest", "typeVersion": 3, "position": [1200, -100],
        "credentials": { "whatsAppApi": { "id": "gSEnpEOi1zRXy9fn", "name": "WhatsApp account" } }
    })
    connect("Set Prompt", "Descargar Archivo")

    # Convertir a Base64
    add_node({
        "id": "to-base64", "name": "Convertir a Base64",
        "type": "n8n-nodes-base.code", "typeVersion": 2, "position": [1400, -100],
        "parameters": {
            "jsCode": "const items = $input.all();\nfor (let item of items) {\n  if (item.binary && item.binary.data) {\n    const binaryData = await this.helpers.getBinaryDataBuffer(0, 'data');\n    item.json.base64 = binaryData.toString('base64');\n    item.json.mimeType = item.binary.data.mimeType || 'image/jpeg';\n    if (item.json.mimeType.includes('pdf')) item.json.ext = 'pdf';\n    else if (item.json.mimeType.includes('png')) item.json.ext = 'png';\n    else item.json.ext = 'jpg';\n  }\n}\nreturn items;"
        }
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
                    { "name": "file_base64", "value": "={{ $json.base64 }}" }
                ]
            },
            "options": {}
        },
        "id": "call-ocr", "name": "Llamar API OCR",
        "type": "n8n-nodes-base.httpRequest", "typeVersion": 4, "position": [1600, -100]
    })
    connect("Convertir a Base64", "Llamar API OCR")

    # Es Válido?
    add_node({
        "parameters": { "conditions": { "boolean": [ { "value1": "={{ $json.valido }}", "value2": True } ] } },
        "id": "is-valid", "name": "¿Es Válido?",
        "type": "n8n-nodes-base.if", "typeVersion": 1, "position": [1800, -100]
    })
    connect("Llamar API OCR", "¿Es Válido?")

    # DB RECHAZADO
    add_node({
        "parameters": {
            "operation": "executeQuery",
            "query": "UPDATE expedientes SET foto_con_ine = 'RECHAZADO' WHERE prospecto_id = {{ $('Obtener Expediente').first().json.prospecto_id }};"
        },
        "id": "db-rechazado", "name": "DB RECHAZADO",
        "type": "n8n-nodes-base.postgres", "typeVersion": 2, "position": [1900, 100],
        "credentials": { "postgres": { "id": "1", "name": "Postgres account" } }
    })
    connect("¿Es Válido?", "DB RECHAZADO", 1, 0)

    # Enviar Error
    add_node({
        "parameters": {
            "method": "POST",
            "url": "=https://graph.facebook.com/v17.0/{{ $('Webhook Modulo 5').first().json.body.payload.entry[0].changes[0].value.metadata.phone_number_id }}/messages",
            "authentication": "predefinedCredentialType", "nodeCredentialType": "whatsAppApi",
            "sendBody": True, "specifyBody": "json",
            "jsonBody": "={{ JSON.stringify({ \"messaging_product\": \"whatsapp\", \"to\": $('Extraer Datos').first().json.phone, \"type\": \"text\", \"text\": { \"body\": \"⚠️ Hubo un problema con tu foto biométrica:\\n\\n\" + $('Llamar API OCR').first().json.motivo_rechazo + \"\\n\\nPor favor, vuelve a intentarlo.\" } }) }}"
        },
        "id": "send-error", "name": "Enviar Mensaje Error",
        "type": "n8n-nodes-base.httpRequest", "typeVersion": 4, "position": [2100, 100],
        "credentials": { "whatsAppApi": { "id": "gSEnpEOi1zRXy9fn", "name": "WhatsApp account" } }
    })
    connect("DB RECHAZADO", "Enviar Mensaje Error")

    # DB APROBADO
    add_node({
        "parameters": {
            "operation": "executeQuery",
            "query": "UPDATE expedientes SET foto_con_ine = 'APROBADO', estatus_expediente = 'COMPLETO' WHERE prospecto_id = {{ $('Obtener Expediente').first().json.prospecto_id }}; UPDATE prospectos SET estatus = 'FORMALIZADO' WHERE id = {{ $('Obtener Expediente').first().json.prospecto_id }};"
        },
        "id": "db-aprobado", "name": "DB APROBADO",
        "type": "n8n-nodes-base.postgres", "typeVersion": 2, "position": [1900, -200],
        "credentials": { "postgres": { "id": "1", "name": "Postgres account" } }
    })
    connect("¿Es Válido?", "DB APROBADO", 0, 0)

    # Restaurar Binario
    add_node({
        "parameters": {
            "jsCode": "const items = $input.all();\nfor (let item of items) {\n  const baseData = $('Convertir a Base64').first().json;\n  item.binary = {\n    data: {\n      data: baseData.base64,\n      mimeType: baseData.mimeType || 'image/jpeg',\n      fileName: 'biometria.' + (baseData.ext || 'jpg')\n    }\n  };\n}\nreturn items;"
        },
        "id": "restore-binary", "name": "Restaurar Binario",
        "type": "n8n-nodes-base.code", "typeVersion": 2, "position": [2100, -200]
    })
    connect("DB APROBADO", "Restaurar Binario")

    # Subir a Drive
    add_node({
        "parameters": {
            "operation": "upload",
            "fileContent": "data",
            "fileName": "=biometria.{{ $('Convertir a Base64').first().json.ext || 'jpg' }}",
            "parents": ["={{ $('Obtener Expediente').first().json.nombre_carpeta_drive }}"],
            "options": {}
        },
        "id": "upload-drive", "name": "Subir a Drive",
        "type": "n8n-nodes-base.googleDrive", "typeVersion": 3, "position": [2300, -200],
        "credentials": { "googleDriveOAuth2Api": { "id": "xH344n6lX17B6nFm", "name": "Google Drive account" } }
    })
    connect("Restaurar Binario", "Subir a Drive")

    # Final Msg
    add_node({
        "parameters": {
            "method": "POST",
            "url": "=https://graph.facebook.com/v17.0/{{ $('Webhook Modulo 5').first().json.body.payload.entry[0].changes[0].value.metadata.phone_number_id }}/messages",
            "authentication": "predefinedCredentialType", "nodeCredentialType": "whatsAppApi",
            "sendBody": True, "specifyBody": "json",
            "jsonBody": "={{ JSON.stringify({ \"messaging_product\": \"whatsapp\", \"to\": $('Extraer Datos').first().json.phone, \"type\": \"text\", \"text\": { \"body\": \"¡Biometría aprobada y expediente subido a Drive! ✅\\n\\nTu expediente ha sido empaquetado y transferido al Agente de Cierre para el Cobro de Honorarios - CERRADO EXITOSAMENTE.\" } }) }}"
        },
        "id": "send-success", "name": "Enviar Cierre",
        "type": "n8n-nodes-base.httpRequest", "typeVersion": 4, "position": [2500, -200],
        "credentials": { "whatsAppApi": { "id": "gSEnpEOi1zRXy9fn", "name": "WhatsApp account" } }
    })
    connect("Subir a Drive", "Enviar Cierre")

    # Cerrar Sesion
    add_node({
        "parameters": {
            "operation": "executeQuery",
            "query": "DELETE FROM bot_sessions WHERE phone_number = '{{ $('Extraer Datos').first().json.phone }}';"
        },
        "id": "cerrar-sesion", "name": "Cerrar Sesión",
        "type": "n8n-nodes-base.postgres", "typeVersion": 2, "position": [2700, -200],
        "credentials": { "postgres": { "id": "1", "name": "Postgres account" } }
    })
    connect("Enviar Cierre", "Cerrar Sesión")

    workflow = {
        "name": "Módulo 5: Empaquetado y Cierre",
        "nodes": nodes,
        "connections": connections,
        "settings": { "executionOrder": "v1" }
    }

    with open("n8n-workflows/modulo-5-cierre.json", "w", encoding="utf-8") as f:
        json.dump(workflow, f, indent=2, ensure_ascii=False)
    print("Módulo 5 generado con éxito.")

if __name__ == "__main__":
    create_workflow()
