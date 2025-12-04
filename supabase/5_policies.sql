-- ============================================================
-- EUROCAR RENTAL - DATABASE SCHEMA
-- File: 5_policies.sql
-- Description: Row Level Security Policies
-- NOTE: Execute AFTER tables, functions, and RLS enabling
-- ============================================================

-- ============================================================
-- PROFILES TABLE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Users view own profile only" ON public.profiles;
CREATE POLICY "Users view own profile only"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
CREATE POLICY "Admins view all profiles"
    ON public.profiles FOR SELECT
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']::app_role[]));

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- ============================================================
-- USER_ROLES TABLE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Socios and admins can view all roles" ON public.user_roles;
CREATE POLICY "Socios and admins can view all roles"
    ON public.user_roles FOR SELECT
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']::app_role[]));

DROP POLICY IF EXISTS "Only socios can manage roles" ON public.user_roles;
CREATE POLICY "Only socios can manage roles"
    ON public.user_roles FOR ALL
    USING (public.has_role(auth.uid(), 'socio_principal'::app_role));

-- ============================================================
-- VEHICLES TABLE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON public.vehicles;
CREATE POLICY "Authenticated users can view vehicles"
    ON public.vehicles FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins and socios can manage vehicles" ON public.vehicles;
CREATE POLICY "Admins and socios can manage vehicles"
    ON public.vehicles FOR ALL
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']::app_role[]));

-- ============================================================
-- CUSTOMERS TABLE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
CREATE POLICY "Authenticated users can view customers"
    ON public.customers FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins and comercial can create customers" ON public.customers;
