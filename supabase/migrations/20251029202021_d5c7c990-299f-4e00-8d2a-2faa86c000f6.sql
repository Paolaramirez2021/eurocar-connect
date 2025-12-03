-- Create vehicles table
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placa TEXT NOT NULL UNIQUE,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  year INTEGER NOT NULL,
  color TEXT,
  kms_actuales INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'disponible', -- disponible, rentado, mantenimiento
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create checklist_templates table
CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- entrega, devolucion, mantenimiento
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create checklist_template_items table
CREATE TABLE IF NOT EXISTS public.checklist_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL, -- checkbox, text, photo, number
  order_index INTEGER NOT NULL DEFAULT 0,
  required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create checklists table (instances of templates)
CREATE TABLE IF NOT EXISTS public.checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.checklist_templates(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  rental_id UUID, -- nullable, for future rental system
  type TEXT NOT NULL, -- entrega, devolucion
  completed_by UUID NOT NULL REFERENCES public.profiles(id),
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'completed', -- draft, completed
  kms_registro INTEGER, -- kms at time of checklist
  observaciones_generales TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create checklist_items table (actual responses)
CREATE TABLE IF NOT EXISTS public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  template_item_id UUID NOT NULL REFERENCES public.checklist_template_items(id),
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  estado TEXT, -- ok, not_ok, na
  observaciones TEXT,
  foto_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vehicles
CREATE POLICY "Everyone can view vehicles"
  ON public.vehicles FOR SELECT
  USING (true);

CREATE POLICY "Admins and socios can manage vehicles"
  ON public.vehicles FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));

-- RLS Policies for checklist_templates
CREATE POLICY "Everyone can view templates"
  ON public.checklist_templates FOR SELECT
  USING (true);

CREATE POLICY "Admins and socios can manage templates"
  ON public.checklist_templates FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));

-- RLS Policies for checklist_template_items
CREATE POLICY "Everyone can view template items"
  ON public.checklist_template_items FOR SELECT
  USING (true);

CREATE POLICY "Admins and socios can manage template items"
  ON public.checklist_template_items FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));

-- RLS Policies for checklists
CREATE POLICY "Everyone can view checklists"
  ON public.checklists FOR SELECT
  USING (true);

CREATE POLICY "Comercial and operativo can create checklists"
  ON public.checklists FOR INSERT
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role, 'comercial'::app_role, 'operativo'::app_role])
  );

CREATE POLICY "Admins can update checklists"
  ON public.checklists FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));

-- RLS Policies for checklist_items
CREATE POLICY "Everyone can view checklist items"
  ON public.checklist_items FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their checklist items"
  ON public.checklist_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.checklists
      WHERE checklists.id = checklist_items.checklist_id
      AND checklists.completed_by = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_vehicles_placa ON public.vehicles(placa);
CREATE INDEX idx_vehicles_estado ON public.vehicles(estado);
CREATE INDEX idx_checklist_template_items_template ON public.checklist_template_items(template_id);
CREATE INDEX idx_checklists_vehicle ON public.checklists(vehicle_id);
CREATE INDEX idx_checklists_type ON public.checklists(type);
CREATE INDEX idx_checklist_items_checklist ON public.checklist_items(checklist_id);

-- Triggers for updated_at
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checklist_templates_updated_at
  BEFORE UPDATE ON public.checklist_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update vehicle kms on devolucion
CREATE OR REPLACE FUNCTION public.update_vehicle_kms_on_devolucion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only update if this is a devolucion checklist and has kms_registro
  IF NEW.type = 'devolucion' AND NEW.kms_registro IS NOT NULL THEN
    UPDATE public.vehicles
    SET kms_actuales = NEW.kms_registro,
        updated_at = now()
    WHERE id = NEW.vehicle_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_vehicle_kms
  AFTER INSERT OR UPDATE ON public.checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_vehicle_kms_on_devolucion();