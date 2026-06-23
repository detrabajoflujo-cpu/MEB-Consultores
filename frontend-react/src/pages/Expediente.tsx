import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore, useToast } from '../services/store';
import PanelNotas from '../components/PanelNotas';

/* ═══════════════════════════════════════════════════════════ */
/*  Constants                                                 */
/* ═══════════════════════════════════════════════════════════ */

const DOC_LABELS: Record<string, string> = {
  ineAmbosLados:       'INE ambos lados',
  comprobanteDomicilio: 'Comprobante de domicilio',
  resolucionPension:   'Resolución de pensión',
  estadosCuenta:       'Estados de cuenta (2 meses)',
  fotoConIne:          'Foto sosteniendo INE',
};

const BADGE: Record<string, string> = {
  NUEVO: 'badge-gray', VALIDANDO: 'badge-yellow', VIABLE: 'badge-green',
  NO_VIABLE: 'badge-red', EN_PROCESO: 'badge-blue', FORMALIZADO: 'badge-purple', RECHAZADO: 'badge-red',
};

const BANCOS_MX = [
  '', 'BBVA', 'Banamex (Citibanamex)', 'Banorte', 'HSBC', 'Santander',
  'Scotiabank', 'Banco Azteca', 'Inbursa', 'BanCoppel', 'Afirme',
  'Banjercito', 'Banco del Bienestar', 'Banregio', 'Multiva',
  'Mifel', 'Banbajío', 'Intercam Banco', 'Actinver', 'Otro',
];

const ESTATUS_PROSPECTO = [
  { v: 'NUEVO', l: 'NUEVO' }, { v: 'VALIDANDO', l: 'VALIDANDO' }, { v: 'VIABLE', l: 'VIABLE' },
  { v: 'NO_VIABLE', l: 'NO VIABLE' }, { v: 'EN_PROCESO', l: 'EN PROCESO' },
  { v: 'FORMALIZADO', l: 'FORMALIZADO' }, { v: 'RECHAZADO', l: 'RECHAZADO' },
];

const ESTATUS_EXPEDIENTE = [
  { v: 'EN_RECOLECCION', l: 'EN RECOLECCIÓN' }, { v: 'COMPLETO', l: 'COMPLETO' },
  { v: 'APROBADO', l: 'APROBADO' }, { v: 'DESPACHADO', l: 'DESPACHADO' }, { v: 'RECHAZADO', l: 'RECHAZADO' },
];

/* ═══════════════════════════════════════════════════════════ */
/*  Helpers                                                   */
/* ═══════════════════════════════════════════════════════════ */

const fmtMoney = (v: any) => {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  return isNaN(n) ? '—' : `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`;
};

const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d || '—'; }
};

/* ═══════════════════════════════════════════════════════════ */
/*  Main Component                                            */
/* ═══════════════════════════════════════════════════════════ */

