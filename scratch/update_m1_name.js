const fs = require('fs');

const path = 'C:/Users/Angel-PC/Downloads/PuntoClinico-Avances/PuntoClinico-Avances/n8n-workflows/modulo-1-ingesta-validacion-v7.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

for (let node of data.nodes) {
    if (node.name === 'Parsear CURP y NSS del Mensaje') {
        const newCode = `
// Parsear el mensaje para extraer CURP, NSS y datos del prospecto
const { telefono, mensaje, nombre, botonId } = $input.first().json;

// Extraer CURP (patrón de 18 caracteres)
const curpMatch = mensaje.match(/[a-zA-Z]{4}\\d{6}[hHmM][a-zA-Z]{5}[0-9a-zA-Z]\\d/);
const curp = curpMatch ? curpMatch[0].toUpperCase() : '';

// Extraer NSS (11 dígitos)
const nssMatch = mensaje.match(/\\b\\d{11}\\b/);
const nss = nssMatch ? nssMatch[0] : '';

// Lógica mejorada para extraer el nombre
let nombreExtraido = nombre; // Por defecto el nombre del perfil de WhatsApp

// Intentar extraer si viene con etiqueta "NOMBRE:"
const nombreMatch = mensaje.match(/NOMBRE[:\\s]+([A-ZÁÉÍÓÚÑa-záéíóúñ '.]+)/i);
if (nombreMatch) {
    nombreExtraido = nombreMatch[1].trim();
} else if (curp && nss) {
    // Si mandó los 3 datos en líneas separadas sin etiquetas, la primera línea suele ser el nombre
    const lineas = mensaje.split('\\n').map(l => l.trim()).filter(l => l.length > 0);
    for (let linea of lineas) {
        // Si la línea no es la CURP ni el NSS y tiene letras (parece un nombre)
        if (!linea.includes(curp) && !linea.includes(nss) && /[a-zA-Z]/.test(linea) && linea.length < 50) {
            nombreExtraido = linea;
            break;
        }
    }
}

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
        node.parameters.jsCode = newCode;
    }
}

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log('M1 Name parsing logic updated successfully.');
