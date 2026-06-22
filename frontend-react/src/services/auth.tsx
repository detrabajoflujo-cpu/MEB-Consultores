import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ============================================================
// Types
// ============================================================

export type UserRole = 'super_admin' | 'admin' | 'editor' | 'viewer';

export interface CRMUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  rol: UserRole;
  fechaAlta: string;
  passwordHash: string; // btoa encoded
}

export type ThemeMode = 'light' | 'dark' | 'auto';
export type AccentColor = 'purple' | 'blue' | 'green' | 'pink' | 'orange' | 'indigo';

export interface ThemePrefs {
  mode: ThemeMode;
  accent: AccentColor;
  highContrast: boolean;
  language: 'es' | 'en';
}

export interface NotifPrefs {
  newProspecto: boolean;
  urgentNotes: boolean;
  statusChange: boolean;
  webhookUrl: string;
  webhookSaldos: string;
  summaryFreq: 'daily' | 'weekly' | 'never';
}

export interface ServicesConfig {
  whatsapp: boolean;
  whatsappAiPrompt?: string;
  googleDrive: boolean;
  blandAi: boolean;
  openAi: boolean;
  openAiBalance?: number;
  openAiLimit?: number;
  blandAiBalance?: number;
  blandAiLimit?: number;
}

// ============================================================
// Constants
// ============================================================

const STORAGE_SESSION = 'crm_session';
const STORAGE_USERS   = 'crm_users';
const STORAGE_THEME   = 'crm_theme';
const STORAGE_NOTIF   = 'crm_notif';
const STORAGE_APIKEYS = 'crm_apikeys';
const STORAGE_SERVICES = 'crm_services';

const ROLE_LEVEL: Record<UserRole, number> = {
  super_admin: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Visualizador',
};

const DEFAULT_SUPER_ADMIN: CRMUser = {
  id: 'sa-001',
  email: 'admin@mebconsultores.net',
  name: 'Administrador',
  rol: 'super_admin',
  fechaAlta: '2026-01-01T00:00:00Z',
  passwordHash: btoa('Admin2026!'),
};

const DEFAULT_THEME: ThemePrefs = {
  mode: 'dark',
  accent: 'purple',
  highContrast: false,
  language: 'es',
};

const DEFAULT_NOTIF: NotifPrefs = {
  newProspecto: true,
  urgentNotes: true,
  statusChange: true,
  webhookUrl: '',
  webhookSaldos: '',
  summaryFreq: 'daily',
};

const DEFAULT_SERVICES: ServicesConfig = {
  whatsapp: false,
  whatsappAiPrompt: "Eres el asistente de Punto Clínico. REGLAS ESTRICTAS:\n1. Solo operamos de 08:00 a 19:00.\n2. Los documentos DEBEN enviarse escaneados por escáner. LAS FOTOS DE CELULAR SE RECHAZAN SIN EXCEPCIÓN.\n3. Solicitar foto biométrica (cliente sosteniendo INE a la altura del rostro).\n4. Solicitar video-convenio confirmando acuerdo.\nLimítate a seguir este guion y responder solo dudas del trámite en el sentido de la empresa.",
  googleDrive: false,
  blandAi: false,
  openAi: false,
  openAiBalance: 4.50,
  openAiLimit: 5.00,
  blandAiBalance: 1.25,
  blandAiLimit: 2.00,
};

// ============================================================
// Accent color map → CSS hue values
// ============================================================

export const ACCENT_MAP: Record<AccentColor, { h: number; s: number; l: number; name: string; hex: string }> = {
  purple:  { h: 262, s: 83, l: 58, name: 'Púrpura',  hex: '#7C3AED' },
  blue:    { h: 217, s: 91, l: 60, name: 'Azul',     hex: '#3B82F6' },
  green:   { h: 158, s: 64, l: 52, name: 'Verde',    hex: '#10B981' },
  pink:    { h: 330, s: 81, l: 60, name: 'Rosa',     hex: '#EC4899' },
  orange:  { h: 25,  s: 95, l: 53, name: 'Naranja',  hex: '#F97316' },
  indigo:  { h: 239, s: 84, l: 67, name: 'Índigo',   hex: '#818CF8' },
};

