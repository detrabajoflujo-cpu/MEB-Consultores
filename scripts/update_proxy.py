import json

with open('n8n-workflows/modulo-0-proxy.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Find switch-modulos node
for node in data['nodes']:
    if node['id'] == 'switch-modulos':
        rules = node['parameters']['rules']['rules']
        if not any(r['value2'] == 'MODULO_5' for r in rules):
            rules.append({
              "value2": "MODULO_5",
              "output": 4
            })
            
# Check if http-mod5 exists
if not any(node['id'] == 'http-mod5' for node in data['nodes']):
    data['nodes'].append({
      "parameters": {
        "method": "POST",
        "url": "http://localhost:5678/webhook/modulo5",
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "={{ ({ phone: $json.phone, current_step: $json.current_step, payload: $json.payload }) }}",
        "options": {}
      },
      "id": "http-mod5",
      "name": "Lanzar Módulo 5",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [1200, 700]
    })

# Add connection
conns = data['connections']['Enrutador Principal']['main']
if len(conns) == 4:
    conns.append([
        {
        "node": "Lanzar Módulo 5",
        "type": "main",
        "index": 0
        }
    ])

with open('n8n-workflows/modulo-0-proxy.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)
