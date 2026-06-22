import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, hasMinRole, type UserRole } from '../services/auth';

interface Props {
  children: React.ReactNode;
  minRol?: UserRole;
}

const ProtectedRoute: React.FC<Props> = ({ children, minRol }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (minRol && !hasMinRole(user.rol, minRol)) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div className="page-title">🔒 Acceso Restringido</div>
        </div>
        <div className="page-body">
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon">🚫</div>
              <div className="empty-title">No tienes permiso para ver esta página</div>
              <div className="empty-sub">
                Necesitas el rol de <strong>{minRol}</strong> o superior.<br />
                Tu rol actual es: <strong>{user.rol}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
