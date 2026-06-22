const fs = require('fs');

const path = 'C:/Users/Angel-PC/Downloads/PuntoClinico-Avances/PuntoClinico-Avances/n8n-workflows/modulo-3-llamada-agente.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

// 1. Add PDF Node
const pdfNode = {
  "parameters": {
    "method": "POST",
    "url": "=https://graph.facebook.com/v19.0/{{ $env.WHATSAPP_PHONE_ID }}/messages",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {"name": "Authorization", "value": "=Bearer {{ $env.WHATSAPP_TOKEN }}"},
        {"name": "Content-Type", "value": "application/json"}
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"messaging_product\": \"whatsapp\",\n  \"to\": \"{{ $('Procesar Resultado de Llamada').item.json.telefono }}\",\n  \"type\": \"document\",\n  \"document\": {\n    \"link\": \"https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf\",\n    \"caption\": \"Presentación Corporativa Punto Clínico\"\n  }\n}",
    "options": {}
  },
  "id": "enviar-pdf-corporativo",
  "name": "Enviar PDF Corporativo",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4,
  "position": [1560, 560]
};

// 2. Add Image Node
const imageNode = {
  "parameters": {
    "method": "POST",
    "url": "=https://graph.facebook.com/v19.0/{{ $env.WHATSAPP_PHONE_ID }}/messages",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {"name": "Authorization", "value": "=Bearer {{ $env.WHATSAPP_TOKEN }}"},
        {"name": "Content-Type", "value": "application/json"}
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"messaging_product\": \"whatsapp\",\n  \"to\": \"{{ $('Procesar Resultado de Llamada').item.json.telefono }}\",\n  \"type\": \"image\",\n  \"image\": {\n    \"link\": \"https://images.unsplash.com/photo-1556155092-490a1ba16284?auto=format&fit=crop&q=80\",\n    \"caption\": \"Requisitos Documentales para Trámite\"\n  }\n}",
    "options": {}
  },
  "id": "enviar-imagen-requisitos",
  "name": "Enviar Imagen Requisitos",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4,
  "position": [1780, 560]
};

data.nodes.push(pdfNode);
data.nodes.push(imageNode);

// Update connections
data.connections["Notificar — Confirmación y Asesor Asignado"] = {
  "main": [[{"node": "Enviar PDF Corporativo", "type": "main", "index": 0}]]
};
data.connections["Enviar PDF Corporativo"] = {
  "main": [[{"node": "Enviar Imagen Requisitos", "type": "main", "index": 0}]]
};

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log('M3 JSON modificado con exito.');
