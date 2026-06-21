import { lazy, type ComponentType } from 'react';
import { logger } from '@/lib/utils/logger';

type ModuleWithDefault<T> = { default: T };

/**
 * lazy() con reintento único si falla la descarga del chunk (red lenta o caché vieja).
 */
export function lazyPage<T extends ComponentType<unknown>>(
  importFn: () => Promise<ModuleWithDefault<T>>,
) {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (firstError) {
      logger.error('Error al cargar página, reintentando…', firstError);
      await new Promise((r) => setTimeout(r, 800));
      return importFn();
    }
  });
}
