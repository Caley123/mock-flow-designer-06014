import { describe, expect, it } from 'vitest';
import {
  buildArrivalIngestBody,
  buildDepartureIngestBody,
  buildIncidentIngestBody,
} from './mobileIngest';
import type { ArrivalRecord, FaultType, Incident, Student } from '@/types';

const student: Student = {
  id: 10,
  fullName: 'Ana Pérez',
  grade: '3',
  section: 'A',
  level: 'Primaria',
  barcode: 'X',
  reincidenceLevel: 0,
  faultsLast60Days: 0,
  active: true,
};

describe('mobileIngest builders', () => {
  it('arma body de entrada como el ejemplo de la API móvil', () => {
    const record: ArrivalRecord = {
      id: 1042,
      studentId: 10,
      date: '2026-07-26',
      arrivalTime: '07:45',
      status: 'A tiempo',
    };
    expect(buildArrivalIngestBody('jean_piaget', student, record)).toEqual({
      tenant_id: 'jean_piaget',
      tipo: 'entrada',
      id_estudiante: 10,
      id_registro: 1042,
      payload: {
        nombre_completo: 'Ana Pérez',
        grado: '3',
        seccion: 'A',
        nivel_educativo: 'Primaria',
        fecha: '2026-07-26',
        hora_llegada: '07:45',
        estado: 'A tiempo',
      },
    });
  });

  it('arma body de salida con hora_salida', () => {
    const record: ArrivalRecord = {
      id: 200,
      studentId: 10,
      date: '2026-07-26',
      departureTime: '13:10',
      departureType: 'Normal',
    };
    const body = buildDepartureIngestBody('jean_piaget', student, record);
    expect(body.tipo).toBe('salida');
    expect(body.payload.hora_salida).toBe('13:10');
  });

  it('arma body de incidencia con nombre_falta', () => {
    const incident: Incident = {
      id: 8,
      studentId: 10,
      faultTypeId: 1,
      registeredBy: 1,
      registeredAt: '2026-07-26T14:30:00.000Z',
      observations: null,
      reincidenceLevel: 0,
      hasEvidence: false,
      evidenceCount: 0,
      status: 'Activa',
    };
    const fault: FaultType = {
      id: 1,
      name: 'No porta carné',
      category: 'Uniforme',
      severity: 'Leve',
      points: 1,
      active: true,
    };
    const body = buildIncidentIngestBody('jean_piaget', student, incident, fault);
    expect(body.tipo).toBe('incidencia');
    expect(body.payload.nombre_falta).toBe('No porta carné');
    expect(body.id_registro).toBe(8);
  });
});
