import { supabase } from '../supabaseClient';
import { IncidentEvidence, EvidenciaFotograficaDB } from '@/types';

/**
 * Servicio de evidencias fotográficas
 */
export const evidenceService = {
  /**
   * Subir evidencia fotográfica
   */
  async upload(
    incidentId: number,
    file: File,
    userId: number
  ): Promise<{ evidence: IncidentEvidence | null; error: string | null }> {
    try {
      // Validar tipo de archivo
      // Normalizar MIME: algunos navegadores pueden reportar 'image/jpg'
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const normalizedMime = file.type === 'image/jpg' || (ext === 'jpg' && file.type === '')
        ? 'image/jpeg'
        : file.type;

      if (!normalizedMime.match(/^image\/(jpeg|png)$/)) {
        return { evidence: null, error: 'Solo se permiten archivos JPG o PNG' };
      }

      // Validar tamaño (máx 5MB)
      if (file.size > 5242880) {
        return { evidence: null, error: 'El archivo no puede superar los 5MB' };
      }

      // Generar nombre único
      const fileExt = file.name.split('.').pop();
      const fileName = `${incidentId}_${Date.now()}.${fileExt}`;
      const filePath = `${incidentId}/${fileName}`;

      // Subir archivo a Supabase Storage
      // Nota: Necesitas crear un bucket llamado 'evidencias' en Supabase
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('evidencias')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: normalizedMime,
        });

      if (uploadError) {
        console.error('Error al subir archivo:', uploadError);
        return { evidence: null, error: 'Error al subir el archivo' };
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('evidencias')
        .getPublicUrl(filePath);

      // Registrar en base de datos usando función almacenada
      const { data, error } = await supabase.rpc('insertar_evidencia', {
        p_id_incidencia: incidentId,
        p_ruta_archivo: filePath,
        p_nombre_original: file.name,
        p_nombre_archivo: fileName,
        p_tamano_bytes: file.size,
        p_tipo_mime: normalizedMime,
        p_id_usuario_subida: userId
      });

      console.log('Respuesta de insertar_evidencia:', { data, error });

      if (error || !data) {
        // Si falla, eliminar el archivo subido
        await supabase.storage.from('evidencias').remove([filePath]);
        return { 
          evidence: null, 
          error: error?.message || 'No se pudo registrar la evidencia en la base de datos' 
        };
      }

      // La función devuelve un JSON con los datos insertados
      const evidenceData = data;
      console.log('Datos de evidencia procesados:', evidenceData);

      const evidence: IncidentEvidence = {
        id: evidenceData.id_evidencia,
        incidentId: evidenceData.id_incidencia,
        filename: evidenceData.nombre_original,
        url: urlData.publicUrl,
        uploadedBy: evidenceData.id_usuario_subida,
        uploadedAt: evidenceData.fecha_subida,
      };

      return { evidence, error: null };
    } catch (error: any) {
      console.error('Error en upload:', error);
      return { evidence: null, error: error.message || 'Error al subir evidencia' };
    }
  },

  /**
   * Obtener evidencias de una incidencia
   */
  async getByIncident(incidentId: number): Promise<{ evidences: IncidentEvidence[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('evidencias_fotograficas')
        .select('*')
        .eq('id_incidencia', incidentId)
        .order('fecha_subida', { ascending: false });

      if (error) {
        return { evidences: [], error: error.message };
      }

      // Obtener URLs públicas
      const evidences: IncidentEvidence[] = await Promise.all(
        (data || []).map(async (ev: EvidenciaFotograficaDB) => {
          const { data: urlData } = supabase.storage
            .from('evidencias')
            .getPublicUrl(ev.ruta_archivo);

          return {
            id: ev.id_evidencia,
            incidentId: ev.id_incidencia,
            filename: ev.nombre_original,
            url: urlData.publicUrl,
            uploadedBy: ev.id_usuario_subida,
            uploadedAt: ev.fecha_subida,
          };
        })
      );

      return { evidences, error: null };
    } catch (error: any) {
      console.error('Error en getByIncident:', error);
      return { evidences: [], error: error.message || 'Error al obtener evidencias' };
    }
  },

  /**
   * Eliminar evidencia
   */
  async delete(evidenceId: number): Promise<{ success: boolean; error: string | null }> {
    try {
      // Obtener información de la evidencia
      const { data: evidence, error: fetchError } = await supabase
        .from('evidencias_fotograficas')
        .select('ruta_archivo')
        .eq('id_evidencia', evidenceId)
        .single();

      if (fetchError || !evidence) {
        return { success: false, error: 'Evidencia no encontrada' };
      }

      // Eliminar de base de datos (el trigger eliminará automáticamente cantidad_fotos)
      const { error: deleteError } = await supabase
        .from('evidencias_fotograficas')
        .delete()
        .eq('id_evidencia', evidenceId);

      if (deleteError) {
        return { success: false, error: deleteError.message };
      }

      // Eliminar archivo del storage
      await supabase.storage.from('evidencias').remove([evidence.ruta_archivo]);

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error en delete:', error);
      return { success: false, error: error.message || 'Error al eliminar evidencia' };
    }
  },
};
