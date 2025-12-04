-- ============================================
-- MIGRACIÓN INCREMENTAL: WEB + CRM INTEGRADO
-- ============================================
-- Este SQL extiende las tablas existentes de la web con las necesidades del CRM
-- y crea las nuevas tablas requeridas

-- ============================================
-- 1. CREAR ENUM PARA ROLES
-- ============================================
CREATE TYPE IF NOT EXISTS public.app_role AS ENUM (
  'socio_principal',
  'administrador',
  'comercial',
  'operativo'
);

-- ============================================
-- 2. EXTENDER TABLA VEHICLES (ya existe en web)
-- ============================================
-- Agregar columnas del CRM a la tabla vehicles existente
ALTER TABLE public.vehicles 
  ADD COLUMN IF NOT EXISTS placa TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS marca TEXT,
  ADD COLUMN IF NOT EXISTS modelo TEXT,
  ADD COLUMN IF NOT EXISTS año INTEGER,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'disponible',
  ADD COLUMN IF NOT EXISTS tipo_caja TEXT,
  ADD COLUMN IF NOT EXISTS combustible TEXT,
  ADD COLUMN IF NOT EXISTS equipamiento TEXT,
  ADD COLUMN IF NOT EXISTS capacidad_pasajeros INTEGER,
  ADD COLUMN IF NOT EXISTS cilindraje INTEGER,
  ADD COLUMN IF NOT EXISTS tarifa_dia_iva NUMERIC,
  ADD COLUMN IF NOT EXISTS kilometraje_dia INTEGER,
  ADD COLUMN IF NOT EXISTS kilometraje_actual INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_soat DATE,
  ADD COLUMN IF NOT EXISTS fecha_tecnomecanica DATE,
  ADD COLUMN IF NOT EXISTS fecha_impuestos DATE,
  ADD COLUMN IF NOT EXISTS kilometraje_proximo_mantenimiento INTEGER,
  ADD COLUMN IF NOT EXISTS ultimo_cambio_aceite_km INTEGER,
  ADD COLUMN IF NOT EXISTS ultimo_cambio_llantas_km INTEGER,
  ADD COLUMN IF NOT EXISTS ultimo_cambio_pastillas_km INTEGER,
  ADD COLUMN IF NOT EXISTS observaciones TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Actualizar RLS de vehicles para incluir roles del CRM
DROP POLICY IF EXISTS "Vehículos visibles públicamente" ON public.vehicles;
DROP POLICY IF EXISTS "Admins and socios can manage vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON public.vehicles;

CREATE POLICY "Authenticated users can view vehicles"
  ON public.vehicles FOR SELECT
  USING (true);

-- ============================================
-- 3. EXTENDER TABLA PROFILES (ya existe en web)
-- ============================================
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS cedula TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Actualizar constraint para email
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_email_key;

-- Actualizar RLS de profiles
DROP POLICY IF EXISTS "Usuarios pueden ver su perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su perfil" ON public.profiles;

CREATE POLICY "Users view own profile only"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- 4. CREAR TABLA USER_ROLES
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. CREAR FUNCIONES DE ROLES (SECURITY DEFINER)
-- ============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- ============================================
-- 6. RLS POLICIES PARA USER_ROLES
-- ============================================
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Socios and admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']));

CREATE POLICY "Only socios can manage roles"
  ON public.user_roles FOR ALL
  USING (has_role(auth.uid(), 'socio_principal'));

-- ============================================
-- 7. ACTUALIZAR RLS DE VEHICLES CON ROLES
-- ============================================
CREATE POLICY "Admins and socios can manage vehicles"
  ON public.vehicles FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']));

-- ============================================
-- 8. ACTUALIZAR RLS DE PROFILES CON ROLES
-- ============================================
CREATE POLICY "Admins view all profiles"
  ON public.profiles FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']));

