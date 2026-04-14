# EuroCar Connect - PRD

## Problema Original
Sistema de gestión de alquiler de vehículos (rental management) con React/Vite frontend, FastAPI backend, y Supabase (DB/Storage/Auth).

## Arquitectura
- Frontend: React + Vite + TypeScript + Tailwind CSS + Shadcn UI
- Backend: FastAPI (Python) + Puppeteer (PDF generation)
- Database: Supabase (PostgreSQL, Auth, Storage)
- Email: Resend (dominio pendiente verificación DKIM)
- WhatsApp: wa.me links (sin API paga)

## Funcionalidades Implementadas

### Contratos
- Generación de contrato preliminar con PDF vía Puppeteer
- Conversión a contrato final con firma digital, huella, foto cliente, documentos
- Campos: servicio_viajar, termino_contrato, km_adicional, conductores autorizados
- Compresión de imágenes base64 para evitar 413 payload too large
- IVA: solo aplica a valor_dias (valor_adicional es exento)
- Validaciones obligatorias en formulario preliminar
- Envío por WhatsApp (wa.me link con PDF público)
- Envío por Email (Resend con fallback a onboarding@resend.dev)

### Reservas
- CRUD completo de reservaciones
- Validación de solapamiento de fechas (reservaciones y mantenimiento)
- Búsqueda de clientes por nombre/apellido/cédula con dropdown
- Cálculo automático de precios con IVA
- Alerta de seguridad para clientes bloqueados

### Clientes
- Upload de documentos (Cédula, Licencia, Tarjeta) frente/reverso con Supabase Signed URLs

## Completado (Abril 2026)
- [x] Fix reservas solapadas (P0) - validación directa con format() date-fns
- [x] Fix valores contrato final - reconstrucción correcta desde tarifa vehículo
- [x] Fix horas y fechas en contrato final (timezone-safe)
- [x] Validaciones obligatorias contrato preliminar
- [x] WhatsApp: envío contrato preliminar y final via wa.me link
- [x] Email fallback: onboarding@resend.dev cuando dominio no verificado

## Pendiente
- [ ] Verificación DKIM en Resend (usuario debe agregar TXT record en DNS)
- [ ] Políticas RLS de Supabase (P2)
- [ ] Refactorizar componentes grandes

## Notas Técnicas
- La tabla `contracts` solo tiene `total_amount`. Valores financieros se reconstruyen desde tarifa vehículo + reserva vinculada.
- WhatsApp usa wa.me (gratis, sin API). Teléfono se normaliza con código país 57 (Colombia).
- Email Resend: SENDER_EMAIL=reservas@contact.eurocarental.com. DKIM pendiente. Fallback a onboarding@resend.dev (limitado a email del dueño de cuenta).
