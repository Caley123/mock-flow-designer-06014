import { describe, expect, it } from 'vitest';
import {
  periodoFromDate,
  fechaVencimientoForPeriodo,
  estadoTrasImportNoPago,
  cacheEstadoFromPension,
  resolveEstadoPension,
} from './pensionPeriod';

describe('pensionPeriod', () => {
  it('formatea YYYY-MM', () => {
    expect(periodoFromDate(new Date(2026, 6, 30))).toBe('2026-07');
  });

  it('vencimiento día configurable', () => {
    expect(fechaVencimientoForPeriodo('2026-07', 10)).toBe('2026-07-10');
    expect(fechaVencimientoForPeriodo('2026-07', 5)).toBe('2026-07-05');
  });

  it('no pagó: mora el día siguiente al vencimiento', () => {
    expect(estadoTrasImportNoPago('2026-07-10', '2026-07-11')).toBe('moroso');
    expect(estadoTrasImportNoPago('2026-07-10', '2026-07-10')).toBe('pendiente');
    expect(estadoTrasImportNoPago('2026-07-10', '2026-07-09')).toBe('pendiente');
  });

  it('resolveEstadoPension respeta pagado=1', () => {
    expect(
      resolveEstadoPension({ pagado: 1, fechaVencimiento: '2026-07-10', hoyLima: '2026-07-20' }),
    ).toBe('pagado');
    expect(
      resolveEstadoPension({ pagado: 0, fechaVencimiento: '2026-07-10', hoyLima: '2026-07-11' }),
    ).toBe('moroso');
  });

  it('cache: pagado → al_dia', () => {
    expect(cacheEstadoFromPension('pagado')).toBe('al_dia');
    expect(cacheEstadoFromPension(null)).toBe('sin_dato');
    expect(cacheEstadoFromPension('moroso')).toBe('moroso');
  });
});
