# Migración: Rango de Fechas para Mantenimiento

## Resumen de Cambios

El sistema de mantenimiento ahora soporta **rangos de fechas** (fecha de inicio y fecha de fin) en lugar de solo una fecha única. Esto permite bloquear vehículos para mantenimientos de varios días.

## Scripts SQL a Ejecutar

### Paso 1: Corregir política RLS (EJECUTAR PRIMERO)

Copie y ejecute este script en **Supabase Dashboard > SQL Editor**:

```sql
-- Fix RLS policy
DROP POLICY IF EXISTS "Admins and operativo can create maintenance" ON public.maintenance;

CREATE POLICY "Authenticated users can create maintenance" 
ON public.maintenance 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read maintenance" 
ON public.maintenance 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update maintenance" 
ON public.maintenance 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete maintenance" 
ON public.maintenance 
FOR DELETE 
USING (auth.uid() IS NOT NULL);
```

### Paso 2: Agregar columnas de rango de fechas

```sql
-- Agregar columnas
ALTER TABLE public.maintenance 
ADD COLUMN IF NOT EXISTS fecha_fin TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.maintenance 
ADD COLUMN IF NOT EXISTS fecha_inicio TIMESTAMP WITH TIME ZONE;

-- Actualizar registros existentes
UPDATE public.maintenance 
SET fecha_inicio = fecha, fecha_fin = fecha 
WHERE fecha_inicio IS NULL OR fecha_fin IS NULL;

-- Crear índice para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_maintenance_fecha_rango 
ON public.maintenance (vehicle_id, fecha_inicio, fecha_fin) 
WHERE completed = false;
```

## Funcionalidad Implementada

### Formulario de Mantenimiento
- Ahora tiene dos campos de fecha: **Fecha Inicio** y **Fecha Fin**
- El campo Fecha Fin tiene restricción `min` para no ser menor que Fecha Inicio

### Validación en Reservaciones
- Al crear una reservación, el sistema verifica si el vehículo tiene mantenimiento programado en el rango de fechas seleccionado
- Si hay conflicto, muestra error y no permite crear la reservación

## Archivos Modificados

1. `/src/pages/Maintenance.tsx` - Formulario con fecha inicio y fin
2. `/src/components/reservations/ReservationForm.tsx` - Validación contra mantenimientos

## Pruebas Recomendadas

1. **Crear mantenimiento**: 
   - Seleccionar un vehículo
   - Elegir rango de fechas (ej: 20-25 dic)
   - Verificar que se guarda correctamente

2. **Validación de reservaciones**:
   - Intentar crear reservación en fechas de mantenimiento
   - Verificar que muestra error y no permite crear

3. **Mantenimientos existentes**:
   - Verificar que los mantenimientos antiguos siguen funcionando
   - Deberían tener fecha_inicio = fecha_fin = fecha original
