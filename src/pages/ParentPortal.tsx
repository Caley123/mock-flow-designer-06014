import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  LogOut,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Phone,
  Mail,
  FileText,
  BarChart3,
  User as UserIcon,
  GraduationCap,
} from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import {
  arrivalService,
  authService,
  incidentsService,
  parentMeetingsService,
  parentPortalService,
} from '@/lib/services';
import type { ArrivalRecord, Incident, ParentMeeting, Student } from '@/types';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { getLimaTodayDate } from '@/lib/utils/limaDateTime';
import { StudentPhoto } from '@/components/shared/StudentPhoto';
import { ReincidenceBadge } from '@/components/shared/ReincidenceBadge';
import { getReincidenceLevelDescription } from '@/lib/utils/reincidenceUtils';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const ParentPortal = () => {
  const currentUser = authService.getCurrentUser();
  const userId = currentUser?.id;
  const isParentRole = currentUser?.role === 'Padre';

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [student, setStudent] = useState<Student | null>(null);
  const [arrivalRecords, setArrivalRecords] = useState<ArrivalRecord[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [meetings, setMeetings] = useState<ParentMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTab, setLoadingTab] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => getLimaTodayDate());
  const [reportMonth, setReportMonth] = useState(() => String(new Date().getMonth()));
  const [reportYear, setReportYear] = useState(() => String(new Date().getFullYear()));

  // userId estable: getCurrentUser() devuelve objeto nuevo cada render y causaba bucle infinito
  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
      const user = authService.getCurrentUser();
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }

      if (!cancelled) setLoading(true);

      const { students: list, error } = await parentPortalService.getLinkedStudents(user);
      if (cancelled) return;

      if (error && list.length === 0) {
        toast.error(error);
        setStudents([]);
        setStudent(null);
        setSelectedStudentId('');
      } else {
        setStudents(list);
        if (list.length > 0) {
          setSelectedStudentId((prev) => {
            if (prev && list.some((s) => String(s.id) === prev)) return prev;
            return String(list[0].id);
          });
        }
      }
      setLoading(false);
    }

    void loadStudents();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!selectedStudentId) {
      setStudent(null);
      return;
    }
    const found = students.find((s) => String(s.id) === selectedStudentId);
    setStudent(found ?? null);
  }, [selectedStudentId, students]);

  useEffect(() => {
    const studentId = Number(selectedStudentId);
    if (!studentId) return;

    let cancelled = false;

    async function loadStudentDetails() {
      setLoadingTab(true);
      try {
        const [arrivalsRes, incidentsRes, meetingsRes] = await Promise.all([
          arrivalService.getArrivals({ studentId, limit: 120 }),
          incidentsService.getAll({ estudianteId: studentId, limit: 40 }),
          parentMeetingsService.getAll({ estudianteId: studentId }),
        ]);

        if (cancelled) return;

        if (arrivalsRes.error) toast.error('No se pudo cargar asistencia');
        else setArrivalRecords(arrivalsRes.records);

        if (!incidentsRes.error) setIncidents(incidentsRes.incidents);
        if (!meetingsRes.error) setMeetings(meetingsRes.meetings);
      } finally {
        if (!cancelled) setLoadingTab(false);
      }
    }

    void loadStudentDetails();
    return () => {
      cancelled = true;
    };
  }, [selectedStudentId]);

  const filteredArrivalsByDay = useMemo(() => {
    return arrivalRecords.filter((r) => r.date?.slice(0, 10) === selectedDate);
  }, [arrivalRecords, selectedDate]);

  const monthlyReport = useMemo(() => {
    const month = Number(reportMonth);
    const year = Number(reportYear);
    const start = startOfMonth(new Date(year, month, 1));
    const end = endOfMonth(start);

    const inMonth = arrivalRecords.filter((r) => {
      try {
        if (!r.date) return false;
        const d = parseISO(r.date.slice(0, 10));
        return isWithinInterval(d, { start, end });
      } catch {
        return false;
      }
    });

    const onTime = inMonth.filter((r) => r.status === 'A tiempo').length;
    const late = inMonth.filter((r) => r.status === 'Tarde').length;
    const withDeparture = inMonth.filter((r) => r.departureTime).length;

    return {
      total: inMonth.length,
      onTime,
      late,
      withDeparture,
      punctuality: inMonth.length > 0 ? Math.round((onTime / inMonth.length) * 100) : 0,
      rows: inMonth.sort((a, b) => b.date.localeCompare(a.date)),
    };
  }, [arrivalRecords, reportMonth, reportYear]);

  const departureAlerts = useMemo(() => {
    const today = getLimaTodayDate();
    return arrivalRecords.filter(
      (r) => r.date === today && r.arrivalTime && !r.departureTime
    );
  }, [arrivalRecords]);

  const activeIncidents = useMemo(
    () => incidents.filter((i) => i.status === 'Activa'),
    [incidents]
  );

  if (loading) {
    return <PageLoader message="Cargando portal familiar..." />;
  }

  if (!currentUser || students.length === 0) {
    return (
      <div className="app-page max-w-lg mx-auto">
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Sin estudiantes vinculados</h2>
            <p className="text-muted-foreground text-sm">
              {isParentRole
                ? 'Su cuenta de apoderado aún no está asociada a un alumno. Solicite el vínculo en secretaría.'
                : 'No hay estudiantes para mostrar. Use el script CREAR_PADRES_ESTUDIANTES.sql o asigne studentIds en grados_asignados.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="app-page space-y-6">
      {/* Cabecera */}
      <Card className="border-0 shadow-lg overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {student && (
                <StudentPhoto
                  src={student.profilePhoto}
                  name={student.fullName}
                  className="h-20 w-20 border-2 border-white/30"
                  imageClassName="object-cover"
                />
              )}
              <div>
                <p className="text-xs uppercase tracking-wide text-white/70 mb-1">
                  Portal de padres de familia
                </p>
                <h1 className="text-2xl font-bold">{student?.fullName ?? '—'}</h1>
                <p className="text-white/85 flex items-center gap-2 mt-1">
                  <GraduationCap className="h-4 w-4" />
                  {student?.level} · {student?.grade} {student?.section}
                </p>
                <p className="text-sm text-white/70 mt-1">DNI / código: {student?.barcode}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 min-w-[200px]">
              {students.length > 1 && (
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Seleccionar hijo/a" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {student && student.reincidenceLevel !== undefined && (
                <div className="flex items-center gap-2">
                  <ReincidenceBadge level={student.reincidenceLevel} />
                  <span className="text-xs text-white/80">
                    {getReincidenceLevelDescription(student.reincidenceLevel)}
                  </span>
                </div>
              )}
              {!isParentRole && (
                <Badge variant="secondary" className="w-fit">
                  Vista personal (prueba)
                </Badge>
              )}
            </div>
          </div>
          {(student?.contactPhone || student?.contactEmail || student?.responsibleName) && (
            <div className="mt-4 pt-4 border-t border-white/20 flex flex-wrap gap-4 text-sm text-white/85">
              {student.responsibleName && (
                <span className="flex items-center gap-1">
                  <UserIcon className="h-4 w-4" />
                  {student.responsibleName}
                  {student.responsibleRelationship ? ` (${student.responsibleRelationship})` : ''}
                </span>
              )}
              {student.contactPhone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {student.contactPhone}
                </span>
              )}
              {student.contactEmail && (
                <span className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {student.contactEmail}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {departureAlerts.length > 0 && (
        <Card className="border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-4">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Hoy llegó a las {departureAlerts[0].arrivalTime} y aún no se registró su salida.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="resumen" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
          <TabsTrigger value="incidencias">Incidencias</TabsTrigger>
          <TabsTrigger value="citas">Citas</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Asistencias (mes actual)"
              value={monthlyReport.total}
              sub={`${monthlyReport.punctuality}% a tiempo`}
              icon={Calendar}
            />
            <StatCard title="A tiempo" value={monthlyReport.onTime} icon={CheckCircle} accent="text-emerald-600" />
            <StatCard title="Tardanzas" value={monthlyReport.late} icon={Clock} accent="text-orange-600" />
            <StatCard title="Incidencias activas" value={activeIncidents.length} icon={FileText} accent="text-destructive" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Reporte mensual de asistencia
              </CardTitle>
              <CardDescription>Llegadas y salidas del mes seleccionado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Select value={reportMonth} onValueChange={setReportMonth}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((name, i) => (
                      <SelectItem key={name} value={String(i)}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={reportYear} onValueChange={setReportYear}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2025, 2026].map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {monthlyReport.rows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Sin registros en {MONTH_NAMES[Number(reportMonth)]} {reportYear}
                </p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Llegada</TableHead>
                        <TableHead>Salida</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyReport.rows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            {r.date
                              ? format(parseISO(r.date.slice(0, 10)), 'dd/MM/yyyy', { locale: es })
                              : '—'}
                          </TableCell>
                          <TableCell>{r.arrivalTime || '—'}</TableCell>
                          <TableCell>{r.departureTime || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={r.status === 'A tiempo' ? 'default' : 'destructive'}>
                              {r.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {incidents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Últimas incidencias</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {incidents.slice(0, 3).map((inc) => (
                  <IncidentRow key={inc.id} incident={inc} />
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="asistencia" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Consulta por día</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-sm font-medium mb-1 block">Fecha</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <Button type="button" variant="secondary" onClick={() => setSelectedDate(getLimaTodayDate())}>
                Hoy
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registros del día</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTab ? (
                <PageLoader message="Cargando..." />
              ) : filteredArrivalsByDay.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  Sin registros para esta fecha
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Llegada</TableHead>
                      <TableHead>Salida</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredArrivalsByDay.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.arrivalTime}</TableCell>
                        <TableCell>
                          {r.departureTime ? (
                            r.departureTime
                          ) : (
                            <Badge variant="outline" className="text-amber-600">
                              Sin salida
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.status === 'A tiempo' ? 'default' : 'destructive'}>
                            {r.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidencias" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historial de incidencias</CardTitle>
              <CardDescription>
                Conducta, uniforme, puntualidad y otras faltas registradas en el colegio
              </CardDescription>
            </CardHeader>
            <CardContent>
              {incidents.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  No hay incidencias registradas
                </p>
              ) : (
                <div className="space-y-3">
                  {incidents.map((inc) => (
                    <IncidentRow key={inc.id} incident={inc} detailed />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="citas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Citas con la institución</CardTitle>
            </CardHeader>
            <CardContent>
              {meetings.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  No tiene citas programadas
                </p>
              ) : (
                <div className="space-y-3">
                  {meetings.map((m) => (
                    <div
                      key={m.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 rounded-lg border"
                    >
                      <div className="flex gap-3">
                        <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">{m.motivo}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(m.fecha), 'dd/MM/yyyy', { locale: es })} · {m.hora}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          m.estado === 'Completada'
                            ? 'default'
                            : m.estado === 'Cancelada'
                              ? 'destructive'
                              : 'outline'
                        }
                      >
                        {m.estado}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-center text-muted-foreground pb-4">
        Bienvenido, {currentUser.fullName}. Ante dudas contacte a secretaría del colegio.
      </p>
    </div>
  );
};

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  title: string;
  value: number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${accent ?? 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${accent ?? ''}`}>{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function IncidentRow({ incident, detailed }: { incident: Incident; detailed?: boolean }) {
  const faultName = incident.faultType?.name ?? 'Falta registrada';
  const dateStr = incident.registeredAt
    ? format(new Date(incident.registeredAt), 'dd/MM/yyyy HH:mm', { locale: es })
    : '—';

  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{faultName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{dateStr}</p>
          {detailed && incident.faultType?.category && (
            <Badge variant="outline" className="mt-2">
              {incident.faultType.category}
            </Badge>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge
            variant={
              incident.status === 'Activa'
                ? 'destructive'
                : incident.status === 'Justificada'
                  ? 'default'
                  : 'secondary'
            }
          >
            {incident.status}
          </Badge>
          <ReincidenceBadge level={incident.reincidenceLevel ?? 0} />
        </div>
      </div>
      {detailed && incident.observations && (
        <p className="text-sm text-muted-foreground mt-2 border-t pt-2">{incident.observations}</p>
      )}
    </div>
  );
}
