import { useCallback, useEffect, useMemo, useState } from 'react';
import { isTalleresEnabled } from '@/config/features';
import {
  incidentsService,
  tallerAttendanceService,
  talleresService,
  whatsappService,
} from '@/lib/services';
import { getLimaTodayDate } from '@/lib/utils/limaDateTime';
import type { ArrivalRecord, FaultType, Incident, Student, Taller, TallerAsistencia } from '@/types';

export type ScanMode = 'clase' | 'taller';
export type TallerScanAction = 'arrival' | 'departure' | 'complete';

type TallerNotifyOpts = {
  tallerId: string;
  tallerNombre: string;
};

type TallerScanSuccess = {
  ok: true;
  action: 'arrival' | 'departure';
  record: ArrivalRecord;
  displayStatus: string;
  displayTime: string;
  statusForTotals: ArrivalRecord['status'] | null;
};

type TallerScanFailure = {
  ok: false;
  error: string;
};

export type TallerScanResult = TallerScanSuccess | TallerScanFailure;

type TallerIncidentSuccess = {
  ok: true;
  incident: Incident;
};

type TallerIncidentFailure = {
  ok: false;
  error: string;
};

export type TallerIncidentResult = TallerIncidentSuccess | TallerIncidentFailure;

type SubmitTallerIncidentInput = {
  student: Student;
  faultTypeId: number;
  registeredBy: number;
  observations?: string;
  fault?: FaultType;
};

function mapTallerRecordToArrivalRecord(record: TallerAsistencia): ArrivalRecord {
  return {
    id: record.id,
    studentId: record.studentId,
    date: record.date,
    arrivalTime: record.arrivalTime ?? '00:00',
    status: (record.arrivalStatus ?? 'A tiempo') as ArrivalRecord['status'],
    registeredBy: record.registeredBy,
    createdAt: record.date,
    departureTime: record.departureTime,
    departureType: record.departureType,
  };
}

function buildNotifyOpts(taller: Taller): TallerNotifyOpts {
  return {
    tallerId: taller.id,
    tallerNombre: taller.nombre,
  };
}

function getYearMonth(date: string): { year: number; month: number } {
  const [year, month] = date.split('-').map((part) => Number(part));
  return { year, month };
}

export function findTodayTallerAttendance(
  records: TallerAsistencia[],
  tallerId: string,
  date: string,
): TallerAsistencia | null {
  return records.find((record) => record.tallerId === tallerId && record.date === date) ?? null;
}

export function resolveTallerScanAction(
  record: Pick<TallerAsistencia, 'arrivalTime' | 'departureTime'> | null | undefined,
): TallerScanAction {
  if (!record?.arrivalTime) return 'arrival';
  if (!record.departureTime) return 'departure';
  return 'complete';
}

