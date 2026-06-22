import React, { useState } from 'react';
import { useAuth, ACCENT_MAP, ROLE_LABELS, type AccentColor, type UserRole } from '../services/auth';
import { useToast } from '../services/store';

type SettingsTab = 'perfil' | 'apariencia' | 'notificaciones' | 'integraciones' | 'seguridad' | 'equipo' | 'sistema';

const TABS: { id: SettingsTab; icon: string; label: string; minRol?: UserRole }[] = [
  { id: 'perfil',         icon: '👤', label: 'Perfil de Usuario' },
  { id: 'apariencia',     icon: '🎨', label: 'Apariencia' },
  { id: 'notificaciones', icon: '🔔', label: 'Notificaciones' },
  { id: 'integraciones',  icon: '🔗', label: 'Integraciones n8n' },
  { id: 'seguridad',      icon: '🔒', label: 'Seguridad' },
  { id: 'equipo',         icon: '👥', label: 'Gestión de Equipo' },
  { id: 'sistema',        icon: '🖥️', label: 'Preferencias del Sistema' },
];

const Settings: React.FC = () => {
  const { user, users, theme, notif, servicesConfig, apiKeys,
          updateProfile, changePassword, updateTheme, updateNotif, updateServicesConfig,
          generateApiKey, revokeApiKey, clearAllSessions,
          addUser, removeUser } = useAuth();
  const { addToast } = useToast();

  const [tab, setTab] = useState<SettingsTab>('perfil');

  // Perfil state
  const [name, setName]       = useState(user?.name || '');
  const [email, setEmail]     = useState(user?.email || '');
  const [avatar, setAvatar]   = useState(user?.avatar || '');

  // Password state
  const [curPass, setCurPass]   = useState('');
  const [newPass, setNewPass]   = useState('');
  const [confPass, setConfPass] = useState('');

  // Equipo modal
  const [showAddUser, setShowAddUser] = useState(false);
  const [nuEmail, setNuEmail]         = useState('');
  const [nuName, setNuName]           = useState('');
  const [nuPass, setNuPass]           = useState('');
  const [nuRol, setNuRol]             = useState<UserRole>('editor');

  // Sistema
  const [confirmDelete, setConfirmDelete] = useState('');
  const [loteLimit, setLoteLimit]         = useState('500');

  const saveProfile = () => {
    updateProfile({ name, email, avatar: avatar || undefined });
    addToast('Perfil actualizado', 'success');
  };

  const savePassword = () => {
    if (!curPass || !newPass || !confPass) { addToast('Completa todos los campos', 'error'); return; }
    if (newPass !== confPass) { addToast('Las contraseñas nuevas no coinciden', 'error'); return; }
    if (newPass.length < 8) { addToast('La contraseña debe tener al menos 8 caracteres', 'error'); return; }
    const ok = changePassword(curPass, newPass);
    if (ok) {
      addToast('Contraseña actualizada', 'success');
      setCurPass(''); setNewPass(''); setConfPass('');
    } else {
      addToast('Contraseña actual incorrecta', 'error');
    }
  };

  const handleAddUser = () => {
    if (!nuEmail || !nuName || !nuPass) { addToast('Completa todos los campos', 'error'); return; }
    const ok = addUser({ email: nuEmail, name: nuName, password: nuPass, rol: nuRol });
    if (ok) {
      addToast('Usuario agregado exitosamente', 'success');
      setNuEmail(''); setNuName(''); setNuPass(''); setNuRol('editor');
      setShowAddUser(false);
    } else {
      addToast('Ya existe un usuario con ese correo', 'error');
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Nombre', 'Email', 'Rol', 'Fecha Alta'];
    const rows = users.map(u => [u.id, u.name, u.email, ROLE_LABELS[u.rol], u.fechaAlta]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'equipo_crm.csv'; a.click();
    URL.revokeObjectURL(url);
    addToast('Métricas exportadas', 'success');
  };

  const visibleTabs = TABS.filter(t => {
    if (!t.minRol) return true;
    if (!user) return false;
    return true; // Expose all for this demo, restrict features inside instead if needed
  });

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">⚙️ Configuración</div>
          <div className="page-sub">Personaliza tu cuenta y las preferencias del sistema</div>
        </div>
      </div>

      <div className="page-body">
        <div className="settings-layout">

          {/* Sidebar tabs */}
          <div className="settings-nav-card">
            <div className="settings-tabs">
              {visibleTabs.map(t => (
                <button
                  key={t.id}
                  className={`settings-tab ${tab === t.id ? 'active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  <span className="tab-icon">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="settings-section">

            {/* ── PERFIL ── */}
            {tab === 'perfil' && (
              <div className="card" style={{ padding: '24px 32px' }}>
                <h3 style={{ fontSize: 18, marginBottom: 4, fontWeight: 700 }}>Perfil de Usuario</h3>
                <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 24 }}>Actualiza tu información personal y foto de perfil.</p>
                
                <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 28 }}>
                  <div className="user-avatar" style={{ width: 72, height: 72, fontSize: 28, borderRadius: '16px' }}>
                    {avatar ? <img src={avatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="form-group" style={{ marginBottom: 12 }}>
                      <label className="form-label">URL de Avatar</label>
                      <input className="input" type="url" placeholder="https://..." value={avatar} onChange={e => setAvatar(e.target.value)} />
                      <span className="form-hint">Pega la URL de tu imagen preferida</span>
                    </div>
                  </div>
                </div>

                <div className="form-row" style={{ marginBottom: 24 }}>
                  <div className="form-group">
                    <label className="form-label">Nombre Completo</label>
                    <input className="input" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Correo Electrónico</label>
                    <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                </div>

                <div style={{ paddingBottom: 24, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
                  <button className="btn btn-primary" onClick={saveProfile}>Guardar Cambios</button>
                </div>

                <h3 style={{ fontSize: 16, marginBottom: 4, fontWeight: 600 }}>Cambiar Contraseña</h3>
                <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 16 }}>Asegúrate de usar al menos 8 caracteres.</p>

                <div className="form-group" style={{ maxWidth: 300, marginBottom: 16 }}>
                  <label className="form-label">Contraseña Actual</label>
                  <input className="input" type="password" value={curPass} onChange={e => setCurPass(e.target.value)} />
                </div>
                <div className="form-row" style={{ maxWidth: 620, marginBottom: 20 }}>
                  <div className="form-group">
                    <label className="form-label">Nueva Contraseña</label>
                    <input className="input" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirmar Contraseña</label>
                    <input className="input" type="password" value={confPass} onChange={e => setConfPass(e.target.value)} />
                  </div>
                </div>
                <button className="btn btn-ghost" onClick={savePassword}>Actualizar Contraseña</button>
              </div>
            )}

            {/* ── APARIENCIA ── */}
            {tab === 'apariencia' && (
              <div className="card" style={{ padding: '24px 32px' }}>
                <h3 style={{ fontSize: 18, marginBottom: 4, fontWeight: 700 }}>Apariencia de la Interfaz</h3>
                <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 24 }}>Personaliza cómo se ve tu espacio de trabajo.</p>

                <div style={{ marginBottom: 28 }}>
                  <div className="form-label" style={{ marginBottom: 12 }}>Tema de Color</div>
                  <div className="flex gap-2">
                    {[
                      { id: 'light', icon: '☀️', label: 'Modo Claro' },
                      { id: 'dark',  icon: '🌙', label: 'Modo Oscuro' },
                      { id: 'auto',  icon: '💻', label: 'Sistema' },
                    ].map(m => (
                      <button
                        key={m.id}
                        className={`btn ${theme.mode === m.id ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ flex: 1, justifyContent: 'center', padding: '12px 16px' }}
                        onClick={() => { updateTheme({ mode: m.id as 'light' | 'dark' | 'auto' }); addToast(`Tema ${m.label} activado`); }}
                      >
                        <span style={{ fontSize: 16 }}>{m.icon}</span> {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 28 }}>
                  <div className="form-label" style={{ marginBottom: 12 }}>Color de Acento</div>
                  <div className="color-swatches" style={{ gap: 12 }}>
                    {(Object.entries(ACCENT_MAP) as [AccentColor, typeof ACCENT_MAP[AccentColor]][]).map(([key, acc]) => (
                      <div
                        key={key}
                        className={`color-swatch ${theme.accent === key ? 'selected' : ''}`}
                        style={{ background: acc.hex, width: 40, height: 40, borderRadius: '50%' }}
                        title={acc.name}
                        onClick={() => { updateTheme({ accent: key }); addToast(`Color ${acc.name} seleccionado`); }}
                      />
                    ))}
                  </div>
                </div>

                <div className="toggle-row" style={{ marginBottom: 20 }}>
                  <div>
                    <div className="toggle-label">Modo de Contraste Alto</div>
                    <div className="toggle-hint">Aumenta la legibilidad de textos y bordes.</div>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={theme.highContrast}
                      onChange={e => updateTheme({ highContrast: e.target.checked })} />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="form-group" style={{ maxWidth: 300 }}>
                  <label className="form-label">Idioma</label>
                  <select className="input" value={theme.language} onChange={e => updateTheme({ language: e.target.value as 'es' | 'en' })}>
                    <option value="es">🇲🇽 Español (México)</option>
                    <option value="en">🇺🇸 English (US)</option>
                  </select>
                </div>
              </div>
            )}

            {/* ── NOTIFICACIONES ── */}
            {tab === 'notificaciones' && (
              <div className="card" style={{ padding: '24px 32px' }}>
                <h3 style={{ fontSize: 18, marginBottom: 4, fontWeight: 700 }}>Preferencias de Alertas</h3>
                <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 24 }}>Decide qué y cómo quieres ser notificado.</p>

                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Nuevos Prospectos</div>
                    <div className="toggle-hint">Avisar cuando se registre un nuevo lead en el sistema.</div>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={notif.newProspecto}
                      onChange={e => { updateNotif({ newProspecto: e.target.checked }); addToast('Preferencia guardada'); }} />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Notas Urgentes</div>
                    <div className="toggle-hint">Avisar de forma inmediata cuando se asigne una nota urgente.</div>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={notif.urgentNotes}
                      onChange={e => { updateNotif({ urgentNotes: e.target.checked }); addToast('Preferencia guardada'); }} />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="toggle-row" style={{ marginBottom: 24 }}>
                  <div>
                    <div className="toggle-label">Cambios de Estatus</div>
                    <div className="toggle-hint">Avisar cuando un prospecto cambie a estado Formalizado o Rechazado.</div>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={notif.statusChange}
                      onChange={e => { updateNotif({ statusChange: e.target.checked }); addToast('Preferencia guardada'); }} />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label">Webhook URL (Integraciones)</label>
                  <input className="input" type="url" placeholder="https://api.tuempresa.com/webhook"
                    value={notif.webhookUrl} onChange={e => updateNotif({ webhookUrl: e.target.value })} />
                  <span className="form-hint">Dispara eventos externos para integraciones personalizadas.</span>
                </div>

                <div className="form-group" style={{ maxWidth: 300 }}>
                  <label className="form-label">Frecuencia de Resumen por Correo</label>
                  <select className="input" value={notif.summaryFreq}
                    onChange={e => { updateNotif({ summaryFreq: e.target.value as 'daily'|'weekly'|'never' }); addToast('Preferencia guardada'); }}>
                    <option value="daily">Resumen Diario</option>
                    <option value="weekly">Resumen Semanal</option>
                    <option value="never">No enviar resúmenes</option>
                  </select>
                </div>
              </div>
            )}

            {/* ── INTEGRACIONES ── */}
            {tab === 'integraciones' && (
              <div className="card" style={{ padding: '24px 32px' }}>
                <h3 style={{ fontSize: 18, marginBottom: 4, fontWeight: 700 }}>Integraciones n8n</h3>
                <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 24 }}>Marca las credenciales que ya configuraste en tu archivo <code>.env</code> de n8n.</p>

                <div className="toggle-row">
                  <div>
                    <div className="toggle-label flex items-center gap-2">WhatsApp (Meta) <span>💬</span></div>
                    <div className="toggle-hint">Token Temporal y Phone ID configurados.</div>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={servicesConfig?.whatsapp}
                      onChange={e => { updateServicesConfig({ whatsapp: e.target.checked }); addToast('Estado actualizado'); }} />
                    <span className="toggle-slider" />
                  </label>
                </div>

                {servicesConfig?.whatsapp && (
                  <div style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 'var(--radius)', marginBottom: 20 }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Prompt Maestro (IA de WhatsApp)</span>
                      <span className="badge badge-purple">Reglas Estrictas</span>
                    </label>
                    <textarea 
                      className="input" 
                      style={{ minHeight: 140, resize: 'vertical', fontSize: 13, lineHeight: '1.5' }}
                      value={servicesConfig.whatsappAiPrompt || ''}
                      onChange={e => updateServicesConfig({ whatsappAiPrompt: e.target.value })}
                      placeholder="Instrucciones estrictas para la IA..."
                    />
                    <div className="form-hint" style={{ marginTop: 8 }}>
                      Define los límites operativos y políticas documentales (ej. <strong>no aceptar fotos de celular</strong>, horarios de 08:00 a 19:00 hrs, solicitar video, etc.) que la IA debe respetar sin excepción.
                    </div>
                  </div>
                )}

                <div className="toggle-row">
                  <div>
                    <div className="toggle-label flex items-center gap-2">OpenAI (ChatGPT) <span>🤖</span></div>
                    <div className="toggle-hint">API Key configurada en <code>.env</code> para OCR y Visión.</div>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={servicesConfig?.openAi}
                      onChange={e => { updateServicesConfig({ openAi: e.target.checked }); addToast('Estado actualizado'); }} />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="toggle-row">
                  <div>
                    <div className="toggle-label flex items-center gap-2">Google Drive <span>📁</span></div>
                    <div className="toggle-hint">Service Account JSON guardado en la carpeta <code>credentials/</code>.</div>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={servicesConfig?.googleDrive}
                      onChange={e => { updateServicesConfig({ googleDrive: e.target.checked }); addToast('Estado actualizado'); }} />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="toggle-row" style={{ marginBottom: 24 }}>
                  <div>
                    <div className="toggle-label flex items-center gap-2">Bland.ai (Voz) <span>📞</span></div>
                    <div className="toggle-hint">API Key configurada para automatización de llamadas.</div>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={servicesConfig?.blandAi}
                      onChange={e => { updateServicesConfig({ blandAi: e.target.checked }); addToast('Estado actualizado'); }} />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, marginTop: 24 }}>
                  <h3 style={{ fontSize: 16, marginBottom: 4, fontWeight: 600 }}>Webhook de Consulta n8n</h3>
                  <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 16 }}>URL proporcionada por n8n para consultar los saldos reales de forma segura.</p>
                  
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label className="form-label">URL Webhook Saldos</label>
                    <input className="input" type="url" placeholder="https://tu-n8n.com/webhook/saldos-ia"
                      value={notif.webhookSaldos || ''} 
                      onChange={e => updateNotif({ webhookSaldos: e.target.value })} 
                    />
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => addToast('URL Guardada', 'success')}>Guardar Webhook</button>
                </div>
              </div>
            )}

            {/* ── SEGURIDAD ── */}
            {tab === 'seguridad' && (
              <div className="card" style={{ padding: '24px 32px' }}>
                <h3 style={{ fontSize: 18, marginBottom: 4, fontWeight: 700 }}>Seguridad y Acceso</h3>
                <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 24 }}>Protege tu cuenta y gestiona credenciales de API.</p>

                <div className="toggle-row" style={{ marginBottom: 28 }}>
                  <div>
                    <div className="toggle-label flex items-center gap-2">Autenticación de Dos Factores (2FA) <span className="badge badge-yellow">Pro</span></div>
                    <div className="toggle-hint">Requiere un código de una app autenticadora al iniciar sesión.</div>
                  </div>
                  <label className="toggle-switch" style={{ opacity: 0.5 }}>
                    <input type="checkbox" disabled />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 24, marginBottom: 24 }}>
                  <h3 style={{ fontSize: 16, marginBottom: 4, fontWeight: 600 }}>Sesiones Activas</h3>
                  <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 16 }}>Revisa los dispositivos donde has iniciado sesión.</p>
                  
                  <div className="flex justify-between items-center" style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: 'var(--radius)', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>Esta sesión (Windows · Edge)</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Última actividad: Hace un momento</div>
                    </div>
                    <span className="badge badge-green">Actual</span>
                  </div>

                  <button className="btn btn-ghost text-red" onClick={clearAllSessions}>Cerrar todas las demás sesiones</button>
                </div>

                <div>
                  <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
                    <div>
                      <h3 style={{ fontSize: 16, marginBottom: 4, fontWeight: 600 }}>Claves API</h3>
                      <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Usa estas claves para autenticar peticiones desde n8n u otros servicios.</p>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => { generateApiKey(); addToast('Clave API generada', 'success'); }}>
                      + Generar Clave
                    </button>
                  </div>
                  
                  {apiKeys.length === 0 ? (
                    <div className="empty-state" style={{ padding: '24px 0' }}>
                      <div className="empty-icon">🔑</div>
                      <div className="empty-title">Sin Claves API</div>
                      <div className="empty-sub">Genera una clave para integraciones externas.</div>
                    </div>
                  ) : (
                    <div className="table-wrap" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                      <table className="data-table" style={{ margin: 0 }}>
                        <thead style={{ background: 'var(--bg-elevated)' }}>
                          <tr>
                            <th style={{ paddingTop: 12 }}>Clave</th>
                            <th style={{ paddingTop: 12, textAlign: 'right' }}>Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {apiKeys.map(k => (
                            <tr key={k}>
                              <td><code style={{ background: 'var(--bg)', padding: '4px 8px', borderRadius: 4, color: 'var(--accent)' }}>{k}</code></td>
                              <td style={{ textAlign: 'right' }}>
                                <button className="btn btn-ghost btn-sm text-red" onClick={() => { revokeApiKey(k); addToast('Clave revocada', 'info'); }}>Revocar</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── EQUIPO ── */}
            {tab === 'equipo' && (
              <div className="card" style={{ padding: '24px 32px' }}>
                <div className="flex justify-between items-start" style={{ marginBottom: 24 }}>
                  <div>
                    <h3 style={{ fontSize: 18, marginBottom: 4, fontWeight: 700 }}>Gestión de Equipo</h3>
                    <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Administra accesos y roles para tu equipo.</p>
                  </div>
                  <button className="btn btn-primary" onClick={() => setShowAddUser(true)}>
                    + Invitar Miembro
                  </button>
                </div>

                <div className="table-wrap" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                  <table className="data-table" style={{ margin: 0 }}>
                    <thead style={{ background: 'var(--bg-elevated)' }}>
                      <tr>
                        <th style={{ paddingTop: 12 }}>Usuario</th>
                        <th style={{ paddingTop: 12 }}>Correo</th>
                        <th style={{ paddingTop: 12 }}>Rol</th>
                        <th style={{ paddingTop: 12 }}>Fecha Registro</th>
                        <th style={{ paddingTop: 12, textAlign: 'right' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="user-row-avatar">
                                {u.avatar ? <img src={u.avatar} alt={u.name} /> : u.name.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontWeight: 600 }}>{u.name}</span>
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-2)' }}>{u.email}</td>
                          <td>
                            <span className={`badge role-${u.rol}`}>{ROLE_LABELS[u.rol]}</span>
                          </td>
                          <td style={{ color: 'var(--text-3)', fontSize: 12 }}>
                            {new Date(u.fechaAlta).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {u.id !== 'sa-001' ? (
                              <button className="btn btn-ghost btn-sm text-red"
                                onClick={() => { if (confirm(`¿Eliminar acceso de ${u.name}?`)) { removeUser(u.id); addToast('Usuario revocado', 'info'); } }}>
                                Revocar Acceso
                              </button>
                            ) : (
                              <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>Dueño</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── SISTEMA ── */}
            {tab === 'sistema' && (
              <div className="card" style={{ padding: '24px 32px' }}>
                <h3 style={{ fontSize: 18, marginBottom: 4, fontWeight: 700 }}>Preferencias del Sistema</h3>
                <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 24 }}>Gestiona el espacio y los recursos del entorno de trabajo.</p>

                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 24, marginBottom: 24 }}>
                  <h3 style={{ fontSize: 16, marginBottom: 12, fontWeight: 600 }}>Almacenamiento</h3>
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 16 }}>
                    <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>Uso de la base de datos (Local)</span>
                      <span style={{ color: 'var(--text-2)', fontSize: 13 }}>1.2 MB / 5 MB</span>
                    </div>
                    <div style={{ width: '100%', height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: '24%', height: '100%', background: 'var(--accent)' }} />
                    </div>
                  </div>
                  <button className="btn btn-ghost" onClick={handleExportCSV}>Exportar Datos Maestros (CSV)</button>
                </div>

                <div className="danger-zone" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: 20, borderRadius: 'var(--radius)' }}>
                  <h3 style={{ fontSize: 16, marginBottom: 8, fontWeight: 600, color: 'var(--red)' }}>Zona de Peligro</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
                    Esta acción eliminará todos los datos de prueba del sistema. Para confirmar, escribe <strong>CONFIRMAR</strong> abajo.
                  </p>
                  <div className="form-group" style={{ maxWidth: 300, marginBottom: 16 }}>
                    <input className="input" placeholder="Escribe CONFIRMAR"
                      value={confirmDelete} onChange={e => setConfirmDelete(e.target.value)} />
                  </div>
                  <button className="btn btn-danger"
                    disabled={confirmDelete !== 'CONFIRMAR'}
                    onClick={() => { addToast('Acción restringida en modo local', 'error'); setConfirmDelete(''); }}>
                    Eliminar Datos Permanentemente
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add user modal */}
      {showAddUser && (
        <div className="modal-backdrop" onClick={() => setShowAddUser(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">+ Invitar Usuario</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAddUser(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nombre</label>
                  <input className="input" placeholder="Juan Pérez" value={nuName} onChange={e => setNuName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Correo</label>
                  <input className="input" type="email" placeholder="juan@empresa.com" value={nuEmail} onChange={e => setNuEmail(e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Contraseña Temporal</label>
                  <input className="input" type="password" placeholder="Mínimo 8 caracteres" value={nuPass} onChange={e => setNuPass(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Rol</label>
                  <select className="input" value={nuRol} onChange={e => setNuRol(e.target.value as UserRole)}>
                    <option value="editor">Editor</option>
                    <option value="viewer">Visualizador</option>
                    {user?.rol === 'super_admin' && <option value="admin">Administrador</option>}
                    {user?.rol === 'super_admin' && <option value="super_admin">Super Admin</option>}
                  </select>
                </div>
              </div>
              <div className="alert alert-warn">
                <span>⚠️</span>
                <span>Comparte la contraseña temporal de forma segura y pide al usuario que la cambie en su primer inicio de sesión.</span>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setShowAddUser(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAddUser}>Invitar Usuario</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
