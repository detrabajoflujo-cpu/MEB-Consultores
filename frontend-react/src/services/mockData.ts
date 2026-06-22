// ============================================================
// MOCK DATA — datos demo funcionales
// ============================================================

export interface Prospecto {
  id: number;
  curp: string;
  nss: string;
  nombreCompleto: string;
  telefonoContacto: string;
  origenCanal: string;
  estatus: 'NUEVO' | 'VALIDANDO' | 'VIABLE' | 'EN_PROCESO' | 'FORMALIZADO' | 'RECHAZADO' | 'NO_VIABLE';
  curpValida: boolean;
  nssValido: boolean;
  fechaIngreso: string;
  fechaUltimaActualizacion: string;
  observaciones?: string;
  // Campos extendidos del CSV
  correoElectronico?: string | null;
  correoSipre?: string | null;
  contactado?: boolean;
  comentarios?: string | null;
  montoPensionActual?: number | null;
  aumentoPension?: number | null;
  institucionBancaria?: string | null;
  cuentaClabe?: string | null;
  nombreCarpetaDrive?: string | null;
  urlCarpetaDrive?: string | null;
  estatusExpediente?: string;
  aprobacionSuperior?: boolean;
  aprobadoPor?: string | null;
  ineAmbosLados?: string;
  comprobanteDomicilio?: string;
  resolucionPension?: string;
  estadosCuenta?: string;
  resumenMovimientos?: string;
  fotoConIne?: string;
  retroactivoFicticio?: number | null;
  retroactivoFinal?: number | null;
  pagado?: boolean;
  linkConstancia?: string | null;
  perfilFinanciero?: 'NOMINA' | 'DOMICILIADO' | 'NO_APTO' | null;
}

export interface Expediente {
  id: number;
  prospecto: Prospecto;
  montoPensionActual: number | null;
  aumentoPension: number | null;
  institucionBancaria: string | null;
  cuentaClabe: string | null;
  nombreCarpetaDrive: string | null;
  urlCarpetaDrive: string | null;
  estatusExpediente: 'PENDIENTE' | 'EN_REVISION' | 'APROBADO' | 'RECHAZADO' | 'DESPACHADO';
  aprobacionSuperior: boolean;
  aprobadoPor: string | null;
  evidenciaTipo: 'Videoconvenio' | 'Contrato' | null;
  ineAmbosLados: string;
  comprobanteDomicilio: string;
  resolucionPension: string;
  estadosCuenta: string;
  resumenMovimientos: string;
  fotoConIne: string;
  
  // Nuevos campos del Excel
  contactado: boolean;
  correoElectronico: string | null;
  retroactivoFicticio: number | null;
  retroactivoFinal: number | null;
  linkConstancia: string | null;
  correoSipre: string | null;
  pagado: boolean;
  perfilFinanciero: 'NOMINA' | 'DOMICILIADO' | 'NO_APTO' | null;
}

