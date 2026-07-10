import { useMemo, useState } from 'react';
import { CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, LogIn, LogOut, Search } from 'lucide-react';
import type { ArrivalRecord, Student } from '@/types';
import { StudentPhoto } from '@/components/shared/StudentPhoto';
import { ReincidenceBadge } from '@/components/shared/ReincidenceBadge';
import { foldSearchText } from '@/lib/utils/studentSearch';
import { cn } from '@/lib/utils';

interface ClassroomStudentListProps {
  students: Student[];
  loading?: boolean;
  arrivalByStudentId?: Map<number, ArrivalRecord>;
  onSelectStudent: (student: Student) => void;
  onRegisterArrival?: (student: Student) => void;
  onRegisterDeparture?: (recordId: number, student: Student) => void;
  registeringEntryId?: number | null;
  registeringDepartureId?: number | null;
}

function AttendanceStatusBadge({ record }: { record: ArrivalRecord | undefined }) {
  if (!record) {
    return (
      <Badge
        variant="outline"
        className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 whitespace-nowrap"
      >
        Sin registrar
      </Badge>
    );
  }

  return (
    <Badge
      variant={record.status === 'A tiempo' ? 'default' : 'destructive'}
      className={cn(
        'whitespace-nowrap',
        record.status === 'A tiempo'
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      )}
    >
      {record.status}
    </Badge>
  );
}

export function ClassroomStudentList({
  students,
  loading,
  arrivalByStudentId,
  onSelectStudent,
  onRegisterArrival,
  onRegisterDeparture,
  registeringEntryId,
  registeringDepartureId,
}: ClassroomStudentListProps) {
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    const q = foldSearchText(filter.trim());
    if (!q) return students;
    return students.filter((s) => foldSearchText(s.fullName).includes(q));
  }, [students, filter]);

  if (loading) {
    return (
      <CardContent className="flex items-center justify-center gap-2 p-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando estudiantes…
      </CardContent>
    );
  }

  return (
    <CardContent className="p-5 sm:p-6 space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar por nombre…"
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {students.length === 0
            ? 'No hay estudiantes activos en este salón.'
            : 'Ningún estudiante coincide con el filtro.'}
        </p>
      ) : (
        <ul className="space-y-2 max-h-[min(60vh,520px)] overflow-y-auto">
          {filtered.map((student) => {
            const record = arrivalByStudentId?.get(student.id);
            const canRegisterArrival = !record && onRegisterArrival;
            const canRegisterDeparture =
              record && !record.departureTime && onRegisterDeparture;

            return (
              <li key={student.id}>
                <div
                  className={cn(
                    'flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center',
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <StudentPhoto
                      src={student.profilePhoto}
                      name={student.fullName}
                      className="h-12 w-12 rounded-xl shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium truncate">{student.fullName}</p>
                        {(student.reincidenceLevel ?? 0) > 0 && (
                          <ReincidenceBadge level={student.reincidenceLevel ?? 0} short />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {student.level} · {student.grade} — {student.section}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
                    <AttendanceStatusBadge record={record} />

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {canRegisterArrival && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onRegisterArrival(student)}
                          disabled={registeringEntryId === student.id}
                          className="gap-1.5"
                        >
                          {registeringEntryId === student.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <LogIn className="h-4 w-4" />
                          )}
                          <span>Entrada</span>
                        </Button>
                      )}

                      {canRegisterDeparture && record && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onRegisterDeparture(record.id, student)}
                          disabled={registeringDepartureId === record.id}
                          className="gap-1.5"
                        >
                          {registeringDepartureId === record.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <LogOut className="h-4 w-4" />
                          )}
                          <span>Salida</span>
                        </Button>
                      )}

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onSelectStudent(student)}
                      >
                        Incidencia
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </CardContent>
  );
}