// ============================================================
// Helpers
// ============================================================

function loadUsers(): CRMUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_USERS);
    if (raw) return JSON.parse(raw) as CRMUser[];
  } catch { /* noop */ }
  const initial = [DEFAULT_SUPER_ADMIN];
  localStorage.setItem(STORAGE_USERS, JSON.stringify(initial));
  return initial;
}

function saveUsers(users: CRMUser[]) {
  localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
}

function loadSession(): CRMUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION);
    if (raw) return JSON.parse(raw) as CRMUser;
  } catch { /* noop */ }
  return null;
}

function loadTheme(): ThemePrefs {
  try {
    const raw = localStorage.getItem(STORAGE_THEME);
    if (raw) return { ...DEFAULT_THEME, ...JSON.parse(raw) };
  } catch { /* noop */ }
  return DEFAULT_THEME;
}

function loadNotif(): NotifPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_NOTIF);
    if (raw) return { ...DEFAULT_NOTIF, ...JSON.parse(raw) };
  } catch { /* noop */ }
  return DEFAULT_NOTIF;
}

function loadServices(): ServicesConfig {
  try {
    const raw = localStorage.getItem(STORAGE_SERVICES);
    if (raw) return { ...DEFAULT_SERVICES, ...JSON.parse(raw) };
  } catch { /* noop */ }
  return DEFAULT_SERVICES;
}

export function applyTheme(prefs: ThemePrefs) {
  const root = document.documentElement;
  // Resolve mode
  let isDark = prefs.mode === 'dark';
  if (prefs.mode === 'auto') isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');

  // Accent
  const acc = ACCENT_MAP[prefs.accent];
  root.style.setProperty('--accent-h', String(acc.h));
  root.style.setProperty('--accent-s', `${acc.s}%`);
  root.style.setProperty('--accent-l', `${acc.l}%`);
  root.style.setProperty('--accent', acc.hex);

  // Contrast
  root.setAttribute('data-contrast', prefs.highContrast ? 'high' : 'normal');
}

export function hasMinRole(userRole: UserRole, minRole: UserRole): boolean {
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[minRole];
}

// ============================================================
// Context
// ============================================================

interface AuthCtxType {
  user: CRMUser | null;
  users: CRMUser[];
  theme: ThemePrefs;
  notif: NotifPrefs;
  servicesConfig: ServicesConfig;
  apiKeys: string[];
  login: (email: string, password: string) => boolean;
  logout: () => void;
  addUser: (data: { email: string; name: string; password: string; rol: UserRole }) => boolean;
  removeUser: (id: string) => void;
  updateProfile: (fields: Partial<Pick<CRMUser, 'name' | 'email' | 'avatar'>>) => void;
  changePassword: (current: string, next: string) => boolean;
  updateTheme: (prefs: Partial<ThemePrefs>) => void;
  updateNotif: (prefs: Partial<NotifPrefs>) => void;
  updateServicesConfig: (prefs: Partial<ServicesConfig>) => void;
  generateApiKey: () => string;
  revokeApiKey: (key: string) => void;
  clearAllSessions: () => void;
}

