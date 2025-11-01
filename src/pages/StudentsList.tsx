import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Eye, Edit, UserPlus, Download, Loader2 } from 'lucide-react';
import { ReincidenceBadge } from '@/components/shared/ReincidenceBadge';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { studentsService } from '@/lib/services';
import { Student } from '@/types';

const studentFormSchema = z.object({
  codigo_barras: z.string()
    .min(1, 'El código de barras es requerido')
    .max(20, 'Máximo 20 caracteres'),
  nombre_completo: z.string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(150, 'Máximo 150 caracteres'),
  grado: z.string().min(1, 'El grado es requerido'),
  seccion: z.string().min(1, 'La sección es requerida'),
});

type StudentFormValues = z.infer<typeof studentFormSchema>;

export const StudentsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  // Estados temporales para Select dentro del Dialog
  const [tempGrado, setTempGrado] = useState<string>('');
  const [tempSeccion, setTempSeccion] = useState<string>('');

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      codigo_barras: '',
      nombre_completo: '',
      grado: '',
      seccion: '',
    },
  });

  // Resetear formulario cuando se abre el dialog
  useEffect(() => {
    if (dialogOpen) {
      form.reset({
        codigo_barras: '',
        nombre_completo: '',
        grado: '',
        seccion: '',
      });
      setTempGrado('');
      setTempSeccion('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen]);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    const { students: studentsList, error } = await studentsService.getAll({
      search: searchTerm || undefined,
      active: true,
    });
    if (error) {
      toast.error('Error al cargar estudiantes');
      setStudents([]);
    } else {
      setStudents(studentsList);
    }
    setLoading(false);
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== undefined) {
        loadStudents();
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Si hay searchTerm, el filtrado ya se hizo en el servidor
  // Solo aplicamos filtro adicional si searchTerm está vacío (para filtrar localmente)
  const filteredStudents = searchTerm 
    ? students // Ya filtrado por el servidor
    : students.filter(student =>
        student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.barcode.includes(searchTerm) ||
        student.grade.toLowerCase().includes(searchTerm.toLowerCase())
      );

  const onSubmit = async (data: StudentFormValues) => {
    setLoading(true);
    const { student, error } = await studentsService.create(data);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Estudiante agregado exitosamente');
      setDialogOpen(false);
      form.reset();
      loadStudents();
    }
    setLoading(false);
  };

  const stats = {
    total: students.length,
    sinIncidencias: students.filter(s => (s.reincidenceLevel || 0) === 0).length,
    nivelModerado: students.filter(s => (s.reincidenceLevel || 0) >= 1 && (s.reincidenceLevel || 0) <= 2).length,
    nivelAlto: students.filter(s => (s.reincidenceLevel || 0) >= 3).length,
  };

  if (loading && students.length === 0) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestión de Estudiantes</h1>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Dialog 
            open={dialogOpen} 
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                // Resetear el formulario cuando se cierra el dialog
                form.reset();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Nuevo Estudiante
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Agregar Nuevo Estudiante</DialogTitle>
                <DialogDescription>
                  Complete la información del estudiante. Todos los campos son obligatorios.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="codigo_barras"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código de Barras</FormLabel>
                        <FormControl>
                          <Input placeholder="000000000000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nombre_completo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Juan Pérez García" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="grado"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grado</FormLabel>
                          <Select 
                            value={tempGrado || undefined}
                            onValueChange={(value) => {
                              setTempGrado(value);
                              field.onChange(value);
                            }}
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
                      name="seccion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sección</FormLabel>
                          <Select 
                            value={tempSeccion || undefined}
                            onValueChange={(value) => {
                              setTempSeccion(value);
                              field.onChange(value);
                            }}
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
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <span className="flex items-center">
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Guardando...
                        </span>
                      ) : (
                        'Guardar Estudiante'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, código de barras o grado..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Students Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Estudiantes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {stats.sinIncidencias}
            </div>
            <p className="text-sm text-muted-foreground">Sin Incidencias</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.nivelModerado}
            </div>
            <p className="text-sm text-muted-foreground">Nivel Moderado</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {stats.nivelAlto}
            </div>
            <p className="text-sm text-muted-foreground">Nivel Alto</p>
          </CardContent>
        </Card>
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Estudiantes</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No se encontraron estudiantes
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Grado</TableHead>
                  <TableHead>Sección</TableHead>
                  <TableHead>Faltas (60d)</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-mono text-sm">{student.barcode}</TableCell>
                    <TableCell>
                      <p className="font-medium">{student.fullName}</p>
                    </TableCell>
                    <TableCell>{student.grade}</TableCell>
                    <TableCell>{student.section}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{student.faultsLast60Days || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <ReincidenceBadge level={student.reincidenceLevel || 0} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={student.active ? 'default' : 'secondary'}>
                        {student.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};