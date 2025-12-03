import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { usePerformanceMetrics } from '@/hooks/usePerformanceMetrics';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Eye, Edit, UserPlus, Download, Loader2, Upload, Trash2 } from 'lucide-react';
import { ReincidenceBadge } from '@/components/shared/ReincidenceBadge';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { studentsService } from '@/lib/services';
import { Student, EducationalLevel } from '@/types';
import { supabase } from '@/lib/supabaseClient';

const EDUCATIONAL_LEVELS: EducationalLevel[] = ['Primaria', 'Secundaria'];

const studentFormSchema = z.object({
  codigo_barras: z.string()
    .min(1, 'El código de barras es requerido')
    .max(20, 'Máximo 20 caracteres'),
  nombre_completo: z.string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(150, 'Máximo 150 caracteres'),
  grado: z.string().min(1, 'El grado es requerido'),
  seccion: z.string().min(1, 'La sección es requerida'),
  nivel_educativo: z.enum(['Primaria', 'Secundaria'], {
    required_error: 'El nivel educativo es requerido',
  }),
  // Campos de contacto familiar (opcionales)
  telefono_contacto: z.string().optional(),
  email_contacto: z.string().email('Email inválido').optional().or(z.literal('')),
  nombre_responsable: z.string().optional(),
  parentesco_responsable: z.string().optional(),
  telefono_emergencia: z.string().optional(),
});

type StudentFormValues = z.infer<typeof studentFormSchema>;

