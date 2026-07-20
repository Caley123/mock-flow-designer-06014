import { describe, expect, it } from 'vitest';
import type { ArrivalRecord, FaultType, Incident, Student } from '@/types';
import * as whatsappService from './whatsappService';

const student: Student = {
  id: 123,
  fullName: 'Ana Pérez',
  level: 'Secundaria',
  grade: '3ro',
  section: 'A',
  barcode: '77889900',
} as Student;

const arrivalRecord: ArrivalRecord = {
  id: 10,
  date: '2026-07-20',
  arrivalTime: '15:05',
  status: 'Registrado',
} as ArrivalRecord;

const departureRecord: ArrivalRecord = {
  ...arrivalRecord,
  departureTime: '17:30',
  departureType: 'Normal',
} as ArrivalRecord;

const incident: Incident = {
  id: 55,
  registeredAt: '2026-07-20T15:05:00-05:00',
  observations: 'Llegó sin materiales.',
  reincidenceLevel: 2,
} as Incident;

const fault: FaultType = {
  name: 'Falta de materiales',
  category: 'Académica',
  severity: 'Leve',
  recommendation: 'Revisar útiles antes de salir de casa.',
} as FaultType;

const tallerOpts = {
  tallerId: 'taller-abc',
  tallerNombre: 'Robótica',
};

describe('buildNotifyDedupKey', () => {
  it('usa clave por taller cuando recibe tallerId', () => {
    const buildNotifyDedupKey = (
      whatsappService as unknown as {
        buildNotifyDedupKey: (
          kind: 'arrival' | 'departure' | 'incident',
          studentId: number,
          date: string,
          opts?: { tallerId?: string; incidentId?: number },
        ) => string;
      }
    ).buildNotifyDedupKey;

    expect(buildNotifyDedupKey('arrival', 123, '2026-07-20T15:05:00-05:00', { tallerId: 'taller-abc' })).toBe(
      'taller:taller-abc:arrival:123:2026-07-20',
    );
  });

  it('prioriza incidentId para incidencias', () => {
    const buildNotifyDedupKey = (
      whatsappService as unknown as {
        buildNotifyDedupKey: (
          kind: 'arrival' | 'departure' | 'incident',
          studentId: number,
          date: string,
          opts?: { tallerId?: string; incidentId?: number },
        ) => string;
      }
    ).buildNotifyDedupKey;

    expect(
      buildNotifyDedupKey('incident', 123, '2026-07-20T15:05:00-05:00', {
        tallerId: 'taller-abc',
        incidentId: 55,
      }),
    ).toBe('incident:123:55');
  });
});

describe('mensajes WhatsApp con taller', () => {
  it('incluye taller en mensaje de llegada', () => {
    const buildArrivalMessage = (
      whatsappService as unknown as {
        buildArrivalMessage: (student: Student, record: ArrivalRecord, opts?: { tallerNombre?: string }) => string;
      }
    ).buildArrivalMessage;

    expect(buildArrivalMessage(student, arrivalRecord, tallerOpts)).toContain('*Taller:* Robótica');
  });

  it('incluye taller en mensaje de salida', () => {
    const buildDepartureMessage = (
      whatsappService as unknown as {
        buildDepartureMessage: (student: Student, record: ArrivalRecord, opts?: { tallerNombre?: string }) => string;
      }
    ).buildDepartureMessage;

    expect(buildDepartureMessage(student, departureRecord, tallerOpts)).toContain('*Taller:* Robótica');
  });

  it('incluye taller en mensaje de incidencia', () => {
    const buildIncidentMessage = (
      whatsappService as unknown as {
        buildIncidentMessage: (
          student: Student,
          incident: Incident,
          fault: FaultType,
          opts?: { tallerNombre?: string },
        ) => string;
      }
    ).buildIncidentMessage;

    expect(buildIncidentMessage(student, incident, fault, tallerOpts)).toContain('*Taller:* Robótica');
  });
});
