import { type RefObject } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { prefersReducedMotion } from '@/lib/gsap/setup';

const BEAM_SEL = '[data-login-visual-beam], [data-login-visual-beam-core], [data-login-visual-beam-glow]';

/** Ambiente — escaneo intenso en loop continuo. */
export function useLoginAmbientAnimation(scopeRef: RefObject<HTMLElement | null>) {
  useGSAP(
    (_, contextSafe) => {
      if (prefersReducedMotion()) return;

      const scanLoop = gsap.timeline({ repeat: -1, repeatDelay: 0.25, delay: 2.6 });

      const runPass = (at: number, duration: number) => {
        scanLoop
          .set(BEAM_SEL, { left: '0%' }, at)
          .set('[data-login-visual-hscan]', { top: '0%' }, at)
          .to(BEAM_SEL, { left: 'calc(100% - 4px)', duration, ease: 'power2.inOut' }, at)
          .to('[data-login-visual-hscan]', { top: 'calc(100% - 2px)', duration, ease: 'power2.inOut' }, at)
          .to('[data-login-visual-spark]', {
            autoAlpha: 1,
            scale: 1.6,
            duration: 0.08,
            stagger: { amount: duration * 0.9, from: 'random' },
            yoyo: true,
            repeat: 1,
          }, at)
          .to('[data-login-visual-card]', {
            x: '+=2',
            duration: 0.05,
            yoyo: true,
            repeat: Math.max(2, Math.floor(duration / 0.1)),
            ease: 'power1.inOut',
          }, at);
      };

      runPass(0, 0.75);
      scanLoop.set(BEAM_SEL, { left: '0%' }, 0.82).set('[data-login-visual-hscan]', { top: '0%' }, 0.82);
      runPass(0.85, 0.55);

      gsap.to('[data-login-visual-pulse-ring]', {
        scale: 1.2,
        opacity: 0.5,
        duration: 2,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });

      gsap.to('.login-carnet-scanner__corner', {
        opacity: 0.35,
        scale: 1.08,
        duration: 0.8,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        stagger: 0.12,
      });

      gsap.to('.login-carnet-card__barcode-corner', {
        opacity: 0.5,
        scale: 1.15,
        duration: 0.65,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        stagger: 0.08,
      });

      gsap.to('[data-login-visual-hud-code]', {
        opacity: 0.5,
        duration: 0.5,
        ease: 'steps(2)',
        yoyo: true,
        repeat: -1,
      });

      gsap.to('[data-login-visual-barcode-zone]', {
        scale: 1.03,
        duration: 0.9,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        transformOrigin: 'center center',
      });

      gsap.to('.login-brand__logo-halo', {
        opacity: 0.55,
        scale: 1.08,
        duration: 2.2,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });

      gsap.to('[data-login-visual-halo]', {
        scale: 1.18,
        opacity: 0.9,
        duration: 2.5,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });

      gsap.to('[data-login-visual-glow-ring]', {
        scale: 1.1,
        opacity: 0.85,
        duration: 1.8,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });

      gsap.to('[data-login-visual-badge]', {
        y: -5,
        scale: 1.05,
        duration: 2.2,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        stagger: 0.3,
      });

      gsap.to('[data-login-visual-edge-glow]', {
        autoAlpha: 0.35,
        duration: 2.4,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });

      gsap.to('[data-login-visual-card]', {
        y: -5,
        rotationY: 4,
        rotationZ: 1.5,
        duration: 2.8,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });

      gsap.to('[data-login-visual-holo]', {
        autoAlpha: 0.35,
        duration: 3.2,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });

      gsap.to('[data-login-visual-ember]', {
        autoAlpha: 0.55,
        scale: 0.85,
        y: '-=6',
        duration: 1.8,
        ease: 'sine.out',
        yoyo: true,
        repeat: -1,
        stagger: { amount: 1.2, from: 'random' },
      });

      gsap.to('[data-login-mesh]', {
        rotation: '+=10',
        x: '+=20',
        duration: 20,
        ease: 'none',
        repeat: -1,
        yoyo: true,
        stagger: 3,
      });

      gsap.to('[data-login-orb]', {
        scale: 1.15,
        opacity: 0.55,
        duration: 5,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        stagger: 1,
      });

      gsap.to('[data-login-card-line]', {
        opacity: 0.55,
        duration: 1.8,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });

      const visualX = gsap.quickTo('[data-login-visual-inner]', 'x', { duration: 0.8, ease: 'power2.out' });
      const visualY = gsap.quickTo('[data-login-visual-inner]', 'y', { duration: 0.8, ease: 'power2.out' });
      const cardX = gsap.quickTo('[data-login-card]', 'x', { duration: 0.6, ease: 'power2.out' });
      const cardY = gsap.quickTo('[data-login-card]', 'y', { duration: 0.6, ease: 'power2.out' });

      const onMove = contextSafe((event: MouseEvent) => {
        const nx = event.clientX / window.innerWidth - 0.5;
        const ny = event.clientY / window.innerHeight - 0.5;
        visualX(nx * 14);
        visualY(ny * 8);
        cardX(nx * 8);
        cardY(ny * 5);
      });

      window.addEventListener('mousemove', onMove);

      return () => {
        window.removeEventListener('mousemove', onMove);
        scanLoop.kill();
      };
    },
    { scope: scopeRef }
  );
}
