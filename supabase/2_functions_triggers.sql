-- ============================================================
-- EUROCAR RENTAL - DATABASE SCHEMA
-- File: 2_functions_triggers.sql
-- Description: Functions and Triggers
-- ============================================================

-- ============================================================
-- 1. UTILITY FUNCTIONS
-- ============================================================

-- Function: Update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Function: Handle new user (create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );
    
    PERFORM public.log_audit(
        'USER_SIGNUP',
        'profiles',
        NEW.id,
        NULL,
        jsonb_build_object('email', NEW.email),
        'New user registered'
    );
    
    RETURN NEW;
END;
$$;

-- ============================================================
-- 2. ROLE CHECKING FUNCTIONS
-- ============================================================

-- Function: Check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Function: Check if user has any of the specified roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = ANY(_roles)
    )
$$;

-- Function: Get user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.user_roles
    WHERE user_id = _user_id
$$;

-- ============================================================
-- 3. AUDIT FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_audit(
    p_action_type TEXT,
    p_table_name TEXT DEFAULT NULL,
    p_record_id UUID DEFAULT NULL,
    p_old_data JSONB DEFAULT NULL,
    p_new_data JSONB DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_audit_id UUID;
BEGIN
    INSERT INTO public.audit_log (
        user_id,
        action_type,
        table_name,
        record_id,
        old_data,
        new_data,
        description
    ) VALUES (
        auth.uid(),
        p_action_type,
        p_table_name,
        p_record_id,
        p_old_data,
        p_new_data,
        p_description
    ) RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$;

-- ============================================================
-- 4. CONTRACT FUNCTIONS
-- ============================================================

-- Function: Generate contract number
CREATE OR REPLACE FUNCTION public.generate_contract_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    next_num INTEGER;
    year_part TEXT;
BEGIN
    year_part := TO_CHAR(NOW(), 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(contract_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_num
    FROM public.contracts
    WHERE contract_number LIKE 'CTR-' || year_part || '-%';
    
    RETURN 'CTR-' || year_part || '-' || LPAD(next_num::TEXT, 5, '0');
END;
$$;

-- Function: Set contract number on insert
CREATE OR REPLACE FUNCTION public.set_contract_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
        NEW.contract_number := generate_contract_number();
    END IF;
    RETURN NEW;
END;
$$;

-- Function: Prevent modification of locked contracts
CREATE OR REPLACE FUNCTION public.prevent_contract_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.is_locked = true THEN
        RAISE EXCEPTION 'Cannot modify a locked contract. Contract ID: %', OLD.id;
    END IF;
    RETURN NEW;
END;
$$;

-- Function: Log contract signing
CREATE OR REPLACE FUNCTION public.log_contract_signing()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM public.log_audit(
        'CONTRACT_SIGNED',
        'contracts',
        NEW.id,
        NULL,
        jsonb_build_object(
            'contract_number', NEW.contract_number,
            'customer_name', NEW.customer_name,
            'vehicle_id', NEW.vehicle_id,
            'total_amount', NEW.total_amount,
            'was_offline', NEW.was_offline
        ),
        'Contract signed: ' || NEW.contract_number
    );
    RETURN NEW;
END;
$$;

-- ============================================================
-- 5. RESERVATION FUNCTIONS
-- ============================================================

-- Function: Check reservation availability
CREATE OR REPLACE FUNCTION public.check_reservation_availability(
    p_vehicle_id UUID,
    p_fecha_inicio TIMESTAMPTZ,
    p_fecha_fin TIMESTAMPTZ,
    p_exclude_reservation_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1
        FROM public.reservations
        WHERE vehicle_id = p_vehicle_id
          AND estado IN ('confirmed', 'pending')
          AND id != COALESCE(p_exclude_reservation_id, '00000000-0000-0000-0000-000000000000'::UUID)
          AND (
              (p_fecha_inicio >= fecha_inicio AND p_fecha_inicio < fecha_fin)
              OR (p_fecha_fin > fecha_inicio AND p_fecha_fin <= fecha_fin)
              OR (p_fecha_inicio <= fecha_inicio AND p_fecha_fin >= fecha_fin)
          )
    );
END;
$$;

-- Function: Update reservation on contract create
CREATE OR REPLACE FUNCTION public.update_reservation_on_contract_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- Function: Update reservation on contract delete
CREATE OR REPLACE FUNCTION public.update_reservation_on_contract_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- Function: Notify expired reservation
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

-- ============================================================
-- 6. VEHICLE STATUS FUNCTIONS
-- ============================================================

-- Function: Update vehicle status on reservation
CREATE OR REPLACE FUNCTION public.update_vehicle_estado_on_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.estado IN ('confirmed', 'pending') THEN
        UPDATE public.vehicles
        SET estado = 'alquilado',
            updated_at = now()
        WHERE id = NEW.vehicle_id;
    END IF;
    RETURN NEW;
END;
$$;

-- Function: Update vehicle status on reservation end
CREATE OR REPLACE FUNCTION public.update_vehicle_estado_on_reservation_end()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.estado IN ('completed', 'cancelled') AND OLD.estado NOT IN ('completed', 'cancelled') THEN
        UPDATE public.vehicles
        SET estado = 'disponible',
            updated_at = now()
        WHERE id = NEW.vehicle_id;
    END IF;
    
    IF NEW.estado IN ('confirmed', 'pending') AND OLD.estado IN ('completed', 'cancelled') THEN
        UPDATE public.vehicles
        SET estado = 'alquilado',
            updated_at = now()
        WHERE id = NEW.vehicle_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Function: Update vehicle status on maintenance
CREATE OR REPLACE FUNCTION public.update_vehicle_estado_on_maintenance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.vehicles
    SET estado = 'mantenimiento',
        updated_at = now()
    WHERE id = NEW.vehicle_id;
    RETURN NEW;
END;
$$;

-- Function: Update vehicle on maintenance complete
CREATE OR REPLACE FUNCTION public.update_vehicle_on_maintenance_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.kms IS NOT NULL THEN
        UPDATE public.vehicles
        SET kilometraje_actual = NEW.kms,
            updated_at = now()
        WHERE id = NEW.vehicle_id;
    END IF;
    
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
$$;

-- Function: Update vehicle kms on devolucion
CREATE OR REPLACE FUNCTION public.update_vehicle_kms_on_devolucion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.type = 'devolucion' AND NEW.kms_registro IS NOT NULL THEN
        UPDATE public.vehicles
        SET kilometraje_actual = NEW.kms_registro,
            updated_at = now()
        WHERE id = NEW.vehicle_id;
    END IF;
    RETURN NEW;
END;
$$;

-- ============================================================
-- 7. CUSTOMER STATS FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_customer_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- ============================================================
-- 8. MAINTENANCE ALERT FUNCTIONS
-- ============================================================

-- Function: Check maintenance alerts
CREATE OR REPLACE FUNCTION public.check_maintenance_alerts()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_vehicle RECORD;
BEGIN
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
$$;

-- Function: Update alerts estado
CREATE OR REPLACE FUNCTION public.update_alerts_estado()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.alerts_maintenance
    SET estado = 'vencida'
    WHERE estado = 'activa'
      AND fecha_evento < CURRENT_DATE;
END;
$$;

-- Function: Resolve alert
CREATE OR REPLACE FUNCTION public.resolve_alert(p_alert_id UUID, p_descripcion TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.alerts
    SET is_resolved = true,
        resolved_at = now(),
        resolved_by = auth.uid()
    WHERE id = p_alert_id;
    
    PERFORM public.log_audit(
        'ALERT_RESOLVED',
        'alerts',
        p_alert_id,
        NULL,
        jsonb_build_object('alert_id', p_alert_id),
        COALESCE(p_descripcion, 'Alerta marcada como resuelta')
    );
END;
$$;

-- Function: Mark maintenance alert resolved
CREATE OR REPLACE FUNCTION public.mark_maintenance_alert_resolved(p_alert_id UUID, p_descripcion TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.alerts_maintenance
    SET estado = 'resuelta',
        updated_at = now()
    WHERE id = p_alert_id;
    
    PERFORM public.log_audit(
        'MAINTENANCE_ALERT_RESOLVED',
        'alerts_maintenance',
        p_alert_id,
        NULL,
        jsonb_build_object('alert_id', p_alert_id),
        COALESCE(p_descripcion, 'Alerta de mantenimiento marcada como resuelta')
    );
END;
$$;

-- Function: Generate KM alerts
CREATE OR REPLACE FUNCTION public.generate_km_alerts()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_schedule RECORD;
    v_alert_exists BOOLEAN;
BEGIN
    FOR v_schedule IN
        SELECT ms.*, v.placa, v.kilometraje_actual
        FROM public.maintenance_schedules ms
        JOIN public.vehicles v ON v.id = ms.vehicle_id
        WHERE ms.is_active = true
          AND ms.interval_km IS NOT NULL
          AND ms.last_change_km IS NOT NULL
    LOOP
        UPDATE public.maintenance_schedules
        SET next_due_km = v_schedule.last_change_km + v_schedule.interval_km
        WHERE id = v_schedule.id;
        
        IF v_schedule.kilometraje_actual >= (v_schedule.last_change_km + v_schedule.interval_km - 500) THEN
            SELECT EXISTS (
                SELECT 1 FROM public.alerts
                WHERE vehicle_id = v_schedule.vehicle_id
                  AND tipo = 'km_based'
                  AND is_resolved = false
                  AND meta->>'schedule_id' = v_schedule.id::TEXT
            ) INTO v_alert_exists;
            
            IF NOT v_alert_exists THEN
                INSERT INTO public.alerts (
                    tipo, mensaje, vehicle_id, recipients_roles, priority, meta
                ) VALUES (
                    'km_based',
                    format('Mantenimiento %s próximo para %s (Actual: %s km, Debido: %s km)',
                        v_schedule.tipo, v_schedule.placa, v_schedule.kilometraje_actual,
                        v_schedule.last_change_km + v_schedule.interval_km),
                    v_schedule.vehicle_id,
                    ARRAY['administrador', 'operativo'],
                    CASE 
                        WHEN v_schedule.kilometraje_actual >= (v_schedule.last_change_km + v_schedule.interval_km) THEN 'critical'
                        ELSE 'high'
                    END,
                    jsonb_build_object(
                        'schedule_id', v_schedule.id,
                        'tipo', v_schedule.tipo,
                        'current_km', v_schedule.kilometraje_actual,
                        'due_km', v_schedule.last_change_km + v_schedule.interval_km
                    )
                );
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- Function: Generate date alerts
CREATE OR REPLACE FUNCTION public.generate_date_alerts()
RETURNS VOID
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
        UPDATE public.maintenance_schedules
        SET next_due_date = v_schedule.last_change_date + (v_schedule.interval_days || ' days')::INTERVAL
        WHERE id = v_schedule.id;
        
        IF now() >= (v_schedule.last_change_date + (v_schedule.interval_days || ' days')::INTERVAL - INTERVAL '7 days') THEN
            SELECT EXISTS (
                SELECT 1 FROM public.alerts
                WHERE vehicle_id = v_schedule.vehicle_id
                  AND tipo = 'maintenance_due'
                  AND is_resolved = false
                  AND meta->>'schedule_id' = v_schedule.id::TEXT
            ) INTO v_alert_exists;
            
            IF NOT v_alert_exists THEN
                INSERT INTO public.alerts (
                    tipo, mensaje, vehicle_id, recipients_roles, priority, meta
                ) VALUES (
                    'maintenance_due',
                    format('Mantenimiento %s próximo para %s (Vence: %s)',
                        v_schedule.tipo, v_schedule.placa,
                        (v_schedule.last_change_date + (v_schedule.interval_days || ' days')::INTERVAL)::DATE),
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

-- ============================================================
-- 9. NOTIFICATION FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_admins(
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id UUID;
BEGIN
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

-- ============================================================
-- 10. GEOFENCE FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_within_geofence(
    p_latitude NUMERIC,
    p_longitude NUMERIC,
    p_zone_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_distance DECIMAL;
    v_radius INTEGER;
BEGIN
    IF p_zone_id IS NOT NULL THEN
        SELECT 
            (6371000 * acos(
                cos(radians(p_latitude)) * 
                cos(radians(latitude)) * 
                cos(radians(longitude) - radians(p_longitude)) + 
                sin(radians(p_latitude)) * 
                sin(radians(latitude))
            )),
            radius_meters
        INTO v_distance, v_radius
        FROM public.geofence_zones
        WHERE id = p_zone_id AND is_active = true;
        
        RETURN v_distance <= v_radius;
    END IF;
    
    RETURN EXISTS (
        SELECT 1
        FROM public.geofence_zones
        WHERE is_active = true
        AND (6371000 * acos(
            cos(radians(p_latitude)) * 
            cos(radians(latitude)) * 
            cos(radians(longitude) - radians(p_longitude)) + 
            sin(radians(p_latitude)) * 
            sin(radians(latitude))
        )) <= radius_meters
    );
END;
$$;

-- ============================================================
-- 11. FINANCE FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_finance_item_for_maintenance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.finance_items (
        vehicle_id, type, amount, date, ref_id, description
    ) VALUES (
        NEW.vehicle_id, 'gasto', NEW.costo, NEW.fecha, NEW.id,
        'Mantenimiento: ' || NEW.tipo
    );
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_finance_item_for_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.estado = 'completed' AND OLD.estado != 'completed' AND NEW.price_total IS NOT NULL THEN
        INSERT INTO public.finance_items (
            vehicle_id, type, amount, date, ref_id, description
        ) VALUES (
            NEW.vehicle_id, 'ingreso', NEW.price_total, NEW.updated_at, NEW.id,
            'Reserva: ' || NEW.cliente_nombre
        );
    END IF;
    RETURN NEW;
END;
$$;

-- ============================================================
-- 12. CREATE TRIGGERS
-- ============================================================

-- Updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicles_updated_at ON public.vehicles;
CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON public.vehicles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_reservations_updated_at ON public.reservations;
CREATE TRIGGER update_reservations_updated_at
    BEFORE UPDATE ON public.reservations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_contracts_updated_at ON public.contracts;
CREATE TRIGGER update_contracts_updated_at
    BEFORE UPDATE ON public.contracts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_checklist_templates_updated_at ON public.checklist_templates;
CREATE TRIGGER update_checklist_templates_updated_at
    BEFORE UPDATE ON public.checklist_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_maintenance_updated_at ON public.maintenance;
CREATE TRIGGER update_maintenance_updated_at
    BEFORE UPDATE ON public.maintenance
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_maintenance_schedules_updated_at ON public.maintenance_schedules;
CREATE TRIGGER update_maintenance_schedules_updated_at
    BEFORE UPDATE ON public.maintenance_schedules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_alerts_maintenance_updated_at ON public.alerts_maintenance;
CREATE TRIGGER update_alerts_maintenance_updated_at
    BEFORE UPDATE ON public.alerts_maintenance
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pico_placa_payments_updated_at ON public.pico_placa_payments;
CREATE TRIGGER update_pico_placa_payments_updated_at
    BEFORE UPDATE ON public.pico_placa_payments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_devolucion_videos_updated_at ON public.devolucion_videos;
CREATE TRIGGER update_devolucion_videos_updated_at
    BEFORE UPDATE ON public.devolucion_videos
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_geofence_zones_updated_at ON public.geofence_zones;
CREATE TRIGGER update_geofence_zones_updated_at
    BEFORE UPDATE ON public.geofence_zones
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_agents_updated_at ON public.agents;
CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON public.agents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Contract triggers
DROP TRIGGER IF EXISTS set_contract_number_trigger ON public.contracts;
CREATE TRIGGER set_contract_number_trigger
    BEFORE INSERT ON public.contracts
    FOR EACH ROW EXECUTE FUNCTION public.set_contract_number();

DROP TRIGGER IF EXISTS prevent_contract_modification_trigger ON public.contracts;
CREATE TRIGGER prevent_contract_modification_trigger
    BEFORE UPDATE ON public.contracts
    FOR EACH ROW EXECUTE FUNCTION public.prevent_contract_modification();

DROP TRIGGER IF EXISTS log_contract_signing_trigger ON public.contracts;
CREATE TRIGGER log_contract_signing_trigger
    AFTER INSERT ON public.contracts
    FOR EACH ROW EXECUTE FUNCTION public.log_contract_signing();

DROP TRIGGER IF EXISTS update_reservation_on_contract_create_trigger ON public.contracts;
CREATE TRIGGER update_reservation_on_contract_create_trigger
    AFTER INSERT ON public.contracts
    FOR EACH ROW EXECUTE FUNCTION public.update_reservation_on_contract_create();

DROP TRIGGER IF EXISTS update_reservation_on_contract_delete_trigger ON public.contracts;
CREATE TRIGGER update_reservation_on_contract_delete_trigger
    BEFORE DELETE ON public.contracts
    FOR EACH ROW EXECUTE FUNCTION public.update_reservation_on_contract_delete();

-- Reservation triggers
DROP TRIGGER IF EXISTS update_vehicle_estado_on_reservation_trigger ON public.reservations;
CREATE TRIGGER update_vehicle_estado_on_reservation_trigger
    AFTER INSERT ON public.reservations
    FOR EACH ROW EXECUTE FUNCTION public.update_vehicle_estado_on_reservation();

DROP TRIGGER IF EXISTS update_vehicle_estado_on_reservation_end_trigger ON public.reservations;
CREATE TRIGGER update_vehicle_estado_on_reservation_end_trigger
    AFTER UPDATE ON public.reservations
    FOR EACH ROW EXECUTE FUNCTION public.update_vehicle_estado_on_reservation_end();

DROP TRIGGER IF EXISTS notify_reservation_expired_trigger ON public.reservations;
CREATE TRIGGER notify_reservation_expired_trigger
    AFTER UPDATE ON public.reservations
    FOR EACH ROW EXECUTE FUNCTION public.notify_reservation_expired();

DROP TRIGGER IF EXISTS update_customer_stats_trigger ON public.reservations;
CREATE TRIGGER update_customer_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.reservations
    FOR EACH ROW EXECUTE FUNCTION public.update_customer_stats();

DROP TRIGGER IF EXISTS create_finance_item_for_reservation_trigger ON public.reservations;
CREATE TRIGGER create_finance_item_for_reservation_trigger
    AFTER UPDATE ON public.reservations
    FOR EACH ROW EXECUTE FUNCTION public.create_finance_item_for_reservation();

-- Maintenance triggers
DROP TRIGGER IF EXISTS update_vehicle_estado_on_maintenance_trigger ON public.maintenance;
CREATE TRIGGER update_vehicle_estado_on_maintenance_trigger
    AFTER INSERT ON public.maintenance
    FOR EACH ROW EXECUTE FUNCTION public.update_vehicle_estado_on_maintenance();

DROP TRIGGER IF EXISTS update_vehicle_on_maintenance_complete_trigger ON public.maintenance;
CREATE TRIGGER update_vehicle_on_maintenance_complete_trigger
    AFTER INSERT OR UPDATE ON public.maintenance
    FOR EACH ROW EXECUTE FUNCTION public.update_vehicle_on_maintenance_complete();

DROP TRIGGER IF EXISTS create_finance_item_for_maintenance_trigger ON public.maintenance;
CREATE TRIGGER create_finance_item_for_maintenance_trigger
    AFTER INSERT ON public.maintenance
    FOR EACH ROW EXECUTE FUNCTION public.create_finance_item_for_maintenance();

-- Checklist triggers
DROP TRIGGER IF EXISTS update_vehicle_kms_on_devolucion_trigger ON public.checklists;
CREATE TRIGGER update_vehicle_kms_on_devolucion_trigger
    AFTER INSERT ON public.checklists
    FOR EACH ROW EXECUTE FUNCTION public.update_vehicle_kms_on_devolucion();

-- ============================================================
-- END OF FILE 2_functions_triggers.sql
-- ============================================================
