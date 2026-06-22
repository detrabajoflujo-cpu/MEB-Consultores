import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, useToast } from '../services/store';
import { useStore as useStoreForNotas } from '../services/store';
import type { Prospecto } from '../services/mockData';

const BADGE: Record<string, { cls: string; label: string; dot: string }> = {
  NUEVO:       { cls: 'badge-gray',   label: 'Nuevo',        dot: '#9CA3AF' },
  VALIDANDO:   { cls: 'badge-yellow', label: 'Validando',    dot: '#F59E0B' },
  VIABLE:      { cls: 'badge-green',  label: 'Viable',       dot: '#10B981' },
  EN_PROCESO:  { cls: 'badge-blue',   label: 'En Proceso',   dot: '#3B82F6' },
  FORMALIZADO: { cls: 'badge-purple', label: 'Formalizado',  dot: '#7C3AED' },
  RECHAZADO:   { cls: 'badge-red',    label: 'Rechazado',    dot: '#EF4444' },
  NO_VIABLE:   { cls: 'badge-red',    label: 'No Viable',    dot: '#EF4444' },
};

const AVATAR_COLORS = ['#7C3AED','#3B82F6','#10B981','#F59E0B','#EF4444','#EC4899','#6366F1','#14B8A6'];

const ESTATUS_OPTIONS = ['NUEVO','VALIDANDO','VIABLE','EN_PROCESO','FORMALIZADO','RECHAZADO'] as const;
const CANALES = ['Meta Ads','WhatsApp Directo','Referido','Otro'];

const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

