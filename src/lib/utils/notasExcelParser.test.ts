import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { parseNotasExcelBuffer } from './notasExcelParser';

describe('parseNotasExcelBuffer', () => {
  it('detecta DNI, Nombre y Nota', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Hoja1');
    ws.addRow(['DNI', 'Nombre Completo', 'Nota']);
    ws.addRow(['01234567', 'PEREZ GOMEZ ANA', 16.5]);
    const buf = await wb.xlsx.writeBuffer();
    const parsed = await parseNotasExcelBuffer(buf);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].rawDni).toBe('01234567');
    expect(parsed.rows[0].rawNombre).toBe('PEREZ GOMEZ ANA');
    expect(parsed.rows[0].nota).toBe(16.5);
  });

  it('rechaza nota fuera de 0-20 en parse (deja valor y valida después)', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Hoja1');
    ws.addRow(['Código', 'Alumno', 'Nota', 'Observación']);
    ws.addRow(['92010007', 'ALARCON RUIZ', 21, 'revisar']);
    const buf = await wb.xlsx.writeBuffer();
    const parsed = await parseNotasExcelBuffer(buf);
    expect(parsed.rows[0].nota).toBe(21);
    expect(parsed.rows[0].observacion).toBe('revisar');
  });
});
