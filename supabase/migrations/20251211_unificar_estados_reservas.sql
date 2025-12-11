-- ============================================================
-- MIGRACIÓN: Unificar estados de reservas
-- Fecha: 2025-12-11
-- ============================================================
-- 
-- Esta migración actualiza todos los estados de reservas al nuevo
-- sistema unificado donde el campo 'estado' es la ÚNICA fuente
-- de verdad para determinar colores y comportamientos.
--
-- TABLA DE TRANSICIÓN:
-- Evento                    | estado              | payment_status
-- --------------------------|---------------------|---------------
-- Reserva creada sin pago   | reservado_sin_pago  | pending
-- Reserva con pago          | reservado_con_pago  | paid
-- Pendiente de contrato     | pendiente_contrato  | paid
-- Contrato firmado          | confirmado          | paid
-- Expirada                  | expirada            | pending
-- Cancelada sin pago        | cancelada           | pending
-- Cancelada con devolución  | cancelada           | refunded
-- Cancelada sin devolución  | cancelada           | paid
-- ============================================================

-- 1. Actualizar reservas sin pago (legacy -> unificado)
UPDATE reservations 
SET estado = 'reservado_sin_pago', updated_at = NOW()
WHERE estado IN ('pending', 'pending_no_payment')
AND (payment_status IS NULL OR payment_status = 'pending');

-- 2. Actualizar reservas con pago (legacy -> unificado)
UPDATE reservations 
SET estado = 'reservado_con_pago', updated_at = NOW()
WHERE (estado IN ('pending', 'pending_with_payment') AND payment_status = 'paid')
   OR (estado = 'pending_no_payment' AND payment_status = 'paid');

-- 3. Actualizar canceladas con devolución
UPDATE reservations 
SET estado = 'cancelada', updated_at = NOW()
WHERE estado = 'cancelada_con_devolucion';

-- Asegurar que payment_status = refunded para canceladas con devolución
UPDATE reservations 
SET payment_status = 'refunded', updated_at = NOW()
WHERE estado = 'cancelada' AND refund_status IS NOT NULL;

-- 4. Actualizar canceladas sin devolución
UPDATE reservations 
SET estado = 'cancelada', updated_at = NOW()
WHERE estado = 'cancelada_sin_devolucion';

-- 5. Actualizar expiradas (legacy -> unificado)
UPDATE reservations 
SET estado = 'expirada', updated_at = NOW()
WHERE estado = 'expired';

-- 6. Actualizar confirmadas (mantener, pero asegurar consistencia)
UPDATE reservations 
SET estado = 'confirmado', payment_status = 'paid', updated_at = NOW()
WHERE estado = 'confirmed';

-- 7. Actualizar completadas
UPDATE reservations 
SET estado = 'completada', payment_status = 'paid', updated_at = NOW()
WHERE estado = 'completed';

-- 8. Actualizar canceladas genéricas
UPDATE reservations 
SET estado = 'cancelada', updated_at = NOW()
WHERE estado = 'cancelled';

-- ============================================================
-- VERIFICACIÓN: Mostrar resumen de estados después de la migración
-- ============================================================
-- SELECT estado, payment_status, COUNT(*) as total
-- FROM reservations
-- GROUP BY estado, payment_status
-- ORDER BY estado;
