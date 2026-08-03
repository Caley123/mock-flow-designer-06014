let lastBeepAt = 0;
let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedCtx || sharedCtx.state === 'closed') {
      sharedCtx = new AudioCtx();
    }
    return sharedCtx;
  } catch {
    return null;
  }
}

/** Desbloquear audio tras gesto del usuario (tablets bloquean Autoplay). */
export async function unlockPensionAudio(): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') await ctx.resume();
  } catch {
    /* ignore */
  }
}

export function resetPensionBeepThrottleForTests(): void {
  lastBeepAt = 0;
}

function tone(
  ctx: AudioContext,
  startAt: number,
  duration: number,
  frequency: number,
  volume: number,
  type: OscillatorType = 'square',
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.008);
  gain.gain.setValueAtTime(volume, startAt + Math.max(0.01, duration - 0.03));
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

/** Sirena corta: sube y baja de frecuencia (estilo alarma). */
function sirenSweep(
  ctx: AudioContext,
  startAt: number,
  duration: number,
  freqFrom: number,
  freqTo: number,
  volume: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freqFrom, startAt);
  osc.frequency.linearRampToValueAtTime(freqTo, startAt + duration);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.02);
  gain.gain.setValueAtTime(volume, startAt + duration - 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

/**
 * Alarma de mora: sirena + pitidos urgentes. No bloquea asistencia.
 */
export function playPensionMorosoBeep(now = Date.now()): void {
  // Evitar solapar alarmas completas (~1.2s)
  if (now - lastBeepAt < 1400) return;
  lastBeepAt = now;

  const ctx = getAudioContext();
  if (!ctx) return;

  const run = () => {
    try {
      const t0 = ctx.currentTime;
      const vol = 0.38;

      // Sirena ida y vuelta (alarma)
      sirenSweep(ctx, t0, 0.28, 780, 1400, vol);
      sirenSweep(ctx, t0 + 0.28, 0.28, 1400, 780, vol);
      sirenSweep(ctx, t0 + 0.56, 0.28, 780, 1400, vol);

      // Tres pitidos cortos y agudos al final
      tone(ctx, t0 + 0.92, 0.09, 1600, vol, 'square');
      tone(ctx, t0 + 1.05, 0.09, 1600, vol, 'square');
      tone(ctx, t0 + 1.18, 0.12, 1800, vol, 'square');
    } catch {
      /* tablet sin audio — solo UI */
    }
  };

  if (ctx.state === 'suspended') {
    void ctx.resume().then(run).catch(() => {
      /* ignore */
    });
  } else {
    run();
  }
}

/**
 * Pitido de aviso (no bloquea asistencia).
 * Activo si el cache indica moroso (pagado=0 tras día siguiente al vencimiento).
 */
export function shouldAlertPensionMorosa(
  estado: string | undefined | null,
  avisoActivo: boolean,
): boolean {
  if (!avisoActivo) return false;
  return estado === 'moroso';
}
