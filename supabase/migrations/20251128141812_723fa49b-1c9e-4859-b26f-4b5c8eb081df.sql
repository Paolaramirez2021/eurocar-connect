-- Función para actualizar el estado de la reserva cuando se crea un contrato
CREATE OR REPLACE FUNCTION public.update_reservation_on_contract_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Actualizar la reserva a confirmed cuando se crea un contrato
  IF NEW.reservation_id IS NOT NULL THEN
    UPDATE public.reservations
    SET estado = 'confirmed',
        updated_at = now()
    WHERE id = NEW.reservation_id
    AND estado = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para cuando se inserta un contrato
CREATE TRIGGER trigger_update_reservation_on_contract_create
AFTER INSERT ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_reservation_on_contract_create();

-- Función para actualizar el estado de la reserva cuando se elimina un contrato
CREATE OR REPLACE FUNCTION public.update_reservation_on_contract_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Volver la reserva a pending cuando se elimina un contrato
  IF OLD.reservation_id IS NOT NULL THEN
    UPDATE public.reservations
    SET estado = 'pending',
        updated_at = now()
    WHERE id = OLD.reservation_id
    AND estado = 'confirmed';
  END IF;
  
  RETURN OLD;
END;
$$;

-- Trigger para cuando se elimina un contrato
CREATE TRIGGER trigger_update_reservation_on_contract_delete
AFTER DELETE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_reservation_on_contract_delete();

-- Actualizar las reservas existentes que ya tienen contratos a confirmed
UPDATE public.reservations r
SET estado = 'confirmed',
    updated_at = now()
FROM public.contracts c
WHERE c.reservation_id = r.id
AND r.estado = 'pending';