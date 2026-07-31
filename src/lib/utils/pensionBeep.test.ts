import { describe, expect, it } from 'vitest';
import { shouldAlertPensionMorosa } from './pensionBeep';

describe('shouldAlertPensionMorosa', () => {
  it('alerta solo si moroso y aviso activo', () => {
    expect(shouldAlertPensionMorosa('moroso', true)).toBe(true);
    expect(shouldAlertPensionMorosa('moroso', false)).toBe(false);
    expect(shouldAlertPensionMorosa('al_dia', true)).toBe(false);
    expect(shouldAlertPensionMorosa('pendiente', true)).toBe(false);
    expect(shouldAlertPensionMorosa('sin_dato', true)).toBe(false);
    expect(shouldAlertPensionMorosa(null, true)).toBe(false);
  });
});
