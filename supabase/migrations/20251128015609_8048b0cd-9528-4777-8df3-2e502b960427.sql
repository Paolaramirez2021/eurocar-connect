-- Agregar campo de descuento a reservations
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS descuento numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS descuento_porcentaje numeric DEFAULT 0;

COMMENT ON COLUMN public.reservations.descuento IS 'Valor del descuento aplicado a la reserva';
COMMENT ON COLUMN public.reservations.descuento_porcentaje IS 'Porcentaje de descuento aplicado (0-100)';

-- Actualizar finance_items para incluir descuentos como tipo
-- Ya existe la tabla, solo agregar comentario para clarificar tipos válidos
COMMENT ON COLUMN public.finance_items.type IS 'Tipo de item financiero: ingreso, gasto, descuento';