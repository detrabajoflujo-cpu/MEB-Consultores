import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, NOTA_ICONS } from '../services/store';
import { useToast } from '../services/store';
import { useAuth } from '../services/auth';
import type { Nota } from '../services/store';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const weekData = [
  { dia: 'Lun', prospectos: 3, viables: 2 },
  { dia: 'Mar', prospectos: 5, viables: 4 },
  { dia: 'Mié', prospectos: 2, viables: 1 },
  { dia: 'Jue', prospectos: 7, viables: 5 },
  { dia: 'Vie', prospectos: 4, viables: 3 },
  { dia: 'Sáb', prospectos: 6, viables: 4 },
  { dia: 'Hoy', prospectos: 4, viables: 3 },
];

const PIE_COLORS = ['#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#3B82F6'];
const ESTATUS_OPTIONS = ['NUEVO','VALIDANDO','VIABLE','EN_PROCESO','FORMALIZADO','RECHAZADO'] as const;

// Time slots for schedule view
const TIME_SLOTS = [
  '09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','13:00','13:30','14:00','14:30',
  '15:00','15:30','16:00','16:30','17:00','17:30',
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { prospectos, stats, addProspecto, getUrgentNotas, getAllNotas } = useStore();
  const { addToast } = useToast();
  const { user, servicesConfig, notif, updateServicesConfig } = useAuth();
  const [loadingSaldos, setLoadingSaldos] = useState(false);

  // All pending notes for timeline
  const allNotas: Nota[] = (getAllNotas?.() || []).filter(n => !n.resuelta).slice(0, 16);
  const [notaFilter, setNotaFilter] = useState<'todas'|'urgente'|'documento'|'llamada'|'general'>('todas');
  const filteredNotas = notaFilter === 'todas' ? allNotas : allNotas.filter(n => n.tipo === notaFilter);

  // Map to time slots
  const filteredSlotMap: Record<string, Nota[]> = {};
  filteredNotas.forEach((nota, idx) => {
    const slot = TIME_SLOTS[idx % TIME_SLOTS.length];
    if (!filteredSlotMap[slot]) filteredSlotMap[slot] = [];
    filteredSlotMap[slot].push(nota);
  });

  // Recent prospectos
  const recent = [...prospectos]
    .sort((a, b) => new Date(b.fechaIngreso).getTime() - new Date(a.fechaIngreso).getTime())
    .slice(0, 6);

  const pieData = [
    { name: 'Viables',      value: stats.viables },
    { name: 'En Proceso',   value: stats.en_proceso },
    { name: 'Formalizados', value: stats.formalizados },
    { name: 'Rechazados',   value: stats.rechazados },
    { name: 'Validando',    value: stats.validando },
  ].filter(d => d.value > 0);

  const BADGE: Record<string, { cls: string; label: string }> = {
    NUEVO:       { cls: 'badge-gray',   label: 'Nuevo' },
    VALIDANDO:   { cls: 'badge-yellow', label: 'Validando' },
    VIABLE:      { cls: 'badge-green',  label: 'Viable' },
    EN_PROCESO:  { cls: 'badge-blue',   label: 'En Proceso' },
    FORMALIZADO: { cls: 'badge-purple', label: 'Formalizado' },
    RECHAZADO:   { cls: 'badge-red',    label: 'Rechazado' },
  };

  // Modal new prospecto
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    nombreCompleto: '', telefonoContacto: '', curp: '', nss: '',
    origenCanal: 'Meta Ads', estatus: 'NUEVO' as const,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nombreCompleto.trim()) e.nombre = 'Requerido';
    if (!form.telefonoContacto.trim()) e.tel = 'Requerido';
    if (form.curp.length !== 18) e.curp = '18 caracteres';
    if (form.nss.length !== 11 || !/^\d+$/.test(form.nss)) e.nss = '11 dígitos';
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    addProspecto({ ...form, curpValida: true, nssValido: true, observaciones: '' });
    setShowModal(false);
    setForm({ nombreCompleto: '', telefonoContacto: '', curp: '', nss: '', origenCanal: 'Meta Ads', estatus: 'NUEVO' });
    setErrors({});
    addToast('Prospecto registrado');
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });

  const fetchSaldos = async () => {
    if (!notif.webhookSaldos) {
      addToast('Primero configura la URL del Webhook en Settings', 'info');
      return;
    }
    setLoadingSaldos(true);
    try {
      const res = await fetch(notif.webhookSaldos);
      if (!res.ok) throw new Error('Error al conectar con n8n');
      const data = await res.json();
      updateServicesConfig({
        openAiBalance: data.openAiBalance,
        blandAiBalance: data.blandAiBalance
      });
      addToast('Saldos actualizados desde n8n', 'success');
    } catch (e) {
      addToast('Falló la conexión al Webhook n8n', 'error');
    } finally {
      setLoadingSaldos(false);
    }
  };

  const AVATAR_COLORS = ['#7C3AED','#3B82F6','#10B981','#F59E0B','#EF4444','#EC4899'];

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">👋 Bienvenido, {user?.name?.split(' ')[0] || 'Admin'}</div>
          <div className="page-sub">{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
        <div className="header-actions">
          <button id="btn-nuevo-prospecto" className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            + Nuevo Prospecto
          </button>
        </div>
      </div>

      <div className="page-body">

        {/* Gradient Stat Cards */}
        <div className="grid-4 mb-4">
          <div className="stat-card-gradient sc-purple">
            <div className="stat-icon">👥</div>
            <div className="stat-label">Total</div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-sub">Nuevos: {stats.nuevos} · Valid.: {stats.validando}</div>
          </div>
          <div className="stat-card-gradient sc-blue">
            <div className="stat-icon">✅</div>
            <div className="stat-label">Viables</div>
            <div className="stat-value">{stats.viables}</div>
            <div className="stat-sub">En proceso: {stats.en_proceso}</div>
          </div>
          <div className="stat-card-gradient sc-green">
            <div className="stat-icon">🏆</div>
            <div className="stat-label">Formalizados</div>
            <div className="stat-value">{stats.formalizados}</div>
            <div className="stat-sub">{stats.total > 0 ? Math.round((stats.formalizados / stats.total) * 100) : 0}% del total</div>
          </div>
          <div className="stat-card-gradient sc-pink">
            <div className="stat-icon">⚠️</div>
            <div className="stat-label">Rechazados</div>
            <div className="stat-value">{stats.rechazados}</div>
            <div className="stat-sub">Requieren seguimiento</div>
          </div>
        </div>

        {/* 2-column: timeline LEFT + charts RIGHT */}
        <div className="mb-4" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 14, alignItems: 'start' }}>

          {/* TODAY'S REMINDERS — schedule-style */}
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">📋 Recordatorios</div>
                <div className="card-sub">{allNotas.length} pendientes hoy</div>
              </div>
            </div>
            {/* Filter row */}
            <div style={{ display: 'flex', gap: 4, padding: '8px 14px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
              {(['todas','urgente','llamada','documento','general'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setNotaFilter(f)}
                  style={{
                    padding: '3px 8px', borderRadius: 5, fontSize: 10, fontWeight: 600,
                    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                    background: notaFilter === f ? 'var(--accent)' : 'var(--bg-elevated)',
                    color: notaFilter === f ? '#fff' : 'var(--text-3)',
                  }}
                >
                  {f === 'todas' ? 'Todas' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            <div style={{ maxHeight: 340, overflowY: 'auto', padding: '4px 14px 10px' }}>
              {filteredNotas.length === 0 ? (
                <div className="empty-state" style={{ padding: '28px 0' }}>
                  <div className="empty-icon">📋</div>
                  <div className="empty-title">Sin recordatorios</div>
                  <div className="empty-sub">Agrega notas en los expedientes</div>
                </div>
              ) : (
                <div className="timeline-schedule">
                  {TIME_SLOTS.map(slot => {
                    const notas = filteredSlotMap[slot];
                    return (
                      <div key={slot} className="timeline-slot">
                        <div className="timeline-time">{slot}</div>
                        <div className="timeline-event" style={{ flexDirection: 'column', gap: 4 }}>
                          {notas && notas.map(nota => {
                            const p = prospectos.find(pr => pr.id === nota.prospectoId);
                            return (
                              <div
                                key={nota.id}
                                className={`timeline-pill tp-${nota.tipo}`}
                                onClick={() => p && navigate(`/prospectos/${p.id}`)}
                                title={nota.texto}
                                style={{ alignSelf: 'flex-start' }}
                              >
                                <span>{NOTA_ICONS[nota.tipo]}</span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160, fontSize: 12 }}>
                                  {p?.nombreCompleto?.split(' ')[0] || 'Prospecto'}
                                  {' — '}
                                  <span style={{ opacity: 0.75, fontWeight: 400 }}>{nota.texto.slice(0, 22)}{nota.texto.length > 22 ? '…' : ''}</span>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Area chart */}
            <div className="card">
              <div className="card-head">
                <div>
                  <div className="card-title">Actividad Semanal</div>
                  <div className="card-sub">Prospectos vs. viables por día</div>
                </div>
              </div>
              <div className="card-body" style={{ paddingTop: 8 }}>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={weekData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#7C3AED" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}   />
                      </linearGradient>
                      <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#10B981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="dia" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                      labelStyle={{ color: 'var(--text-1)', fontWeight: 600 }}
                      itemStyle={{ color: 'var(--text-2)' }}
                    />
                    <Area type="monotone" dataKey="prospectos" name="Prospectos" stroke="#7C3AED" strokeWidth={2} fill="url(#gP)" dot={{ fill: '#7C3AED', r: 2, strokeWidth: 0 }} />
                    <Area type="monotone" dataKey="viables"    name="Viables"    stroke="#10B981" strokeWidth={2} fill="url(#gV)" dot={{ fill: '#10B981', r: 2, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie + quick stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="card">
                <div className="card-head"><div className="card-title">Distribución</div></div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={34} outerRadius={54} paddingAngle={3} dataKey="value">
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                        itemStyle={{ color: 'var(--text-2)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {pieData.map((item, i) => (
                      <div key={item.name} className="flex items-center justify-between" style={{ fontSize: 11 }}>
                        <div className="flex items-center gap-2">
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                          <span style={{ color: 'var(--text-2)' }}>{item.name}</span>
                        </div>
                        <span style={{ fontWeight: 600 }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-head"><div className="card-title">Resumen</div></div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Nuevos',      value: stats.nuevos,      color: 'var(--text-2)' },
                    { label: 'Validando',   value: stats.validando,   color: 'var(--yellow)' },
                    { label: 'En Proceso',  value: stats.en_proceso,  color: 'var(--blue)'   },
                    { label: 'Formaliz.',   value: stats.formalizados, color: 'var(--green)'  },
                    { label: 'Rechazados',  value: stats.rechazados,  color: 'var(--red)'    },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between" style={{ fontSize: 12 }}>
                      <span style={{ color: 'var(--text-2)' }}>{s.label}</span>
                      <span style={{ fontWeight: 700, color: s.color }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline and Services */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, marginBottom: 16 }}>
          <div className="card">
            <div className="card-head">
              <div className="card-title">Pipeline n8n</div>
              <div className="card-sub">Estado de módulos de automatización</div>
            </div>
            <div className="card-body">
              <div className="pipeline-grid">
                {[
                  { num: 'I',   label: 'Ingesta',    icon: '📥', done: true,  path: '/modulos/ingesta' },
                  { num: 'II',  label: 'OCR / IA',   icon: '🔍', done: true,  path: '/modulos/ocr' },
                  { num: 'III', label: 'Llamada',    icon: '📞', done: false, path: '/modulos/llamadas' },
                  { num: 'IV',  label: 'Docs',       icon: '📁', done: false, path: '/modulos/expediente' },
                  { num: 'V',   label: 'Formal.',    icon: '🛡️', done: false, path: '/modulos/aprobacion' },
                  { num: 'VI',  label: 'Despacho',   icon: '🚀', done: false, path: '/modulos/despacho' },
                ].map((step, idx, arr) => (
                  <React.Fragment key={step.num}>
                    <div className={`pipeline-step ${step.done ? 'done' : ''}`} onClick={() => navigate(step.path)}>
                      <div className="step-icon">{step.icon}</div>
                      <div className="step-num">Módulo {step.num}</div>
                      <div className="step-label">{step.label}</div>
                      <div className={`step-status badge ${step.done ? 'badge-green' : 'badge-gray'}`} style={{ display: 'inline-flex', marginTop: 5 }}>
                        {step.done ? '● Activo' : '○ Pendiente'}
                      </div>
                    </div>
                    {idx < arr.length - 1 && <div className="pipeline-arrow">→</div>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Tokens e Integraciones */}
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">IAs y Servicios</div>
                <div className="card-sub">Tokens e integraciones n8n</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button 
                  className="btn btn-ghost btn-icon" 
                  onClick={fetchSaldos} 
                  disabled={loadingSaldos}
                  title="Actualizar saldos desde n8n"
                >
                  {loadingSaldos ? '⏳' : '↻'}
                </button>
                <button className="btn btn-ghost btn-icon" onClick={() => navigate('/settings')}>⚙️</button>
              </div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
              {[
                { name: 'WhatsApp (Meta)', icon: '💬', active: servicesConfig?.whatsapp },
                { 
                  name: 'OpenAI (ChatGPT)', icon: '🤖', active: servicesConfig?.openAi, 
                  balance: servicesConfig?.openAiBalance, limit: servicesConfig?.openAiLimit, showBar: true 
                },
                { name: 'Google Drive', icon: '📁', active: servicesConfig?.googleDrive },
                { 
                  name: 'Bland.ai (Voz)', icon: '📞', active: servicesConfig?.blandAi,
                  balance: servicesConfig?.blandAiBalance, limit: servicesConfig?.blandAiLimit, showBar: true
                },
                { name: 'Webhook n8n', icon: '🔗', active: !!notif?.webhookUrl },
              ].map(s => {
                const pct = (s.showBar && s.active && s.limit && s.balance) ? Math.round((s.balance / s.limit) * 100) : 0;
                const isLow = pct < 20;

                return (
                  <div key={s.name} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span style={{ fontSize: 16 }}>{s.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</span>
                      </div>
                      {s.active ? (
                        s.showBar ? (
                          <span style={{ fontSize: 11, color: isLow ? 'var(--red)' : 'var(--text-2)', fontWeight: 600 }}>
                            ${s.balance?.toFixed(2)} / ${s.limit?.toFixed(2)}
                          </span>
                        ) : (
                          <span className="badge badge-green" style={{ fontSize: 10 }}>✓ Conectado</span>
                        )
                      ) : (
                        <span className="badge badge-gray" style={{ fontSize: 10 }}>Falta Token</span>
                      )}
                    </div>
                    {s.showBar && s.active && (
                      <div style={{ width: '100%', height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${pct}%`, height: '100%', 
                          background: isLow ? 'var(--red)' : 'var(--accent)',
                          transition: 'width 0.3s ease' 
                        }} />
                      </div>
                    )}
                  </div>
                );
              })}
              <div style={{ marginTop: 'auto', paddingTop: 10 }}>
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', fontSize: 12 }} onClick={() => navigate('/settings')}>
                  Configurar Tokens →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent prospectos */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Prospectos Recientes</div>
              <div className="card-sub">Últimos {recent.length} registros</div>
            </div>
            <button id="btn-ver-todos" className="btn btn-ghost btn-sm" onClick={() => navigate('/prospectos')}>
              Ver todos →
            </button>
          </div>
          <div>
            {recent.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <div className="empty-title">Sin prospectos aún</div>
                <div className="empty-sub">Registra el primero con el botón de arriba</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Prospecto</th>
                      <th>Teléfono</th>
                      <th>Canal</th>
                      <th>Estatus</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map(p => (
                      <tr key={p.id} onClick={() => navigate(`/prospectos/${p.id}`)}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="user-row-avatar" style={{ background: AVATAR_COLORS[p.id % AVATAR_COLORS.length] }}>
                              {p.nombreCompleto.charAt(0)}
                            </div>
                            <span style={{ fontWeight: 500, fontSize: 13 }}>{p.nombreCompleto}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-2)', fontSize: 12 }}>{p.telefonoContacto}</td>
                        <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{p.origenCanal}</td>
                        <td><span className={`badge ${BADGE[p.estatus]?.cls || 'badge-gray'}`}>{BADGE[p.estatus]?.label || p.estatus}</span></td>
                        <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{fmtDate(p.fechaIngreso)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* New prospecto modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Nuevo Prospecto</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nombre Completo</label>
                  <input className="input" placeholder="Juan García López" value={form.nombreCompleto}
                    onChange={e => setForm(f => ({ ...f, nombreCompleto: e.target.value }))} />
                  {errors.nombre && <span className="form-error">{errors.nombre}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input className="input" placeholder="5512345678" value={form.telefonoContacto}
                    onChange={e => setForm(f => ({ ...f, telefonoContacto: e.target.value }))} />
                  {errors.tel && <span className="form-error">{errors.tel}</span>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">CURP (18 caracteres)</label>
                  <input className="input" placeholder="XEXX010101HNEXXXA4" maxLength={18} value={form.curp}
                    onChange={e => setForm(f => ({ ...f, curp: e.target.value.toUpperCase() }))} />
                  {errors.curp && <span className="form-error">{errors.curp}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">NSS (11 dígitos)</label>
                  <input className="input" placeholder="12345678901" maxLength={11} value={form.nss}
                    onChange={e => setForm(f => ({ ...f, nss: e.target.value }))} />
                  {errors.nss && <span className="form-error">{errors.nss}</span>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Canal de Origen</label>
                  <select className="input" value={form.origenCanal}
                    onChange={e => setForm(f => ({ ...f, origenCanal: e.target.value }))}>
                    {['Meta Ads','WhatsApp Directo','Referido','Otro'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Estatus Inicial</label>
                  <select className="input" value={form.estatus}
                    onChange={e => setForm(f => ({ ...f, estatus: e.target.value as typeof form.estatus }))}>
                    {ESTATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSubmit}>Guardar Prospecto</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
