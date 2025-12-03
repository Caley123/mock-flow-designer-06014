import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface ExportPDFOptions {
  title: string;
  filename: string;
  logoPath?: string;
  content: (pdf: jsPDF, currentY: number) => number; // Retorna nueva posición Y
  orientation?: 'portrait' | 'landscape';
}

/**
 * Hook reutilizable para exportar contenido a PDF
 */
export function useExportPDF() {
  const exportToPDF = async (options: ExportPDFOptions) => {
    try {
      toast.loading('Generando PDF...', { id: 'pdf-export' });

      // Cargar logo si se proporciona
      let logoImg: HTMLImageElement | null = null;
      if (options.logoPath) {
        logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        logoImg.src = options.logoPath;

        await new Promise((resolve) => {
          logoImg!.onload = resolve;
          logoImg!.onerror = () => {
            console.warn('No se pudo cargar el logo, continuando sin él');
            resolve(null);
          };
        });
      }

      // Crear PDF
      const pdf = new jsPDF(
        options.orientation || 'portrait',
        'mm',
        'a4'
      );
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      let currentY = margin + 5;

      // Agregar logo en la primera página si existe
      if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
        const logoSize = 18;
        const logoHeight = (logoImg.height * logoSize) / logoImg.width;
        pdf.addImage(logoImg.src, 'PNG', margin, margin, logoSize, logoHeight);
        currentY = margin + logoHeight + 3;
      }

      // Agregar título
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 58, 138);
      pdf.text(options.title, pdfWidth / 2, currentY, { align: 'center' });
      currentY += 10;

      // Resetear color
      pdf.setTextColor(0, 0, 0);

      // Agregar contenido usando la función proporcionada
      currentY = options.content(pdf, currentY);

      // Guardar PDF
      pdf.save(options.filename);

      toast.success('PDF generado exitosamente', { id: 'pdf-export' });
    } catch (error: any) {
      console.error('Error al generar PDF:', error);
      toast.error('Error al generar PDF: ' + (error.message || 'Error desconocido'), {
        id: 'pdf-export',
      });
    }
  };

  return { exportToPDF };
}

