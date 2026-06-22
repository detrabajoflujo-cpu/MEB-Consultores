const fs = require('fs');

const data = fs.readFileSync('n8n-workflows/modulo-1-ingesta-validacion-v2.json', 'utf8');
const workflow = JSON.parse(data);

for (let node of workflow.nodes) {
    if (node.name === '¿Tiene Datos Completos?') {
        node.type = 'n8n-nodes-base.switch';
        node.typeVersion = 3;
    }
}

fs.writeFileSync('n8n-workflows/modulo-1-ingesta-validacion-v3.json', JSON.stringify(workflow, null, 2));
console.log('Fixed switch type.');
