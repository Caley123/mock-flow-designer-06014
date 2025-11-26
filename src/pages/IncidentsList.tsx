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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, Eye, Edit, FileX, Camera, Download, Loader2 } from 'lucide-react';
import { ReincidenceBadge } from '@/components/shared/ReincidenceBadge';
import { SeverityBadge } from '@/components/shared/SeverityBadge';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { incidentsService } from '@/lib/services';
import { Incident, EducationalLevel } from '@/types';
import { toast } from 'sonner';

export const IncidentsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<'all' | EducationalLevel>('all');

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    setLoading(true);
    const { incidents: incidentsList, error } = await incidentsService.getAll({
      nivelEducativo: levelFilter === 'all' ? undefined : levelFilter,
    });
    if (error) {
      toast.error('Error al cargar incidencias');
      setIncidents([]);
    } else {
      setIncidents(incidentsList);
    }
    setLoading(false);
  };

  const filteredIncidents = incidents.filter(incident =>
    incident.id.toString().includes(searchTerm) ||
    incident.student?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    incident.faultType?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    loadIncidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelFilter]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestión de Incidencias</h1>
        <Button variant="outline" onClick={loadIncidents}>
          <span className="flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </span>
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por ID, estudiante o tipo de falta..."
                className="pl-10"
              />
            </div>
            <Select
              value={levelFilter}
              onValueChange={(value) => setLevelFilter(value as 'all' | EducationalLevel)}
            >
              <SelectTrigger className="md:w-[220px]">
                <SelectValue placeholder="Nivel educativo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los niveles</SelectItem>
                <SelectItem value="Primaria">Primaria</SelectItem>
                <SelectItem value="Secundaria">Secundaria</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="md:w-auto">
              <span className="flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Filtros Avanzados
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Incidents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Incidencias ({filteredIncidents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredIncidents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No se encontraron incidencias
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Falta</TableHead>
                  <TableHead>Fecha/Hora</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Evidencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidents.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell className="font-mono text-sm">{incident.id}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{incident.student?.fullName || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">
                          {incident.student?.level} • {incident.student?.grade} {incident.student?.section}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{incident.faultType?.name || 'N/A'}</p>
                        {incident.faultType && (
                          <SeverityBadge severity={incident.faultType.severity} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{format(new Date(incident.registeredAt), 'dd/MM/yyyy', { locale: es })}</p>
                        <p className="text-muted-foreground">
                          {format(new Date(incident.registeredAt), 'HH:mm', { locale: es })}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ReincidenceBadge level={incident.reincidenceLevel} />
                    </TableCell>
                    <TableCell>
                      {incident.hasEvidence ? (
                        <Badge variant="secondary" className="gap-1">
                          <Camera className="w-3 h-3" />
                          {incident.evidenceCount}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sin evidencia</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={incident.status === 'Activa' ? 'default' : 'secondary'}>
                        {incident.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedIncident(incident)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Detalle de Incidencia</DialogTitle>
                            </DialogHeader>
                            {selectedIncident && (
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground">ID Incidencia</p>
                                    <p className="font-mono font-semibold">{selectedIncident.id}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Estado</p>
                                    <Badge variant={selectedIncident.status === 'Activa' ? 'default' : 'secondary'}>
                                      {selectedIncident.status}
                                    </Badge>
                                  </div>
                                </div>

                                <div>
                                  <p className="text-sm text-muted-foreground mb-2">Estudiante</p>
                                  <Card>
                                    <CardContent className="pt-4">
                                      <p className="font-semibold text-lg">{selectedIncident.student?.fullName || 'N/A'}</p>
                                      <p className="text-muted-foreground">
                                        {selectedIncident.student?.level} • {selectedIncident.student?.grade} {selectedIncident.student?.section} • 
                                        Código: {selectedIncident.student?.barcode}
                                      </p>
                                    </CardContent>
                                  </Card>
                                </div>

                                <div>
                                  <p className="text-sm text-muted-foreground mb-2">Tipo de Falta</p>
                                  <Card>
                                    <CardContent className="pt-4 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <p className="font-semibold">{selectedIncident.faultType?.name || 'N/A'}</p>
                                        {selectedIncident.faultType && (
                                          <SeverityBadge severity={selectedIncident.faultType.severity} />
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {selectedIncident.faultType?.description || 'Sin descripción'}
                                      </p>
                                      <div className="flex gap-4 text-sm">
                                        <span>Categoría: {selectedIncident.faultType?.category}</span>
                                        <span>Puntos: {selectedIncident.faultType?.points}</span>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>

                                <div>
                                  <p className="text-sm text-muted-foreground mb-2">Nivel de Reincidencia</p>
                                  <ReincidenceBadge level={selectedIncident.reincidenceLevel} className="px-4 py-2" />
                                </div>

                                <div>
                                  <p className="text-sm text-muted-foreground mb-2">Observaciones</p>
                                  <Card>
                                    <CardContent className="pt-4">
                                      <p>{selectedIncident.observations || 'Sin observaciones'}</p>
                                    </CardContent>
                                  </Card>
                                </div>

                                <div>
                                  <p className="text-sm text-muted-foreground mb-2">Información de Registro</p>
                                  <div className="text-sm space-y-1">
                                    <p>Registrado por: <span className="font-semibold">
                                      {selectedIncident.registeredByUser?.fullName || 'N/A'}
                                    </span></p>
                                    <p>Fecha: <span className="font-semibold">
                                      {format(new Date(selectedIncident.registeredAt), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                                    </span></p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <FileX className="w-4 h-4" />
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