# 📋 LÓGICA DE ESTADOS DE RESERVAS - EuroCar Connect

## 🎯 ESTADOS DISPONIBLES

### 1. **pending** o **pending_no_payment** (Amarillo/Lima)
- **Descripción**: Reserva creada sin pago
- **Color**: Verde lima / Amarillo
- **Badge**: "Reservado sin Pago"
- **Comportamiento**: 
  - Se cancela automáticamente después de 2 horas si no se paga
  - Muestra contador de tiempo restante
  - Aparece botón "Marcar como Pagado"

### 2. **pending_with_payment** (Verde)
- **Descripción**: Reserva pagada pero sin contrato firmado
- **Color**: Verde (#22c55e)
- **Badge**: "Reservado con Pago"
- **Comportamiento**:
  - NO se cancela automáticamente
  - Ya no muestra contador
  - Botón de pagar desaparece
  - Aparece botón "Cancelar con Reembolso"

### 3. **confirmed** (Rojo)
- **Descripción**: Reserva con contrato firmado (vehículo rentado)
- **Color**: Rojo (#ef4444)
- **Badge**: "Confirmada (Rentado)"
- **Comportamiento**:
  - Vehículo está en uso
  - No se puede cancelar fácilmente
  - Requiere proceso especial de devolución

### 4. **completed** (Gris)
- **Descripción**: Reserva completada y vehículo devuelto
- **Color**: Gris secundario
- **Badge**: "Completada"
- **Comportamiento**:
  - Parte del historial
  - No requiere acciones

### 5. **cancelled** (Rojo oscuro)
- **Descripción**: Reserva cancelada
- **Color**: Rojo destructivo
- **Badge**: "Cancelada"
- **Comportamiento**:
  - Vehículo liberado
  - Puede tener reembolso pendiente
  - Parte del historial

---

## 🔄 FLUJO DE ESTADOS

```
┌──────────────────────┐
│  CREAR RESERVA       │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│  pending_no_payment  │ ← Amarillo/Lima (2h para pagar)
│  (Sin pago)          │
└──────┬──────┬────────┘
       │      │
       │      └─────────→ ❌ Cancelada (auto después 2h)
       ↓
  💳 MARCAR COMO PAGADO
       ↓
┌──────────────────────┐
│ pending_with_payment │ ← Verde (Pagado, sin contrato)
│  (Con pago)          │
└──────┬──────┬────────┘
       │      │
       │      └─────────→ ❌ Cancelada (con reembolso)
       ↓
  📝 FIRMAR CONTRATO
       ↓
┌──────────────────────┐
│    confirmed         │ ← Rojo (Rentado)
│  (Con contrato)      │
└──────┬───────────────┘
       ↓
  🚗 DEVOLVER VEHÍCULO
       ↓
┌──────────────────────┐
│    completed         │ ← Gris (Terminada)
└──────────────────────┘
```

---

## 🎨 COLORES EN LA UI

### Calendario Mensual (Finanzas > Informes):
| Estado | Color en Calendario |
|--------|-------------------|
| pending_no_payment | Lima/Amarillo (#84cc16) |
| pending_with_payment | Verde (#22c55e) |
| confirmed | Rojo (#ef4444) |

### Gestión de Reservas:
| Estado | Badge Color |
|--------|-------------|
| pending_no_payment | bg-lime-400 |
| pending_with_payment | bg-green-400 |
| confirmed | bg-red-500 |
| completed | variant="secondary" |
| cancelled | variant="destructive" |

---

## 🔧 CÓDIGO ACTUAL (Funcionando)

### 1. Marcar como Pagado
**Archivo**: `src/components/reservations/ReservationActions.tsx`

```typescript
const handleMarkAsPaid = async () => {
  await supabase
    .from("reservations")
    .update({
      payment_status: "paid",
      payment_date: new Date().toISOString(),
      estado: "pending_with_payment", // ← Cambia estado
      auto_cancel_at: null, // ← Elimina auto-cancelación
    })
    .eq("id", reservation.id);
};
```

### 2. Mostrar Badge Correcto
**Archivo**: `src/components/reservations/ReservationsManagementPanel.tsx`

```typescript
const getStatusBadge = (estado: string, paymentStatus: string) => {
  if (estado === "confirmed") {
    return <Badge className="bg-red-500">Confirmada (Rentado)</Badge>;
  }
  if (estado === "pending_with_payment" || paymentStatus === "paid") {
    return <Badge className="bg-green-400">Reservado con Pago</Badge>;
  }
  if (estado === "pending_no_payment" || paymentStatus === "pending") {
    return <Badge className="bg-lime-400">Reservado sin Pago</Badge>;
  }
  // ...
};
```

### 3. Calendario Mensual
**Archivo**: `src/components/finance/CalendarAvailabilityReport.tsx`

```typescript
if (estado === 'confirmed' || estado === 'completed' || estado === 'active') {
  status = 'rented'; // Rojo
} 
else if (estado === 'pending_with_payment' || estado === 'reserved_paid') {
  status = 'reserved_paid'; // Verde
} 
else if (estado === 'pending_no_payment' || estado === 'pending') {
  status = 'reserved_no_payment'; // Amarillo/Lima
}
```

---

## ✅ VERIFICACIÓN DE FUNCIONALIDAD

### Para probar que todo funciona:

1. **Crear reserva sin pago**:
   - ✅ Estado: `pending` o `pending_no_payment`
   - ✅ Badge amarillo/lima
   - ✅ Muestra contador 2h
   - ✅ Botón "Marcar como Pagado" visible

2. **Marcar como pagado**:
   - ✅ Estado cambia a: `pending_with_payment`
   - ✅ payment_status cambia a: `paid`
   - ✅ Badge cambia a verde
   - ✅ Contador desaparece
   - ✅ Botón de pagar desaparece
   - ✅ Calendario muestra día en verde

3. **Firmar contrato**:
   - ✅ Estado cambia a: `confirmed`
   - ✅ Badge rojo
   - ✅ Calendario muestra día en rojo

---

## 🐛 PROBLEMAS POTENCIALES A VERIFICAR

### 1. Si el botón "Pagar" no actualiza:
- **Verificar**: Que `onUpdate()` se llame correctamente
- **Verificar**: Que el panel recargue las reservas después del update
- **Verificar**: Console del navegador para errores

### 2. Si el color no cambia en calendario:
- **Verificar**: Que el query incluya el campo `estado`
- **Verificar**: Logs en consola `[Calendario]`
- **Verificar**: Que la función `getDayStatusColor` use los estados correctos

### 3. Si no se mantiene el historial:
- **Verificar**: Que las queries NO filtren por estado
- **Verificar**: Que se usen `order by created_at DESC`
- **Verificar**: Que cancelled y completed se incluyan

---

## 📊 TABLAS DE BASE DE DATOS

### Campos relevantes en `reservations`:
```sql
estado TEXT NOT NULL DEFAULT 'pending'
payment_status TEXT NULL DEFAULT 'pending'
payment_date TIMESTAMP WITH TIME ZONE NULL
payment_reference TEXT NULL
auto_cancel_at TIMESTAMP WITH TIME ZONE NULL
```

### Valores válidos:
- **estado**: 
  - `pending` / `pending_no_payment`
  - `pending_with_payment`
  - `confirmed`
  - `completed`
  - `cancelled`

- **payment_status**:
  - `pending`
  - `paid`

---

## 🔍 DEBUGGING

### Ver en Console del Navegador (F12):
```javascript
// Al marcar como pagado:
[ReservationActions] Pago registrado
Estado actualizado: pending_with_payment
payment_status: paid

// En calendario:
[Calendario] Reserva encontrada: {
  estado: "pending_with_payment",
  vehiculo: "ABC123"
}
```

---

**Última actualización**: 10 de Diciembre de 2025
**Versión**: 1.0
