# EuroCar Connect - PRD

## Problema Original
Sistema de gestión de alquiler de vehículos con React/Vite frontend, FastAPI backend, y Supabase.

## Arquitectura
- Frontend: React + Vite + TypeScript + Tailwind CSS + Shadcn UI
- PDF Generation: Railway backend (Puppeteer) + html2pdf.js (browser fallback)
- Backend: FastAPI (solo para email via Resend - opcional)
- Database: Supabase (PostgreSQL, Auth, Storage)
- WhatsApp: wa.me links (sin API paga)
- Wacom SigCaptX: WebSocket local (localhost:9000)

## Funcionalidades Implementadas
- Contratos preliminares y finales con PDF
- Firma digital (Wacom STU-500), huella, foto cliente, documentos
- Validaciones obligatorias en formulario preliminar
- WhatsApp envío (wa.me link)
- Reservas con validación de solapamiento (turnaround mismo día)
- Clientes con documentos frente/reverso y prevención de duplicados
- IVA: EUROCAR- = 19%, sin prefijo = 0% (Tourism)
- Edición de reservas (cambio de vehículo)
- Cancelación de reservas con motivo
- Timezone -05:00 para Colombia
- Gestión de mantenimientos con calendario y alertas

## Completado (Julio 2026)
- [x] Módulo Inspección Vehicular completo (8 pestañas)
- [x] Diagrama interactivo SVG (5 vistas: frontal, trasera, laterales, superior)
- [x] Checklist por categorías (exterior, interior, mecánica, documentos, seguridad)
- [x] Registro de daños con posición, tipo, severidad
- [x] Comparación Antes vs Después (recepción vs entrega)
- [x] Firmas digitales en inspección (cliente + inspector)
- [x] Upload de fotos por categoría
- [x] Tab Resumen con métricas y overview
- [x] Navegación: Item "Inspecciones" en sidebar
- [x] Fix case-sensitivity reservas web (Confirmed vs confirmed)
- [x] Verificación inmediata de cédula duplicada (onBlur)
- [x] PDF generation client-side + Railway backend
- [x] Fix reservas solapadas
- [x] Fix valores contrato final
- [x] Validaciones obligatorias contrato preliminar
- [x] WhatsApp envío contratos
- [x] Forma de pago y deducible en BD y PDF final

## Pendiente
- [ ] **Ejecutar SQL de tablas de inspección en Supabase** (archivo: /app/supabase/07_vehicle_inspections.sql)
- [ ] Generación de PDF profesional para inspecciones (logo, QR, firmas)
- [ ] Verificación DKIM Resend para emails
- [ ] Políticas RLS Supabase granulares
- [ ] Refactorizar componentes monolíticos (PreliminaryContractForm, ConvertToFinalDialog, ReservationForm)
- [ ] Integración huellero digital
- [ ] Limpieza de archivos no usados

## Base de Datos - Inspecciones
Tablas nuevas (requieren ejecución de SQL):
- `vehicle_inspections` - Inspección principal (entrega/recepción)
- `inspection_items` - Items de checklist por categoría
- `inspection_damages` - Daños con coordenadas en diagrama
- `inspection_photos` - Fotografías por categoría
- `inspection_signatures` - Firmas digitales

## Archivos Clave
- `/app/src/pages/VehicleInspections.tsx` - Página principal del módulo
- `/app/src/components/inspections/InspectionForm.tsx` - Formulario multi-tab
- `/app/src/components/inspections/VehicleDiagram.tsx` - Diagrama SVG interactivo
- `/app/src/components/inspections/ChecklistSection.tsx` - Componente de checklist reutilizable
- `/app/src/components/inspections/tabs/` - 8 tabs del formulario
- `/app/supabase/07_vehicle_inspections.sql` - Schema SQL para Supabase
