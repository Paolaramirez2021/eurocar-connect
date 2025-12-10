# 🔧 FIX: Permitir que todos los usuarios vean todas las reservas en Finanzas

## ⚠️ PROBLEMA IDENTIFICADO:

Actualmente existe una política RLS (Row Level Security) en Supabase que **solo permite a cada usuario ver sus propias reservas** (`created_by = auth.uid()`).

Esto causa que:
- En la sección de **Finanzas**, cada usuario solo ve las reservas que él mismo creó
- No puede ver las reservas creadas por otros usuarios
- Los reportes financieros están incompletos

---

## ✅ SOLUCIÓN:

Cambiar la política RLS para que **todos los usuarios autenticados puedan ver TODAS las reservas**, sin importar quién las creó.

---

## 📋 INSTRUCCIONES PARA APLICAR EL FIX:

### Paso 1: Acceder a Supabase SQL Editor

1. Ve a [https://supabase.com](https://supabase.com) e inicia sesión
2. Selecciona tu proyecto "EuroCar Connect"
3. En el menú lateral, haz clic en **"SQL Editor"**

### Paso 2: Ejecutar el Script SQL

Copia y pega el siguiente script SQL en el editor y haz clic en **"RUN"**:

```sql
-- ============================================================
-- FIX: Permitir que todos los usuarios vean todas las reservas
-- Fecha: 2025-12-10
-- Descripción: Elimina restricción de ver solo propias reservas
-- ============================================================

-- Eliminar políticas antiguas restrictivas
DROP POLICY IF EXISTS "Users view own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins view all reservations" ON public.reservations;

-- Crear nueva política: Todos los usuarios autenticados pueden ver TODAS las reservas
CREATE POLICY "All authenticated users can view all reservations" 
    ON public.reservations 
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Verificar que la política se creó correctamente
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'reservations' 
  AND policyname = 'All authenticated users can view all reservations';
```

### Paso 3: Verificar el Resultado

Si el script se ejecutó correctamente, deberías ver:

```
| schemaname | tablename    | policyname                                    | permissive | roles          | cmd    | qual                       |
|------------|--------------|-----------------------------------------------|------------|----------------|--------|----------------------------|
| public     | reservations | All authenticated users can view all...       | true       | {authenticated}| SELECT | (auth.uid() IS NOT NULL)   |
```

✅ **Política aplicada correctamente**

---

## 🎯 QUÉ CAMBIA DESPUÉS DE APLICAR ESTE FIX:

### ANTES:
- ❌ Usuario A solo ve sus reservas
- ❌ Usuario B solo ve sus reservas
- ❌ Finanzas muestra datos incompletos

### DESPUÉS:
- ✅ Usuario A ve TODAS las reservas (propias y de otros)
- ✅ Usuario B ve TODAS las reservas (propias y de otros)
- ✅ Finanzas muestra datos completos de toda la empresa

---

## 🔒 SEGURIDAD:

**¿Es seguro?**
✅ **SÍ** - Solo usuarios **autenticados** (con sesión activa) pueden ver las reservas.
✅ Los usuarios anónimos o sin login NO pueden acceder.
✅ Las políticas de **CREATE**, **UPDATE** y **DELETE** siguen restringidas por roles.

**Permisos que NO cambian:**
- ✅ Crear reservas: Solo usuarios con rol `comercial` u `operativo`
- ✅ Editar reservas: Solo `admin` o `comercial`
- ✅ Eliminar reservas: Solo `admin`

---

## ⚠️ IMPORTANTE:

- Este cambio es **SEGURO** y **RECOMENDADO** para sistemas de gestión empresarial
- Permite que todo el equipo tenga visibilidad completa de las operaciones
- NO afecta otras tablas (customers, vehicles, etc.)

---

## 🆘 SOPORTE:

Si encuentras problemas:
1. Revisa los mensajes de error en el SQL Editor
2. Verifica que tengas permisos de administrador en Supabase
3. Contacta al equipo de desarrollo con el mensaje de error completo

---

**Última actualización**: 10 de Diciembre de 2025
**Versión**: 1.0
