import { describe, expect, it } from 'vitest';
import { resolveTallerArrivalStatus } from './tallerArrivalStatus';

describe('resolveTallerArrivalStatus', () => {
  it('sin hora de taller → A tiempo', () => {
    expect(resolveTallerArrivalStatus('16:10', null)).toBe('A tiempo');
  });
  it('antes o igual → A tiempo', () => {
    expect(resolveTallerArrivalStatus('15:30', '15:30')).toBe('A tiempo');
    expect(resolveTallerArrivalStatus('15:29', '15:30')).toBe('A tiempo');
  });
  it('después → Tarde', () => {
    expect(resolveTallerArrivalStatus('15:31', '15:30')).toBe('Tarde');
  });
});
