-- Create reservations table
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  cliente_nombre TEXT NOT NULL,
  cliente_contacto TEXT NOT NULL,
  fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  fecha_fin TIMESTAMP WITH TIME ZONE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, completed, cancelled
  price_total DECIMAL(10,2),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  source TEXT, -- web, phone, walk-in, etc
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_dates CHECK (fecha_fin > fecha_inicio)
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL, -- maintenance_due, document_expiry, inspection_due, km_based
  mensaje TEXT NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  recipients_roles TEXT[] NOT NULL DEFAULT ARRAY['administrador'::TEXT],
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  meta JSONB, -- additional data like next_change_km, document_type, etc
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create maintenance_schedules table for tracking maintenance intervals
CREATE TABLE IF NOT EXISTS public.maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- oil_change, tire_rotation, brake_check, etc
  interval_km INTEGER, -- km interval
  interval_days INTEGER, -- day interval
  last_change_km INTEGER,
  last_change_date TIMESTAMP WITH TIME ZONE,
  next_due_km INTEGER,
  next_due_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reservations
CREATE POLICY "Everyone can view reservations"
  ON public.reservations FOR SELECT
  USING (true);

CREATE POLICY "Comercial and operativo can create reservations"
  ON public.reservations FOR INSERT
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role, 'comercial'::app_role, 'operativo'::app_role])
  );

CREATE POLICY "Admins and comercial can update reservations"
  ON public.reservations FOR UPDATE
  USING (
    has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role, 'comercial'::app_role])
  );

CREATE POLICY "Admins can delete reservations"
  ON public.reservations FOR DELETE
  USING (has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));

-- RLS Policies for alerts
CREATE POLICY "Everyone can view alerts"
  ON public.alerts FOR SELECT
  USING (true);

CREATE POLICY "System can create alerts"
  ON public.alerts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update alerts"
  ON public.alerts FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));

CREATE POLICY "Admins can delete alerts"
  ON public.alerts FOR DELETE
  USING (has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));

-- RLS Policies for maintenance_schedules
CREATE POLICY "Everyone can view maintenance schedules"
  ON public.maintenance_schedules FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage maintenance schedules"
  ON public.maintenance_schedules FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));

-- Indexes
CREATE INDEX idx_reservations_vehicle ON public.reservations(vehicle_id);
CREATE INDEX idx_reservations_dates ON public.reservations(fecha_inicio, fecha_fin);
CREATE INDEX idx_reservations_estado ON public.reservations(estado);
CREATE INDEX idx_alerts_vehicle ON public.alerts(vehicle_id);
CREATE INDEX idx_alerts_resolved ON public.alerts(is_resolved);
CREATE INDEX idx_alerts_priority ON public.alerts(priority);
CREATE INDEX idx_maintenance_vehicle ON public.maintenance_schedules(vehicle_id);

-- Triggers
CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_schedules_updated_at
  BEFORE UPDATE ON public.maintenance_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check reservation availability
