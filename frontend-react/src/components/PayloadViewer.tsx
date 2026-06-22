import React, { useState } from 'react';

interface PayloadViewerProps {
  payload: object;
  title?: string;
}

function syntaxHighlight(json: string): string {
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'json-key' : 'json-string';
      } else if (/true|false/.test(match)) {
        cls = 'json-bool';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

const PayloadViewer: React.FC<PayloadViewerProps> = ({ payload, title = 'Payload JSON Final' }) => {
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(payload, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2" style={{ marginBottom: 12 }}>
        <div>
          <div className="section-title" style={{ fontSize: 14 }}>{title}</div>
          <div className="text-xs text-muted">{Object.keys(payload).length} secciones</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
          {copied ? '✅ Copiado' : '📋 Copiar'}
        </button>
      </div>
      <div
        className="json-viewer"
        dangerouslySetInnerHTML={{ __html: syntaxHighlight(jsonString) }}
      />
    </div>
  );
};

export default PayloadViewer;
