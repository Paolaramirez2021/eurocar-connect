-- Add missing columns to customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS foto_documento_url text,
ADD COLUMN IF NOT EXISTS estado text DEFAULT 'activo' CHECK (estado IN ('activo', 'pendiente', 'bloqueado')),
ADD COLUMN IF NOT EXISTS total_reservas integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS monto_total numeric DEFAULT 0;

-- Add index for better search performance
CREATE INDEX IF NOT EXISTS idx_customers_cedula ON public.customers(cedula_pasaporte);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_estado ON public.customers(estado);
CREATE INDEX IF NOT EXISTS idx_customers_nombres ON public.customers(nombres);

-- Create storage bucket for customer documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-documents', 'customer-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for customer documents bucket
CREATE POLICY "Authenticated users can view customer documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'customer-documents');

CREATE POLICY "Admins and comercial can upload customer documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'customer-documents' AND
  (
    has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role, 'comercial'::app_role])
  )
);

CREATE POLICY "Admins and comercial can update customer documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'customer-documents' AND
  (
    has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role, 'comercial'::app_role])
  )
);

CREATE POLICY "Admins can delete customer documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'customer-documents' AND
  has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role])
);

-- Function to update customer stats
CREATE OR REPLACE FUNCTION public.update_customer_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update total_reservas and monto_total for the customer
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.customers
    SET 
      total_reservas = (
        SELECT COUNT(*) 
        FROM public.reservations 
        WHERE customer_id = NEW.customer_id 
        AND estado IN ('confirmed', 'completed')
      ),
      monto_total = (
        SELECT COALESCE(SUM(price_total), 0)
        FROM public.reservations
        WHERE customer_id = NEW.customer_id
        AND estado = 'completed'
      )
    WHERE id = NEW.customer_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.customers
    SET 
      total_reservas = (
        SELECT COUNT(*) 
        FROM public.reservations 
        WHERE customer_id = OLD.customer_id 
        AND estado IN ('confirmed', 'completed')
      ),
      monto_total = (
        SELECT COALESCE(SUM(price_total), 0)
        FROM public.reservations
        WHERE customer_id = OLD.customer_id
        AND estado = 'completed'
      )
    WHERE id = OLD.customer_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to automatically update customer statistics
DROP TRIGGER IF EXISTS update_customer_stats_trigger ON public.reservations;
CREATE TRIGGER update_customer_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.update_customer_stats();

-- Create view for customer statistics
CREATE OR REPLACE VIEW public.customer_stats AS
SELECT 
  c.id,
  c.nombres,
  c.primer_apellido,
  c.segundo_apellido,
  c.cedula_pasaporte,
  c.email,
  c.celular,
  c.estado,
  c.total_reservas,
  c.monto_total,
  c.created_at,
  COUNT(DISTINCT r.id) FILTER (WHERE r.estado IN ('confirmed', 'pending')) as reservas_activas,
  COUNT(DISTINCT r.id) FILTER (WHERE r.estado = 'completed') as reservas_completadas,
  COUNT(DISTINCT ct.id) as contratos_firmados,
  MAX(r.fecha_inicio) as ultima_reserva
FROM public.customers c
LEFT JOIN public.reservations r ON r.customer_id = c.id
LEFT JOIN public.contracts ct ON ct.customer_id = c.id
GROUP BY c.id;