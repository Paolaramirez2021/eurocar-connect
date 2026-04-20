# Eurocar PDF Generator - Railway Backend

Backend dedicado para generar PDFs de contratos con Puppeteer.
Desplegado en Railway para estar siempre activo.

## Deploy en Railway

1. Ve a [railway.app](https://railway.app) y crea cuenta (gratis con GitHub)
2. Click "New Project" → "Deploy from GitHub repo"
3. Sube este directorio `railway-pdf-backend/` como un repo en GitHub (o conecta el repo existente)
4. Railway detectará el Dockerfile automáticamente
5. No necesitas variables de entorno adicionales (Railway asigna `PORT` automáticamente)
6. Una vez desplegado, copia la URL pública (ejemplo: `https://eurocar-pdf-production.up.railway.app`)

## Deploy rápido (sin GitHub)

1. Instala Railway CLI: `npm install -g @railway/cli`
2. Ejecuta:
```bash
cd railway-pdf-backend
railway login
railway init
railway up
```

## Configurar en tu App

Una vez tengas la URL de Railway, actualiza el archivo `.env` de tu proyecto:

```
VITE_API_URL=https://TU-URL-RAILWAY.up.railway.app
```

## Endpoints

- `GET /health` - Health check
- `POST /generate-pdf` - Genera PDF desde HTML

### Ejemplo de uso:
```bash
curl -X POST https://TU-URL-RAILWAY.up.railway.app/generate-pdf \
  -H "Content-Type: application/json" \
  -d '{"html":"<h1>Hola</h1>"}'
```

## Notas
- Usa Puppeteer + Chromium para renderizar HTML a PDF (misma calidad que tenías)
- El endpoint es `/generate-pdf` (sin `/api` prefix)
- Railway mantiene el servicio siempre activo
- Free tier: 500 horas/mes (suficiente para uso normal)
