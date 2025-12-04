-- RESOLVER PROBLEMAS CRÍTICOS DE SEGURIDAD
-- 1. Proteger tabla profiles - contiene emails, teléfonos, cédulas
DROP POLICY IF EXISTS "Everyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins and socios can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins and socios can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));

-- 2. Proteger tabla reservations - contiene datos personales de clientes
DROP POLICY IF EXISTS "Everyone can view reservations" ON public.reservations;

CREATE POLICY "Authenticated users can view reservations"
ON public.reservations
FOR SELECT
TO authenticated
USING (true);

-- 3. Proteger tabla finance_items - datos financieros sensibles
DROP POLICY IF EXISTS "Everyone can view finance items" ON public.finance_items;

CREATE POLICY "Authenticated users can view finance items"
ON public.finance_items
FOR SELECT
TO authenticated
USING (true);

-- 4. Proteger tabla vehicles - estrategia de precios
DROP POLICY IF EXISTS "Everyone can view vehicles" ON public.vehicles;

CREATE POLICY "Authenticated users can view vehicles"
ON public.vehicles
FOR SELECT
TO authenticated
USING (true);

-- 5. Proteger otras tablas públicas
DROP POLICY IF EXISTS "Everyone can view alerts" ON public.alerts;
DROP POLICY IF EXISTS "Everyone can view maintenance" ON public.maintenance;
DROP POLICY IF EXISTS "Everyone can view checklists" ON public.checklists;
DROP POLICY IF EXISTS "Everyone can view checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "Everyone can view templates" ON public.checklist_templates;
DROP POLICY IF EXISTS "Everyone can view template items" ON public.checklist_template_items;
DROP POLICY IF EXISTS "Everyone can view maintenance schedules" ON public.maintenance_schedules;
DROP POLICY IF EXISTS "Everyone can view alerts" ON public.alerts_maintenance;

CREATE POLICY "Authenticated users can view alerts"
ON public.alerts
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view maintenance"
ON public.maintenance
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view checklists"
ON public.checklists
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view checklist items"
ON public.checklist_items
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view templates"
ON public.checklist_templates
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view template items"
ON public.checklist_template_items
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view maintenance schedules"
ON public.maintenance_schedules
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view maintenance alerts"
ON public.alerts_maintenance
FOR SELECT
TO authenticated
USING (true);

-- Agregar campo estado a la tabla alerts si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'alerts' AND column_name = 'estado'
  ) THEN
    ALTER TABLE public.alerts ADD COLUMN estado text DEFAULT 'pendiente';
  END IF;
END $$;

-- Función para marcar alerta de mantenimiento como atendida
CREATE OR REPLACE FUNCTION public.mark_maintenance_alert_resolved(
  p_alert_id uuid,
  p_descripcion text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Actualizar estado de la alerta
  UPDATE public.alerts_maintenance
  SET estado = 'resuelta',
      updated_at = now()
  WHERE id = p_alert_id;
  
  -- Registrar en auditoría
  PERFORM public.log_audit(
    'MAINTENANCE_ALERT_RESOLVED',
    'alerts_maintenance',
    p_alert_id,
    NULL,
    jsonb_build_object('alert_id', p_alert_id),
    COALESCE(p_descripcion, 'Alerta de mantenimiento marcada como resuelta')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función para marcar alerta general como resuelta
CREATE OR REPLACE FUNCTION public.resolve_alert(
  p_alert_id uuid,
  p_descripcion text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Actualizar estado de la alerta
  UPDATE public.alerts
  SET is_resolved = true,
      resolved_at = now(),
      resolved_by = auth.uid()
  WHERE id = p_alert_id;
  
  -- Registrar en auditoría
  PERFORM public.log_audit(
    'ALERT_RESOLVED',
    'alerts',
    p_alert_id,
    NULL,
    jsonb_build_object('alert_id', p_alert_id),
    COALESCE(p_descripcion, 'Alerta marcada como resuelta')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;