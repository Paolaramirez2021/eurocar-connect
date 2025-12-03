-- Create settings table for global configuration
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Only admins and socios can view settings
CREATE POLICY "Admins and socios can view settings"
ON public.settings
FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));

-- Only admins and socios can manage settings
CREATE POLICY "Admins and socios can manage settings"
ON public.settings
FOR ALL
USING (has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));

-- Trigger to update updated_at
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.settings (key, value) VALUES
  ('company_name', '{"value": "EuroCar Rental"}'::jsonb),
  ('company_description', '{"value": "Sistema de gestión de renta de vehículos"}'::jsonb),
  ('timezone', '{"value": "America/Bogota"}'::jsonb),
  ('base_city', '{"value": "Bogotá"}'::jsonb),
  ('default_currency', '{"value": "COP"}'::jsonb),
  ('iva_percentage', '{"value": 19}'::jsonb),
  ('min_reservation_days', '{"value": 1}'::jsonb),
  ('notifications_enabled', '{"maintenance": true, "soat": true, "tecnomecanica": true, "impuestos": true, "reservations": true, "contracts": true, "employee_clock": true}'::jsonb),
  ('notification_methods', '{"internal": true, "email": true, "push": false}'::jsonb),
  ('notification_frequency', '{"value": "12h"}'::jsonb),
  ('integrations', '{"google_workspace": {"enabled": false}, "gpt": {"enabled": true}, "stripe": {"enabled": false}, "mercadopago": {"enabled": false}}'::jsonb),
  ('security_2fa', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;