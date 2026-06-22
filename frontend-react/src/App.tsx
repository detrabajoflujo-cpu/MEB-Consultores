import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider, ToastProvider } from './services/store';
import { AuthProvider } from './services/auth';
import ProtectedRoute from './components/ProtectedRoute';
import SidebarNav from './components/SidebarNav';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Prospectos from './pages/Prospectos';
import Expediente from './pages/Expediente';
import Aprobacion from './pages/Aprobacion';
import Lotes from './pages/Lotes';
import Settings from './pages/Settings';

const ModuloPage: React.FC<{ num: string; nombre: string; icon: string }> = ({ num, nombre, icon }) => (
  <div className="fade-in">
    <div className="page-header">
      <div>
        <div className="page-title">{icon} Módulo {num} — {nombre}</div>
        <div className="page-sub">Este módulo se ejecuta directamente en n8n</div>
      </div>
      <a href="http://localhost:5678" target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
        Abrir en n8n →
      </a>
    </div>
    <div className="page-body">
      <div className="card">
        <div className="card-body">
          <div className="alert alert-info" style={{ marginBottom: 14 }}>
            <span>ℹ️</span>
            <span>
              Importa el archivo <code>n8n-workflows/modulo-{num.toLowerCase()}-*.json</code> en n8n para activar este módulo.
            </span>
          </div>
          <ol style={{ paddingLeft: 20, lineHeight: 2.2, color: 'var(--text-2)', fontSize: 13 }}>
            <li>Entra a <a href="http://localhost:5678" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>localhost:5678</a></li>
            <li>Haz clic en <strong style={{ color: 'var(--text-1)' }}>+ New Workflow</strong></li>
            <li>Menú (···) → <strong style={{ color: 'var(--text-1)' }}>Import from File</strong></li>
            <li>Selecciona el archivo JSON del módulo</li>
            <li>Configura las credenciales y activa el workflow</li>
          </ol>
        </div>
      </div>
    </div>
  </div>
);

// Layout that includes the sidebar
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="app-layout">
    <SidebarNav />
    <div className="main-content">{children}</div>
  </div>
);

const App: React.FC = () => (
  <AuthProvider>
    <StoreProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />

            {/* Protected — all authenticated users */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <AppLayout><Dashboard /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/prospectos" element={
              <ProtectedRoute>
                <AppLayout><Prospectos /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/prospectos/:id" element={
              <ProtectedRoute>
                <AppLayout><Expediente /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/aprobacion" element={
              <ProtectedRoute>
                <AppLayout><Aprobacion /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/aprobacion/:id" element={
              <ProtectedRoute>
                <AppLayout><Aprobacion /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/lotes" element={
              <ProtectedRoute>
                <AppLayout><Lotes /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <AppLayout><Settings /></AppLayout>
              </ProtectedRoute>
            } />

            {/* Modules */}
            <Route path="/modulos/ingesta" element={
              <ProtectedRoute>
                <AppLayout><ModuloPage num="I"   nombre="Ingesta & Validación" icon="📥" /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/modulos/ocr" element={
              <ProtectedRoute>
                <AppLayout><ModuloPage num="II"  nombre="OCR / IA"             icon="🔍" /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/modulos/llamadas" element={
              <ProtectedRoute>
                <AppLayout><ModuloPage num="III" nombre="Llamada Agente IA"    icon="📞" /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/modulos/expediente" element={
              <ProtectedRoute>
                <AppLayout><ModuloPage num="IV"  nombre="Recolección Docs"     icon="📁" /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/modulos/aprobacion" element={
              <ProtectedRoute>
                <AppLayout><ModuloPage num="V"   nombre="Formalización"        icon="🛡️" /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/modulos/despacho" element={
              <ProtectedRoute>
                <AppLayout><ModuloPage num="VI"  nombre="Despacho Final"       icon="🚀" /></AppLayout>
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </StoreProvider>
  </AuthProvider>
);

export default App;
