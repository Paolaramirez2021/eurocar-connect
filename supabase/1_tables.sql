-- ============================================================
-- EUROCAR RENTAL - DATABASE SCHEMA
-- File: 1_tables.sql
-- Description: Types and Tables (execute first)
-- ============================================================

-- ============================================================
-- 1. CUSTOM TYPES (ENUMS)
-- ============================================================

DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('socio_principal', 'administrador', 'comercial', 'operativo');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. TABLES
-- ============================================================

-- Profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    cedula TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate from profiles for security)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by UUID,
    UNIQUE (user_id, role)
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    placa TEXT NOT NULL UNIQUE,
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    año INTEGER NOT NULL,
    color TEXT,
    estado TEXT NOT NULL DEFAULT 'disponible',
    tipo_caja TEXT,
    combustible TEXT,
    capacidad_pasajeros INTEGER,
    cilindraje INTEGER,
    equipamiento TEXT,
    observaciones TEXT,
    tarifa_dia_iva NUMERIC,
    kilometraje_actual INTEGER NOT NULL DEFAULT 0,
    kilometraje_dia INTEGER,
    kilometraje_proximo_mantenimiento INTEGER,
    fecha_soat DATE,
    fecha_tecnomecanica DATE,
    fecha_impuestos DATE,
    ultimo_cambio_aceite_km INTEGER,
    ultimo_cambio_llantas_km INTEGER,
    ultimo_cambio_pastillas_km INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customers table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primer_apellido TEXT NOT NULL,
    segundo_apellido TEXT,
    nombres TEXT NOT NULL,
    cedula_pasaporte TEXT NOT NULL UNIQUE,
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reservations table
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    cliente_nombre TEXT NOT NULL,
    cliente_contacto TEXT NOT NULL,
    cliente_documento TEXT,
    cliente_email TEXT,
    cliente_telefono TEXT,
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin TIMESTAMPTZ NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pending',
    source TEXT,
    notas TEXT,
    dias_totales INTEGER,
    tarifa_dia_iva NUMERIC,
    valor_total NUMERIC,
    descuento NUMERIC DEFAULT 0,
    descuento_porcentaje NUMERIC DEFAULT 0,
    price_total NUMERIC,
    payment_status TEXT DEFAULT 'pending',
    payment_reference TEXT,
    payment_date TIMESTAMPTZ,
    auto_cancel_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID,
    refund_status TEXT,
    refund_reference TEXT,
    refund_date TIMESTAMPTZ,
    contract_id UUID,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contracts table
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_number TEXT NOT NULL UNIQUE,
    reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    customer_name TEXT NOT NULL,
    customer_document TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    total_amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'signed',
    terms_text TEXT NOT NULL,
    terms_accepted BOOLEAN NOT NULL DEFAULT false,
    signature_url TEXT NOT NULL,
    fingerprint_url TEXT,
    pdf_url TEXT,
    signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    signed_by UUID,
    ip_address TEXT,
    user_agent TEXT,
    is_locked BOOLEAN NOT NULL DEFAULT true,
    was_offline BOOLEAN NOT NULL DEFAULT false,
    synced_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Checklist templates table
CREATE TABLE IF NOT EXISTS public.checklist_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Checklist template items table
CREATE TABLE IF NOT EXISTS public.checklist_template_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    label TEXT NOT NULL,
    type TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    required BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Checklists table (completed checklists)
CREATE TABLE IF NOT EXISTS public.checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.checklist_templates(id),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
    rental_id UUID,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    completed_by UUID NOT NULL REFERENCES public.profiles(id),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    kms_registro INTEGER,
    observaciones_generales TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Checklist items table (completed items)
CREATE TABLE IF NOT EXISTS public.checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
    template_item_id UUID NOT NULL REFERENCES public.checklist_template_items(id),
    key TEXT NOT NULL,
    label TEXT NOT NULL,
    estado TEXT,
    observaciones TEXT,
    foto_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Maintenance table
CREATE TABLE IF NOT EXISTS public.maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    descripcion TEXT,
    fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
    costo NUMERIC NOT NULL,
    kms INTEGER,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Maintenance schedules table
CREATE TABLE IF NOT EXISTS public.maintenance_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    interval_km INTEGER,
    interval_days INTEGER,
    last_change_km INTEGER,
    last_change_date TIMESTAMPTZ,
    next_due_km INTEGER,
    next_due_date TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Alerts table (general alerts)
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
    recipients_roles TEXT[] NOT NULL DEFAULT ARRAY['administrador'],
    priority TEXT NOT NULL DEFAULT 'medium',
    estado TEXT DEFAULT 'pendiente',
    meta JSONB,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Maintenance alerts table
CREATE TABLE IF NOT EXISTS public.alerts_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    tipo_alerta TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    fecha_evento DATE NOT NULL,
    estado TEXT NOT NULL DEFAULT 'activa',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Finance items table
CREATE TABLE IF NOT EXISTS public.finance_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT,
    date TIMESTAMPTZ NOT NULL DEFAULT now(),
    ref_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pico y placa payments table
CREATE TABLE IF NOT EXISTS public.pico_placa_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    pagado BOOLEAN NOT NULL DEFAULT false,
    monto NUMERIC,
    notas TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(vehicle_id, fecha)
);

-- Devolucion videos table
CREATE TABLE IF NOT EXISTS public.devolucion_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
    checklist_id UUID REFERENCES public.checklists(id) ON DELETE SET NULL,
    filename TEXT NOT NULL,
    google_drive_url TEXT NOT NULL,
    google_drive_file_id TEXT,
    fecha_devolucion TIMESTAMPTZ NOT NULL DEFAULT now(),
    duracion_segundos INTEGER,
    tamaño_bytes BIGINT,
    uploaded_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Geofence zones table
CREATE TABLE IF NOT EXISTS public.geofence_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Time entries table (clock in/out)
CREATE TABLE IF NOT EXISTS public.time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    method TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    latitude NUMERIC,
    longitude NUMERIC,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Settings table
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID
);

-- Agents table (API agents)
CREATE TABLE IF NOT EXISTS public.agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    api_key TEXT NOT NULL UNIQUE,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unread',
    metadata JSONB DEFAULT '{}',
    read_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log table
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action_type TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    description TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- END OF FILE 1_tables.sql
-- ============================================================
