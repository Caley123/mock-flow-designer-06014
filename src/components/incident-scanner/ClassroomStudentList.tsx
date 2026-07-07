import { useMemo, useState } from 'react';
import { CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search } from 'lucide-react';
import type { Student } from '@/types';
import { StudentPhoto } from '@/components/shared/StudentPhoto';
import { ReincidenceBadge } from '@/components/shared/ReincidenceBadge';
import { foldSearchText } from '@/lib/utils/studentSearch';
import { cn } from '@/lib/utils';

interface ClassroomStudentListProps {
  students: Student[];
  loading?: boolean;
  onSelectStudent: (student: Student) => void;
}

export function ClassroomStudentList({ students, loading, onSelectStudent }: ClassroomStudentListProps) {
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
          {filtered.map((student) => (
            <li key={student.id}>
              <button
                type="button"
                onClick={() => onSelectStudent(student)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left',
                  'hover:bg-muted/60 transition-colors',
                )}
              >
                <StudentPhoto
                  src={student.profilePhoto}
                  name={student.fullName}
                  className="h-12 w-12 rounded-xl shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{student.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {student.level} · {student.grade} — {student.section}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {(student.reincidenceLevel ?? 0) > 0 && (
                    <ReincidenceBadge level={student.reincidenceLevel ?? 0} short />
                  )}
                  <Badge variant="outline" className="text-[10px]">
                    Registrar
                  </Badge>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </CardContent>
  );
}
