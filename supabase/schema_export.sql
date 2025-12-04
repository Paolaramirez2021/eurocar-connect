-- ============================================================
-- EUROCAR RENTAL - COMPLETE DATABASE SCHEMA EXPORT
-- ============================================================
-- Generated: 2025-12-02
-- Author: Lovable AI
-- Version: 1.0.0
-- 
-- This file contains the complete database schema for Eurocar Rental
-- It is a concatenation of all individual SQL files in execution order:
--   1. 01_tables.sql - Types and Tables
--   2. 02_functions_triggers_views.sql - Functions, Triggers, Views
--   3. 03_rls_policies.sql - Row Level Security Policies
--   4. 04_indexes_seeds.sql - Indexes and Seed Data
--
-- EXECUTION ORDER: Run this file in a fresh database or execute
-- the individual files in the numbered order above.
--
-- IMPORTANT: This schema is designed for Supabase/PostgreSQL.
-- Do NOT execute on production without proper backup!
-- ============================================================

-- ============================================================
-- PART 1: TYPES AND TABLES
-- ============================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM (
            'socio_principal',
            'administrador',
            'comercial',
            'operativo'
        );
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID NOT NULL PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    cedula TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    role public.app_role NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    assigned_by UUID,
    UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    placa TEXT NOT NULL UNIQUE,
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    año INTEGER NOT NULL,
    color TEXT,
    estado TEXT NOT NULL DEFAULT 'disponible',
    tipo_caja TEXT,
    combustible TEXT,
    cilindraje INTEGER,
    capacidad_pasajeros INTEGER,
    equipamiento TEXT,
    kilometraje_actual INTEGER NOT NULL DEFAULT 0,
    kilometraje_dia INTEGER,
    tarifa_dia_iva NUMERIC,
    fecha_soat DATE,
    fecha_tecnomecanica DATE,
    fecha_impuestos DATE,
    kilometraje_proximo_mantenimiento INTEGER,
    ultimo_cambio_aceite_km INTEGER,
    ultimo_cambio_llantas_km INTEGER,
    ultimo_cambio_pastillas_km INTEGER,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nombres TEXT NOT NULL,
    primer_apellido TEXT NOT NULL,
    segundo_apellido TEXT,
    cedula_pasaporte TEXT NOT NULL,
    fecha_nacimiento DATE,
    ciudad TEXT,
    pais TEXT DEFAULT 'Colombia',
    estado_civil TEXT,
    licencia_numero TEXT,
    licencia_ciudad_expedicion TEXT,
    licencia_fecha_vencimiento DATE,
    direccion_residencia TEXT,
    telefono TEXT,
    celular TEXT NOT NULL,
    email TEXT,
    ocupacion TEXT,
    empresa TEXT,
    direccion_oficina TEXT,
    banco TEXT,
    numero_tarjeta TEXT,
    referencia_personal_nombre TEXT,
    referencia_personal_telefono TEXT,
    referencia_comercial_nombre TEXT,
    referencia_comercial_telefono TEXT,
    referencia_familiar_nombre TEXT,
    referencia_familiar_telefono TEXT,
    foto_documento_url TEXT,
    estado TEXT DEFAULT 'activo',
    observaciones TEXT,
    hotel_hospedaje TEXT,
    hotel_numero_habitacion TEXT,
    alerta_cliente TEXT DEFAULT 'ninguna',
    total_reservas INTEGER DEFAULT 0,
    monto_total NUMERIC DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
    customer_id UUID REFERENCES public.customers(id),
    cliente_nombre TEXT NOT NULL,
    cliente_contacto TEXT NOT NULL,
    cliente_documento TEXT,
    cliente_email TEXT,
    cliente_telefono TEXT,
    fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_fin TIMESTAMP WITH TIME ZONE NOT NULL,
    dias_totales INTEGER,
    tarifa_dia_iva NUMERIC,
    valor_total NUMERIC,
    descuento NUMERIC DEFAULT 0,
    descuento_porcentaje NUMERIC DEFAULT 0,
    price_total NUMERIC,
    estado TEXT NOT NULL DEFAULT 'pending',
    source TEXT,
    notas TEXT,
    payment_status TEXT DEFAULT 'pending',
    payment_reference TEXT,
    payment_date TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID,
    refund_status TEXT,
    refund_reference TEXT,
    refund_date TIMESTAMP WITH TIME ZONE,
    auto_cancel_at TIMESTAMP WITH TIME ZONE,
    contract_id UUID,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_number TEXT NOT NULL UNIQUE,
    reservation_id UUID REFERENCES public.reservations(id),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    customer_name TEXT NOT NULL,
    customer_document TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    total_amount NUMERIC NOT NULL,
    terms_text TEXT NOT NULL,
    terms_accepted BOOLEAN NOT NULL DEFAULT false,
    signature_url TEXT NOT NULL,
    fingerprint_url TEXT,
    pdf_url TEXT,
    status TEXT NOT NULL DEFAULT 'signed',
    is_locked BOOLEAN NOT NULL DEFAULT true,
    signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    signed_by UUID,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    was_offline BOOLEAN NOT NULL DEFAULT false,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.checklist_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.checklist_template_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    label TEXT NOT NULL,
    type TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    required BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.checklists (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES public.checklist_templates(id),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
    rental_id UUID,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    kms_registro INTEGER,
    observaciones_generales TEXT,
    completed_by UUID NOT NULL REFERENCES public.profiles(id),
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.checklist_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    checklist_id UUID NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
    template_item_id UUID NOT NULL REFERENCES public.checklist_template_items(id),
    key TEXT NOT NULL,
    label TEXT NOT NULL,
    estado TEXT,
    observaciones TEXT,
    foto_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.maintenance (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
    tipo TEXT NOT NULL,
    descripcion TEXT,
    fecha TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    costo NUMERIC NOT NULL,
    kms INTEGER,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.maintenance_schedules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
    tipo TEXT NOT NULL,
    interval_km INTEGER,
    interval_days INTEGER,
    last_change_km INTEGER,
    last_change_date TIMESTAMP WITH TIME ZONE,
    next_due_km INTEGER,
    next_due_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tipo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    vehicle_id UUID REFERENCES public.vehicles(id),
    recipients_roles TEXT[] NOT NULL DEFAULT ARRAY['administrador'],
    priority TEXT NOT NULL DEFAULT 'medium',
    estado TEXT DEFAULT 'pendiente',
    meta JSONB,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alerts_maintenance (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
    tipo_alerta TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    fecha_evento DATE NOT NULL,
    estado TEXT NOT NULL DEFAULT 'activa',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT,
    date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ref_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pico_placa_payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
    fecha DATE NOT NULL,
    pagado BOOLEAN NOT NULL DEFAULT false,
    monto NUMERIC,
    notas TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.devolucion_videos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
    reservation_id UUID REFERENCES public.reservations(id),
    checklist_id UUID REFERENCES public.checklists(id),
    google_drive_url TEXT NOT NULL,
    google_drive_file_id TEXT,
    filename TEXT NOT NULL,
    fecha_devolucion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    duracion_segundos INTEGER,
    tamaño_bytes BIGINT,
    uploaded_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.geofence_zones (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.time_entries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    type TEXT NOT NULL,
    method TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    latitude NUMERIC,
    longitude NUMERIC,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT NOT NULL PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_by UUID
);

CREATE TABLE IF NOT EXISTS public.agents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    api_key TEXT NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unread',
    metadata JSONB DEFAULT '{}',
    read_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    action_type TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    description TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================================
-- PART 2: FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
    PERFORM public.log_audit('USER_SIGNUP', 'profiles', NEW.id, NULL, jsonb_build_object('email', NEW.email), 'New user registered');
    RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT role FROM public.user_roles WHERE user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.log_audit(p_action_type TEXT, p_table_name TEXT DEFAULT NULL, p_record_id UUID DEFAULT NULL, p_old_data JSONB DEFAULT NULL, p_new_data JSONB DEFAULT NULL, p_description TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_audit_id UUID;
BEGIN
    INSERT INTO public.audit_log (user_id, action_type, table_name, record_id, old_data, new_data, description)
    VALUES (auth.uid(), p_action_type, p_table_name, p_record_id, p_old_data, p_new_data, p_description)
    RETURNING id INTO v_audit_id;
    RETURN v_audit_id;
END; $$;

CREATE OR REPLACE FUNCTION public.generate_contract_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE next_num INTEGER; year_part TEXT;
BEGIN
    year_part := TO_CHAR(NOW(), 'YYYY');
    SELECT COALESCE(MAX(CAST(SUBSTRING(contract_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_num FROM public.contracts WHERE contract_number LIKE 'CTR-' || year_part || '-%';
    RETURN 'CTR-' || year_part || '-' || LPAD(next_num::TEXT, 5, '0');
END; $$;

CREATE OR REPLACE FUNCTION public.set_contract_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
        NEW.contract_number := generate_contract_number();
    END IF;
    RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.check_reservation_availability(p_vehicle_id UUID, p_fecha_inicio TIMESTAMP WITH TIME ZONE, p_fecha_fin TIMESTAMP WITH TIME ZONE, p_exclude_reservation_id UUID DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM public.reservations
        WHERE vehicle_id = p_vehicle_id AND estado IN ('confirmed', 'pending')
          AND id != COALESCE(p_exclude_reservation_id, '00000000-0000-0000-0000-000000000000'::UUID)
          AND ((p_fecha_inicio >= fecha_inicio AND p_fecha_inicio < fecha_fin)
            OR (p_fecha_fin > fecha_inicio AND p_fecha_fin <= fecha_fin)
            OR (p_fecha_inicio <= fecha_inicio AND p_fecha_fin >= fecha_fin))
    );
END; $$;

CREATE OR REPLACE FUNCTION public.is_within_geofence(p_latitude NUMERIC, p_longitude NUMERIC, p_zone_id UUID DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_distance DECIMAL; v_radius INTEGER;
BEGIN
    IF p_zone_id IS NOT NULL THEN
        SELECT (6371000 * acos(cos(radians(p_latitude)) * cos(radians(latitude)) * cos(radians(longitude) - radians(p_longitude)) + sin(radians(p_latitude)) * sin(radians(latitude)))), radius_meters
        INTO v_distance, v_radius FROM public.geofence_zones WHERE id = p_zone_id AND is_active = true;
        RETURN v_distance <= v_radius;
    END IF;
    RETURN EXISTS (SELECT 1 FROM public.geofence_zones WHERE is_active = true
        AND (6371000 * acos(cos(radians(p_latitude)) * cos(radians(latitude)) * cos(radians(longitude) - radians(p_longitude)) + sin(radians(p_latitude)) * sin(radians(latitude)))) <= radius_meters);
END; $$;

CREATE OR REPLACE FUNCTION public.notify_admins(p_type TEXT, p_title TEXT, p_message TEXT, p_metadata JSONB DEFAULT '{}')
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin_id UUID;
BEGIN
    FOR v_admin_id IN SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('administrador', 'socio_principal')
    LOOP
        INSERT INTO public.notifications (user_id, type, title, message, metadata) VALUES (v_admin_id, p_type, p_title, p_message, p_metadata);
    END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.check_maintenance_alerts()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_vehicle RECORD;
BEGIN
    FOR v_vehicle IN SELECT id, placa, marca, modelo, fecha_soat FROM public.vehicles WHERE fecha_soat IS NOT NULL AND fecha_soat <= CURRENT_DATE + INTERVAL '7 days' AND fecha_soat > CURRENT_DATE
    LOOP
        INSERT INTO public.alerts_maintenance (vehicle_id, tipo_alerta, descripcion, fecha_evento, estado)
        VALUES (v_vehicle.id, 'SOAT próximo a vencer', format('El SOAT del vehículo %s %s (placa %s) vence el %s', v_vehicle.marca, v_vehicle.modelo, v_vehicle.placa, to_char(v_vehicle.fecha_soat, 'DD/MM/YYYY')), v_vehicle.fecha_soat, 'activa')
        ON CONFLICT DO NOTHING;
    END LOOP;
    FOR v_vehicle IN SELECT id, placa, marca, modelo, fecha_tecnomecanica FROM public.vehicles WHERE fecha_tecnomecanica IS NOT NULL AND fecha_tecnomecanica <= CURRENT_DATE + INTERVAL '7 days' AND fecha_tecnomecanica > CURRENT_DATE
    LOOP
        INSERT INTO public.alerts_maintenance (vehicle_id, tipo_alerta, descripcion, fecha_evento, estado)
        VALUES (v_vehicle.id, 'Tecnomecánica próxima a vencer', format('La tecnomecánica del vehículo %s %s (placa %s) vence el %s', v_vehicle.marca, v_vehicle.modelo, v_vehicle.placa, to_char(v_vehicle.fecha_tecnomecanica, 'DD/MM/YYYY')), v_vehicle.fecha_tecnomecanica, 'activa')
        ON CONFLICT DO NOTHING;
    END LOOP;
    FOR v_vehicle IN SELECT id, placa, marca, modelo, fecha_impuestos FROM public.vehicles WHERE fecha_impuestos IS NOT NULL AND fecha_impuestos <= CURRENT_DATE + INTERVAL '7 days' AND fecha_impuestos > CURRENT_DATE
    LOOP
        INSERT INTO public.alerts_maintenance (vehicle_id, tipo_alerta, descripcion, fecha_evento, estado)
        VALUES (v_vehicle.id, 'Impuestos próximos a vencer', format('Los impuestos del vehículo %s %s (placa %s) vencen el %s', v_vehicle.marca, v_vehicle.modelo, v_vehicle.placa, to_char(v_vehicle.fecha_impuestos, 'DD/MM/YYYY')), v_vehicle.fecha_impuestos, 'activa')
        ON CONFLICT DO NOTHING;
    END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.update_alerts_estado()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN UPDATE public.alerts_maintenance SET estado = 'vencida' WHERE estado = 'activa' AND fecha_evento < CURRENT_DATE; END; $$;

CREATE OR REPLACE FUNCTION public.resolve_alert(p_alert_id UUID, p_descripcion TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    UPDATE public.alerts SET is_resolved = true, resolved_at = now(), resolved_by = auth.uid() WHERE id = p_alert_id;
    PERFORM public.log_audit('ALERT_RESOLVED', 'alerts', p_alert_id, NULL, jsonb_build_object('alert_id', p_alert_id), COALESCE(p_descripcion, 'Alerta marcada como resuelta'));
END; $$;

CREATE OR REPLACE FUNCTION public.mark_maintenance_alert_resolved(p_alert_id UUID, p_descripcion TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    UPDATE public.alerts_maintenance SET estado = 'resuelta', updated_at = now() WHERE id = p_alert_id;
    PERFORM public.log_audit('MAINTENANCE_ALERT_RESOLVED', 'alerts_maintenance', p_alert_id, NULL, jsonb_build_object('alert_id', p_alert_id), COALESCE(p_descripcion, 'Alerta de mantenimiento marcada como resuelta'));
END; $$;

CREATE OR REPLACE FUNCTION public.generate_km_alerts()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_schedule RECORD; v_alert_exists BOOLEAN;
BEGIN
    FOR v_schedule IN SELECT ms.*, v.placa, v.kilometraje_actual FROM public.maintenance_schedules ms JOIN public.vehicles v ON v.id = ms.vehicle_id WHERE ms.is_active = true AND ms.interval_km IS NOT NULL AND ms.last_change_km IS NOT NULL
    LOOP
        UPDATE public.maintenance_schedules SET next_due_km = v_schedule.last_change_km + v_schedule.interval_km WHERE id = v_schedule.id;
        IF v_schedule.kilometraje_actual >= (v_schedule.last_change_km + v_schedule.interval_km - 500) THEN
            SELECT EXISTS (SELECT 1 FROM public.alerts WHERE vehicle_id = v_schedule.vehicle_id AND tipo = 'km_based' AND is_resolved = false AND meta->>'schedule_id' = v_schedule.id::TEXT) INTO v_alert_exists;
            IF NOT v_alert_exists THEN
                INSERT INTO public.alerts (tipo, mensaje, vehicle_id, recipients_roles, priority, meta) VALUES ('km_based', format('Mantenimiento %s próximo para %s (Actual: %s km, Debido: %s km)', v_schedule.tipo, v_schedule.placa, v_schedule.kilometraje_actual, v_schedule.last_change_km + v_schedule.interval_km), v_schedule.vehicle_id, ARRAY['administrador', 'operativo'], CASE WHEN v_schedule.kilometraje_actual >= (v_schedule.last_change_km + v_schedule.interval_km) THEN 'critical' ELSE 'high' END, jsonb_build_object('schedule_id', v_schedule.id, 'tipo', v_schedule.tipo, 'current_km', v_schedule.kilometraje_actual, 'due_km', v_schedule.last_change_km + v_schedule.interval_km));
            END IF;
        END IF;
    END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.generate_date_alerts()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_schedule RECORD; v_alert_exists BOOLEAN;
BEGIN
    FOR v_schedule IN SELECT ms.*, v.placa FROM public.maintenance_schedules ms JOIN public.vehicles v ON v.id = ms.vehicle_id WHERE ms.is_active = true AND ms.interval_days IS NOT NULL AND ms.last_change_date IS NOT NULL
    LOOP
        UPDATE public.maintenance_schedules SET next_due_date = v_schedule.last_change_date + (v_schedule.interval_days || ' days')::INTERVAL WHERE id = v_schedule.id;
        IF now() >= (v_schedule.last_change_date + (v_schedule.interval_days || ' days')::INTERVAL - INTERVAL '7 days') THEN
            SELECT EXISTS (SELECT 1 FROM public.alerts WHERE vehicle_id = v_schedule.vehicle_id AND tipo = 'maintenance_due' AND is_resolved = false AND meta->>'schedule_id' = v_schedule.id::TEXT) INTO v_alert_exists;
            IF NOT v_alert_exists THEN
                INSERT INTO public.alerts (tipo, mensaje, vehicle_id, recipients_roles, priority, meta) VALUES ('maintenance_due', format('Mantenimiento %s próximo para %s (Vence: %s)', v_schedule.tipo, v_schedule.placa, (v_schedule.last_change_date + (v_schedule.interval_days || ' days')::INTERVAL)::DATE), v_schedule.vehicle_id, ARRAY['administrador', 'operativo'], CASE WHEN now() >= (v_schedule.last_change_date + (v_schedule.interval_days || ' days')::INTERVAL) THEN 'critical' ELSE 'high' END, jsonb_build_object('schedule_id', v_schedule.id, 'tipo', v_schedule.tipo, 'due_date', v_schedule.last_change_date + (v_schedule.interval_days || ' days')::INTERVAL));
            END IF;
        END IF;
    END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.update_customer_stats()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE public.customers SET total_reservas = (SELECT COUNT(*) FROM public.reservations WHERE customer_id = NEW.customer_id AND estado IN ('confirmed', 'completed')), monto_total = (SELECT COALESCE(SUM(price_total), 0) FROM public.reservations WHERE customer_id = NEW.customer_id AND estado = 'completed') WHERE id = NEW.customer_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.customers SET total_reservas = (SELECT COUNT(*) FROM public.reservations WHERE customer_id = OLD.customer_id AND estado IN ('confirmed', 'completed')), monto_total = (SELECT COALESCE(SUM(price_total), 0) FROM public.reservations WHERE customer_id = OLD.customer_id AND estado = 'completed') WHERE id = OLD.customer_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END; $$;

CREATE OR REPLACE FUNCTION public.create_finance_item_for_maintenance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN INSERT INTO public.finance_items (vehicle_id, type, amount, date, ref_id, description) VALUES (NEW.vehicle_id, 'gasto', NEW.costo, NEW.fecha, NEW.id, 'Mantenimiento: ' || NEW.tipo); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.create_finance_item_for_reservation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.estado = 'completed' AND OLD.estado != 'completed' AND NEW.price_total IS NOT NULL THEN
        INSERT INTO public.finance_items (vehicle_id, type, amount, date, ref_id, description) VALUES (NEW.vehicle_id, 'ingreso', NEW.price_total, NEW.updated_at, NEW.id, 'Reserva: ' || NEW.cliente_nombre);
    END IF;
    RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.prevent_contract_modification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN IF OLD.is_locked = true THEN RAISE EXCEPTION 'Cannot modify a locked contract. Contract ID: %', OLD.id; END IF; RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.log_contract_signing()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    PERFORM public.log_audit('CONTRACT_SIGNED', 'contracts', NEW.id, NULL, jsonb_build_object('contract_number', NEW.contract_number, 'customer_name', NEW.customer_name, 'vehicle_id', NEW.vehicle_id, 'total_amount', NEW.total_amount, 'was_offline', NEW.was_offline), 'Contract signed: ' || NEW.contract_number);
    RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.update_reservation_on_contract_create()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN IF NEW.reservation_id IS NOT NULL THEN UPDATE public.reservations SET estado = 'confirmed', updated_at = now() WHERE id = NEW.reservation_id AND estado = 'pending'; END IF; RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_reservation_on_contract_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN IF OLD.reservation_id IS NOT NULL THEN UPDATE public.reservations SET estado = 'pending', updated_at = now() WHERE id = OLD.reservation_id AND estado = 'confirmed'; END IF; RETURN OLD; END; $$;

CREATE OR REPLACE FUNCTION public.update_vehicle_estado_on_reservation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN IF NEW.estado IN ('confirmed', 'pending') THEN UPDATE public.vehicles SET estado = 'alquilado', updated_at = now() WHERE id = NEW.vehicle_id; END IF; RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_vehicle_estado_on_reservation_end()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.estado IN ('completed', 'cancelled') AND OLD.estado NOT IN ('completed', 'cancelled') THEN UPDATE public.vehicles SET estado = 'disponible', updated_at = now() WHERE id = NEW.vehicle_id; END IF;
    IF NEW.estado IN ('confirmed', 'pending') AND OLD.estado IN ('completed', 'cancelled') THEN UPDATE public.vehicles SET estado = 'alquilado', updated_at = now() WHERE id = NEW.vehicle_id; END IF;
    RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.update_vehicle_estado_on_maintenance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN UPDATE public.vehicles SET estado = 'mantenimiento', updated_at = now() WHERE id = NEW.vehicle_id; RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_vehicle_on_maintenance_complete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.kms IS NOT NULL THEN UPDATE public.vehicles SET kilometraje_actual = NEW.kms, updated_at = now() WHERE id = NEW.vehicle_id; END IF;
    IF NEW.tipo ILIKE '%soat%' THEN UPDATE public.vehicles SET fecha_soat = NEW.fecha + INTERVAL '1 year', updated_at = now() WHERE id = NEW.vehicle_id; END IF;
    IF NEW.tipo ILIKE '%tecnomecánica%' OR NEW.tipo ILIKE '%tecnomecanica%' THEN UPDATE public.vehicles SET fecha_tecnomecanica = NEW.fecha + INTERVAL '1 year', updated_at = now() WHERE id = NEW.vehicle_id; END IF;
    IF NEW.tipo ILIKE '%impuesto%' THEN UPDATE public.vehicles SET fecha_impuestos = NEW.fecha + INTERVAL '1 year', updated_at = now() WHERE id = NEW.vehicle_id; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.reservations WHERE vehicle_id = NEW.vehicle_id AND estado IN ('confirmed', 'pending') AND fecha_fin >= now()) THEN UPDATE public.vehicles SET estado = 'disponible', updated_at = now() WHERE id = NEW.vehicle_id; END IF;
    RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_reservation_expired()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.estado = 'cancelled' AND OLD.estado = 'pending_no_payment' THEN PERFORM public.notify_admins('reserva_expirada', 'Reserva expirada automáticamente', format('La reserva %s ha expirado por falta de pago', NEW.id), jsonb_build_object('reservation_id', NEW.id, 'vehicle_id', NEW.vehicle_id, 'cliente_nombre', NEW.cliente_nombre)); END IF;
    RETURN NEW;
END; $$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ============================================================
-- PART 3: TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicles_updated_at ON public.vehicles;
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_reservations_updated_at ON public.reservations;
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_contracts_updated_at ON public.contracts;
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_checklist_templates_updated_at ON public.checklist_templates;
CREATE TRIGGER update_checklist_templates_updated_at BEFORE UPDATE ON public.checklist_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_maintenance_updated_at ON public.maintenance;
CREATE TRIGGER update_maintenance_updated_at BEFORE UPDATE ON public.maintenance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_maintenance_schedules_updated_at ON public.maintenance_schedules;
CREATE TRIGGER update_maintenance_schedules_updated_at BEFORE UPDATE ON public.maintenance_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_alerts_maintenance_updated_at ON public.alerts_maintenance;
CREATE TRIGGER update_alerts_maintenance_updated_at BEFORE UPDATE ON public.alerts_maintenance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pico_placa_payments_updated_at ON public.pico_placa_payments;
CREATE TRIGGER update_pico_placa_payments_updated_at BEFORE UPDATE ON public.pico_placa_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_devolucion_videos_updated_at ON public.devolucion_videos;
CREATE TRIGGER update_devolucion_videos_updated_at BEFORE UPDATE ON public.devolucion_videos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_geofence_zones_updated_at ON public.geofence_zones;
CREATE TRIGGER update_geofence_zones_updated_at BEFORE UPDATE ON public.geofence_zones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_agents_updated_at ON public.agents;
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_contract_number_trigger ON public.contracts;
CREATE TRIGGER set_contract_number_trigger BEFORE INSERT ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.set_contract_number();

DROP TRIGGER IF EXISTS prevent_contract_modification_trigger ON public.contracts;
CREATE TRIGGER prevent_contract_modification_trigger BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.prevent_contract_modification();

DROP TRIGGER IF EXISTS log_contract_signing_trigger ON public.contracts;
CREATE TRIGGER log_contract_signing_trigger AFTER INSERT ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.log_contract_signing();

DROP TRIGGER IF EXISTS update_reservation_on_contract_create_trigger ON public.contracts;
CREATE TRIGGER update_reservation_on_contract_create_trigger AFTER INSERT ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_reservation_on_contract_create();

DROP TRIGGER IF EXISTS update_reservation_on_contract_delete_trigger ON public.contracts;
CREATE TRIGGER update_reservation_on_contract_delete_trigger BEFORE DELETE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_reservation_on_contract_delete();

DROP TRIGGER IF EXISTS update_vehicle_estado_on_reservation_trigger ON public.reservations;
CREATE TRIGGER update_vehicle_estado_on_reservation_trigger AFTER INSERT ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.update_vehicle_estado_on_reservation();

DROP TRIGGER IF EXISTS update_vehicle_estado_on_reservation_end_trigger ON public.reservations;
CREATE TRIGGER update_vehicle_estado_on_reservation_end_trigger AFTER UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.update_vehicle_estado_on_reservation_end();

DROP TRIGGER IF EXISTS update_customer_stats_trigger ON public.reservations;
CREATE TRIGGER update_customer_stats_trigger AFTER INSERT OR UPDATE OR DELETE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.update_customer_stats();

DROP TRIGGER IF EXISTS create_finance_item_for_reservation_trigger ON public.reservations;
CREATE TRIGGER create_finance_item_for_reservation_trigger AFTER UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.create_finance_item_for_reservation();

DROP TRIGGER IF EXISTS notify_reservation_expired_trigger ON public.reservations;
CREATE TRIGGER notify_reservation_expired_trigger AFTER UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.notify_reservation_expired();

DROP TRIGGER IF EXISTS update_vehicle_estado_on_maintenance_trigger ON public.maintenance;
CREATE TRIGGER update_vehicle_estado_on_maintenance_trigger AFTER INSERT ON public.maintenance FOR EACH ROW EXECUTE FUNCTION public.update_vehicle_estado_on_maintenance();

DROP TRIGGER IF EXISTS update_vehicle_on_maintenance_complete_trigger ON public.maintenance;
CREATE TRIGGER update_vehicle_on_maintenance_complete_trigger AFTER UPDATE ON public.maintenance FOR EACH ROW WHEN (NEW.completed = true AND OLD.completed = false) EXECUTE FUNCTION public.update_vehicle_on_maintenance_complete();

DROP TRIGGER IF EXISTS create_finance_item_for_maintenance_trigger ON public.maintenance;
CREATE TRIGGER create_finance_item_for_maintenance_trigger AFTER INSERT ON public.maintenance FOR EACH ROW EXECUTE FUNCTION public.create_finance_item_for_maintenance();

-- ============================================================
-- PART 4: VIEWS
-- ============================================================

CREATE OR REPLACE VIEW public.customer_stats AS
SELECT c.id, c.nombres, c.primer_apellido, c.segundo_apellido, c.cedula_pasaporte, c.email, c.celular, c.estado, c.total_reservas, c.monto_total, c.created_at,
    (SELECT COUNT(*) FROM public.reservations r WHERE r.customer_id = c.id AND r.estado IN ('confirmed', 'pending')) AS reservas_activas,
    (SELECT COUNT(*) FROM public.reservations r WHERE r.customer_id = c.id AND r.estado = 'completed') AS reservas_completadas,
    (SELECT COUNT(*) FROM public.contracts ct WHERE ct.customer_id = c.id) AS contratos_firmados,
    (SELECT MAX(r.created_at) FROM public.reservations r WHERE r.customer_id = c.id) AS ultima_reserva
FROM public.customers c;

CREATE OR REPLACE VIEW public.alerts_maintenance_view AS
SELECT am.id, am.vehicle_id, am.tipo_alerta, am.descripcion, am.fecha_evento, am.estado, am.created_at, am.updated_at, (am.fecha_evento - CURRENT_DATE) AS dias_restantes
FROM public.alerts_maintenance am;

-- ============================================================
-- PART 5: RLS POLICIES
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pico_placa_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devolucion_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofence_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users view own profile only" ON public.profiles;
CREATE POLICY "Users view own profile only" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User roles policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Socios and admins can view all roles" ON public.user_roles;
CREATE POLICY "Socios and admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));
DROP POLICY IF EXISTS "Only socios can manage roles" ON public.user_roles;
CREATE POLICY "Only socios can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'socio_principal'::app_role));

-- Vehicles policies
DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON public.vehicles;
CREATE POLICY "Authenticated users can view vehicles" ON public.vehicles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins and socios can manage vehicles" ON public.vehicles;
CREATE POLICY "Admins and socios can manage vehicles" ON public.vehicles FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));

-- Customers policies
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
CREATE POLICY "Authenticated users can view customers" ON public.customers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins and comercial can create customers" ON public.customers;
CREATE POLICY "Admins and comercial can create customers" ON public.customers FOR INSERT WITH CHECK (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role, 'comercial'::app_role, 'operativo'::app_role]));
DROP POLICY IF EXISTS "Admins and comercial can update customers" ON public.customers;
CREATE POLICY "Admins and comercial can update customers" ON public.customers FOR UPDATE USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role, 'comercial'::app_role]));
DROP POLICY IF EXISTS "Admins can delete customers" ON public.customers;
CREATE POLICY "Admins can delete customers" ON public.customers FOR DELETE USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));

-- Reservations policies
DROP POLICY IF EXISTS "Users view own reservations" ON public.reservations;
CREATE POLICY "Users view own reservations" ON public.reservations FOR SELECT USING (auth.uid() = created_by);
DROP POLICY IF EXISTS "Admins view all reservations" ON public.reservations;
CREATE POLICY "Admins view all reservations" ON public.reservations FOR SELECT USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));
DROP POLICY IF EXISTS "Comercial and operativo can create reservations" ON public.reservations;
CREATE POLICY "Comercial and operativo can create reservations" ON public.reservations FOR INSERT WITH CHECK (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role, 'comercial'::app_role, 'operativo'::app_role]));
DROP POLICY IF EXISTS "Admins and comercial can update reservations" ON public.reservations;
CREATE POLICY "Admins and comercial can update reservations" ON public.reservations FOR UPDATE USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role, 'comercial'::app_role]));
DROP POLICY IF EXISTS "Admins can delete reservations" ON public.reservations;
CREATE POLICY "Admins can delete reservations" ON public.reservations FOR DELETE USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));

