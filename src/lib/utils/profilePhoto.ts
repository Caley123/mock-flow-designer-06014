import { supabase } from '@/lib/supabaseClient';

const PROFILE_BUCKET = 'fotos-perfil';

function extractStoragePath(value: string): string | null {
  const trimmed = value.trim().replace(/^\/+/, '');
  if (trimmed.startsWith(`${PROFILE_BUCKET}/`)) {
    return trimmed.slice(PROFILE_BUCKET.length + 1);
  }
  const publicMatch = trimmed.match(
    /\/storage\/v1\/object\/(?:public|sign)\/fotos-perfil\/(.+?)(?:\?|$)/
  );
  if (publicMatch?.[1]) {
    return decodeURIComponent(publicMatch[1]);
  }
  if (!trimmed.includes('://') && !trimmed.startsWith('data:')) {
    return trimmed;
  }
  return null;
}

/**
 * Convierte el valor guardado en BD (URL completa, data URL o ruta en Storage)
 * en una URL lista para usar en <img>.
 */
export function resolveStudentProfilePhotoUrl(
  raw: string | null | undefined
): string | null {
  if (!raw || typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  const path = extractStoragePath(trimmed);
  if (!path) return null;

  const { data } = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(path);
  return data.publicUrl || null;
}

/** Obtiene URL firmada si la pública falla (bucket privado o políticas restrictivas). */
export async function getSignedProfilePhotoUrl(
  raw: string | null | undefined
): Promise<string | null> {
  if (!raw || typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  const path = extractStoragePath(trimmed);
  if (!path) return resolveStudentProfilePhotoUrl(trimmed);

  const { data, error } = await supabase.storage
    .from(PROFILE_BUCKET)
    .createSignedUrl(path, 3600);

  if (error || !data?.signedUrl) {
    return resolveStudentProfilePhotoUrl(trimmed);
  }

  return data.signedUrl;
}