export function useTallerScan() {
  const talleresEnabled = isTalleresEnabled();
  const [scanMode, setScanMode] = useState<ScanMode>('clase');
  const [selectedTallerId, setSelectedTallerId] = useState<string | null>(null);
  const [talleres, setTalleres] = useState<Taller[]>([]);
  const [talleresLoading, setTalleresLoading] = useState(false);

  useEffect(() => {
    if (!talleresEnabled) {
      setScanMode('clase');
      setSelectedTallerId(null);
      setTalleres([]);
      setTalleresLoading(false);
      return;
    }

    let cancelled = false;
    setTalleresLoading(true);

    void talleresService
      .listActive()
      .then(({ talleres: activeTalleres, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Error al cargar talleres activos:', error);
          setTalleres([]);
          setSelectedTallerId(null);
          return;
        }

        setTalleres(activeTalleres);
        setSelectedTallerId((current) =>
          current && activeTalleres.some((taller) => taller.id === current) ? current : null,
        );
      })
      .finally(() => {
        if (!cancelled) {
          setTalleresLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [talleresEnabled]);

  const isTallerMode = talleresEnabled && scanMode === 'taller';

  const selectedTaller = useMemo(
    () => talleres.find((taller) => taller.id === selectedTallerId) ?? null,
    [selectedTallerId, talleres],
  );

  const ensureTallerContext = useCallback(
    (registeredBy?: number): { taller: Taller } | { error: string } => {
      if (!talleresEnabled || scanMode !== 'taller') {
        return { error: 'El modo Talleres no está activo.' };
      }
      if (!registeredBy) {
        return { error: 'Usuario no autenticado' };
      }
      if (!selectedTaller) {
        return { error: 'Seleccione un taller antes de escanear.' };
      }
      return { taller: selectedTaller };
    },
    [scanMode, selectedTaller, talleresEnabled],
  );

  const handleTallerScan = useCallback(
    async (student: Student, registeredBy?: number): Promise<TallerScanResult> => {
      const context = ensureTallerContext(registeredBy);
      if ('error' in context) {
        return { ok: false, error: context.error };
      }

      const { taller } = context;
      const notifyOpts = buildNotifyOpts(taller);

      const { inscrito, error: inscripcionError } = await talleresService.isStudentInscrito(
        taller.id,
        student.id,
      );
      if (inscripcionError) {
        return { ok: false, error: inscripcionError };
      }
      if (!inscrito) {
        return {
          ok: false,
          error: `${student.fullName} no está inscrito en el taller ${taller.nombre}.`,
        };
      }

      const today = getLimaTodayDate();
      const { year, month } = getYearMonth(today);
      const { records, error: recordsError } = await tallerAttendanceService.fetchMonthForStudent(
        student.id,
        year,
        month,
      );
      if (recordsError) {
        return { ok: false, error: recordsError };
      }

      const todayRecord = findTodayTallerAttendance(records, taller.id, today);
      const action = resolveTallerScanAction(todayRecord);

      if (action === 'complete') {
        return {
          ok: false,
          error: `${student.fullName} ya tiene llegada y salida registradas hoy en ${taller.nombre}.`,
        };
      }

      if (action === 'departure' && todayRecord) {
        const { success, error, departureTime } = await tallerAttendanceService.recordDeparture(
          taller.id,
          student.id,
          registeredBy,
          'Normal',
          today,
        );

        if (!success || !departureTime) {
          return { ok: false, error: error || 'No se pudo registrar la salida del taller.' };
        }

        const record = mapTallerRecordToArrivalRecord({
          ...todayRecord,
          departureTime,
          departureType: 'Normal',
        });

        if (whatsappService.isEnabled()) {
          void whatsappService.notifyParentDeparture(student, record, notifyOpts);
        }

        return {
          ok: true,
          action: 'departure',
          record,
          displayStatus: 'Salida registrada',
          displayTime: departureTime,
          statusForTotals: null,
        };
      }

      const { record: arrivalRecord, error: arrivalError } = await tallerAttendanceService.recordArrival(
        taller.id,
        student.id,
        registeredBy,
        { tallerHoraInicio: taller.horaInicio },
      );

      if (arrivalError || !arrivalRecord) {
        return { ok: false, error: arrivalError || 'No se pudo registrar la llegada del taller.' };
      }

      const record = mapTallerRecordToArrivalRecord(arrivalRecord);

      if (whatsappService.isEnabled()) {
        void whatsappService.notifyParentArrival(student, record, notifyOpts);
      }

      return {
        ok: true,
        action: 'arrival',
        record,
        displayStatus: arrivalRecord.arrivalStatus ?? 'Registrado',
        displayTime: arrivalRecord.arrivalTime ?? '—:—',
        statusForTotals: record.status,
      };
    },
    [ensureTallerContext],
  );

  const submitTallerIncident = useCallback(
    async (input: SubmitTallerIncidentInput): Promise<TallerIncidentResult> => {
      const context = ensureTallerContext(input.registeredBy);
      if ('error' in context) {
        return { ok: false, error: context.error };
      }

      const { taller } = context;
      const notifyOpts = buildNotifyOpts(taller);

      const { inscrito, error: inscripcionError } = await talleresService.isStudentInscrito(
        taller.id,
        input.student.id,
      );
      if (inscripcionError) {
        return { ok: false, error: inscripcionError };
      }
      if (!inscrito) {
        return {
          ok: false,
          error: `${input.student.fullName} no está inscrito en el taller ${taller.nombre}.`,
        };
      }

      const { incident, error } = await incidentsService.create(
        {
          studentId: input.student.id,
          faultTypeId: input.faultTypeId,
          registeredBy: input.registeredBy,
          observations: input.observations,
          tallerId: taller.id,
        },
        { minimal: true },
      );

      if (error || !incident) {
        return { ok: false, error: error || 'No se pudo registrar la incidencia.' };
      }

      if (whatsappService.isEnabled() && input.fault) {
        void whatsappService.notifyParentIncident(
          input.student,
          {
            ...incident,
            student: input.student,
            faultType: input.fault,
          },
          input.fault,
          notifyOpts,
        );
      }

      return { ok: true, incident };
    },
    [ensureTallerContext],
  );

  return {
    handleTallerScan,
    isTallerMode,
    scanMode,
    selectedTaller,
    selectedTallerId,
    setScanMode,
    setSelectedTallerId,
    submitTallerIncident,
    talleres,
    talleresEnabled,
    talleresLoading,
  };
}
