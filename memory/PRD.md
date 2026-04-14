# EuroCar Connect - PRD

## Problema Original
Sistema de gestión de alquiler de vehículos (rental management) con React/Vite frontend, FastAPI backend, y Supabase (DB/Storage/Auth).

## Arquitectura
- Frontend: React + Vite + TypeScript + Tailwind CSS + Shadcn UI
- Backend: FastAPI (Python) + Puppeteer (PDF generation)
- Database: Supabase (PostgreSQL, Auth, Storage)
- Comunicación: Signed URLs para documentos

## Funcionalidades Implementadas

### Contratos
- Generación de contrato preliminar con PDF vía Puppeteer
- Conversión a contrato final con firma digital, huella, foto cliente, documentos
- Campos: servicio_viajar, termino_contrato, km_adicional, conductores autorizados
- Compresión de imágenes base64 para evitar 413 payload too large
- IVA: solo aplica a valor_dias (valor_adicional es exento)
- Validaciones obligatorias en formulario preliminar (identificación, vehículo, valor contrato)

### Reservas
- CRUD completo de reservaciones
- Validación de solapamiento de fechas (reservaciones y mantenimiento)
- Búsqueda de clientes por nombre/apellido/cédula con dropdown
- Cálculo automático de precios con IVA
- Alerta de seguridad para clientes bloqueados

### Clientes
- Upload de documentos (Cédula, Licencia, Tarjeta) frente/reverso con Supabase Signed URLs
- Auto-populado de documentos en firma de contrato

### Vehículos
- Gestión de flota completa
- Tarifa diaria configurable

## Completado (Abril 2026)
- [x] Fix reservas solapadas (P0) - eliminado RPC, validación directa con format() date-fns
- [x] Fix valores contrato final - reconstrucción correcta desde tarifa vehículo + total_amount
- [x] Fix horas y fechas en contrato final (timezone-safe string extraction)
- [x] Fix formato fecha vencimiento licencia en contrato final (dd/MM/yyyy)
- [x] Validaciones obligatorias en contrato preliminar (cliente, vehículo, pago, deducible)
- [x] Campos contrato: servicio_viajar, termino_contrato, km_adicional, conductores
- [x] Upload documentos cliente (frente/reverso) con Signed URLs
- [x] Auto-populado documentos en ConvertToFinalDialog
- [x] Compresión imágenes base64 para PDF
- [x] IVA correcto (valor_adicional exento)
- [x] Búsqueda cliente mejorada (nombre/apellido/cédula)

## Pendiente
- [ ] Políticas RLS de Supabase (P2 - seguridad)
- [ ] Refactorizar componentes grandes (PreliminaryContractForm 1200+ líneas, ConvertToFinalDialog 790 líneas, ReservationForm 1570 líneas)
- [ ] Verificación dominio Resend para emails
- [ ] Limpieza archivos no usados

## Notas Técnicas
- La tabla `contracts` en Supabase NO tiene columnas financieras individuales (valor_dia, valor_adicional, etc.), solo `total_amount`. Los valores se reconstruyen desde la tarifa del vehículo y la reserva vinculada.
- Las fechas de reservas se guardan como `YYYY-MM-DD` (formato limpio, sin timezone).
- Las fechas de contratos se guardan como `YYYY-MM-DDThh:mm` (incluyen hora del formulario).
