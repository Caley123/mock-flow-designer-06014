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
import jsPDF from 'jspdf';
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
import { getCurrentSchoolYear, getAllBimestres, formatBimestreLabel, type Bimestre } from '@/lib/utils/bimestreUtils';

export const Reports = () => {
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<'all' | EducationalLevel>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'moderate' | 'critical'>('all');
  const [bimestre, setBimestre] = useState<Bimestre | 'all'>('all');
  const [añoEscolar, setAñoEscolar] = useState<number>(getCurrentSchoolYear());
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthlyTrend, setMonthlyTrend] = useState<{ month: string; incidents: number }[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ day: string; count: number }[]>([]);
  const [comparisonByGrade, setComparisonByGrade] = useState<Array<{
    grade: string;
    level: EducationalLevel;
    label: string;
    totalIncidents: number;
    studentsWithIncidents: number;
    averageReincidence: number;
    levelDistribution: {
      level0: number;
      level1: number;
      level2: number;
      level3: number;
      level4: number;
    };
  }>>([]);
  const [comparisonBySection, setComparisonBySection] = useState<Array<{
    section: string;
    grade: string;
    level: EducationalLevel;
    label: string;
    totalIncidents: number;
    studentsWithIncidents: number;
    averageReincidence: number;
  }>>([]);

  const headerAnimation = useSpring({
    from: { opacity: 0, transform: 'translateY(-20px)' },
    to: { opacity: 1, transform: 'translateY(0px)' },
    config: { tension: 200, friction: 20 }
  });

  const AnimatedDiv = animated.div;

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bimestre, añoEscolar, selectedLevel, selectedGrade]);

  const loadStats = async () => {
    setLoading(true);
    const filters: any = {};
    
    if (bimestre !== 'all') {
      filters.bimestre = bimestre;
      filters.añoEscolar = añoEscolar;
    }
    
    // Cargar estadísticas, tendencia mensual, datos semanales y comparativos en paralelo
    const [statsResult, trendResult, weeklyResult, gradeComparisonResult, sectionComparisonResult] = await Promise.all([
      dashboardService.getDashboardStats(filters),
      dashboardService.getMonthlyTrend(
        añoEscolar,
        selectedLevel === 'all' ? undefined : selectedLevel,
        selectedGrade === 'all' ? undefined : selectedGrade
      ),
      dashboardService.getWeeklyData(
        selectedLevel === 'all' ? undefined : selectedLevel,
        selectedGrade === 'all' ? undefined : selectedGrade
      ),
      dashboardService.getComparisonByGrade({
        level: selectedLevel === 'all' ? undefined : selectedLevel,
        bimestre: bimestre !== 'all' ? bimestre : undefined,
        añoEscolar: bimestre !== 'all' ? añoEscolar : undefined,
      }),
      dashboardService.getComparisonBySection({
        level: selectedLevel === 'all' ? undefined : selectedLevel,
        grade: selectedGrade === 'all' ? undefined : selectedGrade,
        bimestre: bimestre !== 'all' ? bimestre : undefined,
        añoEscolar: bimestre !== 'all' ? añoEscolar : undefined,
      })
    ]);
    
    if (statsResult.error) {
      toast.error('Error al cargar estadísticas');
    } else if (statsResult.stats) {
      setStats(statsResult.stats);
    }
    
    if (trendResult.error) {
      console.error('Error al cargar tendencia mensual:', trendResult.error);
    } else {
      setMonthlyTrend(trendResult.monthlyTrend);
    }
    
    if (weeklyResult.error) {
      console.error('Error al cargar datos semanales:', weeklyResult.error);
    } else {
      setWeeklyData(weeklyResult.weeklyData);
    }
    
    if (gradeComparisonResult.error) {
      console.error('Error al cargar comparación por grado:', gradeComparisonResult.error);
    } else {
      setComparisonByGrade(gradeComparisonResult.comparison);
    }
    
    if (sectionComparisonResult.error) {
      console.error('Error al cargar comparación por sección:', sectionComparisonResult.error);
    } else {
      setComparisonBySection(sectionComparisonResult.comparison);
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
        bimestre: bimestre !== 'all' ? bimestre : undefined,
        añoEscolar: bimestre !== 'all' ? añoEscolar : undefined,
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

  // monthlyTrend y weeklyData ahora vienen del estado, cargados desde la base de datos

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 p-4 md:p-6 space-y-6 w-full">
      {/* Header */}
      <AnimatedDiv style={headerAnimation}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reportes y Estadísticas</h1>
            <p className="text-gray-600 mt-1">Visión general de las incidencias registradas en el sistema</p>
          </div>
        </div>
      </AnimatedDiv>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <Select value={selectedLevel} onValueChange={(value) => setSelectedLevel(value as 'all' | EducationalLevel)}>
          <SelectTrigger className="w-[170px] bg-white border-gray-300">
            <SelectValue placeholder="Todos los niveles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los niveles</SelectItem>
            <SelectItem value="Primaria">Primaria</SelectItem>
            <SelectItem value="Secundaria">Secundaria</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedGrade} onValueChange={setSelectedGrade}>
          <SelectTrigger className="w-[170px] bg-white border-gray-300">
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
          <SelectTrigger className="w-[190px] bg-white border-gray-300">
            <SelectValue placeholder="Enfoque" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los niveles</SelectItem>
            <SelectItem value="moderate">Reincidencias moderadas</SelectItem>
            <SelectItem value="critical">Casos críticos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={String(añoEscolar)} onValueChange={(value) => setAñoEscolar(Number(value))}>
          <SelectTrigger className="w-[140px] bg-white border-gray-300">
            <SelectValue placeholder="Año escolar" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 5 }, (_, i) => getCurrentSchoolYear() - 2 + i).map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={bimestre === 'all' ? 'all' : String(bimestre)} onValueChange={(value) => setBimestre(value === 'all' ? 'all' : (Number(value) as Bimestre))}>
          <SelectTrigger className="w-[200px] bg-white border-gray-300">
            <SelectValue placeholder="Bimestre" />
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
        <Button onClick={loadStats} variant="outline" className="bg-white border-gray-300">
          <Calendar className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
        <Button onClick={exportToPDF} disabled={!stats} variant="outline" className="bg-white border-gray-300">
          <FileDown className="w-4 h-4 mr-2" />
          PDF
        </Button>
        <Button onClick={exportToExcel} disabled={!stats} variant="outline" className="bg-white border-gray-300">
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Excel
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Incidencias</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalIncidents}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Estudiantes Involucrados</p>
                <p className="text-3xl font-bold text-gray-900">{stats.studentsWithIncidents}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Nivel Promedio</p>
                <p className="text-3xl font-bold text-gray-900">{stats.averageReincidenceLevel.toFixed(1)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Casos Críticos</p>
                <p className="text-3xl font-bold text-gray-900">{stats.levelDistribution.level3 + stats.levelDistribution.level4}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts y detalle */}
      {/* Tendencia mensual a ancho completo */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="text-xl font-bold text-gray-900">Tendencia Mensual</CardTitle>
        </CardHeader>
          <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#1e40af" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '8px' }} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="incidents" 
                stroke="#3b82f6" 
                strokeWidth={3}
                name="Incidencias"
                dot={{ fill: '#1e40af', r: 5 }}
                activeDot={{ r: 7 }}
                fill="url(#colorIncidents)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Fila: Incidencias por día vs por grado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-xl font-bold text-gray-900">Incidencias por Día (Esta Semana)</CardTitle>
          </CardHeader>
            <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData}>
                  <defs>
                    <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#d97706" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '8px' }} />
                  <Bar dataKey="count" fill="url(#colorBar)" name="Incidencias" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-xl font-bold text-gray-900">
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
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#1e40af" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" stroke="#6b7280" />
                    <YAxis dataKey="label" type="category" width={180} stroke="#6b7280" />
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '8px' }} />
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
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-xl font-bold text-gray-900">Distribución por Nivel de Reincidencia</CardTitle>
          </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-5">
              {filteredLevelItems.map((item, index) => (
                <div key={item.key} className="group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">{item.level}</span>
                    <span className="text-sm font-bold text-gray-900">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 shadow-inner overflow-hidden">
                    <div
                      className="h-3 rounded-full transition-all duration-500 group-hover:shadow-lg"
                      style={{
                        width: `${stats.totalIncidents > 0 ? (item.count / stats.totalIncidents) * 100 : 0}%`,
                        background:
                          item.severity === 'low'
                            ? 'linear-gradient(90deg, #10b981, #059669)'
                            : item.severity === 'moderate'
                            ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                            : 'linear-gradient(90deg, #ef4444, #dc2626)'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-xl font-bold text-gray-900">Faltas Más Frecuentes</CardTitle>
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
                      'bg-blue-500',
                      'bg-purple-500',
                      'bg-amber-500',
                      'bg-indigo-500',
                      'bg-pink-500'
                    ];
                    return (
                      <div key={index} className="flex items-center gap-4 group">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${colors[index % colors.length]} text-white font-bold shadow-md group-hover:shadow-lg transition-all`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-gray-700">{fault.faultType}</span>
                            <span className="font-bold text-sm text-gray-900">{fault.count} incidencias</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-3 shadow-inner overflow-hidden">
                            <div
                              className={`${colors[index % colors.length]} h-3 rounded-full transition-all duration-500 group-hover:shadow-lg`}
                              style={{ 
                                width: `${stats.topFaults.length > 0 && stats.topFaults[0].count > 0 
                                  ? (fault.count / stats.topFaults[0].count) * 100 
                                  : 0}%` 
                              }}
                            />
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-gray-500 min-w-[45px] text-right">
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

      {/* Cuadros Comparativos */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4 flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Comparativas por Grado y Sección
        </h2>

        {/* Comparativa por Grados */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-xl font-bold text-gray-900">Comparativa por Grados</CardTitle>
          </CardHeader>
            <CardContent className="pt-6">
              {comparisonByGrade.length > 0 ? (
                <div className="space-y-6">
                  {/* Gráfico de barras comparativo */}
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={comparisonByGrade}>
                      <defs>
                        <linearGradient id="colorGradeComparison" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9}/>
                          <stop offset="100%" stopColor="#1e40af" stopOpacity={0.7}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="label" 
                        stroke="#6b7280" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis stroke="#6b7280" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #d1d5db', 
                          borderRadius: '8px' 
                        }}
                        formatter={(value: any) => [value, 'Incidencias']}
                      />
                      <Legend />
                      <Bar 
                        dataKey="totalIncidents" 
                        fill="url(#colorGradeComparison)" 
                        name="Total Incidencias"
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar 
                        dataKey="studentsWithIncidents" 
                        fill="#f59e0b" 
                        name="Estudiantes Involucrados"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Tabla comparativa detallada */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-200 px-4 py-3 text-left text-sm font-bold text-gray-900">Grado</th>
                          <th className="border border-gray-200 px-4 py-3 text-center text-sm font-bold text-gray-900">Total Incidencias</th>
                          <th className="border border-gray-200 px-4 py-3 text-center text-sm font-bold text-gray-900">Estudiantes Involucrados</th>
                          <th className="border border-gray-200 px-4 py-3 text-center text-sm font-bold text-gray-900">Nivel Promedio</th>
                          <th className="border border-gray-200 px-4 py-3 text-center text-sm font-bold text-gray-900">Nivel 0</th>
                          <th className="border border-gray-200 px-4 py-3 text-center text-sm font-bold text-gray-900">Nivel 1</th>
                          <th className="border border-gray-200 px-4 py-3 text-center text-sm font-bold text-gray-900">Nivel 2</th>
                          <th className="border border-gray-200 px-4 py-3 text-center text-sm font-bold text-gray-900">Nivel 3</th>
                          <th className="border border-gray-200 px-4 py-3 text-center text-sm font-bold text-gray-900">Nivel 4</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonByGrade.map((item, index) => (
                          <tr 
                            key={index} 
                            className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                          >
                            <td className="border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700">
                              {item.label}
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-center text-sm font-bold text-gray-900">
                              {item.totalIncidents}
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-center text-sm text-gray-700">
                              {item.studentsWithIncidents}
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-center text-sm font-semibold text-blue-600">
                              {item.averageReincidence.toFixed(2)}
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-center text-sm text-green-600">
                              {item.levelDistribution.level0}
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-center text-sm text-yellow-600">
                              {item.levelDistribution.level1}
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-center text-sm text-orange-600">
                              {item.levelDistribution.level2}
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-center text-sm text-red-600">
                              {item.levelDistribution.level3}
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-center text-sm font-bold text-red-700">
                              {item.levelDistribution.level4}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  No hay datos para comparar
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comparativa por Secciones */}
          <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-xl font-bold text-gray-900">Comparativa por Secciones</CardTitle>
          </CardHeader>
            <CardContent className="pt-6">
              {comparisonBySection.length > 0 ? (
                <div className="space-y-6">
                  {/* Gráfico de barras comparativo */}
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={comparisonBySection}>
                      <defs>
                        <linearGradient id="colorSectionComparison" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9}/>
                          <stop offset="100%" stopColor="#d97706" stopOpacity={0.7}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="label" 
                        stroke="#6b7280" 
                        angle={-45}
                        textAnchor="end"
                        height={120}
                      />
                      <YAxis stroke="#6b7280" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #d1d5db', 
                          borderRadius: '8px' 
                        }}
                        formatter={(value: any) => [value, 'Incidencias']}
                      />
                      <Legend />
                      <Bar 
                        dataKey="totalIncidents" 
                        fill="url(#colorSectionComparison)" 
                        name="Total Incidencias"
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar 
                        dataKey="studentsWithIncidents" 
                        fill="#3b82f6" 
                        name="Estudiantes Involucrados"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Tabla comparativa detallada */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-200 px-4 py-3 text-left text-sm font-bold text-gray-900">Sección</th>
                          <th className="border border-gray-200 px-4 py-3 text-center text-sm font-bold text-gray-900">Total Incidencias</th>
                          <th className="border border-gray-200 px-4 py-3 text-center text-sm font-bold text-gray-900">Estudiantes Involucrados</th>
                          <th className="border border-gray-200 px-4 py-3 text-center text-sm font-bold text-gray-900">Nivel Promedio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonBySection.map((item, index) => (
                          <tr 
                            key={index} 
                            className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                          >
                            <td className="border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700">
                              {item.label}
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-center text-sm font-bold text-gray-900">
                              {item.totalIncidents}
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-center text-sm text-gray-700">
                              {item.studentsWithIncidents}
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-center text-sm font-semibold text-blue-600">
                              {item.averageReincidence.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  No hay datos para comparar
                </div>
              )}
            </CardContent>
          </Card>
        </div>
    </div>
  );
};