-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));

-- System can create notifications
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users can update their own notifications
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON public.notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Update settings table to add new configuration keys
INSERT INTO public.settings (key, value) VALUES
  ('reserva_timeout_hours', '2'::jsonb),
  ('envio_contrato_previo', 'true'::jsonb),
  ('festivos_no_pico_y_placa', 'true'::jsonb),
  ('ciudad_pico_placa', '"Bogotá"'::jsonb),
  ('notificaciones_reservas_habilitadas', 'true'::jsonb),
  ('pago_obligatorio', 'true'::jsonb),
  ('regenerar_estado_vehiculo', 'true'::jsonb),
  ('colores_calendario', '{"rentado": "#ef4444", "reservado": "#22c55e", "mantenimiento": "#f97316", "disponible": "#ffffff"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Function to create notification for admins
CREATE OR REPLACE FUNCTION public.notify_admins(
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Get all admin and socio users
  FOR v_admin_id IN
    SELECT DISTINCT user_id 
    FROM public.user_roles 
    WHERE role IN ('administrador', 'socio_principal')
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (v_admin_id, p_type, p_title, p_message, p_metadata);
  END LOOP;
END;
$$;

-- Trigger to notify admins when reservation expires
CREATE OR REPLACE FUNCTION public.notify_reservation_expired()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.estado = 'cancelled' AND OLD.estado = 'pending_no_payment' THEN
    PERFORM public.notify_admins(
      'reserva_expirada',
      'Reserva expirada automáticamente',
      format('La reserva %s ha expirado por falta de pago', NEW.id),
      jsonb_build_object(
        'reservation_id', NEW.id,
        'vehicle_id', NEW.vehicle_id,
        'cliente_nombre', NEW.cliente_nombre
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_reservation_expired
AFTER UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.notify_reservation_expired();