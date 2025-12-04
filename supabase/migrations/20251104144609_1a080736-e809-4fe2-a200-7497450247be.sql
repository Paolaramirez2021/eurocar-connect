-- Add new columns to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS tipo_caja TEXT,
ADD COLUMN IF NOT EXISTS combustible TEXT,
ADD COLUMN IF NOT EXISTS capacidad_pasajeros INTEGER,
ADD COLUMN IF NOT EXISTS cilindraje INTEGER,
ADD COLUMN IF NOT EXISTS equipamiento TEXT,
ADD COLUMN IF NOT EXISTS tarifa_dia_iva NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS kilometraje_dia INTEGER,
ADD COLUMN IF NOT EXISTS fecha_soat DATE,
ADD COLUMN IF NOT EXISTS fecha_tecnomecanica DATE,
ADD COLUMN IF NOT EXISTS fecha_impuestos DATE,
ADD COLUMN IF NOT EXISTS observaciones TEXT,
ADD COLUMN IF NOT EXISTS kilometraje_proximo_mantenimiento INTEGER;

-- Rename kms_actuales to kilometraje_actual for consistency
ALTER TABLE public.vehicles 
RENAME COLUMN kms_actuales TO kilometraje_actual;

-- Update year column name for consistency
ALTER TABLE public.vehicles 
RENAME COLUMN year TO año;

-- Add index for common queries
CREATE INDEX IF NOT EXISTS idx_vehicles_estado ON public.vehicles(estado);
CREATE INDEX IF NOT EXISTS idx_vehicles_modelo ON public.vehicles(modelo);
CREATE INDEX IF NOT EXISTS idx_vehicles_combustible ON public.vehicles(combustible);

-- Update the update_updated_at trigger
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON public.vehicles;
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();