import React, { useState } from 'react';
import { useStore, NOTA_ICONS, type NotaTipo } from '../services/store';
import { useAuth } from '../services/auth';
import { useToast } from '../services/store';

interface Props {
  prospectoId: number;
}

const TIPOS: { value: NotaTipo; label: string; color: string }[] = [
  { value: 'urgente',   label: '🚨 Urgente',         color: 'var(--red)' },
  { value: 'documento', label: '📄 Documento',        color: 'var(--blue)' },
  { value: 'llamada',   label: '📞 Llamada',          color: 'var(--green)' },
  { value: 'general',   label: '💬 General',          color: 'var(--purple)' },
];

const PanelNotas: React.FC<Props> = ({ prospectoId }) => {
  const { getNotasByProspecto, addNota, resolveNota, deleteNota } = useStore();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [texto, setTexto]   = useState('');
  const [tipo, setTipo]     = useState<NotaTipo>('general');
  const [showForm, setShowForm] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  const notas = getNotasByProspecto(prospectoId);
  const pendientes = notas.filter(n => !n.resuelta);
  const resueltas  = notas.filter(n => n.resuelta);

  const handleAdd = () => {
    if (!texto.trim()) return;
    addNota(prospectoId, {
      texto: texto.trim(),
      tipo,
      resuelta: false,
      prospectoId,
      autor: user?.name || 'Admin',
    });
    setTexto('');
    setShowForm(false);
    addToast('Nota agregada', 'success');
  };

  const fmtDate = (d: string) => {
    try {
      return new Date(d).toLocaleString('es-MX', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      });
    } catch { return d; }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            Notas y Recordatorios
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            {pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''} · {resueltas.length} resuelta{resueltas.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowForm(v => !v)}
        >
          {showForm ? '✕ Cancelar' : '+ Nueva Nota'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card fade-in" style={{ padding: 16, background: 'var(--bg-elevated)' }}>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label className="form-label">Tipo de Recordatorio</label>
            <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
              {TIPOS.map(t => (
                <button
                  key={t.value}
                  className={`btn btn-sm ${tipo === t.value ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setTipo(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label className="form-label">Nota / Recordatorio</label>
            <textarea
              className="input"
              rows={3}
              placeholder={`Ej: Falta INE actualizado, Llamar el lunes, Revisar resolución de pensión…`}
              value={texto}
              onChange={e => setTexto(e.target.value)}
              style={{ resize: 'vertical', minHeight: 70 }}
            />
          </div>
          <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" disabled={!texto.trim()} onClick={handleAdd}>
              ✓ Guardar Nota
            </button>
          </div>
        </div>
      )}

      {/* Pending notes */}
      {pendientes.length === 0 && !showForm ? (
        <div className="empty-state" style={{ padding: '32px 16px' }}>
          <div className="empty-icon">📋</div>
          <div className="empty-title">Sin notas pendientes</div>
          <div className="empty-sub">Agrega un recordatorio usando el botón de arriba</div>
        </div>
      ) : (
        <div>
          {pendientes.map(nota => (
            <div key={nota.id} className={`nota-card nota-${nota.tipo}`}>
              <div className="nota-icon">{NOTA_ICONS[nota.tipo]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="nota-texto">{nota.texto}</div>
                <div className="nota-meta">
                  {fmtDate(nota.fechaCreacion)} · por {nota.autor}
                </div>
              </div>
              <div className="nota-actions">
                <button
                  className="btn btn-success btn-sm"
                  title="Marcar como resuelta"
                  onClick={() => { resolveNota(nota.id); addToast('Nota marcada como resuelta'); }}
                >
                  ✓
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  title="Eliminar nota"
                  onClick={() => { deleteNota(nota.id); addToast('Nota eliminada', 'info'); }}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolved notes toggle */}
      {resueltas.length > 0 && (
        <div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowResolved(v => !v)}
          >
            {showResolved ? '▲ Ocultar resueltas' : `▼ Ver ${resueltas.length} nota${resueltas.length > 1 ? 's' : ''} resuelta${resueltas.length > 1 ? 's' : ''}`}
          </button>
          {showResolved && (
            <div style={{ marginTop: 8 }}>
              {resueltas.map(nota => (
                <div key={nota.id} className={`nota-card nota-${nota.tipo} resuelta`}>
                  <div className="nota-icon" style={{ opacity: 0.5 }}>{NOTA_ICONS[nota.tipo]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="nota-texto tachado">{nota.texto}</div>
                    <div className="nota-meta">{fmtDate(nota.fechaCreacion)} · por {nota.autor}</div>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    title="Eliminar"
                    onClick={() => deleteNota(nota.id)}
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PanelNotas;
