-- Create alerts table without generated column
CREATE TABLE IF NOT EXISTS public.alerts_maintenance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  tipo_alerta TEXT NOT NULL CHECK (tipo_alerta IN ('SOAT', 'Tecnomecánica', 'Cambio de Aceite', 'Llantas', 'Pastillas', 'Impuestos')),
  descripcion TEXT NOT NULL,
  fecha_evento DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'atendida', 'vencida')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add missing maintenance tracking columns to vehicles table
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS ultimo_cambio_aceite_km INTEGER,
ADD COLUMN IF NOT EXISTS ultimo_cambio_llantas_km INTEGER,
ADD COLUMN IF NOT EXISTS ultimo_cambio_pastillas_km INTEGER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_alerts_maintenance_vehicle_id ON public.alerts_maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_alerts_maintenance_estado ON public.alerts_maintenance(estado);
CREATE INDEX IF NOT EXISTS idx_alerts_maintenance_fecha_evento ON public.alerts_maintenance(fecha_evento);

-- Enable RLS
ALTER TABLE public.alerts_maintenance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view alerts" 
ON public.alerts_maintenance 
FOR SELECT 
USING (true);

CREATE POLICY "Admins and operativo can create alerts" 
ON public.alerts_maintenance 
FOR INSERT 
WITH CHECK (has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role, 'operativo'::app_role]));

CREATE POLICY "Admins and operativo can update alerts" 
ON public.alerts_maintenance 
FOR UPDATE 
USING (has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role, 'operativo'::app_role]));

CREATE POLICY "Admins can delete alerts" 
ON public.alerts_maintenance 
FOR DELETE 
USING (has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));

-- Trigger to update updated_at
CREATE TRIGGER update_alerts_maintenance_updated_at
BEFORE UPDATE ON public.alerts_maintenance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically update estado based on fecha_evento
CREATE OR REPLACE FUNCTION public.update_alerts_estado()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update to vencida if fecha_evento has passed and currently activa
  UPDATE public.alerts_maintenance
  SET estado = 'vencida'
  WHERE estado = 'activa'
    AND fecha_evento < CURRENT_DATE;
END;
$$;

-- Create view with calculated dias_restantes
CREATE OR REPLACE VIEW public.alerts_maintenance_view AS
SELECT 
  id,
  vehicle_id,
  tipo_alerta,
  descripcion,
  fecha_evento,
  (fecha_evento - CURRENT_DATE) AS dias_restantes,
  estado,
  created_at,
  updated_at
FROM public.alerts_maintenance;

-- Grant permissions on view
GRANT SELECT ON public.alerts_maintenance_view TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_alerts_estado() TO authenticated;