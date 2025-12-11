-- ============================================================
-- MIGRACIÓN: Sistema unificado de estados v2
-- Fecha: 2025-12-11
-- ============================================================
-- Estados oficiales:
-- - pendiente: Reserva creada (estado inicial)
-- - sin_pago: Reserva sin pago (2h para pagar)
-- - con_pago: Reserva pagada, lista para contrato
-- - contrato_generado: Contrato creado, pendiente firma
-- - confirmado: Contrato firmado, vehículo entregado
-- - completada: Vehículo devuelto
-- - cancelada: Cancelada (ver cancellation_type)
-- - expirada: Expiró por falta de pago
-- ============================================================

-- 1. Agregar columna cancellation_type si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reservations' AND column_name = 'cancellation_type'
    ) THEN
        ALTER TABLE reservations ADD COLUMN cancellation_type TEXT;
    END IF;
END $$;

-- 2. Migrar estados legacy a nuevos estados

-- Sin pago
UPDATE reservations 
SET estado = 'sin_pago', updated_at = NOW()
WHERE estado IN ('pending', 'pending_no_payment', 'reservado_sin_pago')
  AND (payment_status IS NULL OR payment_status = 'pending');

-- Con pago
UPDATE reservations 
SET estado = 'con_pago', payment_status = 'paid', updated_at = NOW()
WHERE estado IN ('pending_with_payment', 'reservado_con_pago')
   OR (estado IN ('pending', 'pending_no_payment') AND payment_status = 'paid');

-- Contrato generado
UPDATE reservations 
SET estado = 'contrato_generado', updated_at = NOW()
WHERE estado = 'pendiente_contrato';

-- Confirmado
UPDATE reservations 
SET estado = 'confirmado', payment_status = 'paid', updated_at = NOW()
WHERE estado = 'confirmed';

-- Completada  
UPDATE reservations 
SET estado = 'completada', payment_status = 'paid', updated_at = NOW()
WHERE estado = 'completed';

-- Expirada
UPDATE reservations 
SET estado = 'expirada', updated_at = NOW()
WHERE estado = 'expired';

-- Cancelada con devolución
UPDATE reservations 
SET estado = 'cancelada', 
    payment_status = 'refunded',
    cancellation_type = 'con_devolucion',
    updated_at = NOW()
WHERE estado = 'cancelada_con_devolucion'
   OR (estado = 'cancelled' AND (payment_status = 'refunded' OR refund_status IS NOT NULL));

-- Cancelada sin devolución
UPDATE reservations 
SET estado = 'cancelada',
    cancellation_type = 'sin_devolucion', 
    updated_at = NOW()
WHERE estado = 'cancelada_sin_devolucion'
   OR (estado = 'cancelled' AND payment_status = 'paid' AND refund_status IS NULL);

-- Cancelada genérica
UPDATE reservations 
SET estado = 'cancelada', updated_at = NOW()
WHERE estado = 'cancelled' AND cancellation_type IS NULL;

-- ============================================================
-- 3. POLÍTICAS RLS - Todos los usuarios autenticados pueden TODO
-- ============================================================

-- Limpiar políticas anteriores
DROP POLICY IF EXISTS "Admins and comercial can update reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins comercial and operativo can update reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can view reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can create reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can delete reservations" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated users can view all reservations" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated users can create reservations" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated users can update all reservations" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated users can delete reservations" ON public.reservations;

-- Crear políticas simples para usuarios autenticados
CREATE POLICY "Authenticated users can view all reservations" ON public.reservations
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create reservations" ON public.reservations
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update all reservations" ON public.reservations
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete reservations" ON public.reservations
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 4. Políticas RLS para CONTRACTS (si existen problemas)
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can view all contracts" ON public.contracts;
DROP POLICY IF EXISTS "Authenticated users can create contracts" ON public.contracts;
DROP POLICY IF EXISTS "Authenticated users can update all contracts" ON public.contracts;

CREATE POLICY "Authenticated users can view all contracts" ON public.contracts
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create contracts" ON public.contracts
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update all contracts" ON public.contracts
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
-- SELECT estado, cancellation_type, payment_status, COUNT(*) 
-- FROM reservations 
-- GROUP BY estado, cancellation_type, payment_status 
-- ORDER BY estado;
