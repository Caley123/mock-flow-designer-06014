import { useState, useEffect, useRef } from 'react';
import { useSpring, useTrail, animated, config } from '@react-spring/web';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Eye, Edit, FileX, Camera, FileSpreadsheet, FileText, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import {
  StaffKpiStat,
  StaffToolbar,
  StaffDataPanel,
  StaffDataPanelHeader,
  StaffEmptyState,
} from '@/components/staff';
import { Label } from '@/components/ui/label';
import { exportIncidentsListExcel } from '@/lib/utils/excelListExports';
import { PageHeader } from '@/components/layout/PageHeader';
import { ReincidenceBadge } from '@/components/shared/ReincidenceBadge';
import { SeverityBadge } from '@/components/shared/SeverityBadge';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PageLoader } from '@/components/ui/page-loader';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { incidentsService } from '@/lib/services';
import { Incident, EducationalLevel } from '@/types';
import { toast } from 'sonner';

const AnimatedDiv = animated('div');

export const IncidentsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<'all' | EducationalLevel>('all');
  const isMountedRef = useRef(true);

  // Animaciones (hooks deben ir antes de cualquier return condicional)
  const headerSpring = useSpring({
    from: { opacity: 0, transform: 'translateY(-16px)' },
    to: { opacity: 1, transform: 'translateY(0px)' },
    config: config.gentle,
  });
  const kpiTrail = useTrail(3, {
    from: { opacity: 0, transform: 'translateY(20px) scale(0.96)' },
    to: { opacity: 1, transform: 'translateY(0px) scale(1)' },
    config: config.gentle,
    delay: 120,
  });
  const panelSpring = useSpring({
    from: { opacity: 0, transform: 'translateY(24px)' },
    to: { opacity: 1, transform: 'translateY(0px)' },
    delay: 260,
    config: config.gentle,
  });

  // Métricas de rendimiento
  usePerformanceMetrics('IncidentsList');

  useEffect(() => {
    isMountedRef.current = true;
    loadIncidents();
    
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadIncidents = async () => {
    if (!isMountedRef.current) return;
    setLoading(true);
    try {
      const { incidents: incidentsList, error } = await incidentsService.getAll({
        nivelEducativo: levelFilter === 'all' ? undefined : levelFilter,
      });
      if (!isMountedRef.current) return;
      if (error) {
        toast.error('Error al cargar incidencias');
        setIncidents([]);
      } else {
        setIncidents(incidentsList);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const filteredIncidents = incidents.filter(incident =>
    incident.id.toString().includes(searchTerm) ||
    incident.student?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    incident.faultType?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportExcel = () => {
    const filters =
      levelFilter !== 'all' ? `Filtro: nivel ${levelFilter}` : undefined;
    void exportIncidentsListExcel(filteredIncidents, filters);
  };

  useEffect(() => {
    loadIncidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelFilter]);

  if (loading) {
    return <PageLoader message="Cargando incidencias..." />;
  }

  const activeCount = incidents.filter((i) => i.status === 'Activa').length;
  const withEvidence = incidents.filter((i) => i.hasEvidence).length;

  return (
    <div className="app-page app-page-shell">
      <PageHeader
        icon={FileText}
        eyebrow="Incidencias"
        title="Lista de Incidencias"
        description="Historial completo con filtros por nivel y exportación a Excel"
        accent="warning"
      >
        <Button
          variant="outline-primary"
          onClick={handleExportExcel}
          disabled={filteredIncidents.length === 0}
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Exportar Excel
        </Button>
      </PageHeader>

      <div className="app-kpi-grid !grid-cols-1 sm:!grid-cols-3">
        <StaffKpiStat
          label="En listado"
          value={filteredIncidents.length}
          hint={`${incidents.length} cargadas`}
          icon={FileText}
          tone="primary"
        />
        <StaffKpiStat
          label="Activas"
          value={activeCount}
          hint="Pendientes de gestión"
          hintIcon={AlertCircle}
          icon={AlertCircle}
          tone="warning"
        />
        <StaffKpiStat
          label="Con evidencia"
          value={withEvidence}
          hint="Registros documentados"
          hintIcon={CheckCircle2}
          icon={Camera}
          tone="success"
        />
      </div>

      <StaffToolbar title="Buscar y filtrar" description="Refine por texto o nivel educativo">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="incidents-search">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="incidents-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ID, estudiante o tipo de falta..."
              className="pl-10"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Nivel educativo</Label>
          <Select
            value={levelFilter}
            onValueChange={(value) => setLevelFilter(value as 'all' | EducationalLevel)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Nivel educativo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los niveles</SelectItem>
              <SelectItem value="Primaria">Primaria</SelectItem>
              <SelectItem value="Secundaria">Secundaria</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </StaffToolbar>

      <StaffDataPanel>
        <StaffDataPanelHeader
          title={`Registros (${filteredIncidents.length})`}
          description="Detalle, evidencia y estado de cada incidencia"
        />
        <div className="p-4 pt-0 sm:p-5 sm:pt-0">
          {filteredIncidents.length === 0 ? (
            <StaffEmptyState
              icon={FileText}
              title="No hay incidencias"
              description="Prueba otro término de búsqueda o cambia el filtro de nivel"
            />
          ) : (
            <div className="app-table-wrap">
              <Table role="table" aria-label="Lista de incidencias">
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">ID</TableHead>
                    <TableHead scope="col">Estudiante</TableHead>
                    <TableHead scope="col">Falta</TableHead>
                    <TableHead scope="col">Fecha/Hora</TableHead>
                    <TableHead scope="col">Nivel</TableHead>
                    <TableHead scope="col">Evidencia</TableHead>
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
            </div>
          )}
        </div>
      </StaffDataPanel>
    </div>
  );
};