const Expediente: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { prospectos, updateEstatus, updateExpedienteCompleto, deleteProspecto, getNotasByProspecto } = useStore();
  const { addToast } = useToast();

  const prospecto = prospectos.find(p => p.id === Number(id));

  const [tab, setTab] = useState<'info' | 'docs' | 'payload' | 'notas'>('info');
  const [editing, setEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approvedBy, setApprovedBy] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [formData, setFormData] = useState({
    nombreCompleto: '', telefonoContacto: '', curp: '', nss: '',
    correoElectronico: '', correoSipre: '', contactado: false,
    origenCanal: '', estatus: '', observaciones: '',
    montoPensionActual: '', institucionBancaria: '', cuentaClabe: '',
    aumentoPension: '', retroactivoFicticio: '', retroactivoFinal: '',
    nombreCarpetaDrive: '', evidenciaTipo: '', pagado: false,
    linkConstancia: '', estatusExpediente: '',
  });

  useEffect(() => {
    if (prospecto && !isDirty) {
      setFormData({
        nombreCompleto: prospecto.nombreCompleto || '',
        telefonoContacto: prospecto.telefonoContacto || '',
        curp: prospecto.curp || '',
        nss: prospecto.nss || '',
        correoElectronico: (prospecto as any).correoElectronico || '',
        correoSipre: (prospecto as any).correoSipre || '',
        contactado: (prospecto as any).contactado || false,
        origenCanal: prospecto.origenCanal || '',
        estatus: prospecto.estatus || 'NUEVO',
        observaciones: prospecto.observaciones || '',
        montoPensionActual: prospecto.montoPensionActual?.toString() || '',
        institucionBancaria: prospecto.institucionBancaria || '',
        cuentaClabe: prospecto.cuentaClabe || '',
        aumentoPension: (prospecto as any).aumentoPension?.toString() || '',
        retroactivoFicticio: (prospecto as any).retroactivoFicticio?.toString() || '',
        retroactivoFinal: (prospecto as any).retroactivoFinal?.toString() || '',
        nombreCarpetaDrive: prospecto.nombreCarpetaDrive || '',
        evidenciaTipo: (prospecto as any).evidenciaTipo || '',
        pagado: (prospecto as any).pagado || false,
        linkConstancia: (prospecto as any).linkConstancia || '',
        estatusExpediente: prospecto.estatusExpediente || 'EN_RECOLECCION',
      });
    }
  }, [prospecto, isDirty]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (isDirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  if (!prospecto) {
    return (
      <div className="fade-in">
        <div className="page-header"><div className="page-title">Expediente no encontrado</div></div>
        <div className="page-body">
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon">◎</div>
              <div className="empty-title">Prospecto #{id} no existe</div>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/prospectos')}>← Volver</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const p = prospecto;

  const set = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleVolver = () => {
    if (isDirty && !window.confirm('Tienes cambios sin guardar. ¿Salir sin guardar?')) return;
    navigate(-1);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateExpedienteCompleto(p.id, formData);
      setIsDirty(false);
      setEditing(false);
      addToast('Cambios guardados exitosamente', 'success');
    } catch (err: any) { 
      const errMsg = err?.response?.data?.message || err?.message || 'Error desconocido';
      addToast(`Error al guardar: ${errMsg}`, 'error'); 
      console.error(err);
    }
    finally { setSaving(false); }
  };

  const handleCancelEdit = () => {
    if (isDirty && !window.confirm('¿Descartar los cambios sin guardar?')) return;
    setEditing(false);
    setIsDirty(false);
  };

  const handleDelete = async () => {
    try {
      await deleteProspecto(p.id);
      addToast('Expediente eliminado', 'success');
      navigate('/prospectos');
    } catch { addToast('Error al eliminar', 'error'); }
  };

  const handleApprove = () => {
    if (!approvedBy.trim()) return;
    updateEstatus(p.id, 'FORMALIZADO');
    setApproving(false);
    addToast(`Expediente aprobado por ${approvedBy}`, 'success');
  };

  /* ── Inline helpers to render a field ── */
  const renderText = (label: string, field: string, opts?: { mono?: boolean; green?: boolean; accent?: boolean; big?: boolean; type?: string }) => {
    const val = (formData as any)[field];
    const isMoney = opts?.type === 'number';
    if (editing) {
      return (
        <div className="detail-field">
          <div className="detail-label">{label}</div>
          <input
            type={opts?.type || 'text'}
            className={`input ${opts?.mono ? 'mono' : ''}`}
            style={{
              ...(opts?.big ? { fontSize: 18, fontWeight: 700 } : {}),
              ...(opts?.green ? { color: 'var(--green)' } : {}),
              ...(opts?.accent ? { color: 'var(--accent)' } : {}),
            }}
            value={val}
            onChange={e => set(field, e.target.value)}
          />
        </div>
      );
    }
    const display = isMoney ? fmtMoney(val) : (val || '—');
    return (
      <div className="detail-field">
        <div className="detail-label">{label}</div>
        <div className={`detail-value ${opts?.mono ? 'mono' : ''}`} style={{
          ...(opts?.green ? { color: 'var(--green)', fontWeight: 600 } : {}),
          ...(opts?.accent ? { color: 'var(--accent)', fontWeight: 600 } : {}),
          ...(opts?.big ? { fontSize: 20, fontWeight: 700 } : {}),
        }}>{display}</div>
      </div>
    );
  };

  const renderSelect = (label: string, field: string, options: { v: string; l: string }[]) => {
    const val = (formData as any)[field];
    if (editing) {
      return (
        <div className="detail-field">
          <div className="detail-label">{label}</div>
          <select className="input" value={val} onChange={e => set(field, e.target.value)}>
            {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>
      );
    }
    return (
      <div className="detail-field">
        <div className="detail-label">{label}</div>
        <div className="detail-value">{options.find(o => o.v === val)?.l || val || '—'}</div>
      </div>
    );
  };

  const renderCheck = (label: string, field: string) => {
    const val = (formData as any)[field];
    return (
      <div className="detail-field" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
        {editing ? (
          <>
            <input type="checkbox" id={`chk-${field}`} checked={val} onChange={e => set(field, e.target.checked)} />
            <label htmlFor={`chk-${field}`} style={{ fontSize: 13, cursor: 'pointer' }}>{label}</label>
          </>
        ) : (
          <>
            <span style={{ fontSize: 14 }}>{val ? '✅' : '❌'}</span>
            <span style={{ fontSize: 13 }}>{label}</span>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="fade-in">
      {/* ─── HEADER ─── */}
      <div className="page-header">
        <div>
          <div className="page-title">{p.nombreCompleto}</div>
          <div className="page-sub">Expediente #{p.id} · {p.curp}</div>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost btn-sm" onClick={handleVolver}>← Volver</button>
          {!editing ? (
            <>
              <button className="btn btn-primary btn-sm" onClick={() => setEditing(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                ✏️ Editar
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setApproving(true)}>Aprobar</button>
              <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(true)} title="Eliminar">🗑️</button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost btn-sm" onClick={handleCancelEdit}>✕ Cancelar</button>
              <button className="btn btn-success btn-sm" onClick={handleSave} disabled={!isDirty || saving}
                style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 150 }}>
                {saving ? '⏳ Guardando…' : '💾 Guardar Cambios'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editing banner */}
      {editing && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(99,102,241,.15), rgba(99,102,241,.05))',
          border: '1px solid rgba(99,102,241,.3)', borderRadius: 8, padding: '10px 20px',
          marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
        }}>
          <span style={{ fontSize: 18 }}>✏️</span>
          <span>Estás en <strong>modo edición</strong>. Modifica los campos y presiona <strong>Guardar Cambios</strong> cuando termines.</span>
        </div>
      )}

      <div className="page-body">
        {/* ─── HERO CARD ─── */}
        <div className="card mb-4">
          <div className="card-body">
            <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
                {p.nombreCompleto.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{p.nombreCompleto}</div>
                <div className="flex gap-1" style={{ marginTop: 6, flexWrap: 'wrap' }}>
                  <span className={`badge ${BADGE[p.estatus] || 'badge-gray'}`}>{p.estatus}</span>
                  <span className="badge badge-gray">{p.origenCanal}</span>
                  {p.curpValida && <span className="badge badge-green" style={{ fontSize: 10 }}>CURP ✓</span>}
                  {p.nssValido  && <span className="badge badge-green" style={{ fontSize: 10 }}>NSS ✓</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-3)' }}>
                <div>Ingresado: {fmtDate(p.fechaIngreso)}</div>
                <div style={{ marginTop: 2 }}>Actualizado: {fmtDate(p.fechaUltimaActualizacion)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── TABS ─── */}
        <div className="tabs mb-4">
          {(['info','docs','payload','notas'] as const).map(key => {
            const labels: Record<string,string> = { info:'Información', docs:'Documentos OCR', payload:'Payload JSON', notas:'🔔 Notas' };
            const notasPend = key === 'notas' ? getNotasByProspecto(p.id).filter(n => !n.resuelta).length : 0;
            return (
              <button key={key} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
                {labels[key]}
                {notasPend > 0 && <span style={{ marginLeft: 4, background: 'rgba(255,255,255,.25)', borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 700 }}>{notasPend}</span>}
              </button>
            );
          })}
        </div>

        {/* ═══════════════════════════════════ */}
        {/* ─── TAB: INFO ─── */}
        {/* ═══════════════════════════════════ */}
        {tab === 'info' && (
          <div className="grid-2 gap-4">
            {/* Datos del Prospecto */}
            <div className="card">
              <div className="card-head"><div className="card-title">Datos del Prospecto</div></div>
              <div className="card-body">
                <div className="detail-grid">
                  {renderText('Nombre Completo', 'nombreCompleto')}
                  {renderText('Teléfono', 'telefonoContacto')}
                  {renderText('CURP', 'curp', { mono: true })}
                  {renderText('NSS', 'nss', { mono: true })}
                  {renderText('Correo Electrónico', 'correoElectronico', { type: 'email' })}
                  {renderText('Correo SIPRE', 'correoSipre', { type: 'email' })}
                  {renderText('Canal de Origen', 'origenCanal')}
                  {renderSelect('Estatus', 'estatus', ESTATUS_PROSPECTO)}
                  {renderCheck('Cliente Contactado', 'contactado')}
                </div>
              </div>
            </div>

            {/* Análisis Financiero */}
            <div className="card">
              <div className="card-head"><div className="card-title">Análisis Financiero</div></div>
              <div className="card-body">
                <div className="detail-grid">
                  <div className="detail-field detail-full">
                    {renderText('Monto Pensión Actual', 'montoPensionActual', { type: 'number', green: true, big: true })}
                  </div>
                  {renderText('Institución Bancaria', 'institucionBancaria')}
                  {renderText('CLABE Interbancaria', 'cuentaClabe', { mono: true })}
                  {renderText('Aumento Pensión', 'aumentoPension', { type: 'number', green: true })}
                  {renderText('Retroactivo Ficticio DOM', 'retroactivoFicticio', { type: 'number' })}
                  {renderText('Retroactivo Final DOM', 'retroactivoFinal', { type: 'number', accent: true })}
                </div>
              </div>
            </div>

            {/* Google Drive */}
            <div className="card">
              <div className="card-head"><div className="card-title">Google Drive</div></div>
              <div className="card-body">
                {renderText('Nombre de Carpeta', 'nombreCarpetaDrive')}
                <div style={{ marginTop: 14 }}>
                  {p.urlCarpetaDrive ? (
                    <a href={p.urlCarpetaDrive} target="_blank" rel="noreferrer" className="btn btn-ghost w-full" style={{ justifyContent: 'center' }}>
                      Abrir Carpeta en Drive →
                    </a>
                  ) : (
                    <div className="badge badge-yellow">Carpeta no inicializada</div>
                  )}
                </div>
              </div>
            </div>

            {/* Formalización Legal */}
            <div className="card">
              <div className="card-head"><div className="card-title">Formalización Legal</div></div>
              <div className="card-body">
                <div className="detail-grid">
                  {renderText('Tipo de Evidencia', 'evidenciaTipo')}
                  {renderSelect('Estatus Expediente', 'estatusExpediente', ESTATUS_EXPEDIENTE)}
                  {renderCheck('Honorarios Pagados', 'pagado')}
                  <div className="detail-field detail-full">
                    {renderText('Enlace a Constancia y Contrato', 'linkConstancia')}
                    {!editing && formData.linkConstancia && (
                      <a href={formData.linkConstancia} target="_blank" rel="noreferrer"
                        style={{ color: 'var(--accent)', textDecoration: 'underline', fontSize: 13, marginTop: 6, display: 'inline-block' }}>
                        Abrir Constancia ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: NOTAS ─── */}
        {tab === 'notas' && (
          <div className="card"><div className="card-body"><PanelNotas prospectoId={p.id} /></div></div>
        )}

        {/* ─── TAB: DOCS OCR ─── */}
        {tab === 'docs' && (
          <div className="card">
            <div className="card-head">
              <div><div className="card-title">Documentos OCR</div><div className="card-sub">Estado de validación por documento</div></div>
            </div>
            <div className="card-body">
              {['ineAmbosLados','comprobanteDomicilio','resolucionPension','estadosCuenta','fotoConIne'].map(key => {
                const estado = (p as any)[key] || 'PENDIENTE';
                return (
                  <div key={key} className="doc-row">
                    <div className="doc-name">{DOC_LABELS[key] || key}</div>
                    <span className={`badge ${estado === 'APROBADO' ? 'badge-green' : estado === 'RECHAZADO' ? 'badge-red' : estado === 'ILEGIBLE' ? 'badge-orange' : 'badge-yellow'}`}>
                      {estado === 'APROBADO' ? '✓ Aprobado' : estado === 'RECHAZADO' ? '✕ Rechazado' : estado === 'ILEGIBLE' ? '⚠ Ilegible' : '○ Pendiente'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── TAB: PAYLOAD ─── */}
        {tab === 'payload' && (
          <div className="card">
            <div className="card-head">
              <div><div className="card-title">Payload JSON</div><div className="card-sub">Estructura interna actual</div></div>
              <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(JSON.stringify(formData, null, 2)); addToast('Copiado'); }}>⧉ Copiar</button>
            </div>
            <div className="card-body">
              <pre style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: 16, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-1)', overflowX: 'auto', lineHeight: 1.7 }}>
                {JSON.stringify(formData, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL: APROBAR ─── */}
      {approving && (
        <div className="modal-backdrop" onClick={() => setApproving(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Aprobar Expediente</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setApproving(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-warn" style={{ marginBottom: 16 }}>
                <span>⚠</span><span>Esta acción aprueba el expediente de <strong>{p.nombreCompleto}</strong> y lo marca como Formalizado.</span>
              </div>
              <div className="form-group">
                <label className="form-label">Nombre del Superior Autorizante</label>
                <input className="input" placeholder="Tu nombre completo" value={approvedBy} autoFocus
                  onChange={e => setApprovedBy(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleApprove(); }} />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setApproving(false)}>Cancelar</button>
              <button className="btn btn-success" disabled={!approvedBy.trim()} onClick={handleApprove}>Confirmar Aprobación</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CONFIRMAR ELIMINACIÓN ─── */}
      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title" style={{ color: 'var(--red)' }}>⚠ Eliminar Expediente</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setConfirmDelete(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ lineHeight: 1.7, fontSize: 14 }}>
                ¿Estás seguro de eliminar permanentemente el expediente de <strong>{p.nombreCompleto}</strong>?
                Esta acción <strong>no se puede deshacer</strong> y borrará al prospecto, expediente y notas asociadas.
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleDelete}>Sí, Eliminar Permanentemente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expediente;
