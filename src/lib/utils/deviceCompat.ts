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

/** Tablet o móvil táctil (excluye laptops con mouse). */
export function isCoarseTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(pointer: coarse)').matches &&
    window.matchMedia('(max-width: 1280px)').matches
  );
}

/** iPad o tablet Android por user-agent. */
export function isTabletUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad/i.test(ua) || isAndroidTablet();
}

/** Teléfono móvil (no tablet ni laptop). */
export function isPhoneViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 767px)').matches;
}

/**
 * Laptop o escritorio con mouse — login completo (panel hero + carnet).
 * Incluye portátiles con pantalla táctil pero con trackpad/ratón.
 */
export function isDesktopLike(): boolean {
  if (typeof window === 'undefined') return false;
  if (!window.matchMedia('(min-width: 1024px)').matches) return false;
  if (isTabletUserAgent()) return false;

  const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
  const canHover = window.matchMedia('(hover: hover)').matches;
  return hasFinePointer || canHover;
}

/**
 * Login simple (solo formulario) — móviles y tablets del colegio.
 * Laptops y escritorio usan el login completo con panel lateral.
 */
export function shouldUseLiteLogin(): boolean {
  if (typeof window === 'undefined') return false;
  if (isLegacyWebView()) return true;
  if (isDesktopLike()) return false;
  if (isTabletUserAgent()) return true;
  if (isPhoneViewport()) return true;
  if (window.matchMedia('(max-width: 1023px)').matches && isCoarseTouchDevice()) return true;
  return false;
}

/** Omitir GSAP (mantener layout completo en laptop). */
export function shouldSkipHeavyAnimations(): boolean {
  return prefersReducedMotion() || isLegacyWebView();
}

/** Precarga chunks de rutas críticas (escáner tutor). */
export function preloadCriticalRoutes(): void {
  if (typeof window === 'undefined') return;
  void import('@/pages/TutorScanner').catch(() => {
    /* red lenta: el lazy load reintentará al navegar */
  });
}
