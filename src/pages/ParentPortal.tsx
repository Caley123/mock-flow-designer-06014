import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  User,
  Phone,
  Mail,
} from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { arrivalService, studentsService, parentMeetingsService } from '@/lib/services';
import { ArrivalRecord, ParentMeeting, Student } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { authService } from '@/lib/services';

export const ParentPortal = () => {
  const [student, setStudent] = useState<Student | null>(null);
  const [arrivalRecords, setArrivalRecords] = useState<ArrivalRecord[]>([]);
  const [meetings, setMeetings] = useState<ParentMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    loadStudentData();
    
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isMountedRef.current && student) {
      loadArrivalRecords();
      loadMeetings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student, selectedDate]);

  const loadStudentData = async () => {
    if (!isMountedRef.current) return;
    
    setLoading(true);
    try {
      // En un sistema real, el padre estaría vinculado a un estudiante específico
      // Por ahora, vamos a obtener el estudiante del usuario actual o permitir selección
      const user = authService.getCurrentUser();
      
      // TODO: Implementar lógica para obtener el estudiante vinculado al padre
      // Por ahora, usaremos un estudiante de ejemplo o permitiremos selección
      
      // Cargar todos los estudiantes activos para selección (temporal)
      const { students } = await studentsService.getAll({ active: true });
      if (!isMountedRef.current) return;
      
      if (students.length > 0) {
        // En producción, esto vendría de la relación padre-estudiante
        setStudent(students[0]); // Temporal: usar el primero
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Error loading student data:', error);
      toast.error('Error al cargar información del estudiante');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const loadArrivalRecords = async () => {
    if (!student || !isMountedRef.current) return;

    try {
      const { records, error } = await arrivalService.getArrivals({
        studentId: student.id,
        date: selectedDate || undefined,
      });

      if (!isMountedRef.current) return;

      if (error) {
        toast.error('Error al cargar registros de asistencia');
      } else {
        setArrivalRecords(records);
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Error loading arrival records:', error);
    }
  };

  const loadMeetings = async () => {
    if (!student || !isMountedRef.current) return;

    try {
      const { meetings: meetingsList, error } = await parentMeetingsService.getAll({
        estudianteId: student.id,
      });

      if (!isMountedRef.current) return;

      if (error) {
        console.error('Error loading meetings:', error);
      } else {
        setMeetings(meetingsList);
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Error loading meetings:', error);
    }
  };

  // Obtener alertas de salidas no registradas
  const getDepartureAlerts = () => {
    if (!student) return [];
    
    const today = new Date().toISOString().split('T')[0];
    return arrivalRecords.filter(
      record => 
        record.date === today && 
        !record.departureTime &&
        record.arrivalTime
    );
  };

  const departureAlerts = getDepartureAlerts();

  // Obtener estadísticas del mes actual
  const getMonthlyStats = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const monthRecords = arrivalRecords.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= firstDay && recordDate <= lastDay;
    });

    const onTime = monthRecords.filter(r => r.status === 'A tiempo').length;
    const late = monthRecords.filter(r => r.status === 'Tarde').length;
    const withDeparture = monthRecords.filter(r => r.departureTime).length;

    return {
      total: monthRecords.length,
      onTime,
      late,
      withDeparture,
      attendanceRate: monthRecords.length > 0 ? Math.round((onTime / monthRecords.length) * 100) : 0,
    };
  };

  const monthlyStats = getMonthlyStats();

  if (loading) {
    return <PageLoader message="Cargando información del estudiante..." />;
  }

  if (!student) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2">No se encontró información del estudiante</p>
              <p className="text-muted-foreground">
                Por favor, contacte con la administración para vincular su cuenta con un estudiante.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header con información del estudiante */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{student.fullName}</h1>
                <p className="text-muted-foreground">
                  {student.level} • {student.grade} {student.section}
                </p>
                {student.contactPhone && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {student.contactPhone}
                  </div>
                )}
                {student.contactEmail && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {student.contactEmail}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-lg px-4 py-2">
                Portal de Padres
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas de salidas no registradas */}
      {departureAlerts.length > 0 && (
        <Card className="border-l-4 border-amber-500 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              Alerta: Salida No Registrada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-700">
              Su hijo/a llegó a las {departureAlerts[0].arrivalTime} pero no se ha registrado su salida.
              Por favor, contacte con la institución si tiene alguna consulta.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Estadísticas del mes */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asistencias del Mes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyStats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {monthlyStats.attendanceRate}% puntualidad
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Tiempo</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{monthlyStats.onTime}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tardanzas</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{monthlyStats.late}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salidas Registradas</CardTitle>
            <LogOut className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{monthlyStats.withDeparture}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtro de fecha */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Fecha</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  const today = new Date();
                  setSelectedDate(today.toISOString().split('T')[0]);
                }}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
              >
                Hoy
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registros de asistencia */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de Asistencia</CardTitle>
        </CardHeader>
        <CardContent>
          {arrivalRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay registros para la fecha seleccionada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Hora de Llegada</TableHead>
                  <TableHead>Hora de Salida</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arrivalRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {format(new Date(record.date), 'dd/MM/yyyy', { locale: es })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {record.arrivalTime}
                      </div>
                    </TableCell>
                    <TableCell>
                      {record.departureTime ? (
                        <div className="flex items-center gap-2">
                          <LogOut className="h-4 w-4 text-green-600" />
                          {record.departureTime}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-amber-600">
                          Sin salida
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={record.status === 'A tiempo' ? 'default' : 'destructive'}
                        className={
                          record.status === 'A tiempo'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        }
                      >
                        {record.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Citas programadas */}
      {meetings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Citas Programadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold">{meeting.motivo}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(meeting.fecha), 'dd/MM/yyyy', { locale: es })} a las {meeting.hora}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      meeting.estado === 'Completada'
                        ? 'default'
                        : meeting.estado === 'Cancelada'
                        ? 'destructive'
                        : 'outline'
                    }
                  >
                    {meeting.estado}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

