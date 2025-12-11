# 🔧 Sistema Unificado de Estados de Reservas

## Resumen del Cambio

Hemos unificado completamente el sistema de estados para que el campo `estado` sea la **ÚNICA fuente de verdad** para determinar colores, comportamiento y visibilidad de las reservas.

## Tabla de Estados Unificados

| Estado | Color | Descripción | Ocupa Vehículo | Genera Ingreso |
|--------|-------|-------------|----------------|----------------|
| `reservado_sin_pago` | 🟡 Lima | Reserva nueva, 2h para pagar | ✅ | ❌ |
| `reservado_con_pago` | 🟢 Verde | Pagado, pendiente contrato | ✅ | ✅ |
| `pendiente_contrato` | 🔵 Azul | Contrato generado, sin firmar | ✅ | ✅ |
| `confirmado` | 🔴 Rojo | Contrato firmado, en alquiler | ✅ | ✅ |
| `completada` | ⬜ Gris | Vehículo devuelto | ❌ | ✅ |
| `expirada` | ⬜ Gris claro | Expiró sin pago (2h) | ❌ | ❌ |
| `cancelada` | 🔴 Rojo oscuro | Cancelada (ver payment_status) | ❌ | ❌ |

## Tabla de Transición de Estados

| Evento | estado → | payment_status |
|--------|----------|----------------|
| Reserva creada sin pago | `reservado_sin_pago` | `pending` |
| Marcar como Pagado | `reservado_con_pago` | `paid` |
| Generar contrato | `pendiente_contrato` | `paid` |
| Firmar contrato | `confirmado` | `paid` |
| Expiración automática (2h) | `expirada` | `pending` |
| Cancelar sin pago | `cancelada` | `pending` |
| Cancelar con devolución | `cancelada` | `refunded` |
| Cancelar sin devolución | `cancelada` | `paid` |

## Pasos para Aplicar

### 1. Ejecutar Migración SQL en Supabase

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **SQL Editor**
4. Ejecuta el contenido de: `supabase/migrations/20251211_unificar_estados_reservas.sql`

### 2. Actualizar Política RLS (si aún no lo has hecho)

```sql
-- Permitir que rol 'operativo' actualice reservas
DROP POLICY IF EXISTS "Admins and comercial can update reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins comercial and operativo can update reservations" ON public.reservations;
CREATE POLICY "Admins comercial and operativo can update reservations" ON public.reservations
    FOR UPDATE USING (public.has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role, 'comercial'::app_role, 'operativo'::app_role]));
```

### 3. Desplegar los cambios

Si usas Netlify, haz push al repositorio para que se despliegue automáticamente.

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/config/states.ts` | Nueva configuración unificada de estados |
| `src/hooks/useReservationExpiration.ts` | Usa nuevo estado `expirada` |
| `src/components/reservations/ReservationActions.tsx` | Actualiza AMBOS campos (estado + payment_status) |
| `src/components/reservations/ReservationsManagementPanel.tsx` | Badges basados SOLO en estado |
| `src/components/finance/CalendarAvailabilityReport.tsx` | Colores basados SOLO en estado |
| `src/pages/Finance.tsx` | Query usa estados unificados |

## Verificación

Después de aplicar la migración:

1. **Gestión de Reservas**: Los badges deben mostrar el estado correcto
2. **Calendario**: Los colores deben coincidir con la leyenda
3. **Marcar como Pagado**: Debe cambiar el badge a verde inmediatamente
4. **Finanzas**: Solo debe sumar ingresos de estados con pago

## Compatibilidad con Estados Legacy

El sistema mantiene compatibilidad con estados legacy (`pending`, `confirmed`, etc.) 
mapeándolos automáticamente a los nuevos estados unificados.
