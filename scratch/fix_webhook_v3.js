const fs = require('fs');

const data = fs.readFileSync('n8n-workflows/modulo-0-enrutador-proxy-v2.json', 'utf8');
const workflow = JSON.parse(data);

for (let node of workflow.nodes) {
    if (node.name === 'Verificar Meta (GET)') {
        node.parameters.responseMode = 'responseNode';
    }
}

fs.writeFileSync('n8n-workflows/modulo-0-enrutador-proxy-v3.json', JSON.stringify(workflow, null, 2));
console.log('Fixed Webhook GET responseMode to responseNode.');
