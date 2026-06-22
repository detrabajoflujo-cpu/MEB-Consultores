const fs = require('fs');

const data = fs.readFileSync('n8n-workflows/modulo-1-ingesta-validacion-v5.json', 'utf8');
const workflow = JSON.parse(data);

for (let node of workflow.nodes) {
    if (node.name === 'Parsear CURP y NSS del Mensaje') {
        node.parameters.jsCode = `
// Parsear el mensaje para extraer CURP, NSS y datos del prospecto
const { telefono, mensaje, nombre, botonId } = $input.first().json;

// Extraer CURP (patrón de 18 caracteres)
const curpMatch = mensaje.match(/[a-zA-Z]{4}\\d{6}[hHmM][a-zA-Z]{5}[0-9a-zA-Z]\\d/);
const curp = curpMatch ? curpMatch[0].toUpperCase() : '';

// Extraer NSS (11 dígitos)
const nssMatch = mensaje.match(/\\b\\d{11}\\b/);
const nss = nssMatch ? nssMatch[0] : '';

// Extraer nombre si viene en el mensaje (después de NOMBRE:)
const nombreMatch = mensaje.match(/NOMBRE[:\\s]+([A-ZÁÉÍÓÚÑÜ ]+)/i);
const nombreExtraido = nombreMatch ? nombreMatch[1].trim() : nombre;

return [{ json: {
  telefono,
  curp,
  nss,
  botonId: botonId || '',
  nombre_completo: nombreExtraido,
  mensaje_original: mensaje,
  tiene_curp: curp.length > 0,
  tiene_nss: nss.length > 0
} }];
`;
    }
    
    if (node.name === '¿Tiene Datos Completos?') {
        for (let rule of node.parameters.rules.rules) {
            if (rule.operation === 'regex') {
                // Point it to the correct property
                rule.value1 = '={{ $json.mensaje_original }}';
            }
        }
    }
}

fs.writeFileSync('n8n-workflows/modulo-1-ingesta-validacion-v6.json', JSON.stringify(workflow, null, 2));
console.log('Generado modulo-1-ingesta-validacion-v6.json');
