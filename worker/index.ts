export interface Env {
  ASSETS: Fetcher;
  /** URL base del API OpenWA en el VPS (usar HTTP para evitar cert autofirmado). */
  OPENWA_UPSTREAM?: string;
}

/** Ruta proxy. Cloudflare bloquea /api/openwa y /internal/wa (403 error 1003). */
const OPENWA_PREFIX = '/sie-connect';

function resolveUpstreamBase(raw?: string): string {
  const base = (raw || 'http://178.104.115.2/api').trim().replace(/\/$/, '');
  return base.endsWith('/api') ? base : `${base}/api`;
}

function buildUpstreamUrl(requestUrl: URL, upstreamBase: string): string {
  const suffix = requestUrl.pathname.slice(OPENWA_PREFIX.length);
  return `${upstreamBase}${suffix}${requestUrl.search}`;
}

async function proxyOpenwa(request: Request, requestUrl: URL, upstreamBase: string): Promise<Response> {
  const targetUrl = buildUpstreamUrl(requestUrl, upstreamBase);

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('connection');

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  try {
    const upstream = await fetch(targetUrl, init);

    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get('location');
      if (location?.startsWith('https://')) {
        return Response.json(
          {
            error:
              'OpenWA redirige a HTTPS con certificado no válido. Configure OPENWA_UPSTREAM con HTTP (puerto 80) en el Worker.',
          },
          { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    return upstream;
  } catch {
    return Response.json(
      {
        error:
          'No se pudo conectar con OpenWA en el servidor. Revise que el API esté accesible por HTTP desde Cloudflare.',
      },
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === OPENWA_PREFIX || url.pathname.startsWith(`${OPENWA_PREFIX}/`)) {
      return proxyOpenwa(request, url, resolveUpstreamBase(env.OPENWA_UPSTREAM));
    }

    return env.ASSETS.fetch(request);
  },
};
