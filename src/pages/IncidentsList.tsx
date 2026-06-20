import { useState, useEffect, useMemo } from 'react';
import { useSpring, useTrail, animated, config } from '@react-spring/web';
import { Card, CardContent } from '@/components/ui/card';
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
import { Incident, EducationalLevel } from '@/types';
import { toast } from 'sonner';
import { useIncidentsQuery } from '@/hooks/queries/useIncidentsQuery';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

const PAGE_SIZE = 10;

function matchesIncidentSearch(incident: Incident, term: string): boolean {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  const name = incident.student?.fullName?.toLowerCase() ?? '';
  const fault = incident.faultType?.name?.toLowerCase() ?? '';
  return (
    incident.id.toString().includes(q) ||
    name.includes(q) ||
    fault.includes(q)
  );
}

export const IncidentsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [levelFilter, setLevelFilter] = useState<'all' | EducationalLevel>('all');

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

  usePerformanceMetrics('IncidentsList');

  const incidentFilters = useMemo(
    () => ({
      nivelEducativo: levelFilter === 'all' ? undefined : levelFilter,
    }),
    [levelFilter]
  );

  const {
    data: incidents = [],
    isLoading,
    isError,
  } = useIncidentsQuery(incidentFilters);

  useEffect(() => {
    if (isError) {
      toast.error('Error al cargar incidencias');
    }
  }, [isError]);

  const filteredIncidents = useMemo(
    () => incidents.filter((incident) => matchesIncidentSearch(incident, searchTerm)),
    [incidents, searchTerm]
  );

  const totalPages = Math.max(1, Math.ceil(filteredIncidents.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, levelFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedIncidents = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredIncidents.slice(start, start + PAGE_SIZE);
  }, [filteredIncidents, currentPage]);

  const handleExportExcel = () => {
    const parts: string[] = [];
    if (levelFilter !== 'all') parts.push(`Nivel: ${levelFilter}`);
    if (searchTerm.trim()) parts.push(`Búsqueda: "${searchTerm.trim()}"`);
    void exportIncidentsListExcel(filteredIncidents, parts.length ? parts.join(' · ') : undefined);
  };

  if (isLoading) {
    return <PageLoader message="Cargando incidencias..." />;
  }

  const activeCount = filteredIncidents.filter((i) => i.status === 'Activa').length;
  const withEvidence = filteredIncidents.filter((i) => i.hasEvidence).length;

  const AnimatedDiv = animated('div');

  return (
    <div className="app-page app-page-shell relative overflow-hidden">
      {/* Decoraciones de fondo */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-40 -left-20 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/3 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <AnimatedDiv style={headerSpring}>
        <PageHeader
          icon={FileText}
          eyebrow="Incidencias"
          title="Lista de Incidencias"
          description="Historial completo con filtros por nivel y exportación a Excel"
          accent="warning"
        >
          <Badge variant="outline" className="hidden sm:inline-flex gap-1 border-accent/40 bg-accent/5 text-accent">
            <Sparkles className="w-3 h-3" />
            Vista mejorada
          </Badge>
          <Button
            variant="outline-primary"
            onClick={handleExportExcel}
            disabled={filteredIncidents.length === 0}
            className="transition-transform hover:scale-[1.03]"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
        </PageHeader>
      </AnimatedDiv>

      <div className="app-kpi-grid !grid-cols-1 sm:!grid-cols-3">
        <AnimatedDiv style={kpiTrail[0]}>
          <StaffKpiStat
            label="En listado"
            value={filteredIncidents.length}
            hint={`${incidents.length} cargadas`}
            icon={FileText}
            tone="primary"
          />
        </AnimatedDiv>
        <AnimatedDiv style={kpiTrail[1]}>
          <StaffKpiStat
            label="Activas"
            value={activeCount}
            hint="Pendientes de gestión"
            hintIcon={AlertCircle}
            icon={AlertCircle}
            tone="warning"
          />
        </AnimatedDiv>
        <AnimatedDiv style={kpiTrail[2]}>
          <StaffKpiStat
            label="Con evidencia"
            value={withEvidence}
            hint="Registros documentados"
            hintIcon={CheckCircle2}
            icon={Camera}
            tone="success"
          />
        </AnimatedDiv>
      </div>

      <AnimatedDiv style={panelSpring} className="space-y-6">
        <StaffToolbar title="Buscar y filtrar" description="Refine por texto o nivel educativo">
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="incidents-search">Buscar</Label>
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="incidents-search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ID, nombre del estudiante o tipo de falta..."
                className="min-w-[12rem] pl-10 transition-all focus-visible:ring-2 focus-visible:ring-primary/40"
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

        <StaffDataPanel className="overflow-hidden border-l-[3px] border-l-primary/40">
          <StaffDataPanelHeader
            title={`Registros (${filteredIncidents.length})`}
            description={
              filteredIncidents.length > PAGE_SIZE
                ? `Página ${currentPage} de ${totalPages} · ${PAGE_SIZE} por página`
                : 'Detalle, evidencia y estado de cada incidencia'
            }
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
                    <TableRow className="bg-gradient-to-r from-primary/5 via-transparent to-accent/5">
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
                    {paginatedIncidents.map((incident, idx) => (
                      <TableRow 
                        key={incident.id}
                        role="row"
                        aria-label={`Incidencia ${incident.id} - ${incident.student?.fullName || 'N/A'}`}
                        className="animate-fade-in transition-colors hover:bg-primary/5"
                        style={{ animationDelay: `${Math.min(idx * 30, 400)}ms` }}
                      >
                      <TableCell className="font-mono text-sm">{incident.id}</TableCell>
                      <TableCell className="max-w-[14rem]">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{incident.student?.fullName || 'N/A'}</p>
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
                                className="hover:bg-primary/10 hover:text-primary"
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
                                <div className="space-y-6 animate-fade-in">
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
                                    <Card className="border-l-[3px] border-l-primary/50">
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
                                    <Card className="border-l-[3px] border-l-warning/50">
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
                                    <Card className="border-l-[3px] border-l-accent/50">
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
                          <Button variant="ghost" size="sm" className="hover:bg-info/10 hover:text-info">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="hover:bg-destructive/10 hover:text-destructive">
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
            {filteredIncidents.length > PAGE_SIZE && (
              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage((p) => Math.max(1, p - 1));
                      }}
                      className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - currentPage) <= 1
                    )
                    .map((page, idx, arr) => {
                      const prev = arr[idx - 1];
                      const showEllipsis = prev != null && page - prev > 1;
                      return (
                        <span key={page} className="contents">
                          {showEllipsis && (
                            <PaginationItem>
                              <span className="px-2 text-muted-foreground">…</span>
                            </PaginationItem>
                          )}
                          <PaginationItem>
                            <PaginationLink
                              href="#"
                              isActive={page === currentPage}
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(page);
                              }}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        </span>
                      );
                    })}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage((p) => Math.min(totalPages, p + 1));
                      }}
                      className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </StaffDataPanel>
      </AnimatedDiv>
    </div>
  );
};