export const mockProspectos: Prospecto[] = [
  {
    id: 1,
    curp: 'PALR850312MDFLN01',
    nss: '12345678901',
    nombreCompleto: 'Fernanda Palacios Ríos',
    telefonoContacto: '+527771234567',
    origenCanal: 'Meta Ads',
    estatus: 'VIABLE',
    curpValida: true,
    nssValido: true,
    fechaIngreso: '2026-05-19T08:32:00Z',
    fechaUltimaActualizacion: '2026-05-19T14:10:00Z',
  },
  {
    id: 2,
    curp: 'GOME920510HDFLRR05',
    nss: '98765432109',
    nombreCompleto: 'Ernesto Gómez Ramos',
    telefonoContacto: '+527772345678',
    origenCanal: 'WhatsApp Directo',
    estatus: 'EN_PROCESO',
    curpValida: true,
    nssValido: true,
    fechaIngreso: '2026-05-18T11:15:00Z',
    fechaUltimaActualizacion: '2026-05-19T09:00:00Z',
    observaciones: 'Pendiente estado de cuenta mes anterior',
  },
  {
    id: 3,
    curp: 'MART780101MDFNRL09',
    nss: '11223344556',
    nombreCompleto: 'Rosa Martínez Luna',
    telefonoContacto: '+527773456789',
    origenCanal: 'Meta Ads',
    estatus: 'FORMALIZADO',
    curpValida: true,
    nssValido: true,
    fechaIngreso: '2026-05-17T09:00:00Z',
    fechaUltimaActualizacion: '2026-05-18T16:30:00Z',
  },
  {
    id: 4,
    curp: 'LOPE010203HDFPPR01',
    nss: '33445566778',
    nombreCompleto: 'Alejandro López Pérez',
    telefonoContacto: '+527774567890',
    origenCanal: 'Meta Ads',
    estatus: 'VALIDANDO',
    curpValida: true,
    nssValido: false,
    fechaIngreso: '2026-05-20T07:45:00Z',
    fechaUltimaActualizacion: '2026-05-20T07:45:00Z',
    observaciones: 'NSS no válido — solicitando corrección',
  },
  {
    id: 5,
    curp: 'SANC650812MDFNRL04',
    nss: '55667788990',
    nombreCompleto: 'Carmen Sánchez Cruz',
    telefonoContacto: '+527775678901',
    origenCanal: 'Referido',
    estatus: 'NUEVO',
    curpValida: false,
    nssValido: true,
    fechaIngreso: '2026-05-20T08:10:00Z',
    fechaUltimaActualizacion: '2026-05-20T08:10:00Z',
  },
  {
    id: 6,
    curp: 'HDZE891230HDFRNR07',
    nss: '66778899001',
    nombreCompleto: 'Jaime Hernández Zarate',
    telefonoContacto: '+527776789012',
    origenCanal: 'Meta Ads',
    estatus: 'RECHAZADO',
    curpValida: true,
    nssValido: true,
    fechaIngreso: '2026-05-16T14:20:00Z',
    fechaUltimaActualizacion: '2026-05-17T10:00:00Z',
    observaciones: 'Pensión inferior al mínimo requerido',
  },
];

export const mockExpediente: Expediente = {
  id: 1,
  prospecto: mockProspectos[0],
  montoPensionActual: 4850.00,
  aumentoPension: 10636.54,
  institucionBancaria: 'BBVA',
  cuentaClabe: '012345678901234567',
  nombreCarpetaDrive: 'FERNANDA PALACIOS RIOS PALR850312MDFLN01 12345678901',
  urlCarpetaDrive: 'https://drive.google.com/drive/folders/MOCK_DEMO',
  estatusExpediente: 'EN_REVISION',
  aprobacionSuperior: false,
  aprobadoPor: null,
  evidenciaTipo: 'Videoconvenio',
  ineAmbosLados: 'APROBADO',
  comprobanteDomicilio: 'APROBADO',
  resolucionPension: 'APROBADO',
  estadosCuenta: 'PENDIENTE',
  resumenMovimientos: 'PENDIENTE',
  fotoConIne: 'APROBADO',
  contactado: true,
  correoElectronico: 'f.palacios@ejemplo.com',
  retroactivoFicticio: 24000.00,
  retroactivoFinal: 21000.00,
  linkConstancia: 'https://drive.google.com/drive/folders/MOCK_CONSTANCIA',
  correoSipre: 'sipre.fernanda@ejemplo.com',
  pagado: false,
  perfilFinanciero: 'DOMICILIADO',
};

export const mockStats = {
  total: 6,
  viables: 1,
  en_proceso: 1,
  formalizados: 1,
  rechazados: 1,
  validando: 1,
  nuevos: 1,
};

export const mockPayloadFinal = {
  prospecto_identificacion: {
    origen: 'Meta Ads / WhatsApp Business',
    nombre_completo: 'FERNANDA PALACIOS RIOS',
    telefono: '+527771234567',
    curp: 'PALR850312MDFLN01',
    nss: '12345678901',
  },
  calificacion_financiera: {
    monto_pension: 4850.00,
    banco: 'BBVA',
    retenciones: true,
    perfil: 'DOMICILIADO',
    banco_autorizado: true,
  },
  operacion: {
    base_actual: 'Base Domiciliado enriquecida',
    asesor_propietario: 'ID_ASESOR_1',
    estado: 'EMPAQUETADO',
    contador_seguimiento: 0,
  },
  auditoria_documental: {
    ine: 'Aprobado',
    cfe: 'Aprobado',
    resolucion_imss: 'Aprobado',
    estados_cuenta_2_meses: 'Aprobado',
    resumen_movimientos_60_dias: 'Pendiente',
    match_identidad: true,
    incidencias: [],
  },
  cierre: {
    url_drive: 'https://drive.google.com/drive/folders/MOCK_DEMO',
    dictamen_financiero: 'Pendiente',
    foto_biometrica_final: 'Pendiente',
    honorarios_cobrados: false,
  }
};
