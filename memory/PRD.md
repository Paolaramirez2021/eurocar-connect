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

### 🔴 P0 - Inmediato
1. Probar flujo completo de contrato con usuario real
2. Verificar que emails lleguen correctamente a destinatarios

### 🟡 P1 - Próximo
1. Implementar generación de PDF con template completo (ContractTemplate.tsx)
2. Subir PDF generado a Supabase Storage
3. Historial de contratos con descarga de PDF

### 🟢 P2 - Futuro
1. Mejorar políticas RLS de Supabase (actualmente muy permisivas)
2. Push de cambios a GitHub (rama emergent-dev)
3. Integración con huellero digital USB/Bluetooth

## Notas Técnicas
- El backend FastAPI corre en puerto 8001, accesible vía /api desde el frontend
- Puppeteer requiere Chrome instalado (npx puppeteer browsers install chrome)
- El proyecto usa ES modules, scripts CommonJS deben tener extensión .cjs

## URLs
- Preview: https://eurocar-rental-1.preview.emergentagent.com
- Backend API: https://eurocar-rental-1.preview.emergentagent.com/api/

## Última Actualización
Fecha: 13 de Marzo, 2025
Sesión: Reenvío de contratos por email implementado
