-- ============================================================
-- MÓDULO DE INSPECCIÓN VEHICULAR - Eurocar Connect
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Tabla principal de inspecciones
CREATE TABLE IF NOT EXISTS vehicle_inspections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  
  -- Tipo: 'entrega' o 'recepcion'
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrega', 'recepcion')),
  
  -- Referencia a la inspección de entrega (solo para recepciones)
  entrega_inspection_id UUID REFERENCES vehicle_inspections(id) ON DELETE SET NULL,
  
  -- Datos del vehículo al momento de inspección
  odometro_km INTEGER NOT NULL DEFAULT 0,
  nivel_combustible INTEGER NOT NULL DEFAULT 100 CHECK (nivel_combustible >= 0 AND nivel_combustible <= 100),
  
  -- Estado general
  estado_general VARCHAR(20) DEFAULT 'bueno' CHECK (estado_general IN ('excelente', 'bueno', 'regular', 'malo')),
  observaciones_generales TEXT,
  
  -- Metadatos
  estado VARCHAR(20) DEFAULT 'borrador' CHECK (estado IN ('borrador', 'completada', 'firmada')),
  inspector_nombre VARCHAR(200),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Número de inspección auto-generado
  numero_inspeccion VARCHAR(20)
);

-- 2. Items de checklist de inspección
CREATE TABLE IF NOT EXISTS inspection_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID NOT NULL REFERENCES vehicle_inspections(id) ON DELETE CASCADE,
  
  -- Categoría: exterior, interior, mecanica, documentos, seguridad
  categoria VARCHAR(30) NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  
  -- Estado: ok, dañado, faltante, no_aplica
  estado VARCHAR(20) DEFAULT 'ok' CHECK (estado IN ('ok', 'dañado', 'faltante', 'no_aplica')),
  observaciones TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Daños registrados con ubicación en diagrama
CREATE TABLE IF NOT EXISTS inspection_damages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID NOT NULL REFERENCES vehicle_inspections(id) ON DELETE CASCADE,
  
  -- Ubicación en el diagrama del vehículo
  zona VARCHAR(30) NOT NULL, -- frontal, trasera, lateral_izq, lateral_der, techo, capot, interior
  posicion_x DECIMAL(5,2), -- Coordenada X en porcentaje (0-100)
  posicion_y DECIMAL(5,2), -- Coordenada Y en porcentaje (0-100)
  
  -- Detalles del daño
  tipo_dano VARCHAR(50) NOT NULL, -- rayón, abolladura, rotura, faltante, otro
  severidad VARCHAR(20) DEFAULT 'leve' CHECK (severidad IN ('leve', 'moderado', 'grave')),
  descripcion TEXT,
  
  -- Si es un daño nuevo detectado en recepción
  es_nuevo BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Fotografías de inspección
CREATE TABLE IF NOT EXISTS inspection_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID NOT NULL REFERENCES vehicle_inspections(id) ON DELETE CASCADE,
  damage_id UUID REFERENCES inspection_damages(id) ON DELETE CASCADE,
  
  -- Metadata de la foto
  categoria VARCHAR(30) NOT NULL, -- general, dano, exterior, interior, odometro, combustible
  url TEXT NOT NULL,
  descripcion VARCHAR(200),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Firmas digitales de la inspección
CREATE TABLE IF NOT EXISTS inspection_signatures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID NOT NULL REFERENCES vehicle_inspections(id) ON DELETE CASCADE,
  
  -- Tipo de firmante
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('cliente', 'inspector', 'testigo')),
  nombre_firmante VARCHAR(200) NOT NULL,
  documento_firmante VARCHAR(50),
  
  -- Firma como data URL (base64)
  firma_data TEXT NOT NULL,
  
  firmado_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_inspections_vehicle ON vehicle_inspections(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_inspections_reservation ON vehicle_inspections(reservation_id);
CREATE INDEX IF NOT EXISTS idx_inspections_tipo ON vehicle_inspections(tipo);
CREATE INDEX IF NOT EXISTS idx_inspection_items_inspection ON inspection_items(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_damages_inspection ON inspection_damages(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_photos_inspection ON inspection_photos(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_signatures_inspection ON inspection_signatures(inspection_id);

-- Función para auto-generar número de inspección
CREATE OR REPLACE FUNCTION generate_inspection_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
  prefix TEXT;
BEGIN
  IF NEW.tipo = 'entrega' THEN
    prefix := 'INS-E-';
  ELSE
    prefix := 'INS-R-';
  END IF;
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_inspeccion FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO next_num
  FROM vehicle_inspections
  WHERE tipo = NEW.tipo;
  
  NEW.numero_inspeccion := prefix || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inspection_number ON vehicle_inspections;
CREATE TRIGGER trg_inspection_number
  BEFORE INSERT ON vehicle_inspections
  FOR EACH ROW
  WHEN (NEW.numero_inspeccion IS NULL)
  EXECUTE FUNCTION generate_inspection_number();

-- RLS Policies (permisivas para empezar)
ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_damages ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON vehicle_inspections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON inspection_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON inspection_damages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON inspection_photos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON inspection_signatures FOR ALL TO authenticated USING (true) WITH CHECK (true);
