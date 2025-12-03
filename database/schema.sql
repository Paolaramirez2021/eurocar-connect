-- ============================================
-- EUROCAR RENTAL - DATABASE SCHEMA
-- PostgreSQL / Supabase
-- ============================================

-- Enum types
CREATE TYPE app_role AS ENUM ('socio_principal', 'administrador', 'comercial', 'operativo');

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  cedula TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile only" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador')
    )
  );

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- USER ROLES TABLE
-- ============================================
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies for user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Socios and admins can view all roles" ON user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('socio_principal', 'administrador')
    )
  );

CREATE POLICY "Only socios can manage roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'socio_principal'
    )
  );

-- ============================================
-- VEHICLES TABLE
-- ============================================
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placa TEXT NOT NULL UNIQUE,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  año INTEGER NOT NULL,
  color TEXT,
  estado TEXT NOT NULL DEFAULT 'disponible',
  capacidad_pasajeros INTEGER,
  cilindraje INTEGER,
  tipo_caja TEXT,
  combustible TEXT,
  equipamiento TEXT,
  kilometraje_actual INTEGER NOT NULL DEFAULT 0,
  kilometraje_dia INTEGER,
  kilometraje_proximo_mantenimiento INTEGER,
  ultimo_cambio_aceite_km INTEGER,
  ultimo_cambio_llantas_km INTEGER,
  ultimo_cambio_pastillas_km INTEGER,
  tarifa_dia_iva NUMERIC,
  fecha_soat DATE,
  fecha_tecnomecanica DATE,
  fecha_impuestos DATE,
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies for vehicles
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view vehicles" ON vehicles
  FOR SELECT USING (true);

CREATE POLICY "Admins and socios can manage vehicles" ON vehicles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador')
    )
  );

-- ============================================
-- CUSTOMERS TABLE
-- ============================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cedula_pasaporte TEXT NOT NULL UNIQUE,
  nombres TEXT NOT NULL,
  primer_apellido TEXT NOT NULL,
  segundo_apellido TEXT,
  fecha_nacimiento DATE,
  pais TEXT DEFAULT 'Colombia',
  ciudad TEXT,
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
  total_reservas INTEGER DEFAULT 0,
  monto_total NUMERIC DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies for customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customers" ON customers
  FOR SELECT USING (true);

CREATE POLICY "Admins and comercial can create customers" ON customers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador', 'comercial', 'operativo')
    )
  );

CREATE POLICY "Admins and comercial can update customers" ON customers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador', 'comercial')
    )
  );

CREATE POLICY "Admins can delete customers" ON customers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador')
    )
  );

-- ============================================
-- RESERVATIONS TABLE
-- ============================================
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  fecha_inicio TIMESTAMPTZ NOT NULL,
  fecha_fin TIMESTAMPTZ NOT NULL,
  cliente_nombre TEXT NOT NULL,
  cliente_contacto TEXT NOT NULL,
  cliente_documento TEXT,
  cliente_email TEXT,
  cliente_telefono TEXT,
  estado TEXT NOT NULL DEFAULT 'pending',
  dias_totales INTEGER,
  tarifa_dia_iva NUMERIC,
  valor_total NUMERIC,
  price_total NUMERIC,
  notas TEXT,
  source TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies for reservations
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all reservations" ON reservations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador')
    )
  );

CREATE POLICY "Users view own reservations" ON reservations
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Comercial and operativo can create reservations" ON reservations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador', 'comercial', 'operativo')
    )
  );

CREATE POLICY "Admins and comercial can update reservations" ON reservations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador', 'comercial')
    )
  );

CREATE POLICY "Admins can delete reservations" ON reservations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador')
    )
  );

-- ============================================
-- CONTRACTS TABLE
-- ============================================
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number TEXT NOT NULL UNIQUE,
  reservation_id UUID REFERENCES reservations(id),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
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
  ip_address TEXT,
  user_agent TEXT,
  signed_by UUID REFERENCES profiles(id),
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_locked BOOLEAN NOT NULL DEFAULT true,
  was_offline BOOLEAN NOT NULL DEFAULT false,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies for contracts
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contracts" ON contracts
  FOR SELECT USING (true);

CREATE POLICY "Authorized roles can create contracts" ON contracts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador', 'comercial', 'operativo')
    )
  );

CREATE POLICY "Only admins can update unlocked contracts" ON contracts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador')
    ) AND is_locked = false
  );

