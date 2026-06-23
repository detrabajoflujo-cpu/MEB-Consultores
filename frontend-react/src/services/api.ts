import axios from 'axios';
import { mockProspectos, mockExpediente, mockStats, type Prospecto } from './mockData';

// ============================================================
// Configuración de conexión
// ============================================================
// En desarrollo local: usa el proxy de Vite o apunta directo al backend
// En producción: VITE_API_URL debe apuntar a tu dominio en la nube
// VITE_USE_MOCK=false activa el backend real
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// Interceptor para loguear errores y caer a mock si el backend no responde
client.interceptors.response.use(
  (res) => res,
  (error) => {
    console.warn('[CRM API] Error de red — verifica que el backend esté corriendo:', error.message);
    return Promise.reject(error);
  }
);

// ============================================================
// Prospectos — CRUD completo
// ============================================================

export async function getProspectos(): Promise<Prospecto[]> {
  if (USE_MOCK) return mockProspectos;
  const res = await client.get('/expedientes/prospectos');
  return res.data;
}

export async function getStats() {
  if (USE_MOCK) return mockStats;
  const res = await client.get('/expedientes/stats');
  return res.data;
}

export async function crearProspecto(data: {
  nombreCompleto: string;
  curp: string;
  nss: string;
  telefonoContacto: string;
  origenCanal?: string;
}): Promise<Prospecto> {
  if (USE_MOCK) {
    const mock: Prospecto = {
      id: Date.now(),
      curp: data.curp,
      nss: data.nss,
      nombreCompleto: data.nombreCompleto,
      telefonoContacto: data.telefonoContacto,
      origenCanal: data.origenCanal || 'CRM Manual',
      estatus: 'NUEVO',
      curpValida: data.curp.length === 18,
      nssValido: data.nss.length === 11,
      fechaIngreso: new Date().toISOString(),
      fechaUltimaActualizacion: new Date().toISOString(),
    };
    return mock;
  }
  const res = await client.post('/expedientes/prospectos', data);
  return res.data;
}

export async function actualizarProspecto(id: number, fields: Partial<Prospecto>): Promise<Prospecto> {
  if (USE_MOCK) return { ...mockProspectos[0], ...fields, id };
  const res = await client.put(`/expedientes/prospectos/${id}`, fields);
  return res.data;
}

export async function eliminarProspecto(id: number): Promise<void> {
  if (USE_MOCK) return;
  await client.delete(`/expedientes/prospectos/${id}`);
}

// ============================================================
// Expedientes
// ============================================================

export async function getExpediente(id: number) {
  if (USE_MOCK) return { ...mockExpediente, id };
  const res = await client.get(`/expedientes/${id}`);
  return res.data;
}

export async function getExpedientePorCurp(curp: string) {
  if (USE_MOCK) return mockExpediente;
  const res = await client.get(`/expedientes/curp/${curp}`);
  return res.data;
}

export async function aprobarExpediente(id: number, aprobadoPor: string) {
  if (USE_MOCK) {
    return { ...mockExpediente, aprobacionSuperior: true, aprobadoPor, estatusExpediente: 'APROBADO' };
  }
  const res = await client.post(`/expedientes/${id}/aprobar`, { aprobado_por: aprobadoPor });
  return res.data;
}

export async function inicializarDrive(id: number) {
  if (USE_MOCK) return { url_drive: 'https://drive.google.com/drive/folders/MOCK' };
  const res = await client.post(`/expedientes/${id}/inicializar-drive`);
  return res.data;
}

export async function actualizarExpedienteCompleto(id: number, data: any) {
  if (USE_MOCK) return data;
  // Strip fields not recognized by backend
  const { observaciones, ...cleanData } = data;
  try {
    const res = await client.put(`/expedientes/${id}/completo`, cleanData);
    return res.data;
  } catch (err: any) {
    console.error('[CRM API] Error guardando expediente:', err?.response?.status, err?.response?.data || err.message);
    throw err;
  }
}

// ============================================================
// Notas — CRUD completo
// ============================================================

export interface NotaApi {
  id: number;
  prospectoId?: number;
  prospecto?: { id: number };
  texto: string;
  tipo: 'documento' | 'llamada' | 'urgente' | 'general';
  resuelta: boolean;
  autor: string;
  fechaCreacion: string;
}

export async function getNotas(prospectoId: number): Promise<NotaApi[]> {
  if (USE_MOCK) return [];
  const res = await client.get(`/expedientes/notas/${prospectoId}`);
  return res.data;
}

export async function getNotasUrgentes(): Promise<NotaApi[]> {
  if (USE_MOCK) return [];
  const res = await client.get('/expedientes/notas/urgentes');
  return res.data;
}

export async function crearNota(prospectoId: number, nota: {
  texto: string;
  tipo: string;
  autor: string;
}): Promise<NotaApi> {
  if (USE_MOCK) {
    return {
      id: Date.now(),
      prospectoId,
      texto: nota.texto,
      tipo: nota.tipo as NotaApi['tipo'],
      resuelta: false,
      autor: nota.autor,
      fechaCreacion: new Date().toISOString(),
    };
  }
  const res = await client.post(`/expedientes/notas/${prospectoId}`, nota);
  return res.data;
}

export async function resolverNota(notaId: number): Promise<NotaApi> {
  if (USE_MOCK) return {} as NotaApi;
  const res = await client.put(`/expedientes/notas/${notaId}/resolver`);
  return res.data;
}

export async function eliminarNota(notaId: number): Promise<void> {
  if (USE_MOCK) return;
  await client.delete(`/expedientes/notas/${notaId}`);
}

// ============================================================
// Validación
// ============================================================

export async function validarDatos(datos: {
  curp?: string;
  nss?: string;
  clabe?: string;
  telefono?: string;
}) {
  if (USE_MOCK) {
    const curpOk = (datos.curp?.length || 0) === 18;
    const nssOk = (datos.nss?.length || 0) === 11;
    return {
      valido: curpOk && nssOk,
      curp_valida: curpOk,
      nss_valido: nssOk,
      clabe_valida: true,
      error: !curpOk ? 'CURP debe tener 18 caracteres. ' : !nssOk ? 'NSS debe tener 11 dígitos. ' : ''
    };
  }
  const res = await client.post('/webhook/validar', datos);
  return res.data;
}

// ============================================================
// Utilidad: detectar si el backend está disponible
// ============================================================

export async function checkBackendHealth(): Promise<boolean> {
  try {
    await client.get('/expedientes/stats', { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

export { USE_MOCK };
