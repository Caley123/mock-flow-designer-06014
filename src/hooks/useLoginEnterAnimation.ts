import { type RefObject } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { motionDuration } from '@/lib/gsap/setup';

const BEAM_SEL = '[data-login-visual-beam], [data-login-visual-beam-core], [data-login-visual-beam-glow]';

function runBarcodeScan(tl: gsap.core.Timeline, at: number, duration: number, ease: string) {
  tl.to(BEAM_SEL, {
    left: 'calc(100% - 4px)',
    duration,
    ease,
  }, at)
    .to('[data-login-visual-hscan]', {
      top: 'calc(100% - 2px)',
      duration,
      ease,
    }, at)
    .to('[data-login-visual-spark]', {
      autoAlpha: 1,
      scale: 1.4,
      duration: 0.12,
      stagger: { amount: duration * 0.85, from: 'random' },
      yoyo: true,
      repeat: 1,
    }, at)
    .to('[data-login-visual-card]', {
      x: '+=2',
      duration: 0.05,
      yoyo: true,
      repeat: Math.max(2, Math.floor(duration / 0.14)),
      ease: 'power1.inOut',
    }, at);
}

/** Entrada login — materialización, show del carnet y escáner. */
export function useLoginEnterAnimation(scopeRef: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const dur = motionDuration(0.5);
      if (dur === 0) {
        gsap.set('[data-login-anim]', { autoAlpha: 1, clearProps: 'all' });
        gsap.set('[data-login-iris]', { clipPath: 'circle(150% at 50% 50%)', autoAlpha: 0 });
        gsap.set('[data-login-visual-result]', { autoAlpha: 1, scale: 1 });
        gsap.set('[data-login-visual-status]', { autoAlpha: 0 });
        return;
      }

      gsap.set('[data-login-iris]', { clipPath: 'circle(0% at 50% 45%)', autoAlpha: 1 });
      gsap.set('[data-login-anim]', { autoAlpha: 0 });
      gsap.set('[data-login-hero-split]', { x: -72, autoAlpha: 0 });
      gsap.set('[data-login-panel-split]', { x: 72, autoAlpha: 0 });
      gsap.set('[data-login-brand-mark]', { scale: 0.82, y: 16, autoAlpha: 0 });
      gsap.set('[data-login-brand-line]', { y: 10, autoAlpha: 0 });
      gsap.set('[data-login-visual-inner]', { scale: 0.88, y: 32, autoAlpha: 0 });
      gsap.set('[data-login-visual-halo]', { scale: 0.7, autoAlpha: 0 });
      gsap.set('[data-login-visual-glow-ring]', { scale: 0.75, autoAlpha: 0 });
      gsap.set('[data-login-visual-pulse-ring]', { scale: 0.6, autoAlpha: 0 });
      gsap.set('[data-login-visual-scanner]', { scale: 0.85, autoAlpha: 0, rotation: -3 });
      gsap.set('[data-login-visual-hud]', { y: -12, autoAlpha: 0 });
      gsap.set('[data-login-visual-card]', {
        y: 56,
        scale: 0.62,
        autoAlpha: 0,
        rotationY: -168,
        rotationX: 18,
        rotationZ: -8,
        transformPerspective: 900,
      });
      gsap.set('[data-login-visual-orbit]', { autoAlpha: 0, rotation: 0, scale: 0.85 });
      gsap.set('[data-login-visual-edge-glow]', { autoAlpha: 0 });
      gsap.set('[data-login-visual-holo]', { autoAlpha: 0 });
      gsap.set('[data-login-visual-shimmer]', { autoAlpha: 0 });
      gsap.set('[data-login-visual-shimmer-beam]', { x: '-120%' });
      gsap.set('[data-login-visual-ember]', { scale: 0, autoAlpha: 0, x: 0, y: 0 });
      gsap.set('[data-login-visual-carnet-part]', { y: 16, autoAlpha: 0 });
      gsap.set('[data-login-visual-carnet-part="photo"]', { scale: 0.5, autoAlpha: 0, transformOrigin: 'center center' });
      gsap.set('[data-login-visual-carnet-part="chip"]', { scale: 0.4, autoAlpha: 0, transformOrigin: 'center' });
      gsap.set('[data-login-visual-bars]', { scaleY: 0, transformOrigin: 'center bottom' });
      gsap.set('[data-login-visual-barcode-zone]', { autoAlpha: 0, scale: 0.88 });
      gsap.set(BEAM_SEL, { left: '0%' });
      gsap.set('[data-login-visual-hscan]', { top: '0%' });
      gsap.set('[data-login-visual-spark]', { autoAlpha: 0, scale: 0 });
      gsap.set('[data-login-visual-flash]', { autoAlpha: 0 });
      gsap.set('[data-login-visual-success-ring]', { autoAlpha: 0, scale: 0.3 });
      gsap.set('[data-login-visual-status]', { autoAlpha: 1 });
      gsap.set('[data-login-visual-result]', { scale: 0.4, autoAlpha: 0 });
      gsap.set('[data-login-visual-badge]', { scale: 0, autoAlpha: 0 });
      gsap.set('.login-carnet-scanner__corner', { scale: 0.4, autoAlpha: 0, transformOrigin: 'center' });
      gsap.set('[data-login-hero-title]', { y: 24, autoAlpha: 0, skewY: 4 });
      gsap.set('[data-login-module]', { y: 16, autoAlpha: 0, scale: 0.9 });
      gsap.set('[data-login-card]', { scale: 0.92, autoAlpha: 0, clipPath: 'inset(12% 8% 12% 8% round 24px)' });
      gsap.set('[data-login-card-line]', { scaleX: 0, transformOrigin: 'left center' });
      gsap.set('[data-login-title]', { y: 20, autoAlpha: 0 });
      gsap.set('[data-login-field]', { y: 14, autoAlpha: 0, scale: 0.98 });
      gsap.set('[data-login-mesh]', { scale: 1.3, autoAlpha: 0, rotation: -12 });
      gsap.set('[data-login-dust]', { scale: 0, autoAlpha: 0 });

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      const materialize = 0.54;
      const preScan = 0.92;
      const zoneReveal = 1.52;
      const scan1 = 1.6;
      const scan2 = 1.98;
      const successAt = 2.42;

      tl.to('[data-login-iris]', {
        clipPath: 'circle(150% at 50% 45%)',
        duration: 1.1,
        ease: 'power3.inOut',
      }, 0)
        .to('[data-login-mesh]', { scale: 1, autoAlpha: 1, rotation: 0, duration: 1.2, stagger: 0.12 }, 0.15)
        .to('[data-login-dust]', { scale: 1, autoAlpha: 0.45, duration: 0.8, stagger: { amount: 0.4, from: 'random' } }, 0.35)
        .to('[data-login-iris]', { autoAlpha: 0, duration: 0.4 }, 0.85)
        .to('[data-login-hero-split]', { x: 0, autoAlpha: 1, duration: 0.85, ease: 'expo.out' }, 0.25)
        .to('[data-login-panel-split]', { x: 0, autoAlpha: 1, duration: 0.85, ease: 'expo.out' }, 0.3)
        .to('[data-login-brand]', { autoAlpha: 1, duration: 0.4 }, 0.35)
        .to('[data-login-brand-mark]', { scale: 1, y: 0, autoAlpha: 1, duration: 0.85, ease: 'back.out(1.6)' }, 0.38)
        .to('[data-login-brand-line]', { y: 0, autoAlpha: 1, duration: 0.45, ease: 'power3.out' }, 0.52)
        .to('[data-login-visual]', { autoAlpha: 1, duration: 0.35 }, 0.4)
        .to('[data-login-visual-inner]', { scale: 1, y: 0, autoAlpha: 1, duration: 0.8, ease: 'back.out(1.2)' }, 0.42)
        .to('[data-login-visual-halo]', { scale: 1.15, autoAlpha: 1, duration: 0.9, ease: 'power2.out' }, 0.44)
        .to('[data-login-visual-glow-ring]', { scale: 1.08, autoAlpha: 1, duration: 0.9 }, 0.46)
        .to('[data-login-visual-pulse-ring]', { scale: 1.12, autoAlpha: 0.7, duration: 1, ease: 'sine.out' }, 0.48)
        .to('[data-login-visual-scanner]', { scale: 1, rotation: 0, autoAlpha: 1, duration: 0.7, ease: 'back.out(1.6)' }, 0.5)
        .to('[data-login-visual-hud]', { y: 0, autoAlpha: 1, duration: 0.45, ease: 'back.out(2)' }, 0.52)
        .to('.login-carnet-scanner__corner', { scale: 1, autoAlpha: 1, duration: 0.35, stagger: 0.05, ease: 'back.out(2.5)' }, 0.54)
        .to('[data-login-visual-card]', {
          y: 0,
          scale: 1,
          rotationY: 12,
          rotationX: 0,
          rotationZ: 0,
          autoAlpha: 1,
          duration: 0.9,
          ease: 'back.out(1.85)',
        }, materialize)
        .to('[data-login-visual-ember]', {
          scale: 1.35,
          autoAlpha: 1,
          x: (i) => (i % 2 === 0 ? -1 : 1) * (24 + (i * 9) % 42),
          y: (i) => -16 - (i * 6) % 48,
          duration: 0.6,
          stagger: 0.022,
          ease: 'power2.out',
        }, materialize)
        .to('[data-login-visual-edge-glow]', { autoAlpha: 1, duration: 0.4 }, materialize + 0.1)
        .to('[data-login-visual-ember]', {
          autoAlpha: 0,
          scale: 0.15,
          y: '-=32',
          duration: 0.55,
          stagger: 0.018,
          ease: 'power2.in',
        }, materialize + 0.38)
        .to('[data-login-visual-carnet-part="stripe"]', { y: 0, autoAlpha: 1, duration: 0.35, ease: 'power2.out' }, materialize + 0.08)
        .to('[data-login-visual-carnet-part="header"]', { y: 0, autoAlpha: 1, duration: 0.45, ease: 'back.out(1.6)' }, materialize + 0.12)
        .to('[data-login-visual-carnet-part="chip"]', { scale: 1, autoAlpha: 1, duration: 0.35, ease: 'back.out(2)' }, materialize + 0.18)
        .to('[data-login-visual-carnet-part="photo"]', {
          y: 0,
          scale: 1,
          autoAlpha: 1,
          duration: 0.62,
          ease: 'back.out(2.4)',
        }, materialize + 0.2)
        .to('[data-login-visual-carnet-part="info"]', { y: 0, autoAlpha: 1, duration: 0.45, ease: 'power3.out' }, materialize + 0.28)
        .to('[data-login-visual-carnet-part="valid"]', { y: 0, autoAlpha: 1, duration: 0.35, ease: 'power2.out' }, materialize + 0.32)
        .to('[data-login-visual-carnet-part="foot"]', { y: 0, autoAlpha: 1, duration: 0.4, ease: 'power2.out' }, materialize + 0.34)
        .to('[data-login-visual-bars]', {
          scaleY: 1,
          duration: 0.42,
          ease: 'back.out(1.5)',
        }, materialize + 0.38)
        .to('[data-login-visual-orbit]', {
          autoAlpha: 0.75,
          scale: 1,
          duration: 0.45,
          ease: 'power2.out',
        }, preScan)
        .to('[data-login-visual-orbit]', {
          rotation: 360,
          duration: 1.05,
          ease: 'none',
        }, preScan)
        .to('[data-login-visual-edge-glow]', { autoAlpha: 0, duration: 0.25 }, preScan + 0.04)
        .to('[data-login-visual-holo]', { autoAlpha: 0, duration: 0.25 }, preScan + 0.04)
        .to('[data-login-visual-card]', {
          rotationY: 178,
          scale: 1.07,
          y: -4,
          duration: 0.68,
          ease: 'power3.in',
        }, preScan + 0.06)
        .to('[data-login-visual-card]', {
          rotationY: 178,
          duration: 0.28,
        }, preScan + 0.74)
        .to('[data-login-visual-shimmer]', { autoAlpha: 1, duration: 0.1 }, preScan + 0.78)
        .to('[data-login-visual-shimmer-beam]', {
          x: '220%',
          duration: 0.55,
          ease: 'power2.inOut',
        }, preScan + 0.78)
        .to('[data-login-visual-card]', {
          rotationY: 360,
          scale: 1.03,
          y: 0,
          duration: 0.72,
          ease: 'power3.out',
        }, preScan + 1.02)
        .to('[data-login-visual-shimmer]', { autoAlpha: 0, duration: 0.2 }, preScan + 1.35)
        .to('[data-login-visual-edge-glow]', { autoAlpha: 0.85, duration: 0.35 }, preScan + 1.08)
        .to('[data-login-visual-holo]', { autoAlpha: 0.45, duration: 0.35 }, preScan + 1.08)
        .to('[data-login-visual-card]', {
          x: -16,
          y: -5,
          rotationZ: -7,
          rotationY: 362,
          duration: 0.4,
          ease: 'sine.inOut',
        }, preScan + 1.12)
        .to('[data-login-visual-card]', {
          x: 16,
          y: 4,
          rotationZ: 7,
          rotationY: 358,
          duration: 0.46,
          ease: 'sine.inOut',
        }, preScan + 1.52)
        .to('[data-login-visual-card]', {
          x: 0,
          y: -2,
          rotationZ: 0,
          rotationY: 360,
          rotationX: 0,
          scale: 1,
          duration: 0.45,
          ease: 'power3.out',
        }, zoneReveal - 0.12)
        .to('[data-login-visual-orbit]', { autoAlpha: 0, scale: 1.08, duration: 0.3 }, zoneReveal - 0.1)
        .to('[data-login-visual-holo]', { autoAlpha: 0.25, duration: 0.35 }, zoneReveal - 0.08)
        .to('[data-login-visual-barcode-zone]', { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(1.8)' }, zoneReveal);

      runBarcodeScan(tl, scan1, 0.5, 'power2.in');
      tl.set(BEAM_SEL, { left: '0%' }, scan1 + 0.52)
        .set('[data-login-visual-hscan]', { top: '0%' }, scan1 + 0.52)
        .set('[data-login-visual-card]', { x: 0, y: 0 }, scan1 + 0.52)
        .call(() => {
          const el = scopeRef.current?.querySelector('[data-login-visual-hud-code]');
          if (el) el.textContent = '61814729';
        }, undefined, scan1 + 0.15);

      runBarcodeScan(tl, scan2, 0.38, 'power4.inOut');
      tl.set('[data-login-visual-card]', { x: 0, y: 0 }, scan2 + 0.42)
        .to('[data-login-visual-edge-glow]', { autoAlpha: 0.6, duration: 0.3 }, scan2 + 0.3)
        .to('[data-login-visual-flash]', { autoAlpha: 0.9, duration: 0.12, ease: 'power2.out' }, successAt)
        .to('[data-login-visual-flash]', { autoAlpha: 0, duration: 0.45, ease: 'power2.in' }, successAt + 0.12)
        .to('[data-login-visual-success-ring]', {
          autoAlpha: 0.95,
          scale: 2.4,
          duration: 0.65,
          ease: 'power2.out',
        }, successAt)
        .to('[data-login-visual-success-ring]', { autoAlpha: 0, duration: 0.4 }, successAt + 0.48)
        .to('[data-login-visual-status]', { autoAlpha: 0, duration: 0.12 }, successAt + 0.08)
        .to('[data-login-visual-result]', { scale: 1, autoAlpha: 1, duration: 0.55, ease: 'back.out(2.5)' }, successAt + 0.1)
        .to('[data-login-visual-badge]', { scale: 1, autoAlpha: 1, duration: 0.45, stagger: 0.1, ease: 'back.out(2.2)' }, successAt + 0.22)
        .to('[data-login-hero-title]', { y: 0, skewY: 0, autoAlpha: 1, duration: 0.65, ease: 'power3.out' }, 0.72)
        .to('[data-login-module]', { y: 0, scale: 1, autoAlpha: 1, duration: 0.45, stagger: 0.08, ease: 'back.out(1.6)' }, 0.78)
        .to('[data-login-mobile-intro]', { autoAlpha: 1, duration: 0.4 }, 0.4)
        .to('[data-login-card]', { scale: 1, autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0% round 20px)', duration: 0.75, ease: 'power3.out' }, 0.48)
        .to('[data-login-card-line]', { scaleX: 1, duration: 0.6, ease: 'power2.inOut' }, 0.58)
        .to('[data-login-title]', { y: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out' }, 0.62)
        .to('[data-login-field]', { y: 0, scale: 1, autoAlpha: 1, duration: 0.4, stagger: 0.07, ease: 'back.out(1.3)' }, 0.68);
    },
    { scope: scopeRef }
  );
}
