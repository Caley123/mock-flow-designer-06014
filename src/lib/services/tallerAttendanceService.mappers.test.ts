import { describe, expect, it } from 'vitest';
import { mapTallerAsistenciaRow } from './tallerAttendanceService';

describe('mapTallerAsistenciaRow', () => {
  it('mapea fila DB a TallerAsistencia con tallerNombre y horas truncadas', () => {
    const result = mapTallerAsistenciaRow({
      id_registro: 42,
      taller_id: 'taller-uuid',
      id_estudiante: 100,
      fecha: '2026-07-20',
      hora_llegada: '15:05:00',
      hora_salida: '17:30:00',
      estado: 'Tarde',
      tipo_salida: 'Normal',
      registrado_por: 7,
      talleres: { nombre: 'Fútbol' },
    });

    expect(result.id).toBe(42);
    expect(result.tallerId).toBe('taller-uuid');
    expect(result.tallerNombre).toBe('Fútbol');
    expect(result.studentId).toBe(100);
    expect(result.date).toBe('2026-07-20');
    expect(result.arrivalTime).toBe('15:05');
    expect(result.departureTime).toBe('17:30');
    expect(result.arrivalStatus).toBe('Tarde');
    expect(result.departureType).toBe('Normal');
    expect(result.registeredBy).toBe(7);
  });

  it('tolera talleres ausente y horas null', () => {
    const result = mapTallerAsistenciaRow({
      id_registro: 1,
      taller_id: 'x',
      id_estudiante: 2,
      fecha: '2026-07-01',
      hora_llegada: null,
      hora_salida: null,
      estado: null,
      tipo_salida: null,
      registrado_por: null,
    });

    expect(result.tallerNombre).toBeUndefined();
    expect(result.arrivalTime).toBeNull();
    expect(result.departureTime).toBeNull();
    expect(result.arrivalStatus).toBeNull();
  });
});
