import { describe, expect, it } from 'vitest';
import {
  compareArrivalStatus,
  resolveArrivalLimitForLevel,
  resolveArrivalStatusForStudent,
} from './arrivalLimit';

const limits = {
  general: '08:00',
  primaria: '08:00',
  secundaria: '07:40',
};

describe('arrivalLimit', () => {
  it('usa límite de primaria y secundaria por nivel (sin la general)', () => {
    expect(resolveArrivalLimitForLevel(limits, 'Primaria')).toBe('08:00');
    expect(resolveArrivalLimitForLevel(limits, 'Secundaria')).toBe('07:40');
    // Sin nivel: secundaria, no la general legada
    expect(resolveArrivalLimitForLevel(limits, null)).toBe('07:40');
  });

  it('secundaria marca tarde desde su límite aunque la general sea más tarde', () => {
    // Config real: secundaria 07:40, general 08:00 — la general NO debe interferir
    expect(resolveArrivalStatusForStudent('07:40', limits, 'Secundaria')).toBe('A tiempo');
    expect(resolveArrivalStatusForStudent('07:41', limits, 'Secundaria')).toBe('Tarde');
    expect(resolveArrivalStatusForStudent('07:55', limits, 'Secundaria')).toBe('Tarde');
    expect(resolveArrivalStatusForStudent('08:00', limits, 'Secundaria')).toBe('Tarde');
  });

  it('primaria sigue usando 08:00 aunque secundaria sea 07:40', () => {
    expect(resolveArrivalStatusForStudent('07:55', limits, 'Primaria')).toBe('A tiempo');
    expect(resolveArrivalStatusForStudent('08:01', limits, 'Primaria')).toBe('Tarde');
  });

  it('compara horas en formato HH:MM', () => {
    expect(compareArrivalStatus('08:00', '08:00')).toBe('A tiempo');
    expect(compareArrivalStatus('08:01', '08:00')).toBe('Tarde');
  });

  it('respeta límites vespertinos del nivel', () => {
    const evening = { general: '08:00', primaria: '22:21', secundaria: '22:01' };
    expect(resolveArrivalStatusForStudent('21:40', evening, 'Secundaria')).toBe('A tiempo');
    expect(resolveArrivalStatusForStudent('22:02', evening, 'Secundaria')).toBe('Tarde');
  });
});
