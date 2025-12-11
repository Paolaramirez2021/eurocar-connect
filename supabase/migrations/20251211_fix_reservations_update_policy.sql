-- ============================================================
-- FIX: Agregar rol 'operativo' a la política de UPDATE de reservations
-- Problema: Los usuarios con rol 'operativo' pueden crear reservas pero no actualizarlas
-- Esto impide que puedan marcar reservas como pagadas
-- ============================================================

-- Eliminar la política existente
DROP POLICY IF EXISTS "Admins and comercial can update reservations" ON public.reservations;

-- Crear nueva política incluyendo el rol 'operativo'
CREATE POLICY "Admins comercial and operativo can update reservations" ON public.reservations
    FOR UPDATE USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role, 'comercial'::app_role, 'operativo'::app_role]));

-- Verificación: Esta consulta mostrará las políticas actuales de reservations
-- SELECT * FROM pg_policies WHERE tablename = 'reservations';
