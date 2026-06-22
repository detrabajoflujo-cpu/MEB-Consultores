const fs = require('fs');

const data = fs.readFileSync('n8n-workflows/modulo-4-recoleccion-expediente.json', 'utf8');
const workflow = JSON.parse(data);

const bodyExpression = `={{ 
(function() {
  const tipo = $('Identificar Tipo de Documento').item.json.tipoDoc;
  const telefono = $('Identificar Tipo de Documento').item.json.telefono;
  const validacion = $('Validar con OCR Backend').item.json;
  
  if (tipo === 'RESOLUCION_PENSION') {
      const apto = validacion.datosExtraidos && validacion.datosExtraidos.esAptoParaIncremento;
      if (apto) {
          return {
            "messaging_product": "whatsapp",
            "to": telefono,
            "type": "interactive",
            "interactive": {
              "type": "button",
              "body": {
                "text": "✅ *Resolución de Pensión* recibida y procesada con éxito.\\n\\n¡Felicidades! Tu banco está autorizado para el trámite.\\n\\nEl siguiente documento que necesitamos es tu *INE* (foto clara por ambos lados). Puedes enviarla ahora.\\n\\nAdemás, ¿te gustaría recibir una llamada de un asesor para explicarte el proceso?"
              },
              "action": {
                "buttons": [
                  {
                    "type": "reply",
                    "reply": {
                      "id": "llamada_si",
                      "title": "Sí, quiero llamada"
                    }
                  },
                  {
                    "type": "reply",
                    "reply": {
                      "id": "llamada_no",
                      "title": "No, seguir chat"
                    }
                  }
                ]
              }
            }
          };
      } else {
          return {
            "messaging_product": "whatsapp",
            "to": telefono,
            "type": "text",
            "text": { "body": "❌ *Resolución de Pensión* procesada.\\n\\nLamentablemente, tu institución bancaria no está en nuestra lista de bancos autorizados para realizar el trámite en este momento." }
          };
      }
  } else {
      let siguienteDoc = "el siguiente documento de su expediente.";
      if (tipo === 'INE') siguienteDoc = "su *Comprobante de Domicilio*.";
      if (tipo === 'COMPROBANTE_DOMICILIO') siguienteDoc = "su *Estado de Cuenta*.";
      
      return {
        "messaging_product": "whatsapp",
        "to": telefono,
        "type": "text",
        "text": { "body": "✅ *" + tipo.replace(/_/g, ' ') + "* recibido y validado correctamente.\\n\\nPuntaje de calidad: " + Math.round(validacion.puntajeCalidad * 100) + "%\\n\\nContinúe enviando " + siguienteDoc }
      };
  }
})()
}}`;

for (let node of workflow.nodes) {
    if (node.name === 'Notificar Documento Aprobado') {
        node.parameters.jsonBody = bodyExpression;
    }
}

fs.writeFileSync('n8n-workflows/modulo-4-recoleccion-expediente-v2.json', JSON.stringify(workflow, null, 2));
console.log('Successfully generated modulo-4-recoleccion-expediente-v2.json');
