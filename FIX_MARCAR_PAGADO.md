# 🔧 FIX: Error al Marcar Reserva como Pagada

## Problema
El botón "Marcar como Pagado" no actualiza el estado porque la política RLS (Row Level Security) de Supabase no permite que usuarios con rol `operativo` actualicen reservas.

## Solución
Ejecuta el siguiente SQL en tu consola de Supabase:

### Pasos:
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **SQL Editor** en el menú lateral
4. Crea un nuevo query y pega el siguiente código:

```sql
-- Eliminar la política existente
DROP POLICY IF EXISTS "Admins and comercial can update reservations" ON public.reservations;

-- Crear nueva política incluyendo el rol 'operativo'
CREATE POLICY "Admins comercial and operativo can update reservations" ON public.reservations
    FOR UPDATE USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role, 'comercial'::app_role, 'operativo'::app_role]));
```

5. Haz clic en **Run** para ejecutar

## Verificación
Después de aplicar el cambio:
1. Recarga la página de Gestión de Reservas
2. Haz clic en "Marcar como Pagado" 
3. El badge debería cambiar de "Reservado sin Pago (2h)" a "Reservado con Pago"

## Alternativa: Verificar rol del usuario
Si el problema persiste, verifica qué rol tiene el usuario actual:

```sql
SELECT ur.role, p.full_name, p.email
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
WHERE p.email = 'joseguerrero5@hotmail.com';
```

Si el usuario no tiene ningún rol asignado, asígnale uno:

```sql
INSERT INTO user_roles (user_id, role)
SELECT id, 'operativo'::app_role
FROM profiles
WHERE email = 'joseguerrero5@hotmail.com';
```
