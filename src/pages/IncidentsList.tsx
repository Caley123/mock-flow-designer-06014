import { useState } from 'react';
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
import { mockIncidents } from '@/lib/mockData';
import { Search, Filter, Eye, Edit, FileX, Camera, Download } from 'lucide-react';
import { ReincidenceBadge } from '@/components/shared/ReincidenceBadge';
import { SeverityBadge } from '@/components/shared/SeverityBadge';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const IncidentsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<typeof mockIncidents[0] | null>(null);

  const filteredIncidents = mockIncidents.filter(incident =>
    incident.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    incident.student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    incident.faultType.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestión de Incidencias</h1>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por ID, estudiante o tipo de falta..."
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filtros Avanzados
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Incidents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Incidencias</CardTitle>
        </CardHeader>
        <CardContent>
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
                      <p className="font-medium">{incident.student.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {incident.student.grade} {incident.student.section}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{incident.faultType.name}</p>
                      <SeverityBadge severity={incident.faultType.severity} />
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
                                    <p className="font-semibold text-lg">{selectedIncident.student.fullName}</p>
                                    <p className="text-muted-foreground">
                                      {selectedIncident.student.grade} {selectedIncident.student.section} • 
                                      Código: {selectedIncident.student.barcode}
                                    </p>
                                  </CardContent>
                                </Card>
                              </div>

                              <div>
                                <p className="text-sm text-muted-foreground mb-2">Tipo de Falta</p>
                                <Card>
                                  <CardContent className="pt-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <p className="font-semibold">{selectedIncident.faultType.name}</p>
                                      <SeverityBadge severity={selectedIncident.faultType.severity} />
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      {selectedIncident.faultType.description}
                                    </p>
                                    <div className="flex gap-4 text-sm">
                                      <span className="font-mono text-muted-foreground">
                                        {selectedIncident.faultType.code}
                                      </span>
                                      <span>Puntos: {selectedIncident.faultType.points}</span>
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
                                    <p>{selectedIncident.observations}</p>
                                  </CardContent>
                                </Card>
                              </div>

                              <div>
                                <p className="text-sm text-muted-foreground mb-2">Información de Registro</p>
                                <div className="text-sm space-y-1">
                                  <p>Registrado por: <span className="font-semibold">
                                    {selectedIncident.registeredByUser.fullName}
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
        </CardContent>
      </Card>
    </div>
  );
};