export const StudentsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | EducationalLevel>('all');
  const [students, setStudents] = useState<Student[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);
  
  // Métricas de rendimiento
  usePerformanceMetrics('StudentsList');
  // Estados temporales para Select dentro del Dialog
  const [tempGrado, setTempGrado] = useState<string>('');
  const [tempSeccion, setTempSeccion] = useState<string>('');
  const [tempNivel, setTempNivel] = useState<EducationalLevel | ''>('');

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      codigo_barras: '',
      nombre_completo: '',
      grado: '',
      seccion: '',
      nivel_educativo: 'Secundaria',
      telefono_contacto: '',
      email_contacto: '',
      nombre_responsable: '',
      parentesco_responsable: '',
      telefono_emergencia: '',
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
        nivel_educativo: 'Secundaria',
        telefono_contacto: '',
        email_contacto: '',
        nombre_responsable: '',
        parentesco_responsable: '',
        telefono_emergencia: '',
      });
      setTempGrado('');
      setTempSeccion('');
      setTempNivel('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen]);

  useEffect(() => {
    isMountedRef.current = true;
    loadStudents();
    
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isMountedRef.current) {
      loadStudents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelFilter]);

  const loadStudents = async () => {
    if (!isMountedRef.current) return;
    
    setLoading(true);
    try {
      const levelValue = levelFilter === 'all' ? undefined : levelFilter;
      const { students: studentsList, error } = await studentsService.getAll({
        search: searchTerm || undefined,
        level: levelValue,
        active: true,
      });
      
      if (!isMountedRef.current) return;
      
      if (error) {
        toast.error('Error al cargar estudiantes');
        setStudents([]);
      } else {
        setStudents(studentsList);
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Error en loadStudents:', error);
      toast.error('Error al cargar estudiantes');
      setStudents([]);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current && searchTerm !== undefined) {
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

  const uploadProfilePhoto = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `profile/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('fotos-perfil')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Error al subir foto:', uploadError);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('fotos-perfil')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error en uploadProfilePhoto:', error);
      return null;
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png)$/)) {
      toast.error('Solo se permiten archivos JPG o PNG');
      return;
    }

    if (file.size > 5242880) {
      toast.error('El archivo no puede superar los 5MB');
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: StudentFormValues) => {
    if (!isMountedRef.current) return;
    
    setLoading(true);
    
    try {
      let photoUrl: string | undefined = undefined;
      if (photoFile) {
        if (!isMountedRef.current) return;
        setUploadingPhoto(true);
        photoUrl = await uploadProfilePhoto(photoFile) || undefined;
        if (!isMountedRef.current) return;
        setUploadingPhoto(false);
      }

      const { student, error } = await studentsService.create({
        codigo_barras: data.codigo_barras,
        nombre_completo: data.nombre_completo,
        grado: data.grado,
        seccion: data.seccion,
        nivel_educativo: data.nivel_educativo as EducationalLevel,
        foto_perfil: photoUrl,
        telefono_contacto: data.telefono_contacto || undefined,
        email_contacto: data.email_contacto || undefined,
        nombre_responsable: data.nombre_responsable || undefined,
        parentesco_responsable: data.parentesco_responsable || undefined,
        telefono_emergencia: data.telefono_emergencia || undefined,
      });
      
      if (!isMountedRef.current) return;
      
      if (error) {
        toast.error(error);
      } else {
        toast.success('Estudiante agregado exitosamente');
        setDialogOpen(false);
        form.reset();
        setPhotoFile(null);
        setPhotoPreview('');
        setTempNivel('');
        loadStudents();
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Error en onSubmit:', error);
      toast.error('Error al crear estudiante');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleViewStudent = async (student: Student) => {
    setSelectedStudent(student);
    setViewDialogOpen(true);
  };

  const handleEditStudent = async (student: Student) => {
    setSelectedStudent(student);
    form.reset({
      codigo_barras: student.barcode,
      nombre_completo: student.fullName,
      grado: student.grade,
      seccion: student.section,
      nivel_educativo: student.level,
      telefono_contacto: student.contactPhone || '',
      email_contacto: student.contactEmail || '',
      nombre_responsable: student.responsibleName || '',
      parentesco_responsable: student.responsibleRelationship || '',
      telefono_emergencia: student.emergencyPhone || '',
    });
    setTempGrado(student.grade);
    setTempSeccion(student.section);
    setTempNivel(student.level);
    setPhotoPreview(student.profilePhoto || '');
    setEditDialogOpen(true);
  };

  const onEditSubmit = async (data: StudentFormValues) => {
    if (!selectedStudent || !isMountedRef.current) return;
    
    setLoading(true);
    
    try {
      let photoUrl: string | undefined = selectedStudent.profilePhoto;
      if (photoFile) {
        if (!isMountedRef.current) return;
        setUploadingPhoto(true);
        const newPhotoUrl = await uploadProfilePhoto(photoFile);
        if (!isMountedRef.current) return;
        if (newPhotoUrl) photoUrl = newPhotoUrl;
        setUploadingPhoto(false);
      }

      const { success, error } = await studentsService.update(selectedStudent.id, {
        nombre_completo: data.nombre_completo,
        grado: data.grado,
        seccion: data.seccion,
        nivel_educativo: data.nivel_educativo as EducationalLevel,
        foto_perfil: photoUrl,
        telefono_contacto: data.telefono_contacto || undefined,
        email_contacto: data.email_contacto || undefined,
        nombre_responsable: data.nombre_responsable || undefined,
        parentesco_responsable: data.parentesco_responsable || undefined,
        telefono_emergencia: data.telefono_emergencia || undefined,
      });
      
      if (!isMountedRef.current) return;
      
      if (error) {
        toast.error(error);
      } else {
        toast.success('Estudiante actualizado exitosamente');
        setEditDialogOpen(false);
        setSelectedStudent(null);
        form.reset();
        setPhotoFile(null);
        setPhotoPreview('');
        setTempNivel('');
        loadStudents();
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Error en onEditSubmit:', error);
      toast.error('Error al actualizar estudiante');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
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
                  <FormField
                    control={form.control}
                    name="nivel_educativo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nivel Educativo</FormLabel>
                        <Select
                          value={tempNivel || undefined}
                          onValueChange={(value) => {
                            setTempNivel(value as EducationalLevel);
                            field.onChange(value);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar nivel" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {EDUCATIONAL_LEVELS.map((level) => (
                              <SelectItem key={level} value={level}>
                                {level}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                  
                  {/* Photo Upload */}
                  <div className="space-y-2">
                    <FormLabel>Foto de Perfil (Opcional)</FormLabel>
                    <div className="flex items-center gap-4">
                      {photoPreview && (
                        <Avatar className="w-20 h-20">
                          <AvatarImage src={photoPreview} alt="Preview" />
                          <AvatarFallback>IMG</AvatarFallback>
                        </Avatar>
                      )}
                      <div className="flex-1">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handlePhotoChange}
                          accept="image/jpeg,image/png"
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingPhoto}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {uploadingPhoto ? 'Subiendo...' : 'Seleccionar Foto'}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          JPG o PNG, máx. 5MB
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Información de Contacto Familiar */}
                  <div className="border-t pt-4 space-y-4">
                    <h3 className="text-lg font-semibold">Información de Contacto Familiar</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="telefono_contacto"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Teléfono de Contacto</FormLabel>
                            <FormControl>
                              <Input placeholder="987654321" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email_contacto"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email de Contacto</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="padre@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="nombre_responsable"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre del Responsable</FormLabel>
                            <FormControl>
                              <Input placeholder="Nombre completo del padre/madre" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="parentesco_responsable"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Parentesco</FormLabel>
                            <FormControl>
                              <Input placeholder="Padre, Madre, Apoderado, etc." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="telefono_emergencia"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Teléfono de Emergencia</FormLabel>
                            <FormControl>
                              <Input placeholder="987654321" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading || uploadingPhoto}>
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

          {/* View Student Dialog */}
          <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Detalles del Estudiante</DialogTitle>
              </DialogHeader>
              {selectedStudent && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={selectedStudent.profilePhoto} alt={selectedStudent.fullName} />
                      <AvatarFallback className="text-2xl">{selectedStudent.fullName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-2xl font-bold">{selectedStudent.fullName}</h3>
                      <p className="text-muted-foreground">Código: {selectedStudent.barcode}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Nivel / Grado</Label>
                      <p className="text-lg font-semibold">
                        {selectedStudent.level} • {selectedStudent.grade}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Sección</Label>
                      <p className="text-lg font-semibold">{selectedStudent.section}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Faltas (60 días)</Label>
                      <p className="text-lg font-semibold">{selectedStudent.faultsLast60Days || 0}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Nivel de Reincidencia</Label>
                      <div className="mt-1">
                        <ReincidenceBadge level={selectedStudent.reincidenceLevel || 0} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Estado</Label>
                      <div className="mt-1">
                        <Badge variant={selectedStudent.active ? 'default' : 'secondary'}>
                          {selectedStudent.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button onClick={() => setViewDialogOpen(false)}>Cerrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Student Dialog */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar Estudiante</DialogTitle>
                <DialogDescription>
                  Modifique la información del estudiante.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="codigo_barras"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código de Barras</FormLabel>
                        <FormControl>
                          <Input {...field} disabled />
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
                  <FormField
                    control={form.control}
                    name="nivel_educativo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nivel Educativo</FormLabel>
                        <Select
                          value={tempNivel || undefined}
                          onValueChange={(value) => {
                            setTempNivel(value as EducationalLevel);
                            field.onChange(value);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar nivel" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {EDUCATIONAL_LEVELS.map((level) => (
                              <SelectItem key={level} value={level}>
                                {level}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                  
                  {/* Photo Upload */}
                  <div className="space-y-2">
                    <FormLabel>Foto de Perfil</FormLabel>
                    <div className="flex items-center gap-4">
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={photoPreview || selectedStudent?.profilePhoto} alt="Preview" />
                        <AvatarFallback>IMG</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handlePhotoChange}
                          accept="image/jpeg,image/png"
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingPhoto}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {uploadingPhoto ? 'Subiendo...' : 'Cambiar Foto'}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          JPG o PNG, máx. 5MB
                        </p>
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading || uploadingPhoto}>
                      {loading ? (
                        <span className="flex items-center">
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Actualizando...
                        </span>
                      ) : (
                        'Guardar Cambios'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, código de barras o grado..."
                className="pl-10"
              />
            </div>
            <Select
              value={levelFilter}
              onValueChange={(value) => setLevelFilter(value as 'all' | EducationalLevel)}
            >
              <SelectTrigger className="md:w-[200px]">
                <SelectValue placeholder="Nivel educativo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los niveles</SelectItem>
                {EDUCATIONAL_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadStudents} className="md:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
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
            <Table role="table" aria-label="Lista de estudiantes">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Código</TableHead>
                  <TableHead scope="col">Nombre</TableHead>
                  <TableHead scope="col">Nivel / Grado</TableHead>
                  <TableHead scope="col">Sección</TableHead>
                  <TableHead scope="col">Faltas (60d)</TableHead>
                  <TableHead scope="col">Nivel Reincidencia</TableHead>
                  <TableHead scope="col">Estado</TableHead>
                  <TableHead scope="col">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow 
                    key={student.id}
                    role="row"
                    aria-label={`Estudiante ${student.fullName}`}
                  >
                    <TableCell className="font-mono text-sm">{student.barcode}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={student.profilePhoto} alt={student.fullName} />
                          <AvatarFallback>
                            {student.fullName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{student.fullName}</p>
                          <p className="text-xs text-muted-foreground">{student.barcode}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span className="font-semibold">{student.level}</span>
                        <span className="text-muted-foreground">{student.grade}</span>
                      </div>
                    </TableCell>
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
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewStudent(student)}
                          aria-label={`Ver detalles de ${student.fullName}`}
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" aria-hidden="true" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditStudent(student)}
                          aria-label={`Editar ${student.fullName}`}
                          title="Editar estudiante"
                        >
                          <Edit className="w-4 h-4" aria-hidden="true" />
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