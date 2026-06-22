import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth, hasMinRole, ROLE_LABELS } from '../services/auth';

const SidebarNav: React.FC = () => {
  const { user, logout, theme, updateTheme } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const isDark = theme.mode === 'dark';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const NavItem: React.FC<{ to: string; icon: string; label: string; badge?: number }> =
    ({ to, icon, label, badge }) => (
      <NavLink
        to={to}
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <span className="nav-icon">{icon}</span>
        {label}
        {badge != null && badge > 0 && (
          <span className="nav-badge">{badge}</span>
        )}
      </NavLink>
    );

  const canSeeTeam = hasMinRole(user.rol, 'admin');

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-mark">🏥</div>
        <div>
          <div className="logo-name">PuntoClínico</div>
          <div className="logo-sub">CRM Automatizado</div>
        </div>
      </div>

      {/* User profile */}
      <div className="sidebar-user">
        <div className="user-avatar">
          {user.avatar
            ? <img src={user.avatar} alt={user.name} />
            : user.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.name}
          </div>
          <div className="user-rol">{ROLE_LABELS[user.rol]}</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">

        <div className="nav-group-label">Menú Principal</div>
        <NavItem to="/dashboard"          icon="📊" label="Dashboard" />
        <NavItem to="/prospectos" icon="👥" label="Prospectos" />
        <NavItem to="/lotes"      icon="📋" label="Lotes Históricos" />
        <NavItem to="/aprobacion" icon="✅" label="Aprobación" />

        <div className="nav-group-label">Módulos n8n</div>
        <NavItem to="/modulos/ingesta"    icon="📥" label="1 · Ingesta" />
        <NavItem to="/modulos/ocr"        icon="🔍" label="2 · OCR / IA" />
        <NavItem to="/modulos/llamadas"   icon="📞" label="3 · Llamada IA" />
        <NavItem to="/modulos/expediente" icon="📁" label="4 · Expediente" />
        <NavItem to="/modulos/aprobacion" icon="🛡️" label="5 · Formalización" />
        <NavItem to="/modulos/despacho"   icon="🚀" label="6 · Despacho" />

        <div className="nav-group-label">Sistema</div>
        {canSeeTeam && <NavItem to="/equipo"   icon="👤" label="Equipo" />}
        <NavItem to="/settings" icon="⚙️" label="Configuración" />
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="theme-toggle-btn" onClick={() => updateTheme({ mode: isDark ? 'light' : 'dark' })}>
          <span style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</span>
          {isDark ? 'Modo Claro' : 'Modo Oscuro'}
        </button>
        <button
          className="nav-item w-full"
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--red)', justifyContent: 'flex-start' }}
          onClick={handleLogout}
        >
          <span className="nav-icon">🚪</span>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
};

export default SidebarNav;
