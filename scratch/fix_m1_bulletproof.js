const fs = require('fs');

const data = fs.readFileSync('n8n-workflows/modulo-1-ingesta-validacion-v6.json', 'utf8');
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

// === LÓGICA DE ENRUTAMIENTO INFALIBLE ===
let ruta = 2; // Por defecto: Enviar Bienvenida

if (curp !== '') {
    ruta = 0; // Si hay CURP, enviar a Validar en Backend
} else if (botonId === 'BTN_TRAMITE_PROPIO' || botonId === 'BTN_TRAMITE_TERCERO') {
    ruta = 1; // Si presionó el botón, enviar a Pedir CURP y NSS
}

return [{ json: {
  telefono,
  curp,
  nss,
  botonId: botonId || '',
  nombre_completo: nombreExtraido,
  mensaje_original: mensaje,
  tiene_curp: curp.length > 0,
  tiene_nss: nss.length > 0,
  ruta: ruta
} }];
`;
    }
    
    if (node.name === '¿Tiene Datos Completos?') {
        node.parameters = {
            dataType: "number",
            value1: "={{ $json.ruta }}",
            rules: {
                rules: [
                    {
                        operation: "equal",
                        value2: 0,
                        output: 0
                    },
                    {
                        operation: "equal",
                        value2: 1,
                        output: 1
                    }
                ]
            },
            fallbackOutput: 2
        };
    }
}

fs.writeFileSync('n8n-workflows/modulo-1-ingesta-validacion-v7.json', JSON.stringify(workflow, null, 2));
console.log('Generado modulo-1-ingesta-validacion-v7.json');
