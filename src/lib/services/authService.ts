import { supabase } from '../supabaseClient';
import { User, UsuarioDB } from '@/types';
import { sessionService } from './sessionService';
import { loginRateLimiter } from '@/lib/utils/rateLimit';
import { sanitize } from '@/lib/utils/sanitize';

/**
 * Servicio de autenticación
 */
export const authService = {
  /**
   * Iniciar sesión con username y password
   */
  async login(username: string, password: string): Promise<{ user: User | null; error: string | null }> {
    try {
      // Sanitizar inputs
      const sanitizedUsername = sanitize.text(username, 50).trim();
      const sanitizedPassword = password.trim();
      
      if (!sanitizedUsername || !sanitizedPassword) {
        return { user: null, error: 'Usuario y contraseña son requeridos' };
      }
      
      // Rate limiting
      const clientKey = `login_${sanitizedUsername}_${window.location.hostname}`;
      if (!loginRateLimiter.check(clientKey)) {
        const timeRemaining = Math.ceil(loginRateLimiter.getTimeUntilReset(clientKey) / 60000);
        return { 
          user: null, 
          error: `Demasiados intentos fallidos. Intente nuevamente en ${timeRemaining} minuto(s).` 
        };
      }
      
      // Buscar usuario por username
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('username', sanitizedUsername)
        .eq('activo', true)
        .maybeSingle();

      if (usuarioError || !usuarioData) {
        return { user: null, error: 'Usuario o contraseña incorrectos' };
      }

      // TODO: Validar password_hash con bcrypt
      // Por ahora, asumimos que la validación se hace en el backend
      // En producción, esto debe hacerse mediante una función de Supabase o Edge Function

      // Verificar si el usuario está bloqueado
      if (usuarioData.bloqueado_hasta && new Date(usuarioData.bloqueado_hasta) > new Date()) {
        return { 
          user: null, 
          error: `Usuario bloqueado hasta ${new Date(usuarioData.bloqueado_hasta).toLocaleString()}` 
        };
      }

      // Verificar intentos fallidos (si hay más de 5, bloquear)
      if (usuarioData.intentos_fallidos >= 5) {
        // Actualizar bloqueo hasta 1 hora después
        const bloqueadoHasta = new Date();
        bloqueadoHasta.setHours(bloqueadoHasta.getHours() + 1);
        
        await supabase
          .from('usuarios')
          .update({ bloqueado_hasta: bloqueadoHasta.toISOString() })
          .eq('id_usuario', usuarioData.id_usuario);

        return { 
          user: null, 
          error: 'Usuario bloqueado por múltiples intentos fallidos. Intente más tarde.' 
        };
      }

      // Validar password usando función RPC
      let passwordValid = false;
      
      try {
        const { data: validationData, error: validationError } = await supabase
          .rpc('validar_password', {
            p_username: username,
            p_password: password
          });
        
        if (!validationError && validationData !== null && validationData !== undefined) {
          passwordValid = validationData === true;
        } else if (validationError) {
          // Si la función no existe, usar validación simple (SOLO PARA DESARROLLO)
          console.warn('Función validar_password no encontrada. Usando validación simple.');
          // Solo para desarrollo: comparación directa (NO USAR EN PRODUCCIÓN)
          passwordValid = usuarioData.password_hash === password;
        }
      } catch (error) {
        // Si falla, usar validación simple (SOLO PARA DESARROLLO)
        console.warn('Error al validar contraseña. Usando validación simple.', error);
        passwordValid = usuarioData.password_hash === password;
      }

      if (!passwordValid) {
        // Incrementar intentos fallidos
        const nuevosIntentos = (usuarioData.intentos_fallidos || 0) + 1;
        await supabase
          .from('usuarios')
          .update({
            intentos_fallidos: nuevosIntentos,
          })
          .eq('id_usuario', usuarioData.id_usuario);

        // No resetear rate limiter aquí, se reseteará automáticamente después del tiempo
        return { user: null, error: 'Usuario o contraseña incorrectos' };
      }
      
      // Resetear rate limiter en login exitoso
      loginRateLimiter.reset(clientKey);
      
      // Actualizar último acceso y resetear intentos fallidos
      await supabase
        .from('usuarios')
        .update({
          ultimo_acceso: new Date().toISOString(),
          intentos_fallidos: 0,
        })
        .eq('id_usuario', usuarioData.id_usuario);

      // Convertir a formato User
      const user: User = {
        id: usuarioData.id_usuario,
        username: usuarioData.username,
        fullName: usuarioData.nombre_completo,
        email: usuarioData.email,
        role: usuarioData.rol,
        active: usuarioData.activo,
        gradosAsignados: usuarioData.grados_asignados,
        cambioPasswordObligatorio: usuarioData.cambio_password_obligatorio,
      };

      // Guardar sesión con expiración
      sessionService.saveSession(user);

      return { user, error: null };
    } catch (error: any) {
      console.error('Error en login:', error);
      return { user: null, error: error.message || 'Error al iniciar sesión' };
    }
  },

  /**
   * Cerrar sesión
   */
  async logout(): Promise<void> {
    sessionService.clearSession();
  },

  /**
   * Obtener usuario actual desde sesión
   */
  getCurrentUser(): User | null {
    const session = sessionService.getSession();
    if (!session) return null;
    
    // Verificar si la sesión expiró
    if (sessionService.isExpired()) {
      this.logout();
      return null;
    }
    
    return session.user;
  },

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  },

  /**
   * Solicitar recuperación de contraseña
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; error: string | null }> {
    try {
      // Buscar usuario por email
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id_usuario, email')
        .eq('email', email)
        .eq('activo', true)
        .single();

      if (usuarioError || !usuarioData) {
        // Por seguridad, no revelamos si el email existe o no
        return { success: true, error: null };
      }

      // Generar token único
      const token = crypto.randomUUID();
      const tokenHash = await this.hashToken(token);
      const fechaExpiracion = new Date();
      fechaExpiracion.setHours(fechaExpiracion.getHours() + 24); // 24 horas

      // Guardar token en base de datos
      const { error: tokenError } = await supabase
        .from('tokens_recuperacion')
        .insert({
          id_usuario: usuarioData.id_usuario,
          token_hash: tokenHash,
          fecha_expiracion: fechaExpiracion.toISOString(),
        });

      if (tokenError) {
        console.error('Error al crear token:', tokenError);
        return { success: false, error: 'Error al generar token de recuperación' };
      }

      // TODO: Enviar email con el token
      // Por ahora, solo devolvemos éxito

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error en requestPasswordReset:', error);
      return { success: false, error: error.message || 'Error al solicitar recuperación' };
    }
  },

  /**
   * Hash de token (simple, en producción usar bcrypt)
   */
  async hashToken(token: string): Promise<string> {
    // Usar Web Crypto API para hash simple
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Cambiar contraseña
   */
  async changePassword(
    userId: number, 
    newPassword: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      // TODO: Hash de la contraseña con bcrypt
      // Por ahora, asumimos que se hace en el backend
      const passwordHash = newPassword; // Placeholder

      const { error } = await supabase
        .from('usuarios')
        .update({
          password_hash: passwordHash,
          cambio_password_obligatorio: false,
        })
        .eq('id_usuario', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error en changePassword:', error);
      return { success: false, error: error.message || 'Error al cambiar contraseña' };
    }
  },
};
