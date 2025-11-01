import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Edit, Loader2 } from 'lucide-react';
import { SeverityBadge } from '@/components/shared/SeverityBadge';
import { Badge } from '@/components/ui/badge';
import { FaultCategory } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { faultsService } from '@/lib/services';
import { FaultType } from '@/types';

const faultFormSchema = z.object({
  nombre_falta: z.string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'Máximo 100 caracteres'),
  descripcion: z.string()
    .max(500, 'Máximo 500 caracteres')
    .optional(),
  categoria: z.enum(['Conducta', 'Uniforme', 'Académica', 'Puntualidad'] as const, {
    required_error: 'La categoría es requerida',
  }),
  es_grave: z.boolean(),
  puntos_reincidencia: z.number()
    .min(1, 'Los puntos deben ser al menos 1')
    .max(100, 'Máximo 100 puntos'),
});

type FaultFormValues = z.infer<typeof faultFormSchema>;

export const FaultsCatalog = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<FaultCategory | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [faults, setFaults] = useState<FaultType[]>([]);
  const [loading, setLoading] = useState(true);
  // Estado temporal para Select dentro del Dialog
  const [tempCategoria, setTempCategoria] = useState<FaultCategory | undefined>(undefined);

  const form = useForm<FaultFormValues>({
    resolver: zodResolver(faultFormSchema),
    defaultValues: {
      nombre_falta: '',
      descripcion: '',
      categoria: undefined,
      es_grave: false,
      puntos_reincidencia: 1,
    },
  });

  useEffect(() => {
    loadFaults();
  }, []);

  const loadFaults = async () => {
    setLoading(true);
    const { faults: faultList, error } = await faultsService.getAll(true);
    if (error) {
      toast.error('Error al cargar catálogo de faltas');
      setFaults([]);
    } else {
      setFaults(faultList);
    }
    setLoading(false);
  };

  const filteredFaults = faults.filter(fault => {
    const matchesSearch = fault.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         fault.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || fault.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const categories: Array<{ value: FaultCategory | 'all', label: string }> = [
    { value: 'all', label: 'Todas' },
    { value: 'Conducta', label: 'Conducta' },
    { value: 'Uniforme', label: 'Uniforme' },
    { value: 'Académica', label: 'Académica' },
    { value: 'Puntualidad', label: 'Puntualidad' },
  ];

  const onSubmit = async (data: FaultFormValues) => {
    setLoading(true);
    const { fault, error } = await faultsService.create({
      nombre_falta: data.nombre_falta,
      categoria: data.categoria,
      es_grave: data.es_grave,
      puntos_reincidencia: data.puntos_reincidencia,
      descripcion: data.descripcion || null,
    });

    if (error) {
      toast.error(error);
    } else {
      toast.success('Falta agregada exitosamente');
      setDialogOpen(false);
      form.reset();
      setTempCategoria(undefined);
      loadFaults();
    }
    setLoading(false);
  };

  // Resetear estado temporal cuando se abre/cierra el dialog
  useEffect(() => {
    if (!dialogOpen) {
      setTempCategoria(undefined);
    }
  }, [dialogOpen]);

  if (loading && faults.length === 0) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Catálogo de Faltas</h1>
        <Dialog 
          open={dialogOpen} 
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              // Resetear el formulario cuando se cierra el dialog
              form.reset();
              setTempCategoria(undefined);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Falta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Agregar Nueva Falta</DialogTitle>
              <DialogDescription>
                Complete la información de la nueva falta. Todos los campos son obligatorios.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="nombre_falta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la Falta</FormLabel>
                      <FormControl>
                        <Input placeholder="Uso inadecuado del uniforme" {...field} />
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
                      <FormLabel>Descripción (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descripción detallada de la falta y su contexto..."
                          className="min-h-[100px]"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="categoria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría</FormLabel>
                        <Select 
                          value={tempCategoria || undefined}
                          onValueChange={(value) => {
                            const categoriaValue = value as FaultCategory;
                            setTempCategoria(categoriaValue);
                            field.onChange(categoriaValue);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar categoría" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Conducta">Conducta</SelectItem>
                            <SelectItem value="Uniforme">Uniforme</SelectItem>
                            <SelectItem value="Académica">Académica</SelectItem>
                            <SelectItem value="Puntualidad">Puntualidad</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="puntos_reincidencia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Puntos</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="1" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="es_grave"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Falta Grave</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Marque si esta falta es considerada grave
                        </div>
                      </div>
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

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
                      'Guardar Falta'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o descripción..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as any)}>
        <TabsList className="grid w-full grid-cols-5">
          {categories.map(cat => (
            <TabsTrigger key={cat.value} value={cat.value}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Faults Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFaults.map((fault) => (
          <Card key={fault.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-lg">{fault.name}</CardTitle>
                  <div className="flex gap-2">
                    <SeverityBadge severity={fault.severity} />
                    <Badge variant="outline">{fault.category}</Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{fault.description || 'Sin descripción'}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Categoría: {fault.category}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Puntos:</span>
                  <Badge variant="outline">{fault.points}</Badge>
                </div>
              </div>
              <div className="pt-2">
                <Badge variant={fault.active ? 'default' : 'secondary'}>
                  {fault.active ? 'Activa' : 'Inactiva'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredFaults.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No se encontraron faltas con los criterios de búsqueda.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};