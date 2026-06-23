import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Clock, AlertTriangle, ChevronLeft, GraduationCap, Calendar, MinusCircle } from 'lucide-react';
import { arrivalService } from '@/lib/services';
import type { ArrivalRecord, Student } from '@/types';
import { StudentPhoto } from '@/components/shared/StudentPhoto';
import { cn } from '@/lib/utils';
import { format, parseISO, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateKeyLima, getLimaTodayDate } from '@/lib/utils/limaDateTime';

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

/** Últimos N días calendario (Lima), del más reciente al más antiguo. */
function lastNDaysLima(n: number): string[] {
  const today = getLimaTodayDate();
  const [y, m, d] = today.split('-').map(Number);
  const anchor = new Date(y, m - 1, d);
  return Array.from({ length: n }, (_, i) => formatDateKeyLima(subDays(anchor, i)));
}

function formatShortDay(iso: string): string {
  try {
    return format(parseISO(iso), "EEE d MMM", { locale: es });
  } catch {
    return iso;
  }
}

/* ── Historial legible: día, estado y hora ─────────────────── */
function AttendanceHistory({ arrivals }: { arrivals: ArrivalRecord[] }) {
  const days = lastNDaysLima(14);
  const byDate = new Map(arrivals.map((a) => [a.date, a]));
  const today = getLimaTodayDate();

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
        Historial de llegadas
      </p>
      <p className="text-[11px] text-slate-500 mb-4">Últimos 14 días — fecha, estado y hora</p>

      <ul className="space-y-2" aria-label="Asistencia de los últimos 14 días">
        {days.map((day) => {
          const rec = byDate.get(day);
          const isToday = day === today;
          const onTime = rec?.status === 'A tiempo';
          const late = rec?.status === 'Tarde';

          return (
            <li
              key={day}
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5',
                isToday ? 'border-white/20 bg-slate-800/80' : 'border-slate-800 bg-slate-900/50',
                rec && onTime && 'border-emerald-500/25 bg-emerald-500/5',
                rec && late && 'border-amber-500/25 bg-amber-500/5'
              )}
            >
              <div className="min-w-[5.5rem] shrink-0">
                <p className={cn('text-sm font-semibold capitalize leading-tight', isToday ? 'text-white' : 'text-slate-200')}>
                  {formatShortDay(day)}
                </p>
                {isToday && (
                  <span className="text-[10px] font-medium uppercase tracking-wide text-primary/90">Hoy</span>
                )}
              </div>

              <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:justify-between">
                {rec ? (
                  <>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        onTime
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-amber-500/15 text-amber-400'
                      )}
                    >
                      {onTime ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      ) : (
                        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      )}
                      {rec.status}
                    </span>
                    <span className="text-sm font-bold tabular-nums text-white">
                      {parseTime(rec.arrivalTime)}
                    </span>
                  </>
                ) : (
                  <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <MinusCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Sin registro
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
          A tiempo — llegó dentro del horario
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
          Tarde — después del horario
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-slate-600" />
          Sin registro ese día
        </span>
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

      <div className="relative mx-auto max-w-lg px-4 pt-8 pb-16">

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
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm overflow-hidden">

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
                className="h-28 w-28 sm:h-32 sm:w-32 rounded-2xl border-2 border-slate-600 shadow-lg shadow-black/30 shrink-0"
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

          {/* Stats resumen */}
          <div className="p-5 grid grid-cols-3 gap-3">
            {[
              { label: 'Registros', value: totalDays, color: 'text-white' },
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
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <AttendanceHistory arrivals={recentArrivals} />
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
