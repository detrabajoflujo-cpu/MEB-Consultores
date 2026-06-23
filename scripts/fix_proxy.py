import json

def fix_proxy():
    file_path = 'n8n-workflows/modulo-0-proxy.json'
    with open(file_path, 'r', encoding='utf-8') as f:
        d = json.load(f)
    
    for node in d.get('nodes', []):
        if 'jsonBody' in node.get('parameters', {}):
            node['parameters']['jsonBody'] = "={{ ({ phone: $json.phone, current_step: $json.current_step, payload: $json.payload }) }}"
            
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(d, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    fix_proxy()
