import { User } from '@/types';

interface SessionData {
  user: User;
  apiToken: string;
  expiresAt: number;
  lastActivity: number;
}

const DEFAULT_SESSION_MS = 30 * 60 * 1000;
const TUTOR_SESSION_MS = 15 * 60 * 1000;
const PARENT_SESSION_MS = 15 * 60 * 1000;

/**
 * Servicio de gestión de sesiones con expiración por inactividad
 */
export const sessionService = {
  SESSION_DURATION: DEFAULT_SESSION_MS,
  TUTOR_SESSION_DURATION: TUTOR_SESSION_MS,
  PARENT_SESSION_DURATION: PARENT_SESSION_MS,
  /** Tiempo sin interacción antes de ocultar el perfil del alumno en el escáner */
  TUTOR_PROFILE_IDLE_MS: 45 * 1000,
  REFRESH_INTERVAL: 60 * 1000,
  STORAGE_KEY: 'session',

  getIdleDurationMs(role?: User['role']): number {
    if (role === 'Tutor') return TUTOR_SESSION_MS;
    if (role === 'Padre') return PARENT_SESSION_MS;
    return DEFAULT_SESSION_MS;
  },

  /**
   * Guardar sesión con token de API (validado en servidor)
   */
  saveSession(user: User, apiToken: string, expiresInMs?: number): void {
    const now = Date.now();
    const duration = expiresInMs ?? this.getIdleDurationMs(user.role);
    const sessionData: SessionData = {
      user,
      apiToken,
      expiresAt: now + duration,
      lastActivity: now,
    };
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionData));
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('userId', user.id.toString());
    } catch (error) {
      console.error('Error al guardar sesión:', error);
    }
  },

  getApiToken(): string | null {
    const session = this.readSessionRaw();
    if (!session?.apiToken) return null;
    if (Date.now() > session.expiresAt) {
      this.clearSession();
      return null;
    }
    return session.apiToken;
  },

  readSessionRaw(): SessionData | null {
    try {
      const sessionStr = localStorage.getItem(this.STORAGE_KEY);
      if (!sessionStr) return null;
      const parsed = JSON.parse(sessionStr) as SessionData;
      if (!parsed.apiToken) {
        this.clearSession();
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  },

  /**
   * Obtener sesión actual (si no está expirada)
   */
  getSession(): SessionData | null {
    const session = this.readSessionRaw();
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      this.clearSession();
      return null;
    }

    return session;
  },

  /**
   * Reinicia el temporizador de inactividad (solo ante actividad real del usuario)
   */
  touchActivity(): void {
    const session = this.readSessionRaw();
    if (!session) return;

    if (Date.now() > session.expiresAt) {
      this.clearSession();
      return;
    }

    const now = Date.now();
    const duration = this.getIdleDurationMs(session.user.role);
    session.lastActivity = now;
    session.expiresAt = now + duration;

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Error al actualizar actividad:', error);
    }
  },

  /** @deprecated Usar touchActivity */
  updateActivity(): void {
    this.touchActivity();
  },

  clearSession(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
    } catch (error) {
      console.error('Error al limpiar sesión:', error);
    }
  },

  isExpired(): boolean {
    const session = this.readSessionRaw();
    return !session || Date.now() > session.expiresAt;
  },

  getTimeRemaining(): number {
    const session = this.readSessionRaw();
    if (!session) return 0;
    const remaining = session.expiresAt - Date.now();
    return Math.max(0, Math.floor(remaining / 60000));
  },

  extendSession(): void {
    this.touchActivity();
  },
};
