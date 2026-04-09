/**
 * Retorna la URL base para llamadas al backend API.
 * En desarrollo (Emergent Preview), las llamadas van a '/api/...' (relativo).
 * En producción (Netlify), usa VITE_API_URL si está configurado.
 */
export function getApiUrl(path: string): string {
  const base = import.meta.env.VITE_API_URL || '';
  return `${base}${path}`;
}
