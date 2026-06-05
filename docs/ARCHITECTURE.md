# Arquitectura — App Carrera · Trail El Guerrero 2026

Documento de referencia técnica para la arquitectura de la aplicación.
Para la referencia de la API ver [`API.md`](API.md).

---

## 1. Visión general

La aplicación sigue un modelo **BFF (Backend-For-Frontend)**: el cliente React solo conoce un único endpoint de backend (`/api/proxy/*`). Todas las llamadas a la base de datos y servicios externos se realizan desde funciones serverless en Vercel.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser / PWA                            │
│  React 18 + Vite  ·  Zustand  ·  TanStack Query  ·  Leaflet   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS  /api/proxy/*
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Vercel Edge Network                          │
├─────────────────────────────────────────────────────────────────┤
│  api/proxy.js  (BFF)                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  1. CORS exacto (allowlist de orígenes)                 │   │
│  │  2. Cabeceras de seguridad HTTP                         │   │
│  │  3. Verificación de sesión (JWT cookie HttpOnly)        │   │
│  │  4. Rate limiting por IP (Neon)                         │   │
│  │  5. Inyección de x-api-key server-side                  │   │
│  │  6. Reenvío a endpoint interno                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│         │                     │                    │           │
│         ▼                     ▼                    ▼           │
│  api/data/[col]        api/voluntarios       api/panel/auth    │
│  api/budget-log        api/push              api/setup         │
│  api/documents         api/docs/[patId]      api/images        │
│         │                     │                    │           │
│         ▼                     ▼                    ▼           │
│    Neon PostgreSQL       Neon PostgreSQL      Vercel Blob      │
│    (pooled – DML)        (pooled – DML)       (documentos,     │
│    (direct – DDL)                              imágenes)       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Capa de frontend

### 2.1 Páginas y rutas

| Ruta | Página | Autenticación |
|---|---|---|
| `/` | `Landing.tsx` | Pública |
| `/panel` | `Index.jsx` | PIN (cookie de sesión) |
| `/voluntarios/mi-ficha` | `VoluntarioPortal.jsx` | Pública |
| `/dia-carrera` | `DiaCarreraPage.jsx` | PIN |
| `*` | `NotFound.tsx` | — |

### 2.2 Gestión de estado

```
useAppStore.ts  (Zustand)
├── uiSlice.ts          — tema, sidebar, modales abiertos
├── logisticaSlice.ts   — estado UI de logística (filtros, pedido activo)
├── diaCarreraSlice.ts  — estado en tiempo real del día de la carrera
└── eventBusSlice.js    — bus de eventos entre módulos

TanStack Query (React Query)
└── Caché de datos remotos — invalida/refetch por colección
    Hooks: useData.ts, useDashboardQueries.ts, useDashboardData.ts…
```

- **Zustand** maneja estado de UI local (qué tab está abierta, filtros activos).
- **React Query** gestiona el ciclo de vida de las peticiones al BFF: caché, refetch, estado de carga/error.
- La separación evita que datos remotos contaminen el store de UI.

### 2.3 Persistencia — adapter pattern

`src/lib/dataService.ts` expone una interfaz única independiente del backend:

```
VITE_ADAPTER=api          → peticiones a /api/proxy/*  (producción)
VITE_ADAPTER=localStorage → localStorage del navegador  (desarrollo offline)
```

Todos los hooks consumen `dataService` sin conocer el adapter activo.

### 2.4 Schemas Zod compartidos

Los schemas en `src/lib/schemas/` se importan tanto desde los formularios React como desde los endpoints de la API:

```
src/lib/schemas/
├── voluntarioSchema.js   — datos del voluntario (frontend + api/lib/voluntarioValidation.js)
├── logisticaSchema.js    — material y pedidos
├── camisetaSchema.js     — pedido de camisetas
└── conceptoSchema.js     — conceptos de presupuesto
```

Esto garantiza que la validación es idéntica en cliente y servidor — un dato rechazado por el formulario siempre es rechazado también por la API.

### 2.5 PWA

- `public/sw.js` — service worker custom (offline, background sync).
- `vite.config.ts` — `vite-plugin-pwa` genera el `manifest.json` y registra el SW.
- `useBackgroundSync.ts` — escucha `teg-save-status` y encola escrituras pendientes.
- `usePushNotifications.ts` — gestiona suscripciones Web Push.

---

## 3. Capa de backend (Vercel Serverless)

### 3.1 BFF — `api/proxy.js`

El proxy es el único endpoint llamado por el frontend. Su responsabilidad:

1. **CORS** — solo acepta orígenes en la allowlist (`ALLOWED_ORIGIN`, `localhost:5173`, `localhost:4173`). Usa igualdad exacta (no `startsWith`) para prevenir bypass por subdominio.
2. **Cabeceras de seguridad** — `X-Content-Type-Options`, `X-Frame-Options`, `HSTS`, `CSP` en respuestas del proxy.
3. **Sesión** — verifica JWT en cookie HttpOnly para rutas del panel. Emite cookie deslizante en cada petición autenticada.
4. **Rate limiting** — delega en `api/lib/rateLimiter.js` (persistido en Neon).
5. **Inyección de API Key** — añade `x-api-key` al reenvío; el cliente nunca la conoce.
6. **Rutas `/api/proxy/data/:collection`** — acceso directo a Neon sin HTTP interno (~4-6× más rápido que forward HTTP).

### 3.2 Endpoints internos

Ver [`API.md`](API.md) para la referencia completa.

### 3.3 Base de datos — Neon PostgreSQL

```
api/lib/db.js
├── sql        — neon(DATABASE_URL)   → conexión pooled (PgBouncer)
│                                       Para DML/DQL (SELECT, INSERT, UPDATE, DELETE)
└── sqlDirect  — neon(DIRECT_URL)     → conexión directa (sin pool)
                                        Solo para DDL (CREATE, ALTER, DROP)
```

**Tabla principal — `collections`:**

```sql
CREATE TABLE collections (
  key        TEXT PRIMARY KEY,     -- nombre de la colección (ej: teg_voluntarios)
  value      JSONB NOT NULL,       -- datos serializados
  version    INTEGER DEFAULT 1,    -- versionado optimista
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Todas las colecciones de la app usan este modelo de "document store sobre PostgreSQL". La allowlist en `ALLOWED_COLLECTIONS` enumera los nombres permitidos.

### 3.4 Sesión — `api/lib/session.js`

- JWT firmado con `API_KEY` (HMAC-SHA256).
- Almacenado en cookie `HttpOnly; SameSite=Strict; Secure`.
- Duración: 8 horas, con renovación deslizante en cada petición autenticada.
- El hash del PIN se guarda en Neon (bcrypt, coste 12).

### 3.5 Rate limiting — `api/lib/rateLimiter.js`

Persistido en Neon para que funcione correctamente con múltiples instancias serverless:

| Scope | Límite | Ventana |
|---|---|---|
| `public` | 30 req | 1 min |
| `register` (voluntarios) | 10 req | 10 min |
| `data-collection` | 60 req | 1 min |
| `data-batch` | 60 req | 1 min |

---

## 4. Seguridad

Ver [`SECURITY.md`](../SECURITY.md) para la referencia completa de CSP, decisiones de seguridad y vulnerabilidades conocidas.

Resumen de las capas:

| Capa | Mecanismo |
|---|---|
| Transport | HSTS (2 años, preload) |
| CORS | Allowlist exacta de orígenes |
| Autenticación panel | PIN → bcrypt → JWT cookie HttpOnly |
| Autorización API | `x-api-key` inyectada server-side |
| Protección de colecciones | Allowlist regex de nombres |
| Rate limiting | Neon-persisted, por IP y scope |
| Inputs | Zod (frontend + backend) |
| Content | CSP estricta en `vercel.json` |
| Clickjacking | `X-Frame-Options: DENY` + `frame-ancestors 'none'` |

---

## 5. PWA y modo offline

```
Petición de datos
      │
      ▼
¿Online?
  Sí → /api/proxy/* → Neon → respuesta
  No → localStorage (adapter localStorage)
       + cola de sync en IndexedDB (background sync)
         → se vacía cuando vuelve la conexión
```

El service worker cachea los assets estáticos (shell de la app). Los datos se sincronizan mediante `useBackgroundSync.ts` que escucha el evento `teg-save-status` y registra tareas en el SW.

---

## 6. Observabilidad

- **Sentry** (`@sentry/react`) — captura errores y transacciones en producción.
  - DSN configurado en `VITE_SENTRY_DSN` (variable pública — correcto por diseño).
  - Release tagging automático en `npm run build:ci`.
  - `ErrorBoundary` por módulo para aislar fallos.
- **Logger** (`api/lib/logger.js`) — logging estructurado en funciones serverless.

---

## 7. Decisiones de arquitectura

| Decisión | Motivo |
|---|---|
| BFF en lugar de llamadas directas a Neon desde el cliente | La `DATABASE_URL` y `API_KEY` nunca están en el bundle público |
| Document store (JSONB) en Neon | Simplicidad — evita migraciones frecuentes de esquema para un evento de vida corta |
| Adapter pattern en `dataService` | Permite desarrollo offline sin mock servers ni modificar lógica de negocio |
| Schemas Zod compartidos | Single source of truth — imposible que cliente y servidor acepten datos diferentes |
| Zustand slices por módulo | Facilita el mantenimiento y el tree-shaking; evita una slice monolítica |
| Carga diferida de Leaflet y Recharts | Ambas librerías son pesadas; solo cargan cuando se navega al módulo que las usa |
