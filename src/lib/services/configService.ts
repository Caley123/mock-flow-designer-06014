import { supabase } from '../supabaseClient';
import type { ConfiguracionSistemaDB, SystemConfig } from '@/types';
import type { SystemSettingKey } from '@/config/systemSettings';
import { coerceTimeConfigValue } from '@/config/systemSettings';
import { getCached, invalidateCache, setCached } from '@/lib/utils/memoryCache';

const CONFIG_CACHE_TTL = 15 * 60 * 1000; // 15 minutos

/**
 * Servicio para gestionar la configuración del sistema
 */

/**
 * Convierte un registro de configuración de DB a formato frontend
 */
function mapSystemConfig(config: ConfiguracionSistemaDB): SystemConfig {
  return {
    id: config.id_config,
    key: config.clave,
    value: coerceTimeConfigValue(config.valor),
    description: config.descripcion,
    updatedAt: config.fecha_actualizacion,
  };
}

/**
 * Obtener todas las configuraciones del sistema
 */
export async function getAll(): Promise<{ configs: SystemConfig[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('configuracion_sistema')
      .select('*')
      .order('clave', { ascending: true });

    if (error) {
      console.error('Error al obtener configuraciones:', error);
      return { configs: [], error: error.message };
    }

    const configs = (data || []).map(mapSystemConfig);
    return { configs, error: null };
  } catch (error: any) {
    console.error('Error al obtener configuraciones:', error);
    return { configs: [], error: error.message };
  }
}

/**
 * Obtener varias configuraciones por clave en una sola consulta.
 */
export async function getByKeys(
  keys: string[],
): Promise<{ configs: Record<string, SystemConfig>; error: string | null }> {
  const uniqueKeys = [...new Set(keys)];
  const configs: Record<string, SystemConfig> = {};
  const missing: string[] = [];

  for (const key of uniqueKeys) {
    const cached = getCached<SystemConfig>(`config:${key}`);
    if (cached) {
      configs[key] = cached;
    } else {
      missing.push(key);
    }
  }

  if (missing.length === 0) {
    return { configs, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('configuracion_sistema')
      .select('*')
      .in('clave', missing);

    if (error) {
      console.error('Error al obtener configuraciones:', error);
      return { configs, error: error.message };
    }

    for (const row of data ?? []) {
      const config = mapSystemConfig(row);
      configs[config.key] = config;
      setCached(`config:${config.key}`, config, CONFIG_CACHE_TTL);
    }

    return { configs, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error al obtener configuraciones:', error);
    return { configs, error: message };
  }
}

/**
 * Obtener una configuración por clave
 */
export async function getByKey(key: string): Promise<{ config: SystemConfig | null; error: string | null }> {
  const cacheKey = `config:${key}`;
  const cached = getCached<SystemConfig>(cacheKey);
  if (cached) {
    return { config: cached, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('configuracion_sistema')
      .select('*')
      .eq('clave', key)
      .maybeSingle();

    if (error) {
      console.error('Error al obtener configuración:', error);
      return { config: null, error: error.message };
    }

    // Si no hay datos, retornar null sin error (configuración no existe)
    if (!data) {
      return { config: null, error: null };
    }

    const config = mapSystemConfig(data);
    setCached(cacheKey, config, CONFIG_CACHE_TTL);
    return { config, error: null };
  } catch (error: any) {
    console.error('Error al obtener configuración:', error);
    return { config: null, error: error.message };
  }
}

/**
 * Crear una nueva configuración
 */
export async function create(data: {
  key: string;
  value: string;
  description?: string;
}): Promise<{ config: SystemConfig | null; error: string | null }> {
  try {
    const { data: newConfig, error } = await supabase
      .from('configuracion_sistema')
      .insert({
        clave: data.key,
        valor: data.value,
        descripcion: data.description,
      })
      .select()
      .single();

    if (error) {
      console.error('Error al crear configuración:', error);
      return { config: null, error: error.message };
    }

    return { config: mapSystemConfig(newConfig), error: null };
  } catch (error: any) {
    console.error('Error al crear configuración:', error);
    return { config: null, error: error.message };
  }
}

/**
 * Actualizar una configuración existente
 */
export async function update(
  id: number,
  data: {
    value: string;
    description?: string;
  }
): Promise<{ config: SystemConfig | null; error: string | null }> {
  try {
    const { data: updatedConfig, error } = await supabase
      .from('configuracion_sistema')
      .update({
        valor: data.value,
        descripcion: data.description,
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq('id_config', id)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar configuración:', error);
      return { config: null, error: error.message };
    }

    return { config: mapSystemConfig(updatedConfig), error: null };
  } catch (error: any) {
    console.error('Error al actualizar configuración:', error);
    return { config: null, error: error.message };
  }
}

/**
 * Eliminar una configuración
 */
/**
 * Crea o actualiza un parámetro por clave (upsert lógico).
 */
export async function upsertByKey(data: {
  key: SystemSettingKey | string;
  value: string;
  description?: string;
}): Promise<{ config: SystemConfig | null; error: string | null }> {
  const cacheKey = `config:${data.key}`;
  const existing = await getByKey(data.key);

  if (existing.error) {
    return { config: null, error: existing.error };
  }

  let result: { config: SystemConfig | null; error: string | null };

  if (existing.config) {
    result = await update(existing.config.id, {
      value: data.value,
      description: data.description ?? existing.config.description ?? undefined,
    });
  } else {
    result = await create({
      key: data.key,
      value: data.value,
      description: data.description,
    });
  }

  if (!result.error) {
    invalidateCache(cacheKey);
  }

  return result;
}

export async function deleteConfig(id: number): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('configuracion_sistema')
      .delete()
      .eq('id_config', id);

    if (error) {
      console.error('Error al eliminar configuración:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error al eliminar configuración:', error);
    return { success: false, error: error.message };
  }
}

export const configService = {
  getAll,
  getByKeys,
  getByKey,
  create,
  update,
  upsertByKey,
  delete: deleteConfig,
};
