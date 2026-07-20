import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
  BookOpen,
  CalendarDays,
  Clock3,
  Edit,
  Loader2,
  RefreshCw,
  Search,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoader } from '@/components/ui/page-loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StudentPhoto } from '@/components/shared/StudentPhoto';
import {
  StaffDataPanel,
  StaffDataPanelBody,
  StaffDataPanelHeader,
  StaffEmptyState,
  StaffKpiStat,
  StaffToolbar,
} from '@/components/staff';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { studentsService, talleresService } from '@/lib/services';
import type { Student, Taller, TallerInscrito } from '@/types';

const WEEK_DAYS = [
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
  { value: 7, label: 'Domingo', short: 'Dom' },
] as const;

const tallerFormSchema = z
  .object({
    nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(120, 'Máximo 120 caracteres'),
    descripcion: z.string().max(300, 'Máximo 300 caracteres').optional(),
    diaSemana: z.array(z.number().int().min(1).max(7)).default([]),
    horaInicio: z.string().optional(),
    horaFin: z.string().optional(),
    activo: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.horaInicio && data.horaFin && data.horaFin <= data.horaInicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['horaFin'],
        message: 'La hora de fin debe ser posterior a la hora de inicio',
      });
    }
  });

type TallerFormValues = z.infer<typeof tallerFormSchema>;

const tallerFormDefaults: TallerFormValues = {
  nombre: '',
  descripcion: '',
  diaSemana: [],
  horaInicio: '',
  horaFin: '',
  activo: true,
};

function formatSchedule(taller: Taller): string {
  if (!taller.horaInicio && !taller.horaFin) return 'Sin horario registrado';
  if (taller.horaInicio && taller.horaFin) return `${taller.horaInicio} - ${taller.horaFin}`;
  return taller.horaInicio ? `Desde ${taller.horaInicio}` : `Hasta ${taller.horaFin}`;
}

function formatDays(days: number[] | null): string {
  if (!days?.length) return 'Sin días asignados';
  return [...days]
    .sort((a, b) => a - b)
    .map((day) => WEEK_DAYS.find((item) => item.value === day)?.label ?? `Día ${day}`)
    .join(', ');
}

