-- Add missing customer fields to reservations table
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS cliente_documento TEXT,
ADD COLUMN IF NOT EXISTS cliente_email TEXT,
ADD COLUMN IF NOT EXISTS cliente_telefono TEXT,
ADD COLUMN IF NOT EXISTS dias_totales INTEGER,
ADD COLUMN IF NOT EXISTS tarifa_dia_iva NUMERIC,
ADD COLUMN IF NOT EXISTS valor_total NUMERIC;

-- Update existing reservations to calculate dias_totales if dates exist
UPDATE public.reservations
SET dias_totales = EXTRACT(DAY FROM (fecha_fin - fecha_inicio))
WHERE dias_totales IS NULL AND fecha_inicio IS NOT NULL AND fecha_fin IS NOT NULL;

-- Create index for better query performance on estado
CREATE INDEX IF NOT EXISTS idx_reservations_estado ON public.reservations(estado);
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON public.reservations(fecha_inicio, fecha_fin);