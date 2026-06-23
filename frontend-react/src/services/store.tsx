import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { mockStats, type Prospecto } from '../services/mockData';
import { DB_PROSPECTOS } from '../services/dbSeed';
import {
  USE_MOCK,
  getProspectos,
  getStats,
  crearProspecto,
  actualizarProspecto,
  eliminarProspecto,
  getNotas,
  crearNota,
  resolverNota,
  eliminarNota,
  getNotasUrgentes,
  checkBackendHealth,
  actualizarExpedienteCompleto,
} from '../services/api';

// ============================================================
// Nota type
// ============================================================

export type NotaTipo = 'documento' | 'llamada' | 'urgente' | 'general';

export interface Nota {
  id: number;
  prospectoId: number;
  texto: string;
  tipo: NotaTipo;
  resuelta: boolean;
  fechaCreacion: string;
  autor: string;
}

const NOTA_ICONS: Record<NotaTipo, string> = {
  documento: '📄',
  llamada:   '📞',
  urgente:   '🚨',
  general:   '💬',
};

export { NOTA_ICONS };

// ============================================================
// Store interface
// ============================================================

interface Store {
  prospectos: Prospecto[];
  stats: typeof mockStats;
  notas: Nota[];
  backendOnline: boolean;
  loading: boolean;
  addProspecto: (p: Omit<Prospecto, 'id' | 'fechaIngreso' | 'fechaUltimaActualizacion'>) => Promise<Prospecto>;
  updateEstatus: (id: number, estatus: Prospecto['estatus'], obs?: string) => Promise<void>;
  updateProspecto: (id: number, fields: Partial<Prospecto>) => Promise<void>;
  updateExpedienteCompleto: (id: number, data: any) => Promise<void>;
  deleteProspecto: (id: number) => Promise<void>;
  addNota: (prospectoId: number, nota: Omit<Nota, 'id' | 'fechaCreacion'>) => Promise<void>;
  resolveNota: (id: number) => Promise<void>;
  deleteNota: (id: number) => Promise<void>;
  getNotasByProspecto: (prospectoId: number) => Nota[];
  getUrgentNotas: () => Nota[];
  getAllNotas: () => Nota[];
  refreshProspectos: () => Promise<void>;
}

const StoreCtx = createContext<Store | null>(null);

export const useStore = () => {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be inside StoreProvider');
  return ctx;
};

// ============================================================
// localStorage helpers (solo para notas en modo mock)
// ============================================================

function loadNotasMock(): Nota[] {
  try {
    const raw = localStorage.getItem('crm_notas');
    if (raw) return JSON.parse(raw) as Nota[];
  } catch { /* noop */ }
  return [];
}

function saveNotasMock(notas: Nota[]) {
  localStorage.setItem('crm_notas', JSON.stringify(notas));
}

// Normaliza la respuesta del backend (snake_case → camelCase donde sea necesario)
function normalizarNota(n: any): Nota {
  return {
    id: n.id,
    prospectoId: n.prospecto?.id ?? n.prospectoId ?? 0,
    texto: n.texto,
    tipo: n.tipo as NotaTipo,
    resuelta: n.resuelta ?? false,
    fechaCreacion: n.fechaCreacion ?? new Date().toISOString(),
    autor: n.autor ?? 'Sistema',
  };
}