const AuthCtx = createContext<AuthCtxType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CRMUser | null>(loadSession);
  const [users, setUsers] = useState<CRMUser[]>(loadUsers);
  const [theme, setThemeState] = useState<ThemePrefs>(loadTheme);
  const [notif, setNotifState] = useState<NotifPrefs>(loadNotif);
  const [servicesConfig, setServicesConfigState] = useState<ServicesConfig>(loadServices);
  const [apiKeys, setApiKeys] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_APIKEYS) || '[]'); }
    catch { return []; }
  });

  // Apply theme on mount and changes
  useEffect(() => { applyTheme(theme); }, [theme]);

  const login = useCallback((email: string, password: string): boolean => {
    const all = loadUsers();
    const found = all.find(u => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === btoa(password));
    if (!found) return false;
    setUser(found);
    localStorage.setItem(STORAGE_SESSION, JSON.stringify(found));
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_SESSION);
  }, []);

  const addUser = useCallback((data: { email: string; name: string; password: string; rol: UserRole }): boolean => {
    const all = loadUsers();
    if (all.find(u => u.email.toLowerCase() === data.email.toLowerCase())) return false;
    const newUser: CRMUser = {
      id: `u-${Date.now()}`,
      email: data.email,
      name: data.name,
      rol: data.rol,
      fechaAlta: new Date().toISOString(),
      passwordHash: btoa(data.password),
    };
    const updated = [...all, newUser];
    saveUsers(updated);
    setUsers(updated);
    return true;
  }, []);

  const removeUser = useCallback((id: string) => {
    if (id === 'sa-001') return; // can't delete original super admin
    const updated = loadUsers().filter(u => u.id !== id);
    saveUsers(updated);
    setUsers(updated);
  }, []);

  const updateProfile = useCallback((fields: Partial<Pick<CRMUser, 'name' | 'email' | 'avatar'>>) => {
    if (!user) return;
    const all = loadUsers();
    const updated = all.map(u => u.id === user.id ? { ...u, ...fields } : u);
    saveUsers(updated);
    setUsers(updated);
    const newUser = { ...user, ...fields };
    setUser(newUser);
    localStorage.setItem(STORAGE_SESSION, JSON.stringify(newUser));
  }, [user]);

  const changePassword = useCallback((current: string, next: string): boolean => {
    if (!user) return false;
    if (user.passwordHash !== btoa(current)) return false;
    const all = loadUsers();
    const updated = all.map(u => u.id === user.id ? { ...u, passwordHash: btoa(next) } : u);
    saveUsers(updated);
    setUsers(updated);
    const newUser = { ...user, passwordHash: btoa(next) };
    setUser(newUser);
    localStorage.setItem(STORAGE_SESSION, JSON.stringify(newUser));
    return true;
  }, [user]);

  const updateTheme = useCallback((prefs: Partial<ThemePrefs>) => {
    setThemeState(prev => {
      const next = { ...prev, ...prefs };
      localStorage.setItem(STORAGE_THEME, JSON.stringify(next));
      applyTheme(next);
      return next;
    });
  }, []);

  const updateNotif = useCallback((prefs: Partial<NotifPrefs>) => {
    setNotifState(prev => {
      const next = { ...prev, ...prefs };
      localStorage.setItem(STORAGE_NOTIF, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateServicesConfig = useCallback((prefs: Partial<ServicesConfig>) => {
    setServicesConfigState(prev => {
      const next = { ...prev, ...prefs };
      localStorage.setItem(STORAGE_SERVICES, JSON.stringify(next));
      return next;
    });
  }, []);

  const generateApiKey = useCallback((): string => {
    const key = `crm_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
    setApiKeys(prev => {
      const updated = [...prev, key];
      localStorage.setItem(STORAGE_APIKEYS, JSON.stringify(updated));
      return updated;
    });
    return key;
  }, []);

  const revokeApiKey = useCallback((key: string) => {
    setApiKeys(prev => {
      const updated = prev.filter(k => k !== key);
      localStorage.setItem(STORAGE_APIKEYS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearAllSessions = useCallback(() => {
    logout();
  }, [logout]);

  return (
    <AuthCtx.Provider value={{
      user, users, theme, notif, servicesConfig, apiKeys,
      login, logout, addUser, removeUser,
      updateProfile, changePassword,
      updateTheme, updateNotif, updateServicesConfig,
      generateApiKey, revokeApiKey, clearAllSessions,
    }}>
      {children}
    </AuthCtx.Provider>
  );
};
