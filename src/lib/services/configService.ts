import { supabase } from '../supabaseClient';
import type { ConfiguracionSistemaDB, SystemConfig } from '@/types';
import { getCached, setCached } from '@/lib/utils/memoryCache';

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
    value: config.valor,
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
  getByKey,
  create,
  update,
  delete: deleteConfig,
};