-- Contracts policies
DROP POLICY IF EXISTS "Authenticated users can view contracts" ON public.contracts;
CREATE POLICY "Authenticated users can view contracts" ON public.contracts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authorized roles can create contracts" ON public.contracts;
CREATE POLICY "Authorized roles can create contracts" ON public.contracts FOR INSERT WITH CHECK (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role, 'comercial'::app_role, 'operativo'::app_role]));
DROP POLICY IF EXISTS "Only admins can update unlocked contracts" ON public.contracts;
CREATE POLICY "Only admins can update unlocked contracts" ON public.contracts FOR UPDATE USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]) AND is_locked = false);
DROP POLICY IF EXISTS "Admins can delete contracts" ON public.contracts;
CREATE POLICY "Admins can delete contracts" ON public.contracts FOR DELETE USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));

-- Checklist policies
DROP POLICY IF EXISTS "Authenticated users can view templates" ON public.checklist_templates;
CREATE POLICY "Authenticated users can view templates" ON public.checklist_templates FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins and socios can manage templates" ON public.checklist_templates;
CREATE POLICY "Admins and socios can manage templates" ON public.checklist_templates FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));
DROP POLICY IF EXISTS "Authenticated users can view template items" ON public.checklist_template_items;
CREATE POLICY "Authenticated users can view template items" ON public.checklist_template_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins and socios can manage template items" ON public.checklist_template_items;
CREATE POLICY "Admins and socios can manage template items" ON public.checklist_template_items FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));
DROP POLICY IF EXISTS "Authenticated users can view checklists" ON public.checklists;
CREATE POLICY "Authenticated users can view checklists" ON public.checklists FOR SELECT USING (true);
DROP POLICY IF EXISTS "Comercial and operativo can create checklists" ON public.checklists;
CREATE POLICY "Comercial and operativo can create checklists" ON public.checklists FOR INSERT WITH CHECK (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role, 'comercial'::app_role, 'operativo'::app_role]));
DROP POLICY IF EXISTS "Admins can update checklists" ON public.checklists;
CREATE POLICY "Admins can update checklists" ON public.checklists FOR UPDATE USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));
DROP POLICY IF EXISTS "Authenticated users can view checklist items" ON public.checklist_items;
CREATE POLICY "Authenticated users can view checklist items" ON public.checklist_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can manage their checklist items" ON public.checklist_items;
CREATE POLICY "Users can manage their checklist items" ON public.checklist_items FOR ALL USING (EXISTS (SELECT 1 FROM public.checklists WHERE checklists.id = checklist_items.checklist_id AND checklists.completed_by = auth.uid()));

