# Eurocar Rental - Guía de Despliegue de Base de Datos

## Índice

1. [Prerrequisitos](#prerrequisitos)
2. [Estructura de Archivos](#estructura-de-archivos)
3. [Orden de Ejecución](#orden-de-ejecución)
4. [Crear Primer Usuario Administrador](#crear-primer-usuario-administrador)
5. [Queries de Ejemplo](#queries-de-ejemplo)
6. [Backup y Restauración](#backup-y-restauración)
7. [Troubleshooting](#troubleshooting)

---

## Prerrequisitos

- Acceso al proyecto Supabase (Lovable Cloud)
- Usuario con permisos de administrador en Supabase
- Variables de entorno configuradas:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`

---

## Estructura de Archivos

```
/supabase/
├── 1_tables.sql              # Tipos y tablas
├── 2_functions_triggers.sql  # Funciones y triggers
├── 3_views_indexes.sql       # Vistas e índices
├── 4_enable_rls.sql          # Habilitar RLS
├── 5_policies.sql            # Políticas RLS
├── 6_seeds.sql               # Datos iniciales
├── schema_export.sql         # Archivo completo (1-6 concatenados)
├── diff_report.md            # Reporte de diferencias
└── README_deploy.md          # Este archivo
```

---

## Orden de Ejecución

### Para Nueva Instalación

Ejecutar en este orden desde Lovable Cloud Backend o SQL Editor:

```bash
# 1. Crear tipos y tablas
psql -f 1_tables.sql

# 2. Crear funciones y triggers
psql -f 2_functions_triggers.sql

# 3. Crear vistas e índices
psql -f 3_views_indexes.sql

# 4. Habilitar RLS
psql -f 4_enable_rls.sql

# 5. Crear políticas
psql -f 5_policies.sql

# 6. Insertar datos iniciales
psql -f 6_seeds.sql
```

### Para Instalación Existente (Lovable Cloud)

El proyecto ya tiene el schema desplegado. Solo ejecutar si necesitas:

1. **Actualizar funciones**: Ejecutar `2_functions_triggers.sql` (seguro, usa `CREATE OR REPLACE`)
2. **Agregar índices**: Ejecutar `3_views_indexes.sql` (seguro, usa `IF NOT EXISTS`)
3. **Actualizar políticas**: Ejecutar `5_policies.sql` (seguro, usa `DROP IF EXISTS`)

---

## Crear Primer Usuario Administrador

### Paso 1: Registrar Usuario

1. Ir a la aplicación y crear cuenta con email/contraseña
2. Confirmar el email (si está habilitada la confirmación)

### Paso 2: Obtener UUID del Usuario

```sql
-- Buscar el UUID del usuario por email
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'tu_email@ejemplo.com';
```

### Paso 3: Asignar Rol de Socio Principal

```sql
-- Reemplazar <USER_UUID> con el UUID obtenido
INSERT INTO public.user_roles (id, user_id, role, assigned_at)
VALUES (
    gen_random_uuid(),
    '<USER_UUID>',  -- Ejemplo: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    'socio_principal',
    now()
);
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

## Queries de Ejemplo

### Calendario de Disponibilidad por Vehículo

```sql
-- Obtener disponibilidad de un vehículo para un rango de fechas
WITH date_range AS (
    SELECT generate_series(
        '2024-01-01'::date,
        '2024-01-31'::date,
        '1 day'::interval
    )::date AS fecha
)
SELECT 
    dr.fecha,
    v.placa,
    v.marca,
    v.modelo,
    CASE 
        WHEN r.id IS NOT NULL THEN 'reservado'
        WHEN m.id IS NOT NULL THEN 'mantenimiento'
        ELSE 'disponible'
    END AS estado,
    r.cliente_nombre,
    r.id AS reservation_id
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
WHERE v.id = '<VEHICLE_UUID>'
ORDER BY dr.fecha;
```

### Resumen de Reservas por Mes

```sql
SELECT 
    TO_CHAR(fecha_inicio, 'YYYY-MM') AS mes,
    COUNT(*) AS total_reservas,
    SUM(price_total) AS ingresos_totales,
    COUNT(DISTINCT vehicle_id) AS vehiculos_usados,
    COUNT(DISTINCT customer_id) AS clientes_unicos
FROM public.reservations
WHERE estado IN ('confirmed', 'completed')
GROUP BY TO_CHAR(fecha_inicio, 'YYYY-MM')
ORDER BY mes DESC;
```

### Alertas de Mantenimiento Activas

```sql
SELECT 
    v.placa,
    v.marca,
    v.modelo,
    am.tipo_alerta,
    am.descripcion,
    am.fecha_evento,
    (am.fecha_evento - CURRENT_DATE) AS dias_restantes
FROM public.alerts_maintenance am
JOIN public.vehicles v ON v.id = am.vehicle_id
WHERE am.estado = 'activa'
ORDER BY dias_restantes ASC;
```

### Estadísticas de Clientes Top

```sql
SELECT 
    nombres || ' ' || primer_apellido AS cliente,
    cedula_pasaporte,
    total_reservas,
    monto_total,
    estado
FROM public.customer_stats
WHERE total_reservas > 0
ORDER BY monto_total DESC
LIMIT 10;
```

---

## Backup y Restauración

### Exportar Schema desde Supabase UI

1. Ir a **Settings** → **Database**
2. Sección **Database Backups**
3. Click en **Download backup**

### Backup Manual con pg_dump

```bash
# Backup completo
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
    --schema=public \
    --no-owner \
    -f backup_$(date +%Y%m%d).sql

# Solo schema (sin datos)
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
    --schema=public \
    --schema-only \
    --no-owner \
    -f schema_backup_$(date +%Y%m%d).sql
```

### Restaurar Backup

```bash
# Restaurar en nueva base de datos
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
    -f backup_20240101.sql
```

---

## Troubleshooting

### Error: "relation does not exist"

**Causa**: Intentando crear FK antes de que exista la tabla referenciada.

**Solución**: Ejecutar `1_tables.sql` en el orden correcto o usar `schema_export.sql`.

### Error: "policy already exists"

**Causa**: La policy ya existe en la base de datos.

**Solución**: El archivo `5_policies.sql` ya incluye `DROP POLICY IF EXISTS`. Si persiste, ejecutar manualmente:

```sql
DROP POLICY IF EXISTS "nombre_policy" ON public.tabla;
```

### Error: "function does not exist"

**Causa**: La función `has_role` o `has_any_role` no existe al crear policies.

**Solución**: Ejecutar `2_functions_triggers.sql` antes de `5_policies.sql`.

### Error: "permission denied"

**Causa**: Usuario sin permisos suficientes.

**Solución**: Verificar que el usuario tiene rol de servicio o usar la service_role key.

### RLS bloquea todas las operaciones

**Causa**: Usuario no tiene rol asignado.

**Solución**: Verificar y asignar rol:

```sql
-- Verificar roles del usuario
SELECT * FROM public.user_roles WHERE user_id = auth.uid();

-- Si está vacío, asignar rol básico
INSERT INTO public.user_roles (user_id, role)
VALUES (auth.uid(), 'operativo');
```

---

## Variables de Entorno Requeridas

```env
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIs...
VITE_SUPABASE_PROJECT_ID=[project-ref]
```

---

## Contacto y Soporte

Para problemas con el despliegue, verificar:

1. Los logs de Supabase en el dashboard
2. La consola del navegador para errores de cliente
3. Los logs de Edge Functions si aplica

---

*Última actualización: 2025-12-02*
