function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
}

export function resolveTallerArrivalStatus(
  arrivalHHmm: string,
  tallerHoraInicio: string | null,
): 'A tiempo' | 'Tarde' {
  if (!tallerHoraInicio?.trim()) return 'A tiempo';
  return toMinutes(arrivalHHmm) > toMinutes(tallerHoraInicio) ? 'Tarde' : 'A tiempo';
}
