import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

let registered = false;

/** Registra plugins GSAP una sola vez (patrón gsap-react skill). */
export function ensureGsapRegistered(): void {
  if (registered) return;
  gsap.registerPlugin(useGSAP);
  registered = true;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function motionDuration(normalSeconds: number): number {
  return prefersReducedMotion() ? 0 : normalSeconds;
}

ensureGsapRegistered();
