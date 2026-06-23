import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Clock, AlertTriangle, ChevronLeft, GraduationCap, Calendar, MinusCircle } from 'lucide-react';
import { arrivalService } from '@/lib/services';
import type { ArrivalRecord, Student } from '@/types';
import { StudentPhoto } from '@/components/shared/StudentPhoto';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { getLimaMonthBounds, getLimaTodayDate } from '@/lib/utils/limaDateTime';

/* ── Tipos locales ───────────────────────────────────────────── */
interface PublicInfo {
  arrival: ArrivalRecord | null;
  recentArrivals: ArrivalRecord[];
  student: Student | null;
}

/* ── Helpers ─────────────────────────────────────────────────── */
function parseTime(t: string): string {
  const raw = t?.slice(0, 5) || '';
  if (!raw) return '—:—';
  const [h, m] = raw.split(':').map(Number);
  const suffix = h < 12 ? 'a.m.' : 'p.m.';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function formatDate(iso: string): string {
  try {
    return format(parseISO(iso), "EEEE d 'de' MMMM", { locale: es });
  } catch {
    return iso;
  }
}

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

/** Cuadrícula del mes (Lun→Dom) con celdas null al inicio/fin. */
function buildMonthGrid(year: number, month: number): (string | null)[] {
  const padStart = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const lastDay = new Date(year, month, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: padStart }, () => null);
  for (let d = 1; d <= lastDay; d++) {
    cells.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function chunkWeeks(cells: (string | null)[]): (string | null)[][] {
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

/* ── Calendario mensual tipo agenda ─────────────────────────── */
function AttendanceMonthCalendar({
  arrivals,
  todayArrival,
}: {
  arrivals: ArrivalRecord[];
  todayArrival: ArrivalRecord | null;
}) {
  const { year, month } = getLimaMonthBounds();
  const today = getLimaTodayDate();
  const monthTitle = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: es });
  const cells = buildMonthGrid(year, month);
  const weeks = chunkWeeks(cells);

  const byDate = new Map(arrivals.map((a) => [a.date, a]));
  if (todayArrival) byDate.set(todayArrival.date, todayArrival);

  const monthOnTime = arrivals.filter((r) => r.status === 'A tiempo').length;
  const monthLate = arrivals.filter((r) => r.status === 'Tarde').length;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-b from-slate-800/40 to-slate-900/60">
      <div className="flex items-center justify-between gap-3 border-b border-slate-700/50 px-4 py-3.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Agenda del mes
          </p>
          <p className="mt-0.5 text-lg font-bold capitalize text-white">{monthTitle}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
          <Calendar className="h-5 w-5 text-primary" aria-hidden />
        </div>
      </div>

      <div className="px-3 pb-4 pt-3 sm:px-4">
        <div className="mb-2 grid grid-cols-7 gap-1" role="row">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              role="columnheader"
              className="py-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="space-y-1.5" role="grid" aria-label={`Asistencia ${monthTitle}`}>
          {weeks.map((week, wi) => (
            <div key={wi} role="row" className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {week.map((day, di) => {
                if (!day) {
                  return <div key={`empty-${wi}-${di}`} className="min-h-[4.75rem] sm:min-h-[5.25rem]" aria-hidden />;
                }

                const rec = byDate.get(day);
                const isToday = day === today;
                const isFuture = day > today;
                const onTime = rec?.status === 'A tiempo';
                const late = rec?.status === 'Tarde';
                const aria = rec
                  ? `${formatDate(day)}: asistió, ${rec.status}, ${parseTime(rec.arrivalTime)}`
                  : isFuture
                    ? `${formatDate(day)}: día futuro`
                    : `${formatDate(day)}: sin registro`;

                return (
                  <div
                    key={day}
                    role="gridcell"
                    aria-label={aria}
                    className={cn(
                      'flex min-h-[4.75rem] flex-col rounded-xl border px-0.5 py-1.5 text-center transition-colors sm:min-h-[5.25rem] sm:py-2',
                      isFuture && 'border-transparent bg-slate-900/20 opacity-45',
                      !isFuture && !rec && 'border-slate-800/80 bg-slate-900/30',
                      rec && onTime && 'border-emerald-500/40 bg-emerald-500/12 shadow-sm shadow-emerald-950/20',
                      rec && late && 'border-amber-500/40 bg-amber-500/12 shadow-sm shadow-amber-950/20',
                      isToday && 'ring-2 ring-primary/70 ring-offset-1 ring-offset-slate-900'
                    )}
                  >
                    <span
                      className={cn(
                        'text-sm font-bold leading-none sm:text-base',
                        isToday ? 'text-primary' : isFuture ? 'text-slate-600' : 'text-slate-200'
                      )}
                    >
                      {format(parseISO(day), 'd', { locale: es })}
                    </span>

                    {rec ? (
                      <>
                        <span className="mt-1.5 text-[10px] font-bold leading-tight tabular-nums text-white sm:text-[11px]">
                          {parseTime(rec.arrivalTime)}
                        </span>
                        <span
                          className={cn(
                            'mt-0.5 text-[7px] font-bold uppercase leading-tight sm:text-[8px]',
                            onTime ? 'text-emerald-400' : 'text-amber-400'
                          )}
                        >
                          {onTime ? 'A tiempo' : 'Tarde'}
                        </span>
                      </>
                    ) : !isFuture ? (
                      <span className="mt-2 text-[8px] leading-tight text-slate-600 sm:text-[9px]">
                        Sin registro
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-700/50 bg-slate-950/30 px-4 py-3">
        <div className="mb-2 flex justify-center gap-6 text-center text-xs">
          <div>
            <p className="font-bold text-emerald-400">{monthOnTime}</p>
            <p className="text-slate-500">A tiempo</p>
          </div>
          <div>
            <p className="font-bold text-amber-400">{monthLate}</p>
            <p className="text-slate-500">Tardanzas</p>
          </div>
          <div>
            <p className="font-bold text-white">{monthOnTime + monthLate}</p>
            <p className="text-slate-500">Asistió</p>
          </div>
        </div>
        <p className="text-center text-[10px] text-slate-500">
          Verde = a tiempo · Ámbar = tarde · Hora dentro de cada día
        </p>
      </div>
    </div>
  );
}

/* ── Componente principal ────────────────────────────────────── */
export function ArrivalView() {
  const { id, dni } = useParams<{ id?: string; dni?: string }>();
  const [info, setInfo] = useState<PublicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dni) {
      // Modo búsqueda por DNI (sin registro de hoy)
      arrivalService.getPublicInfoByDNI(decodeURIComponent(dni)).then(
        ({ arrival, recentArrivals, student, error: err }) => {
          if (err || !student) {
            setError(err || 'No se encontró ningún estudiante con ese DNI.');
          } else {
            setInfo({ arrival, recentArrivals, student });
          }
          setLoading(false);
        }
      );
      return;
    }

    const recordId = Number(id);
    if (!id || !Number.isFinite(recordId) || recordId <= 0) {
      setError('Enlace no válido.');
      setLoading(false);
      return;
    }

    arrivalService.getPublicArrivalInfo(recordId).then(({ arrival, recentArrivals, error: err }) => {
      if (err || !arrival) {
        setError(err || 'No se encontró el registro.');
      } else {
        setInfo({ arrival, recentArrivals, student: arrival.student ?? null });
      }
      setLoading(false);
    });
  }, [id, dni]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-slate-400 text-sm">Cargando información…</p>
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error || !info) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl">Estudiante no encontrado</h1>
            <p className="text-slate-400 text-sm mt-2">
              {error ?? 'Este enlace no es válido o ya expiró.'}
            </p>
          </div>
          {dni && (
            <p className="text-slate-500 text-xs">
              DNI consultado: <span className="font-mono text-slate-300">{decodeURIComponent(dni)}</span>
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Link
              to="/portal-padres"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />Intentar con otro DNI
            </Link>
            <Link to="/login" className="text-xs text-slate-500 hover:text-slate-400 transition-colors">
              Ir al login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { arrival, recentArrivals, student } = info;
  const hasArrival = arrival !== null;
  const isOnTime = arrival?.status === 'A tiempo';

  const nivel = [student?.level, student?.grade, student?.section]
    .filter(Boolean)
    .join(' · ');

  /* ── Stats calculados ── */
  const onTimeCount = recentArrivals.filter((r) => r.status === 'A tiempo').length;
  const lateCount   = recentArrivals.filter((r) => r.status === 'Tarde').length;
  const totalDays   = recentArrivals.length;

  return (
    <div className="min-h-screen bg-slate-950 text-white" lang="es">
      {/* Fondo decorativo */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 40% at 50% -10%, ${
            !hasArrival ? 'rgba(100,116,139,0.10)' : isOnTime ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.10)'
          } 0%, transparent 70%)`,
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-xl px-4 pt-8 pb-16">

        {/* ── Header institución ── */}
        <header className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/80">
              I.E. San Ramón
            </p>
            <p className="text-xs text-slate-400">Sistema de Asistencia Escolar</p>
          </div>
        </header>

        {/* ── Tarjeta principal ── */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 shadow-xl shadow-black/20 backdrop-blur-sm overflow-hidden">

          {/* Franja de color top */}
          <div
            className={cn(
              'h-1.5',
              !hasArrival
                ? 'bg-gradient-to-r from-slate-600 to-slate-500'
                : isOnTime
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                  : 'bg-gradient-to-r from-amber-500 to-amber-400'
            )}
          />

          <div className="p-5 pb-6">
            {/* Foto + nombre — centrado, foto grande */}
            <div className="mb-6 flex flex-col items-center text-center">
              <StudentPhoto
                src={student?.profilePhoto ?? null}
                name={student?.fullName ?? ''}
                priority="auto"
                className="h-36 w-36 sm:h-40 sm:w-40 rounded-2xl border-2 border-slate-600 shadow-lg shadow-black/30 shrink-0"
                imageClassName="object-cover"
              />
              <h1 className="mt-4 font-bold text-white text-xl leading-snug max-w-full">
                {student?.fullName ?? '—'}
              </h1>
              {nivel && (
                <p className="text-slate-400 text-sm mt-1">{nivel}</p>
              )}
            </div>

            {/* Estado de llegada — badge grande */}
            {hasArrival && arrival ? (
              <>
                <div
                  className={cn(
                    'rounded-xl px-4 py-4 flex items-center gap-4',
                    isOnTime
                      ? 'bg-emerald-500/10 border border-emerald-500/20'
                      : 'bg-amber-500/10 border border-amber-500/20'
                  )}
                >
                  {isOnTime ? (
                    <CheckCircle2 className="w-9 h-9 text-emerald-400 shrink-0" strokeWidth={1.75} />
                  ) : (
                    <Clock className="w-9 h-9 text-amber-400 shrink-0" strokeWidth={1.75} />
                  )}
                  <div>
                    <p className={cn('font-bold text-xl leading-tight', isOnTime ? 'text-emerald-400' : 'text-amber-400')}>
                      {arrival.status}
                    </p>
                    <p className="text-slate-400 text-sm mt-0.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {parseTime(arrival.arrivalTime)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-400 pl-1">
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span className="capitalize">{formatDate(arrival.date)}</span>
                </div>
              </>
            ) : (
              <div className="rounded-xl px-4 py-4 flex items-center gap-4 bg-slate-800/50 border border-slate-700">
                <MinusCircle className="w-9 h-9 text-slate-500 shrink-0" strokeWidth={1.75} />
                <div>
                  <p className="font-bold text-xl leading-tight text-slate-400">Sin registro hoy</p>
                  <p className="text-slate-500 text-sm mt-0.5">No se registró llegada hoy todavía.</p>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-800 mx-5" />

          {/* Stats resumen del mes */}
          <div className="p-5 grid grid-cols-3 gap-3 bg-slate-950/20">
            {[
              { label: 'Días con registro', value: totalDays, color: 'text-white' },
              { label: 'A tiempo', value: onTimeCount, color: 'text-emerald-400' },
              { label: 'Tardanzas', value: lateCount, color: lateCount > 0 ? 'text-amber-400' : 'text-slate-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className={cn('text-2xl font-bold', color)}>{value}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Historial de asistencia ── */}
        <section className="mt-6">
          <AttendanceMonthCalendar arrivals={recentArrivals} todayArrival={arrival} />
        </section>

        {/* ── Acceso al portal completo ── */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">Portal completo</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Incidencias, reuniones y más.
            </p>
          </div>
          <Link
            to="/login"
            className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Ingresar
          </Link>
        </div>

        {/* ── Footer ── */}
        <footer className="mt-10 text-center text-[11px] text-slate-600 space-y-1">
          <p>Notificación automática — SIE I.E. San Ramón</p>
          <p>Este enlace corresponde a un registro oficial de asistencia.</p>
        </footer>
      </div>
    </div>
  );
}
