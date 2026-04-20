/**
 * Retorna la URL para llamadas al backend de PDF.
 * VITE_API_URL apunta a Railway (backend PDF siempre activo).
 */
export function getApiUrl(path: string): string {
  const base = import.meta.env.VITE_API_URL || '';
  // Railway usa /generate-pdf directamente (sin /api prefix)
  const cleanPath = path.replace(/^\/api\//, '/').replace(/^\/srv\//, '/');
  return `${base}${cleanPath}`;
}