CREATE POLICY "Admins can delete contracts" ON contracts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador')
    )
  );

-- ============================================
-- CHECKLIST TEMPLATES TABLE
-- ============================================
CREATE TABLE checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view templates" ON checklist_templates
  FOR SELECT USING (true);

CREATE POLICY "Admins and socios can manage templates" ON checklist_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador')
    )
  );

-- ============================================
-- CHECKLIST TEMPLATE ITEMS TABLE
-- ============================================
CREATE TABLE checklist_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE checklist_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view template items" ON checklist_template_items
  FOR SELECT USING (true);

CREATE POLICY "Admins and socios can manage template items" ON checklist_template_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador')
    )
  );

-- ============================================
-- CHECKLISTS TABLE
-- ============================================
CREATE TABLE checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES checklist_templates(id),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  rental_id UUID REFERENCES reservations(id),
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  kms_registro INTEGER,
  observaciones_generales TEXT,
  completed_by UUID NOT NULL REFERENCES profiles(id),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view checklists" ON checklists
  FOR SELECT USING (true);

CREATE POLICY "Comercial and operativo can create checklists" ON checklists
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador', 'comercial', 'operativo')
    )
  );

CREATE POLICY "Admins can update checklists" ON checklists
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador')
    )
  );

-- ============================================
-- CHECKLIST ITEMS TABLE
-- ============================================
CREATE TABLE checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  template_item_id UUID NOT NULL REFERENCES checklist_template_items(id),
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  estado TEXT,
  observaciones TEXT,
  foto_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view checklist items" ON checklist_items
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their checklist items" ON checklist_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM checklists 
      WHERE checklists.id = checklist_items.checklist_id 
      AND checklists.completed_by = auth.uid()
    )
  );

-- ============================================
-- MAINTENANCE TABLE
-- ============================================
CREATE TABLE maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  descripcion TEXT,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  costo NUMERIC NOT NULL,
  kms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view maintenance" ON maintenance
  FOR SELECT USING (true);

CREATE POLICY "Admins and operativo can create maintenance" ON maintenance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador', 'operativo')
    )
  );

CREATE POLICY "Admins can update maintenance" ON maintenance
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador')
    )
  );

CREATE POLICY "Admins can delete maintenance" ON maintenance
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador')
    )
  );

-- ============================================
-- MAINTENANCE SCHEDULES TABLE
-- ============================================
CREATE TABLE maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  interval_km INTEGER,
  interval_days INTEGER,
  last_change_km INTEGER,
  last_change_date TIMESTAMPTZ,
  next_due_km INTEGER,
  next_due_date TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view maintenance schedules" ON maintenance_schedules
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage maintenance schedules" ON maintenance_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador')
    )
  );

-- ============================================
-- ALERTS TABLE
-- ============================================
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id),
  estado TEXT DEFAULT 'pendiente',
  priority TEXT NOT NULL DEFAULT 'medium',
  recipients_roles TEXT[] NOT NULL DEFAULT ARRAY['administrador'],
  meta JSONB,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view alerts" ON alerts
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create alerts" ON alerts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update alerts" ON alerts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador')
    )
  );

CREATE POLICY "Admins can delete alerts" ON alerts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador')
    )
  );

-- ============================================
-- ALERTS MAINTENANCE TABLE
-- ============================================
CREATE TABLE alerts_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  tipo_alerta TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  fecha_evento DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE alerts_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view maintenance alerts" ON alerts_maintenance
  FOR SELECT USING (true);

CREATE POLICY "Admins and operativo can create alerts" ON alerts_maintenance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador', 'operativo')
    )
  );

CREATE POLICY "Admins and operativo can update alerts" ON alerts_maintenance
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador', 'operativo')
    )
  );

CREATE POLICY "Admins can delete alerts" ON alerts_maintenance
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador')
    )
  );

-- ============================================
-- FINANCE ITEMS TABLE
-- ============================================
CREATE TABLE finance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ref_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE finance_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only authorized roles view financial data" ON finance_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador')
    )
  );

CREATE POLICY "Admins can manage finance items" ON finance_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador')
    )
  );

-- ============================================
-- PICO PLACA PAYMENTS TABLE
-- ============================================
CREATE TABLE pico_placa_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  pagado BOOLEAN NOT NULL DEFAULT false,
  monto NUMERIC,
  notas TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE pico_placa_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view pico placa payments" ON pico_placa_payments
  FOR SELECT USING (true);

