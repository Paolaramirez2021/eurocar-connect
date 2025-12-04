-- ============================================================
-- EUROCAR RENTAL - DATABASE SCHEMA
-- File: 01_tables.sql
-- Description: Types and Tables (execute first)
-- Generated: 2025-12-02
-- Author: Lovable AI
-- ============================================================

-- ============================================================
-- SECTION 1: ENUM TYPES (with guard clause)
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

-- ============================================================
-- SECTION 2: TABLES
-- ============================================================

-- Table: profiles (user profiles linked to auth.users)
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

-- Table: user_roles (role assignments)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    role public.app_role NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    assigned_by UUID,
    UNIQUE (user_id, role)
);

-- Table: vehicles (fleet)
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

-- Table: customers (clients)
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

-- Table: reservations
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

-- Table: contracts
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

-- Table: checklist_templates
CREATE TABLE IF NOT EXISTS public.checklist_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: checklist_template_items
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

-- Table: checklists
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

-- Table: checklist_items
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

-- Table: maintenance
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

-- Table: maintenance_schedules
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

-- Table: alerts
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

-- Table: alerts_maintenance
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

-- Table: finance_items
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

-- Table: pico_placa_payments
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

-- Table: devolucion_videos
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

-- Table: geofence_zones
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

-- Table: time_entries
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

-- Table: settings
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT NOT NULL PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_by UUID
);

-- Table: agents (API agents)
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

-- Table: notifications
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

-- Table: audit_log
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

-- ============================================================
-- SECTION 3: FOREIGN KEY REFERENCES (for profiles -> auth.users)
-- ============================================================
-- Note: profiles.id references auth.users(id) but we don't create
-- the FK here as auth schema is managed by Supabase

-- ============================================================
-- GRANTS
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================================
-- END OF FILE 01_tables.sql
-- ============================================================
