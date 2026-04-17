/**
 * Retorna la URL base para llamadas al backend API.
 * En producción (Netlify), usa VITE_API_URL + /srv/... para acceso al backend externo.
 * En desarrollo (Emergent Preview), las llamadas van relativas /srv/...
 */
export function getApiUrl(path: string): string {
  const base = import.meta.env.VITE_API_URL || '';
  // Reemplazar /api/ por /srv/ para evitar interceptación K8s ingress
  const srvPath = path.replace(/^\/api\//, '/srv/');
  return `${base}${srvPath}`;
}
