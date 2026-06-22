import React from 'react';

interface OcrDoc {
  label: string;
  icon: string;
  estado: string;
}

interface EstadoOcrProps {
  ine?: string;
  comprobante?: string;
  resolucion?: string;
  estadosCuenta?: string;
  fotoIne?: string;
}

const EstadoOcr: React.FC<EstadoOcrProps> = ({
  ine = 'PENDIENTE',
  comprobante = 'PENDIENTE',
  resolucion = 'PENDIENTE',
  estadosCuenta = 'PENDIENTE',
  fotoIne = 'PENDIENTE'
}) => {
  const docs: OcrDoc[] = [
    { label: 'INE Ambos Lados', icon: '🪪', estado: ine },
    { label: 'Comprobante Domicilio', icon: '📄', estado: comprobante },
    { label: 'Resolución Pensión', icon: '📋', estado: resolucion },
    { label: '2 Estados de Cuenta', icon: '🏦', estado: estadosCuenta },
    { label: 'Foto con INE', icon: '📸', estado: fotoIne },
  ];

  const getClass = (estado: string) => {
    if (estado === 'APROBADO') return 'approved';
    if (estado === 'RECHAZADO' || estado === 'ILEGIBLE') return 'rejected';
    return 'pending';
  };

  const getStatusText = (estado: string) => {
    const map: Record<string, string> = {
      APROBADO: '✅ Aprobado',
      RECHAZADO: '❌ Rechazado',
      ILEGIBLE: '⚠️ Ilegible',
      PENDIENTE: '⏳ Pendiente',
    };
    return map[estado] || estado;
  };

  const aprobados = docs.filter(d => d.estado === 'APROBADO').length;
  const porcentaje = Math.round((aprobados / docs.length) * 100);

  return (
    <div>
      {/* Barra de progreso */}
      <div style={{ marginBottom: 16 }}>
        <div className="flex items-center justify-between mb-2" style={{ marginBottom: 8 }}>
          <span className="text-sm text-secondary">Completado</span>
          <span style={{ fontWeight: 700, color: porcentaje === 100 ? 'var(--green)' : 'var(--accent-primary)' }}>
            {aprobados}/{docs.length} docs — {porcentaje}%
          </span>
        </div>
        <div style={{
          height: 6,
          background: 'var(--bg-glass)',
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid var(--border)'
        }}>
          <div style={{
            height: '100%',
            width: `${porcentaje}%`,
            background: porcentaje === 100
              ? 'linear-gradient(90deg, var(--green), #34d399)'
              : 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
            borderRadius: 3,
            transition: 'width 0.8s ease'
          }} />
        </div>
      </div>

      <div className="ocr-grid">
        {docs.map((doc) => (
          <div key={doc.label} className={`ocr-item ${getClass(doc.estado)}`}>
            <div className="ocr-icon">{doc.icon}</div>
            <div className="ocr-label">{doc.label}</div>
            <div className="ocr-status">{getStatusText(doc.estado)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EstadoOcr;
