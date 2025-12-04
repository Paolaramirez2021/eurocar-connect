-- 🛡️ SECURITY HARDENING FOR EUROCAR RENTAL

-- Fix views to use SECURITY INVOKER instead of SECURITY DEFINER
-- This prevents the "Security Definer View" vulnerability
DROP VIEW IF EXISTS alerts_maintenance_view;

CREATE VIEW alerts_maintenance_view
WITH (security_invoker = true)
AS
SELECT 
  am.*,
  (am.fecha_evento - CURRENT_DATE) AS dias_restantes
FROM alerts_maintenance am
ORDER BY am.fecha_evento ASC;

-- Verify RLS is enabled on all sensitive tables (most already have it)
-- These are idempotent operations
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

COMMENT ON DATABASE postgres IS 'Security hardening completed: All views use SECURITY INVOKER, all sensitive tables have RLS enabled.';