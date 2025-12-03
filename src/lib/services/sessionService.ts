import { User } from '@/types';

interface SessionData {
  user: User;
  expiresAt: number;
  lastActivity: number;
}

/**
 * Servicio de gestión de sesiones con expiración automática
 */
export const sessionService = {
  SESSION_DURATION: 30 * 60 * 1000, // 30 minutos
  REFRESH_INTERVAL: 5 * 60 * 1000, // Verificar cada 5 minutos
  STORAGE_KEY: 'session',
  
  /**
   * Guardar sesión con expiración
   */
  saveSession(user: User): void {
    const sessionData: SessionData = {
      user,
      expiresAt: Date.now() + this.SESSION_DURATION,
      lastActivity: Date.now()
    };
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionData));
      // También mantener compatibilidad con el sistema anterior
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('userId', user.id.toString());
    } catch (error) {
      console.error('Error al guardar sesión:', error);
    }
  },
  
  /**
   * Obtener sesión actual (si no está expirada)
   */
  getSession(): SessionData | null {
    try {
      const sessionStr = localStorage.getItem(this.STORAGE_KEY);
      if (!sessionStr) return null;
      
      const session: SessionData = JSON.parse(sessionStr);
      
      // Verificar si la sesión expiró
      if (Date.now() > session.expiresAt) {
        this.clearSession();
        return null;
      }
      
      return session;
    } catch (error) {
      console.error('Error al obtener sesión:', error);
      this.clearSession();
      return null;
    }
  },
  
  /**
   * Actualizar última actividad
   */
  updateActivity(): void {
    const session = this.getSession();
    if (session) {
      session.lastActivity = Date.now();
      // Extender expiración si hay actividad reciente
      if (Date.now() - session.lastActivity < 5 * 60 * 1000) {
        session.expiresAt = Date.now() + this.SESSION_DURATION;
      }
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
      } catch (error) {
        console.error('Error al actualizar actividad:', error);
      }
    }
  },
  
  /**
   * Limpiar sesión
   */
  clearSession(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
    } catch (error) {
      console.error('Error al limpiar sesión:', error);
    }
  },
  
  /**
   * Verificar si la sesión está expirada
   */
  isExpired(): boolean {
    const session = this.getSession();
    return !session || Date.now() > session.expiresAt;
  },
  
  /**
   * Obtener tiempo restante de sesión en minutos
   */
  getTimeRemaining(): number {
    const session = this.getSession();
    if (!session) return 0;
    const remaining = session.expiresAt - Date.now();
    return Math.max(0, Math.floor(remaining / 60000));
  },
  
  /**
   * Extender sesión
   */
  extendSession(): void {
    const session = this.getSession();
    if (session) {
      session.expiresAt = Date.now() + this.SESSION_DURATION;
      session.lastActivity = Date.now();
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
      } catch (error) {
        console.error('Error al extender sesión:', error);
      }
    }
  }
};

