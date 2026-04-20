# EuroCar Connect - PRD

## Problema Original
Sistema de gestión de alquiler de vehículos con React/Vite frontend, FastAPI backend, y Supabase.

## Arquitectura
- Frontend: React + Vite + TypeScript + Tailwind CSS + Shadcn UI (desplegado en Netlify)
- PDF Generation: html2pdf.js (100% en navegador, sin backend)
- Backend: FastAPI (solo para email via Resend - opcional)
- Database: Supabase (PostgreSQL, Auth, Storage)
- WhatsApp: wa.me links (sin API paga)

## Cambio Arquitectural Importante (Abril 18, 2026)
- PDF se genera ahora en el NAVEGADOR con html2pdf.js
- Ya NO depende del backend de Emergent preview para PDFs
- Backend solo se usa para envío de emails (Resend)
- Esto elimina errores de "404 page not found" y "DOCTYPE is not valid JSON"

## Funcionalidades Implementadas
- Contratos preliminares y finales con PDF
- Firma digital, huella, foto cliente, documentos
- Validaciones obligatorias en formulario preliminar
- WhatsApp envío (wa.me link)
- Reservas con validación de solapamiento
- Clientes con documentos frente/reverso
- IVA: solo aplica a valor_dias (valor_adicional exento)

## Completado
- [x] PDF generation client-side (html2pdf.js) - elimina dependencia backend
- [x] Fix reservas solapadas
- [x] Fix valores contrato final
- [x] Validaciones obligatorias contrato preliminar
- [x] WhatsApp envío contratos
- [x] Forma de pago y deducible en BD y PDF final

## Pendiente
- [ ] Verificación DKIM Resend para emails
- [ ] Políticas RLS Supabase
