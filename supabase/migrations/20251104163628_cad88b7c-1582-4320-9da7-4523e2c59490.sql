-- Fix RLS policies for sensitive data protection

-- ============================================
-- PROFILES TABLE - Restrict access to sensitive personal data
-- ============================================

-- Drop existing SELECT policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins and socios can view all profiles" ON public.profiles;

-- Users can ONLY view their own profile
CREATE POLICY "Users view own profile only"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Admins and socios can view all profiles (separate policy)
CREATE POLICY "Admins view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role])
);

-- ============================================
-- RESERVATIONS TABLE - Restrict customer PII access
-- ============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view reservations" ON public.reservations;

-- Only comercial, operativo, admin, and socio can view reservations (with customer PII)
CREATE POLICY "Authorized roles view reservations"
ON public.reservations
FOR SELECT
TO authenticated
USING (
  public.has_any_role(
    auth.uid(), 
    ARRAY['socio_principal'::app_role, 'administrador'::app_role, 'comercial'::app_role, 'operativo'::app_role]
  )
);

-- ============================================
-- AUDIT_LOG TABLE - Ensure proper access control
-- ============================================

-- Audit logs should only be viewable by authorized roles (already correct)
-- No changes needed, policies are already restrictive

-- ============================================
-- TIME_ENTRIES TABLE - Users can only see their own entries
-- ============================================

-- Already has correct policies, no changes needed

-- Log the security configuration update
INSERT INTO public.audit_log (
  action_type,
  table_name,
  description,
  new_data
) VALUES (
  'SECURITY_CONFIG_UPDATE',
  'multiple',
  'Updated RLS policies to restrict access to sensitive personal information',
  jsonb_build_object(
    'tables_updated', ARRAY['profiles', 'reservations'],
    'security_level', 'high',
    'pii_protected', true
  )
);