-- Maintenance policies
DROP POLICY IF EXISTS "Authenticated users can view maintenance" ON public.maintenance;
CREATE POLICY "Authenticated users can view maintenance" ON public.maintenance FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins and operativo can create maintenance" ON public.maintenance;
CREATE POLICY "Admins and operativo can create maintenance" ON public.maintenance FOR INSERT WITH CHECK (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role, 'operativo'::app_role]));
DROP POLICY IF EXISTS "Admins can update maintenance" ON public.maintenance;
CREATE POLICY "Admins can update maintenance" ON public.maintenance FOR UPDATE USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));
DROP POLICY IF EXISTS "Admins can delete maintenance" ON public.maintenance;
CREATE POLICY "Admins can delete maintenance" ON public.maintenance FOR DELETE USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));
DROP POLICY IF EXISTS "Authenticated users can view maintenance schedules" ON public.maintenance_schedules;
CREATE POLICY "Authenticated users can view maintenance schedules" ON public.maintenance_schedules FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage maintenance schedules" ON public.maintenance_schedules;
CREATE POLICY "Admins can manage maintenance schedules" ON public.maintenance_schedules FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));

-- Alerts policies
DROP POLICY IF EXISTS "Authenticated users can view alerts" ON public.alerts;
CREATE POLICY "Authenticated users can view alerts" ON public.alerts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can create alerts" ON public.alerts;
CREATE POLICY "Authenticated users can create alerts" ON public.alerts FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can update alerts" ON public.alerts;
CREATE POLICY "Admins can update alerts" ON public.alerts FOR UPDATE USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));
DROP POLICY IF EXISTS "Admins can delete alerts" ON public.alerts;
CREATE POLICY "Admins can delete alerts" ON public.alerts FOR DELETE USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));
DROP POLICY IF EXISTS "Authenticated users can view maintenance alerts" ON public.alerts_maintenance;
CREATE POLICY "Authenticated users can view maintenance alerts" ON public.alerts_maintenance FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins and operativo can create alerts" ON public.alerts_maintenance;
CREATE POLICY "Admins and operativo can create alerts" ON public.alerts_maintenance FOR INSERT WITH CHECK (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role, 'operativo'::app_role]));
DROP POLICY IF EXISTS "Admins and operativo can update alerts" ON public.alerts_maintenance;
CREATE POLICY "Admins and operativo can update alerts" ON public.alerts_maintenance FOR UPDATE USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role, 'operativo'::app_role]));
DROP POLICY IF EXISTS "Admins can delete alerts" ON public.alerts_maintenance;
CREATE POLICY "Admins can delete alerts" ON public.alerts_maintenance FOR DELETE USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));

