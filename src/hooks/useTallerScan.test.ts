import { describe, expect, it } from 'vitest';
import type { TallerAsistencia } from '@/types';
import { findTodayTallerAttendance, resolveTallerScanAction } from './useTallerScan';

function buildRecord(partial: Partial<TallerAsistencia>): TallerAsistencia {
  return {
    id: 1,
    tallerId: 'taller-1',
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
  it('encuentra el registro del taller y fecha actual', () => {
    const otherDay = buildRecord({ date: '2026-07-19' });
    const target = buildRecord({ tallerId: 'taller-2', date: '2026-07-20', arrivalTime: '15:00' });
    const otherTaller = buildRecord({ tallerId: 'taller-3', date: '2026-07-20' });

    expect(findTodayTallerAttendance([otherDay, target, otherTaller], 'taller-2', '2026-07-20')).toEqual(
      target,
    );
  });

  it('devuelve null si no existe registro del día para ese taller', () => {
    expect(findTodayTallerAttendance([], 'taller-9', '2026-07-20')).toBeNull();
  });
});

describe('resolveTallerScanAction', () => {
  it('registra llegada cuando no existe asistencia previa', () => {
    expect(resolveTallerScanAction(null)).toBe('arrival');
  });

  it('registra salida cuando ya existe llegada sin salida', () => {
    expect(resolveTallerScanAction(buildRecord({ arrivalTime: '15:05', departureTime: null }))).toBe(
      'departure',
    );
  });

  it('bloquea un tercer escaneo si ya tiene llegada y salida', () => {
    expect(
      resolveTallerScanAction(buildRecord({ arrivalTime: '15:05', departureTime: '17:10' })),
    ).toBe('complete');
  });
});
