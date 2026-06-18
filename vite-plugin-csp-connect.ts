import { loadEnv, type Plugin } from 'vite';

function resolveHttpOrigin(url: string | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    const { hostname, origin } = new URL(trimmed);
    // En producción el navegador debe usar /sc-proxy (proxy Worker), no la IP del VPS.
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
      console.warn(
        '[sie-csp] VITE_OPENWA_API_URL apunta a una IP. Use /sc-proxy en Cloudflare para evitar ERR_CERT_AUTHORITY_INVALID.'
      );
      return null;
    }
    return origin;
  } catch {
    return null;
  }
}

/**
 * Añade el origen de OpenWA (y Supabase del .env) a connect-src del CSP en index.html.
 * Rutas relativas (/sc-proxy) usan 'self' y no requieren entrada extra.
 */
export function cspConnectSrcPlugin(): Plugin {
  let env: Record<string, string> = {};

  return {
    name: 'sie-csp-connect-src',
    config(_, { mode }) {
      env = loadEnv(mode, process.cwd(), '');
    },
    transformIndexHtml(html) {
      const origins = new Set<string>();

      const openwaOrigin = resolveHttpOrigin(env.VITE_OPENWA_API_URL);
      if (openwaOrigin) origins.add(openwaOrigin);

      const supabaseOrigin = resolveHttpOrigin(env.VITE_SUPABASE_URL);
      if (supabaseOrigin) {
        origins.add(supabaseOrigin);
        origins.add(supabaseOrigin.replace(/^https:/, 'wss:'));
      }

      if (origins.size === 0) return html;

      const toInject = [...origins].filter((origin) => !html.includes(origin));
      if (toInject.length === 0) return html;

      return html.replace(
        /connect-src ([^;"]+)/,
        (_match, current: string) => `connect-src ${current} ${toInject.join(' ')}`
      );
    },
  };
}
