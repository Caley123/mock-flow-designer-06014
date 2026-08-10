import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  GraduationCap,
  Loader2,
  RefreshCw,
  FileSpreadsheet,
  Download,
  FileText,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoader } from '@/components/ui/page-loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  StaffDataPanel,
  StaffDataPanelBody,
  StaffDataPanelHeader,
  StaffEmptyState,
  StaffKpiStat,
  StaffToolbar,
} from '@/components/staff';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotasImportPanel } from '@/components/notas/NotasImportPanel';
import { notasService, studentsService } from '@/lib/services';
import type {
  NotasArea,
  NotasCarrera,
  NotasDeclaracion,
  NotasImportLog,
  NotasRankingArea,
  NotasRow,
  NotasSemana,
} from '@/types/notas';
import type { Student } from '@/types';
import {
  buildNotasRankingExcelBuffer,
  buildNotasRankingPdfHtml,
} from '@/lib/utils/notasReportExport';

type DeclDraft = { areaId: number | null; carreraId: number | null };

export const NotasAdmin = () => {
  const [semanas, setSemanas] = useState<NotasSemana[]>([]);
  const [semanaId, setSemanaId] = useState<number | null>(null);
  const [areas, setAreas] = useState<NotasArea[]>([]);
  const [carreras, setCarreras] = useState<NotasCarrera[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [declaraciones, setDeclaraciones] = useState<NotasDeclaracion[]>([]);
  const [drafts, setDrafts] = useState<Record<number, DeclDraft>>({});
  const [notas, setNotas] = useState<NotasRow[]>([]);
  const [ranking, setRanking] = useState<NotasRankingArea[]>([]);
  const [logs, setLogs] = useState<NotasImportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingDecl, setSavingDecl] = useState(false);
  const [search, setSearch] = useState('');
  const [filtroArea, setFiltroArea] = useState<string>('all');

  const semana = useMemo(
    () => semanas.find((s) => s.id === semanaId) ?? null,
    [semanas, semanaId],
  );

  const loadMeta = useCallback(async () => {
    const [semRes, areaRes, carRes, stuRes] = await Promise.all([
      notasService.listSemanas(true),
      notasService.listAreas(),
      notasService.listCarreras(),
      studentsService.getAll({ active: true, fetchAll: true }),
    ]);
    if (semRes.error) toast.error(semRes.error);
    else {
      setSemanas(semRes.semanas);
      setSemanaId((prev) => {
        if (prev && semRes.semanas.some((s) => s.id === prev)) return prev;
        return semRes.semanas[0]?.id ?? null;
      });
    }
    if (!areaRes.error) setAreas(areaRes.areas);
    if (!carRes.error) setCarreras(carRes.carreras);
    if (!stuRes.error) setStudents(stuRes.students);
  }, []);

  const loadWeekData = useCallback(async (id: number, silent?: boolean) => {
    if (silent) setRefreshing(true);
    try {
      const [decl, list, rank, logRes] = await Promise.all([
        notasService.listDeclaraciones(id),
        notasService.listNotas(id),
        notasService.ranking(id, 20),
        notasService.listImportLogs(15),
      ]);
      if (decl.error) toast.error(decl.error);
      else {
        setDeclaraciones(decl.declaraciones);
        const next: Record<number, DeclDraft> = {};
        for (const d of decl.declaraciones) {
          next[d.idEstudiante] = { areaId: d.areaId, carreraId: d.carreraId };
        }
        setDrafts(next);
      }
      if (list.error) toast.error(list.error);
      else setNotas(list.notas);
      if (!rank.error) setRanking(rank.porArea);
      if (!logRes.error) setLogs(logRes.logs);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await loadMeta();
      setLoading(false);
    })();
  }, [loadMeta]);

  useEffect(() => {
    if (semanaId == null) return;
    void loadWeekData(semanaId);
  }, [semanaId, loadWeekData]);

  const filteredNotas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notas.filter((n) => {
      if (filtroArea !== 'all' && String(n.areaId) !== filtroArea) return false;
      if (!q) return true;
      return `${n.nombreEstudiante} ${n.barcode}`.toLowerCase().includes(q);
    });
  }, [notas, search, filtroArea]);

  const studentsForDecl = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      `${s.fullName} ${s.barcode}`.toLowerCase().includes(q),
    );
  }, [students, search]);

  const saveDeclaraciones = async () => {
    if (semanaId == null) return;
    if (!semana?.abiertaDeclaracion) {
      toast.error('La declaración de esta semana está cerrada');
      return;
    }
    const filas = Object.entries(drafts)
      .filter(([, d]) => d.areaId != null)
      .map(([id, d]) => ({
        id_estudiante: Number(id),
        area_id: d.areaId!,
        carrera_id: d.carreraId,
      }));
    if (!filas.length) {
      toast.error('Asigne al menos un área');
      return;
    }
    setSavingDecl(true);
    try {
      const res = await notasService.upsertDeclaraciones(semanaId, filas);
      if (res.error) toast.error(res.error);
      else {
        toast.success(`Declaraciones: ${res.okCount} ok · ${res.failCount} fallos`);
        await loadWeekData(semanaId, true);
      }
    } finally {
      setSavingDecl(false);
    }
  };

  const assignBulkArea = (areaId: number) => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const s of studentsForDecl) {
        const cur = next[s.id] ?? { areaId: null, carreraId: null };
        next[s.id] = {
          areaId,
          carreraId:
            cur.carreraId != null &&
            carreras.some((c) => c.id === cur.carreraId && c.areaId === areaId)
              ? cur.carreraId
              : null,
        };
      }
      return next;
    });
  };

  const downloadExcel = async () => {
    if (!semana) return;
    const buf = await buildNotasRankingExcelBuffer(semana.etiqueta, ranking, notas);
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ranking-notas-${semana.codigo}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    if (!semana) return;
    const html = buildNotasRankingPdfHtml(semana.etiqueta, ranking);
    const w = window.open('', '_blank');
    if (!w) {
      toast.error('Permite ventanas emergentes para exportar PDF');
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  if (loading) return <PageLoader />;

  return (
    <div className="app-page app-page-shell space-y-6">
      <PageHeader
        icon={GraduationCap}
        eyebrow="Estudiantes"
        title="Notas por área"
        description="Declaración semanal de área, importación Excel y ranking"
        accent="secondary"
      />

      <div className="app-kpi-grid !grid-cols-2 sm:!grid-cols-4">
        <StaffKpiStat
          label="Semanas"
          value={semanas.length}
          hint="activas"
          icon={GraduationCap}
          tone="info"
        />
        <StaffKpiStat
          label="Declaraciones"
          value={declaraciones.length}
          hint={semana?.codigo ?? '—'}
          icon={FileText}
          tone="success"
        />
        <StaffKpiStat
          label="Notas"
          value={notas.length}
          hint="cargadas"
          icon={FileSpreadsheet}
          tone="warning"
        />
        <StaffKpiStat
          label="Áreas"
          value={areas.length}
          hint="Salud · Ing. · Letras"
          icon={GraduationCap}
          tone="info"
        />
      </div>

      <StaffToolbar>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px]">
            <Label>Semana</Label>
            <Select
              value={semanaId != null ? String(semanaId) : undefined}
              onValueChange={(v) => setSemanaId(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione semana" />
              </SelectTrigger>
              <SelectContent>
                {semanas.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.etiqueta} ({s.codigo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            disabled={refreshing || semanaId == null}
            onClick={() => semanaId != null && void loadWeekData(semanaId, true)}
          >
            {refreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Actualizar
          </Button>
          {semana && (
            <p className="text-xs text-muted-foreground max-w-md">
              {semana.fechaInicio} → {semana.fechaFin}
              {semana.abiertaDeclaracion ? ' · declaración abierta' : ' · declaración cerrada'}
              {semana.abiertaCargaNotas ? ' · carga abierta' : ' · carga cerrada'}
            </p>
          )}
        </div>
      </StaffToolbar>

      {semanaId == null || !semana ? (
        <StaffEmptyState
          icon={GraduationCap}
          title="Sin semanas"
          description="Cree una semana en Administración → Configuración."
        />
      ) : (
        <Tabs defaultValue="declaraciones">
          <TabsList>
            <TabsTrigger value="declaraciones">Declaraciones</TabsTrigger>
            <TabsTrigger value="importar">Importar</TabsTrigger>
            <TabsTrigger value="listado">Listado</TabsTrigger>
            <TabsTrigger value="reportes">Reportes</TabsTrigger>
          </TabsList>

          <TabsContent value="declaraciones" className="mt-4">
            <StaffDataPanel>
              <StaffDataPanelHeader
                accent="info"
                title="Área por estudiante"
                description="Asignable mientras la semana tenga la declaración abierta. Se puede cambiar antes del examen."
              />
              <StaffDataPanelBody className="space-y-4">
                <div className="flex flex-wrap gap-3 items-end">
                  <Input
                    placeholder="Buscar alumno…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-xs"
                  />
                  <div className="flex flex-wrap gap-2">
                    {areas.map((a) => (
                      <Button
                        key={a.id}
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => assignBulkArea(a.id)}
                        disabled={!semana.abiertaDeclaracion}
                      >
                        Todos → {a.nombre}
                      </Button>
                    ))}
                  </div>
                  <Button
                    onClick={() => void saveDeclaraciones()}
                    disabled={savingDecl || !semana.abiertaDeclaracion}
                  >
                    {savingDecl ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Guardar declaraciones
                  </Button>
                </div>
                <div className="max-h-[480px] overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Estudiante</TableHead>
                        <TableHead>DNI</TableHead>
                        <TableHead>Área</TableHead>
                        <TableHead>Carrera (opc.)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentsForDecl.map((s) => {
                        const d = drafts[s.id] ?? { areaId: null, carreraId: null };
                        const cars = carreras.filter((c) => c.areaId === d.areaId);
                        return (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{s.fullName}</TableCell>
                            <TableCell className="font-mono text-xs">{s.barcode}</TableCell>
                            <TableCell>
                              <Select
                                value={d.areaId != null ? String(d.areaId) : undefined}
                                onValueChange={(v) =>
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [s.id]: { areaId: Number(v), carreraId: null },
                                  }))
                                }
                                disabled={!semana.abiertaDeclaracion}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue placeholder="Área" />
                                </SelectTrigger>
                                <SelectContent>
                                  {areas.map((a) => (
                                    <SelectItem key={a.id} value={String(a.id)}>
                                      {a.nombre}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={d.carreraId != null ? String(d.carreraId) : 'none'}
                                onValueChange={(v) =>
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [s.id]: {
                                      areaId: d.areaId,
                                      carreraId: v === 'none' ? null : Number(v),
                                    },
                                  }))
                                }
                                disabled={!semana.abiertaDeclaracion || d.areaId == null}
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue placeholder="Carrera" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">—</SelectItem>
                                  {cars.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                      {c.nombre}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </StaffDataPanelBody>
            </StaffDataPanel>
          </TabsContent>

          <TabsContent value="importar" className="mt-4">
            <StaffDataPanel>
              <StaffDataPanelHeader
                accent="info"
                title="Importar Excel de notas"
                description="Parseo en el navegador. El área se toma de la declaración de cada alumno."
              />
              <StaffDataPanelBody>
                <NotasImportPanel
                  semanaId={semanaId}
                  semanaAbiertaCarga={semana.abiertaCargaNotas}
                  onImported={() => void loadWeekData(semanaId, true)}
                />
              </StaffDataPanelBody>
            </StaffDataPanel>
          </TabsContent>

          <TabsContent value="listado" className="mt-4">
            <StaffDataPanel>
              <StaffDataPanelHeader
                title={`Notas — ${semana.etiqueta}`}
                description="Listado de la semana seleccionada"
              />
              <StaffDataPanelBody className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Input
                    placeholder="Buscar…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-xs"
                  />
                  <Select value={filtroArea} onValueChange={setFiltroArea}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Área" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {areas.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {filteredNotas.length === 0 ? (
                  <StaffEmptyState
                    icon={FileSpreadsheet}
                    title="Sin notas"
                    description="Importe un Excel o cambie de semana."
                  />
                ) : (
                  <div className="overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Estudiante</TableHead>
                          <TableHead>DNI</TableHead>
                          <TableHead>Área</TableHead>
                          <TableHead>Nota</TableHead>
                          <TableHead>Obs.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredNotas.map((n) => (
                          <TableRow key={n.id}>
                            <TableCell className="font-medium">{n.nombreEstudiante}</TableCell>
                            <TableCell className="font-mono text-xs">{n.barcode}</TableCell>
                            <TableCell>{n.areaNombre}</TableCell>
                            <TableCell className="font-semibold">{n.nota}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {n.observacion || '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </StaffDataPanelBody>
            </StaffDataPanel>
          </TabsContent>

          <TabsContent value="reportes" className="mt-4 space-y-4">
            <StaffDataPanel>
              <StaffDataPanelHeader
                title="Ranking por área"
                description="Top por área + export Excel (3 hojas) y PDF imprimible"
              />
              <StaffDataPanelBody className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => void downloadExcel()}>
                    <Download className="mr-2 h-4 w-4" />
                    Excel ranking
                  </Button>
                  <Button type="button" variant="outline" onClick={downloadPdf}>
                    <FileText className="mr-2 h-4 w-4" />
                    PDF / imprimir
                  </Button>
                </div>
                {ranking.length === 0 ? (
                  <StaffEmptyState
                    icon={GraduationCap}
                    title="Sin ranking"
                    description="Cargue notas para ver el top por área."
                  />
                ) : (
                  <div className="grid gap-4 md:grid-cols-3">
                    {ranking.map((a) => (
                      <div key={a.areaId} className="rounded-lg border p-3 space-y-2">
                        <h3 className="font-semibold">{a.areaNombre}</h3>
                        <p className="text-xs text-muted-foreground">
                          Mayor:{' '}
                          {a.top[0]
                            ? `${a.top[0].nombreEstudiante} (${a.top[0].nota})`
                            : '—'}
                        </p>
                        <ol className="text-sm space-y-1">
                          {a.top.slice(0, 5).map((t) => (
                            <li key={`${a.areaId}-${t.idEstudiante}`}>
                              {t.puesto}. {t.nombreEstudiante} — {t.nota}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                )}
              </StaffDataPanelBody>
            </StaffDataPanel>

            <StaffDataPanel>
              <StaffDataPanelHeader title="Historial de imports" />
              <StaffDataPanelBody>
                {logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aún no hay imports.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Semana</TableHead>
                        <TableHead>Archivo</TableHead>
                        <TableHead>OK</TableHead>
                        <TableHead>Sin decl.</TableHead>
                        <TableHead>Sin match</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="text-xs">{l.importadoEn}</TableCell>
                          <TableCell>{l.semanaCodigo}</TableCell>
                          <TableCell>{l.nombreArchivo || '—'}</TableCell>
                          <TableCell>{l.filasOk}</TableCell>
                          <TableCell>{l.filasSinDeclaracion}</TableCell>
                          <TableCell>{l.filasSinMatch}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </StaffDataPanelBody>
            </StaffDataPanel>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
