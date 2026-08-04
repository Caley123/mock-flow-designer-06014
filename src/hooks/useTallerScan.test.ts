import { describe, expect, it } from 'vitest';
import type { TallerAsistencia } from '@/types';
import { findTodayTallerAttendance, resolveTallerScanAction } from './useTallerScan';

function buildRecord(partial: Partial<TallerAsistencia>): TallerAsistencia {
  return {
    id: 1,
    tallerId: 'taller',
    studentId: 10,
    date: '2026-07-20',
    arrivalTime: null,
    departureTime: null,
    arrivalStatus: null,
    departureType: null,
    registeredBy: null,
    ...partial,
  };
}

describe('findTodayTallerAttendance', () => {
  it('encuentra el registro de la fecha actual', () => {
    const otherDay = buildRecord({ date: '2026-07-19' });
    const target = buildRecord({ date: '2026-07-20', arrivalTime: '15:00' });

    expect(findTodayTallerAttendance([otherDay, target], '2026-07-20')).toEqual(target);
  });

  it('devuelve null si no existe registro del día', () => {
    expect(findTodayTallerAttendance([], '2026-07-20')).toBeNull();
  });
});

describe('resolveTallerScanAction', () => {
  it('registra llegada cuando no existe asistencia previa', () => {
    expect(resolveTallerScanAction(null)).toBe('arrival');
  });

  it('registra salida cuando ya hay llegada sin salida', () => {
    expect(resolveTallerScanAction(buildRecord({ arrivalTime: '15:05', departureTime: null }))).toBe(
      'departure',
    );
  });

  it('marca completo si ya tiene llegada y salida', () => {
    expect(
      resolveTallerScanAction(buildRecord({ arrivalTime: '15:05', departureTime: '17:10' })),
    ).toBe('complete');
  });
});
