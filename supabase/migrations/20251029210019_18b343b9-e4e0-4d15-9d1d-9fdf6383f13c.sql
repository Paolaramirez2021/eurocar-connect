-- Create maintenance table
CREATE TABLE public.maintenance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  descripcion TEXT,
  fecha TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  costo DECIMAL(10,2) NOT NULL,
  kms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create finance_items table
CREATE TABLE public.finance_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('ingreso', 'gasto')),
  amount DECIMAL(10,2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ref_id UUID,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agents table for API key authentication
CREATE TABLE public.agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  api_key TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for maintenance
CREATE POLICY "Everyone can view maintenance"
  ON public.maintenance FOR SELECT
  USING (true);

CREATE POLICY "Admins and operativo can create maintenance"
  ON public.maintenance FOR INSERT
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role, 'operativo'::app_role])
  );

CREATE POLICY "Admins can update maintenance"
  ON public.maintenance FOR UPDATE
  USING (
    has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role])
  );

CREATE POLICY "Admins can delete maintenance"
  ON public.maintenance FOR DELETE
  USING (
    has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role])
  );

-- RLS Policies for finance_items
CREATE POLICY "Everyone can view finance items"
  ON public.finance_items FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage finance items"
  ON public.finance_items FOR ALL
  USING (
    has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role])
  );

-- RLS Policies for agents
CREATE POLICY "Admins and socios can view agents"
  ON public.agents FOR SELECT
  USING (
    has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role])
  );

CREATE POLICY "Socios and admins can manage agents"
  ON public.agents FOR ALL
  USING (
    has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role])
  );

-- Create indexes
CREATE INDEX idx_maintenance_vehicle_id ON public.maintenance(vehicle_id);
CREATE INDEX idx_maintenance_fecha ON public.maintenance(fecha DESC);
CREATE INDEX idx_finance_items_vehicle_id ON public.finance_items(vehicle_id);
CREATE INDEX idx_finance_items_date ON public.finance_items(date DESC);
CREATE INDEX idx_finance_items_type ON public.finance_items(type);
CREATE INDEX idx_agents_api_key ON public.agents(api_key) WHERE active = true;

-- Trigger for updated_at on maintenance
CREATE TRIGGER update_maintenance_updated_at
  BEFORE UPDATE ON public.maintenance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on agents
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically create finance_item when maintenance is created
CREATE OR REPLACE FUNCTION public.create_finance_item_for_maintenance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.finance_items (
    vehicle_id,
    type,
    amount,
    date,
    ref_id,
    description
  ) VALUES (
    NEW.vehicle_id,
    'gasto',
    NEW.costo,
    NEW.fecha,
    NEW.id,
    'Mantenimiento: ' || NEW.tipo
  );
  RETURN NEW;
END;
$$;

-- Trigger to create finance_item when maintenance is created
CREATE TRIGGER create_finance_item_on_maintenance
  AFTER INSERT ON public.maintenance
  FOR EACH ROW
  EXECUTE FUNCTION public.create_finance_item_for_maintenance();

-- Function to create finance_item for completed reservations
CREATE OR REPLACE FUNCTION public.create_finance_item_for_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create finance item when reservation becomes completed and has a price
  IF NEW.estado = 'completed' AND OLD.estado != 'completed' AND NEW.price_total IS NOT NULL THEN
    INSERT INTO public.finance_items (
      vehicle_id,
      type,
      amount,
      date,
      ref_id,
      description
    ) VALUES (
      NEW.vehicle_id,
      'ingreso',
      NEW.price_total,
      NEW.updated_at,
      NEW.id,
      'Reserva: ' || NEW.cliente_nombre
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to create finance_item when reservation is completed
CREATE TRIGGER create_finance_item_on_reservation_complete
  AFTER UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.create_finance_item_for_reservation();