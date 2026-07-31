import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { parsePensionesExcelBuffer } from './pensionesExcelParser';

describe('parsePensionesExcelBuffer', () => {
  it('detecta columnas DNI y Nombre', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Hoja1');
    ws.addRow(['DNI', 'Nombre Completo', 'Monto']);
    ws.addRow(['01234567', 'PEREZ GOMEZ ANA', 350]);
    const buf = await wb.xlsx.writeBuffer();
    const parsed = await parsePensionesExcelBuffer(buf);
    expect(parsed.rows[0].rawDni).toBe('01234567');
    expect(parsed.rows[0].rawNombre).toBe('PEREZ GOMEZ ANA');
    expect(parsed.rows[0].monto).toBe(350);
  });

  it('salta título del banco y encuentra cabecera', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Reporte');
    ws.addRow(['BANCO XYZ - REPORTE MENSUAL']);
    ws.addRow([]);
    ws.addRow(['Documento', 'Alumno', 'Fecha pago']);
    ws.addRow(['87654321', 'LOPEZ RUIZ JUAN', '05/07/2026']);
    const buf = await wb.xlsx.writeBuffer();
    const parsed = await parsePensionesExcelBuffer(buf);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].rawDni).toBe('87654321');
    expect(parsed.rows[0].fechaPago).toBe('2026-07-05');
  });
});
