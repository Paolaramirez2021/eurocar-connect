-- Añadir columnas necesarias para el nuevo sistema de contratos digitales

-- Columna para tipo de contrato (preliminar o final)
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'final';

-- Columna JSONB para almacenar todos los datos del contrato
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS datos_contrato JSONB;

-- Columnas booleanas para tracking de capturas
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS tiene_firma BOOLEAN DEFAULT false;

ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS tiene_huella BOOLEAN DEFAULT false;

ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS tiene_foto BOOLEAN DEFAULT false;

-- Columna para foto del cliente
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Crear índice para búsquedas por tipo
CREATE INDEX IF NOT EXISTS idx_contracts_tipo ON public.contracts(tipo);

-- Comentarios para documentación
COMMENT ON COLUMN public.contracts.tipo IS 'Tipo de contrato: preliminar (sin firmas) o final (con firma, huella, foto)';
COMMENT ON COLUMN public.contracts.datos_contrato IS 'Datos completos del contrato en formato JSON';
COMMENT ON COLUMN public.contracts.tiene_firma IS 'Indica si el contrato tiene firma digital capturada';
COMMENT ON COLUMN public.contracts.tiene_huella IS 'Indica si el contrato tiene huella digital capturada';
COMMENT ON COLUMN public.contracts.tiene_foto IS 'Indica si el contrato tiene foto del cliente';