export const TalleresAdmin = () => {
  const [talleres, setTalleres] = useState<Taller[]>([]);
  const [inscritos, setInscritos] = useState<TallerInscrito[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inscritosLoading, setInscritosLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTaller, setEditingTaller] = useState<Taller | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTallerId, setSelectedTallerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [processingStudentId, setProcessingStudentId] = useState<number | null>(null);
  const isMountedRef = useRef(true);
  const debouncedStudentSearch = useDebouncedValue(studentSearch, 350);

  const form = useForm<TallerFormValues>({
    resolver: zodResolver(tallerFormSchema),
    defaultValues: tallerFormDefaults,
  });

  const loadTalleres = async (preferredSelectedId?: string, silent?: boolean) => {
    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const { talleres: talleresList, error } = await talleresService.listAll();

      if (!isMountedRef.current) return;

      if (error) {
        toast.error(error);
        setTalleres([]);
        setSelectedTallerId(null);
        return;
      }

      setTalleres(talleresList);
      setSelectedTallerId((currentSelectedId) => {
        const nextSelectedId = preferredSelectedId ?? currentSelectedId;
        if (nextSelectedId && talleresList.some((taller) => taller.id === nextSelectedId)) {
          return nextSelectedId;
        }
        return talleresList[0]?.id ?? null;
      });
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Error al cargar talleres:', error);
      toast.error('No se pudieron cargar los talleres');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const loadInscritos = async (tallerId: string) => {
    setInscritosLoading(true);

    try {
      const { inscritos: inscritosList, error } = await talleresService.listInscritos(tallerId);

      if (!isMountedRef.current) return;

      if (error) {
        toast.error(error);
        setInscritos([]);
        return;
      }

      setInscritos(inscritosList);
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Error al cargar inscritos:', error);
      toast.error('No se pudieron cargar los inscritos');
    } finally {
      if (isMountedRef.current) {
        setInscritosLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    void loadTalleres();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedTallerId) {
      setInscritos([]);
      setStudentResults([]);
      return;
    }

    void loadInscritos(selectedTallerId);
  }, [selectedTallerId]);

  useEffect(() => {
    if (!selectedTallerId) {
      setStudentResults([]);
      return;
    }

    if (debouncedStudentSearch.trim().length < 2) {
      setStudentResults([]);
      return;
    }

    let cancelled = false;
    setStudentsLoading(true);

    void studentsService.searchByName(debouncedStudentSearch, 25).then(({ students, error }) => {
      if (cancelled || !isMountedRef.current) return;
      if (error) {
        toast.error(error);
        setStudentResults([]);
      } else {
        setStudentResults(students.filter((student) => student.active));
      }
      setStudentsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedStudentSearch, selectedTallerId]);

  const selectedTaller = useMemo(
    () => talleres.find((taller) => taller.id === selectedTallerId) ?? null,
    [selectedTallerId, talleres],
  );

  const filteredTalleres = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();
    if (!normalizedQuery) return talleres;

    return talleres.filter((taller) => {
      return (
        taller.nombre.toLowerCase().includes(normalizedQuery) ||
        (taller.descripcion ?? '').toLowerCase().includes(normalizedQuery)
      );
    });
  }, [searchTerm, talleres]);

  const availableStudentResults = useMemo(() => {
    const enrolledIds = new Set(inscritos.map((inscrito) => inscrito.studentId));
    return studentResults.filter((student) => !enrolledIds.has(student.id));
  }, [inscritos, studentResults]);

  const stats = useMemo(() => {
    const activos = talleres.filter((taller) => taller.activo).length;
    return {
      total: talleres.length,
      activos,
      inactivos: talleres.length - activos,
      inscritos: inscritos.length,
    };
  }, [inscritos.length, talleres]);

  const openCreateDialog = () => {
    setEditingTaller(null);
    form.reset(tallerFormDefaults);
    setDialogOpen(true);
  };

  const openEditDialog = (taller: Taller) => {
    setEditingTaller(taller);
    form.reset({
      nombre: taller.nombre,
      descripcion: taller.descripcion ?? '',
      diaSemana: taller.diaSemana ?? [],
      horaInicio: taller.horaInicio ?? '',
      horaFin: taller.horaFin ?? '',
      activo: taller.activo,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: TallerFormValues) => {
    setSubmitting(true);

    const payload = {
      nombre: values.nombre.trim(),
      descripcion: values.descripcion?.trim() || null,
      diaSemana: values.diaSemana.length > 0 ? values.diaSemana : null,
      horaInicio: values.horaInicio?.trim() || null,
      horaFin: values.horaFin?.trim() || null,
    };

    try {
      if (editingTaller) {
        const { taller, error } = await talleresService.update(editingTaller.id, payload);
        if (error || !taller) {
          toast.error(error || 'No se pudo actualizar el taller');
          return;
        }

        if (editingTaller.activo !== values.activo) {
          const stateChange = await talleresService.setActivo(editingTaller.id, values.activo);
          if (stateChange.error || !stateChange.success) {
            toast.error(stateChange.error || 'No se pudo actualizar el estado del taller');
            return;
          }
        }

        toast.success('Taller actualizado');
        setDialogOpen(false);
        setEditingTaller(null);
        form.reset(tallerFormDefaults);
        await loadTalleres(editingTaller.id, true);
        return;
      }

      const { taller, error } = await talleresService.create(payload);
      if (error || !taller) {
        toast.error(error || 'No se pudo crear el taller');
        return;
      }

      if (!values.activo) {
        const stateChange = await talleresService.setActivo(taller.id, false);
        if (stateChange.error || !stateChange.success) {
          toast.error(stateChange.error || 'No se pudo ajustar el estado inicial del taller');
          return;
        }
      }

      toast.success('Taller creado');
      setDialogOpen(false);
      form.reset(tallerFormDefaults);
      await loadTalleres(taller.id, true);
    } catch (error) {
      console.error('Error al guardar taller:', error);
      toast.error('Ocurrió un error al guardar el taller');
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  const handleAddStudent = async (student: Student) => {
    if (!selectedTaller) return;

    setProcessingStudentId(student.id);
    try {
      const { error } = await talleresService.addInscrito(selectedTaller.id, student.id);
      if (error) {
        toast.error(error);
        return;
      }

      toast.success('Alumno inscrito en el taller');
      setStudentSearch('');
      setStudentResults([]);
      await loadInscritos(selectedTaller.id);
    } catch (error) {
      console.error('Error al inscribir alumno:', error);
      toast.error('No se pudo inscribir al alumno');
    } finally {
      if (isMountedRef.current) {
        setProcessingStudentId(null);
      }
    }
  };

  const handleRemoveStudent = async (studentId: number) => {
    if (!selectedTaller) return;

    setProcessingStudentId(studentId);
    try {
      const { success, error } = await talleresService.removeInscrito(selectedTaller.id, studentId);
      if (error || !success) {
        toast.error(error || 'No se pudo quitar la inscripción');
        return;
      }

      toast.success('Inscripción retirada');
      await loadInscritos(selectedTaller.id);
    } catch (error) {
      console.error('Error al retirar inscripción:', error);
      toast.error('No se pudo retirar la inscripción');
    } finally {
      if (isMountedRef.current) {
        setProcessingStudentId(null);
      }
    }
  };

  if (loading && talleres.length === 0) {
    return <PageLoader message="Cargando talleres..." />;
  }

  return (
    <div className="app-page app-page-shell">
      <PageHeader
        icon={BookOpen}
        eyebrow="Talleres"
        title="Administración de Talleres"
        description="Cree talleres, ajuste sus horarios y administre la lista de estudiantes inscritos"
        accent="success"
      >
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingTaller(null);
              form.reset(tallerFormDefaults);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <BookOpen className="mr-2 h-4 w-4" />
              Nuevo taller
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTaller ? 'Editar taller' : 'Crear taller'}</DialogTitle>
              <DialogDescription>
                Configure el nombre, horario y disponibilidad del taller. Los inscritos se administran desde el panel principal.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Fútbol, Robótica, Coro..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descripcion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción (opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Resumen breve del taller, docente responsable o notas para staff"
                          className="min-h-[100px]"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="diaSemana"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Días del taller</FormLabel>
                      <div className="grid grid-cols-2 gap-3 rounded-xl border p-4 sm:grid-cols-4">
                        {WEEK_DAYS.map((day) => {
                          const checked = field.value.includes(day.value);
                          return (
                            <label key={day.value} className="flex items-center gap-2 text-sm font-medium">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(nextChecked) => {
                                  const nextValue = nextChecked
                                    ? [...field.value, day.value]
                                    : field.value.filter((value) => value !== day.value);
                                  field.onChange([...nextValue].sort((a, b) => a - b));
                                }}
                              />
                              <span>{day.label}</span>
                            </label>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="horaInicio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora de inicio</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="horaFin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora de fin</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="activo"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-xl border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Taller activo</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Si lo desactiva, deja de estar disponible para nuevas operaciones.
                        </p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="success" disabled={submitting}>
                    {submitting ? (
                      <span className="flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </span>
                    ) : editingTaller ? (
                      'Guardar cambios'
                    ) : (
                      'Crear taller'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="app-kpi-grid !grid-cols-2 lg:!grid-cols-4">
        <StaffKpiStat label="Total talleres" value={stats.total} icon={BookOpen} tone="primary" />
        <StaffKpiStat label="Activos" value={stats.activos} icon={CalendarDays} tone="success" />
        <StaffKpiStat label="Inactivos" value={stats.inactivos} icon={Clock3} tone="warning" />
        <StaffKpiStat
          label="Inscritos del taller"
          value={selectedTaller ? stats.inscritos : 0}
          hint={selectedTaller ? selectedTaller.nombre : 'Seleccione un taller'}
          icon={Users}
          tone="info"
        />
      </div>

      <StaffToolbar title="Buscar y actualizar" description="Encuentre talleres registrados o recargue la información">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="talleres-search">Buscar taller</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="talleres-search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Nombre o descripción del taller..."
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex items-end">
          <Button variant="outline" className="w-full" onClick={() => void loadTalleres(selectedTallerId ?? undefined, true)} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </StaffToolbar>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.4fr]">
        <StaffDataPanel>
          <StaffDataPanelHeader
            title={`Talleres (${filteredTalleres.length})`}
            description="Seleccione un taller para ver y administrar sus inscritos"
            accent="neutral"
          />
          <StaffDataPanelBody className="space-y-4">
            {filteredTalleres.length === 0 ? (
              <StaffEmptyState
                icon={BookOpen}
                title="No hay talleres para mostrar"
                description="Cree un taller nuevo o pruebe con otra búsqueda"
              />
            ) : (
              <div className="app-table-wrap">
                <Table aria-label="Lista de talleres">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Taller</TableHead>
                      <TableHead>Días</TableHead>
                      <TableHead>Horario</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTalleres.map((taller) => {
                      const isSelected = taller.id === selectedTallerId;
                      return (
                        <TableRow
                          key={taller.id}
                          className={isSelected ? 'bg-primary/5' : undefined}
                          onClick={() => setSelectedTallerId(taller.id)}
                        >
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium">{taller.nombre}</p>
                              <p className="text-xs text-muted-foreground">
                                {taller.descripcion?.trim() || 'Sin descripción'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDays(taller.diaSemana)}</TableCell>
                          <TableCell>{formatSchedule(taller)}</TableCell>
                          <TableCell>
                            <Badge variant={taller.activo ? 'default' : 'secondary'}>
                              {taller.activo ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant={isSelected ? 'default' : 'outline'}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedTallerId(taller.id);
                                }}
                              >
                                Ver
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openEditDialog(taller);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </StaffDataPanelBody>
        </StaffDataPanel>

        <StaffDataPanel>
          <StaffDataPanelHeader
            title={selectedTaller ? `Inscritos: ${selectedTaller.nombre}` : 'Gestión de inscritos'}
            description={
              selectedTaller
                ? `${formatDays(selectedTaller.diaSemana)} · ${formatSchedule(selectedTaller)}`
                : 'Seleccione un taller para administrar su padrón'
            }
            accent="success"
            action={
              selectedTaller ? (
                <Button variant="outline" size="sm" onClick={() => openEditDialog(selectedTaller)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar taller
                </Button>
              ) : null
            }
          />
          <StaffDataPanelBody className="space-y-6">
            {!selectedTaller ? (
              <StaffEmptyState
                icon={Users}
                title="Seleccione un taller"
                description="Desde la tabla de la izquierda podrá abrir el detalle y manejar las inscripciones"
              />
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={selectedTaller.activo ? 'default' : 'secondary'}>
                    {selectedTaller.activo ? 'Disponible' : 'Desactivado'}
                  </Badge>
                  {(selectedTaller.diaSemana ?? []).map((day) => {
                    const weekDay = WEEK_DAYS.find((item) => item.value === day);
                    return (
                      <Badge key={day} variant="outline">
                        {weekDay?.short ?? `Día ${day}`}
                      </Badge>
                    );
                  })}
                </div>

                <section className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Agregar inscritos</h3>
                    <p className="text-xs text-muted-foreground">
                      Busque por nombre para encontrar alumnos activos y agregarlos al taller.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="student-search">Buscar estudiante</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="student-search"
                        value={studentSearch}
                        onChange={(event) => setStudentSearch(event.target.value)}
                        placeholder="Escriba al menos 2 letras..."
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border">
                    {studentsLoading ? (
                      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Buscando estudiantes...
                      </div>
                    ) : debouncedStudentSearch.trim().length < 2 ? (
                      <p className="p-4 text-sm text-muted-foreground">
                        Escriba al menos 2 letras para buscar alumnos por nombre.
                      </p>
                    ) : availableStudentResults.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground">
                        No hay alumnos disponibles con ese criterio o ya están inscritos en este taller.
                      </p>
                    ) : (
                      <div className="divide-y">
                        {availableStudentResults.map((student) => (
                          <div key={student.id} className="flex items-center gap-3 p-4">
                            <StudentPhoto src={student.profilePhoto} name={student.fullName} className="h-10 w-10 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{student.fullName}</p>
                              <p className="text-xs text-muted-foreground">
                                {student.level} · {student.grade} {student.section} · {student.barcode}
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => void handleAddStudent(student)}
                              disabled={processingStudentId === student.id}
                            >
                              {processingStudentId === student.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <UserPlus className="mr-2 h-4 w-4" />
                                  Inscribir
                                </>
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                <section className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Listado de inscritos</h3>
                    <p className="text-xs text-muted-foreground">
                      Revise el padrón del taller y retire inscripciones cuando sea necesario.
                    </p>
                  </div>

                  {inscritosLoading ? (
                    <div className="flex items-center gap-2 rounded-xl border p-4 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando inscritos...
                    </div>
                  ) : inscritos.length === 0 ? (
                    <StaffEmptyState
                      icon={Users}
                      title="Sin inscritos todavía"
                      description="Use la búsqueda superior para agregar alumnos a este taller"
                    />
                  ) : (
                    <div className="app-table-wrap">
                      <Table aria-label="Lista de estudiantes inscritos">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Estudiante</TableHead>
                            <TableHead>Nivel / grado</TableHead>
                            <TableHead>Código</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inscritos.map((inscrito) => (
                            <TableRow key={inscrito.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <StudentPhoto
                                    src={inscrito.student?.profilePhoto}
                                    name={inscrito.student?.fullName}
                                    className="h-10 w-10 shrink-0"
                                  />
                                  <div>
                                    <p className="font-medium">{inscrito.student?.fullName ?? `Alumno #${inscrito.studentId}`}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {inscrito.student?.section ? `Sección ${inscrito.student.section}` : 'Sin sección'}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {inscrito.student ? `${inscrito.student.level} · ${inscrito.student.grade}` : 'Sin datos'}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {inscrito.student?.barcode ?? '—'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={inscrito.student?.active === false ? 'secondary' : 'outline'}>
                                  {inscrito.student?.active === false ? 'Alumno inactivo' : 'Inscrito'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                                  onClick={() => void handleRemoveStudent(inscrito.studentId)}
                                  disabled={processingStudentId === inscrito.studentId}
                                >
                                  {processingStudentId === inscrito.studentId ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <UserMinus className="mr-2 h-4 w-4" />
                                      Retirar
                                    </>
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </section>
              </>
            )}
          </StaffDataPanelBody>
        </StaffDataPanel>
      </div>
    </div>
  );
};
