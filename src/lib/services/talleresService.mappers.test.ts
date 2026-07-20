import { describe, expect, it } from 'vitest';
import { mapTallerRow } from './talleresService';

describe('mapTallerRow', () => {
  it('mapea nombre y hora_inicio truncada a HH:mm', () => {
    const result = mapTallerRow({
      id: 'abc-123',
      nombre: 'Fútbol',
      descripcion: 'Taller de fútbol',
      dia_semana: [1, 3],
      hora_inicio: '15:30:00',
      hora_fin: '17:00:00',
      activo: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    });

    expect(result.nombre).toBe('Fútbol');
    expect(result.horaInicio).toBe('15:30');
    expect(result.horaFin).toBe('17:00');
    expect(result.diaSemana).toEqual([1, 3]);
    expect(result.id).toBe('abc-123');
    expect(result.activo).toBe(true);
  });

  it('devuelve null en horas ausentes', () => {
    const result = mapTallerRow({
      id: 'x',
      nombre: 'Danza',
      descripcion: null,
      dia_semana: null,
      hora_inicio: null,
      hora_fin: null,
      activo: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });

    expect(result.horaInicio).toBeNull();
    expect(result.horaFin).toBeNull();
  });
});
