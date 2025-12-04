-- Restrict access to financial data - Only authorized roles

-- ============================================
-- FINANCE_ITEMS TABLE - Critical Financial Data Protection
-- ============================================

-- Drop the overly permissive SELECT policy that allows all authenticated users
DROP POLICY IF EXISTS "Authenticated users can view finance items" ON public.finance_items;

-- Only admins and socios can view financial records
CREATE POLICY "Only authorized roles view financial data"
ON public.finance_items
FOR SELECT
TO authenticated
USING (
  public.has_any_role(
    auth.uid(), 
    ARRAY['socio_principal'::app_role, 'administrador'::app_role]
  )
);

-- Verify that finance_items management policy is still in place
-- (Already exists: "Admins can manage finance items" for ALL operations)

-- ============================================
-- RESERVATIONS TABLE - Already properly secured
-- ============================================
-- No changes needed - reservations already has proper role-based access control
-- Only comercial, operativo, admin, and socio can view/manage reservations

-- Log the financial security update
INSERT INTO public.audit_log (
  action_type,
  table_name,
  description,
  new_data
) VALUES (
  'SECURITY_CONFIG_UPDATE',
  'finance_items',
  'Restricted financial data access to admin and socio roles only',
  jsonb_build_object(
    'tables_updated', ARRAY['finance_items'],
    'security_level', 'critical',
    'financial_data_protected', true,
    'allowed_roles', ARRAY['socio_principal', 'administrador']
  )
);