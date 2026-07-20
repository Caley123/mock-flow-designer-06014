export function parseTalleresEnabled(raw: string | undefined): boolean {
  return raw === 'true';
}

export function isTalleresEnabled(): boolean {
  return parseTalleresEnabled(import.meta.env.VITE_TALLERES_ENABLED);
}
