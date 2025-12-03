-- ============================================================
-- EUROCAR RENTAL - DATABASE RECREATE SCRIPT
-- File: recreate_from_scratch.sql
-- Generated: 2025-12-02
-- Author: Lovable AI
-- ============================================================
-- 
-- ██     ██  █████  ██████  ███    ██ ██ ███    ██  ██████  
-- ██     ██ ██   ██ ██   ██ ████   ██ ██ ████   ██ ██       
-- ██  █  ██ ███████ ██████  ██ ██  ██ ██ ██ ██  ██ ██   ███ 
-- ██ ███ ██ ██   ██ ██   ██ ██  ██ ██ ██ ██  ██ ██ ██    ██ 
--  ███ ███  ██   ██ ██   ██ ██   ████ ██ ██   ████  ██████  
--
-- ============================================================
-- ⚠️  DANGER: THIS SCRIPT WILL DELETE ALL DATA!  ⚠️
-- ============================================================
-- 
-- This script is ONLY for development and testing environments.
-- DO NOT execute this script in production!
--
-- Before running this script:
-- 1. Make a complete backup of your database
-- 2. Verify you are NOT connected to production
-- 3. Understand that ALL DATA WILL BE LOST
--
-- To confirm execution, uncomment the entire script below.
-- ============================================================