CREATE POLICY "Admins and comercial can create customers"
    ON public.customers FOR INSERT
    WITH CHECK (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador', 'comercial', 'operativo']::app_role[]));

DROP POLICY IF EXISTS "Admins and comercial can update customers" ON public.customers;
CREATE POLICY "Admins and comercial can update customers"
    ON public.customers FOR UPDATE
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador', 'comercial']::app_role[]));

DROP POLICY IF EXISTS "Admins can delete customers" ON public.customers;
CREATE POLICY "Admins can delete customers"
    ON public.customers FOR DELETE
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']::app_role[]));

-- ============================================================
-- RESERVATIONS TABLE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Users view own reservations" ON public.reservations;
CREATE POLICY "Users view own reservations"
    ON public.reservations FOR SELECT
    USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Admins view all reservations" ON public.reservations;
CREATE POLICY "Admins view all reservations"
    ON public.reservations FOR SELECT
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']::app_role[]));

DROP POLICY IF EXISTS "Comercial and operativo can create reservations" ON public.reservations;
CREATE POLICY "Comercial and operativo can create reservations"
    ON public.reservations FOR INSERT
    WITH CHECK (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador', 'comercial', 'operativo']::app_role[]));

DROP POLICY IF EXISTS "Admins and comercial can update reservations" ON public.reservations;
CREATE POLICY "Admins and comercial can update reservations"
    ON public.reservations FOR UPDATE
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador', 'comercial']::app_role[]));

DROP POLICY IF EXISTS "Admins can delete reservations" ON public.reservations;
CREATE POLICY "Admins can delete reservations"
    ON public.reservations FOR DELETE
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']::app_role[]));

-- ============================================================
-- CONTRACTS TABLE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can view contracts" ON public.contracts;
CREATE POLICY "Authenticated users can view contracts"
    ON public.contracts FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authorized roles can create contracts" ON public.contracts;
CREATE POLICY "Authorized roles can create contracts"
    ON public.contracts FOR INSERT
    WITH CHECK (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador', 'comercial', 'operativo']::app_role[]));

DROP POLICY IF EXISTS "Only admins can update unlocked contracts" ON public.contracts;
CREATE POLICY "Only admins can update unlocked contracts"
    ON public.contracts FOR UPDATE
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']::app_role[]) AND is_locked = false);

DROP POLICY IF EXISTS "Admins can delete contracts" ON public.contracts;
CREATE POLICY "Admins can delete contracts"
    ON public.contracts FOR DELETE
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']::app_role[]));

-- ============================================================
-- CHECKLIST TEMPLATES TABLE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can view templates" ON public.checklist_templates;
CREATE POLICY "Authenticated users can view templates"
    ON public.checklist_templates FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins and socios can manage templates" ON public.checklist_templates;
CREATE POLICY "Admins and socios can manage templates"
    ON public.checklist_templates FOR ALL
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']::app_role[]));

-- ============================================================
-- CHECKLIST TEMPLATE ITEMS TABLE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can view template items" ON public.checklist_template_items;
CREATE POLICY "Authenticated users can view template items"
    ON public.checklist_template_items FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins and socios can manage template items" ON public.checklist_template_items;
CREATE POLICY "Admins and socios can manage template items"
    ON public.checklist_template_items FOR ALL
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']::app_role[]));

-- ============================================================
-- CHECKLISTS TABLE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can view checklists" ON public.checklists;
CREATE POLICY "Authenticated users can view checklists"
    ON public.checklists FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Comercial and operativo can create checklists" ON public.checklists;
CREATE POLICY "Comercial and operativo can create checklists"
    ON public.checklists FOR INSERT
    WITH CHECK (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador', 'comercial', 'operativo']::app_role[]));

DROP POLICY IF EXISTS "Admins can update checklists" ON public.checklists;
CREATE POLICY "Admins can update checklists"
    ON public.checklists FOR UPDATE
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']::app_role[]));

-- ============================================================
-- CHECKLIST ITEMS TABLE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can view checklist items" ON public.checklist_items;
CREATE POLICY "Authenticated users can view checklist items"
    ON public.checklist_items FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can manage their checklist items" ON public.checklist_items;
CREATE POLICY "Users can manage their checklist items"
    ON public.checklist_items FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.checklists
        WHERE checklists.id = checklist_items.checklist_id
        AND checklists.completed_by = auth.uid()
    ));

-- ============================================================
-- MAINTENANCE TABLE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can view maintenance" ON public.maintenance;
CREATE POLICY "Authenticated users can view maintenance"
    ON public.maintenance FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins and operativo can create maintenance" ON public.maintenance;
CREATE POLICY "Admins and operativo can create maintenance"
    ON public.maintenance FOR INSERT
    WITH CHECK (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador', 'operativo']::app_role[]));

DROP POLICY IF EXISTS "Admins can update maintenance" ON public.maintenance;
CREATE POLICY "Admins can update maintenance"
    ON public.maintenance FOR UPDATE
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']::app_role[]));

DROP POLICY IF EXISTS "Admins can delete maintenance" ON public.maintenance;
CREATE POLICY "Admins can delete maintenance"
    ON public.maintenance FOR DELETE
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']::app_role[]));

-- ============================================================
-- MAINTENANCE SCHEDULES TABLE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can view maintenance schedules" ON public.maintenance_schedules;
CREATE POLICY "Authenticated users can view maintenance schedules"
    ON public.maintenance_schedules FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins can manage maintenance schedules" ON public.maintenance_schedules;
CREATE POLICY "Admins can manage maintenance schedules"
    ON public.maintenance_schedules FOR ALL
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']::app_role[]));

-- ============================================================
-- ALERTS TABLE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can view alerts" ON public.alerts;
CREATE POLICY "Authenticated users can view alerts"
    ON public.alerts FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can create alerts" ON public.alerts;
CREATE POLICY "Authenticated users can create alerts"
    ON public.alerts FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update alerts" ON public.alerts;
CREATE POLICY "Admins can update alerts"
    ON public.alerts FOR UPDATE
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']::app_role[]));

DROP POLICY IF EXISTS "Admins can delete alerts" ON public.alerts;
CREATE POLICY "Admins can delete alerts"
    ON public.alerts FOR DELETE
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']::app_role[]));

-- ============================================================
-- ALERTS MAINTENANCE TABLE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can view maintenance alerts" ON public.alerts_maintenance;
CREATE POLICY "Authenticated users can view maintenance alerts"
    ON public.alerts_maintenance FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins and operativo can create alerts" ON public.alerts_maintenance;
CREATE POLICY "Admins and operativo can create alerts"
    ON public.alerts_maintenance FOR INSERT
    WITH CHECK (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador', 'operativo']::app_role[]));

DROP POLICY IF EXISTS "Admins and operativo can update alerts" ON public.alerts_maintenance;
CREATE POLICY "Admins and operativo can update alerts"
    ON public.alerts_maintenance FOR UPDATE
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador', 'operativo']::app_role[]));

DROP POLICY IF EXISTS "Admins can delete alerts" ON public.alerts_maintenance;
CREATE POLICY "Admins can delete alerts"
    ON public.alerts_maintenance FOR DELETE
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']::app_role[]));

-- ============================================================
-- FINANCE ITEMS TABLE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Only authorized roles view financial data" ON public.finance_items;
CREATE POLICY "Only authorized roles view financial data"
    ON public.finance_items FOR SELECT
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']::app_role[]));

DROP POLICY IF EXISTS "Admins can manage finance items" ON public.finance_items;
CREATE POLICY "Admins can manage finance items"
    ON public.finance_items FOR ALL
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']::app_role[]));

-- ============================================================
-- PICO PLACA PAYMENTS TABLE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can view pico placa payments" ON public.pico_placa_payments;
CREATE POLICY "Authenticated users can view pico placa payments"
    ON public.pico_placa_payments FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins and operativo can manage pico placa payments" ON public.pico_placa_payments;
CREATE POLICY "Admins and operativo can manage pico placa payments"
    ON public.pico_placa_payments FOR ALL
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador', 'operativo']::app_role[]));

-- ============================================================
-- DEVOLUCION VIDEOS TABLE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can view devolucion videos" ON public.devolucion_videos;
CREATE POLICY "Authenticated users can view devolucion videos"
    ON public.devolucion_videos FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins and operativo can manage devolucion videos" ON public.devolucion_videos;
CREATE POLICY "Admins and operativo can manage devolucion videos"
    ON public.devolucion_videos FOR ALL
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador', 'operativo', 'comercial']::app_role[]));

-- ============================================================
-- GEOFENCE ZONES TABLE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users view geofence zones" ON public.geofence_zones;
CREATE POLICY "Authenticated users view geofence zones"
    ON public.geofence_zones FOR SELECT
    USING (is_active = true);

DROP POLICY IF EXISTS "Admins and socios can manage geofence zones" ON public.geofence_zones;
CREATE POLICY "Admins and socios can manage geofence zones"
    ON public.geofence_zones FOR ALL
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']::app_role[]));

-- ============================================================
-- TIME ENTRIES TABLE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Users can view their own time entries" ON public.time_entries;
CREATE POLICY "Users can view their own time entries"
    ON public.time_entries FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and socios can view all time entries" ON public.time_entries;
CREATE POLICY "Admins and socios can view all time entries"
    ON public.time_entries FOR SELECT
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']::app_role[]));

DROP POLICY IF EXISTS "Users can insert their own time entries" ON public.time_entries;
CREATE POLICY "Users can insert their own time entries"
    ON public.time_entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all time entries" ON public.time_entries;
CREATE POLICY "Admins can manage all time entries"
    ON public.time_entries FOR ALL
    USING (public.has_role(auth.uid(), 'administrador'::app_role));

-- ============================================================
-- SETTINGS TABLE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.settings;
CREATE POLICY "Authenticated users can view settings"
    ON public.settings FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage settings" ON public.settings;
CREATE POLICY "Authenticated users can manage settings"
    ON public.settings FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- AGENTS TABLE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Admins and socios can view agents" ON public.agents;
CREATE POLICY "Admins and socios can view agents"
    ON public.agents FOR SELECT
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']::app_role[]));

DROP POLICY IF EXISTS "Socios and admins can manage agents" ON public.agents;
CREATE POLICY "Socios and admins can manage agents"
    ON public.agents FOR ALL
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']::app_role[]));

-- ============================================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;
CREATE POLICY "Admins can view all notifications"
    ON public.notifications FOR SELECT
    USING (public.has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']::app_role[]));

DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================
-- AUDIT LOG TABLE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Socios can view all audit logs" ON public.audit_log;
CREATE POLICY "Socios can view all audit logs"
    ON public.audit_log FOR SELECT
    USING (public.has_role(auth.uid(), 'socio_principal'::app_role));

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_log;
CREATE POLICY "Admins can view audit logs"
    ON public.audit_log FOR SELECT
    USING (public.has_role(auth.uid(), 'administrador'::app_role));

DROP POLICY IF EXISTS "All authenticated users can insert audit logs" ON public.audit_log;
CREATE POLICY "All authenticated users can insert audit logs"
    ON public.audit_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- END OF FILE 5_policies.sql
-- ============================================================
