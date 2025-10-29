import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockFaultTypes } from '@/lib/mockData';
import { Search, Plus, Edit } from 'lucide-react';
import { SeverityBadge } from '@/components/shared/SeverityBadge';
import { Badge } from '@/components/ui/badge';
import { FaultCategory } from '@/types';

export const FaultsCatalog = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<FaultCategory | 'all'>('all');

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Catálogo de Faltas</h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Falta
        </Button>
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