-- ============================================
-- 9. CREAR TABLA CUSTOMERS (nueva)
-- ============================================
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombres TEXT NOT NULL,
  primer_apellido TEXT NOT NULL,
  segundo_apellido TEXT,
  cedula_pasaporte TEXT NOT NULL UNIQUE,
  fecha_nacimiento DATE,
  ciudad TEXT,
  pais TEXT DEFAULT 'Colombia',
  estado_civil TEXT,
  direccion_residencia TEXT,
  telefono TEXT,
  celular TEXT NOT NULL,
  email TEXT,
  ocupacion TEXT,
  empresa TEXT,
  direccion_oficina TEXT,
  licencia_numero TEXT,
  licencia_ciudad_expedicion TEXT,
  licencia_fecha_vencimiento DATE,
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
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_reservas INTEGER DEFAULT 0,
  monto_total NUMERIC DEFAULT 0
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customers"
  ON public.customers FOR SELECT
  USING (true);

CREATE POLICY "Admins and comercial can create customers"
  ON public.customers FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador', 'comercial', 'operativo']));

CREATE POLICY "Admins and comercial can update customers"
  ON public.customers FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador', 'comercial']));

CREATE POLICY "Admins can delete customers"
  ON public.customers FOR DELETE
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']));

-- ============================================
-- 10. CREAR TABLA RESERVATIONS (nueva, distinta a bookings)
-- ============================================
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  fecha_fin TIMESTAMP WITH TIME ZONE NOT NULL,
  cliente_nombre TEXT NOT NULL,
  cliente_documento TEXT,
  cliente_email TEXT,
  cliente_telefono TEXT,
  cliente_contacto TEXT NOT NULL,
  estado TEXT DEFAULT 'pending' NOT NULL,
  source TEXT,
  notas TEXT,
  dias_totales INTEGER,
  tarifa_dia_iva NUMERIC,
  valor_total NUMERIC,
  price_total NUMERIC,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all reservations"
  ON public.reservations FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']));

CREATE POLICY "Users view own reservations"
  ON public.reservations FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Comercial and operativo can create reservations"
  ON public.reservations FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador', 'comercial', 'operativo']));

CREATE POLICY "Admins and comercial can update reservations"
  ON public.reservations FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador', 'comercial']));

CREATE POLICY "Admins can delete reservations"
  ON public.reservations FOR DELETE
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']));

-- ============================================
-- 11. CREAR TABLA CONTRACTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number TEXT NOT NULL UNIQUE,
  reservation_id UUID REFERENCES public.reservations(id),
  vehicle_id UUID REFERENCES public.vehicles(id) NOT NULL,
  customer_id UUID REFERENCES public.customers(id) NOT NULL,
  customer_name TEXT NOT NULL,
  customer_document TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  total_amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'signed' NOT NULL,
  terms_text TEXT NOT NULL,
  terms_accepted BOOLEAN DEFAULT false NOT NULL,
  signature_url TEXT NOT NULL,
  fingerprint_url TEXT,
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  signed_by UUID,
  ip_address TEXT,
  user_agent TEXT,
  pdf_url TEXT,
  is_locked BOOLEAN DEFAULT true NOT NULL,
  was_offline BOOLEAN DEFAULT false NOT NULL,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contracts"
  ON public.contracts FOR SELECT
  USING (true);

CREATE POLICY "Authorized roles can create contracts"
  ON public.contracts FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador', 'comercial', 'operativo']));

CREATE POLICY "Only admins can update unlocked contracts"
  ON public.contracts FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']) AND is_locked = false);

CREATE POLICY "Admins can delete contracts"
  ON public.contracts FOR DELETE
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']));

-- ============================================
-- 12. CREAR TABLA MAINTENANCE
-- ============================================
CREATE TABLE IF NOT EXISTS public.maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) NOT NULL,
  tipo TEXT NOT NULL,
  descripcion TEXT,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  costo NUMERIC NOT NULL,
  kms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view maintenance"
  ON public.maintenance FOR SELECT
  USING (true);

CREATE POLICY "Admins and operativo can create maintenance"
  ON public.maintenance FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador', 'operativo']));

CREATE POLICY "Admins can update maintenance"
  ON public.maintenance FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']));

