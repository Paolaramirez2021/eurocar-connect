-- ============================================================
-- EUROCAR RENTAL - DATABASE SCHEMA
-- File: 04_indexes_seeds.sql
-- Description: Indexes and Seed Data
-- Generated: 2025-12-02
-- Author: Lovable AI
-- ============================================================

-- ============================================================
-- SECTION 1: INDEXES
-- ============================================================

-- Vehicles indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_placa ON public.vehicles(placa);
CREATE INDEX IF NOT EXISTS idx_vehicles_estado ON public.vehicles(estado);
CREATE INDEX IF NOT EXISTS idx_vehicles_marca_modelo ON public.vehicles(marca, modelo);

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_cedula ON public.customers(cedula_pasaporte);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_celular ON public.customers(celular);
CREATE INDEX IF NOT EXISTS idx_customers_estado ON public.customers(estado);

-- Reservations indexes (critical for calendar performance)
CREATE INDEX IF NOT EXISTS idx_reservations_vehicle_id ON public.reservations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_reservations_customer_id ON public.reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_estado ON public.reservations(estado);
CREATE INDEX IF NOT EXISTS idx_reservations_fecha_inicio ON public.reservations(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_reservations_fecha_fin ON public.reservations(fecha_fin);
CREATE INDEX IF NOT EXISTS idx_reservations_fechas ON public.reservations(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_reservations_vehicle_fechas ON public.reservations(vehicle_id, fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_reservations_created_by ON public.reservations(created_by);
CREATE INDEX IF NOT EXISTS idx_reservations_payment_status ON public.reservations(payment_status);

-- Contracts indexes
CREATE INDEX IF NOT EXISTS idx_contracts_contract_number ON public.contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_contracts_vehicle_id ON public.contracts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON public.contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_reservation_id ON public.contracts(reservation_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_signed_at ON public.contracts(signed_at);

-- Maintenance indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_id ON public.maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_fecha ON public.maintenance(fecha);
CREATE INDEX IF NOT EXISTS idx_maintenance_tipo ON public.maintenance(tipo);
CREATE INDEX IF NOT EXISTS idx_maintenance_completed ON public.maintenance(completed);

-- Maintenance schedules indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_vehicle_id ON public.maintenance_schedules(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_tipo ON public.maintenance_schedules(tipo);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_is_active ON public.maintenance_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_next_due_date ON public.maintenance_schedules(next_due_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_next_due_km ON public.maintenance_schedules(next_due_km);

-- Alerts indexes
CREATE INDEX IF NOT EXISTS idx_alerts_vehicle_id ON public.alerts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_alerts_tipo ON public.alerts(tipo);
CREATE INDEX IF NOT EXISTS idx_alerts_is_resolved ON public.alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_alerts_priority ON public.alerts(priority);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_meta ON public.alerts USING GIN(meta);

-- Alerts maintenance indexes
CREATE INDEX IF NOT EXISTS idx_alerts_maintenance_vehicle_id ON public.alerts_maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_alerts_maintenance_estado ON public.alerts_maintenance(estado);
CREATE INDEX IF NOT EXISTS idx_alerts_maintenance_fecha_evento ON public.alerts_maintenance(fecha_evento);
CREATE INDEX IF NOT EXISTS idx_alerts_maintenance_tipo_alerta ON public.alerts_maintenance(tipo_alerta);

-- Finance items indexes
CREATE INDEX IF NOT EXISTS idx_finance_items_vehicle_id ON public.finance_items(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_finance_items_type ON public.finance_items(type);
CREATE INDEX IF NOT EXISTS idx_finance_items_date ON public.finance_items(date);
CREATE INDEX IF NOT EXISTS idx_finance_items_ref_id ON public.finance_items(ref_id);

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Checklists indexes
CREATE INDEX IF NOT EXISTS idx_checklists_vehicle_id ON public.checklists(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_checklists_template_id ON public.checklists(template_id);
CREATE INDEX IF NOT EXISTS idx_checklists_completed_by ON public.checklists(completed_by);
CREATE INDEX IF NOT EXISTS idx_checklists_type ON public.checklists(type);

-- Checklist items indexes
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON public.checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_template_item_id ON public.checklist_items(template_item_id);

-- Checklist template items indexes
CREATE INDEX IF NOT EXISTS idx_checklist_template_items_template_id ON public.checklist_template_items(template_id);

-- Time entries indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_timestamp ON public.time_entries(timestamp);
CREATE INDEX IF NOT EXISTS idx_time_entries_type ON public.time_entries(type);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action_type ON public.audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON public.audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at);

-- Geofence zones indexes
CREATE INDEX IF NOT EXISTS idx_geofence_zones_is_active ON public.geofence_zones(is_active);

-- Agents indexes
CREATE INDEX IF NOT EXISTS idx_agents_api_key ON public.agents(api_key);
CREATE INDEX IF NOT EXISTS idx_agents_active ON public.agents(active);

-- Pico placa payments indexes
CREATE INDEX IF NOT EXISTS idx_pico_placa_payments_vehicle_id ON public.pico_placa_payments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_pico_placa_payments_fecha ON public.pico_placa_payments(fecha);
CREATE INDEX IF NOT EXISTS idx_pico_placa_payments_pagado ON public.pico_placa_payments(pagado);

-- Devolucion videos indexes
CREATE INDEX IF NOT EXISTS idx_devolucion_videos_vehicle_id ON public.devolucion_videos(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_devolucion_videos_reservation_id ON public.devolucion_videos(reservation_id);
CREATE INDEX IF NOT EXISTS idx_devolucion_videos_checklist_id ON public.devolucion_videos(checklist_id);

-- ============================================================
-- SECTION 2: SEED DATA (Non-sensitive)
-- ============================================================

-- Default settings
INSERT INTO public.settings (key, value) VALUES
    ('reservation_timeout_hours', '24'::jsonb),
    ('reservation_notifications_enabled', 'true'::jsonb),
    ('auto_regenerate_vehicle_status', 'true'::jsonb),
    ('envio_contrato_previo', 'false'::jsonb),
    ('integration_google', '{"enabled": false}'::jsonb),
    ('integration_gpt', '{"enabled": true}'::jsonb),
    ('integration_stripe', '{"enabled": false}'::jsonb),
    ('integration_mercadopago', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- SECTION 3: AUTH TRIGGER (execute separately or manually)
-- ============================================================

-- Create trigger on auth.users for new user profile creation
-- NOTE: This needs to be run with appropriate permissions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- END OF FILE 04_indexes_seeds.sql
-- ============================================================
