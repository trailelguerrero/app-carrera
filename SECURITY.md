# Seguridad — Trail El Guerrero App

Documento de referencia para las decisiones de seguridad activas en el proyecto.
Actualiza este archivo cada vez que modifiques configuración de seguridad.

---

## Content-Security-Policy (CSP)

Configurada en `vercel.json` → headers `/(.*)`

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: https://chart.googleapis.com;
connect-src 'self';
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
upgrade-insecure-requests
```

### Decisiones conscientes

| Directiva | Valor | Justificación |
|---|---|---|
| `connect-src` | `'self'` | La app solo consume sus propias APIs (`/api/*`). Si en el futuro se integra Sentry, PostHog, o cualquier servicio externo, **esta directiva debe ampliarse antes** o bloqueará las peticiones silenciosamente. |
| `style-src` | `'unsafe-inline'` | Necesario para estilos en línea generados por librerías de componentes. Eliminar requiere audit completo de componentes. |
| `script-src` | `'self'` (sin `unsafe-eval`) | Previene ejecución de código dinámico. Vite genera bundles estáticos — no se necesita eval. |
| `frame-ancestors` | `'none'` | Refuerza `X-Frame-Options: DENY`. Previene clickjacking. |

### ⚠️ Si necesitas añadir un servicio externo

Antes de integrarlo, actualiza `vercel.json` añadiendo el dominio a la directiva correspondiente:

```json
"connect-src 'self' https://tu-servicio.com"
```

**Sin este cambio el servicio fallará en producción sin errores obvios** — solo en la consola del navegador aparecerá `Refused to connect`.

---

## API Key

- La `API_KEY` **nunca** debe estar en el bundle del cliente
- El cliente usa `VITE_API_URL` (URL del proxy BFF) — sin key
- El BFF (`api/proxy.js`) inyecta la key como header server-side usando `process.env.API_KEY`
- La key se configura en las **Variables de Entorno de Vercel** (dashboard → Settings → Environment Variables)

---

## Rate Limiting

Implementado con Neon PostgreSQL persistente (`api/lib/rateLimiter.js`).

| Endpoint | Límite | Scope |
|---|---|---|
| `GET /api/data/public` | 30 req/min | `public` |
| `POST /api/voluntarios` | 10 req/10min | `register` |
| `* /api/data/[collection]` | 60 req/min | `data-collection` |
| `* /api/data/batch` | 60 req/min | `data-batch` |

> Los endpoints autenticados tienen límite más alto (60/min) porque las peticiones llevan API key — el vector de ataque real es un key leak, no un bot sin credenciales.

---

## Vulnerabilidades conocidas (aceptadas)

| CVE / Advisory | Paquete | Severidad | Entorno | Decisión |
|---|---|---|---|---|
| GHSA-67mh-4wv8-2f99 | `esbuild ≤ 0.24.2` | Moderate | Solo dev server | **Aceptada** — no afecta producción. Fix requiere Vite 8 (major con breaking changes). Revisar en próximo ciclo de upgrades. |

---

## Historial

| Fecha | Cambio |
|---|---|
| 2026-05-09 | CSP configurada en `vercel.json`; rate limiter activado en todos los endpoints |
| 2026-05-09 | `ADAPTER` externalizado a `VITE_ADAPTER` env var |
| 2026-05-09 | ExcelJS cargado con `import()` dinámico — eliminado del bundle inicial |
| 2026-06-05 | Fase 12: documentación completa — README, docs/ARCHITECTURE.md, docs/API.md |
