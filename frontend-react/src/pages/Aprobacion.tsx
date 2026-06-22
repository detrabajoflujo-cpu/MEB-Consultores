import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, useToast } from '../services/store';

const Aprobacion: React.FC = () => {
  const navigate = useNavigate();
  const { prospectos, updateEstatus } = useStore();
  const { addToast } = useToast();

  const [approverName, setApproverName] = useState('');
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Prospectos pendientes de aprobación (viables o en proceso)
  const pendientes = prospectos.filter(p => p.estatus === 'VIABLE' || p.estatus === 'EN_PROCESO');
  const aprobados  = prospectos.filter(p => p.estatus === 'FORMALIZADO');
  const rechazados = prospectos.filter(p => p.estatus === 'RECHAZADO');

  const handleApprove = () => {
    if (!confirmId || !approverName.trim()) return;
    updateEstatus(confirmId, 'FORMALIZADO', `Aprobado por: ${approverName}`);
    setConfirmId(null);
    setApproverName('');
    addToast(`Expediente aprobado por ${approverName}`, 'success');
  };

  const handleReject = () => {
    if (!rejectId) return;
    updateEstatus(rejectId, 'RECHAZADO', rejectReason || 'Rechazado por el superior');
    setRejectId(null);
    setRejectReason('');
    addToast('Expediente rechazado', 'error');
  };

  const BADGE: Record<string, string> = {
    VIABLE: 'badge-green', EN_PROCESO: 'badge-blue',
    FORMALIZADO: 'badge-purple', RECHAZADO: 'badge-red',
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Aprobaciones</div>
          <div className="page-sub">{pendientes.length} expedientes pendientes de aprobación</div>
        </div>
      </div>

      <div className="page-body">
        {/* Pendientes */}
        <div className="card mb-4">
          <div className="card-head">
            <div>
              <div className="card-title">Pendientes de Aprobación</div>
              <div className="card-sub">Expedientes viables y en proceso</div>
            </div>
            <span className="badge badge-yellow">{pendientes.length}</span>
          </div>
          {pendientes.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 24px' }}>
              <div className="empty-icon">✓</div>
              <div className="empty-title">Todo al día</div>
              <div className="empty-sub">No hay expedientes pendientes de aprobación.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Prospecto</th>
                    <th>CURP / NSS</th>
                    <th>Estatus</th>
                    <th>Ingreso</th>
                    <th>Observaciones</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pendientes.map(p => (
                    <tr key={p.id} onClick={() => navigate(`/prospectos/${p.id}`)}>
                      <td style={{ color: 'var(--text-3)', fontSize: 12 }}>#{p.id}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.nombreCompleto}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.telefonoContacto}</div>
                      </td>
                      <td>
                        <div className="text-mono" style={{ fontSize: 12 }}>{p.curp}</div>
                        <div className="text-mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.nss}</div>
                      </td>
                      <td><span className={`badge ${BADGE[p.estatus] || 'badge-gray'}`}>{p.estatus}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{fmtDate(p.fechaIngreso)}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{p.observaciones || '—'}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => navigate(`/prospectos/${p.id}`)}
                          >Ver</button>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => setConfirmId(p.id)}
                          >✓ Aprobar</button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setRejectId(p.id)}
                          >✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Historial */}
        <div className="grid-2 gap-4">
          {/* Aprobados */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Aprobados / Formalizados</div>
              <span className="badge badge-green">{aprobados.length}</span>
            </div>
            {aprobados.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <div className="empty-sub">Sin formalizados aún</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Nombre</th><th>Obs.</th><th></th></tr>
                  </thead>
                  <tbody>
                    {aprobados.map(p => (
                      <tr key={p.id} onClick={() => navigate(`/prospectos/${p.id}`)}>
                        <td><div style={{ fontWeight: 600, fontSize: 13 }}>{p.nombreCompleto}</div></td>
                        <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.observaciones || '—'}</td>
                        <td><button className="btn btn-ghost btn-sm">Ver</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Rechazados */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Rechazados</div>
              <span className="badge badge-red">{rechazados.length}</span>
            </div>
            {rechazados.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <div className="empty-sub">Sin rechazados</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Nombre</th><th>Motivo</th><th></th></tr>
                  </thead>
                  <tbody>
                    {rechazados.map(p => (
                      <tr key={p.id} onClick={() => navigate(`/prospectos/${p.id}`)}>
                        <td><div style={{ fontWeight: 600, fontSize: 13 }}>{p.nombreCompleto}</div></td>
                        <td style={{ fontSize: 11, color: 'var(--red)' }}>{p.observaciones || '—'}</td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={e => { e.stopPropagation(); updateEstatus(p.id, 'VIABLE'); addToast('Reabierto'); }}
                          >Reabrir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Confirmar aprobación */}
      {confirmId != null && (
        <div className="modal-backdrop" onClick={() => setConfirmId(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Confirmar Aprobación</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setConfirmId(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-success" style={{ marginBottom: 16 }}>
                <span>✓</span>
                <span>
                  Aprobando expediente de <strong>{prospectos.find(p => p.id === confirmId)?.nombreCompleto}</strong>.
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">Tu nombre (Superior autorizante)</label>
                <input
                  className="input"
                  placeholder="Nombre completo"
                  value={approverName}
                  autoFocus
                  onChange={e => setApproverName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleApprove(); }}
                />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setConfirmId(null)}>Cancelar</button>
              <button className="btn btn-success" disabled={!approverName.trim()} onClick={handleApprove}>
                Aprobar y Formalizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rechazar */}
      {rejectId != null && (
        <div className="modal-backdrop" onClick={() => setRejectId(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Rechazar Expediente</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setRejectId(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Motivo de Rechazo</label>
                <input
                  className="input"
                  placeholder="Ej: Pensión inferior al mínimo requerido"
                  value={rejectReason}
                  autoFocus
                  onChange={e => setRejectReason(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleReject(); }}
                />
                <span className="form-hint">El motivo quedará registrado en el expediente</span>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setRejectId(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleReject}>Confirmar Rechazo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Aprobacion;
