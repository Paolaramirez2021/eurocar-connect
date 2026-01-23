-- =====================================================
-- MIGRACIÓN: Agregar columna fecha_fin a maintenance
-- Fecha: 2024-12-15
-- Descripción: Permite registrar mantenimientos con rango de fechas
-- =====================================================

-- 1. Agregar columna fecha_fin (puede ser NULL para mantener compatibilidad con registros existentes)
ALTER TABLE public.maintenance 
ADD COLUMN IF NOT EXISTS fecha_fin TIMESTAMP WITH TIME ZONE;

-- 2. Agregar columna fecha_inicio si no existe (alias para fecha en nuevos registros)
ALTER TABLE public.maintenance 
ADD COLUMN IF NOT EXISTS fecha_inicio TIMESTAMP WITH TIME ZONE;

-- 3. Para registros existentes, copiar fecha a fecha_inicio y fecha_fin (mantenimiento de un solo día)
UPDATE public.maintenance 
SET fecha_inicio = fecha, fecha_fin = fecha 
WHERE fecha_inicio IS NULL OR fecha_fin IS NULL;

-- 4. Crear índice para mejorar búsquedas por rango de fechas
CREATE INDEX IF NOT EXISTS idx_maintenance_fecha_rango 
ON public.maintenance (vehicle_id, fecha_inicio, fecha_fin) 
WHERE completed = false;

-- 5. Comentarios explicativos
COMMENT ON COLUMN public.maintenance.fecha_inicio IS 'Fecha de inicio del mantenimiento';
COMMENT ON COLUMN public.maintenance.fecha_fin IS 'Fecha de fin del mantenimiento (para mantenimientos de varios días)';

-- =====================================================
-- INSTRUCCIONES DE USO:
-- 1. Copie este script completo
-- 2. Vaya a Supabase Dashboard > SQL Editor
-- 3. Pegue y ejecute el script
-- 4. Verifique que no haya errores
-- =====================================================
