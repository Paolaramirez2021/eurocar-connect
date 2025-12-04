-- Drop and recreate view without SECURITY DEFINER
DROP VIEW IF EXISTS public.alerts_maintenance_view;

CREATE OR REPLACE VIEW public.alerts_maintenance_view AS
SELECT 
  id,
  vehicle_id,
  tipo_alerta,
  descripcion,
  fecha_evento,
  (fecha_evento - CURRENT_DATE) AS dias_restantes,
  estado,
  created_at,
  updated_at
FROM public.alerts_maintenance;