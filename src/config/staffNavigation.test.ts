import { describe, expect, it, vi } from 'vitest';
import { getStaffNavItems } from './staffNavigation';

const mocks = vi.hoisted(() => ({
  isPensionesEnabled: vi.fn(() => true),
  isTalleresEnabled: vi.fn(() => false),
  isNotasEnabled: vi.fn(() => false),
}));

vi.mock('@/config/features', () => ({
  isPensionesEnabled: () => mocks.isPensionesEnabled(),
  isTalleresEnabled: () => mocks.isTalleresEnabled(),
  isNotasEnabled: () => mocks.isNotasEnabled(),
}));

describe('getStaffNavItems', () => {
  it('ya no incluye Administración de Talleres', () => {
    const items = getStaffNavItems('Supervisor');
    expect(items.some((item) => item.path === '/talleres')).toBe(false);
  });

  it('no devuelve navegación staff para Tutor o Padre', () => {
    expect(getStaffNavItems('Tutor')).toEqual([]);
    expect(getStaffNavItems('Padre')).toEqual([]);
  });

  it('incluye Pensiones para Admin y Director si flag on', () => {
    expect(getStaffNavItems('Admin').some((i) => i.path === '/pensiones')).toBe(true);
    expect(getStaffNavItems('Director').some((i) => i.path === '/pensiones')).toBe(true);
    expect(getStaffNavItems('Supervisor').some((i) => i.path === '/pensiones')).toBe(false);
  });

  it('agrega submenú Notas bajo Estudiantes solo si flag on', () => {
    mocks.isNotasEnabled.mockReturnValue(false);
    const off = getStaffNavItems('Admin').find((i) => i.path === '/students');
    expect(off?.subItems?.some((s) => s.path === '/notas')).toBeFalsy();

    mocks.isNotasEnabled.mockReturnValue(true);
    const on = getStaffNavItems('Admin').find((i) => i.path === '/students');
    expect(on?.subItems?.some((s) => s.path === '/notas')).toBe(true);

    const director = getStaffNavItems('Director').find((i) => i.path === '/students');
    expect(director?.subItems?.some((s) => s.path === '/notas')).toBe(true);

    const supervisor = getStaffNavItems('Supervisor').find((i) => i.path === '/students');
    expect(supervisor?.subItems?.some((s) => s.path === '/notas')).toBeFalsy();
  });
});
