# EUROCAR RENTAL - Sistema de Gestión de Alquiler de Vehículos

## Descripción General
Sistema completo de gestión de alquiler de vehículos para EUROCAR RENTAL, con funcionalidades de reservas, contratos digitales, finanzas y mantenimiento de flota.

## Stack Tecnológico
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend Principal**: Supabase (PostgreSQL, Auth, Storage)
- **Backend Adicional**: FastAPI (Python) para generación de PDFs y envío de emails
- **Email**: Resend (dominio: contact.eurocarental.com)
- **PDF**: Puppeteer (Node.js)

## Arquitectura

```
/app/
├── backend/                    # FastAPI backend para contratos
│   ├── server.py              # API endpoints
│   ├── generate_pdf.cjs       # Script Puppeteer para PDFs
│   └── .env                   # Credenciales (Resend)
├── src/
│   ├── components/
│   │   ├── contracts/         # Componentes de contratos
│   │   │   ├── ContractsList.tsx  # Historial con reenvío de email
│   │   │   ├── ContractForm.tsx   # Formulario de firma
│   │   │   └── ...
│   │   ├── finance/           # Componentes de finanzas
│   │   └── ...
│   ├── pages/                 # Páginas de la aplicación
│   ├── services/              # Servicios (ContractService, etc.)
│   └── integrations/          # Integraciones (Supabase)
└── supabase/                  # Migraciones y configuración
```

## Funcionalidades Implementadas

### ✅ Sistema de Contratos Digitales
- Formulario de contrato con búsqueda de cliente por documento
- Captura de firma digital (canvas)
- Captura de huella digital (cámara/archivo)
- **Captura de foto del cliente** - Fuerza apertura de cámara (frontal) directamente
  - Móviles: Usa input nativo con `capture="user"` para abrir cámara directamente
  - Desktop: Usa MediaDevices API con facingMode "user"
  - Fallback automático si MediaDevices falla
- Términos y condiciones con aceptación
- Generación de PDF con Puppeteer
- Envío automático de contrato por email (Resend)
- **Reenvío de contrato** desde el historial (botón de email)
- Almacenamiento de assets en Supabase Storage

### ✅ Módulo de Finanzas
- Dashboard con ingresos mensuales (no acumulativos)
- Calendarios de disponibilidad con rangos de fechas completos
- Reportes detallados de mantenimientos
- Ordenamiento de vehículos por precio (tarifa_dia_iva)

### ✅ Gestión de Mantenimientos
- Edición de costos y detalles
- Visualización de rangos de fechas completos
- Historial ordenado por precio

### ✅ Backend FastAPI
- **GET /health**: Estado del servicio
- **POST /generate-pdf**: Genera PDF desde HTML
- **POST /send-contract-email**: Envía/reenvía contrato por email

## Credenciales Configuradas
- **Resend API Key**: Configurada en /app/backend/.env
- **Sender Email**: reservas@contact.eurocarental.com
- **Supabase**: Configurado en /app/.env

## Tareas Pendientes

### 🟡 P1 - Próximo
1. Refactorizar componentes grandes: `PreliminaryContractForm.tsx` (~980 líneas) y `ConvertToFinalDialog.tsx` (~600 líneas)
2. Configurar `VITE_API_URL` en Netlify Dashboard → Site configuration → Environment variables (pendiente del usuario)

### 🟢 P2 - Futuro
1. Mejorar políticas RLS de Supabase (actualmente muy permisivas con `USING (true)`)
2. Integración con huellero digital USB/Bluetooth

## Notas Técnicas
- El backend FastAPI corre en puerto 8001, accesible vía /api desde el frontend
- Puppeteer requiere Chrome instalado (npx puppeteer browsers install chrome)
- El proyecto usa ES modules, scripts CommonJS deben tener extensión .cjs

## URLs
- Preview: https://vehicle-lease-app-9.preview.emergentagent.com
- Backend API: https://vehicle-lease-app-9.preview.emergentagent.com/api/

## Última Actualización
Fecha: Diciembre, 2025

### Sesión actual (Abril 2026)
- Fondo blanco sólido (#FFFFFF) en firma del representante legal en PDF final (`contractTemplate.ts` línea 286)
- Fondo blanco sólido (#FFFFFF) en firma del cliente vía clase `.signature-img` (`contractTemplate.ts` línea 131)
- Refactorización de fetch calls a `apiUrl.ts` con `VITE_API_URL` para soporte Netlify
- Fix race condition cámara en `ContractPhotoCapture.tsx` y `ContratoFinal.tsx`
- Toggle de visibilidad CVV en `CustomerForm.tsx` y `ReservationForm.tsx`

### Historial previo
- 16 Marzo 2025: Mejoras en sistema de contratos
  - Términos y Condiciones y Política de Datos actualizados con documentos oficiales de EUROCAR
  - Modales para visualizar documentos legales completos
  - Checkboxes separados para aceptación de términos y política de datos
  - Conversión de contrato preliminar a final ahora mantiene el mismo número de contrato
  - El contrato se actualiza (no se crea uno nuevo) al firmar
  - Badge "Firmado" en verde para contratos finales
