import { describe, expect, it, vi } from 'vitest';
import { getStaffNavItems } from './staffNavigation';

vi.mock('@/config/features', () => ({
  isPensionesEnabled: () => true,
  isTalleresEnabled: () => false,
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
});
