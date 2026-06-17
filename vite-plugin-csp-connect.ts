import type { Plugin } from 'vite';

function resolveHttpOrigin(url: string | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

/**
 * Añade el origen de OpenWA (y Supabase del .env) a connect-src del CSP en index.html.
 * Rutas relativas (/api/openwa) usan 'self' y no requieren entrada extra.
 */
export function cspConnectSrcPlugin(): Plugin {
  return {
    name: 'sie-csp-connect-src',
    transformIndexHtml(html) {
      const origins = new Set<string>();

      const openwaOrigin = resolveHttpOrigin(process.env.VITE_OPENWA_API_URL);
      if (openwaOrigin) origins.add(openwaOrigin);

      const supabaseOrigin = resolveHttpOrigin(process.env.VITE_SUPABASE_URL);
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
