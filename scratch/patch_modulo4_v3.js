const fs = require('fs');

const data = fs.readFileSync('n8n-workflows/modulo-4-recoleccion-expediente.json', 'utf8');
const workflow = JSON.parse(data);

const bodyExpression = `={{ 
(function() {
  const tipo = $('Identificar Tipo de Documento').item.json.tipoDoc;
  const telefono = $('Identificar Tipo de Documento').item.json.telefono;
  const validacion = $('Validar con OCR Backend').item.json;
  
  if (validacion.expedienteCierreCompleto) {
      return {
        "messaging_product": "whatsapp",
        "to": telefono,
        "type": "text",
        "text": { "body": "✅ *Foto con INE (Biométrica) recibida y validada con éxito.*\\n\\n¡Felicidades! Tu expediente está 100% completo y listo para firma. Un asesor te contactará a la brevedad para finalizar." }
      };
  } else if (validacion.expedienteCompleto && tipo !== 'FOTO_INE') {
      return {
        "messaging_product": "whatsapp",
        "to": telefono,
        "type": "interactive",
        "interactive": {
          "type": "button",
          "body": {
            "text": "✅ *Todos tus documentos han sido validados con éxito.*\\n\\n¡Felicidades! Hemos completado la revisión de tu expediente y tu trámite está pre-aprobado.\\n\\n¿Te gustaría recibir una llamada de un asesor para explicarte el proceso de firma?"
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
      let siguienteDoc = validacion.siguienteDocumentoRequerido;
      const nombresDoc = {
        'INE': 'tu *INE* (foto clara por ambos lados)',
        'COMPROBANTE_DOMICILIO': 'tu *Comprobante de Domicilio* (recibo de luz no mayor a 3 meses)',
        'RESOLUCION_PENSION': 'tu *Resolución de Pensión* (hoja amarilla del IMSS)',
        'ESTADO_CUENTA': 'tus *Estados de Cuenta* (de los últimos 2 meses)',
        'RESUMEN_MOVIMIENTOS': 'tu *Resumen de Movimientos* (de los últimos 60 días)',
        'FOTO_INE': 'tu *Foto Biométrica* (foto de medio cuerpo sosteniendo tu INE)'
      };
      let nombreLegible = nombresDoc[siguienteDoc] || siguienteDoc;
      
      return {
        "messaging_product": "whatsapp",
        "to": telefono,
        "type": "text",
        "text": { "body": "✅ *" + tipo.replace(/_/g, ' ') + "* recibido y validado correctamente.\\n\\nPuntaje de calidad: " + Math.round(validacion.puntajeCalidad * 100) + "%\\n\\nPara continuar, por favor envía " + nombreLegible + "." }
      };
  }
})()
}}`;

for (let node of workflow.nodes) {
    if (node.name === 'Notificar Documento Aprobado') {
        node.parameters.jsonBody = bodyExpression;
    }
}

fs.writeFileSync('n8n-workflows/modulo-4-recoleccion-expediente-v4.json', JSON.stringify(workflow, null, 2));
console.log('Successfully generated modulo-4-recoleccion-expediente-v4.json');
