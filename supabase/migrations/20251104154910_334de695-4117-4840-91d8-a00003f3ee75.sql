-- Trigger para actualizar estado del vehículo al crear una reserva
CREATE OR REPLACE FUNCTION public.update_vehicle_estado_on_reservation()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo actualizar si la reserva está confirmada o pending
  IF NEW.estado IN ('confirmed', 'pending') THEN
    UPDATE public.vehicles
    SET estado = 'alquilado',
        updated_at = now()
    WHERE id = NEW.vehicle_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_reservation_created
  AFTER INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_vehicle_estado_on_reservation();

-- Trigger para actualizar estado del vehículo al finalizar una reserva
CREATE OR REPLACE FUNCTION public.update_vehicle_estado_on_reservation_end()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la reserva cambia a completed o cancelled, liberar el vehículo
  IF NEW.estado IN ('completed', 'cancelled') AND OLD.estado NOT IN ('completed', 'cancelled') THEN
    UPDATE public.vehicles
    SET estado = 'disponible',
        updated_at = now()
    WHERE id = NEW.vehicle_id;
  END IF;
  
  -- Si la reserva cambia de cancelled/completed a confirmed/pending, volver a alquilar
  IF NEW.estado IN ('confirmed', 'pending') AND OLD.estado IN ('completed', 'cancelled') THEN
    UPDATE public.vehicles
    SET estado = 'alquilado',
        updated_at = now()
    WHERE id = NEW.vehicle_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_reservation_updated
  AFTER UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_vehicle_estado_on_reservation_end();

-- Trigger para actualizar estado del vehículo al crear mantenimiento
CREATE OR REPLACE FUNCTION public.update_vehicle_estado_on_maintenance()
RETURNS TRIGGER AS $$
BEGIN
  -- Poner vehículo en mantenimiento al crear un registro de mantenimiento
  UPDATE public.vehicles
  SET estado = 'mantenimiento',
      updated_at = now()
  WHERE id = NEW.vehicle_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_maintenance_created
  AFTER INSERT ON public.maintenance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_vehicle_estado_on_maintenance();

-- Trigger para actualizar kilometraje y fechas al actualizar mantenimiento
CREATE OR REPLACE FUNCTION public.update_vehicle_on_maintenance_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar kilometraje si se proporciona
  IF NEW.kms IS NOT NULL THEN
    UPDATE public.vehicles
    SET kilometraje_actual = NEW.kms,
        updated_at = now()
    WHERE id = NEW.vehicle_id;
  END IF;
  
  -- Actualizar fechas según el tipo de mantenimiento
  IF NEW.tipo ILIKE '%soat%' THEN
    UPDATE public.vehicles
    SET fecha_soat = NEW.fecha + INTERVAL '1 year',
        updated_at = now()
    WHERE id = NEW.vehicle_id;
  END IF;
  
  IF NEW.tipo ILIKE '%tecnomecánica%' OR NEW.tipo ILIKE '%tecnomecanica%' THEN
    UPDATE public.vehicles
    SET fecha_tecnomecanica = NEW.fecha + INTERVAL '1 year',
        updated_at = now()
    WHERE id = NEW.vehicle_id;
  END IF;
  
  IF NEW.tipo ILIKE '%impuesto%' THEN
    UPDATE public.vehicles
    SET fecha_impuestos = NEW.fecha + INTERVAL '1 year',
        updated_at = now()
    WHERE id = NEW.vehicle_id;
  END IF;
  
  -- Después de completar el mantenimiento, devolver vehículo a disponible
  -- Solo si no hay otras reservas activas
  IF NOT EXISTS (
    SELECT 1 FROM public.reservations
    WHERE vehicle_id = NEW.vehicle_id
    AND estado IN ('confirmed', 'pending')
    AND fecha_fin >= now()
  ) THEN
    UPDATE public.vehicles
    SET estado = 'disponible',
        updated_at = now()
    WHERE id = NEW.vehicle_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_maintenance_updated
  AFTER UPDATE ON public.maintenance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_vehicle_on_maintenance_complete();

-- Función para generar alertas de mantenimiento próximas
CREATE OR REPLACE FUNCTION public.check_maintenance_alerts()
RETURNS void AS $$
DECLARE
  v_vehicle RECORD;
BEGIN
  -- Alertas de SOAT próximo a vencer (1 semana antes)
  FOR v_vehicle IN
    SELECT id, placa, marca, modelo, fecha_soat
    FROM public.vehicles
    WHERE fecha_soat IS NOT NULL
    AND fecha_soat <= CURRENT_DATE + INTERVAL '7 days'
    AND fecha_soat > CURRENT_DATE
  LOOP
    INSERT INTO public.alerts_maintenance (vehicle_id, tipo_alerta, descripcion, fecha_evento, estado)
    VALUES (
      v_vehicle.id,
      'SOAT próximo a vencer',
      format('El SOAT del vehículo %s %s (placa %s) vence el %s', 
        v_vehicle.marca, v_vehicle.modelo, v_vehicle.placa, 
        to_char(v_vehicle.fecha_soat, 'DD/MM/YYYY')),
      v_vehicle.fecha_soat,
      'activa'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  -- Alertas de tecnomecánica próxima a vencer
  FOR v_vehicle IN
    SELECT id, placa, marca, modelo, fecha_tecnomecanica
    FROM public.vehicles
    WHERE fecha_tecnomecanica IS NOT NULL
    AND fecha_tecnomecanica <= CURRENT_DATE + INTERVAL '7 days'
    AND fecha_tecnomecanica > CURRENT_DATE
  LOOP
    INSERT INTO public.alerts_maintenance (vehicle_id, tipo_alerta, descripcion, fecha_evento, estado)
    VALUES (
      v_vehicle.id,
      'Tecnomecánica próxima a vencer',
      format('La tecnomecánica del vehículo %s %s (placa %s) vence el %s', 
        v_vehicle.marca, v_vehicle.modelo, v_vehicle.placa, 
        to_char(v_vehicle.fecha_tecnomecanica, 'DD/MM/YYYY')),
      v_vehicle.fecha_tecnomecanica,
      'activa'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  -- Alertas de impuestos próximos a vencer
  FOR v_vehicle IN
    SELECT id, placa, marca, modelo, fecha_impuestos
    FROM public.vehicles
    WHERE fecha_impuestos IS NOT NULL
    AND fecha_impuestos <= CURRENT_DATE + INTERVAL '7 days'
    AND fecha_impuestos > CURRENT_DATE
  LOOP
    INSERT INTO public.alerts_maintenance (vehicle_id, tipo_alerta, descripcion, fecha_evento, estado)
    VALUES (
      v_vehicle.id,
      'Impuestos próximos a vencer',
      format('Los impuestos del vehículo %s %s (placa %s) vencen el %s', 
        v_vehicle.marca, v_vehicle.modelo, v_vehicle.placa, 
        to_char(v_vehicle.fecha_impuestos, 'DD/MM/YYYY')),
      v_vehicle.fecha_impuestos,
      'activa'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;