CREATE OR REPLACE FUNCTION public.check_reservation_availability(
  p_vehicle_id UUID,
  p_fecha_inicio TIMESTAMP WITH TIME ZONE,
  p_fecha_fin TIMESTAMP WITH TIME ZONE,
  p_exclude_reservation_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check for overlapping reservations (confirmed or pending only)
  RETURN NOT EXISTS (
    SELECT 1
    FROM public.reservations
    WHERE vehicle_id = p_vehicle_id
      AND estado IN ('confirmed', 'pending')
      AND id != COALESCE(p_exclude_reservation_id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND (
        -- New reservation starts during existing reservation
        (p_fecha_inicio >= fecha_inicio AND p_fecha_inicio < fecha_fin)
        OR
        -- New reservation ends during existing reservation
        (p_fecha_fin > fecha_inicio AND p_fecha_fin <= fecha_fin)
        OR
        -- New reservation completely encompasses existing reservation
        (p_fecha_inicio <= fecha_inicio AND p_fecha_fin >= fecha_fin)
      )
  );
END;
$$;

-- Function to generate km-based alerts
CREATE OR REPLACE FUNCTION public.generate_km_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule RECORD;
  v_vehicle RECORD;
  v_alert_exists BOOLEAN;
BEGIN
  FOR v_schedule IN
    SELECT ms.*, v.placa, v.kms_actuales
    FROM public.maintenance_schedules ms
    JOIN public.vehicles v ON v.id = ms.vehicle_id
    WHERE ms.is_active = true
      AND ms.interval_km IS NOT NULL
      AND ms.last_change_km IS NOT NULL
  LOOP
    -- Calculate next due km
    UPDATE public.maintenance_schedules
    SET next_due_km = v_schedule.last_change_km + v_schedule.interval_km
    WHERE id = v_schedule.id;
    
    -- Check if alert should be created (within 500km of due)
    IF v_schedule.kms_actuales >= (v_schedule.last_change_km + v_schedule.interval_km - 500) THEN
      -- Check if alert already exists
      SELECT EXISTS (
        SELECT 1 FROM public.alerts
        WHERE vehicle_id = v_schedule.vehicle_id
          AND tipo = 'km_based'
          AND is_resolved = false
          AND meta->>'schedule_id' = v_schedule.id::TEXT
      ) INTO v_alert_exists;
      
      IF NOT v_alert_exists THEN
        INSERT INTO public.alerts (
          tipo,
          mensaje,
          vehicle_id,
          recipients_roles,
          priority,
          meta
        ) VALUES (
          'km_based',
          format('Mantenimiento %s próximo para %s (Actual: %s km, Debido: %s km)',
            v_schedule.tipo,
            v_schedule.placa,
            v_schedule.kms_actuales,
            v_schedule.last_change_km + v_schedule.interval_km
          ),
          v_schedule.vehicle_id,
          ARRAY['administrador', 'operativo'],
          CASE 
            WHEN v_schedule.kms_actuales >= (v_schedule.last_change_km + v_schedule.interval_km) THEN 'critical'
            ELSE 'high'
          END,
          jsonb_build_object(
            'schedule_id', v_schedule.id,
            'tipo', v_schedule.tipo,
            'current_km', v_schedule.kms_actuales,
            'due_km', v_schedule.last_change_km + v_schedule.interval_km
          )
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Function to generate date-based alerts (7 days before)
CREATE OR REPLACE FUNCTION public.generate_date_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule RECORD;
  v_alert_exists BOOLEAN;
BEGIN
  FOR v_schedule IN
    SELECT ms.*, v.placa
    FROM public.maintenance_schedules ms
    JOIN public.vehicles v ON v.id = ms.vehicle_id
    WHERE ms.is_active = true
      AND ms.interval_days IS NOT NULL
      AND ms.last_change_date IS NOT NULL
  LOOP
    -- Calculate next due date
    UPDATE public.maintenance_schedules
    SET next_due_date = v_schedule.last_change_date + (v_schedule.interval_days || ' days')::INTERVAL
    WHERE id = v_schedule.id;
    
    -- Check if alert should be created (7 days before due)
    IF now() >= (v_schedule.last_change_date + (v_schedule.interval_days || ' days')::INTERVAL - INTERVAL '7 days') THEN
      -- Check if alert already exists
      SELECT EXISTS (
        SELECT 1 FROM public.alerts
        WHERE vehicle_id = v_schedule.vehicle_id
          AND tipo = 'maintenance_due'
          AND is_resolved = false
          AND meta->>'schedule_id' = v_schedule.id::TEXT
      ) INTO v_alert_exists;
      
      IF NOT v_alert_exists THEN
        INSERT INTO public.alerts (
          tipo,
          mensaje,
          vehicle_id,
          recipients_roles,
          priority,
          meta
        ) VALUES (
          'maintenance_due',
          format('Mantenimiento %s próximo para %s (Vence: %s)',
            v_schedule.tipo,
            v_schedule.placa,
            (v_schedule.last_change_date + (v_schedule.interval_days || ' days')::INTERVAL)::DATE
          ),
          v_schedule.vehicle_id,
          ARRAY['administrador', 'operativo'],
          CASE 
            WHEN now() >= (v_schedule.last_change_date + (v_schedule.interval_days || ' days')::INTERVAL) THEN 'critical'
            ELSE 'high'
          END,
          jsonb_build_object(
            'schedule_id', v_schedule.id,
            'tipo', v_schedule.tipo,
            'due_date', v_schedule.last_change_date + (v_schedule.interval_days || ' days')::INTERVAL
          )
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;