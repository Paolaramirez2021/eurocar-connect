-- Tabla para gestionar pagos de Pico y Placa
CREATE TABLE IF NOT EXISTS public.pico_placa_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  pagado BOOLEAN NOT NULL DEFAULT false,
  monto NUMERIC(10,2),
  notas TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(vehicle_id, fecha)
);

-- Tabla para videos de devolución
CREATE TABLE IF NOT EXISTS public.devolucion_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  checklist_id UUID REFERENCES public.checklists(id) ON DELETE SET NULL,
  google_drive_url TEXT NOT NULL,
  google_drive_file_id TEXT,
  filename TEXT NOT NULL,
  fecha_devolucion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duracion_segundos INTEGER,
  tamaño_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pico_placa_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devolucion_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies para pico_placa_payments
CREATE POLICY "Authenticated users can view pico placa payments"
  ON public.pico_placa_payments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and operativo can manage pico placa payments"
  ON public.pico_placa_payments
  FOR ALL
  TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role, 'operativo'::app_role]));

-- RLS Policies para devolucion_videos
CREATE POLICY "Authenticated users can view devolucion videos"
  ON public.devolucion_videos
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and operativo can manage devolucion videos"
  ON public.devolucion_videos
  FOR ALL
  TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role, 'operativo'::app_role, 'comercial'::app_role]));

-- Triggers para updated_at
CREATE TRIGGER update_pico_placa_payments_updated_at
  BEFORE UPDATE ON public.pico_placa_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_devolucion_videos_updated_at
  BEFORE UPDATE ON public.devolucion_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_pico_placa_payments_vehicle_fecha ON public.pico_placa_payments(vehicle_id, fecha);
CREATE INDEX idx_pico_placa_payments_fecha ON public.pico_placa_payments(fecha);
CREATE INDEX idx_devolucion_videos_vehicle ON public.devolucion_videos(vehicle_id);
CREATE INDEX idx_devolucion_videos_reservation ON public.devolucion_videos(reservation_id);
CREATE INDEX idx_devolucion_videos_fecha ON public.devolucion_videos(fecha_devolucion);