CREATE POLICY "Admins and operativo can manage pico placa payments" ON pico_placa_payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador', 'operativo')
    )
  );

-- ============================================
-- GEOFENCE ZONES TABLE
-- ============================================
CREATE TABLE geofence_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE geofence_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users view geofence zones" ON geofence_zones
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins and socios can manage geofence zones" ON geofence_zones
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador')
    )
  );

-- ============================================
-- TIME ENTRIES TABLE
-- ============================================
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  method TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latitude NUMERIC,
  longitude NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own time entries" ON time_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins and socios can view all time entries" ON time_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador')
    )
  );

CREATE POLICY "Users can insert their own time entries" ON time_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all time entries" ON time_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrador'
    )
  );

-- ============================================
-- AUDIT LOG TABLE
-- ============================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action_type TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  description TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can insert audit logs" ON audit_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Socios can view all audit logs" ON audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'socio_principal'
    )
  );

CREATE POLICY "Admins can view audit logs" ON audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'administrador'
    )
  );

-- ============================================
-- AGENTS TABLE (for API integrations)
-- ============================================
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and socios can view agents" ON agents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador')
    )
  );

CREATE POLICY "Socios and admins can manage agents" ON agents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador')
    )
  );

-- ============================================
-- SETTINGS TABLE
-- ============================================
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and socios can view settings" ON settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador')
    )
  );

CREATE POLICY "Admins and socios can manage settings" ON settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador')
    )
  );

-- ============================================
-- DEVOLUCION VIDEOS TABLE
-- ============================================
CREATE TABLE devolucion_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id),
  checklist_id UUID REFERENCES checklists(id),
  filename TEXT NOT NULL,
  google_drive_url TEXT NOT NULL,
  google_drive_file_id TEXT,
  fecha_devolucion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duracion_segundos INTEGER,
  tamaño_bytes BIGINT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE devolucion_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view devolucion videos" ON devolucion_videos
  FOR SELECT USING (true);

CREATE POLICY "Admins and operativo can manage devolucion videos" ON devolucion_videos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('socio_principal', 'administrador', 'operativo', 'comercial')
    )
  );

-- ============================================
-- VIEWS
-- ============================================

-- Customer Stats View
CREATE OR REPLACE VIEW customer_stats AS
SELECT 
  c.id,
  c.cedula_pasaporte,
  c.nombres,
  c.primer_apellido,
  c.segundo_apellido,
  c.email,
  c.celular,
  c.estado,
  c.total_reservas,
  c.monto_total,
  c.created_at,
  COUNT(DISTINCT CASE WHEN r.estado IN ('pending', 'confirmed', 'active') THEN r.id END) AS reservas_activas,
  COUNT(DISTINCT CASE WHEN r.estado = 'completed' THEN r.id END) AS reservas_completadas,
  COUNT(DISTINCT co.id) AS contratos_firmados,
  MAX(r.fecha_inicio) AS ultima_reserva
FROM customers c
LEFT JOIN reservations r ON r.customer_id = c.id
LEFT JOIN contracts co ON co.customer_id = c.id
GROUP BY c.id;

-- Alerts Maintenance View
CREATE OR REPLACE VIEW alerts_maintenance_view AS
SELECT 
  am.*,
  (am.fecha_evento - CURRENT_DATE) AS dias_restantes
