# 🚗 EuroCar Rental - Sistema de Gestión

Sistema profesional de gestión para alquiler de vehículos construido con React, Vite, Supabase y Tailwind CSS.

![EuroCar Rental](public/assets/eurocar_logo.png)

## 🎯 Características Principales

- 🔐 **Autenticación y Roles**: Sistema completo con roles (Socio Principal, Administrador, Comercial, Operativo)
- 🚙 **Gestión de Vehículos**: CRUD completo, mantenimiento, alertas
- 👥 **Gestión de Clientes**: Perfiles completos, historial, estadísticas
- 📅 **Reservas**: Calendario unificado, gestión de disponibilidad
- 📝 **Contratos**: Firma digital, generación de PDFs
- ✅ **Checklists**: Templates personalizables para entrega/devolución
- 💰 **Finanzas**: Control de ingresos, gastos, pico y placa
- 📊 **Dashboard**: Métricas en tiempo real
- 🔔 **Alertas**: Notificaciones automáticas de mantenimiento
- 📍 **Geolocalización**: Control de ubicación con geofencing
- ⏰ **Control de Horarios**: Registro de entrada/salida de empleados
- 📱 **PWA**: Aplicación instalable en móviles

## 🛠️ Stack Tecnológico

- **Frontend**: React 18, TypeScript, Vite
- **Estilos**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Estado**: React Query (TanStack Query)
- **Formularios**: React Hook Form + Zod
- **Rutas**: React Router v6
- **Gráficas**: Recharts
- **PDF**: jsPDF
- **PWA**: vite-plugin-pwa + Workbox

## 🚀 Despliegue Rápido

### 1. Clonar y Configurar

```bash
git clone https://github.com/tu-usuario/eurocar-rental.git
cd eurocar-rental
npm install
cp .env.example .env
```

### 2. Configurar Variables de Entorno

Edita `.env` con tus credenciales de Supabase:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu-anon-key
VITE_SUPABASE_PROJECT_ID=tu-project-id
```

### 3. Modificar Cliente Supabase

**IMPORTANTE:** Después de exportar desde Lovable, edita `src/integrations/supabase/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

### 4. Desarrollo Local

```bash
npm run dev
# Abre http://localhost:8080
```

### 5. Deploy en Netlify

1. Conecta tu repo GitHub a Netlify
2. Configura variables de entorno en Netlify:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
3. Deploy automático

Ver guía completa en [DEPLOY.md](./DEPLOY.md)

## 📁 Estructura del Proyecto

```
eurocar-rental/
├── public/assets/           # Logos e imágenes
├── src/
│   ├── components/          # Componentes React
│   ├── hooks/               # Custom hooks
│   ├── integrations/supabase/ # Cliente Supabase
│   ├── lib/                 # Utilidades
│   └── pages/               # Páginas
├── supabase/functions/      # Edge Functions
├── database/schema.sql      # Schema de BD
├── .env.example             # Variables de entorno
├── DEPLOY.md                # Guía de despliegue
└── netlify.toml             # Config Netlify
```

## ⚡ Edge Functions

Para desplegar Edge Functions a tu Supabase:

```bash
npm install -g supabase
supabase login
supabase link --project-ref tu-project-id
supabase functions deploy
```

## 📱 PWA

La app es instalable en móviles:
- **Android**: Chrome → Menú → Instalar app
- **iOS**: Safari → Compartir → Agregar a inicio

## 🔑 Roles

| Rol | Permisos |
|-----|----------|
| Socio Principal | Acceso total, gestión de usuarios |
| Administrador | Operaciones, reportes, configuración |
| Comercial | Clientes, reservas, contratos |
| Operativo | Checklists, mantenimiento |

## 📝 Scripts

```bash
npm run dev      # Desarrollo
npm run build    # Build producción
npm run preview  # Preview build
```

## 📄 Documentación

- [DEPLOY.md](./DEPLOY.md) - Guía completa de despliegue
- [.env.example](./.env.example) - Variables de entorno

---

Desarrollado con ❤️ para EuroCar Rental
