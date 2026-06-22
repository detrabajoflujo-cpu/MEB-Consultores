import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Prospecto {
  id: number;
  curp: string;
  nss: string;
  nombreCompleto: string;
  telefonoContacto: string;
  origenCanal: string;
  estatus: string;
  curpValida: boolean;
  nssValido: boolean;
  fechaIngreso: string;
}

interface TablaProspectosProps {
  prospectos: Prospecto[];
  loading?: boolean;
}

const estatusBadge: Record<string, { cls: string; label: string }> = {
  NUEVO:       { cls: 'badge-gray',   label: '🆕 Nuevo' },
  VALIDANDO:   { cls: 'badge-yellow', label: '⏳ Validando' },
  VIABLE:      { cls: 'badge-green',  label: '✅ Viable' },
  EN_PROCESO:  { cls: 'badge-blue',   label: '🔄 En Proceso' },
  FORMALIZADO: { cls: 'badge-purple', label: '🎉 Formalizado' },
  RECHAZADO:   { cls: 'badge-red',    label: '❌ Rechazado' },
  NO_VIABLE:   { cls: 'badge-red',    label: '🚫 No Viable' },
};

const TablaProspectos: React.FC<TablaProspectosProps> = ({ prospectos, loading = false }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');

  const filtrados = prospectos.filter((p) => {
    const matchSearch =
      !search ||
      p.nombreCompleto.toLowerCase().includes(search.toLowerCase()) ||
      p.curp.toLowerCase().includes(search.toLowerCase()) ||
      p.nss.includes(search) ||
      p.telefonoContacto.includes(search);
    const matchEstatus = !filtroEstatus || p.estatus === filtroEstatus;
    return matchSearch && matchEstatus;
  });

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch { return dateStr; }
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="flex flex-col items-center gap-3">
          <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
          <span className="text-secondary text-sm">Cargando prospectos...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            id="search-prospectos"
            className="search-input"
            placeholder="Buscar por nombre, CURP, NSS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          id="filtro-estatus"
          className="input-field"
          style={{ width: 'auto', minWidth: 160, padding: '8px 12px' }}
          value={filtroEstatus}
          onChange={(e) => setFiltroEstatus(e.target.value)}
        >
          <option value="">Todos los estatus</option>
          <option value="NUEVO">Nuevo</option>
          <option value="VALIDANDO">Validando</option>
          <option value="VIABLE">Viable</option>
          <option value="EN_PROCESO">En Proceso</option>
          <option value="FORMALIZADO">Formalizado</option>
          <option value="RECHAZADO">Rechazado</option>
        </select>

        <span className="text-muted text-sm" style={{ marginLeft: 4 }}>
          {filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tabla */}
      {filtrados.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔎</div>
          <div className="empty-state-title">Sin resultados</div>
          <p>No se encontraron prospectos con los filtros actuales.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Prospecto</th>
                <th>CURP</th>
                <th>NSS</th>
                <th>Teléfono</th>
                <th>Canal</th>
                <th>Validación</th>
                <th>Estatus</th>
                <th>Fecha Ingreso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => {
                const badge = estatusBadge[p.estatus] || { cls: 'badge-gray', label: p.estatus };
                return (
                  <tr key={p.id} onClick={() => navigate(`/prospectos/${p.id}`)}>
                    <td className="muted font-mono">#{p.id}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.nombreCompleto}</div>
                    </td>
                    <td>
                      <span className="font-mono text-sm">{p.curp}</span>
                    </td>
                    <td>
                      <span className="font-mono text-sm">{p.nss}</span>
                    </td>
                    <td className="muted">{p.telefonoContacto}</td>
                    <td>
                      <span className="badge badge-gray" style={{ fontSize: 11 }}>
                        {p.origenCanal}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2" style={{ gap: 4 }}>
                        <span className={`badge ${p.curpValida ? 'badge-green' : 'badge-red'}`}
                          style={{ fontSize: 10 }}>
                          {p.curpValida ? '✅ CURP' : '❌ CURP'}
                        </span>
                        <span className={`badge ${p.nssValido ? 'badge-green' : 'badge-red'}`}
                          style={{ fontSize: 10 }}>
                          {p.nssValido ? '✅ NSS' : '❌ NSS'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {formatDate(p.fechaIngreso)}
                    </td>
                    <td>
                      <button
                        id={`btn-ver-${p.id}`}
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => { e.stopPropagation(); navigate(`/prospectos/${p.id}`); }}
                      >
                        Ver →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TablaProspectos;
