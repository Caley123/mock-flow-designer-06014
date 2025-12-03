import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Calendar,
  Clock,
  UserPlus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Search,
  CalendarDays,
  Users,
  TrendingUp,
  Scan,
  ScanLine,
  Calendar as CalendarIcon,
  List,
  Grid3x3,
} from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ModernCalendar } from '@/components/calendar/ModernCalendar';
import { parentMeetingsService, studentsService } from '@/lib/services';
import { ParentMeeting, Student, EducationalLevel } from '@/types';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authService } from '@/lib/services';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const meetingFormSchema = z.object({
  id_estudiante: z.number().min(1, 'Debe seleccionar un estudiante').optional(),
  motivo: z.string().min(5, 'El motivo debe tener al menos 5 caracteres'),
  fecha: z.string().min(1, 'La fecha es requerida'),
  hora: z.string().min(1, 'La hora es requerida'),
  notas: z.string().optional(),
  tipo: z.enum(['individual', 'all', 'grade', 'section', 'students']).default('individual'),
  grade: z.string().optional(),
  section: z.string().optional(),
  level: z.string().optional(),
  studentIds: z.array(z.number()).optional(),
});

type MeetingFormValues = z.infer<typeof meetingFormSchema>;

export const ParentMeetings = () => {
  const [meetings, setMeetings] = useState<ParentMeeting[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<ParentMeeting | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ParentMeeting['estado']>('all');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [stats, setStats] = useState<{
    total: number;
    pendientes: number;
    confirmadas: number;
    completadas: number;
    noAsistieron: number;
    tasaAsistencia: number;
  } | null>(null);
  const isMountedRef = useRef(true);

  const form = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: {
      id_estudiante: 0,
      motivo: '',
      fecha: '',
      hora: '',
      notas: '',
      tipo: 'individual',
    },
  });

  useEffect(() => {
    isMountedRef.current = true;
    loadMeetings();
    loadStudents();
    loadStats();
    
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isMountedRef.current) {
      loadMeetings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const loadMeetings = async () => {
    if (!isMountedRef.current) return;
    
    setLoading(true);
    try {
      const { meetings: meetingsList, error } = await parentMeetingsService.getAll({
        estado: statusFilter === 'all' ? undefined : statusFilter,
      });

      if (!isMountedRef.current) return;

      if (error) {
        toast.error('Error al cargar citas');
        setMeetings([]);
      } else {
        setMeetings(meetingsList);
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Error loading meetings:', error);
      toast.error('Error al procesar las citas');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const loadStudents = async () => {
    if (!isMountedRef.current) return;
    
    try {
      const { students: studentsList } = await studentsService.getAll({ active: true });
      if (!isMountedRef.current) return;
      if (studentsList) {
        setStudents(studentsList);
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Error loading students:', error);
    }
  };

  const loadStats = async () => {
    if (!isMountedRef.current) return;
    
    try {
      const { stats: statsData } = await parentMeetingsService.getStats();
      if (!isMountedRef.current) return;
      if (statsData) {
        setStats(statsData);
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Error loading stats:', error);
    }
  };

  const onSubmit = async (data: MeetingFormValues) => {
    if (!isMountedRef.current) return;
    
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      toast.error('Debe estar autenticado para crear citas');
      return;
    }

    setLoading(true);

    try {
      // Si es cita masiva
      if (data.tipo !== 'individual') {
        const { success, count, error } = await parentMeetingsService.createBulk({
          motivo: data.motivo,
          fecha: data.fecha,
          hora: data.hora,
          id_usuario_creador: currentUser.id,
          notas: data.notas,
          tipo: data.tipo,
          grade: data.grade,
          section: data.section,
          level: data.level,
          studentIds: data.studentIds,
        });

        if (!isMountedRef.current) return;

        if (error) {
          toast.error(error);
        } else {
          toast.success(`${count} citas creadas exitosamente`);
          setBulkDialogOpen(false);
          form.reset();
          loadMeetings();
          loadStats();
        }
      } else {
        // Cita individual
        if (!data.id_estudiante) {
          toast.error('Debe seleccionar un estudiante');
          setLoading(false);
          return;
        }

        const { meeting, error } = await parentMeetingsService.create({
          id_estudiante: data.id_estudiante,
          motivo: data.motivo,
          fecha: data.fecha,
          hora: data.hora,
          id_usuario_creador: currentUser.id,
          notas: data.notas,
        });

        if (!isMountedRef.current) return;

        if (error) {
          toast.error(error);
        } else {
          toast.success('Cita creada exitosamente');
          setDialogOpen(false);
          form.reset();
          loadMeetings();
          loadStats();
        }
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Error en onSubmit:', error);
      toast.error('Error al crear cita');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleMarkAttendance = async (meetingId: number, asistio: boolean, llegadaTarde?: boolean) => {
    if (!isMountedRef.current) return;
    
    try {
      const { success, error } = await parentMeetingsService.markAttendance(meetingId, asistio, llegadaTarde);
      if (!isMountedRef.current) return;
      
      if (error) {
        toast.error(error);
      } else {
        const mensaje = llegadaTarde 
          ? 'Asistencia registrada (llegó tarde)' 
          : asistio 
          ? 'Asistencia registrada' 
          : 'Marcado como no asistió';
        toast.success(mensaje);
        loadMeetings();
        loadStats();
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Error en handleMarkAttendance:', error);
      toast.error('Error al registrar asistencia');
    }
  };

  const handleBarcodeScan = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!barcodeInput.trim()) {
      toast.error('Por favor ingrese o escanee el código de barras');
      return;
    }

    setScanning(true);
    try {
      const { success, meetingId, error } = await parentMeetingsService.markAttendanceByBarcode(
        barcodeInput.trim(),
        false // Por defecto no es tarde, se calcula automáticamente
      );

      if (error) {
        toast.error(error);
      } else if (success) {
        toast.success('Asistencia registrada exitosamente');
        setBarcodeInput('');
        loadMeetings();
        loadStats();
      }
    } catch (error: any) {
      toast.error('Error al procesar el código de barras');
      console.error('Error:', error);
    } finally {
      setScanning(false);
    }
  };

  const handleUpdateStatus = async (meetingId: number, nuevoEstado: ParentMeeting['estado']) => {
    const { success, error } = await parentMeetingsService.update(meetingId, { estado: nuevoEstado });
    if (error) {
      toast.error(error);
    } else {
      toast.success('Estado actualizado');
      loadMeetings();
      loadStats();
    }
  };

  const filteredMeetings = meetings.filter((meeting) => {
    const studentName = meeting.student?.fullName ?? '';
    const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Si estamos en modo calendario, filtrar por fecha seleccionada
    if (viewMode === 'calendar' && selectedDate) {
      const meetingDate = new Date(meeting.fecha);
      const selected = new Date(selectedDate);
      const matchesDate = 
        meetingDate.getDate() === selected.getDate() &&
        meetingDate.getMonth() === selected.getMonth() &&
        meetingDate.getFullYear() === selected.getFullYear();
      return matchesSearch && matchesDate;
    }
    
    return matchesSearch;
  });

  // Obtener citas para el calendario (agrupar por fecha)
  const meetingsByDate = meetings.reduce((acc, meeting) => {
    const date = meeting.fecha;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(meeting);
    return acc;
  }, {} as Record<string, ParentMeeting[]>);

  // Obtener citas del día seleccionado
  const selectedDateMeetings = selectedDate 
    ? meetingsByDate[selectedDate.toISOString().split('T')[0]] || []
    : [];

  const getStatusBadge = (estado: ParentMeeting['estado']) => {
    const variants: Record<ParentMeeting['estado'], { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
      'Pendiente': { variant: 'outline', className: 'border-amber-500 text-amber-700' },
      'Confirmada': { variant: 'default', className: 'bg-blue-100 text-blue-700' },
      'Reprogramada': { variant: 'secondary', className: 'bg-gray-100 text-gray-700' },
      'Completada': { variant: 'default', className: 'bg-green-100 text-green-700' },
      'No asistió': { variant: 'destructive', className: 'bg-red-100 text-red-700' },
      'Cancelada': { variant: 'destructive', className: 'bg-gray-100 text-gray-700' },
    };
    const config = variants[estado];
    return (
      <Badge variant={config.variant} className={config.className}>
        {estado}
      </Badge>
    );
  };

  // Obtener fecha mínima (hoy)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Gestión de Citas con Padres</h1>
        <p className="text-muted-foreground">Programa y gestiona las reuniones con padres de familia</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Citas</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.pendientes}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confirmadas</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.confirmadas}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completadas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completadas}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">No Asistieron</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.noAsistieron}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa Asistencia</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.tasaAsistencia}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Scanner de código de barras para asistencia - Versión mejorada */}
      <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                <ScanLine className="w-5 h-5 text-white" />
              </div>
              Registro Rápido de Asistencia
            </CardTitle>
            <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700">
              <CheckCircle className="w-3 h-3 mr-1" />
              Sistema Digital
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Escanee el carnet del estudiante para registrar automáticamente la asistencia del padre. 
            No se requiere cuaderno ni firma física.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleBarcodeScan} className="space-y-4">
            <div className="relative">
              <Scan className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
              <Input
                placeholder="Escanee o ingrese el código de barras del estudiante"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleBarcodeScan(e);
                  }
                }}
                className="pl-12 h-14 text-lg font-mono border-2 border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                autoFocus
                disabled={scanning}
              />
            </div>
            <Button 
              type="submit" 
              disabled={scanning || !barcodeInput.trim()}
              className="w-full h-14 text-lg bg-gradient-to-r from-primary via-primary-dark to-primary hover:from-primary-dark hover:via-primary hover:to-primary-dark shadow-lg hover:shadow-xl transition-all"
            >
              {scanning ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Procesando código de barras...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Registrar Asistencia Automáticamente
                </>
              )}
            </Button>
          </form>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Ventajas del sistema digital:</strong> Registro instantáneo, sin papel, 
              detección automática de tardanzas, y acceso inmediato a historial.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Vista de Calendario Moderno */}
      <Card className="h-[800px]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Calendario de Citas</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkDialogOpen(true)}
              >
                <Users className="w-4 h-4 mr-2" />
                Citas Masivas
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('calendar')}
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                Calendario
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4 mr-2" />
                Lista
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-full p-0">
          {viewMode === 'calendar' ? (
            <div className="h-full">
              <ModernCalendar
                events={meetings.map(m => ({
                  id: m.id,
                  title: m.motivo,
                  start: new Date(`${m.fecha}T${m.hora}`),
                  end: new Date(`${m.fecha}T${m.hora}`),
                  student: m.student ? {
                    id: m.student.id,
                    fullName: m.student.fullName,
                    grade: m.student.grade,
                    section: m.student.section,
                  } : undefined,
                  estado: m.estado,
                  motivo: m.motivo,
                  color: m.estado === 'Pendiente' ? 'amber' : m.estado === 'Confirmada' ? 'blue' : m.estado === 'Completada' ? 'green' : 'gray',
                }))}
                onDateClick={(date) => {
                  setSelectedDate(date);
                  form.setValue('fecha', format(date, 'yyyy-MM-dd'));
                  setDialogOpen(true);
                }}
                onEventClick={(event) => {
                  const meeting = meetings.find(m => m.id === event.id);
                  if (meeting) {
                    setSelectedMeeting(meeting);
                    setViewDialogOpen(true);
                  }
                }}
                onCreateEvent={(date, time) => {
                  setSelectedDate(date);
                  form.setValue('fecha', format(date, 'yyyy-MM-dd'));
                  if (time) {
                    form.setValue('hora', time);
                  }
                  setDialogOpen(true);
                }}
                defaultView="week"
                currentDate={selectedDate || new Date()}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Filters para vista de lista */}
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por estudiante..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                    <SelectItem value="Confirmada">Confirmada</SelectItem>
                    <SelectItem value="Reprogramada">Reprogramada</SelectItem>
                    <SelectItem value="Completada">Completada</SelectItem>
                    <SelectItem value="No asistió">No asistió</SelectItem>
                    <SelectItem value="Cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => setDialogOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Nueva Cita
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table - Solo en modo lista */}
      {viewMode === 'list' && (
        <Card>
          <CardHeader>
            <CardTitle>Lista de Citas</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-3">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Cargando citas...</span>
              </div>
            ) : filteredMeetings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay citas para mostrar
              </div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Asistencia</TableHead>
                  <TableHead>Puntualidad</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMeetings.map((meeting) => (
                  <TableRow key={meeting.id}>
                    <TableCell className="font-medium">
                      {meeting.student?.fullName}
                      <div className="text-sm text-muted-foreground">
                        {meeting.student?.level} • {meeting.student?.grade} {meeting.student?.section}
                      </div>
                    </TableCell>
                    <TableCell>{meeting.motivo}</TableCell>
                    <TableCell>
                      {format(new Date(meeting.fecha), 'dd/MM/yyyy', { locale: es })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {meeting.hora}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(meeting.estado)}</TableCell>
                    <TableCell>
                      {meeting.asistencia === null ? (
                        <span className="text-muted-foreground text-sm">Pendiente</span>
                      ) : meeting.asistencia ? (
                        <Badge variant="default" className="bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Asistió
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          No asistió
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {meeting.asistencia === true ? (
                        meeting.llegadaTarde ? (
                          <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50">
                            <Clock className="h-3 w-3 mr-1" />
                            Llegó tarde
                            {meeting.horaLlegadaReal && (
                              <span className="ml-1 text-xs">({meeting.horaLlegadaReal})</span>
                            )}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            A tiempo
                          </Badge>
                        )
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedMeeting(meeting);
                            setViewDialogOpen(true);
                          }}
                        >
                          Ver
                        </Button>
                        {meeting.estado === 'Pendiente' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(meeting.id, 'Confirmada')}
                            >
                              Confirmar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(meeting.id, 'Cancelada')}
                            >
                              Cancelar
                            </Button>
                          </>
                        )}
                        {(meeting.estado === 'Confirmada' || meeting.estado === 'Pendiente') && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleMarkAttendance(meeting.id, true, false)}
                            >
                              A tiempo
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-amber-500 text-amber-700 hover:bg-amber-50"
                              onClick={() => handleMarkAttendance(meeting.id, true, true)}
                            >
                              Tarde
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleMarkAttendance(meeting.id, false)}
                            >
                              No Asistió
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Meeting Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Cita con Padre</DialogTitle>
            <DialogDescription>
              Programe una nueva reunión con el padre o apoderado del estudiante.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Cita</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value !== 'individual') {
                          setDialogOpen(false);
                          setBulkDialogOpen(true);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="all">Todos los Padres (APAFA)</SelectItem>
                        <SelectItem value="grade">Por Grado</SelectItem>
                        <SelectItem value="section">Por Sección</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="id_estudiante"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estudiante</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar estudiante" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={String(student.id)}>
                            {student.fullName} - {student.level} {student.grade} {student.section}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="motivo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo de la Cita</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Revisión de incidencias, Rendimiento académico..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fecha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha</FormLabel>
                      <FormControl>
                        <Input type="date" min={getMinDate()} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hora"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Información adicional sobre la cita..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Crear Cita'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Bulk Create Meeting Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Citas Masivas</DialogTitle>
            <DialogDescription>
              Programe citas para múltiples padres de familia. Puede crear citas para todos los padres, por grado o por sección.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Cita Masiva</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">Todos los Padres (Junta APAFA)</SelectItem>
                        <SelectItem value="grade">Por Grado</SelectItem>
                        <SelectItem value="section">Por Sección</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch('tipo') === 'grade' && (
                <>
                  <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nivel Educativo</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar nivel" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Primaria">Primaria</SelectItem>
                            <SelectItem value="Secundaria">Secundaria</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="grade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grado</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar grado" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1ro">1ro</SelectItem>
                            <SelectItem value="2do">2do</SelectItem>
                            <SelectItem value="3ro">3ro</SelectItem>
                            <SelectItem value="4to">4to</SelectItem>
                            <SelectItem value="5to">5to</SelectItem>
                            <SelectItem value="6to">6to</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              {form.watch('tipo') === 'section' && (
                <>
                  <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nivel Educativo</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar nivel" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Primaria">Primaria</SelectItem>
                            <SelectItem value="Secundaria">Secundaria</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="grade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grado</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar grado" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1ro">1ro</SelectItem>
                            <SelectItem value="2do">2do</SelectItem>
                            <SelectItem value="3ro">3ro</SelectItem>
                            <SelectItem value="4to">4to</SelectItem>
                            <SelectItem value="5to">5to</SelectItem>
                            <SelectItem value="6to">6to</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="section"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sección</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar sección" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                            <SelectItem value="D">D</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              <FormField
                control={form.control}
                name="motivo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo de la Cita</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Junta de APAFA, Reunión de padres de 3ro A..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fecha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha</FormLabel>
                      <FormControl>
                        <Input type="date" min={getMinDate()} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hora"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Información adicional sobre la cita..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setBulkDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creando citas...
                    </>
                  ) : (
                    'Crear Citas Masivas'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Meeting Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles de la Cita</DialogTitle>
          </DialogHeader>
          {selectedMeeting && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Estudiante</Label>
                  <p className="text-lg font-semibold">{selectedMeeting.student?.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedMeeting.student?.level} • {selectedMeeting.student?.grade} {selectedMeeting.student?.section}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Estado</Label>
                  <div className="mt-1">{getStatusBadge(selectedMeeting.estado)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fecha</Label>
                  <p className="text-lg font-semibold">
                    {format(new Date(selectedMeeting.fecha), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Hora</Label>
                  <p className="text-lg font-semibold">{selectedMeeting.hora}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Motivo</Label>
                  <p className="text-lg font-semibold">{selectedMeeting.motivo}</p>
                </div>
                {selectedMeeting.notas && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Notas</Label>
                    <p className="text-sm">{selectedMeeting.notas}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Creada por</Label>
                  <p className="text-sm">{selectedMeeting.createdByUser?.fullName || 'Sistema'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Asistencia</Label>
                  <div className="mt-1">
                    {selectedMeeting.asistencia === null ? (
                      <Badge variant="outline">Pendiente</Badge>
                    ) : selectedMeeting.asistencia ? (
                      <Badge variant="default" className="bg-green-100 text-green-700">
                        Asistió
                      </Badge>
                    ) : (
                      <Badge variant="destructive">No asistió</Badge>
                    )}
                  </div>
                </div>
                {selectedMeeting.asistencia === true && (
                  <div>
                    <Label className="text-muted-foreground">Puntualidad</Label>
                    <div className="mt-1">
                      {selectedMeeting.llegadaTarde ? (
                        <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50">
                          <Clock className="h-3 w-3 mr-1" />
                          Llegó tarde
                          {selectedMeeting.horaLlegadaReal && (
                            <span className="ml-1">({selectedMeeting.horaLlegadaReal})</span>
                          )}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          A tiempo
                          {selectedMeeting.horaLlegadaReal && (
                            <span className="ml-1">({selectedMeeting.horaLlegadaReal})</span>
                          )}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

