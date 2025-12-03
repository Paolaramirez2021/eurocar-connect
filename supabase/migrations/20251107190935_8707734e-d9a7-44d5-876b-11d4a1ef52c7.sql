-- Fix security issue: Remove SECURITY DEFINER from view
DROP VIEW IF EXISTS public.customer_stats;

CREATE VIEW public.customer_stats AS
SELECT 
  c.id,
  c.nombres,
  c.primer_apellido,
  c.segundo_apellido,
  c.cedula_pasaporte,
  c.email,
  c.celular,
  c.estado,
  c.total_reservas,
  c.monto_total,
  c.created_at,
  COUNT(DISTINCT r.id) FILTER (WHERE r.estado IN ('confirmed', 'pending')) as reservas_activas,
  COUNT(DISTINCT r.id) FILTER (WHERE r.estado = 'completed') as reservas_completadas,
  COUNT(DISTINCT ct.id) as contratos_firmados,
  MAX(r.fecha_inicio) as ultima_reserva
FROM public.customers c
LEFT JOIN public.reservations r ON r.customer_id = c.id
LEFT JOIN public.contracts ct ON ct.customer_id = c.id
GROUP BY c.id;

-- Add RLS policy for the view
ALTER VIEW public.customer_stats SET (security_invoker = on);