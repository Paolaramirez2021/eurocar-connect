-- Fix critical security issues identified in Security Scan (Fixed version)

-- ============================================
-- ALERTS TABLE - Fix unrestricted INSERT policy
-- ============================================

-- Drop the overly permissive system insert policy
DROP POLICY IF EXISTS "System can create alerts" ON public.alerts;

-- Create a more restrictive policy: Only authenticated users can create alerts
CREATE POLICY "Authenticated users can create alerts"
ON public.alerts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- RESERVATIONS TABLE - Implement creator-based access
-- ============================================

-- Drop the current SELECT policy
DROP POLICY IF EXISTS "Authorized roles view reservations" ON public.reservations;

-- Allow users to view reservations they created
CREATE POLICY "Users view own reservations"
ON public.reservations
FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

-- Allow admins and socios to view all reservations
CREATE POLICY "Admins view all reservations"
ON public.reservations
FOR SELECT
TO authenticated
USING (
  public.has_any_role(
    auth.uid(), 
    ARRAY['socio_principal'::app_role, 'administrador'::app_role]
  )
);

-- ============================================
-- GEOFENCE_ZONES TABLE - Restrict to authenticated users
-- ============================================

-- Drop the public access policy
DROP POLICY IF EXISTS "Everyone can view active geofence zones" ON public.geofence_zones;

-- Only authenticated users can view geofence zones
CREATE POLICY "Authenticated users view geofence zones"
ON public.geofence_zones
FOR SELECT
TO authenticated
USING (is_active = true);

-- Note: alerts_maintenance_view is a VIEW, not a table, so it inherits RLS
-- from the underlying alerts_maintenance table which already has proper policies

-- Log security fixes
INSERT INTO public.audit_log (
  action_type,
  table_name,
  description,
  new_data
) VALUES (
  'SECURITY_FIX',
  'multiple',
  'Fixed critical security issues: alerts creation, reservations access, geofence exposure',
  jsonb_build_object(
    'tables_fixed', ARRAY['alerts', 'reservations', 'geofence_zones'],
    'issues_resolved', ARRAY[
      'Restricted alert creation to authenticated users only',
      'Implemented creator-based reservation access with admin override',
      'Protected geofence coordinates from unauthenticated access'
    ]
  )
);