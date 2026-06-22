const fs = require('fs');

const data = fs.readFileSync('n8n-workflows/modulo-1-ingesta-validacion.json', 'utf8');
const workflow = JSON.parse(data);

let maxNodeId = 0;
// We'll replace the Enviar Bienvenida WhatsApp node and Extraer SenderID node.
// And we'll update the switch ¿Tiene Datos Completos?.

for (let node of workflow.nodes) {
    if (node.name === 'Extraer SenderID y Mensaje') {
        node.parameters.jsCode = `const data = $input.first().json.body || $input.first().json;

let telefono = '';
let mensaje = '';
let nombre = '';
let curp = '';
let nss = '';
let botonId = '';

try {
  const entry = data.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  if (value?.messages) {
    telefono = value.messages[0]?.from || '';
    nombre = value.contacts?.[0]?.profile?.name || 'Sin nombre';
    
    if (value.messages[0]?.type === 'interactive') {
        botonId = value.messages[0].interactive?.button_reply?.id || '';
    } else {
        mensaje = value.messages[0]?.text?.body || '';
    }
  } else {
    throw new Error('Not meta format');
  }
} catch(e) {
  telefono = data.telefono || data.from || '';
  mensaje = data.mensaje || data.text || '';
  nombre = data.nombre || data.name || 'Sin nombre';
  curp = data.curp || data.bordillo || '';
  nss = data.nss || '';
}

if (curp && nss && !mensaje.includes(curp)) {
    mensaje += \` CURP: \${curp} NSS: \${nss} NOMBRE: \${nombre}\`;
}

return [{ json: { telefono, mensaje, nombre, botonId, timestamp: new Date().toISOString() } }];`;
    }

    if (node.name === '¿Tiene Datos Completos?') {
        node.parameters = {
            "dataType": "string",
            "value1": "={{ $json.botonId }}",
            "rules": {
              "rules": [
                {
                  "value1": "={{ $json.mensaje }}",
                  "operation": "regex",
                  "value2": "(?i)[A-Z]{4}\\d{6}[HM][A-Z]{5}[0-9A-Z]\\d",
                  "output": 0
                },
                {
                  "operation": "equal",
                  "value2": "BTN_TRAMITE_PROPIO",
                  "output": 1
                },
                {
                  "operation": "equal",
                  "value2": "BTN_TRAMITE_TERCERO",
                  "output": 1
                }
              ]
            },
            "fallbackOutput": 2
        };
    }
}

// We need to change the connection from ¿Tiene Datos Completos?
// Output 0: Backend Validar
// Output 1: Pedir CURP y NSS
// Output 2: Bienvenida (MEB)
workflow.connections['¿Tiene Datos Completos?'] = {
    "main": [
        [
            {
                "node": "Validar en Backend Java",
                "type": "main",
                "index": 0
            }
        ],
        [
            {
                "node": "Pedir CURP y NSS",
                "type": "main",
                "index": 0
            }
        ],
        [
            {
                "node": "Enviar Bienvenida WhatsApp",
                "type": "main",
                "index": 0
            }
        ]
    ]
};

// Now create the new Pedir CURP y NSS node
workflow.nodes.push({
    "parameters": {
        "method": "POST",
        "url": "https://graph.facebook.com/v19.0/{{$env[\"META_PHONE_ID\"]}}/messages",
        "sendHeaders": true,
        "headerParameters": {
            "parameters": [
                {
                    "name": "Authorization",
                    "value": "Bearer {{$env[\"META_TOKEN\"]}}"
                },
                {
                    "name": "Content-Type",
                    "value": "application/json"
                }
            ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"messaging_product\": \"whatsapp\",\n  \"to\": \"{{ $('Extraer SenderID y Mensaje').item.json.telefono }}\",\n  \"type\": \"text\",\n  \"text\": {\n    \"body\": \"¡Perfecto! Para poder hacer un análisis y proyección sin costo, por favor envíanos los siguientes datos en un solo mensaje:\\n\\n🔹 *Nombre Completo* (de la persona interesada)\\n🔹 *CURP* (18 caracteres)\\n🔹 *NSS* (11 dígitos)\\n\\nUna vez que recibamos estos datos, nuestro sistema verificará la viabilidad de forma automática.\"\n  }\n}",
        "options": {}
    },
    "id": "pedir-curp-nss",
    "name": "Pedir CURP y NSS",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4,
    "position": [960, 400]
});

// Replace Bienvenida Node
for (let node of workflow.nodes) {
    if (node.name === 'Enviar Bienvenida WhatsApp') {
        node.position = [960, 600];
        node.parameters.jsonBody = "={\n  \"messaging_product\": \"whatsapp\",\n  \"to\": \"{{ $('Extraer SenderID y Mensaje').item.json.telefono }}\",\n  \"type\": \"interactive\",\n  \"interactive\": {\n    \"type\": \"button\",\n    \"body\": {\n      \"text\": \"✨ ¡Hola {{ $('Extraer SenderID y Mensaje').item.json.nombre }}! Te damos la bienvenida a *MEB Consultores*.*\\n\\nSomos expertos en mejorar y aumentar el monto de tu pensión de forma rápida, segura y 100% legal, respaldados plenamente bajo la *Ley 73 del IMSS*. Nuestro objetivo es asegurar el patrimonio que construiste toda tu vida.\\n\\nPara comenzar a ayudarte de la mejor manera, por favor indícanos:\\n\\n¿Este trámite es para ti o estás ayudando a un familiar/conocido?\"\n    },\n    \"action\": {\n      \"buttons\": [\n        {\n          \"type\": \"reply\",\n          \"reply\": {\n            \"id\": \"BTN_TRAMITE_PROPIO\",\n            \"title\": \"Es para mí\"\n          }\n        },\n        {\n          \"type\": \"reply\",\n          \"reply\": {\n            \"id\": \"BTN_TRAMITE_TERCERO\",\n            \"title\": \"Ayudo a alguien\"\n          }\n        }\n      ]\n    }\n  }\n}";
    }
}

fs.writeFileSync('n8n-workflows/modulo-1-ingesta-validacion-v2.json', JSON.stringify(workflow, null, 2));
console.log('Successfully generated modulo-1-ingesta-validacion-v2.json');
