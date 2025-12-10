# 🔧 MIGRACIÓN OBLIGATORIA: Añadir columnas de IVA en tabla reservations

## ⚠️ IMPORTANTE: DEBES EJECUTAR ESTE SQL

El código actualizado intenta guardar las columnas `tarifa_diaria`, `subtotal`, e `iva` en la tabla `reservations`, pero estas columnas **NO EXISTEN** en tu base de datos actual.

---

## 📋 INSTRUCCIONES PARA APLICAR LA MIGRACIÓN:

### Paso 1: Acceder a Supabase SQL Editor

1. Ve a [https://supabase.com](https://supabase.com) e inicia sesión
2. Selecciona tu proyecto "EuroCar Connect"
3. En el menú lateral, haz clic en **"SQL Editor"**

### Paso 2: Ejecutar el Script SQL

Copia y pega el siguiente script SQL en el editor y haz clic en **"RUN"**:

```sql
-- ============================================================
-- MIGRACIÓN: Añadir columnas para desglose de IVA en reservas
-- Fecha: 2025-12-10
-- ============================================================

-- Añadir columna para tarifa diaria SIN IVA
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS tarifa_diaria NUMERIC;

-- Añadir columna para subtotal (días × tarifa sin IVA)
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS subtotal NUMERIC;

-- Añadir columna para IVA (19% del subtotal)
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS iva NUMERIC;

-- Crear índices para consultas financieras
CREATE INDEX IF NOT EXISTS idx_reservations_subtotal ON public.reservations(subtotal);
CREATE INDEX IF NOT EXISTS idx_reservations_iva ON public.reservations(iva);

-- Comentarios para documentación
COMMENT ON COLUMN public.reservations.tarifa_diaria IS 'Tarifa por día SIN IVA';
COMMENT ON COLUMN public.reservations.subtotal IS 'Subtotal = dias_totales × tarifa_diaria (sin IVA)';
COMMENT ON COLUMN public.reservations.iva IS 'IVA 19% = subtotal × 0.19';

-- Actualizar registros existentes (calcular valores retroactivos)
UPDATE public.reservations
SET 
  tarifa_diaria = tarifa_dia_iva,
  subtotal = COALESCE(tarifa_dia_iva * dias_totales, 0),
  iva = ROUND(COALESCE(tarifa_dia_iva * dias_totales, 0) * 0.19)
WHERE tarifa_diaria IS NULL 
  AND tarifa_dia_iva IS NOT NULL 
  AND dias_totales IS NOT NULL;

-- Verificar que las columnas se crearon correctamente
SELECT 
  column_name, 
  data_type, 
  column_default, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'reservations'
  AND column_name IN ('tarifa_diaria', 'subtotal', 'iva')
ORDER BY column_name;
```

### Paso 3: Verificar el Resultado

Si el script se ejecutó correctamente, deberías ver:

```
| column_name    | data_type | column_default | is_nullable |
|----------------|-----------|----------------|-------------|
| iva            | numeric   | NULL           | YES         |
| subtotal       | numeric   | NULL           | YES         |
| tarifa_diaria  | numeric   | NULL           | YES         |
```

✅ **¡Migración exitosa!**

---

## 🎯 QUÉ HACE ESTA MIGRACIÓN:

### 1. Añade 3 nuevas columnas:
- **`tarifa_diaria`**: Tarifa por día SIN IVA (ej: $150,000)
- **`subtotal`**: Días × Tarifa sin IVA (ej: 20 días × $150,000 = $3,000,000)
- **`iva`**: IVA 19% del subtotal (ej: $3,000,000 × 0.19 = $570,000)

### 2. Actualiza reservas existentes:
- Calcula retroactivamente los valores de IVA para reservas antiguas
- Usa `tarifa_dia_iva` (que en realidad es sin IVA) para calcular

### 3. Crea índices:
- Mejora el rendimiento de consultas financieras
- Facilita reportes y búsquedas por valores

---

## 📊 EJEMPLO DE CÁLCULO:

### Reserva: Chevrolet DNK114 por 20 días

**ANTES de la migración:**
```
valor_total: $3,000,000
price_total: $3,000,000
(sin desglose de IVA)
```

**DESPUÉS de la migración:**
```
tarifa_diaria: $150,000 (sin IVA)
dias_totales: 20
subtotal: $3,000,000 (20 × $150,000)
iva: $570,000 (19% de $3,000,000)
valor_total: $3,570,000 ($3,000,000 + $570,000)
price_total: $3,570,000 (total final)
```

---

## ⚠️ COMPATIBILIDAD:

### Columnas que SE MANTIENEN:
- `dias_totales` ✅
- `tarifa_dia_iva` ✅ (se mantiene para compatibilidad)
- `valor_total` ✅ (ahora incluye IVA correctamente)
- `descuento` ✅
- `price_total` ✅

### Columnas NUEVAS:
- `tarifa_diaria` 🆕
- `subtotal` 🆕
- `iva` 🆕

---

## 🔒 SEGURIDAD:

- ✅ Usa `ADD COLUMN IF NOT EXISTS` (se puede ejecutar múltiples veces)
- ✅ NO elimina datos existentes
- ✅ NO afecta otras tablas
- ✅ Calcula valores retroactivos para reservas antiguas

---

## 🆘 SOPORTE:

Si encuentras problemas:
1. Revisa los mensajes de error en el SQL Editor
2. Verifica que tengas permisos de administrador
3. Copia el mensaje de error completo y contacta al equipo

---

## ✅ VERIFICACIÓN POST-MIGRACIÓN:

Después de ejecutar el SQL:

1. **Refresca tu aplicación** (Ctrl+Shift+R)
2. **Crea una nueva reserva** y verifica que se muestre:
   - Días de alquiler
   - Tarifa por día (sin IVA)
   - Subtotal
   - IVA (19%)
   - Total

3. **Revisa la consola del navegador** (F12):
   - Deberías ver logs `[Reserva Guardada]` con todos los valores

---

**Última actualización**: 10 de Diciembre de 2025
**Versión**: 1.0
**Prioridad**: 🔴 CRÍTICA - Requerida para funcionamiento correcto
