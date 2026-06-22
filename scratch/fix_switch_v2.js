const fs = require('fs');

const data = fs.readFileSync('n8n-workflows/modulo-1-ingesta-validacion-v3.json', 'utf8');
const workflow = JSON.parse(data);

for (let node of workflow.nodes) {
    if (node.name === '¿Tiene Datos Completos?') {
        node.typeVersion = 1;
    }
}

fs.writeFileSync('n8n-workflows/modulo-1-ingesta-validacion-v4.json', JSON.stringify(workflow, null, 2));
console.log('Fixed switch typeVersion to 1.');
