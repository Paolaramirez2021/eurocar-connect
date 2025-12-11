# 🔧 Sistema de Estados de Reservas - Versión 2

## Cambios Realizados

### 1. Estados Oficiales
| Estado | Color | Descripción |
|--------|-------|-------------|
| `sin_pago` | 🟡 Amarillo | Reserva sin pago (2h para pagar) |
| `con_pago` | 🟢 Verde | Reserva pagada, lista para contrato |
| `contrato_generado` | 🔵 Azul | Contrato creado, pendiente firma |
| `confirmado` | 🔴 Rojo | Contrato firmado, en alquiler |
| `completada` | ⬛ Gris | Vehículo devuelto |
| `expirada` | 🟠 Naranja | Expiró por falta de pago |
| `cancelada` | 🔴 Rojo oscuro | Cancelada |

### 2. Tipo de Cancelación
Nuevo campo `cancellation_type`:
- `con_devolucion`: Cancelada con devolución de dinero
- `sin_devolucion`: Cancelada sin devolución

### 3. Archivos Modificados
- `src/config/states.ts` - Configuración centralizada
- `src/components/reservations/ReservationActions.tsx` - Acciones corregidas
- `src/components/reservations/ReservationsManagementPanel.tsx` - Badges y filtros
- `src/components/finance/CalendarAvailabilityReport.tsx` - Calendario
- `src/pages/Finance.tsx` - Queries de finanzas
- `src/hooks/useReservationExpiration.ts` - Expiración automática

## Migración SQL Requerida

**Ejecutar en Supabase Dashboard > SQL Editor:**

```sql
-- 1. Agregar columna cancellation_type
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancellation_type TEXT;

-- 2. Migrar estados legacy
UPDATE reservations SET estado = 'sin_pago' WHERE estado IN ('pending', 'pending_no_payment', 'reservado_sin_pago');
UPDATE reservations SET estado = 'con_pago' WHERE estado IN ('pending_with_payment', 'reservado_con_pago');
UPDATE reservations SET estado = 'confirmado' WHERE estado = 'confirmed';
UPDATE reservations SET estado = 'completada' WHERE estado = 'completed';
UPDATE reservations SET estado = 'expirada' WHERE estado = 'expired';
UPDATE reservations SET estado = 'cancelada' WHERE estado IN ('cancelled', 'cancelada_con_devolucion', 'cancelada_sin_devolucion');

-- 3. Políticas RLS para usuarios autenticados
DROP POLICY IF EXISTS "Authenticated users can view all reservations" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated users can create reservations" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated users can update all reservations" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated users can delete reservations" ON public.reservations;

CREATE POLICY "Authenticated users can view all reservations" ON public.reservations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create reservations" ON public.reservations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update all reservations" ON public.reservations FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete reservations" ON public.reservations FOR DELETE USING (auth.uid() IS NOT NULL);

-- 4. Lo mismo para contracts
DROP POLICY IF EXISTS "Authenticated users can view all contracts" ON public.contracts;
DROP POLICY IF EXISTS "Authenticated users can create contracts" ON public.contracts;
DROP POLICY IF EXISTS "Authenticated users can update all contracts" ON public.contracts;

CREATE POLICY "Authenticated users can view all contracts" ON public.contracts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create contracts" ON public.contracts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update all contracts" ON public.contracts FOR UPDATE USING (auth.uid() IS NOT NULL);
```

## Funcionalidades

### ✅ Implementado
1. Estados actualizados en todas las vistas
2. Cancelación con/sin devolución funciona
3. Expiración automática cada 60 segundos
4. Colores consistentes en calendario y gestión
5. Finanzas solo cuenta estados con pago
6. Calendario libera vehículos cancelados/expirados

### ⚠️ Pendiente
1. Ejecutar migración SQL en Supabase
2. Verificar que los contratos se conectan correctamente con reservas