// ============================================================
// Provider
// ============================================================

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prospectos, setProspectos] = useState<Prospecto[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [backendOnline, setBackendOnline] = useState<boolean>(USE_MOCK);
  const [loading, setLoading] = useState<boolean>(true);
  const initialized = useRef(false);

  const computeStats = (ps: Prospecto[]) => ({
    total:        ps.length,
    viables:      ps.filter(p => p.estatus === 'VIABLE').length,
    en_proceso:   ps.filter(p => p.estatus === 'EN_PROCESO').length,
    formalizados: ps.filter(p => p.estatus === 'FORMALIZADO').length,
    rechazados:   ps.filter(p => p.estatus === 'RECHAZADO').length,
    validando:    ps.filter(p => p.estatus === 'VALIDANDO').length,
    nuevos:       ps.filter(p => p.estatus === 'NUEVO').length,
  });

  const [stats, setStats] = useState(computeStats([]));
  useEffect(() => { setStats(computeStats(prospectos)); }, [prospectos]);

  // ── Carga inicial ────────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      if (USE_MOCK) {
        // Modo mock: datos locales
        setProspectos(DB_PROSPECTOS as unknown as Prospecto[]);
        setNotas(loadNotasMock());
        setBackendOnline(false);
      } else {
        // Modo real: intentar el backend
        const online = await checkBackendHealth();
        setBackendOnline(online);

        if (online) {
          const [ps, notasUrgentes] = await Promise.all([
            getProspectos(),
            getNotasUrgentes(),
          ]);
          setProspectos(ps);
          setNotas(notasUrgentes.map(normalizarNota));
        } else {
          // Fallback a datos seed si el backend no responde
          console.warn('[CRM Store] Backend no disponible — usando datos seed locales');
          setProspectos(DB_PROSPECTOS as unknown as Prospecto[]);
          setNotas(loadNotasMock());
        }
      }
    } catch (err) {
      console.error('[CRM Store] Error cargando datos:', err);
      setProspectos(DB_PROSPECTOS as unknown as Prospecto[]);
      setNotas(loadNotasMock());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      cargarDatos();
    }
  }, [cargarDatos]);

  // Persist notas en mock
  useEffect(() => {
    if (USE_MOCK || !backendOnline) {
      saveNotasMock(notas);
    }
  }, [notas, backendOnline]);

  const refreshProspectos = useCallback(async () => {
    try {
      const ps = await getProspectos();
      setProspectos(ps);
    } catch {
      console.warn('[CRM Store] No se pudo refrescar prospectos');
    }
  }, []);

  // ── CRUD Prospectos ──────────────────────────────────────────

  const addProspecto = useCallback(async (
    data: Omit<Prospecto, 'id' | 'fechaIngreso' | 'fechaUltimaActualizacion'>
  ): Promise<Prospecto> => {
    const newP = await crearProspecto({
      nombreCompleto:   data.nombreCompleto,
      curp:             data.curp,
      nss:              data.nss,
      telefonoContacto: data.telefonoContacto,
      origenCanal:      data.origenCanal,
    });
    setProspectos(prev => [newP, ...prev]);
    return newP;
  }, []);

  const updateEstatus = useCallback(async (
    id: number,
    estatus: Prospecto['estatus'],
    obs?: string
  ) => {
    const fields: Partial<Prospecto> = { estatus };
    if (obs !== undefined) fields.observaciones = obs;

    await actualizarProspecto(id, fields);
    setProspectos(prev => prev.map(p =>
      p.id === id
        ? { ...p, estatus, ...(obs ? { observaciones: obs } : {}), fechaUltimaActualizacion: new Date().toISOString() }
        : p
    ));
  }, []);

  const updateProspecto = useCallback(async (id: number, fields: Partial<Prospecto>) => {
    await actualizarProspecto(id, fields);
    setProspectos(prev => prev.map(p =>
      p.id === id
        ? { ...p, ...fields, fechaUltimaActualizacion: new Date().toISOString() }
        : p
    ));
  }, []);

  const updateExpedienteCompleto = useCallback(async (id: number, data: any) => {
    await actualizarExpedienteCompleto(id, data);
    setProspectos(prev => prev.map(p => {
      if (p.id === id) {
        // Map backend keys to frontend state
        return {
          ...p,
          nombreCompleto: data.nombreCompleto ?? p.nombreCompleto,
          curp: data.curp ?? p.curp,
          nss: data.nss ?? p.nss,
          telefonoContacto: data.telefonoContacto ?? p.telefonoContacto,
          origenCanal: data.origenCanal ?? p.origenCanal,
          estatus: data.estatus ?? p.estatus,
          
          montoPensionActual: data.montoPensionActual ?? p.montoPensionActual,
          institucionBancaria: data.institucionBancaria ?? p.institucionBancaria,
          cuentaClabe: data.cuentaClabe ?? p.cuentaClabe,
          aumentoPension: data.aumentoPension ?? p.aumentoPension,
          retroactivoFicticio: data.retroactivoFicticio ?? (p as any).retroactivoFicticio,
          retroactivoFinal: data.retroactivoFinal ?? (p as any).retroactivoFinal,
          linkConstancia: data.linkConstancia ?? (p as any).linkConstancia,
          evidenciaTipo: data.evidenciaTipo ?? (p as any).evidenciaTipo,
          pagado: data.pagado ?? (p as any).pagado,
          estatusExpediente: data.estatusExpediente ?? p.estatusExpediente,
          nombreCarpetaDrive: data.nombreCarpetaDrive ?? p.nombreCarpetaDrive,
          correoElectronico: data.correoElectronico ?? p.correoElectronico,
          correoSipre: data.correoSipre ?? p.correoSipre,
          contactado: data.contactado ?? p.contactado,

          fechaUltimaActualizacion: new Date().toISOString()
        };
      }
      return p;
    }));
  }, []);

  const deleteProspecto = useCallback(async (id: number) => {
    await eliminarProspecto(id);
    setProspectos(prev => prev.filter(p => p.id !== id));
    setNotas(prev => prev.filter(n => n.prospectoId !== id));
  }, []);

  // ── CRUD Notas ───────────────────────────────────────────────

  const addNota = useCallback(async (
    prospectoId: number,
    nota: Omit<Nota, 'id' | 'fechaCreacion'>
  ) => {
    if (USE_MOCK || !backendOnline) {
      // Modo local
      const newNota: Nota = {
        ...nota,
        id: Date.now(),
        prospectoId,
        fechaCreacion: new Date().toISOString(),
      };
      setNotas(prev => [newNota, ...prev]);
      return;
    }

    const saved = await crearNota(prospectoId, {
      texto: nota.texto,
      tipo:  nota.tipo,
      autor: nota.autor,
    });
    setNotas(prev => [normalizarNota(saved), ...prev]);
  }, [backendOnline]);

  const resolveNota = useCallback(async (id: number) => {
    if (USE_MOCK || !backendOnline) {
      setNotas(prev => prev.map(n => n.id === id ? { ...n, resuelta: true } : n));
      return;
    }
    await resolverNota(id);
    setNotas(prev => prev.map(n => n.id === id ? { ...n, resuelta: true } : n));
  }, [backendOnline]);

  const deleteNota = useCallback(async (id: number) => {
    if (USE_MOCK || !backendOnline) {
      setNotas(prev => prev.filter(n => n.id !== id));
      return;
    }
    await eliminarNota(id);
    setNotas(prev => prev.filter(n => n.id !== id));
  }, [backendOnline]);

  // Carga notas de un prospecto específico desde el backend
  const loadNotasPorProspecto = useCallback(async (prospectoId: number) => {
    if (USE_MOCK || !backendOnline) return;
    try {
      const ns = await getNotas(prospectoId);
      const normalizadas = ns.map(normalizarNota);
      setNotas(prev => {
        const sinEste = prev.filter(n => n.prospectoId !== prospectoId);
        return [...normalizadas, ...sinEste];
      });
    } catch {
      console.warn('[CRM Store] No se pudieron cargar notas del prospecto', prospectoId);
    }
  }, [backendOnline]);

  const getNotasByProspecto = useCallback((prospectoId: number) => {
    const locales = notas.filter(n => n.prospectoId === prospectoId);
    // Si no hay locales y el backend está online, cargar en background
    if (locales.length === 0 && !USE_MOCK && backendOnline) {
      loadNotasPorProspecto(prospectoId);
    }
    return locales;
  }, [notas, backendOnline, loadNotasPorProspecto]);

  const getUrgentNotas = useCallback(() =>
    notas.filter(n => n.tipo === 'urgente' && !n.resuelta),
    [notas]);

  const getAllNotas = useCallback(() => [...notas], [notas]);

  return (
    <StoreCtx.Provider value={{
      prospectos, stats, notas, backendOnline, loading,
      addProspecto, updateEstatus, updateProspecto, updateExpedienteCompleto, deleteProspecto,
      addNota, resolveNota, deleteNota, getNotasByProspecto, getUrgentNotas, getAllNotas,
      refreshProspectos,
    }}>
      {children}
    </StoreCtx.Provider>
  );
};

// ============================================================
// Toast System
// ============================================================

interface Toast { id: number; msg: string; type: 'success' | 'error' | 'info'; }

const ToastCtx = createContext<{ addToast: (msg: string, type?: Toast['type']) => void } | null>(null);
export const useToast = () => useContext(ToastCtx)!;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((msg: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const icons = { success: '✓', error: '✕', info: 'ℹ' };

  return (
    <ToastCtx.Provider value={{ addToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type} fade-in`}>
            <span className="toast-icon">{icons[t.type]}</span>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
};
