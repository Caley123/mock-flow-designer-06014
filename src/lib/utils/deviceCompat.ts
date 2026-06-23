import { prefersReducedMotion } from '@/lib/utils/motionPrefs';

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

/** Tablet Android (UA sin "Mobile"). */
export function isAndroidTablet(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Android/i.test(ua) && !/Mobile/i.test(ua);
}

/** Tablet o móvil táctil. */
export function isCoarseTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(pointer: coarse)').matches &&
    window.matchMedia('(max-width: 1280px)').matches
  );
}

/** Tablets del colegio (incluye Android sin "Mobile" en el UA). */
export function isLikelySchoolTablet(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPad/i.test(ua)) return true;
  if (isAndroidTablet()) return true;
  if ('ontouchstart' in window && window.matchMedia('(max-width: 1366px)').matches) return true;
  return isCoarseTouchDevice();
}

/** Login sin GSAP — evita pantalla blanca si falla gsap-vendor. */
export function shouldUseLiteLogin(): boolean {
  return prefersReducedMotion() || isLegacyWebView() || isLikelySchoolTablet();
}

/** Omitir GSAP / efectos pesados en login y pantallas críticas. */
export function shouldSkipHeavyAnimations(): boolean {
  return shouldUseLiteLogin();
}

/** Precarga chunks de rutas críticas (escáner tutor). */
export function preloadCriticalRoutes(): void {
  if (typeof window === 'undefined') return;
  void import('@/pages/TutorScanner').catch(() => {
    /* red lenta: el lazy load reintentará al navegar */
  });
}