CREATE POLICY "Admins can delete maintenance"
  ON public.maintenance FOR DELETE
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']));

-- ============================================
-- 13. CREAR TABLA ALERTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id),
  recipients_roles TEXT[] DEFAULT ARRAY['administrador'] NOT NULL,
  priority TEXT DEFAULT 'medium' NOT NULL,
  meta JSONB,
  is_resolved BOOLEAN DEFAULT false NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  estado TEXT DEFAULT 'pendiente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view alerts"
  ON public.alerts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create alerts"
  ON public.alerts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update alerts"
  ON public.alerts FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']));

CREATE POLICY "Admins can delete alerts"
  ON public.alerts FOR DELETE
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']));

-- ============================================
-- 14. CREAR TABLA ALERTS_MAINTENANCE
-- ============================================
CREATE TABLE IF NOT EXISTS public.alerts_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) NOT NULL,
  tipo_alerta TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  fecha_evento DATE NOT NULL,
  estado TEXT DEFAULT 'activa' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.alerts_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view maintenance alerts"
  ON public.alerts_maintenance FOR SELECT
  USING (true);

CREATE POLICY "Admins and operativo can create alerts"
  ON public.alerts_maintenance FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador', 'operativo']));

CREATE POLICY "Admins and operativo can update alerts"
  ON public.alerts_maintenance FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador', 'operativo']));

CREATE POLICY "Admins can delete alerts"
  ON public.alerts_maintenance FOR DELETE
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']));

-- ============================================
-- 15. CREAR TABLAS ADICIONALES DEL CRM
-- ============================================

-- CHECKLIST TEMPLATES
CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view templates"
  ON public.checklist_templates FOR SELECT
  USING (true);

CREATE POLICY "Admins and socios can manage templates"
  ON public.checklist_templates FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']));

-- CHECKLIST TEMPLATE ITEMS
CREATE TABLE IF NOT EXISTS public.checklist_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.checklist_templates(id) ON DELETE CASCADE NOT NULL,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  order_index INTEGER DEFAULT 0 NOT NULL,
  required BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.checklist_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view template items"
  ON public.checklist_template_items FOR SELECT
  USING (true);

CREATE POLICY "Admins and socios can manage template items"
  ON public.checklist_template_items FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']));

-- CHECKLISTS
CREATE TABLE IF NOT EXISTS public.checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.checklist_templates(id) NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) NOT NULL,
  rental_id UUID REFERENCES public.reservations(id),
  type TEXT NOT NULL,
  status TEXT DEFAULT 'completed' NOT NULL,
  observaciones_generales TEXT,
  kms_registro INTEGER,
  completed_by UUID NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view checklists"
  ON public.checklists FOR SELECT
  USING (true);

CREATE POLICY "Comercial and operativo can create checklists"
  ON public.checklists FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador', 'comercial', 'operativo']));

CREATE POLICY "Admins can update checklists"
  ON public.checklists FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']));

-- CHECKLIST ITEMS
CREATE TABLE IF NOT EXISTS public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID REFERENCES public.checklists(id) ON DELETE CASCADE NOT NULL,
  template_item_id UUID REFERENCES public.checklist_template_items(id) NOT NULL,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  estado TEXT,
  observaciones TEXT,
  foto_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view checklist items"
  ON public.checklist_items FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their checklist items"
  ON public.checklist_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_items.checklist_id
    AND checklists.completed_by = auth.uid()
  ));

-- FINANCE ITEMS
CREATE TABLE IF NOT EXISTS public.finance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  ref_id UUID,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.finance_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only authorized roles view financial data"
  ON public.finance_items FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']));

CREATE POLICY "Admins can manage finance items"
  ON public.finance_items FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']));

-- AUDIT LOG
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON public.audit_log FOR SELECT
  USING (has_role(auth.uid(), 'administrador'));

CREATE POLICY "Socios can view all audit logs"
  ON public.audit_log FOR SELECT
  USING (has_role(auth.uid(), 'socio_principal'));