FROM alerts_maintenance am;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to check user role
CREATE OR REPLACE FUNCTION has_role(
  _user_id UUID,
  _role app_role
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id AND role = _role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has any of specified roles
CREATE OR REPLACE FUNCTION has_any_role(
  _user_id UUID,
  _roles app_role[]
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id AND role = ANY(_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user roles
CREATE OR REPLACE FUNCTION get_user_roles(_user_id UUID)
RETURNS app_role[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT role FROM user_roles WHERE user_id = _user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check reservation availability
CREATE OR REPLACE FUNCTION check_reservation_availability(
  p_vehicle_id UUID,
  p_fecha_inicio TIMESTAMPTZ,
  p_fecha_fin TIMESTAMPTZ,
  p_exclude_reservation_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_conflicting_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_conflicting_count
  FROM reservations
  WHERE vehicle_id = p_vehicle_id
    AND estado NOT IN ('cancelled', 'completed')
    AND (id != p_exclude_reservation_id OR p_exclude_reservation_id IS NULL)
    AND (
      (fecha_inicio <= p_fecha_inicio AND fecha_fin >= p_fecha_inicio) OR
      (fecha_inicio <= p_fecha_fin AND fecha_fin >= p_fecha_fin) OR
      (fecha_inicio >= p_fecha_inicio AND fecha_fin <= p_fecha_fin)
    );
  
  RETURN v_conflicting_count = 0;
END;
$$ LANGUAGE plpgsql;

-- Function to generate contract number
CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_month TEXT;
  v_sequence TEXT;
  v_count INTEGER;
BEGIN
  v_year := TO_CHAR(NOW(), 'YY');
  v_month := TO_CHAR(NOW(), 'MM');
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM contracts
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
    AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW());
  
  v_sequence := LPAD(v_count::TEXT, 4, '0');
  
  RETURN 'EC-' || v_year || v_month || '-' || v_sequence;
END;
$$ LANGUAGE plpgsql;

-- Function to log audit
CREATE OR REPLACE FUNCTION log_audit(
  p_action_type TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_record_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO audit_log (
    user_id,
    action_type,
    table_name,
    record_id,
    description,
    old_data,
    new_data
  ) VALUES (
    auth.uid(),
    p_action_type,
    p_table_name,
    p_record_id,
    p_description,
    p_old_data,
    p_new_data
  ) RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if location is within geofence
CREATE OR REPLACE FUNCTION is_within_geofence(
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_zone_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_zone_found BOOLEAN;
BEGIN
  IF p_zone_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM geofence_zones
      WHERE id = p_zone_id
        AND is_active = true
        AND (
          6371000 * ACOS(
            COS(RADIANS(p_latitude)) * 
            COS(RADIANS(latitude)) * 
            COS(RADIANS(longitude) - RADIANS(p_longitude)) + 
            SIN(RADIANS(p_latitude)) * 
            SIN(RADIANS(latitude))
          )
        ) <= radius_meters
    ) INTO v_zone_found;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM geofence_zones
      WHERE is_active = true
        AND (
          6371000 * ACOS(
            COS(RADIANS(p_latitude)) * 
            COS(RADIANS(latitude)) * 
            COS(RADIANS(longitude) - RADIANS(p_longitude)) + 
            SIN(RADIANS(p_latitude)) * 
            SIN(RADIANS(latitude))
          )
        ) <= radius_meters
    ) INTO v_zone_found;
  END IF;
  
  RETURN v_zone_found;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INDEXES
-- ============================================

-- Vehicles indexes
CREATE INDEX idx_vehicles_placa ON vehicles(placa);
CREATE INDEX idx_vehicles_estado ON vehicles(estado);

-- Customers indexes
CREATE INDEX idx_customers_cedula ON customers(cedula_pasaporte);
CREATE INDEX idx_customers_email ON customers(email);

-- Reservations indexes
CREATE INDEX idx_reservations_vehicle ON reservations(vehicle_id);
CREATE INDEX idx_reservations_customer ON reservations(customer_id);
CREATE INDEX idx_reservations_dates ON reservations(fecha_inicio, fecha_fin);
CREATE INDEX idx_reservations_estado ON reservations(estado);

-- Contracts indexes
CREATE INDEX idx_contracts_number ON contracts(contract_number);
CREATE INDEX idx_contracts_customer ON contracts(customer_id);
CREATE INDEX idx_contracts_vehicle ON contracts(vehicle_id);

-- Maintenance indexes
CREATE INDEX idx_maintenance_vehicle ON maintenance(vehicle_id);
CREATE INDEX idx_maintenance_fecha ON maintenance(fecha);

-- Alerts indexes
CREATE INDEX idx_alerts_vehicle ON alerts(vehicle_id);
CREATE INDEX idx_alerts_resolved ON alerts(is_resolved);

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_updated_at BEFORE UPDATE ON maintenance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INITIAL DATA (OPTIONAL)
-- ============================================

-- Insert default settings
INSERT INTO settings (key, value) VALUES
  ('company_name', '"EuroCar Rental"'),
  ('company_email', '"info@eurocar.com"'),
  ('company_phone', '"+57 300 000 0000"'),
  ('contract_terms', '"Términos y condiciones del contrato..."')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- GRANTS & PERMISSIONS
-- ============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant execute on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;
