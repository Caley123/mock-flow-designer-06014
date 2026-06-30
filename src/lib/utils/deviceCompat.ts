import { prefersReducedMotion } from '@/lib/utils/motionPrefs';

/**
 * Navegador muy antiguo (Android < 8). No usar `new Function()` aquí: en producción
 * el CSP bloquea eval y marcaría erróneamente todos los equipos como "legacy".
 */
export function isLegacyWebView(): boolean {
  if (typeof navigator === 'undefined') return false;

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

/** iPad o tablet Android por user-agent. */
export function isTabletUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad/i.test(ua) || isAndroidTablet();
}

/** Teléfono móvil (viewport estrecho). */
export function isPhoneViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 767px)').matches;
}

/** Tablet o móvil táctil (escáner Bluetooth sin teclado en pantalla). */
export function prefersTouchBarcodeInput(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    isPhoneViewport() ||
    isTabletUserAgent() ||
    window.matchMedia('(max-width: 1023px)').matches ||
    window.matchMedia('(pointer: coarse)').matches
  );
}

/**
 * Login simple — solo móviles y tablets del colegio.
 * Laptops y monitores siempre usan el login completo (panel carnet).
 */
export function shouldUseLiteLogin(): boolean {
  if (typeof window === 'undefined') return false;
  if (isPhoneViewport()) return true;
  if (isTabletUserAgent()) return true;
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
