import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore, useToast } from '../services/store';
import { mockExpediente } from '../services/mockData';
import PanelNotas from '../components/PanelNotas';

const DOC_LABELS: Record<string, string> = {
  ineAmbosLados:      'INE ambos lados',
  comprobanteDomicilio: 'Comprobante de domicilio',
  resolucionPension:  'Resolución de pensión',
  estadosCuenta:      'Estados de cuenta (2 meses)',
  fotoConIne:         'Foto sosteniendo INE',
};

const Expediente: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { prospectos, updateEstatus, updateProspecto } = useStore();
  const { addToast } = useToast();

  const [tab, setTab] = useState<'info' | 'docs' | 'payload' | 'notas'>('info');
  const { getNotasByProspecto } = useStore();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [approving, setApproving] = useState(false);
  const [approvedBy, setApprovedBy] = useState('');

  const prospecto = prospectos.find(p => p.id === Number(id));

  if (!prospecto) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div className="page-title">Expediente no encontrado</div>
        </div>
        <div className="page-body">
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon">◎</div>
              <div className="empty-title">Prospecto #{id} no existe</div>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/prospectos')}>
                ← Volver a Prospectos
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Build a clean expediente from real prospecto data only — no mock data mixed in
  const expediente = {
    id: Number(id),
    prospecto: prospecto,
    montoPensionActual: prospecto.montoPensionActual ?? null,
    aumentoPension: prospecto.aumentoPension ?? null,
    institucionBancaria: prospecto.institucionBancaria ?? null,
    cuentaClabe: prospecto.cuentaClabe ?? null,
    nombreCarpetaDrive: prospecto.nombreCarpetaDrive ?? null,
    urlCarpetaDrive: prospecto.urlCarpetaDrive ?? null,
    estatusExpediente: prospecto.estatusExpediente ?? 'PENDIENTE',
    aprobacionSuperior: prospecto.aprobacionSuperior ?? false,
    aprobadoPor: (prospecto as any).aprobadoPor ?? null,
    evidenciaTipo: (prospecto as any).evidenciaTipo ?? null,
    ineAmbosLados: (prospecto as any).ineAmbosLados ?? 'PENDIENTE',
    comprobanteDomicilio: (prospecto as any).comprobanteDomicilio ?? 'PENDIENTE',
    resolucionPension: (prospecto as any).resolucionPension ?? 'PENDIENTE',
    estadosCuenta: (prospecto as any).estadosCuenta ?? 'PENDIENTE',
    fotoConIne: (prospecto as any).fotoConIne ?? 'PENDIENTE',
    contactado: prospecto.contactado ?? false,
    correoElectronico: prospecto.correoElectronico ?? null,
    correoSipre: prospecto.correoSipre ?? null,
    retroactivoFicticio: (prospecto as any).retroactivoFicticio ?? null,
    retroactivoFinal: (prospecto as any).retroactivoFinal ?? null,
    linkConstancia: (prospecto as any).linkConstancia ?? null,
    pagado: (prospecto as any).pagado ?? false,
    perfilFinanciero: (prospecto as any).perfilFinanciero ?? null,
  };

  const p = prospecto;
  const BADGE: Record<string, string> = {
    NUEVO: 'badge-gray', VALIDANDO: 'badge-yellow', VIABLE: 'badge-green',
    EN_PROCESO: 'badge-blue', FORMALIZADO: 'badge-purple', RECHAZADO: 'badge-red',
  };

  const startEdit = (field: string, value: string) => {
    setEditingField(field);
    setTempValue(value);
  };

  const saveEdit = (field: string) => {
    updateProspecto(p.id, { [field]: tempValue });
    setEditingField(null);
    addToast('Campo actualizado');
  };

  const handleApprove = () => {
    if (!approvedBy.trim()) return;
    updateEstatus(p.id, 'FORMALIZADO');
    setApproving(false);
    addToast(`Expediente aprobado por ${approvedBy}`, 'success');
  };

  const docEstados: Record<string, string> = {
    ineAmbosLados:      expediente.ineAmbosLados,
    comprobanteDomicilio: expediente.comprobanteDomicilio,
    resolucionPension:  expediente.resolucionPension,
    estadosCuenta:      expediente.estadosCuenta,
    fotoConIne:         expediente.fotoConIne,
  };

  const fmtDate = (d: string) => {
    try { return new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return d || '—'; }
  };

  const EditableText: React.FC<{ field: string; value: string; label: string; mono?: boolean }> = ({ field, value, label, mono }) => (
    <div className="detail-field">
      <div className="detail-label">{label}</div>
      {editingField === field ? (
        <div className="flex gap-1" style={{ marginTop: 4 }}>
          <input
            className="input"
            style={{ flex: 1 }}
            value={tempValue}
            autoFocus
            onChange={e => setTempValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveEdit(field); if (e.key === 'Escape') setEditingField(null); }}
          />
          <button className="btn btn-success btn-sm" onClick={() => saveEdit(field)}>✓</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditingField(null)}>✕</button>
        </div>
      ) : (
        <div
          className={`editable-field`}
          onClick={() => startEdit(field, value)}
          title="Haz clic para editar"
        >
          <span className={`detail-value ${mono ? 'mono' : ''}`}>{value || '—'}</span>
          <span className="edit-pencil">✎</span>
        </div>
      )}
    </div>
  );

  const generateDynamicPayload = () => ({
    prospecto: {
      origen: p.origenCanal,
      nombre_completo: p.nombreCompleto,
      telefono: p.telefonoContacto,
      curp: p.curp,
      nss: p.nss
    },
    analisis_financiero: {
      monto_pension_actual: expediente.montoPensionActual || null,
      institucion_bancaria: expediente.institucionBancaria || "",
      clabe_interbancaria: expediente.cuentaClabe || ""
    },
    estatus: p.estatus,
    expediente: {
      carpeta_drive: expediente.nombreCarpetaDrive || "",
      url_acceso: expediente.urlCarpetaDrive || "",
      documentos: {
        ine_ambos_lados: expediente.ineAmbosLados || "Pendiente",
        comprobante_domicilio: expediente.comprobanteDomicilio || "Pendiente",
        resolucion_pension: expediente.resolucionPension || "Pendiente",
        estados_de_cuenta: expediente.estadosCuenta || "Pendiente",
        foto_con_ine: expediente.fotoConIne || "Pendiente"
      }
    },
    formalizacion: {
      tipo: expediente.evidenciaTipo || "",
      aprobacion_superior: expediente.aprobacionSuperior || false
    }
  });

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">{p.nombreCompleto}</div>
          <div className="page-sub">Expediente #{p.id} · {p.curp}</div>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Volver</button>
          {expediente.urlCarpetaDrive && (
            <a href={expediente.urlCarpetaDrive} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">📁 Drive</a>
          )}
          <button className="btn btn-primary btn-sm" onClick={() => setApproving(true)}>
            Aprobar Expediente
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Hero card */}
        <div className="card mb-4">
          <div className="card-body">
            <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'var(--accent)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0,
              }}>
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
                <div>Ingresado</div>
                <div style={{ color: 'var(--text-2)', marginTop: 2 }}>{fmtDate(p.fechaIngreso)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs mb-4">
          {(['info','docs','payload','notas'] as const).map(key => {
            const labels: Record<string,string> = { info:'Información', docs:'Documentos OCR', payload:'Payload JSON', notas:'🔔 Notas' };
            const notasPendientes = key === 'notas' ? getNotasByProspecto(p.id).filter(n => !n.resuelta).length : 0;
            return (
              <button key={key} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
                {labels[key]}
                {notasPendientes > 0 && (
                  <span style={{ marginLeft: 4, background: 'rgba(255,255,255,0.25)', borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 700 }}>
                    {notasPendientes}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab: Info */}
        {tab === 'info' && (
          <div className="grid-2 gap-4">
            {/* Datos del prospecto */}
            <div className="card">
              <div className="card-head"><div className="card-title">Datos del Prospecto</div></div>
              <div className="card-body">
                <div className="detail-grid">
                  <EditableText field="nombreCompleto"   value={p.nombreCompleto}   label="Nombre Completo" />
                  <EditableText field="telefonoContacto" value={p.telefonoContacto} label="Teléfono" />
                  <EditableText field="curp" value={p.curp} label="CURP" mono />
                  <EditableText field="nss"  value={p.nss}  label="NSS"  mono />
                  <div className="detail-field">
                    <div className="detail-label">Correo Electrónico</div>
                    <div className="detail-value">{expediente.correoElectronico || '—'}</div>
                  </div>
                  <div className="detail-field">
                    <div className="detail-label">Correo SIPRE</div>
                    <div className="detail-value">{expediente.correoSipre || '—'}</div>
                  </div>
                  <div className="detail-field">
                    <div className="detail-label">Contactado</div>
                    <div className="detail-value">
                      {expediente.contactado ? <span className="badge badge-green">Sí</span> : <span className="badge badge-red">No</span>}
                    </div>
                  </div>
                  <div className="detail-field">
                    <div className="detail-label">Canal de Origen</div>
                    <div className="detail-value">{p.origenCanal}</div>
                  </div>
                  <div className="detail-field">
                    <div className="detail-label">Última Actualización</div>
                    <div className="detail-value" style={{ fontSize: 12 }}>{fmtDate(p.fechaUltimaActualizacion)}</div>
                  </div>
                  {p.observaciones && (
                    <div className="detail-field detail-full">
                      <div className="detail-label">Observaciones</div>
                      <EditableText field="observaciones" value={p.observaciones || ''} label="" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Datos financieros */}
            <div className="card">
              <div className="card-head"><div className="card-title">Análisis Financiero IA</div></div>
              <div className="card-body">
                <div className="detail-grid">
                  <div className="detail-field detail-full">
                    <div className="detail-label">Monto Pensión Actual</div>
                    <div className="detail-value big" style={{ color: 'var(--green)' }}>
                      {expediente.montoPensionActual
                        ? `$${Number(expediente.montoPensionActual).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`
                        : <span style={{ color: 'var(--text-3)', fontSize: 14 }}>Sin datos aún</span>}
                    </div>
                  </div>
                  <div className="detail-field">
                    <div className="detail-label">Institución Bancaria</div>
                    <div className="detail-value">{expediente.institucionBancaria || '—'}</div>
                  </div>
                  <div className="detail-field">
                    <div className="detail-label">CLABE Interbancaria</div>
                    <div className="detail-value mono">{expediente.cuentaClabe || '—'}</div>
                  </div>
                  <div className="detail-field">
                    <div className="detail-label">Aumento Pensión</div>
                    <div className="detail-value" style={{ color: 'var(--green)' }}>
                      {expediente.aumentoPension ? `$${Number(expediente.aumentoPension).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN` : '—'}
                    </div>
                  </div>
                  <div className="detail-field">
                    <div className="detail-label">Retroactivo (Ficticio) DOM</div>
                    <div className="detail-value">
                      {expediente.retroactivoFicticio ? `$${Number(expediente.retroactivoFicticio).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN` : '—'}
                    </div>
                  </div>
                  <div className="detail-field">
                    <div className="detail-label">Retroactivo Final DOM</div>
                    <div className="detail-value" style={{ color: 'var(--accent)' }}>
                      {expediente.retroactivoFinal ? `$${Number(expediente.retroactivoFinal).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN` : '—'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Drive */}
            <div className="card">
              <div className="card-head"><div className="card-title">Google Drive</div></div>
              <div className="card-body">
                <div className="detail-field" style={{ marginBottom: 14 }}>
                  <div className="detail-label">Nombre de Carpeta</div>
                  <div className="detail-value" style={{ fontSize: 12, lineHeight: 1.6, wordBreak: 'break-all' }}>
                    {expediente.nombreCarpetaDrive || '—'}
                  </div>
                </div>
                {expediente.urlCarpetaDrive ? (
                  <a href={expediente.urlCarpetaDrive} target="_blank" rel="noreferrer" className="btn btn-ghost w-full" style={{ justifyContent: 'center' }}>
                    Abrir Carpeta en Drive →
                  </a>
                ) : (
                  <div className="badge badge-yellow">Carpeta no inicializada</div>
                )}
              </div>
            </div>

            {/* Formalización */}
            <div className="card">
              <div className="card-head"><div className="card-title">Formalización Legal</div></div>
              <div className="card-body">
                <div className="detail-grid">
                  <div className="detail-field">
                    <div className="detail-label">Tipo de Evidencia</div>
                    <div className="detail-value">{expediente.evidenciaTipo || 'No definido'}</div>
                  </div>
                  <div className="detail-field">
                    <div className="detail-label">Aprobación Superior</div>
                    <div>
                      {expediente.aprobacionSuperior
                        ? <span className="badge badge-green">Aprobado por {expediente.aprobadoPor}</span>
                        : <span className="badge badge-yellow">Pendiente</span>}
                    </div>
                  </div>
                  <div className="detail-field">
                    <div className="detail-label">Estado de Pago</div>
                    <div>
                      {expediente.pagado
                        ? <span className="badge badge-green">Pagado</span>
                        : <span className="badge badge-gray">No Pagado</span>}
                    </div>
                  </div>
                  <div className="detail-field detail-full">
                    <div className="detail-label">Link de Constancia y Contrato</div>
                    {expediente.linkConstancia ? (
                      <a href={expediente.linkConstancia} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline', fontSize: 13 }}>
                        Ver Constancia
                      </a>
                    ) : <div className="detail-value">—</div>}
                  </div>
                  <div className="detail-field detail-full">
                    <div className="detail-label">Estatus del Expediente</div>
                    <span className={`badge ${
                      expediente.estatusExpediente === 'APROBADO'   ? 'badge-green' :
                      expediente.estatusExpediente === 'DESPACHADO' ? 'badge-purple' :
                      expediente.estatusExpediente === 'RECHAZADO'  ? 'badge-red' : 'badge-yellow'
                    }`}>{expediente.estatusExpediente}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Notas */}
        {tab === 'notas' && (
          <div className="card">
            <div className="card-body">
              <PanelNotas prospectoId={p.id} />
            </div>
          </div>
        )}

        {/* Tab: Docs OCR */}
        {tab === 'docs' && (
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Documentos OCR</div>
                <div className="card-sub">Estado de validación por documento</div>
              </div>
              <div className="flex gap-1">
                <span className="badge badge-green">{Object.values(docEstados).filter(v => v === 'APROBADO').length} aprobados</span>
                <span className="badge badge-yellow">{Object.values(docEstados).filter(v => v === 'PENDIENTE').length} pendientes</span>
              </div>
            </div>
            <div className="card-body">
              {Object.entries(docEstados).map(([key, estado]) => (
                <div key={key} className="doc-row">
                  <div>
                    <div className="doc-name">{DOC_LABELS[key] || key}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${estado === 'APROBADO' ? 'badge-green' : estado === 'RECHAZADO' ? 'badge-red' : estado === 'ILEGIBLE' ? 'badge-orange' : 'badge-yellow'}`}>
                      {estado === 'APROBADO' ? '✓ Aprobado' : estado === 'RECHAZADO' ? '✕ Rechazado' : estado === 'ILEGIBLE' ? '⚠ Ilegible' : '○ Pendiente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Payload */}
        {tab === 'payload' && (
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Payload JSON Final</div>
                <div className="card-sub">Estructura que se despacha al grupo de operaciones (Módulo VI)</div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(generateDynamicPayload(), null, 2));
                  addToast('Payload copiado al portapapeles');
                }}
              >
                ⧉ Copiar
              </button>
            </div>
            <div className="card-body">
              <pre style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '16px',
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                color: 'var(--text-1)',
                overflowX: 'auto',
                lineHeight: 1.7,
              }}>
                {JSON.stringify(generateDynamicPayload(), null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Aprobar */}
      {approving && (
        <div className="modal-backdrop" onClick={() => setApproving(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Aprobar Expediente</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setApproving(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-warn" style={{ marginBottom: 16 }}>
                <span>⚠</span>
                <span>Esta acción aprueba el expediente de <strong>{p.nombreCompleto}</strong> y lo marca como Formalizado.</span>
              </div>
              <div className="form-group">
                <label className="form-label">Nombre del Superior Autorizante</label>
                <input
                  className="input"
                  placeholder="Tu nombre completo"
                  value={approvedBy}
                  autoFocus
                  onChange={e => setApprovedBy(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleApprove(); }}
                />
                <span className="form-hint">Quedará registrado en el log de auditoría</span>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setApproving(false)}>Cancelar</button>
              <button className="btn btn-success" disabled={!approvedBy.trim()} onClick={handleApprove}>
                Confirmar Aprobación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expediente;
