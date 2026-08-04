import { describe, expect, it } from 'vitest';
import {
  buildIncidentSelect,
  isMissingTallerSchemaError,
  resetTallerSchemaCacheForTests,
  setTallerSchemaAvailable,
  shouldIncludeTallerEmbed,
} from './incidentSelect';

describe('incidentSelect', () => {
  it('sin talleres no incluye taller_id ni embed', () => {
    const select = buildIncidentSelect({ full: false, includeTaller: false });
    expect(select).not.toContain('taller_id');
    expect(select).not.toContain('talleres:');
    expect(select).toContain('id_incidencia');
    expect(select).toContain('estudiantes:id_estudiante');
  });

  it('con talleres incluye embed por FK', () => {
    const select = buildIncidentSelect({ full: true, includeTaller: true });
    expect(select).toContain('taller_id');
    expect(select).toContain('talleres:taller_id');
    expect(select).toContain('nombre');
  });

  it('detecta PGRST200 / columna taller_id ausente', () => {
    expect(
      isMissingTallerSchemaError({
        code: 'PGRST200',
        message: "Could not find a relationship between 'incidencias' and 'taller_id'",
      }),
    ).toBe(true);
    expect(
      isMissingTallerSchemaError({
        code: '42703',
        message: 'column incidencias.taller_id does not exist',
      }),
    ).toBe(true);
    expect(isMissingTallerSchemaError({ code: 'PGRST116', message: 'not found' })).toBe(false);
  });

  it('no embebe talleres hasta confirmar esquema', () => {
    resetTallerSchemaCacheForTests();
    expect(shouldIncludeTallerEmbed(true)).toBe(false);
    setTallerSchemaAvailable(true);
    expect(shouldIncludeTallerEmbed(true)).toBe(true);
    setTallerSchemaAvailable(false);
    expect(shouldIncludeTallerEmbed(true)).toBe(false);
  });
});
