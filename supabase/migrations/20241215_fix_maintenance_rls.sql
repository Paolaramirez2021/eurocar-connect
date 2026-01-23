-- =====================================================
-- FIX: Corregir política RLS para tabla maintenance
-- Fecha: 2024-12-15
-- Problema: Error RLS impide crear registros de mantenimiento
-- =====================================================

-- 1. Eliminar política actual que está causando el problema
DROP POLICY IF EXISTS "Admins and operativo can create maintenance" ON public.maintenance;

-- 2. Crear nueva política que permite a usuarios autenticados crear mantenimientos
CREATE POLICY "Authenticated users can create maintenance" 
ON public.maintenance 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Asegurar que existe política para SELECT
DROP POLICY IF EXISTS "Anyone can read maintenance" ON public.maintenance;
CREATE POLICY "Authenticated users can read maintenance" 
ON public.maintenance 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 4. Asegurar que existe política para UPDATE
DROP POLICY IF EXISTS "Admins can update maintenance" ON public.maintenance;
CREATE POLICY "Authenticated users can update maintenance" 
ON public.maintenance 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- 5. Asegurar que existe política para DELETE
DROP POLICY IF EXISTS "Admins can delete maintenance" ON public.maintenance;
CREATE POLICY "Authenticated users can delete maintenance" 
ON public.maintenance 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- =====================================================
-- INSTRUCCIONES DE USO:
-- 1. Copie este script completo
-- 2. Vaya a Supabase Dashboard > SQL Editor
-- 3. Pegue y ejecute el script
-- 4. Intente crear un mantenimiento nuevamente
-- =====================================================
