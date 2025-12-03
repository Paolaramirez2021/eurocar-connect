# 🚀 EuroCar Rental - Guía Completa de Despliegue

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Configuración de Supabase Externo](#configuración-de-supabase-externo)
3. [Variables de Entorno](#variables-de-entorno)
4. [Despliegue en Netlify](#despliegue-en-netlify)
5. [Configuración de Edge Functions](#configuración-de-edge-functions)
6. [PWA y Notificaciones](#pwa-y-notificaciones)
7. [Verificación Post-Deploy](#verificación-post-deploy)
8. [Troubleshooting](#troubleshooting)

---

## 📦 Requisitos Previos

- Cuenta en [GitHub](https://github.com)
- Cuenta en [Netlify](https://www.netlify.com)
- Cuenta en [Supabase](https://supabase.com) (proyecto externo ya creado)
- Node.js 18+ (para desarrollo local)
- Supabase CLI (para Edge Functions)

---

## 🗄️ Configuración de Supabase Externo

### 1. Obtener Credenciales

En tu proyecto de Supabase, ve a **Settings** → **API** y copia:

```
Project URL: https://vdjwnbtdtihnxntedtgh.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: (para Edge Functions)
```

### 2. Verificar Schema

Asegúrate de que tu Supabase tiene todas las tablas necesarias:

- `vehicles` - Flota de vehículos
- `customers` - Clientes
- `reservations` - Reservas
- `contracts` - Contratos
- `maintenance` - Mantenimientos
- `profiles` - Perfiles de usuarios
- `user_roles` - Roles de usuario
- `notifications` - Notificaciones
- `settings` - Configuración
- `alerts` - Alertas
- `alerts_maintenance` - Alertas de mantenimiento
- `finance_items` - Items financieros
- `checklists` - Checklists
- `checklist_templates` - Templates de checklist
- `checklist_items` - Items de checklist
- `pico_placa_payments` - Pagos pico y placa
- `agents` - Agentes API
- `audit_log` - Log de auditoría
- `time_entries` - Entradas de tiempo
- `geofence_zones` - Zonas geofence

### 3. Configurar RLS Policies

Verifica que todas las políticas RLS estén activas en tu Supabase.

### 4. Configurar Storage Buckets

Crea los buckets necesarios:

```sql
-- En SQL Editor de Supabase
INSERT INTO storage.buckets (id, name, public) 
VALUES ('contracts', 'contracts', true);

INSERT INTO storage.buckets (id, name, public) 
VALUES ('customer-documents', 'customer-documents', false);
```

---

## 🔐 Variables de Entorno

### Para Netlify (Frontend)

Configura estas variables en **Site Settings** → **Environment Variables**:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | URL de tu proyecto Supabase | `https://vdjwnbtdtihnxntedtgh.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key de Supabase | `eyJhbGciOiJIUzI1NiIs...` |
| `VITE_SUPABASE_PROJECT_ID` | ID del proyecto | `vdjwnbtdtihnxntedtgh` |

### Para Supabase Edge Functions

Configura en **Supabase Dashboard** → **Settings** → **Edge Functions** → **Secrets**:

| Secret | Descripción |
|--------|-------------|
| `SUPABASE_URL` | Auto-configurado |
| `SUPABASE_ANON_KEY` | Auto-configurado |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-configurado |
| `RESEND_API_KEY` | Para envío de emails |
| `ADMIN_EMAIL` | Email del admin |
| `GPT_API_KEY` | Para funciones de AI |

---

## 🌐 Despliegue en Netlify

### Paso 1: Preparar el Código

Después de exportar a GitHub, modifica `src/integrations/supabase/client.ts`:

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

### Paso 2: Conectar a Netlify

1. Ve a [app.netlify.com](https://app.netlify.com)
2. Click **Add new site** → **Import an existing project**
3. Selecciona GitHub y autoriza
4. Selecciona tu repositorio `eurocar-rental`

### Paso 3: Configurar Build

La configuración ya está en `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Paso 4: Agregar Variables

En **Site Settings** → **Environment Variables**, agrega:

```
VITE_SUPABASE_URL = https://vdjwnbtdtihnxntedtgh.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_PROJECT_ID = vdjwnbtdtihnxntedtgh
```

### Paso 5: Deploy

Click **Deploy site**. El proceso toma 2-5 minutos.

---

## ⚡ Configuración de Edge Functions

### Instalar Supabase CLI

```bash
npm install -g supabase
```

### Login y Link

```bash
supabase login
supabase link --project-ref vdjwnbtdtihnxntedtgh
```

### Configurar Secrets

```bash
# Configurar secrets para las functions
supabase secrets set RESEND_API_KEY=re_xxxxx
supabase secrets set ADMIN_EMAIL=admin@eurocar.com
supabase secrets set GPT_API_KEY=sk-xxxxx
```

### Deploy Functions

```bash
# Deploy todas
supabase functions deploy

# Deploy específica
supabase functions deploy export-table
supabase functions deploy send-contract-email
supabase functions deploy gpt-clientes
supabase functions deploy gpt-reserve
supabase functions deploy gpt-availability
supabase functions deploy send-maintenance-alerts
supabase functions deploy auto-cancel-reservations
```

### Verificar Functions

En **Supabase Dashboard** → **Edge Functions**, verifica que todas estén activas.

---

## 📱 PWA y Notificaciones

### Verificar PWA

1. Abre la app en Chrome
2. Ve a **DevTools** → **Application** → **Manifest**
3. Verifica que el manifest esté cargado correctamente
4. En **Service Workers**, verifica que esté registrado

### Habilitar Notificaciones Push (Opcional)

Para notificaciones push, necesitas configurar:

1. Generar VAPID keys
2. Configurar un servidor de push
3. Agregar código de suscripción

### Instalar PWA

**Android:**
1. Abre la app en Chrome
2. Menú → "Instalar app" o "Agregar a pantalla de inicio"

**iOS:**
1. Abre la app en Safari
2. Compartir → "Agregar a pantalla de inicio"

**Desktop:**
1. Click en el icono de instalación en la barra de direcciones

---

## ✅ Verificación Post-Deploy

### Checklist de Funcionalidad

- [ ] La app carga correctamente
- [ ] Login/Registro funciona
- [ ] Dashboard muestra datos
- [ ] Vehículos se cargan y editan
- [ ] Clientes se cargan y editan
- [ ] Reservas funcionan
- [ ] Calendario muestra eventos
- [ ] Contratos se generan
- [ ] Checklists funcionan
- [ ] Mantenimientos se registran
- [ ] Reportes financieros cargan
- [ ] Exportación de datos funciona
- [ ] Notificaciones funcionan
- [ ] PWA se instala correctamente

### Verificar Consola

Abre **DevTools** → **Console** y verifica:
- Sin errores de CORS
- Sin errores de autenticación
- Sin errores 404/500

### Verificar Network

En **DevTools** → **Network**:
- Las llamadas a Supabase retornan 200
- No hay llamadas a dominios de Lovable

---

## 🐛 Troubleshooting

### Error: Variables de entorno no definidas

```
Error: Missing Supabase environment variables
```

**Solución:** Verifica que las variables estén configuradas en Netlify y redeploya.

### Error: CORS

```
Access to fetch at 'https://xxx.supabase.co' has been blocked by CORS policy
```

**Solución:** En Supabase → **Settings** → **API**, agrega tu dominio de Netlify a los orígenes permitidos.

### Error: RLS Policy

```
new row violates row-level security policy
```

**Solución:** Verifica que el usuario esté autenticado y tenga los roles correctos.

### Error: Edge Function timeout

**Solución:** Optimiza la función o aumenta el timeout en `supabase/config.toml`.

### Build falla en Netlify

**Solución:** Revisa el log de build, generalmente es por:
- Dependencias faltantes
- Errores de TypeScript
- Variables de entorno no configuradas

---

## 🔄 Workflow de Desarrollo

### Desarrollo Local

```bash
# Clonar
git clone https://github.com/tu-usuario/eurocar-rental.git
cd eurocar-rental

# Instalar
npm install

# Configurar env
cp .env.example .env
# Editar .env con tus credenciales

# Desarrollar
npm run dev
```

### Deploy a Producción

```bash
# Commit cambios
git add .
git commit -m "feat: nueva funcionalidad"
git push origin main

# Netlify auto-deploya en 2-3 minutos
```

### Rollback

En Netlify → **Deploys** → Selecciona un deploy anterior → **Publish deploy**

---

## 📞 Resumen de URLs

| Servicio | URL |
|----------|-----|
| App Producción | https://tu-sitio.netlify.app |
| Supabase Dashboard | https://supabase.com/dashboard/project/vdjwnbtdtihnxntedtgh |
| Netlify Dashboard | https://app.netlify.com/sites/tu-sitio |
| GitHub Repo | https://github.com/tu-usuario/eurocar-rental |

---

## 📊 Monitoreo

### Netlify
- **Analytics**: Visitas, rendimiento, errores
- **Functions**: Logs de serverless functions

### Supabase
- **Logs**: API requests, auth events
- **Database**: Uso, queries lentas
- **Edge Functions**: Invocaciones, errores

---

🎉 **¡Tu aplicación está lista para producción!**
