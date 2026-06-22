const fs = require('fs');

const data = fs.readFileSync('n8n-workflows/modulo-4-recoleccion-expediente-v5.json', 'utf8');
const workflow = JSON.parse(data);

for (let node of workflow.nodes) {
    if (node.name === 'Notificar Documento Aprobado') {
        node.parameters.jsonBody = `={{ 
(function() {
  const tipo = $('Identificar Tipo de Documento').item.json.tipoDoc;
  const telefono = $('Identificar Tipo de Documento').item.json.telefono;
  const validacion = $('Validar con OCR Backend').item.json;
  
  let datosTexto = "";
  if (validacion.datosExtraidos) {
      const d = validacion.datosExtraidos;
      datosTexto = "\\n\\n📄 *Datos Extraídos:*\\n" +
                   "• Pensión: $" + (d.montoPensionActual || 'No detectado') + "\\n" +
                   "• Banco: " + (d.institucionBancaria || 'No detectado') + "\\n" +
                   "• Retenciones: " + (d.tieneRetenciones ? 'Sí' : 'No');
  }

  if (validacion.expedienteCierreCompleto) {
      return {
        "messaging_product": "whatsapp",
        "to": telefono,
        "type": "text",
        "text": { "body": "✅ *Foto con INE (Biométrica) recibida y validada con éxito.*\\n\\n¡Felicidades! Tu expediente está 100% completo y listo para firma." }
      };
  } else if (validacion.expedienteCompleto && tipo !== 'FOTO_INE') {
      return {
        "messaging_product": "whatsapp",
        "to": telefono,
        "type": "text",
        "text": { "body": "✅ *Todos tus documentos han sido validados con éxito.*" + datosTexto + "\\n\\n¡Felicidades! Hemos completado la revisión de tu expediente y tu trámite está pre-aprobado." }
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
      let nombreLegible = nombresDoc[siguienteDoc] || ("un documento válido para tu expediente");
      
      return {
        "messaging_product": "whatsapp",
        "to": telefono,
        "type": "text",
        "text": { "body": "✅ *" + tipo.replace(/_/g, ' ') + "* recibido y validado correctamente.\\n\\nPuntaje de calidad: " + Math.round(validacion.puntajeCalidad * 100) + "%" + datosTexto + "\\n\\nPara continuar, por favor envía " + nombreLegible + "." }
      };
  }
})()
}}`;
    }
}

fs.writeFileSync('n8n-workflows/modulo-4-recoleccion-expediente-v6.json', JSON.stringify(workflow, null, 2));
console.log('Generado modulo-4-recoleccion-expediente-v6.json');
