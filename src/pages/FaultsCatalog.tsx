import { useState } from 'react';
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
import { mockFaultTypes } from '@/lib/mockData';
import { Search, Plus, Edit } from 'lucide-react';
import { SeverityBadge } from '@/components/shared/SeverityBadge';
import { Badge } from '@/components/ui/badge';
import { FaultCategory, FaultSeverity } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

const faultFormSchema = z.object({
  code: z.string()
    .min(2, 'El código debe tener al menos 2 caracteres')
    .max(10, 'Máximo 10 caracteres'),
  name: z.string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'Máximo 100 caracteres'),
  description: z.string()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(500, 'Máximo 500 caracteres'),
  category: z.enum(['Conducta', 'Uniforme', 'Académica', 'Puntualidad'] as const, {
    required_error: 'La categoría es requerida',
  }),
  severity: z.enum(['Leve', 'Moderada', 'Grave', 'Muy Grave'] as const, {
    required_error: 'La severidad es requerida',
  }),
  points: z.number()
    .min(1, 'Los puntos deben ser al menos 1')
    .max(100, 'Máximo 100 puntos'),
});

type FaultFormValues = z.infer<typeof faultFormSchema>;

export const FaultsCatalog = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<FaultCategory | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<FaultFormValues>({
    resolver: zodResolver(faultFormSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      category: undefined,
      severity: undefined,
      points: 5,
    },
  });

  const filteredFaults = mockFaultTypes.filter(fault => {
    const matchesSearch = fault.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         fault.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         fault.description.toLowerCase().includes(searchTerm.toLowerCase());
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

  const onSubmit = (data: FaultFormValues) => {
    console.log('Nueva falta:', data);
    toast.success('Falta agregada exitosamente');
    setDialogOpen(false);
    form.reset();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Catálogo de Faltas</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código</FormLabel>
                        <FormControl>
                          <Input placeholder="F-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="points"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Puntos</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="5" 
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
                  name="name"
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descripción detallada de la falta y su contexto..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    name="severity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Severidad</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar severidad" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Leve">Leve</SelectItem>
                            <SelectItem value="Moderada">Moderada</SelectItem>
                            <SelectItem value="Grave">Grave</SelectItem>
                            <SelectItem value="Muy Grave">Muy Grave</SelectItem>
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
                  <Button type="submit">Guardar Falta</Button>
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
              placeholder="Buscar por nombre, código o descripción..."
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
              <p className="text-sm text-muted-foreground">{fault.description}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono text-muted-foreground">{fault.code}</span>
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
