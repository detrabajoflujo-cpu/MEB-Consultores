const fs = require('fs');

const data = fs.readFileSync('n8n-workflows/modulo-1-ingesta-validacion-v4.json', 'utf8');
const workflow = JSON.parse(data);

for (let node of workflow.nodes) {
    if (node.name === '¿Tiene Datos Completos?') {
        for (let rule of node.parameters.rules.rules) {
            if (rule.operation === 'regex') {
                // Remove (?i) and replace letters with case-insensitive ranges
                rule.value2 = '[a-zA-Z]{4}\\\\d{6}[hHmM][a-zA-Z]{5}[0-9a-zA-Z]\\\\d';
            }
        }
    }
}

fs.writeFileSync('n8n-workflows/modulo-1-ingesta-validacion-v5.json', JSON.stringify(workflow, null, 2));
console.log('Generado modulo-1-ingesta-validacion-v5.json con regex corregido.');
