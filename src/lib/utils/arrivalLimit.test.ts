import { describe, expect, it } from 'vitest';
import {
  arrivalLimitConfigKey,
  compareArrivalStatus,
  normalizeEducationalLevel,
  resolveArrivalLimitForLevel,
} from './arrivalLimit';

describe('arrivalLimit', () => {
  it('resuelve clave de config por nivel', () => {
    expect(arrivalLimitConfigKey('Secundaria')).toBe('hora_limite_llegada_secundaria');
    expect(arrivalLimitConfigKey('Primaria')).toBe('hora_limite_llegada_primaria');
    expect(arrivalLimitConfigKey(null)).toBe('hora_limite_llegada');
  });

  it('normaliza nivel educativo', () => {
    expect(normalizeEducationalLevel('Secundaria')).toBe('Secundaria');
    expect(normalizeEducationalLevel('primaria')).toBe('Primaria');
  });

  it('marca tarde para secundaria después de 07:30', () => {
    const limits = { primaria: '08:00', secundaria: '07:30' };
    const limit = resolveArrivalLimitForLevel(limits, 'Secundaria');
    expect(compareArrivalStatus('07:29', limit)).toBe('A tiempo');
    expect(compareArrivalStatus('07:30', limit)).toBe('A tiempo');
    expect(compareArrivalStatus('07:31', limit)).toBe('Tarde');
    expect(compareArrivalStatus('07:41', limit)).toBe('Tarde');
  });

  it('marca a tiempo para primaria antes de 08:00', () => {
    const limits = { primaria: '08:00', secundaria: '07:30' };
    const limit = resolveArrivalLimitForLevel(limits, 'Primaria');
    expect(compareArrivalStatus('07:59', limit)).toBe('A tiempo');
    expect(compareArrivalStatus('08:00', limit)).toBe('A tiempo');
    expect(compareArrivalStatus('08:01', limit)).toBe('Tarde');
  });
});