CREATE POLICY "All authenticated users can insert audit logs"
  ON public.audit_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- TIME ENTRIES
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  method TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own time entries"
  ON public.time_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own time entries"
  ON public.time_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and socios can view all time entries"
  ON public.time_entries FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']));

CREATE POLICY "Admins can manage all time entries"
  ON public.time_entries FOR ALL
  USING (has_role(auth.uid(), 'administrador'));

-- GEOFENCE ZONES
CREATE TABLE IF NOT EXISTS public.geofence_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  radius_meters INTEGER DEFAULT 100 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.geofence_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users view geofence zones"
  ON public.geofence_zones FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins and socios can manage geofence zones"
  ON public.geofence_zones FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']));

-- MAINTENANCE SCHEDULES
CREATE TABLE IF NOT EXISTS public.maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) NOT NULL,
  tipo TEXT NOT NULL,
  interval_km INTEGER,
  interval_days INTEGER,
  last_change_km INTEGER,
  last_change_date TIMESTAMP WITH TIME ZONE,
  next_due_km INTEGER,
  next_due_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view maintenance schedules"
  ON public.maintenance_schedules FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage maintenance schedules"
  ON public.maintenance_schedules FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']));

-- PICO PLACA PAYMENTS
CREATE TABLE IF NOT EXISTS public.pico_placa_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) NOT NULL,
  fecha DATE NOT NULL,
  pagado BOOLEAN DEFAULT false NOT NULL,
  monto NUMERIC,
  notas TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.pico_placa_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view pico placa payments"
  ON public.pico_placa_payments FOR SELECT
  USING (true);

CREATE POLICY "Admins and operativo can manage pico placa payments"
  ON public.pico_placa_payments FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador', 'operativo']));

-- AGENTS (para GPT)
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  scopes TEXT[] DEFAULT '{}' NOT NULL,
  active BOOLEAN DEFAULT true NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and socios can view agents"
  ON public.agents FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']));

CREATE POLICY "Socios and admins can manage agents"
  ON public.agents FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']));

-- DEVOLUCION VIDEOS
CREATE TABLE IF NOT EXISTS public.devolucion_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) NOT NULL,
  reservation_id UUID REFERENCES public.reservations(id),
  checklist_id UUID REFERENCES public.checklists(id),
  filename TEXT NOT NULL,
  google_drive_url TEXT NOT NULL,
  google_drive_file_id TEXT,
  fecha_devolucion TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  duracion_segundos INTEGER,
  tamaño_bytes BIGINT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.devolucion_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view devolucion videos"
  ON public.devolucion_videos FOR SELECT
  USING (true);

CREATE POLICY "Admins and operativo can manage devolucion videos"
  ON public.devolucion_videos FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador', 'operativo', 'comercial']));

-- SETTINGS
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and socios can view settings"
  ON public.settings FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']));

CREATE POLICY "Admins and socios can manage settings"
  ON public.settings FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['socio_principal', 'administrador']));

