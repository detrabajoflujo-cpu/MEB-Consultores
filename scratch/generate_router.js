const fs = require('fs');

const routerWorkflow = {
  "name": "Módulo 0: Enrutador Maestro",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "whatsapp-webhook-principal",
        "responseMode": "onReceived",
        "options": {}
      },
      "id": "webhook-principal",
      "name": "Webhook Principal (Meta)",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [0, 0]
    },
    {
      "parameters": {
        "jsCode": "const body = $input.first().json.body || $input.first().json;\n\n// Si es verificación de Meta\nif (body['hub.mode'] === 'subscribe') {\n  return [{ json: { tipo: 'VERIFICACION', challenge: body['hub.challenge'] } }];\n}\n\ntry {\n  const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];\n  if (!message) return [{ json: { tipo: 'EVENTO_IGNORADO' } }];\n  \n  const tipoMsj = message.type;\n  const isDocument = tipoMsj === 'image' || tipoMsj === 'document';\n  const isInteractive = tipoMsj === 'interactive';\n  \n  return [{ json: { tipo: isDocument ? 'DOCUMENTO' : (isInteractive ? 'BOTON' : 'TEXTO'), body: body } }];\n} catch(e) {\n  return [{ json: { tipo: 'TEXTO', body: body } }];\n}"
      },
      "id": "clasificador",
      "name": "Clasificador de Mensajes",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [220, 0]
    },
    {
      "parameters": {
        "dataType": "string",
        "value1": "={{ $json.tipo }}",
        "rules": {
          "rules": [
            {
              "value2": "DOCUMENTO",
              "output": 0
            },
            {
              "value2": "TEXTO",
              "output": 1
            },
            {
              "value2": "BOTON",
              "output": 2
            },
            {
              "value2": "VERIFICACION",
              "output": 3
            }
          ]
        }
      },
      "id": "switch-enrutador",
      "name": "Enrutador",
      "type": "n8n-nodes-base.switch",
      "typeVersion": 1,
      "position": [440, 0]
    },
    {
      "parameters": {
        "workflowId": "PON_AQUI_EL_ID_DEL_MODULO_4",
        "mode": "each",
        "options": {}
      },
      "id": "ejecutar-mod-4",
      "name": "Llamar Módulo 4 (Docs)",
      "type": "n8n-nodes-base.executeWorkflow",
      "typeVersion": 1,
      "position": [700, -100]
    },
    {
      "parameters": {
        "workflowId": "PON_AQUI_EL_ID_DEL_MODULO_1",
        "mode": "each",
        "options": {}
      },
      "id": "ejecutar-mod-1",
      "name": "Llamar Módulo 1 (Textos)",
      "type": "n8n-nodes-base.executeWorkflow",
      "typeVersion": 1,
      "position": [700, 50]
    },
    {
      "parameters": {
        "workflowId": "PON_AQUI_EL_ID_DEL_MODULO_3",
        "mode": "each",
        "options": {}
      },
      "id": "ejecutar-mod-3",
      "name": "Llamar Módulo 3 (Botones)",
      "type": "n8n-nodes-base.executeWorkflow",
      "typeVersion": 1,
      "position": [700, 200]
    },
    {
      "parameters": {
        "respondWith": "text",
        "responseBody": "={{ $json.challenge }}",
        "options": {}
      },
      "id": "responder-meta",
      "name": "Verificación de Meta",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [700, 350]
    }
  ],
  "connections": {
    "Webhook Principal (Meta)": {
      "main": [
        [
          {
            "node": "Clasificador de Mensajes",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Clasificador de Mensajes": {
      "main": [
        [
          {
            "node": "Enrutador",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Enrutador": {
      "main": [
        [
          {
            "node": "Llamar Módulo 4 (Docs)",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Llamar Módulo 1 (Textos)",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Llamar Módulo 3 (Botones)",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Verificación de Meta",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "settings": {
    "executionOrder": "v1"
  },
  "tags": [
    {
      "name": "Router Maestro"
    }
  ]
};

fs.writeFileSync('n8n-workflows/modulo-0-enrutador-maestro.json', JSON.stringify(routerWorkflow, null, 2));
console.log('Router generado');
