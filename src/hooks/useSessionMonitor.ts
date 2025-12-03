import { useEffect, useRef } from 'react';
import { sessionService } from '@/lib/services';
import { authService } from '@/lib/services';
import { useNavigate } from 'react-router-dom';

/**
 * Hook para monitorear y gestionar la expiración de sesiones
 */
export const useSessionMonitor = () => {
  const navigate = useNavigate();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Verificar sesión inmediatamente
    if (sessionService.isExpired()) {
      authService.logout();
      navigate('/login?expired=true', { replace: true });
      return;
    }

    // Función para verificar y actualizar sesión
    const checkSession = () => {
      if (sessionService.isExpired()) {
        authService.logout();
        navigate('/login?expired=true', { replace: true });
      } else {
        sessionService.updateActivity();
      }
    };

    // Verificar cada 5 minutos
    intervalRef.current = setInterval(checkSession, sessionService.REFRESH_INTERVAL);

    // Actualizar actividad en eventos de usuario
    const updateActivity = () => {
      // Cancelar timeout anterior
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      
      // Debounce: actualizar actividad después de 30 segundos de inactividad
      activityTimeoutRef.current = setTimeout(() => {
        if (!sessionService.isExpired()) {
          sessionService.updateActivity();
        }
      }, 30000);
    };

    // Eventos que indican actividad del usuario
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    activityEvents.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Limpiar al desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      activityEvents.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, [navigate]);
};