/*
-- ============================================================
-- UNCOMMENT THIS SECTION TO ENABLE THE SCRIPT
-- ============================================================

-- ============================================================
-- SECTION 1: DROP ALL TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON public.vehicles;
DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
DROP TRIGGER IF EXISTS update_reservations_updated_at ON public.reservations;
DROP TRIGGER IF EXISTS update_contracts_updated_at ON public.contracts;
DROP TRIGGER IF EXISTS update_checklist_templates_updated_at ON public.checklist_templates;
DROP TRIGGER IF EXISTS update_maintenance_updated_at ON public.maintenance;
DROP TRIGGER IF EXISTS update_maintenance_schedules_updated_at ON public.maintenance_schedules;
DROP TRIGGER IF EXISTS update_alerts_maintenance_updated_at ON public.alerts_maintenance;
DROP TRIGGER IF EXISTS update_pico_placa_payments_updated_at ON public.pico_placa_payments;
DROP TRIGGER IF EXISTS update_devolucion_videos_updated_at ON public.devolucion_videos;
DROP TRIGGER IF EXISTS update_geofence_zones_updated_at ON public.geofence_zones;
DROP TRIGGER IF EXISTS update_agents_updated_at ON public.agents;
DROP TRIGGER IF EXISTS set_contract_number_trigger ON public.contracts;
DROP TRIGGER IF EXISTS prevent_contract_modification_trigger ON public.contracts;
DROP TRIGGER IF EXISTS log_contract_signing_trigger ON public.contracts;
DROP TRIGGER IF EXISTS update_reservation_on_contract_create_trigger ON public.contracts;
DROP TRIGGER IF EXISTS update_reservation_on_contract_delete_trigger ON public.contracts;
DROP TRIGGER IF EXISTS update_vehicle_estado_on_reservation_trigger ON public.reservations;
DROP TRIGGER IF EXISTS update_vehicle_estado_on_reservation_end_trigger ON public.reservations;
DROP TRIGGER IF EXISTS update_customer_stats_trigger ON public.reservations;
DROP TRIGGER IF EXISTS create_finance_item_for_reservation_trigger ON public.reservations;
DROP TRIGGER IF EXISTS notify_reservation_expired_trigger ON public.reservations;
DROP TRIGGER IF EXISTS update_vehicle_estado_on_maintenance_trigger ON public.maintenance;
DROP TRIGGER IF EXISTS update_vehicle_on_maintenance_complete_trigger ON public.maintenance;
DROP TRIGGER IF EXISTS create_finance_item_for_maintenance_trigger ON public.maintenance;

-- ============================================================
-- SECTION 2: DROP ALL VIEWS
-- ============================================================

DROP VIEW IF EXISTS public.customer_stats CASCADE;
DROP VIEW IF EXISTS public.alerts_maintenance_view CASCADE;

-- ============================================================
-- SECTION 3: DROP ALL TABLES (reverse dependency order)
-- ============================================================

DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.agents CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.time_entries CASCADE;
DROP TABLE IF EXISTS public.geofence_zones CASCADE;
DROP TABLE IF EXISTS public.devolucion_videos CASCADE;
DROP TABLE IF EXISTS public.pico_placa_payments CASCADE;
DROP TABLE IF EXISTS public.finance_items CASCADE;
DROP TABLE IF EXISTS public.alerts_maintenance CASCADE;
DROP TABLE IF EXISTS public.alerts CASCADE;
DROP TABLE IF EXISTS public.maintenance_schedules CASCADE;
DROP TABLE IF EXISTS public.maintenance CASCADE;
DROP TABLE IF EXISTS public.checklist_items CASCADE;
DROP TABLE IF EXISTS public.checklists CASCADE;
DROP TABLE IF EXISTS public.checklist_template_items CASCADE;
DROP TABLE IF EXISTS public.checklist_templates CASCADE;
DROP TABLE IF EXISTS public.contracts CASCADE;
DROP TABLE IF EXISTS public.reservations CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.vehicles CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================================
-- SECTION 4: DROP ALL FUNCTIONS
-- ============================================================

DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.has_role(UUID, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.has_any_role(UUID, app_role[]) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_roles(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.log_audit(TEXT, TEXT, UUID, JSONB, JSONB, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.generate_contract_number() CASCADE;
DROP FUNCTION IF EXISTS public.set_contract_number() CASCADE;
DROP FUNCTION IF EXISTS public.check_reservation_availability(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_within_geofence(NUMERIC, NUMERIC, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.notify_admins(TEXT, TEXT, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.check_maintenance_alerts() CASCADE;
DROP FUNCTION IF EXISTS public.update_alerts_estado() CASCADE;
DROP FUNCTION IF EXISTS public.resolve_alert(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.mark_maintenance_alert_resolved(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.generate_km_alerts() CASCADE;
DROP FUNCTION IF EXISTS public.generate_date_alerts() CASCADE;
DROP FUNCTION IF EXISTS public.update_customer_stats() CASCADE;
DROP FUNCTION IF EXISTS public.create_finance_item_for_maintenance() CASCADE;
DROP FUNCTION IF EXISTS public.create_finance_item_for_reservation() CASCADE;
DROP FUNCTION IF EXISTS public.prevent_contract_modification() CASCADE;
DROP FUNCTION IF EXISTS public.log_contract_signing() CASCADE;
DROP FUNCTION IF EXISTS public.update_reservation_on_contract_create() CASCADE;
DROP FUNCTION IF EXISTS public.update_reservation_on_contract_delete() CASCADE;
DROP FUNCTION IF EXISTS public.update_vehicle_estado_on_reservation() CASCADE;
DROP FUNCTION IF EXISTS public.update_vehicle_estado_on_reservation_end() CASCADE;
DROP FUNCTION IF EXISTS public.update_vehicle_estado_on_maintenance() CASCADE;
DROP FUNCTION IF EXISTS public.update_vehicle_on_maintenance_complete() CASCADE;
DROP FUNCTION IF EXISTS public.notify_reservation_expired() CASCADE;

-- ============================================================
-- SECTION 5: DROP ENUM TYPES
-- ============================================================

DROP TYPE IF EXISTS public.app_role CASCADE;

-- ============================================================
-- SECTION 6: RECREATE EVERYTHING
-- Now include the content from schema_export.sql here
-- or run 01_tables.sql, 02_functions_triggers_views.sql, 
-- 03_rls_policies.sql, 04_indexes_seeds.sql in order
-- ============================================================

-- Run: \i /path/to/01_tables.sql
-- Run: \i /path/to/02_functions_triggers_views.sql
-- Run: \i /path/to/03_rls_policies.sql
-- Run: \i /path/to/04_indexes_seeds.sql

*/

-- ============================================================
-- END OF FILE recreate_from_scratch.sql
-- ============================================================
