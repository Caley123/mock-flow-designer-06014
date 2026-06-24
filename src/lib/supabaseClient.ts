import { createClient } from '@supabase/supabase-js';
import { sessionService } from './services/sessionService';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://spdugaykkcgpcfslcpac.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwZHVnYXlra2NncGNmc2xjcGFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NDE5MzAsImV4cCI6MjA3NzUxNzkzMH0.zLC3qHpIeVSA0jsLcA_md87_0SV4-stpDjHF7IvBr28';

if (!import.meta.env.VITE_SUPABASE_URL && import.meta.env.PROD) {
  console.warn('[SIE] VITE_SUPABASE_URL no definida; usando valor por defecto del proyecto.');
}

/**
 * Timeout por petición: si una petición a Supabase se queda colgada más de este
 * tiempo (red lenta, cold-start de Supabase), se cancela para que React Query
 * pueda reintentar. El reintento suele resolver en < 1 s porque la conexión
 * ya está "caliente".
 *
 * NOTA: AbortSignal.timeout se comprueba en tiempo de ejecución para mantener
 * compatibilidad con Safari < 15.4 / Chrome < 103 / Firefox < 100.
 * En browsers sin soporte simplemente no se aplica el timeout; React Query
 * sigue manejando errores y reintentos con normalidad.
 */
const REQUEST_TIMEOUT_MS = 15_000;
const ABORT_TIMEOUT_SUPPORTED = typeof AbortSignal?.timeout === 'function';

/**
 * Devuelve una AbortSignal combinada (primera en disparar gana).
 * Compatible con browsers sin AbortSignal.any (iOS < 17.4).
 */
function mergeSignals(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any(signals);
  }
  const ctrl = new AbortController();
  for (const sig of signals) {
    if (sig.aborted) {
      ctrl.abort(sig.reason);
      return ctrl.signal;
    }
    sig.addEventListener('abort', () => ctrl.abort(sig.reason), { once: true });
  }
  return ctrl.signal;
}

/**
 * Cliente Supabase. Envía x-sie-token en cada petición cuando hay sesión activa
 * para que las políticas RLS identifiquen rol y usuario.
 * Incluye timeout de REQUEST_TIMEOUT_MS (si el browser lo soporta) para evitar
 * peticiones colgadas indefinidamente.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (input, init) => {
      const apiToken = sessionService.getApiToken();
      const headers = new Headers(init?.headers);
      if (apiToken) {
        headers.set('x-sie-token', apiToken);
      }

      if (!ABORT_TIMEOUT_SUPPORTED) {
        // Browser antiguo: sin timeout, comportamiento original
        return fetch(input, { ...init, headers });
      }

      const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
      const signal = init?.signal
        ? mergeSignals([init.signal, timeoutSignal])
        : timeoutSignal;

      return fetch(input, { ...init, headers, signal });
    },
  },
});
