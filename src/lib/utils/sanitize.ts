/**
 * Utilidades de sanitización para prevenir XSS y otros ataques
 */

export const sanitize = {
  /**
   * Sanitizar HTML para prevenir XSS
   * Convierte caracteres especiales a entidades HTML
   */
  html(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  },

  /**
   * Sanitizar para búsquedas SQL (escapar caracteres especiales de LIKE)
   * Protege contra inyección SQL en búsquedas con ILIKE
   */
  search(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    return input
      .replace(/\\/g, '\\\\') // Escapar backslashes primero
      .replace(/%/g, '\\%')   // Escapar %
      .replace(/_/g, '\\_')    // Escapar _
      .trim();
  },

  /**
   * Validar y sanitizar email
   */
  email(input: string): string | null {
    if (!input || typeof input !== 'string') return null;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmed = input.trim().toLowerCase();
    
    return emailRegex.test(trimmed) ? trimmed : null;
  },

  /**
   * Sanitizar números (solo enteros positivos)
   */
  positiveInteger(input: string | number): number | null {
    if (typeof input === 'number') {
      return Number.isInteger(input) && input > 0 ? input : null;
    }
    
    if (typeof input !== 'string') return null;
    
    const num = parseInt(input, 10);
    return !isNaN(num) && num > 0 ? num : null;
  },

  /**
   * Sanitizar texto (remover caracteres peligrosos)
   */
  text(input: string, maxLength?: number): string {
    if (!input || typeof input !== 'string') return '';
    
    let sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remover scripts
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remover iframes
      .trim();
    
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
  },

  /**
   * Sanitizar URL
   */
  url(input: string): string | null {
    if (!input || typeof input !== 'string') return null;
    
    try {
      const url = new URL(input);
      // Solo permitir http y https
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return url.toString();
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Sanitizar código de barras (solo alfanumérico)
   */
  barcode(input: string): string | null {
    if (!input || typeof input !== 'string') return null;
    
    const sanitized = input.trim().replace(/[^a-zA-Z0-9]/g, '');
    return sanitized.length > 0 ? sanitized : null;
  }
};

