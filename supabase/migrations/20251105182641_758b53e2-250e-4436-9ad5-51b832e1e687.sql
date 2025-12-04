-- Create customers table with all required fields
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Personal Information
  primer_apellido TEXT NOT NULL,
  segundo_apellido TEXT,
  nombres TEXT NOT NULL,
  cedula_pasaporte TEXT NOT NULL UNIQUE,
  ciudad TEXT,
  fecha_nacimiento DATE,
  estado_civil TEXT,
  
  -- License Information
  licencia_numero TEXT,
  licencia_ciudad_expedicion TEXT,
  licencia_fecha_vencimiento DATE,
  
  -- Contact Information
  direccion_residencia TEXT,
  pais TEXT DEFAULT 'Colombia',
  telefono TEXT,
  celular TEXT NOT NULL,
  email TEXT,
  
  -- Work Information
  ocupacion TEXT,
  empresa TEXT,
  direccion_oficina TEXT,
  
  -- Financial Information (sensitive, only for admins)
  banco TEXT,
  numero_tarjeta TEXT,
  
  -- References
  referencia_personal_nombre TEXT,
  referencia_personal_telefono TEXT,
  referencia_comercial_nombre TEXT,
  referencia_comercial_telefono TEXT,
  referencia_familiar_nombre TEXT,
  referencia_familiar_telefono TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add customer_id to reservations table
ALTER TABLE public.reservations 
ADD COLUMN customer_id UUID REFERENCES public.customers(id);

-- Create index for faster lookups
CREATE INDEX idx_customers_cedula ON public.customers(cedula_pasaporte);
CREATE INDEX idx_customers_email ON public.customers(email);
CREATE INDEX idx_reservations_customer ON public.reservations(customer_id);

-- Enable RLS on customers table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers table
CREATE POLICY "Authenticated users can view customers"
ON public.customers
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and comercial can create customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role, 'comercial'::app_role, 'operativo'::app_role])
);

CREATE POLICY "Admins and comercial can update customers"
ON public.customers
FOR UPDATE
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role, 'comercial'::app_role])
);

CREATE POLICY "Admins can delete customers"
ON public.customers
FOR DELETE
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role])
);

-- Add trigger for updated_at
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();