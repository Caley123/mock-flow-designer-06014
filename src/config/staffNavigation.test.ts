import { beforeEach, describe, expect, it, vi } from 'vitest';

const { featureState } = vi.hoisted(() => ({
  featureState: { enabled: false },
}));

vi.mock('./features', () => ({
  isTalleresEnabled: () => featureState.enabled,
}));

import { getStaffNavItems } from './staffNavigation';

describe('getStaffNavItems', () => {
  beforeEach(() => {
    featureState.enabled = false;
  });

  it('oculta Talleres cuando la feature está desactivada', () => {
    const items = getStaffNavItems('Supervisor');

    expect(items.some((item) => item.path === '/talleres')).toBe(false);
  });

  it('muestra Talleres para staff cuando la feature está activada', () => {
    featureState.enabled = true;

    const items = getStaffNavItems('Supervisor');

    expect(items.some((item) => item.path === '/talleres')).toBe(true);
  });

  it('no devuelve navegación staff para Tutor o Padre', () => {
    featureState.enabled = true;

    expect(getStaffNavItems('Tutor')).toEqual([]);
    expect(getStaffNavItems('Padre')).toEqual([]);
  });
});
