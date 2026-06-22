import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/auth';

const Login: React.FC = () => {
  const { login, theme, updateTheme } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const isDark = theme.mode === 'dark';

  const toggleTheme = () => {
    updateTheme({ mode: isDark ? 'light' : 'dark' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Por favor ingresa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 600)); // simulate async
    const ok = login(email.trim(), password);
    setLoading(false);
    if (ok) {
      navigate('/dashboard', { replace: true });
    } else {
      setError('Correo o contraseña incorrectos. Verifica tus datos.');
    }
  };

  return (
    <div className="login-page">
      {/* Animated gradient background */}
      <div className="login-bg-gradient" />

      {/* Floating orbs */}
      <div style={{
        position: 'absolute', width: 300, height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, hsla(var(--accent-h), 70%, 60%, 0.08) 0%, transparent 70%)',
        top: '10%', left: '15%', pointerEvents: 'none',
        animation: 'float 8s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', width: 200, height: 200,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
        bottom: '15%', right: '10%', pointerEvents: 'none',
        animation: 'float 6s ease-in-out infinite reverse',
      }} />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
      `}</style>

      <div className="login-card">
        {/* Theme toggle */}
        <button className="login-theme-btn" onClick={toggleTheme} title="Cambiar tema">
          {isDark ? '☀️' : '🌙'}
        </button>

        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-mark">🏛️</div>
          <div style={{ textAlign: 'center' }}>
            <div className="login-title">MEB Consultores</div>
            <div className="login-sub">Portal de Empleados y Gestores</div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {error && (
            <div className="login-error fade-in">
              <span>⚠️</span>
              {error}
            </div>
          )}

          {/* Email */}
          <div className="form-group">
            <label className="form-label">Correo Electrónico</label>
            <div className="login-input-wrap">
              <span className="login-input-icon">✉️</span>
              <input
                className="input"
                type="email"
                placeholder="admin@mebconsultores.net"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <div className="login-input-wrap">
              <span className="login-input-icon">🔒</span>
              <input
                className="input"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                onKeyDown={e => e.key === 'Enter' && handleSubmit(e as unknown as React.FormEvent)}
              />
              <button
                type="button"
                className="login-input-toggle"
                onClick={() => setShowPass(v => !v)}
                tabIndex={-1}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            style={{ justifyContent: 'center', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Ingresando...
              </>
            ) : '🚀 Iniciar Sesión'}
          </button>
        </form>

        {/* Footer hint */}
        <div style={{
          textAlign: 'center',
          marginTop: 24,
          fontSize: 12,
          color: 'var(--text-3)',
          lineHeight: 1.6,
        }}>
          Acceso restringido a administradores autorizados.<br />
          Si no tienes cuenta, contacta al administrador del sistema.
        </div>
      </div>
    </div>
  );
};

export default Login;
