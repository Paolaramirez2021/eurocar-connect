-- ============================================================
-- EUROCAR RENTAL - DATABASE VERIFICATION
-- File: checks.sql
-- Description: Verification queries to check database state
-- Generated: 2025-12-02
-- Author: Lovable AI
-- ============================================================

-- ============================================================
-- SECTION 1: TABLE EXISTENCE CHECKS
-- ============================================================

SELECT 'profiles' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') AS exists;

SELECT 'user_roles' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') AS exists;

SELECT 'vehicles' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vehicles') AS exists;

SELECT 'customers' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') AS exists;

SELECT 'reservations' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reservations') AS exists;

SELECT 'contracts' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contracts') AS exists;

SELECT 'checklist_templates' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'checklist_templates') AS exists;

SELECT 'checklist_template_items' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'checklist_template_items') AS exists;

SELECT 'checklists' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'checklists') AS exists;

SELECT 'checklist_items' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'checklist_items') AS exists;

SELECT 'maintenance' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'maintenance') AS exists;

SELECT 'maintenance_schedules' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'maintenance_schedules') AS exists;

SELECT 'alerts' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'alerts') AS exists;

SELECT 'alerts_maintenance' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'alerts_maintenance') AS exists;

SELECT 'finance_items' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'finance_items') AS exists;

SELECT 'pico_placa_payments' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pico_placa_payments') AS exists;

SELECT 'devolucion_videos' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'devolucion_videos') AS exists;

SELECT 'geofence_zones' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'geofence_zones') AS exists;

SELECT 'time_entries' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_entries') AS exists;

SELECT 'settings' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'settings') AS exists;

SELECT 'agents' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agents') AS exists;

SELECT 'notifications' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') AS exists;

SELECT 'audit_log' AS table_name, 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_log') AS exists;

-- ============================================================
-- SECTION 2: ENUM TYPE CHECK
-- ============================================================

SELECT 'app_role' AS type_name,
       EXISTS(SELECT 1 FROM pg_type WHERE typname = 'app_role') AS exists;

-- ============================================================
-- SECTION 3: FUNCTION EXISTENCE CHECKS
-- ============================================================

SELECT 'has_role' AS function_name,
       EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'has_role') AS exists;

SELECT 'has_any_role' AS function_name,
       EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'has_any_role') AS exists;

SELECT 'get_user_roles' AS function_name,
       EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_user_roles') AS exists;

SELECT 'log_audit' AS function_name,
       EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'log_audit') AS exists;

SELECT 'generate_contract_number' AS function_name,
       EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'generate_contract_number') AS exists;

SELECT 'check_reservation_availability' AS function_name,
       EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'check_reservation_availability') AS exists;

SELECT 'is_within_geofence' AS function_name,
       EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'is_within_geofence') AS exists;

SELECT 'update_updated_at_column' AS function_name,
       EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'update_updated_at_column') AS exists;

-- ============================================================
-- SECTION 4: VIEW EXISTENCE CHECKS
-- ============================================================

SELECT 'customer_stats' AS view_name,
       EXISTS(SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'customer_stats') AS exists;

SELECT 'alerts_maintenance_view' AS view_name,
       EXISTS(SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'alerts_maintenance_view') AS exists;

-- ============================================================
-- SECTION 5: RLS STATUS CHECK
-- ============================================================

SELECT tablename, rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================
-- SECTION 6: POLICY COUNT BY TABLE
-- ============================================================

SELECT tablename, COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================================
-- SECTION 7: INDEX COUNT CHECK
-- ============================================================

SELECT COUNT(*) AS total_indexes
FROM pg_indexes
WHERE schemaname = 'public';

-- ============================================================
-- SECTION 8: TRIGGER COUNT CHECK
-- ============================================================

SELECT COUNT(*) AS total_triggers
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- ============================================================
-- END OF FILE checks.sql
-- ============================================================
