import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  DEFAULT_PAGE_META,
  NOINDEX_PREFIXES,
  PUBLIC_ROUTE_META,
} from '@/config/siteSeo';

function upsertMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

function upsertRobots(noindex: boolean) {
  upsertMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow');
}

/**
 * Actualiza title, description, canonical y robots según la ruta (SPA).
 */
export function usePageMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    const isStaffRoute = NOINDEX_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    const isArrivalRoute = pathname.startsWith('/llegada/');

    const meta =
      PUBLIC_ROUTE_META[pathname] ??
      (pathname === '/portal-padres'
        ? PUBLIC_ROUTE_META['/portal-padres']
        : DEFAULT_PAGE_META);

    document.title = meta.title;
    upsertMeta('description', meta.description);
    upsertCanonical(
      isArrivalRoute ? `${window.location.origin}${pathname}` : meta.canonical
    );
    upsertRobots(isStaffRoute || isArrivalRoute);
  }, [pathname]);
}
