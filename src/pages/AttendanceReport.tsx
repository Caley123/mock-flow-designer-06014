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
import { Loader2, Printer, FileDown, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';
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

      // Crear PDF en formato landscape
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Configuración de márgenes y espaciado
      const margin = 10;
      let currentY = margin + 5;
      const lineHeight = 7;
      const cellHeight = 7;
      const fontSize = 8;
      const headerFontSize = 14;
      
      // Función para agregar nueva página (sin logo)
      const addNewPage = () => {
        pdf.addPage();
        currentY = margin + 5;
      };
      
      // Agregar logo pequeño en la parte superior izquierda (solo primera página)
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        const logoSize = 18; // Logo pequeño (18mm) - más profesional
        const logoHeight = (logoImg.height * logoSize) / logoImg.width;
        pdf.addImage(logoImg.src, 'PNG', margin, margin, logoSize, logoHeight);
        // Ajustar posición inicial para dejar espacio al logo
        currentY = margin + logoHeight + 3;
      } else {
        currentY = margin + 8;
      }
      
      // Encabezado con mejor diseño
      pdf.setFontSize(headerFontSize);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 58, 138); // Azul oscuro
      pdf.text('REPORTE MENSUAL DE ASISTENCIAS', pdfWidth / 2, currentY, { align: 'center' });
      currentY += lineHeight + 3;
      
      // Información del mes y filtros con mejor formato
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(75, 85, 99); // Gris oscuro
      let filterText = `Mes: ${monthValue}`;
      if (levelFilter !== 'all') filterText += ` | Nivel: ${levelFilter}`;
      if (gradeFilter !== 'all') filterText += ` | Grado: ${gradeFilter}`;
      if (sectionFilter !== 'all') filterText += ` | Sección: ${sectionFilter}`;
      pdf.text(filterText, pdfWidth / 2, currentY, { align: 'center' });
      currentY += lineHeight + 8;
      
      // Resetear color a negro
      pdf.setTextColor(0, 0, 0);
      
      // Calcular ancho de columnas
      const studentColWidth = 50;
      const dayColWidth = (pdfWidth - margin * 2 - studentColWidth - 20) / (daysArray.length + 4); // +4 para columnas de totales
      const dayColWidthAdjusted = Math.min(dayColWidth, 4); // Máximo 4mm por día
      const totalColWidth = 8;
      
      // Encabezados de la tabla con mejor diseño
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255); // Texto blanco en encabezados
      pdf.setFillColor(59, 130, 246); // Azul para encabezados
      
      // Encabezado "Estudiante"
      pdf.rect(margin, currentY, studentColWidth, cellHeight, 'F');
      pdf.text('Estudiante', margin + studentColWidth / 2, currentY + cellHeight / 2 + 1, { align: 'center' });
      
      let xPos = margin + studentColWidth;
      // Encabezados de días
      daysArray.forEach((day) => {
        pdf.rect(xPos, currentY, dayColWidthAdjusted, cellHeight, 'F');
        pdf.text(day.toString(), xPos + dayColWidthAdjusted / 2, currentY + cellHeight / 2 + 1, { align: 'center' });
        xPos += dayColWidthAdjusted;
      });
      
      // Columnas de totales
      const totalLabels = ['A', 'T', 'J', 'I'];
      totalLabels.forEach((label) => {
        pdf.rect(xPos, currentY, totalColWidth, cellHeight, 'F');
        pdf.text(label, xPos + totalColWidth / 2, currentY + cellHeight / 2 + 1, { align: 'center' });
        xPos += totalColWidth;
      });
      
      // Resetear color
      pdf.setTextColor(0, 0, 0);
      currentY += cellHeight;
      
      // Datos de los estudiantes con mejor diseño
      pdf.setFont('helvetica', 'normal');
      rows.forEach((row, rowIndex) => {
        // Verificar si necesitamos nueva página
        if (currentY + cellHeight > pdfHeight - margin) {
          addNewPage();
          // Redibujar encabezados
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(255, 255, 255);
          pdf.setFillColor(59, 130, 246);
          pdf.rect(margin, currentY, studentColWidth, cellHeight, 'F');
          pdf.text('Estudiante', margin + studentColWidth / 2, currentY + cellHeight / 2 + 1, { align: 'center' });
          xPos = margin + studentColWidth;
          daysArray.forEach((day) => {
            pdf.rect(xPos, currentY, dayColWidthAdjusted, cellHeight, 'F');
            pdf.text(day.toString(), xPos + dayColWidthAdjusted / 2, currentY + cellHeight / 2 + 1, { align: 'center' });
            xPos += dayColWidthAdjusted;
          });
          totalLabels.forEach((label) => {
            pdf.rect(xPos, currentY, totalColWidth, cellHeight, 'F');
            pdf.text(label, xPos + totalColWidth / 2, currentY + cellHeight / 2 + 1, { align: 'center' });
            xPos += totalColWidth;
          });
          pdf.setTextColor(0, 0, 0);
          currentY += cellHeight;
          pdf.setFont('helvetica', 'normal');
        }
        
        // Alternar color de fondo para filas
        const isEven = rowIndex % 2 === 0;
        if (isEven) {
          pdf.setFillColor(249, 250, 251); // Gris muy claro
        } else {
          pdf.setFillColor(255, 255, 255); // Blanco
        }
        pdf.rect(margin, currentY, pdfWidth - margin * 2, cellHeight, 'F');
        
        // Nombre del estudiante
        pdf.setFontSize(fontSize);
        pdf.setTextColor(0, 0, 0); // Asegurar color negro
        pdf.setFont('helvetica', 'bold');
        const nameText = row.student.fullName.length > 28 
          ? row.student.fullName.substring(0, 25) + '...' 
          : row.student.fullName;
        pdf.text(nameText, margin + 2, currentY + 3.5);
        
        pdf.setFontSize(fontSize - 1);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(107, 114, 128); // Gris medio
        pdf.text(
          `${row.student.level} • ${row.student.grade} ${row.student.section}`,
          margin + 2,
          currentY + 6
        );
        pdf.setTextColor(0, 0, 0); // Resetear a negro
        pdf.setFontSize(fontSize);
        
        // Dibujar borde de celda de estudiante
        pdf.setDrawColor(209, 213, 219); // Gris claro para bordes
        pdf.rect(margin, currentY, studentColWidth, cellHeight);
        
        // Días de asistencia con colores
        xPos = margin + studentColWidth;
        row.days.forEach((day) => {
          const info = statusMap[day.status] || statusMap.Sin_registro;
          // Cambiar "-" por "F" para faltas sin registro
          const displayText = info.label === '—' ? 'F' : info.label;
          
          // Colorear fondo según estado
          if (day.status === 'A_tiempo') {
            pdf.setFillColor(209, 250, 229); // Verde claro
          } else if (day.status === 'Tarde') {
            pdf.setFillColor(254, 243, 199); // Amarillo claro
          } else if (day.status === 'Justificada') {
            pdf.setFillColor(219, 234, 254); // Azul claro
          } else if (day.status === 'Injustificada') {
            pdf.setFillColor(254, 226, 226); // Rojo claro
          } else {
            pdf.setFillColor(255, 255, 255); // Blanco para sin registro
          }
          
          pdf.rect(xPos, currentY, dayColWidthAdjusted, cellHeight, 'F');
          pdf.rect(xPos, currentY, dayColWidthAdjusted, cellHeight);
          
          // Color del texto según estado
          if (day.status === 'A_tiempo') {
            pdf.setTextColor(5, 150, 105); // Verde oscuro
          } else if (day.status === 'Tarde') {
            pdf.setTextColor(146, 64, 14); // Naranja oscuro
          } else if (day.status === 'Justificada') {
            pdf.setTextColor(30, 64, 175); // Azul oscuro
          } else if (day.status === 'Injustificada') {
            pdf.setTextColor(153, 27, 27); // Rojo oscuro
          } else {
            pdf.setTextColor(0, 0, 0); // Negro para faltas
          }
          
          pdf.setFont('helvetica', 'bold');
          pdf.text(displayText, xPos + dayColWidthAdjusted / 2, currentY + cellHeight / 2 + 1, { align: 'center' });
          pdf.setTextColor(0, 0, 0); // Resetear color
          pdf.setFont('helvetica', 'normal');
          xPos += dayColWidthAdjusted;
        });
        
        // Totales con mejor formato
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(5, 150, 105); // Verde para A tiempo
        pdf.text(row.totals.onTime.toString(), xPos + totalColWidth / 2, currentY + cellHeight / 2 + 1, { align: 'center' });
        xPos += totalColWidth;
        
        pdf.setTextColor(146, 64, 14); // Naranja para Tardanzas
        pdf.text(row.totals.late.toString(), xPos + totalColWidth / 2, currentY + cellHeight / 2 + 1, { align: 'center' });
        xPos += totalColWidth;
        
        pdf.setTextColor(30, 64, 175); // Azul para Justificadas
        pdf.text(row.totals.justified.toString(), xPos + totalColWidth / 2, currentY + cellHeight / 2 + 1, { align: 'center' });
        xPos += totalColWidth;
        
        pdf.setTextColor(153, 27, 27); // Rojo para Injustificadas
        pdf.text(row.totals.unjustified.toString(), xPos + totalColWidth / 2, currentY + cellHeight / 2 + 1, { align: 'center' });
        pdf.setTextColor(0, 0, 0); // Resetear color
        pdf.setFont('helvetica', 'normal');
        
        currentY += cellHeight;
      });
      
      // Resumen al final con diseño profesional mejorado
      if (currentY + 30 > pdfHeight - margin) {
        addNewPage();
        // Si hay nueva página, agregar título del resumen centrado
        pdf.setFontSize(headerFontSize - 2);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30, 58, 138);
        pdf.text('RESUMEN GENERAL', pdfWidth / 2, currentY, { align: 'center' });
        currentY += lineHeight + 5;
      } else {
        currentY += 8;
        // Línea separadora elegante
        pdf.setDrawColor(209, 213, 219);
        pdf.setLineWidth(0.5);
        pdf.line(margin, currentY, pdfWidth - margin, currentY);
        currentY += 5;
        
        pdf.setFontSize(headerFontSize - 2);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30, 58, 138);
        pdf.text('RESUMEN GENERAL', pdfWidth / 2, currentY, { align: 'center' });
        currentY += lineHeight + 4;
      }
      
      // Resumen en formato de tarjetas profesionales horizontales
      pdf.setFontSize(fontSize + 1);
      pdf.setFont('helvetica', 'normal');
      const summaryData = [
        { label: 'A tiempo', value: totalsGlobal.onTime, color: [5, 150, 105], bgColor: [209, 250, 229] },
        { label: 'Tardanzas', value: totalsGlobal.late, color: [146, 64, 14], bgColor: [254, 243, 199] },
        { label: 'Justificadas', value: totalsGlobal.justified, color: [30, 64, 175], bgColor: [219, 234, 254] },
        { label: 'Injustificadas', value: totalsGlobal.unjustified, color: [153, 27, 27], bgColor: [254, 226, 226] },
      ];
      
      // Calcular ancho de cada tarjeta (4 tarjetas con espacio entre ellas)
      const cardSpacing = 3;
      const totalCardWidth = pdfWidth - margin * 2;
      const cardWidth = (totalCardWidth - cardSpacing * 3) / 4;
      const cardHeight = 15;
      let cardX = margin;
      
      summaryData.forEach(({ label, value, color, bgColor }, index) => {
        // Fondo de tarjeta con bordes redondeados
        pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        pdf.roundedRect(cardX, currentY, cardWidth, cardHeight, 3, 3, 'F');
        
        // Borde sutil
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.3);
        pdf.roundedRect(cardX, currentY, cardWidth, cardHeight, 3, 3);
        
        // Texto de la etiqueta
        pdf.setTextColor(75, 85, 99);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(fontSize);
        pdf.text(label.toUpperCase(), cardX + cardWidth / 2, currentY + 5, { align: 'center' });
        
        // Valor destacado
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(fontSize + 4);
        pdf.setTextColor(color[0], color[1], color[2]);
        pdf.text(value.toString(), cardX + cardWidth / 2, currentY + 11, { align: 'center' });
        
        // Espacio entre tarjetas
        if (index < summaryData.length - 1) {
          cardX += cardWidth + cardSpacing;
        }
      });
      
      // Resetear color y grosor de línea
      pdf.setTextColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      
      const fileName = `Reporte_Asistencias_${monthValue.replace('-', '_')}.pdf`;
      pdf.save(fileName);
      
      if (!isMountedRef.current) return;
      toast.success('PDF generado exitosamente', { id: 'pdf-export' });
    } catch (error: any) {
      if (!isMountedRef.current) return;
      console.error('Error al generar PDF:', error);
      toast.error('Error al generar PDF: ' + (error.message || 'Error desconocido'), { id: 'pdf-export' });
    }
  };

  const exportToExcel = async () => {
    if (!isMountedRef.current) return;
    
    if (rows.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    try {
      toast.loading('Generando Excel...', { id: 'excel-export' });
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Asistencias');
      
      // Cargar el logo
      const logoResponse = await fetch('/logo2.png');
      const logoBuffer = await logoResponse.arrayBuffer();
      const logoImage = workbook.addImage({
        buffer: logoBuffer,
        extension: 'png',
      });
      
      // Configurar encabezado
      const headerRow = worksheet.addRow(['REPORTE MENSUAL DE ASISTENCIAS']);
      headerRow.font = { size: 16, bold: true };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      const totalCols = daysArray.length + 5;
      worksheet.mergeCells(1, 1, 1, totalCols);
      
      // Ajustar altura de la primera fila para el logo
      worksheet.getRow(1).height = 80;
      
      const monthRow = worksheet.addRow([
        `Mes: ${monthValue}`,
        levelFilter !== 'all' ? `Nivel: ${levelFilter}` : '',
        gradeFilter !== 'all' ? `Grado: ${gradeFilter}` : '',
        sectionFilter !== 'all' ? `Sección: ${sectionFilter}` : '',
      ]);
      monthRow.font = { size: 12 };
      worksheet.mergeCells(2, 1, 2, daysArray.length + 5);
      
      worksheet.addRow([]); // Fila vacía
      
      // Encabezados de la tabla
      const tableHeaders = [
        'Estudiante',
        'Nivel',
        'Grado',
        'Sección',
        ...daysArray.map((day) => `Día ${day}`),
        'A tiempo',
        'Tardanzas',
        'Justificadas',
        'Injustificadas',
      ];
      
      const headerRowTable = worksheet.addRow(tableHeaders);
      headerRowTable.font = { bold: true, size: 10 };
      headerRowTable.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5E7EB' },
      };
      headerRowTable.alignment = { horizontal: 'center', vertical: 'middle' };
      
      // Datos de los estudiantes
      rows.forEach((row) => {
        const rowData = [
          row.student.fullName,
          row.student.level,
          row.student.grade,
          row.student.section,
          ...row.days.map((day) => {
            const info = statusMap[day.status] || statusMap.Sin_registro;
            return info.label;
          }),
          row.totals.onTime,
          row.totals.late,
          row.totals.justified,
          row.totals.unjustified,
        ];
        
        const dataRow = worksheet.addRow(rowData);
        dataRow.font = { size: 9 };
        dataRow.alignment = { vertical: 'middle' };
        
        // Colorear celdas según el estado
        row.days.forEach((day, index) => {
          const info = statusMap[day.status] || statusMap.Sin_registro;
          const cell = dataRow.getCell(index + 5); // +5 porque las primeras 4 columnas son estudiante, nivel, grado, sección
          
          if (day.status === 'A_tiempo') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFD1FAE5' },
            };
            cell.font = { color: { argb: 'FF065F46' } };
          } else if (day.status === 'Tarde') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFEF3C7' },
            };
            cell.font = { color: { argb: 'FF92400E' } };
          } else if (day.status === 'Justificada') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFDBEAFE' },
            };
            cell.font = { color: { argb: 'FF1E40AF' } };
          } else if (day.status === 'Injustificada') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFEE2E2' },
            };
            cell.font = { color: { argb: 'FF991B1B' } };
          }
        });
      });
      
      // Agregar fila de resumen
      worksheet.addRow([]);
      const summaryRow = worksheet.addRow([
        'RESUMEN',
        '',
        '',
        '',
        ...Array(daysArray.length).fill(''),
        totalsGlobal.onTime,
        totalsGlobal.late,
        totalsGlobal.justified,
        totalsGlobal.unjustified,
      ]);
      summaryRow.font = { bold: true, size: 10 };
      summaryRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' },
      };
      
      // Agregar logo como marca de agua en el centro de la hoja
      // Calcular posición central basada en el número de columnas y filas
      const centerCol = Math.floor(totalCols / 2) - 2;
      const centerRow = Math.floor((rows.length + 5) / 2);
      worksheet.addImage(logoImage, {
        tl: { col: centerCol, row: centerRow },
        ext: { width: 200, height: 100 },
      });
      
      // Ajustar ancho de columnas
      worksheet.columns.forEach((column, index) => {
        if (index === 0) {
          column.width = 30; // Estudiante
        } else if (index >= 1 && index <= 3) {
          column.width = 10; // Nivel, Grado, Sección
        } else if (index >= 4 && index < 4 + daysArray.length) {
          column.width = 5; // Días
        } else {
          column.width = 12; // Totales
        }
      });
      
      // Agregar hoja de resumen
      const summarySheet = workbook.addWorksheet('Resumen');
      summarySheet.addRow(['RESUMEN MENSUAL DE ASISTENCIAS']);
      summarySheet.mergeCells(1, 1, 1, 2);
      summarySheet.getRow(1).font = { size: 14, bold: true };
      summarySheet.addRow([]);
      
      summarySheet.addRow(['A tiempo', totalsGlobal.onTime]);
      summarySheet.addRow(['Tardanzas', totalsGlobal.late]);
      summarySheet.addRow(['Justificadas', totalsGlobal.justified]);
      summarySheet.addRow(['Injustificadas', totalsGlobal.unjustified]);
      
      summarySheet.columns.forEach((column) => {
        column.width = 20;
      });
      
      // Descargar archivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Reporte_Asistencias_${monthValue.replace('-', '_')}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      if (!isMountedRef.current) return;
      toast.success('Excel generado exitosamente', { id: 'excel-export' });
    } catch (error: any) {
      if (!isMountedRef.current) return;
      console.error('Error al generar Excel:', error);
      toast.error('Error al generar Excel: ' + (error.message || 'Error desconocido'), { id: 'excel-export' });
    }
  };

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-5 print:opacity-15">
        <img src="/logo2.png" alt="Logo institucional" className="max-w-[60%]" />
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
      <div id="attendance-report" className="container relative z-10 mx-auto p-6 space-y-6">
        <div className="print-hidden flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-wide">
              {reportType === 'monthly' ? 'Reporte mensual' : 'Reporte bimestral'}
            </p>
            <h1 className="text-3xl font-bold">Asistencia por estudiante</h1>
            <p className="text-sm text-muted-foreground">
              {reportType === 'monthly' 
                ? 'Visualiza las asistencias del mes con totales por tardanza y faltas justificadas.'
                : bimestre !== 'all' 
                  ? `Visualiza las asistencias del ${formatBimestreLabel(getAllBimestres(añoEscolar).find(b => b.numero === bimestre)!)} con totales por tardanza y faltas justificadas.`
                  : 'Visualiza las asistencias del bimestre seleccionado con totales por tardanza y faltas justificadas.'}
            </p>
          </div>
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
        </div>

        <Card className="print-hidden">
          <CardHeader>
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

        <Card>
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

        <Card>
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

        <Card>
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
  );
};

