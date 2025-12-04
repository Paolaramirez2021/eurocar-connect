# Eurocar Rental - Guía de Importación SQL

## Índice

1. [Resumen del Schema](#resumen-del-schema)
2. [Archivos Generados](#archivos-generados)
3. [Orden de Ejecución](#orden-de-ejecución)
4. [Variables de Entorno](#variables-de-entorno)
5. [Instrucciones de Importación](#instrucciones-de-importación)
6. [Crear Primer Administrador](#crear-primer-administrador)
7. [Verificación](#verificación)
8. [Backup y Restauración](#backup-y-restauración)
9. [Troubleshooting](#troubleshooting)

---

## Resumen del Schema

### Tablas (23 total)

| Categoría | Tablas |
|-----------|--------|
| **Usuarios** | `profiles`, `user_roles`, `time_entries` |
| **Flota** | `vehicles`, `maintenance`, `maintenance_schedules` |
| **Clientes** | `customers` |
| **Reservas** | `reservations`, `contracts` |
| **Checklists** | `checklist_templates`, `checklist_template_items`, `checklists`, `checklist_items` |
| **Alertas** | `alerts`, `alerts_maintenance` |
| **Finanzas** | `finance_items`, `pico_placa_payments` |
| **Otros** | `devolucion_videos`, `geofence_zones`, `settings`, `agents`, `notifications`, `audit_log` |

### Funciones (25+)

- `has_role()`, `has_any_role()`, `get_user_roles()` - Control de acceso
- `log_audit()` - Registro de auditoría
- `generate_contract_number()` - Generación automática de números de contrato
- `check_reservation_availability()` - Validación de disponibilidad
- `is_within_geofence()` - Validación geográfica
- Y más...

### Vistas (2)

- `customer_stats` - Estadísticas de clientes
- `alerts_maintenance_view` - Vista de alertas con días restantes

### Políticas RLS (50+)

Políticas de seguridad para todas las tablas basadas en roles.

---

## Archivos Generados

```
/supabase/
├── 01_tables.sql                  # Tipos y tablas
├── 02_functions_triggers_views.sql # Funciones, triggers, vistas
├── 03_rls_policies.sql            # Políticas RLS
├── 04_indexes_seeds.sql           # Índices y datos iniciales
├── schema_export.sql              # Archivo completo concatenado
├── checks.sql                     # Verificaciones
├── recreate_from_scratch.sql      # ⚠️ SOLO DESARROLLO
└── README_SQL_import.md           # Este archivo
```

---

## Orden de Ejecución

### ⚠️ IMPORTANTE: Ejecutar en este orden exacto

```
1. 01_tables.sql           → Crear tipos y tablas
2. 02_functions_triggers_views.sql → Crear funciones, triggers, vistas
3. 03_rls_policies.sql     → Habilitar RLS y crear políticas
4. 04_indexes_seeds.sql    → Crear índices y datos iniciales
```

### Alternativa: Archivo Único

Si prefieres ejecutar todo de una vez, usa `schema_export.sql` que contiene todo concatenado.

---

## Variables de Entorno

### Requeridas para la Aplicación

```env
# Supabase
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIs...
VITE_SUPABASE_PROJECT_ID=[project-ref]

# Backend (Edge Functions)
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...  # ⚠️ MANTENER SEGURO

# Opcional - Integraciones
RESEND_API_KEY=re_...
GPT_API_KEY=sk-...
ADMIN_EMAIL=admin@eurocar.com
```

### ⚠️ Seguridad

- **NUNCA** exponer `SUPABASE_SERVICE_ROLE_KEY` en el frontend
- Usar variables de entorno de Supabase para Edge Functions
- Rotar las keys periódicamente

---

## Instrucciones de Importación

### Opción A: Desde Lovable Cloud

1. Ir a **Backend** en el panel de Lovable
2. Las migraciones se ejecutan automáticamente
3. Verificar en la consola que no hay errores

### Opción B: Desde Supabase SQL Editor

1. Abrir el proyecto en Supabase Dashboard
2. Ir a **SQL Editor**
3. Crear un nuevo query
4. Copiar y pegar el contenido de cada archivo en orden:
   - Primero `01_tables.sql`
   - Luego `02_functions_triggers_views.sql`
   - Después `03_rls_policies.sql`
   - Finalmente `04_indexes_seeds.sql`
5. Ejecutar cada uno y verificar que no hay errores

### Opción C: Usando psql (CLI)

```bash
# Conectar a la base de datos
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# Ejecutar archivos en orden
\i /path/to/01_tables.sql
\i /path/to/02_functions_triggers_views.sql
\i /path/to/03_rls_policies.sql
\i /path/to/04_indexes_seeds.sql
```

---

## Crear Primer Administrador

### Paso 1: Registrar Usuario

1. Ir a la aplicación y crear una cuenta
2. Usar email y contraseña válidos
3. Confirmar el email (si está habilitada la confirmación)

### Paso 2: Obtener UUID del Usuario

```sql
-- Buscar el usuario por email
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'tu_email@ejemplo.com';
```

### Paso 3: Asignar Rol de Socio Principal

```sql
-- Reemplazar <USER_UUID> con el UUID real
INSERT INTO public.user_roles (id, user_id, role, assigned_at)
VALUES (
    gen_random_uuid(),
    '<USER_UUID>',  -- Ej: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    'socio_principal',
    now()
);
```

### Ejemplo Completo

```sql
-- Si el email es admin@eurocar.com:
INSERT INTO public.user_roles (id, user_id, role, assigned_at)
SELECT 
    gen_random_uuid(),
    u.id,
    'socio_principal',
    now()
FROM auth.users u
WHERE u.email = 'admin@eurocar.com';
```

### Verificar Asignación

```sql
SELECT 
    p.email,
    p.full_name,
    ur.role,
    ur.assigned_at
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id
WHERE p.email = 'tu_email@ejemplo.com';
```

---

## Verificación

### Ejecutar Script de Verificación

Ejecuta el contenido de `checks.sql` para verificar que todo está creado correctamente.

### Verificaciones Manuales

```sql
-- Verificar tablas
SELECT COUNT(*) AS total_tables
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- Esperado: 23

-- Verificar funciones
SELECT COUNT(*) AS total_functions
FROM information_schema.routines
WHERE routine_schema = 'public';
-- Esperado: 25+

-- Verificar RLS habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
-- Todas deben tener rowsecurity = true

-- Verificar políticas
SELECT COUNT(*) AS total_policies
FROM pg_policies
WHERE schemaname = 'public';
-- Esperado: 50+
```

---

## Backup y Restauración

### Crear Backup

```bash
# Backup completo
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
    --schema=public \
    --no-owner \
    -f backup_$(date +%Y%m%d_%H%M%S).sql

# Solo estructura (sin datos)
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
    --schema=public \
    --schema-only \
    --no-owner \
    -f schema_backup_$(date +%Y%m%d).sql
```

### Restaurar Backup

```bash
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
    -f backup_20241202.sql
```

### Desde Supabase Dashboard

1. Ir a **Settings** → **Database**
2. Sección **Database Backups**
3. Click en **Download backup**

---

## Troubleshooting

### Error: "relation does not exist"

**Causa**: Intentando crear FK antes de que exista la tabla.

**Solución**: Ejecutar archivos en el orden correcto (01 → 02 → 03 → 04).

### Error: "policy already exists"

**Causa**: La política ya existe.

**Solución**: El archivo `03_rls_policies.sql` usa `DROP POLICY IF EXISTS` antes de crear. Si persiste:

```sql
DROP POLICY IF EXISTS "nombre_policy" ON public.tabla;
```

### Error: "function does not exist"

**Causa**: Intentando usar `has_role()` antes de crearla.

**Solución**: Ejecutar `02_functions_triggers_views.sql` antes de `03_rls_policies.sql`.

### Error: "permission denied"

**Causa**: Usuario sin permisos suficientes.

**Solución**: Usar la service_role key o verificar permisos del usuario.

### RLS bloquea todas las operaciones

**Causa**: Usuario sin rol asignado.

**Solución**: 

```sql
-- Verificar roles
SELECT * FROM public.user_roles WHERE user_id = auth.uid();

-- Si está vacío, asignar rol
INSERT INTO public.user_roles (user_id, role)
VALUES (auth.uid(), 'operativo');
```

---

## Queries de Ejemplo

### Calendario de Disponibilidad

```sql
WITH date_range AS (
    SELECT generate_series(
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '30 days',
        '1 day'::interval
    )::date AS fecha
)
SELECT 
    dr.fecha,
    v.placa,
    v.marca || ' ' || v.modelo AS vehiculo,
    CASE 
        WHEN r.id IS NOT NULL THEN 'reservado'
        WHEN m.id IS NOT NULL THEN 'mantenimiento'
        ELSE 'disponible'
    END AS estado,
    r.cliente_nombre
FROM date_range dr
CROSS JOIN public.vehicles v
LEFT JOIN public.reservations r ON 
    r.vehicle_id = v.id 
    AND dr.fecha >= r.fecha_inicio::date 
    AND dr.fecha <= r.fecha_fin::date
    AND r.estado IN ('confirmed', 'pending')
LEFT JOIN public.maintenance m ON 
    m.vehicle_id = v.id 
    AND dr.fecha = m.fecha::date
    AND m.completed = false
WHERE v.estado != 'inactivo'
ORDER BY v.placa, dr.fecha;
```

### Resumen Financiero por Mes

```sql
SELECT 
    TO_CHAR(date, 'YYYY-MM') AS mes,
    type AS tipo,
    COUNT(*) AS cantidad,
    SUM(amount) AS total
FROM public.finance_items
GROUP BY TO_CHAR(date, 'YYYY-MM'), type
ORDER BY mes DESC, tipo;
```

---

## Contacto

Para soporte técnico:

1. Revisar logs en Supabase Dashboard
2. Verificar consola del navegador
3. Revisar logs de Edge Functions

---

*Última actualización: 2025-12-02*
*Generado por: Lovable AI*
