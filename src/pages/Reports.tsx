import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSpring, animated } from '@react-spring/web';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, TrendingUp, Users, AlertTriangle, Calendar, Loader2, Filter, BarChart3, FileDown, FileSpreadsheet } from 'lucide-react';
// @ts-ignore - jspdf types may not be available
import jsPDF from 'jspdf';
// @ts-ignore - exceljs types may not be available
import ExcelJS from 'exceljs';

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { dashboardService, incidentsService } from '@/lib/services';
import { DashboardStats, EducationalLevel } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const Reports = () => {
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<'all' | EducationalLevel>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'moderate' | 'critical'>('all');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const headerAnimation = useSpring({
    from: { opacity: 0, transform: 'translateY(-20px)' },
    to: { opacity: 1, transform: 'translateY(0px)' },
    config: { tension: 200, friction: 20 }
  });

  const AnimatedDiv = animated.div;

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    const { stats: dashboardStats, error } = await dashboardService.getDashboardStats();
    if (error) {
      toast.error('Error al cargar estadísticas');
    } else if (dashboardStats) {
      setStats(dashboardStats);
    }
    setLoading(false);
  };

  const exportToPDF = async () => {
    if (!stats) {
      toast.error('No hay datos para exportar');
      return;
    }

    try {
      toast.loading('Generando PDF...', { id: 'pdf-export' });
      
      // Obtener todas las incidencias para el reporte
      const { incidents: incidentsList } = await incidentsService.getAll({
        nivelEducativo: selectedLevel === 'all' ? undefined : selectedLevel,
        grado: selectedGrade === 'all' ? undefined : selectedGrade,
      });

      // Cargar el logo
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = '/logo2.png';
      
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = () => {
          console.warn('No se pudo cargar el logo, continuando sin él');
          resolve(null);
        };
      });

      // Crear PDF en formato portrait
      const pdf = new jsPDF('portrait', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const margin = 10;
      let currentY = margin + 5;
      const lineHeight = 7;
      const cellHeight = 6;
      const fontSize = 9;
      const headerFontSize = 14;
      
      // Función para agregar nueva página
      const addNewPage = () => {
        pdf.addPage();
        currentY = margin + 5;
      };
      
      // Agregar logo pequeño en la parte superior izquierda (solo primera página)
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        const logoSize = 18;
        const logoHeight = (logoImg.height * logoSize) / logoImg.width;
        pdf.addImage(logoImg.src, 'PNG', margin, margin, logoSize, logoHeight);
        currentY = margin + logoHeight + 3;
      } else {
        currentY = margin + 8;
      }
      
      // Encabezado
      pdf.setFontSize(headerFontSize);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 58, 138);
      pdf.text('REPORTE DE INCIDENCIAS', pdfWidth / 2, currentY, { align: 'center' });
      currentY += lineHeight + 3;
      
      // Información de filtros
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(75, 85, 99);
      let filterText = `Fecha de generación: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`;
      if (selectedLevel !== 'all') filterText += ` | Nivel: ${selectedLevel}`;
      if (selectedGrade !== 'all') filterText += ` | Grado: ${selectedGrade}`;
      pdf.text(filterText, pdfWidth / 2, currentY, { align: 'center' });
      currentY += lineHeight + 8;
      pdf.setTextColor(0, 0, 0);
      
      // Resumen de estadísticas
      pdf.setFontSize(headerFontSize - 2);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 58, 138);
      pdf.text('RESUMEN GENERAL', margin, currentY);
      currentY += lineHeight + 3;
      
      const summaryData = [
        { label: 'Total Incidencias', value: stats.totalIncidents, color: [59, 130, 246], bgColor: [219, 234, 254] },
        { label: 'Estudiantes Involucrados', value: stats.studentsWithIncidents, color: [5, 150, 105], bgColor: [209, 250, 229] },
        { label: 'Nivel Promedio', value: stats.averageReincidenceLevel.toFixed(1), color: [146, 64, 14], bgColor: [254, 243, 199] },
        { label: 'Casos Críticos', value: stats.levelDistribution.level3 + stats.levelDistribution.level4, color: [153, 27, 27], bgColor: [254, 226, 226] },
      ];
      
      // Tarjetas de resumen
      const cardWidth = (pdfWidth - margin * 2 - 6) / 2;
      const cardHeight = 12;
      let cardX = margin;
      let cardY = currentY;
      
      summaryData.forEach(({ label, value, color, bgColor }, index) => {
        if (index === 2) {
          cardX = margin;
          cardY += cardHeight + 3;
        }
        
        pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        pdf.roundedRect(cardX, cardY, cardWidth, cardHeight, 3, 3, 'F');
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.3);
        pdf.roundedRect(cardX, cardY, cardWidth, cardHeight, 3, 3);
        
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(75, 85, 99);
        pdf.text(label, cardX + cardWidth / 2, cardY + 4, { align: 'center' });
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(fontSize + 3);
        pdf.setTextColor(color[0], color[1], color[2]);
        pdf.text(value.toString(), cardX + cardWidth / 2, cardY + 9, { align: 'center' });
        
        cardX += cardWidth + 3;
      });
      
      currentY = cardY + cardHeight + 10;
      
      // Distribución por nivel de reincidencia
      if (currentY + 40 > pdfHeight - margin) {
        addNewPage();
      }
      
      pdf.setFontSize(headerFontSize - 2);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 58, 138);
      pdf.text('DISTRIBUCIÓN POR NIVEL DE REINCIDENCIA', margin, currentY);
      currentY += lineHeight + 3;
      
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      
      levelItems.forEach((item) => {
        if (currentY + cellHeight > pdfHeight - margin) {
          addNewPage();
        }
        
        const percentage = stats.totalIncidents > 0 ? (item.count / stats.totalIncidents) * 100 : 0;
        pdf.text(`${item.level}:`, margin, currentY + 4);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${item.count} (${percentage.toFixed(1)}%)`, pdfWidth - margin - 30, currentY + 4, { align: 'right' });
        pdf.setFont('helvetica', 'normal');
        currentY += lineHeight;
      });
      
      currentY += 5;
      
      // Faltas más frecuentes
      if (currentY + 40 > pdfHeight - margin) {
        addNewPage();
      }
      
      pdf.setFontSize(headerFontSize - 2);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 58, 138);
      pdf.text('FALTAS MÁS FRECUENTES', margin, currentY);
      currentY += lineHeight + 3;
      
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      
      stats.topFaults.slice(0, 10).forEach((fault, index) => {
        if (currentY + cellHeight > pdfHeight - margin) {
          addNewPage();
        }
        
        const percentage = stats.totalIncidents > 0 ? (fault.count / stats.totalIncidents) * 100 : 0;
        pdf.text(`${index + 1}. ${fault.faultType}:`, margin, currentY + 4);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${fault.count} (${percentage.toFixed(1)}%)`, pdfWidth - margin - 30, currentY + 4, { align: 'right' });
        pdf.setFont('helvetica', 'normal');
        currentY += lineHeight;
      });
      
      currentY += 5;
      
      // Tabla de incidencias (si hay espacio)
      if (incidentsList && incidentsList.length > 0 && currentY + 30 < pdfHeight - margin) {
        if (currentY + 50 > pdfHeight - margin) {
          addNewPage();
        }
        
        pdf.setFontSize(headerFontSize - 2);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30, 58, 138);
        pdf.text('DETALLE DE INCIDENCIAS (Primeras 20)', margin, currentY);
        currentY += lineHeight + 3;
        
        // Encabezados de tabla
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.setFillColor(59, 130, 246);
        pdf.rect(margin, currentY, 20, cellHeight, 'F');
        pdf.text('ID', margin + 10, currentY + cellHeight / 2 + 1, { align: 'center' });
        
        pdf.rect(margin + 20, currentY, 60, cellHeight, 'F');
        pdf.text('Estudiante', margin + 50, currentY + cellHeight / 2 + 1, { align: 'center' });
        
        pdf.rect(margin + 80, currentY, 50, cellHeight, 'F');
        pdf.text('Falta', margin + 105, currentY + cellHeight / 2 + 1, { align: 'center' });
        
        pdf.rect(margin + 130, currentY, 25, cellHeight, 'F');
        pdf.text('Nivel', margin + 142.5, currentY + cellHeight / 2 + 1, { align: 'center' });
        
        pdf.rect(margin + 155, currentY, 30, cellHeight, 'F');
        pdf.text('Fecha', margin + 170, currentY + cellHeight / 2 + 1, { align: 'center' });
        
        pdf.setTextColor(0, 0, 0);
        currentY += cellHeight;
        
        // Datos de incidencias
        pdf.setFont('helvetica', 'normal');
        incidentsList.slice(0, 20).forEach((incident) => {
          if (currentY + cellHeight > pdfHeight - margin) {
            addNewPage();
            // Redibujar encabezados si es necesario
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(255, 255, 255);
            pdf.setFillColor(59, 130, 246);
            pdf.rect(margin, currentY, 20, cellHeight, 'F');
            pdf.text('ID', margin + 10, currentY + cellHeight / 2 + 1, { align: 'center' });
            pdf.rect(margin + 20, currentY, 60, cellHeight, 'F');
            pdf.text('Estudiante', margin + 50, currentY + cellHeight / 2 + 1, { align: 'center' });
            pdf.rect(margin + 80, currentY, 50, cellHeight, 'F');
            pdf.text('Falta', margin + 105, currentY + cellHeight / 2 + 1, { align: 'center' });
            pdf.rect(margin + 130, currentY, 25, cellHeight, 'F');
            pdf.text('Nivel', margin + 142.5, currentY + cellHeight / 2 + 1, { align: 'center' });
            pdf.rect(margin + 155, currentY, 30, cellHeight, 'F');
            pdf.text('Fecha', margin + 170, currentY + cellHeight / 2 + 1, { align: 'center' });
            pdf.setTextColor(0, 0, 0);
            currentY += cellHeight;
            pdf.setFont('helvetica', 'normal');
          }
          
          pdf.rect(margin, currentY, 20, cellHeight);
          pdf.text(incident.id.toString(), margin + 10, currentY + cellHeight / 2 + 1, { align: 'center' });
          
          pdf.rect(margin + 20, currentY, 60, cellHeight);
          const studentName = incident.student?.fullName || 'N/A';
          pdf.text(studentName.length > 25 ? studentName.substring(0, 22) + '...' : studentName, margin + 23, currentY + cellHeight / 2 + 1);
          
          pdf.rect(margin + 80, currentY, 50, cellHeight);
          const faultName = incident.faultType?.name || 'N/A';
          pdf.text(faultName.length > 20 ? faultName.substring(0, 17) + '...' : faultName, margin + 83, currentY + cellHeight / 2 + 1);
          
          pdf.rect(margin + 130, currentY, 25, cellHeight);
          pdf.text(incident.reincidenceLevel.toString(), margin + 142.5, currentY + cellHeight / 2 + 1, { align: 'center' });
          
          pdf.rect(margin + 155, currentY, 30, cellHeight);
          pdf.text(format(new Date(incident.registeredAt), 'dd/MM/yyyy', { locale: es }), margin + 158, currentY + cellHeight / 2 + 1);
          
          currentY += cellHeight;
        });
      }
      
      const fileName = `Reporte_Incidencias_${format(new Date(), 'yyyy_MM_dd', { locale: es })}.pdf`;
      pdf.save(fileName);
      
      toast.success('PDF generado exitosamente', { id: 'pdf-export' });
    } catch (error: any) {
      console.error('Error al generar PDF:', error);
      toast.error('Error al generar PDF: ' + (error.message || 'Error desconocido'), { id: 'pdf-export' });
    }
  };

  const exportToExcel = async () => {
    if (!stats) {
      toast.error('No hay datos para exportar');
      return;
    }

    try {
      toast.loading('Generando Excel...', { id: 'excel-export' });
      
      // Obtener todas las incidencias
      const { incidents: incidentsList } = await incidentsService.getAll({
        nivelEducativo: selectedLevel === 'all' ? undefined : selectedLevel,
        grado: selectedGrade === 'all' ? undefined : selectedGrade,
      });
      
      const workbook = new ExcelJS.Workbook();
      
      // Hoja 1: Resumen
      const summarySheet = workbook.addWorksheet('Resumen');
      
      // Cargar el logo
      const logoResponse = await fetch('/logo2.png');
      const logoBuffer = await logoResponse.arrayBuffer();
      const logoImage = workbook.addImage({
        buffer: logoBuffer,
        extension: 'png',
      });
      
      // Agregar logo
      summarySheet.addImage(logoImage, {
        tl: { col: 0, row: 0 },
        ext: { width: 100, height: 50 },
      });
      
      // Encabezado
      summarySheet.getRow(4).height = 25;
      summarySheet.getCell('A4').value = 'REPORTE DE INCIDENCIAS';
      summarySheet.getCell('A4').font = { size: 16, bold: true };
      summarySheet.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };
      summarySheet.mergeCells('A4:D4');
      
      // Filtros aplicados
      let filterText = `Fecha: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`;
      if (selectedLevel !== 'all') filterText += ` | Nivel: ${selectedLevel}`;
      if (selectedGrade !== 'all') filterText += ` | Grado: ${selectedGrade}`;
      summarySheet.getCell('A5').value = filterText;
      summarySheet.getCell('A5').font = { size: 10 };
      summarySheet.mergeCells('A5:D5');
      
      // Resumen de estadísticas
      summarySheet.getRow(7).height = 20;
      summarySheet.getCell('A7').value = 'RESUMEN GENERAL';
      summarySheet.getCell('A7').font = { size: 12, bold: true };
      
      const summaryRows = [
        ['Total Incidencias', stats.totalIncidents],
        ['Estudiantes Involucrados', stats.studentsWithIncidents],
        ['Nivel Promedio', stats.averageReincidenceLevel.toFixed(1)],
        ['Casos Críticos', stats.levelDistribution.level3 + stats.levelDistribution.level4],
      ];
      
      summaryRows.forEach(([label, value], index) => {
        const row = summarySheet.getRow(8 + index);
        row.getCell(1).value = label;
        row.getCell(2).value = value;
        row.getCell(1).font = { bold: true };
        row.getCell(2).font = { bold: true, size: 11 };
      });
      
      // Distribución por nivel
      summarySheet.getRow(13).height = 20;
      summarySheet.getCell('A13').value = 'DISTRIBUCIÓN POR NIVEL DE REINCIDENCIA';
      summarySheet.getCell('A13').font = { size: 12, bold: true };
      
      levelItems.forEach((item, index) => {
        const row = summarySheet.getRow(14 + index);
        const percentage = stats.totalIncidents > 0 ? (item.count / stats.totalIncidents) * 100 : 0;
        row.getCell(1).value = item.level;
        row.getCell(2).value = item.count;
        row.getCell(3).value = `${percentage.toFixed(1)}%`;
      });
      
      // Faltas más frecuentes
      const faultsRow = 20;
      summarySheet.getRow(faultsRow).height = 20;
      summarySheet.getCell(`A${faultsRow}`).value = 'FALTAS MÁS FRECUENTES';
      summarySheet.getCell(`A${faultsRow}`).font = { size: 12, bold: true };
      
      stats.topFaults.forEach((fault, index) => {
        const row = summarySheet.getRow(faultsRow + 1 + index);
        const percentage = stats.totalIncidents > 0 ? (fault.count / stats.totalIncidents) * 100 : 0;
        row.getCell(1).value = `${index + 1}. ${fault.faultType}`;
        row.getCell(2).value = fault.count;
        row.getCell(3).value = `${percentage.toFixed(1)}%`;
      });
      
      // Ajustar ancho de columnas
      summarySheet.columns.forEach((column) => {
        column.width = 30;
      });
      
      // Hoja 2: Detalle de incidencias
      const detailsSheet = workbook.addWorksheet('Detalle de Incidencias');
      
      // Encabezados
      const headers = ['ID', 'Estudiante', 'Nivel', 'Grado', 'Sección', 'Tipo de Falta', 'Categoría', 'Nivel Reincidencia', 'Fecha', 'Hora', 'Observaciones'];
      const headerRow = detailsSheet.addRow(headers);
      headerRow.font = { bold: true, size: 10 };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' },
      };
      headerRow.font = { ...headerRow.font, color: { argb: 'FFFFFFFF' } };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      
      // Datos
      incidentsList.forEach((incident) => {
        const row = detailsSheet.addRow([
          incident.id,
          incident.student?.fullName || 'N/A',
          incident.student?.level || 'N/A',
          incident.student?.grade || 'N/A',
          incident.student?.section || 'N/A',
          incident.faultType?.name || 'N/A',
          incident.faultType?.category || 'N/A',
          incident.reincidenceLevel,
          format(new Date(incident.registeredAt), 'dd/MM/yyyy', { locale: es }),
          format(new Date(incident.registeredAt), 'HH:mm', { locale: es }),
          incident.observations || '',
        ]);
        row.font = { size: 9 };
        row.alignment = { vertical: 'middle' };
      });
      
      // Ajustar ancho de columnas
      detailsSheet.columns.forEach((column, index) => {
        if (index === 0) column.width = 8; // ID
        else if (index === 1) column.width = 30; // Estudiante
        else if (index === 7) column.width = 12; // Nivel Reincidencia
        else if (index === 10) column.width = 40; // Observaciones
        else column.width = 15;
      });
      
      // Descargar archivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Reporte_Incidencias_${format(new Date(), 'yyyy_MM_dd', { locale: es })}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Excel generado exitosamente', { id: 'excel-export' });
    } catch (error: any) {
      console.error('Error al generar Excel:', error);
      toast.error('Error al generar Excel: ' + (error.message || 'Error desconocido'), { id: 'excel-export' });
    }
  };

  const monthlyTrend = [
    { month: 'Jun', incidents: 142 },
    { month: 'Jul', incidents: 168 },
    { month: 'Ago', incidents: 195 },
    { month: 'Sep', incidents: 223 },
    { month: 'Oct', incidents: stats?.incidentsThisMonth || 0 },
  ];

  const weeklyData = [
    { day: 'Lun', count: 8 },
    { day: 'Mar', count: 12 },
    { day: 'Mié', count: 15 },
    { day: 'Jue', count: 10 },
    { day: 'Vie', count: 13 },
  ];

  // Filter data by grade
  const filteredIncidentsByGrade = (stats?.incidentsByGrade || []).filter((item) => {
    const matchesGrade = selectedGrade === 'all' || item.grade === selectedGrade;
    const matchesLevel = selectedLevel === 'all' || item.level === selectedLevel;
    return matchesGrade && matchesLevel;
  });

  // Filter level distribution by severity focus
  const levelItems = stats
    ? [
        { level: 'Nivel 0 - Sin reincidencias', key: 'level0' as const, count: stats.levelDistribution.level0, severity: 'low' },
        { level: 'Nivel 1 - Primera reincidencia', key: 'level1' as const, count: stats.levelDistribution.level1, severity: 'moderate' },
        { level: 'Nivel 2 - Reincidencia moderada', key: 'level2' as const, count: stats.levelDistribution.level2, severity: 'moderate' },
        { level: 'Nivel 3 - Reincidencia alta', key: 'level3' as const, count: stats.levelDistribution.level3, severity: 'critical' },
        { level: 'Nivel 4 - Reincidencia crítica', key: 'level4' as const, count: stats.levelDistribution.level4, severity: 'critical' },
      ]
    : [];

  const filteredLevelItems = levelItems.filter((item) => {
    if (severityFilter === 'all') return true;
    if (severityFilter === 'moderate') return item.severity === 'moderate';
    if (severityFilter === 'critical') return item.severity === 'critical';
    return true;
  });

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Error al cargar las estadísticas</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-white to-beige/30">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-32 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-gold/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto p-6 space-y-6 relative z-10">
        <AnimatedDiv style={headerAnimation} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary via-burgundy to-primary-dark flex items-center justify-center shadow-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-burgundy to-primary-dark text-transparent bg-clip-text">
                  Reportes y Estadísticas
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Visión general de las incidencias registradas en el sistema
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={selectedLevel} onValueChange={(value) => setSelectedLevel(value as 'all' | EducationalLevel)}>
              <SelectTrigger className="w-[170px] bg-white/90 backdrop-blur-sm border-accent/30 shadow-sm hover:shadow-md transition-shadow">
                <SelectValue placeholder="Todos los niveles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los niveles</SelectItem>
                <SelectItem value="Primaria">Primaria</SelectItem>
                <SelectItem value="Secundaria">Secundaria</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedGrade} onValueChange={setSelectedGrade}>
              <SelectTrigger className="w-[170px] bg-white/90 backdrop-blur-sm border-accent/30 shadow-sm hover:shadow-md transition-shadow">
                <SelectValue placeholder="Todos los grados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los grados</SelectItem>
                <SelectItem value="1ro">1ro</SelectItem>
                <SelectItem value="2do">2do</SelectItem>
                <SelectItem value="3ro">3ro</SelectItem>
                <SelectItem value="4to">4to</SelectItem>
                <SelectItem value="5to">5to</SelectItem>
                <SelectItem value="6to">6to</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={(value: any) => setSeverityFilter(value)}>
              <SelectTrigger className="w-[190px] bg-white/90 backdrop-blur-sm border-accent/30 shadow-sm hover:shadow-md transition-shadow">
                <SelectValue placeholder="Enfoque" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los niveles</SelectItem>
                <SelectItem value="moderate">Reincidencias moderadas</SelectItem>
                <SelectItem value="critical">Casos críticos</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="bg-white/90 backdrop-blur-sm border-gold/40 text-foreground shadow-sm hover:shadow-md transition-all hover:border-gold/60">
              <Calendar className="w-4 h-4 mr-2" />
              Periodo actual
            </Button>
            <Button onClick={exportToPDF} disabled={!stats} variant="ghost" className="bg-white/90 backdrop-blur-sm border-accent/30 text-foreground shadow-sm hover:shadow-md transition-all">
              <FileDown className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
            <Button onClick={exportToExcel} disabled={!stats} variant="ghost" className="bg-white/90 backdrop-blur-sm border-accent/30 text-foreground shadow-sm hover:shadow-md transition-all">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </AnimatedDiv>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-burgundy/10 via-cream/50 to-white border-l-4 border-l-primary shadow-lg hover:shadow-xl transition-all">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold bg-gradient-to-br from-primary to-burgundy text-transparent bg-clip-text">{stats.totalIncidents}</div>
                  <p className="text-sm text-warm-gray-600 font-medium mt-1">Total Incidencias</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-burgundy text-white flex items-center justify-center shadow-md">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-gold/10 via-beige/50 to-white border-l-4 border-l-gold shadow-lg hover:shadow-xl transition-all">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold bg-gradient-to-br from-gold to-accent text-transparent bg-clip-text">{stats.studentsWithIncidents}</div>
                  <p className="text-sm text-warm-gray-600 font-medium mt-1">Estudiantes Involucrados</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-accent text-white flex items-center justify-center shadow-md">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-accent/10 via-cream/50 to-white border-l-4 border-l-accent shadow-lg hover:shadow-xl transition-all">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold bg-gradient-to-br from-accent to-gold text-transparent bg-clip-text">{stats.averageReincidenceLevel.toFixed(1)}</div>
                  <p className="text-sm text-warm-gray-600 font-medium mt-1">Nivel Promedio</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-gold text-white flex items-center justify-center shadow-md">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-danger/10 via-beige/50 to-white border-l-4 border-l-danger shadow-lg hover:shadow-xl transition-all">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold bg-gradient-to-br from-danger to-rose-700 text-transparent bg-clip-text">{stats.levelDistribution.level3 + stats.levelDistribution.level4}</div>
                  <p className="text-sm text-warm-gray-600 font-medium mt-1">Casos Críticos</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-danger to-rose-700 text-white flex items-center justify-center shadow-md">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts y detalle */}
        {/* Tendencia mensual a ancho completo */}
        <Card className="bg-white/80 backdrop-blur-sm border-accent/20 shadow-lg">
          <CardHeader className="border-b border-accent/10 bg-gradient-to-r from-cream/30 to-beige/20">
            <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
              <div className="w-2 h-8 bg-gradient-to-b from-primary to-burgundy rounded-full" />
              Tendencia Mensual
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--burgundy))" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--warm-gray-200))" />
                <XAxis dataKey="month" stroke="hsl(var(--warm-gray-600))" />
                <YAxis stroke="hsl(var(--warm-gray-600))" />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid hsl(var(--accent))', borderRadius: '8px' }} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="incidents" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  name="Incidencias"
                  dot={{ fill: 'hsl(var(--burgundy))', r: 5 }}
                  activeDot={{ r: 7 }}
                  fill="url(#colorIncidents)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Fila: Incidencias por día vs por grado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white/80 backdrop-blur-sm border-gold/20 shadow-lg">
            <CardHeader className="border-b border-gold/10 bg-gradient-to-r from-beige/30 to-cream/20">
              <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
                <div className="w-2 h-8 bg-gradient-to-b from-gold to-accent rounded-full" />
                Incidencias por Día (Esta Semana)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyData}>
                  <defs>
                    <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--gold))" stopOpacity={1}/>
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--warm-gray-200))" />
                  <XAxis dataKey="day" stroke="hsl(var(--warm-gray-600))" />
                  <YAxis stroke="hsl(var(--warm-gray-600))" />
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid hsl(var(--gold))', borderRadius: '8px' }} />
                  <Bar dataKey="count" fill="url(#colorBar)" name="Incidencias" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-burgundy/20 shadow-lg">
            <CardHeader className="border-b border-burgundy/10 bg-gradient-to-r from-cream/30 to-beige/20">
              <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
                <div className="w-2 h-8 bg-gradient-to-b from-burgundy to-primary-dark rounded-full" />
                Incidencias por Nivel / Grado
                {(selectedLevel !== 'all' || selectedGrade !== 'all') && (
                  <>
                    {' '}
                    - {selectedLevel !== 'all' ? selectedLevel : 'Todos'}{' '}
                    {selectedGrade !== 'all' ? selectedGrade : ''}
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {filteredIncidentsByGrade.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={filteredIncidentsByGrade} layout="vertical">
                    <defs>
                      <linearGradient id="colorGrade" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1}/>
                        <stop offset="100%" stopColor="hsl(var(--burgundy))" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--warm-gray-200))" />
                    <XAxis type="number" stroke="hsl(var(--warm-gray-600))" />
                    <YAxis dataKey="label" type="category" width={180} stroke="hsl(var(--warm-gray-600))" />
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid hsl(var(--primary))', borderRadius: '8px' }} />
                    <Bar dataKey="count" fill="url(#colorGrade)" name="Incidencias" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No hay datos para el filtro seleccionado
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Fila: Distribución de niveles vs faltas más frecuentes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white/80 backdrop-blur-sm border-accent/20 shadow-lg">
            <CardHeader className="border-b border-accent/10 bg-gradient-to-r from-beige/30 to-cream/20">
              <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
                <div className="w-2 h-8 bg-gradient-to-b from-accent to-gold rounded-full" />
                Distribución por Nivel de Reincidencia
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-5">
                {filteredLevelItems.map((item, index) => (
                  <div key={item.key} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-warm-gray-700">{item.level}</span>
                      <span className="text-sm font-bold bg-gradient-to-r from-primary to-burgundy text-transparent bg-clip-text">{item.count}</span>
                    </div>
                    <div className="w-full bg-warm-gray-100 rounded-full h-3 shadow-inner overflow-hidden">
                      <div
                        className="h-3 rounded-full transition-all duration-500 group-hover:shadow-lg"
                        style={{
                          width: `${stats.totalIncidents > 0 ? (item.count / stats.totalIncidents) * 100 : 0}%`,
                          background:
                            item.severity === 'low'
                              ? 'linear-gradient(90deg, hsl(var(--success)), hsl(var(--success-dark)))'
                              : item.severity === 'moderate'
                              ? 'linear-gradient(90deg, hsl(var(--warning)), hsl(var(--accent)))'
                              : 'linear-gradient(90deg, hsl(var(--danger)), hsl(var(--danger-dark)))'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-primary/20 shadow-lg">
            <CardHeader className="border-b border-primary/10 bg-gradient-to-r from-cream/30 to-beige/20">
              <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
                <div className="w-2 h-8 bg-gradient-to-b from-primary to-primary-dark rounded-full" />
                Faltas Más Frecuentes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {stats.topFaults.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No hay datos disponibles
                </div>
              ) : (
                <div className="space-y-5">
                  {stats.topFaults.map((fault, index) => {
                    const colors = [
                      'from-burgundy to-primary-dark',
                      'from-primary to-burgundy',
                      'from-gold to-accent',
                      'from-accent to-gold',
                      'from-primary-dark to-burgundy'
                    ];
                    return (
                      <div key={index} className="flex items-center gap-4 group">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${colors[index % colors.length]} text-white font-bold shadow-md group-hover:shadow-lg transition-all`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-warm-gray-700">{fault.faultType}</span>
                            <span className="font-bold text-sm bg-gradient-to-r from-primary to-burgundy text-transparent bg-clip-text">{fault.count} incidencias</span>
                          </div>
                          <div className="w-full bg-warm-gray-100 rounded-full h-3 shadow-inner overflow-hidden">
                            <div
                              className={`bg-gradient-to-r ${colors[index % colors.length]} h-3 rounded-full transition-all duration-500 group-hover:shadow-lg`}
                              style={{ 
                                width: `${stats.topFaults.length > 0 && stats.topFaults[0].count > 0 
                                  ? (fault.count / stats.topFaults[0].count) * 100 
                                  : 0}%` 
                              }}
                            />
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-warm-gray-500 min-w-[45px] text-right">
                          {stats.totalIncidents > 0 ? ((fault.count / stats.totalIncidents) * 100).toFixed(1) : 0}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};