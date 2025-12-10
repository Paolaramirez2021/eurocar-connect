-- ============================================================
-- MIGRACIÓN: Añadir columnas para desglose de IVA en reservas
-- Fecha: 2025-12-10
-- Descripción: Añade columnas para cumplir con normativa fiscal
--              colombiana (IVA 19%)
-- ============================================================

-- Añadir columna para tarifa diaria SIN IVA
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS tarifa_diaria NUMERIC;

-- Añadir columna para subtotal (días × tarifa sin IVA)
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS subtotal NUMERIC;

-- Añadir columna para IVA (19% del subtotal)
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS iva NUMERIC;

-- Crear índice para consultas financieras
CREATE INDEX IF NOT EXISTS idx_reservations_subtotal ON public.reservations(subtotal);
CREATE INDEX IF NOT EXISTS idx_reservations_iva ON public.reservations(iva);

-- Comentarios para documentación
COMMENT ON COLUMN public.reservations.tarifa_diaria IS 'Tarifa por día SIN IVA';
COMMENT ON COLUMN public.reservations.subtotal IS 'Subtotal = dias_totales × tarifa_diaria (sin IVA)';
COMMENT ON COLUMN public.reservations.iva IS 'IVA 19% = subtotal × 0.19';

-- Actualizar registros existentes (calcular valores retroactivos)
-- Nota: tarifa_dia_iva en la BD es la tarifa SIN IVA (nombre confuso pero así está)
UPDATE public.reservations
SET 
  tarifa_diaria = tarifa_dia_iva,
  subtotal = COALESCE(tarifa_dia_iva * dias_totales, 0),
  iva = ROUND(COALESCE(tarifa_dia_iva * dias_totales, 0) * 0.19)
WHERE tarifa_diaria IS NULL 
  AND tarifa_dia_iva IS NOT NULL 
  AND dias_totales IS NOT NULL;

-- Verificar que las columnas se crearon correctamente
SELECT 
  column_name, 
  data_type, 
  column_default, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'reservations'
  AND column_name IN ('tarifa_diaria', 'subtotal', 'iva')
ORDER BY column_name;
