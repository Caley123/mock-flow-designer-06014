import { prefersReducedMotion } from '@/lib/gsap/setup';

/** WebView / navegador sin sintaxis moderna que Vite podría emitir. */
export function isLegacyWebView(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    // optional chaining + nullish coalescing (Chrome < 80)
    // eslint-disable-next-line no-new-func
    new Function('const o={}; return o?.x ?? 1')();
  } catch {
    return true;
  }

  const android = /Android (\d+)/.exec(navigator.userAgent);
  if (android && parseInt(android[1], 10) < 8) return true;

  return false;
}

/** Tablet o móvil táctil (colegio): priorizar estabilidad sobre animaciones. */
export function isCoarseTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(pointer: coarse)').matches &&
    window.matchMedia('(max-width: 1280px)').matches
  );
}

/** Omitir GSAP / efectos pesados en login y pantallas críticas. */
export function shouldSkipHeavyAnimations(): boolean {
  return prefersReducedMotion() || isLegacyWebView() || isCoarseTouchDevice();
}

/** Precarga chunks de rutas críticas (escáner tutor). */
export function preloadCriticalRoutes(): void {
  if (typeof window === 'undefined') return;
  void import('@/pages/TutorScanner').catch(() => {
    /* red lenta: el lazy load reintentará al navegar */
  });
}
