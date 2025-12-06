# 🔧 Instrucciones para Aplicar la Migración de Base de Datos

## ⚠️ IMPORTANTE: Debes ejecutar este SQL en tu base de datos Supabase

El sistema de contratos digitales requiere nuevas columnas en la tabla `contracts`. Sigue estos pasos:

### Paso 1: Acceder a Supabase SQL Editor

1. Ve a [https://supabase.com](https://supabase.com) e inicia sesión
2. Selecciona tu proyecto "EuroCar Connect"
3. En el menú lateral, haz clic en **"SQL Editor"**

### Paso 2: Ejecutar el Script SQL

Copia y pega el siguiente script SQL en el editor y haz clic en **"RUN"**:

```sql
-- =====================================================
-- MIGRACIÓN: Añadir campos para contratos digitales
-- Fecha: 2025-01-01
-- Descripción: Añade columnas necesarias para el nuevo
--              sistema de contratos con firma, huella y foto
-- =====================================================

-- Columna para tipo de contrato (preliminar o final)
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'final';

-- Columna JSONB para almacenar todos los datos del contrato
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS datos_contrato JSONB;

-- Columnas booleanas para tracking de capturas
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS tiene_firma BOOLEAN DEFAULT false;

ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS tiene_huella BOOLEAN DEFAULT false;

ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS tiene_foto BOOLEAN DEFAULT false;

-- Columna para foto del cliente
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Crear índice para búsquedas por tipo
CREATE INDEX IF NOT EXISTS idx_contracts_tipo ON public.contracts(tipo);

-- Comentarios para documentación
COMMENT ON COLUMN public.contracts.tipo IS 'Tipo de contrato: preliminar (sin firmas) o final (con firma, huella, foto)';
COMMENT ON COLUMN public.contracts.datos_contrato IS 'Datos completos del contrato en formato JSON';
COMMENT ON COLUMN public.contracts.tiene_firma IS 'Indica si el contrato tiene firma digital capturada';
COMMENT ON COLUMN public.contracts.tiene_huella IS 'Indica si el contrato tiene huella digital capturada';
COMMENT ON COLUMN public.contracts.tiene_foto IS 'Indica si el contrato tiene foto del cliente';

-- Actualizar contratos existentes (si los hay)
UPDATE public.contracts 
SET 
  tipo = 'final',
  tiene_firma = (signature_url IS NOT NULL AND signature_url != ''),
  tiene_huella = (fingerprint_url IS NOT NULL AND fingerprint_url != ''),
  tiene_foto = (foto_url IS NOT NULL AND foto_url != '')
WHERE tipo IS NULL;

-- Verificar que todo se aplicó correctamente
SELECT 
  column_name, 
  data_type, 
  column_default, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'contracts'
  AND column_name IN ('tipo', 'datos_contrato', 'tiene_firma', 'tiene_huella', 'tiene_foto', 'foto_url')
ORDER BY column_name;
```

### Paso 3: Verificar la Migración

Si el script se ejecutó correctamente, deberías ver una tabla de resultados mostrando las nuevas columnas:

| column_name      | data_type | column_default | is_nullable |
|------------------|-----------|----------------|-------------|
| datos_contrato   | jsonb     | NULL           | YES         |
| foto_url         | text      | NULL           | YES         |
| tiene_firma      | boolean   | false          | YES         |
| tiene_foto       | boolean   | false          | YES         |
| tiene_huella     | boolean   | false          | YES         |
| tipo             | text      | 'final'        | YES         |

### Paso 4: Confirmar

✅ Si ves los resultados similares a la tabla anterior, la migración fue exitosa.

❌ Si hay errores, revisa los mensajes y contacta al equipo de desarrollo.

---

## 📋 Qué Hace Esta Migración

1. **tipo**: Añade una columna para distinguir entre contratos "preliminar" y "final"
2. **datos_contrato**: Almacena todos los datos del contrato en formato JSON
3. **tiene_firma**, **tiene_huella**, **tiene_foto**: Flags booleanos para tracking
4. **foto_url**: URL para almacenar la foto del cliente
5. **Índice**: Mejora el rendimiento de búsquedas por tipo de contrato
6. **Actualiza registros existentes**: Marca contratos antiguos correctamente

## ⚠️ Notas Importantes

- Esta migración es **SEGURA** y no elimina datos existentes
- Usa `ADD COLUMN IF NOT EXISTS` para evitar errores si ya existe
- Los valores por defecto aseguran compatibilidad con datos anteriores
- Se puede ejecutar múltiples veces sin problemas (idempotente)

## 🆘 Soporte

Si encuentras problemas:
1. Revisa los mensajes de error en el SQL Editor
2. Verifica que tengas permisos de administrador en Supabase
3. Contacta al equipo de desarrollo con el mensaje de error completo

---

**Última actualización**: Enero 2025
