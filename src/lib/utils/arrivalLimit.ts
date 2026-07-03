import type { EducationalLevel } from '@/types';
import { normalizeTimeValue } from '@/config/systemSettings';

export type ArrivalLimitsByLevel = {
  primaria: string;
  secundaria: string;
  /** Respaldo cuando el nivel del estudiante no está definido. */
  general: string;
};

/** Normaliza nivel educativo del estudiante. */
export function normalizeEducationalLevel(
  level?: string | null
): EducationalLevel | null {
  const l = (level ?? '').trim().toLowerCase();
  if (l.includes('prim')) return 'Primaria';
  if (l.includes('sec')) return 'Secundaria';
  return null;
}

export function arrivalLimitConfigKey(level?: string | null): string {
  const nivel = normalizeEducationalLevel(level);
  if (nivel === 'Primaria') return 'hora_limite_llegada_primaria';
  if (nivel === 'Secundaria') return 'hora_limite_llegada_secundaria';
  return 'hora_limite_llegada';
}

export function resolveArrivalLimitForLevel(
  limits: ArrivalLimitsByLevel,
  level?: string | null
): string {
  const nivel = normalizeEducationalLevel(level);
  if (nivel === 'Primaria') return limits.primaria;
  if (nivel === 'Secundaria') return limits.secundaria;
  return limits.general;
}

/** Estado según hora de llegada y nivel (primaria / secundaria). */
export function resolveArrivalStatusForStudent(
  arrivalTime: string,
  limits: ArrivalLimitsByLevel,
  level?: string | null
): 'A tiempo' | 'Tarde' {
  const limit = resolveArrivalLimitForLevel(limits, level);
  return compareArrivalStatus(arrivalTime, limit);
}

export function compareArrivalStatus(
  arrivalTime: string,
  limit: string
): 'A tiempo' | 'Tarde' {
  const t = normalizeTimeValue(arrivalTime, '00:00');
  const lim = normalizeTimeValue(limit, '08:00');
  return t <= lim ? 'A tiempo' : 'Tarde';
}
