import React, { useState, useMemo } from 'react';
import { DB_LOTES_HISTORICOS } from '../services/lotesSeed';

// ─── Types ────────────────────────────────────────────────────
interface LoteRecord {
  nombre_completo: string;
  curp: string;
  nss: string | null;
  banco: string | null;
  clabe_interbancaria: string | null;
  monto_pension: number | null;
  numero_telefono: string | null;
  estatus_original: string | null;
  sipre: string | null;
  capacidad_real: number | null;
  origen_archivo: string;
}

// ─── Static data parsed from the CSVs we already imported ─────
// In a real API integration, this would be fetched from /api/lotes
const ALL_LOTES: LoteRecord[] = DB_LOTES_HISTORICOS as unknown as LoteRecord[];

const fmt$ = (n: number | null) =>
  n != null ? `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—';

const Lotes: React.FC = () => {
  const [search, setSearch] = useState('');
  const [tabFile, setTabFile] = useState<'LOTE_C' | 'BASE_CAPTURA'>('LOTE_C');

  const records = useMemo(() => {
    const src = ALL_LOTES; // Both tabs use the same filtered data by origen_archivo
    if (!search.trim()) return src;
    const q = search.toLowerCase();
    return src.filter(r =>
      r.nombre_completo.toLowerCase().includes(q) ||
      (r.curp || '').toLowerCase().includes(q) ||
      (r.nss || '').includes(q) ||
      (r.numero_telefono || '').includes(q)
    );
  }, [search, tabFile]);

  const viables = ALL_LOTES.filter(r => r.estatus_original?.toUpperCase() === 'VIABLE').length;
  const domiciliados = ALL_LOTES.filter(r => r.estatus_original?.toUpperCase() === 'DOMICILIADO').length;
  const conSipre = ALL_LOTES.filter(r => r.sipre && !['utilizado','sin monto','no'].includes(r.sipre.toLowerCase())).length;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">📋 Lotes Históricos</div>
          <div className="page-sub">Base de datos histórica — LOTE C 120526 y Base de Captura</div>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid mb-4">
          <div className="stat-card">
            <div className="stat-value">{ALL_LOTES.length}</div>
            <div className="stat-label">Registros LOTE C</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--green)' }}>{viables}</div>
            <div className="stat-label">Viables</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--accent)' }}>{domiciliados}</div>
            <div className="stat-label">Domiciliados</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--purple)' }}>{conSipre}</div>
            <div className="stat-label">Con SIPRE asignado</div>
          </div>
        </div>

        {/* Tabs por archivo */}
        <div className="tabs mb-4">
          <button className={`tab ${tabFile === 'LOTE_C' ? 'active' : ''}`} onClick={() => setTabFile('LOTE_C')}>
            LOTE C 120526
          </button>
          <button className={`tab ${tabFile === 'BASE_CAPTURA' ? 'active' : ''}`} onClick={() => setTabFile('BASE_CAPTURA')}>
            Base de Captura (429 registros en BD)
          </button>
        </div>

        {tabFile === 'BASE_CAPTURA' ? (
          <div className="card">
            <div className="card-body">
              <div className="alert alert-info">
                <span>ℹ</span>
                <span>
                  Los <strong>429 registros</strong> de la Base de Captura están importados en la base de datos PostgreSQL 
                  con Nombre, CURP, NSS y Teléfono. Esta base es solo de datos puros sin enriquecimiento financiero.
                  Para consultarlos individualmente, usa el buscador de Prospectos o exporta desde el menú.
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginTop: 16 }}>
                {[
                  { label: 'Lote 1 (28/04/26)', count: 61 },
                  { label: 'Lote 2', count: 69 },
                  { label: 'Lote 3 (09/05/26)', count: 70 },
                  { label: 'Lote 4 (11/05/26)', count: 60 },
                  { label: 'Lote 5 (12/05/26)', count: 25 },
                  { label: 'Lote 6 (12/05/26)', count: 144 },
                ].map(l => (
                  <div key={l.label} className="card" style={{ background: 'var(--bg-elevated)' }}>
                    <div className="card-body" style={{ textAlign: 'center', padding: 20 }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>{l.count}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{l.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">LOTE C 120526</div>
                <div className="card-sub">{records.length} registros con datos financieros completos</div>
              </div>
              <input
                className="input"
                style={{ width: 260 }}
                placeholder="Buscar por nombre, CURP o NSS…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                    {['Nombre', 'CURP', 'NSS', 'Banco', 'Pensión', 'Teléfono', 'Estatus', 'Capacidad Real'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-elevated)' }}>
                      <td style={{ padding: '9px 12px', color: 'var(--text-1)', fontWeight: 500, whiteSpace: 'nowrap' }}>{r.nombre_completo}</td>
                      <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-2)' }}>{r.curp}</td>
                      <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-2)' }}>{r.nss || '—'}</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text-2)' }}>{r.banco || '—'}</td>
                      <td style={{ padding: '9px 12px', color: 'var(--green)', fontWeight: 600 }}>{fmt$(r.monto_pension)}</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text-2)' }}>{r.numero_telefono || '—'}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <span className={`badge ${r.estatus_original?.toUpperCase() === 'VIABLE' ? 'badge-green' : r.estatus_original?.toUpperCase() === 'DOMICILIADO' ? 'badge-purple' : 'badge-gray'}`}>
                          {r.estatus_original || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '9px 12px', color: r.capacidad_real ? 'var(--accent)' : 'var(--text-3)', fontWeight: r.capacidad_real ? 700 : 400 }}>
                        {fmt$(r.capacidad_real)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Lotes;
