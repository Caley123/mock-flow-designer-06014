import { useEffect, useMemo, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { arrivalService } from '@/lib/services';
import { EducationalLevel, MonthlyAttendanceRow } from '@/types';
import { Loader2, Printer, FileDown, FileSpreadsheet, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  addBrandedExcelHeader,
  addExcelWatermark,
  createWorkbook,
  defaultExportFilename,
  runExcelExport,
  saveWorkbook,
  setColumnWidths,
} from '@/lib/utils/excelExport';
import { buildAttendanceDetailSheet } from '@/lib/utils/excelListExports';
import { PdfReportDocument, buildFilterSubtitle } from '@/lib/utils/pdfReportBuilder';
import { REPORT_LOGO_PATH } from '@/lib/utils/reportLogo';
import { getCurrentSchoolYear, getAllBimestres, formatBimestreLabel, type Bimestre } from '@/lib/utils/bimestreUtils';

const LEVELS: EducationalLevel[] = ['Primaria', 'Secundaria'];
const GRADES = ['1ro', '2do', '3ro', '4to', '5to', '6to'];
const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const statusMap: Record<string, { label: string; className: string; description: string }> = {
  A_tiempo: { label: 'A', className: 'bg-emerald-100 text-emerald-700', description: 'A tiempo' },
  Tarde: { label: 'T', className: 'bg-amber-100 text-amber-700', description: 'Tardanza' },
  Justificada: { label: 'J', className: 'bg-blue-100 text-blue-700', description: 'Justificada' },
  Injustificada: { label: 'I', className: 'bg-rose-100 text-rose-700', description: 'Injustificada' },
  Sin_registro: { label: '—', className: 'text-muted-foreground', description: 'Sin registro' },
};

const getCurrentMonthValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const AttendanceReport = () => {
  const [reportType, setReportType] = useState<'monthly' | 'bimestral'>('monthly');
  const [monthValue, setMonthValue] = useState(getCurrentMonthValue());
  const [bimestre, setBimestre] = useState<Bimestre | 'all'>('all');
  const [añoEscolar, setAñoEscolar] = useState<number>(getCurrentSchoolYear());
  const [levelFilter, setLevelFilter] = useState<'all' | EducationalLevel>('all');
  const [gradeFilter, setGradeFilter] = useState<'all' | string>('all');
  const [sectionFilter, setSectionFilter] = useState<'all' | string>('all');
  const [rows, setRows] = useState<MonthlyAttendanceRow[]>([]);
  const [daysInMonth, setDaysInMonth] = useState<number>(new Date().getDate());
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);

  const fetchReport = async () => {
    if (!isMountedRef.current) return;
    
    setLoading(true);
    try {
      if (reportType === 'bimestral') {
        if (bimestre === 'all') {
          toast.error('Por favor selecciona un bimestre');
          if (isMountedRef.current) {
            setLoading(false);
          }
          return;
        }
        
        const { rows: reportRows, daysInBimestre: totalDays, error } = await arrivalService.getBimestralAttendance({
          bimestre: bimestre,
          añoEscolar: añoEscolar,
          level: levelFilter === 'all' ? undefined : levelFilter,
          grade: gradeFilter === 'all' ? undefined : gradeFilter,
          section: sectionFilter === 'all' ? undefined : sectionFilter,
        });

        if (!isMountedRef.current) return;

        if (error) {
          toast.error(error);
          setRows([]);
          setDaysInMonth(0);
        } else {
          setRows(reportRows);
          setDaysInMonth(totalDays);
        }
      } else {
        const [yearStr, monthStr] = monthValue.split('-');
        if (!yearStr || !monthStr) {
          if (isMountedRef.current) {
            setLoading(false);
          }
          return;
        }
        
        const { rows: reportRows, daysInMonth: totalDays, error } = await arrivalService.getMonthlyAttendance({
          month: Number(monthStr),
          year: Number(yearStr),
          level: levelFilter === 'all' ? undefined : levelFilter,
          grade: gradeFilter === 'all' ? undefined : gradeFilter,
          section: sectionFilter === 'all' ? undefined : sectionFilter,
        });

        if (!isMountedRef.current) return;

        if (error) {
          toast.error(error);
          setRows([]);
          setDaysInMonth(0);
        } else {
          setRows(reportRows);
          setDaysInMonth(totalDays);
        }
      }
    } catch (error: any) {
      if (!isMountedRef.current) return;
      toast.error(error?.message || 'Error al generar reporte');
      setRows([]);
      setDaysInMonth(0);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    fetchReport();
    
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, bimestre, añoEscolar]);

  const daysArray = useMemo(() => Array.from({ length: daysInMonth }, (_, idx) => idx + 1), [daysInMonth]);

  const totalsGlobal = useMemo(() => {
    return rows.reduce(
      (acc, row) => ({
        onTime: acc.onTime + row.totals.onTime,
        late: acc.late + row.totals.late,
        justified: acc.justified + row.totals.justified,
        unjustified: acc.unjustified + row.totals.unjustified,
      }),
      { onTime: 0, late: 0, justified: 0, unjustified: 0 }
    );
  }, [rows]);

  const handlePrint = () => {
    if (!isMountedRef.current) return;
    window.print();
  };

  const exportToPDF = async () => {
    if (!isMountedRef.current) return;

    if (rows.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    try {
      toast.loading('Generando PDF...', { id: 'pdf-export' });

      const monthLabel = format(
        new Date(`${monthValue}-01T12:00:00`),
        "MMMM yyyy",
        { locale: es }
      );

      const subtitle = buildFilterSubtitle([
        `Período: ${monthLabel}`,
        `Generado ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}`,
        levelFilter !== 'all' && `Nivel: ${levelFilter}`,
        gradeFilter !== 'all' && `Grado: ${gradeFilter}`,
        sectionFilter !== 'all' && `Sección: ${sectionFilter}`,
      ]);

      const doc = new PdfReportDocument(
        'landscape',
        'REPORTE MENSUAL DE ASISTENCIAS',
        subtitle
      );
      await doc.drawCoverHeader();

      doc.drawKpiCards([
        { label: 'A tiempo', value: totalsGlobal.onTime, tone: 'success' },
        { label: 'Tardanzas', value: totalsGlobal.late, tone: 'warning' },
        { label: 'Justificadas', value: totalsGlobal.justified, tone: 'info' },
        { label: 'Injustificadas', value: totalsGlobal.unjustified, tone: 'error' },
      ]);

      doc.drawParagraph(
        'Leyenda de estados: A = A tiempo · T = Tardanza · J = Justificada · I = Injustificada · — = Sin registro'
      );

      doc.drawSectionTitle('Resumen por estudiante');
      doc.drawTable(
        [
          { header: 'Estudiante', dataKey: 'student', width: 52 },
          { header: 'Nivel', dataKey: 'level', width: 22 },
          { header: 'Grado', dataKey: 'grade', width: 16 },
          { header: 'Sec.', dataKey: 'section', width: 12, align: 'center' },
          { header: 'A tiempo', dataKey: 'onTime', width: 16, align: 'center' },
          { header: 'Tardanzas', dataKey: 'late', width: 16, align: 'center' },
          { header: 'Justif.', dataKey: 'justified', width: 14, align: 'center' },
          { header: 'Injustif.', dataKey: 'unjustified', width: 14, align: 'center' },
          {
            header: '% Puntualidad',
            dataKey: 'punctuality',
            width: 22,
            align: 'right',
          },
        ],
        rows.map((row) => {
          const totalMarked =
            row.totals.onTime + row.totals.late + row.totals.justified + row.totals.unjustified;
          const punctuality =
            totalMarked > 0 ? Math.round((row.totals.onTime / totalMarked) * 100) : 0;
          return {
            student: row.student.fullName,
            level: row.student.level,
            grade: row.student.grade,
            section: row.student.section,
            onTime: String(row.totals.onTime),
            late: String(row.totals.late),
            justified: String(row.totals.justified),
            unjustified: String(row.totals.unjustified),
            punctuality: `${punctuality}%`,
          };
        }),
        { fontSize: 8 }
      );

      if (daysArray.length <= 28) {
        doc.drawSectionTitle('Registro diario del mes');
        doc.drawParagraph(
          'Matriz de asistencia por día. Para el detalle completo exporte también el archivo Excel.'
        );

        const dayLabel = (d: number) => String(d);
        const dayColumns = daysArray.map((day) => ({
          header: dayLabel(day),
          dataKey: `d${day}`,
          width: 6,
          align: 'center' as const,
        }));

        const statusChar = (status: string) => {
          const info = statusMap[status] || statusMap.Sin_registro;
          return info.label === '—' ? '·' : info.label;
        };

        doc.drawTable(
          [
            { header: 'Estudiante', dataKey: 'student', width: 40 },
            ...dayColumns,
            { header: 'A', dataKey: 'onTime', width: 8, align: 'center' },
            { header: 'T', dataKey: 'late', width: 8, align: 'center' },
          ],
          rows.map((row) => {
            const record: Record<string, string> = {
              student:
                row.student.fullName.length > 22
                  ? `${row.student.fullName.slice(0, 20)}…`
                  : row.student.fullName,
              onTime: String(row.totals.onTime),
              late: String(row.totals.late),
            };
            row.days.forEach((day) => {
              record[`d${day.day}`] = statusChar(day.status);
            });
            return record;
          }),
          { fontSize: 6 }
        );
      } else {
        doc.drawParagraph(
          'El mes tiene muchos días para mostrar la matriz diaria en PDF. Use Exportar Excel para el calendario completo.'
        );
      }

      const fileName = `Reporte_Asistencias_${monthValue.replace('-', '_')}.pdf`;
      await doc.finalize(fileName);

      if (!isMountedRef.current) return;
      toast.success('PDF generado exitosamente', { id: 'pdf-export' });
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Error al generar PDF:', err);
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error al generar PDF: ${message}`, { id: 'pdf-export' });
    }
  };

  const exportToExcel = async () => {
    if (!isMountedRef.current) return;
    if (rows.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    const filterParts = [`Mes: ${monthValue}`];
    if (levelFilter !== 'all') filterParts.push(`Nivel: ${levelFilter}`);
    if (gradeFilter !== 'all') filterParts.push(`Grado: ${gradeFilter}`);
    if (sectionFilter !== 'all') filterParts.push(`Sección: ${sectionFilter}`);

    await runExcelExport('reporte de asistencias', async () => {
      const workbook = createWorkbook('Reporte de asistencias');
      await buildAttendanceDetailSheet(
        workbook,
        'Asistencias',
        'REPORTE MENSUAL DE ASISTENCIAS',
        filterParts.join(' · '),
        daysArray,
        rows,
        totalsGlobal
      );

      const summarySheet = workbook.addWorksheet('Resumen');
      await addBrandedExcelHeader(
        workbook,
        summarySheet,
        'RESUMEN GLOBAL',
        filterParts.join(' · '),
        2
      );
      summarySheet.addRow(['Concepto', 'Cantidad']);
      summarySheet.addRow(['A tiempo', totalsGlobal.onTime]);
      summarySheet.addRow(['Tardanzas', totalsGlobal.late]);
      summarySheet.addRow(['Justificadas', totalsGlobal.justified]);
      summarySheet.addRow(['Injustificadas', totalsGlobal.unjustified]);
      setColumnWidths(summarySheet, [22, 14]);
      await addExcelWatermark(workbook, summarySheet, { mergeCols: 2, centerRow: 10 });

      await saveWorkbook(
        workbook,
        defaultExportFilename(`Asistencias_${monthValue.replace('-', '_')}`)
      );
    });
  };

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-5 print:opacity-15">
        <img src={REPORT_LOGO_PATH} alt="Guardy" className="max-w-[50%] rounded-2xl opacity-10" />
      </div>
      <style>
        {`@media print {
            @page { size: landscape; margin: 12mm; }
            body * {
              visibility: hidden;
            }
            #attendance-report, #attendance-report * {
              visibility: visible;
            }
            #attendance-report {
              position: absolute;
              inset: 0;
              margin: 0;
              width: 100%;
              background: white;
            }
            #attendance-report .print-hidden {
              display: none !important;
            }
          }`}
      </style>
      <div id="attendance-report" className="app-page app-page-shell relative z-10">
        <div className="print-hidden space-y-6">
        <PageHeader
          icon={Calendar}
          eyebrow="Reportes"
          title="Reporte de Asistencias"
          description={
            reportType === 'monthly'
              ? 'Resumen mensual por estudiante: tardanzas, faltas y justificaciones.'
              : bimestre !== 'all'
                ? `Bimestre: ${formatBimestreLabel(getAllBimestres(añoEscolar).find(b => b.numero === bimestre)!)}`
                : 'Consolidado de asistencia según el bimestre seleccionado.'
          }
          accent="success"
        >
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                fetchReport();
              }} 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cargando
                </>
              ) : (
                'Actualizar'
              )}
            </Button>
            <Button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePrint();
              }} 
              variant="ghost" 
              disabled={rows.length === 0}
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            <Button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                exportToPDF();
              }} 
              variant="ghost" 
              disabled={rows.length === 0}
            >
              <FileDown className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
            <Button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                exportToExcel();
              }} 
              variant="ghost" 
              disabled={rows.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </PageHeader>

        <Card className="print-hidden app-card">
          <CardHeader className="app-card-header">
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Tipo de Reporte</p>
              <Select value={reportType} onValueChange={(value: 'monthly' | 'bimestral') => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="bimestral">Bimestral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {reportType === 'monthly' ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Mes</p>
                <Input
                  type="month"
                  value={monthValue}
                  onChange={(e) => setMonthValue(e.target.value)}
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Año Escolar</p>
                  <Input
                    type="number"
                    value={añoEscolar}
                    onChange={(e) => setAñoEscolar(Number(e.target.value))}
                    min={2020}
                    max={2050}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Bimestre</p>
                  <Select value={bimestre === 'all' ? 'all' : String(bimestre)} onValueChange={(value) => setBimestre(value === 'all' ? 'all' : (Number(value) as Bimestre))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar bimestre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los bimestres</SelectItem>
                      {getAllBimestres(añoEscolar).map((b) => (
                        <SelectItem key={b.numero} value={String(b.numero)}>
                          {formatBimestreLabel(b)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Nivel</p>
              <Select value={levelFilter} onValueChange={(value) => setLevelFilter(value as 'all' | EducationalLevel)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Grado</p>
              <Select value={gradeFilter} onValueChange={(value) => setGradeFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {GRADES.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Sección</p>
              <Select value={sectionFilter} onValueChange={(value) => setSectionFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {SECTIONS.map((section) => (
                    <SelectItem key={section} value={section}>
                      {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex items-end">
              <Button
                className="w-full"
                disabled={loading}
                onClick={fetchReport}
              >
                {loading ? 'Cargando...' : 'Consultar'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="app-card">
          <CardHeader>
            <CardTitle>Planilla mensual</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mr-3" />
                Cargando asistencias...
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center text-muted-foreground py-16">No hay datos para los filtros seleccionados</div>
            ) : (
              <div className="overflow-auto rounded-lg border">
                <table className="min-w-[960px] text-xs">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground text-center">
                      <th className="sticky left-0 bg-muted/50 px-3 py-2 text-left align-middle">Estudiante</th>
                      {daysArray.map((day) => (
                        <th key={day} className="px-2 py-2 min-w-[32px]">{day}</th>
                      ))}
                      <th className="px-2 py-2 min-w-[48px]">A</th>
                      <th className="px-2 py-2 min-w-[48px]">T</th>
                      <th className="px-2 py-2 min-w-[48px]">J</th>
                      <th className="px-2 py-2 min-w-[48px]">I</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.student.id} className="border-t">
                        <td className="sticky left-0 bg-background px-3 py-2 font-medium text-sm">
                          <div>{row.student.fullName}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {row.student.level} • {row.student.grade} {row.student.section}
                          </div>
                        </td>
                        {row.days.map((day) => {
                          const info = statusMap[day.status] || statusMap.Sin_registro;
                          return (
                            <td key={day.day} className="px-1 py-2 text-center">
                              <span
                                className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-semibold ${info.className}`}
                              >
                                {info.label}
                              </span>
                            </td>
                          );
                        })}
                        <td className="px-2 py-2 text-center font-semibold text-emerald-700">{row.totals.onTime}</td>
                        <td className="px-2 py-2 text-center font-semibold text-amber-700">{row.totals.late}</td>
                        <td className="px-2 py-2 text-center font-semibold text-blue-700">{row.totals.justified}</td>
                        <td className="px-2 py-2 text-center font-semibold text-rose-700">{row.totals.unjustified}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="app-card">
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase text-muted-foreground">A tiempo</p>
              <p className="text-2xl font-bold text-emerald-700">{totalsGlobal.onTime}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase text-muted-foreground">Tardanzas</p>
              <p className="text-2xl font-bold text-amber-700">{totalsGlobal.late}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase text-muted-foreground">Justificadas</p>
              <p className="text-2xl font-bold text-blue-700">{totalsGlobal.justified}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase text-muted-foreground">Injustificadas</p>
              <p className="text-2xl font-bold text-rose-700">{totalsGlobal.unjustified}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="app-card">
          <CardHeader>
            <CardTitle>Leyenda</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4 text-sm">
            {Object.entries(statusMap).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-semibold ${value.className}`}>
                  {value.label}
                </span>
                <span className="text-muted-foreground">{value.description}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
};