-- ============================================
-- 16. FUNCIONES AUXILIARES
-- ============================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Función para auditoría
CREATE OR REPLACE FUNCTION public.log_audit(
  p_action_type TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_record_id UUID DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO public.audit_log (
    user_id,
    action_type,
    table_name,
    record_id,
    old_data,
    new_data,
    description
  ) VALUES (
    auth.uid(),
    p_action_type,
    p_table_name,
    p_record_id,
    p_old_data,
    p_new_data,
    p_description
  ) RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

-- Función para generar número de contrato
CREATE OR REPLACE FUNCTION public.generate_contract_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
  year_part TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(contract_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.contracts
  WHERE contract_number LIKE 'CTR-' || year_part || '-%';
  
  RETURN 'CTR-' || year_part || '-' || LPAD(next_num::TEXT, 5, '0');
END;
$$;

-- Función para verificar disponibilidad de reservas
CREATE OR REPLACE FUNCTION public.check_reservation_availability(
  p_vehicle_id UUID,
  p_fecha_inicio TIMESTAMP WITH TIME ZONE,
  p_fecha_fin TIMESTAMP WITH TIME ZONE,
  p_exclude_reservation_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1
    FROM public.reservations
    WHERE vehicle_id = p_vehicle_id
      AND estado IN ('confirmed', 'pending')
      AND id != COALESCE(p_exclude_reservation_id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND (
        (p_fecha_inicio >= fecha_inicio AND p_fecha_inicio < fecha_fin)
        OR (p_fecha_fin > fecha_inicio AND p_fecha_fin <= fecha_fin)
        OR (p_fecha_inicio <= fecha_inicio AND p_fecha_fin >= fecha_fin)
      )
  );
END;
$$;

-- ============================================
-- 17. TRIGGERS
-- ============================================

-- Trigger para updated_at en vehicles
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON public.vehicles;
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para updated_at en profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para updated_at en customers
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para updated_at en reservations
CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para updated_at en contracts
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para generar contract_number
CREATE TRIGGER set_contract_number
  BEFORE INSERT ON public.contracts
  FOR EACH ROW
  WHEN (NEW.contract_number IS NULL OR NEW.contract_number = '')
  EXECUTE FUNCTION public.generate_contract_number();

-- ============================================
-- 18. VISTAS
-- ============================================

-- Vista de estadísticas de clientes
CREATE OR REPLACE VIEW public.customer_stats AS
SELECT 
  c.id,
  c.nombres,
  c.primer_apellido,
  c.segundo_apellido,
  c.cedula_pasaporte,
  c.email,
  c.celular,
  c.estado,
  c.total_reservas,
  c.monto_total,
  c.created_at,
  COUNT(CASE WHEN r.estado IN ('pending', 'confirmed') THEN 1 END) AS reservas_activas,
  COUNT(CASE WHEN r.estado = 'completed' THEN 1 END) AS reservas_completadas,
  COUNT(DISTINCT co.id) AS contratos_firmados,
  MAX(r.created_at) AS ultima_reserva
FROM public.customers c
LEFT JOIN public.reservations r ON r.customer_id = c.id
LEFT JOIN public.contracts co ON co.customer_id = c.id
GROUP BY c.id;

-- Vista de alertas de mantenimiento
CREATE OR REPLACE VIEW public.alerts_maintenance_view AS
SELECT 
  *,
  (fecha_evento - CURRENT_DATE) AS dias_restantes
FROM public.alerts_maintenance
WHERE estado = 'activa';

-- ============================================
-- 19. ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_vehicles_placa ON public.vehicles(placa);
CREATE INDEX IF NOT EXISTS idx_vehicles_estado ON public.vehicles(estado);
CREATE INDEX IF NOT EXISTS idx_customers_cedula ON public.customers(cedula_pasaporte);
CREATE INDEX IF NOT EXISTS idx_reservations_vehicle ON public.reservations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_reservations_customer ON public.reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON public.reservations(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_contracts_reservation ON public.contracts(reservation_id);
CREATE INDEX IF NOT EXISTS idx_contracts_customer ON public.contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON public.maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_alerts_vehicle ON public.alerts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON public.audit_log(table_name, record_id);

-- ============================================
-- 20. ACTUALIZAR TRIGGER DE PROFILES
-- ============================================
-- Actualizar función handle_new_user para incluir email
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  
  -- Log the signup
  PERFORM public.log_audit(
    'USER_SIGNUP',
    'profiles',
    NEW.id,
    NULL,
    jsonb_build_object('email', NEW.email),
    'New user registered'
  );
  
  RETURN NEW;
END;
$$;

-- Recrear trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================
-- FIN DE MIGRACIÓN
-- ============================================

-- Insertar configuración inicial
INSERT INTO public.settings (key, value) 
VALUES ('app_name', '"EuroCar Rental CRM"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Nota: Para crear el primer usuario administrador, ejecutar:
-- INSERT INTO public.user_roles (user_id, role) VALUES ('<tu-user-id>', 'socio_principal');