const Prospectos: React.FC = () => {
  const navigate = useNavigate();
  const { prospectos, addProspecto, updateEstatus, updateProspecto, deleteProspecto } = useStore();
  const { addToast } = useToast();
  const [viewMode, setViewMode] = useState<'cards'|'table'>('cards');

  const [search, setSearch] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');
  const [filtroCanal, setFiltroCanal] = useState('');

  // Modal nuevo
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ nombreCompleto: '', telefonoContacto: '', curp: '', nss: '', origenCanal: 'Meta Ads', estatus: 'NUEVO' as Prospecto['estatus'] });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Modal editar
  const [editTarget, setEditTarget] = useState<Prospecto | null>(null);
  const [editForm, setEditForm] = useState<Partial<Prospecto>>({});

  // Modal confirmar eliminar
  const [deleteTarget, setDeleteTarget] = useState<Prospecto | null>(null);

  // Quick estatus change
  const [changingEstatus, setChangingEstatus] = useState<number | null>(null);

  const filtrados = prospectos.filter(p => {
    const normalizeStr = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const q = normalizeStr(search);
    const matchSearch = !search ||
      normalizeStr(p.nombreCompleto).includes(q) ||
      normalizeStr(p.curp).includes(q) ||
      p.nss.includes(q) ||
      p.telefonoContacto.includes(q);
    const matchEstatus = !filtroEstatus || p.estatus === filtroEstatus;
    const matchCanal   = !filtroCanal   || p.origenCanal === filtroCanal;
    return matchSearch && matchEstatus && matchCanal;
  });

  const validateForm = (f: typeof form) => {
    const e: Record<string, string> = {};
    if (!f.nombreCompleto.trim()) e.nombre = 'Requerido';
    if (!f.telefonoContacto.trim()) e.tel = 'Requerido';
    if (f.curp.length !== 18) e.curp = '18 caracteres';
    if (f.nss.length !== 11 || !/^\d+$/.test(f.nss)) e.nss = '11 dígitos';
    return e;
  };

  const handleAdd = () => {
    const e = validateForm(form);
    if (Object.keys(e).length) { setFormErrors(e); return; }
    addProspecto({ ...form, curpValida: true, nssValido: true, observaciones: '' });
    setShowNew(false);
    setForm({ nombreCompleto: '', telefonoContacto: '', curp: '', nss: '', origenCanal: 'Meta Ads', estatus: 'NUEVO' });
    setFormErrors({});
    addToast('Prospecto registrado');
  };

  const openEdit = (p: Prospecto) => {
    setEditTarget(p);
    setEditForm({ nombreCompleto: p.nombreCompleto, telefonoContacto: p.telefonoContacto, curp: p.curp, nss: p.nss, origenCanal: p.origenCanal, estatus: p.estatus, observaciones: p.observaciones });
  };

  const handleEdit = () => {
    if (!editTarget) return;
    updateProspecto(editTarget.id, editForm);
    setEditTarget(null);
    addToast('Prospecto actualizado');
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteProspecto(deleteTarget.id);
    setDeleteTarget(null);
    addToast('Prospecto eliminado', 'info');
  };

  const handleEstatusChange = (id: number, est: Prospecto['estatus']) => {
    updateEstatus(id, est);
    setChangingEstatus(null);
    addToast(`Estatus cambiado a ${est}`);
  };

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Prospectos</div>
          <div className="page-sub">{prospectos.length} registros totales</div>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => {
            const csv = ['ID,Nombre,CURP,NSS,Teléfono,Canal,Estatus,Ingreso',
              ...prospectos.map(p => `${p.id},"${p.nombreCompleto}",${p.curp},${p.nss},${p.telefonoContacto},"${p.origenCanal}",${p.estatus},${p.fechaIngreso}`)
            ].join('\n');
            const a = document.createElement('a');
            a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
            a.download = 'prospectos.csv';
            a.click();
            addToast('CSV exportado');
          }}>
            ↓ CSV
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>
            + Nuevo
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Toolbar */}
        <div className="toolbar">
          <div className="search-bar">
            <span className="search-ico">⌕</span>
            <input
              id="search-prospectos"
              placeholder="Buscar nombre, CURP, NSS, teléfono..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="input input-sm" style={{ width: 'auto' }} value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)}>
            <option value="">Todos los estatus</option>
            {ESTATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="input input-sm" style={{ width: 'auto' }} value={filtroCanal} onChange={e => setFiltroCanal(e.target.value)}>
            <option value="">Todos los canales</option>
            {CANALES.map(c => <option key={c}>{c}</option>)}
          </select>
          {(search || filtroEstatus || filtroCanal) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFiltroEstatus(''); setFiltroCanal(''); }}>
              ✕ Limpiar
            </button>
          )}
          <span style={{ color: 'var(--text-3)', fontSize: 12, marginLeft: 4 }}>{filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            <button className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode('cards')} title="Vista tarjetas">▦</button>
            <button className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode('table')} title="Vista tabla">≡</button>
          </div>
        </div>

        {filtrados.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon">◎</div>
              <div className="empty-title">Sin resultados</div>
              <div className="empty-sub">No hay prospectos que coincidan con los filtros.</div>
            </div>
          </div>
        ) : viewMode === 'cards' ? (
          /* ClinicIQ card view */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {filtrados.map(p => {
              const b = BADGE[p.estatus] || BADGE.NUEVO;
              const color = AVATAR_COLORS[p.id % AVATAR_COLORS.length];
              return (
                <div key={p.id} className="prospecto-card" onClick={() => navigate(`/prospectos/${p.id}`)}>
                  {/* Avatar */}
                  <div className="prospecto-avatar" style={{ background: color }}>
                    {p.nombreCompleto.charAt(0)}
                  </div>

                  {/* Main info */}
                  <div className="prospecto-info">
                    <div className="prospecto-name">
                      {p.nombreCompleto}
                      {p.urlCarpetaDrive && (
                        <a href={p.urlCarpetaDrive} target="_blank" rel="noreferrer"
                          style={{ marginLeft: 6, fontSize: 14, textDecoration: 'none' }}
                          onClick={e => e.stopPropagation()} title="Carpeta Drive">📁</a>
                      )}
                    </div>
                    <div className="prospecto-meta">
                      {p.origenCanal} · Tel: {p.telefonoContacto} · {fmtDate(p.fechaIngreso)}
                    </div>
                    {p.observaciones && (
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                        ⚠ {p.observaciones.slice(0, 50)}{p.observaciones.length > 50 ? '…' : ''}
                      </div>
                    )}
                  </div>

                  {/* Validation pills */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <span className={`badge ${p.curpValida ? 'badge-green' : 'badge-red'}`}
                      title={p.curpValida ? 'CURP válida' : 'CURP pendiente'}>CURP</span>
                    <span className={`badge ${p.nssValido ? 'badge-green' : 'badge-red'}`}
                      title={p.nssValido ? 'NSS válido' : 'NSS pendiente'}>NSS</span>
                  </div>

                  {/* Estatus badge */}
                  <span className={`badge ${b.cls}`} style={{ flexShrink: 0 }}>{b.label}</span>

                  {/* Quick-change estatus */}
                  <div className="prospecto-actions" onClick={e => e.stopPropagation()}>
                    {changingEstatus === p.id ? (
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <select className="input input-sm" style={{ width: 120 }}
                          defaultValue={p.estatus}
                          onChange={e => handleEstatusChange(p.id, e.target.value as Prospecto['estatus'])}>
                          {ESTATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button className="btn btn-ghost btn-sm" onClick={() => setChangingEstatus(null)}>✕</button>
                      </div>
                    ) : (
                      <>
                        <button className="btn btn-ghost btn-sm" title="Cambiar estatus" onClick={() => setChangingEstatus(p.id)}>⇄</button>
                        <button className="btn btn-ghost btn-sm" title="Editar" onClick={() => openEdit(p)}>✎</button>
                        <button className="btn btn-danger btn-sm" title="Eliminar" onClick={() => setDeleteTarget(p)}>🗑</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table view */
          <div className="card">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nombre</th>
                    <th>CURP / NSS</th>
                    <th>Teléfono</th>
                    <th>Canal</th>
                    <th>Validación</th>
                    <th>Estatus</th>
                    <th>Ingreso</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(p => {
                    const b = BADGE[p.estatus] || BADGE.NUEVO;
                    return (
                      <tr key={p.id} onClick={() => navigate(`/prospectos/${p.id}`)}>
                        <td style={{ color: 'var(--text-3)', fontSize: 12 }}>#{p.id}</td>
                        <td>
                          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {p.nombreCompleto}
                            {p.urlCarpetaDrive && (
                              <a href={p.urlCarpetaDrive} target="_blank" rel="noreferrer" title="Abrir Carpeta Drive" style={{ fontSize: 16, textDecoration: 'none', lineHeight: 1 }} onClick={e => e.stopPropagation()}>📁</a>
                            )}
                            {p.linkConstancia && (
                              <a href={p.linkConstancia} target="_blank" rel="noreferrer" title="Abrir Constancia/Contrato" style={{ fontSize: 16, textDecoration: 'none', lineHeight: 1 }} onClick={e => e.stopPropagation()}>📄</a>
                            )}
                          </div>
                          {p.observaciones && (
                            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }} title={p.observaciones}>
                              ⚠ {p.observaciones.slice(0, 40)}{p.observaciones.length > 40 ? '…' : ''}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="text-mono">{p.curp}</div>
                          <div className="text-mono" style={{ color: 'var(--text-3)', fontSize: 11 }}>{p.nss}</div>
                        </td>
                        <td style={{ color: 'var(--text-2)' }}>{p.telefonoContacto}</td>
                        <td><span className="badge badge-gray" style={{ fontSize: 11 }}>{p.origenCanal}</span></td>
                        <td>
                          <div className="flex gap-1">
                            <span className={`badge ${p.curpValida ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 10 }}>CURP</span>
                            <span className={`badge ${p.nssValido  ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 10 }}>NSS</span>
                          </div>
                        </td>
                        <td onClick={e => { e.stopPropagation(); setChangingEstatus(changingEstatus === p.id ? null : p.id); }} style={{ position: 'relative' }}>
                          <span className={`badge ${b.cls}`} style={{ cursor: 'pointer', userSelect: 'none' }}>
                            {p.estatus} ▾
                          </span>
                          {changingEstatus === p.id && (
                            <div style={{
                              position: 'absolute', top: '100%', left: 0, zIndex: 100,
                              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-sm)', padding: '4px 0', minWidth: 140,
                              boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                            }}>
                              {ESTATUS_OPTIONS.map(s => (
                                <div
                                  key={s}
                                  onClick={e => { e.stopPropagation(); handleEstatusChange(p.id, s); }}
                                  style={{
                                    padding: '7px 14px', fontSize: 12, cursor: 'pointer',
                                    color: s === p.estatus ? 'var(--accent)' : 'var(--text-2)',
                                    fontWeight: s === p.estatus ? 600 : 400,
                                  }}
                                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                  {s === p.estatus ? '● ' : '  '}{s}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{fmtDate(p.fechaIngreso)}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => navigate(`/prospectos/${p.id}`)}
                            >Ver</button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => openEdit(p)}
                            >✎</button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--red)' }}
                              onClick={() => setDeleteTarget(p)}
                            >✕</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Nuevo */}
      {showNew && (
        <div className="modal-backdrop" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Nuevo Prospecto</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowNew(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Nombre Completo</label>
                  <input className="input" placeholder="Ej: María García López" value={form.nombreCompleto} onChange={e => setForm(f => ({ ...f, nombreCompleto: e.target.value }))} />
                  {formErrors.nombre && <span className="form-error">{formErrors.nombre}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input className="input" placeholder="+52 777 000 0000" value={form.telefonoContacto} onChange={e => setForm(f => ({ ...f, telefonoContacto: e.target.value }))} />
                  {formErrors.tel && <span className="form-error">{formErrors.tel}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Canal</label>
                  <select className="input" value={form.origenCanal} onChange={e => setForm(f => ({ ...f, origenCanal: e.target.value }))}>
                    {CANALES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">CURP</label>
                  <input className="input text-mono" placeholder="XXXX000000XXXXXXXX" maxLength={18} value={form.curp} onChange={e => setForm(f => ({ ...f, curp: e.target.value.toUpperCase() }))} />
                  <span className="form-hint">{form.curp.length}/18 {formErrors.curp && <span style={{ color: 'var(--red)' }}>— {formErrors.curp}</span>}</span>
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">NSS</label>
                  <input className="input text-mono" placeholder="00000000000" maxLength={11} value={form.nss} onChange={e => setForm(f => ({ ...f, nss: e.target.value.replace(/\D/g, '') }))} />
                  <span className="form-hint">{form.nss.length}/11 {formErrors.nss && <span style={{ color: 'var(--red)' }}>— {formErrors.nss}</span>}</span>
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setShowNew(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAdd}>Registrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar */}
      {editTarget && (
        <div className="modal-backdrop" onClick={() => setEditTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Editar — {editTarget.nombreCompleto}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setEditTarget(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Nombre Completo</label>
                  <input className="input" value={editForm.nombreCompleto || ''} onChange={e => setEditForm(f => ({ ...f, nombreCompleto: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input className="input" value={editForm.telefonoContacto || ''} onChange={e => setEditForm(f => ({ ...f, telefonoContacto: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Canal</label>
                  <select className="input" value={editForm.origenCanal || ''} onChange={e => setEditForm(f => ({ ...f, origenCanal: e.target.value }))}>
                    {CANALES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Estatus</label>
                  <select className="input" value={editForm.estatus || ''} onChange={e => setEditForm(f => ({ ...f, estatus: e.target.value as any }))}>
                    {ESTATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Observaciones</label>
                  <input className="input" placeholder="Notas internas…" value={editForm.observaciones || ''} onChange={e => setEditForm(f => ({ ...f, observaciones: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setEditTarget(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleEdit}>Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar eliminar */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Eliminar Prospecto</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setDeleteTarget(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>
                ¿Estás seguro que deseas eliminar a <strong style={{ color: 'var(--text-1)' }}>{deleteTarget.nombreCompleto}</strong>?
                Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Prospectos;