-- Finance policies
DROP POLICY IF EXISTS "Only authorized roles view financial data" ON public.finance_items;
CREATE POLICY "Only authorized roles view financial data" ON public.finance_items FOR SELECT USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));
DROP POLICY IF EXISTS "Admins can manage finance items" ON public.finance_items;
CREATE POLICY "Admins can manage finance items" ON public.finance_items FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));

-- Other tables policies
DROP POLICY IF EXISTS "Authenticated users can view pico placa payments" ON public.pico_placa_payments;
CREATE POLICY "Authenticated users can view pico placa payments" ON public.pico_placa_payments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins and operativo can manage pico placa payments" ON public.pico_placa_payments;
CREATE POLICY "Admins and operativo can manage pico placa payments" ON public.pico_placa_payments FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role, 'operativo'::app_role]));
DROP POLICY IF EXISTS "Authenticated users can view devolucion videos" ON public.devolucion_videos;
CREATE POLICY "Authenticated users can view devolucion videos" ON public.devolucion_videos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins and operativo can manage devolucion videos" ON public.devolucion_videos;
CREATE POLICY "Admins and operativo can manage devolucion videos" ON public.devolucion_videos FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role, 'operativo'::app_role, 'comercial'::app_role]));
DROP POLICY IF EXISTS "Authenticated users view geofence zones" ON public.geofence_zones;
CREATE POLICY "Authenticated users view geofence zones" ON public.geofence_zones FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins and socios can manage geofence zones" ON public.geofence_zones;
CREATE POLICY "Admins and socios can manage geofence zones" ON public.geofence_zones FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));
DROP POLICY IF EXISTS "Users can view their own time entries" ON public.time_entries;
CREATE POLICY "Users can view their own time entries" ON public.time_entries FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins and socios can view all time entries" ON public.time_entries;
CREATE POLICY "Admins and socios can view all time entries" ON public.time_entries FOR SELECT USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));
DROP POLICY IF EXISTS "Users can insert their own time entries" ON public.time_entries;
CREATE POLICY "Users can insert their own time entries" ON public.time_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage all time entries" ON public.time_entries;
CREATE POLICY "Admins can manage all time entries" ON public.time_entries FOR ALL USING (public.has_role(auth.uid(), 'administrador'::app_role));
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.settings;
CREATE POLICY "Authenticated users can view settings" ON public.settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage settings" ON public.settings;
CREATE POLICY "Authenticated users can manage settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Admins and socios can view agents" ON public.agents;
CREATE POLICY "Admins and socios can view agents" ON public.agents FOR SELECT USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));
DROP POLICY IF EXISTS "Socios and admins can manage agents" ON public.agents;
CREATE POLICY "Socios and admins can manage agents" ON public.agents FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;
CREATE POLICY "Admins can view all notifications" ON public.notifications FOR SELECT USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Socios can view all audit logs" ON public.audit_log;
CREATE POLICY "Socios can view all audit logs" ON public.audit_log FOR SELECT USING (public.has_role(auth.uid(), 'socio_principal'::app_role));
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_log;
CREATE POLICY "Admins can view audit logs" ON public.audit_log FOR SELECT USING (public.has_role(auth.uid(), 'administrador'::app_role));
DROP POLICY IF EXISTS "All authenticated users can insert audit logs" ON public.audit_log;
CREATE POLICY "All authenticated users can insert audit logs" ON public.audit_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- PART 6: INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_vehicles_placa ON public.vehicles(placa);
CREATE INDEX IF NOT EXISTS idx_vehicles_estado ON public.vehicles(estado);
CREATE INDEX IF NOT EXISTS idx_vehicles_marca_modelo ON public.vehicles(marca, modelo);
CREATE INDEX IF NOT EXISTS idx_customers_cedula ON public.customers(cedula_pasaporte);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_celular ON public.customers(celular);
CREATE INDEX IF NOT EXISTS idx_customers_estado ON public.customers(estado);
CREATE INDEX IF NOT EXISTS idx_reservations_vehicle_id ON public.reservations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_reservations_customer_id ON public.reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_estado ON public.reservations(estado);
CREATE INDEX IF NOT EXISTS idx_reservations_fecha_inicio ON public.reservations(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_reservations_fecha_fin ON public.reservations(fecha_fin);
CREATE INDEX IF NOT EXISTS idx_reservations_fechas ON public.reservations(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_reservations_vehicle_fechas ON public.reservations(vehicle_id, fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_reservations_created_by ON public.reservations(created_by);
CREATE INDEX IF NOT EXISTS idx_reservations_payment_status ON public.reservations(payment_status);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_number ON public.contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_contracts_vehicle_id ON public.contracts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON public.contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_reservation_id ON public.contracts(reservation_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_signed_at ON public.contracts(signed_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_id ON public.maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_fecha ON public.maintenance(fecha);
CREATE INDEX IF NOT EXISTS idx_maintenance_tipo ON public.maintenance(tipo);
CREATE INDEX IF NOT EXISTS idx_maintenance_completed ON public.maintenance(completed);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_vehicle_id ON public.maintenance_schedules(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_tipo ON public.maintenance_schedules(tipo);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_is_active ON public.maintenance_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_next_due_date ON public.maintenance_schedules(next_due_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_next_due_km ON public.maintenance_schedules(next_due_km);
CREATE INDEX IF NOT EXISTS idx_alerts_vehicle_id ON public.alerts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_alerts_tipo ON public.alerts(tipo);
CREATE INDEX IF NOT EXISTS idx_alerts_is_resolved ON public.alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_alerts_priority ON public.alerts(priority);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_meta ON public.alerts USING GIN(meta);
CREATE INDEX IF NOT EXISTS idx_alerts_maintenance_vehicle_id ON public.alerts_maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_alerts_maintenance_estado ON public.alerts_maintenance(estado);
CREATE INDEX IF NOT EXISTS idx_alerts_maintenance_fecha_evento ON public.alerts_maintenance(fecha_evento);
CREATE INDEX IF NOT EXISTS idx_alerts_maintenance_tipo_alerta ON public.alerts_maintenance(tipo_alerta);
CREATE INDEX IF NOT EXISTS idx_finance_items_vehicle_id ON public.finance_items(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_finance_items_type ON public.finance_items(type);
CREATE INDEX IF NOT EXISTS idx_finance_items_date ON public.finance_items(date);
CREATE INDEX IF NOT EXISTS idx_finance_items_ref_id ON public.finance_items(ref_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_checklists_vehicle_id ON public.checklists(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_checklists_template_id ON public.checklists(template_id);
CREATE INDEX IF NOT EXISTS idx_checklists_completed_by ON public.checklists(completed_by);
CREATE INDEX IF NOT EXISTS idx_checklists_type ON public.checklists(type);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON public.checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_template_item_id ON public.checklist_items(template_item_id);
CREATE INDEX IF NOT EXISTS idx_checklist_template_items_template_id ON public.checklist_template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_timestamp ON public.time_entries(timestamp);
CREATE INDEX IF NOT EXISTS idx_time_entries_type ON public.time_entries(type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action_type ON public.audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON public.audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_geofence_zones_is_active ON public.geofence_zones(is_active);
CREATE INDEX IF NOT EXISTS idx_agents_api_key ON public.agents(api_key);
CREATE INDEX IF NOT EXISTS idx_agents_active ON public.agents(active);
CREATE INDEX IF NOT EXISTS idx_pico_placa_payments_vehicle_id ON public.pico_placa_payments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_pico_placa_payments_fecha ON public.pico_placa_payments(fecha);
CREATE INDEX IF NOT EXISTS idx_pico_placa_payments_pagado ON public.pico_placa_payments(pagado);
CREATE INDEX IF NOT EXISTS idx_devolucion_videos_vehicle_id ON public.devolucion_videos(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_devolucion_videos_reservation_id ON public.devolucion_videos(reservation_id);
CREATE INDEX IF NOT EXISTS idx_devolucion_videos_checklist_id ON public.devolucion_videos(checklist_id);

-- ============================================================
-- PART 7: SEED DATA
-- ============================================================

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

-- Auth trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- END OF SCHEMA EXPORT
-- ============================================================
-- 
-- SUMMARY:
-- - 22 Tables
-- - 25+ Functions
-- - 40+ Triggers
-- - 2 Views
-- - 60+ RLS Policies
-- - 60+ Indexes
-- 
-- TO CREATE FIRST ADMIN:
-- INSERT INTO public.user_roles (id, user_id, role, assigned_at)
-- VALUES (gen_random_uuid(), '<USER_UUID>', 'socio_principal', now());
-- ============================================================
