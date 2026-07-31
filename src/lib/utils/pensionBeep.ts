let lastBeepAt = 0;

export function resetPensionBeepThrottleForTests(): void {
  lastBeepAt = 0;
}

export function playPensionMorosoBeep(now = Date.now()): void {
  if (now - lastBeepAt < 400) return;
  lastBeepAt = now;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
    void ctx.close();
  } catch {
    /* tablet sin audio — solo UI */
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
