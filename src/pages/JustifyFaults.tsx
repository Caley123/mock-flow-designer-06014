import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, CheckCircle2, XCircle, FileText, Calendar, User, AlertCircle } from 'lucide-react';
import { incidentsService, studentsService, authService } from '@/lib/services';
import { Incident, EducationalLevel } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ReincidenceBadge } from '@/components/shared/ReincidenceBadge';
import { SeverityBadge } from '@/components/shared/SeverityBadge';
import { PageLoader } from '@/components/ui/page-loader';
import { usePerformanceMetrics } from '@/hooks/usePerformanceMetrics';

export const JustifyFaults = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [justificationReason, setJustificationReason] = useState('');
  const [justifying, setJustifying] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [levelFilter, setLevelFilter] = useState<'all' | EducationalLevel>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Activa' | 'Justificada'>('Activa');
  const [dateFilter, setDateFilter] = useState<string>('');
  const isMountedRef = useRef(true);
  
  // Métricas de rendimiento
  usePerformanceMetrics('JustifyFaults');

  useEffect(() => {
    isMountedRef.current = true;
    loadIncidents();
    
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelFilter, statusFilter, dateFilter]);

  const loadIncidents = async () => {
    if (!isMountedRef.current) return;
    
    setLoading(true);
    try {
      const filters: any = {
        estado: statusFilter === 'all' ? undefined : statusFilter,
      };

      if (levelFilter !== 'all') {
        filters.nivelEducativo = levelFilter;
      }

      if (dateFilter) {
        const date = new Date(dateFilter);
        date.setHours(0, 0, 0, 0);
        filters.fechaDesde = date.toISOString();
        date.setHours(23, 59, 59, 999);
        filters.fechaHasta = date.toISOString();
      }

      const { incidents: incidentsList, error } = await incidentsService.getAll(filters);

      if (!isMountedRef.current) return;

      if (error) {
        toast.error('Error al cargar incidencias');
        setIncidents([]);
      } else {
        setIncidents(incidentsList);
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Error en loadIncidents:', error);
      toast.error('Error al procesar las incidencias');
      setIncidents([]);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleJustify = async () => {
    if (!selectedIncident || !justificationReason.trim()) {
      toast.error('Por favor ingrese un motivo de justificación');
      return;
    }

    if (justificationReason.trim().length < 10) {
      toast.error('El motivo debe tener al menos 10 caracteres');
      return;
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      toast.error('Debe estar autenticado para justificar faltas');
      return;
    }

    if (!isMountedRef.current) return;

    setJustifying(true);
    try {
      const { success, error } = await incidentsService.justify(
        selectedIncident.id,
        currentUser.id,
        justificationReason.trim()
      );

      if (!isMountedRef.current) return;

      if (error || !success) {
        toast.error(error || 'Error al justificar la falta');
      } else {
        toast.success('Falta justificada exitosamente');
        setDialogOpen(false);
        setJustificationReason('');
        setSelectedIncident(null);
        loadIncidents(); // Recargar lista
      }
    } catch (error: any) {
      if (!isMountedRef.current) return;
      console.error('Error en handleJustify:', error);
      toast.error('Error al justificar la falta');
    } finally {
      if (isMountedRef.current) {
        setJustifying(false);
      }
    }
  };

  const filteredIncidents = incidents.filter((incident) => {
    const matchesSearch =
      incident.id.toString().includes(searchTerm) ||
      incident.student?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.faultType?.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return <PageLoader message="Cargando incidencias..." />;
  }

  const activeCount = incidents.filter(i => i.status === 'Activa').length;
  const justifiedCount = incidents.filter(i => i.status === 'Justificada').length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Justificación de Faltas</h1>
        <p className="text-muted-foreground">
          Gestione las justificaciones de faltas de los estudiantes
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Incidencias</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incidents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes de Justificar</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Justificadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{justifiedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ID, estudiante o falta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nivel Educativo</Label>
              <Select value={levelFilter} onValueChange={(value: any) => setLevelFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Primaria">Primaria</SelectItem>
                  <SelectItem value="Secundaria">Secundaria</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Activa">Activas</SelectItem>
                  <SelectItem value="Justificada">Justificadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incidents Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Incidencias {filteredIncidents.length > 0 && `(${filteredIncidents.length})`}
          </CardTitle>
          <CardDescription>
            {statusFilter === 'Activa' 
              ? 'Seleccione una incidencia para justificarla'
              : 'Vista de incidencias justificadas'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredIncidents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No se encontraron incidencias
            </div>
          ) : (
            <Table role="table" aria-label="Lista de incidencias para justificar">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">ID</TableHead>
                  <TableHead scope="col">Estudiante</TableHead>
                  <TableHead scope="col">Falta</TableHead>
                  <TableHead scope="col">Fecha/Hora</TableHead>
                  <TableHead scope="col">Nivel</TableHead>
                  <TableHead scope="col">Estado</TableHead>
                  <TableHead scope="col">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidents.map((incident) => (
                  <TableRow
                    key={incident.id}
                    role="row"
                    aria-label={`Incidencia ${incident.id} - ${incident.student?.fullName || 'N/A'}`}
                  >
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
                      <Badge
                        variant={
                          incident.status === 'Justificada'
                            ? 'default'
                            : incident.status === 'Anulada'
                            ? 'secondary'
                            : 'outline'
                        }
                        className={
                          incident.status === 'Justificada'
                            ? 'bg-green-100 text-green-700 hover:bg-green-100'
                            : ''
                        }
                      >
                        {incident.status === 'Justificada' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {incident.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {incident.status === 'Activa' && (
                          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => setSelectedIncident(incident)}
                                aria-label={`Justificar falta ${incident.id}`}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Justificar
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Justificar Falta</DialogTitle>
                                <DialogDescription>
                                  Ingrese el motivo de justificación para la falta del estudiante
                                </DialogDescription>
                              </DialogHeader>
                              {selectedIncident && (
                                <div className="space-y-4">
                                  <div className="bg-muted p-4 rounded-lg space-y-2">
                                    <div>
                                      <Label className="text-muted-foreground">Estudiante</Label>
                                      <p className="font-semibold">{selectedIncident.student?.fullName}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {selectedIncident.student?.level} • {selectedIncident.student?.grade} {selectedIncident.student?.section}
                                      </p>
                                    </div>
                                    <div>
                                      <Label className="text-muted-foreground">Falta</Label>
                                      <p className="font-semibold">{selectedIncident.faultType?.name}</p>
                                    </div>
                                    <div>
                                      <Label className="text-muted-foreground">Fecha</Label>
                                      <p className="font-semibold">
                                        {format(new Date(selectedIncident.registeredAt), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                                      </p>
                                    </div>
                                    {selectedIncident.observations && (
                                      <div>
                                        <Label className="text-muted-foreground">Observaciones Originales</Label>
                                        <p className="text-sm">{selectedIncident.observations}</p>
                                      </div>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="justification-reason">
                                      Motivo de Justificación <span className="text-destructive">*</span>
                                    </Label>
                                    <Textarea
                                      id="justification-reason"
                                      placeholder="Ej: El estudiante presentó certificado médico que justifica la falta..."
                                      value={justificationReason}
                                      onChange={(e) => setJustificationReason(e.target.value)}
                                      rows={5}
                                      className="resize-none"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                      Mínimo 10 caracteres. Este motivo quedará registrado en el sistema.
                                    </p>
                                  </div>
                                  {selectedIncident.status === 'Justificada' && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                      <p className="text-sm text-green-800">
                                        <CheckCircle2 className="w-4 h-4 inline mr-1" />
                                        Esta falta ya está justificada
                                      </p>
                                      {selectedIncident.annulmentReason && (
                                        <p className="text-xs text-green-700 mt-1">
                                          Motivo: {selectedIncident.annulmentReason}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setDialogOpen(false);
                                    setJustificationReason('');
                                    setSelectedIncident(null);
                                  }}
                                  disabled={justifying}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  onClick={handleJustify}
                                  disabled={justifying || !justificationReason.trim() || justificationReason.trim().length < 10}
                                >
                                  {justifying ? 'Justificando...' : 'Confirmar Justificación'}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                        {incident.status === 'Justificada' && (
                          <div className="text-xs text-muted-foreground flex items-center">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-green-600" />
                            Justificada
                          </div>
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
    </div>
  );
};

