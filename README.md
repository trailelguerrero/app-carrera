# App Carrera — Panel de Gestión · Trail El Guerrero 2026

Aplicación web progresiva (PWA) para la gestión integral del evento deportivo Trail El Guerrero. Cubre presupuesto, voluntarios, logística, patrocinadores, camisetas, documentos/subvenciones y operaciones del día de la carrera.

[![Vercel](https://img.shields.io/badge/deploy-vercel-black)](https://vercel.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://react.dev/)
[![Neon](https://img.shields.io/badge/DB-Neon_PostgreSQL-00e5bf)](https://neon.tech/)

---

## Tabla de contenidos

- [Características](#características)
- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Módulos funcionales](#módulos-funcionales)
- [Rutas de la aplicación](#rutas-de-la-aplicación)
- [Configuración local](#configuración-local)
- [Variables de entorno](#variables-de-entorno)
- [Scripts disponibles](#scripts-disponibles)
- [Tests](#tests)
- [Despliegue en Vercel](#despliegue-en-vercel)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Documentación adicional](#documentación-adicional)

---

## Características

- **Gestión de presupuesto** con escenarios, inscripciones, ingresos y gastos por tramo.
- **Portal de voluntarios** público con registro, edición de ficha y QR de acreditación.
- **Logística** de material y pedidos con trazabilidad.
- **Patrocinadores** con contratos, importes y seguimiento de pagos.
- **Día de carrera** — panel en tiempo real con mapa de puntos de control, checklist y alertas.
- **PWA** con soporte offline, push notifications y background sync.
- **Persistencia en tiempo real** con Neon (PostgreSQL) mediante Vercel Serverless Functions.
- **Arquitectura BFF** — el frontend nunca expone credenciales.
- **Dark/light mode** con `next-themes`.
- **Detección de conflictos** de edición concurrente con versionado optimista.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend** | React 18 + Vite 5 + TypeScript 5.8 |
| **Estilos** | Tailwind CSS 3 + shadcn/ui (Radix UI) |
| **Estado** | Zustand 5 (slices por módulo) + TanStack Query 5 |
| **Formularios** | react-hook-form + Zod (validación compartida frontend/backend) |
| **Mapas** | Leaflet 1.9 (carga diferida) |
| **Gráficos** | Recharts (carga diferida) |
| **Backend** | Vercel Serverless Functions (Node.js ESM) |
| **Base de datos** | Neon PostgreSQL serverless (pooled + direct) |
| **Almacenamiento** | Vercel Blob (documentos e imágenes) |
| **Observabilidad** | Sentry |
| **PWA** | vite-plugin-pwa + service worker custom |
| **Tests unitarios** | Vitest + Testing Library |
| **Tests E2E** | Playwright |
| **Linting** | ESLint 9 + typescript-eslint |

---

## Arquitectura

```
Browser (React PWA)
       │
       │  HTTPS  /api/proxy/*
       ▼
┌──────────────────────┐
│   api/proxy.js (BFF) │  ← Único punto de entrada del frontend
│   · CORS exacto      │    Inyecta x-api-key server-side
│   · Sesión PIN       │    Verifica sesión
│   · Rate limiting    │    Valida origen
│   · Seguridad HTTP   │
└──────┬───────────────┘
       │  Interno (misma instancia Vercel)
       ├── /api/data/[collection]  ←→  Neon PostgreSQL (pooled)
       ├── /api/voluntarios        ←→  Neon PostgreSQL
       ├── /api/budget-log         ←→  Neon PostgreSQL
       ├── /api/docs/[patId]       ←→  Vercel Blob
       ├── /api/images             ←→  Vercel Blob
       ├── /api/panel/auth         ←→  bcrypt PIN hash en Neon
       ├── /api/push               ←→  Web Push API
       └── /api/setup              ←→  DDL inicial (Neon DIRECT_URL)
```

> Ver `docs/ARCHITECTURE.md` para el diagrama completo de componentes y flujo de datos.

### Principios de diseño

- **BFF (Backend-For-Frontend):** el cliente solo llama a `/api/proxy/*`. La `API_KEY` jamás sale del servidor.
- **Allowlist de colecciones:** solo las tablas enumeradas en `ALLOWED_COLLECTIONS` son accesibles; cualquier nombre no reconocido devuelve 403.
- **Versionado optimista:** cada `PUT` envía `__version`; si el servidor tiene una versión más nueva devuelve 409 (conflicto).
- **Pool de conexiones:** `api/lib/db.js` exporta una instancia única de `neon()` reutilizada entre peticiones en la misma función serverless.
- **Schemas Zod compartidos:** `src/lib/schemas/` define los esquemas que usan tanto los formularios React como los endpoints de la API.

---

## Módulos funcionales

| Módulo | Ruta interna | Descripción |
|---|---|---|
| **Dashboard** | `/panel` (tab default) | KPIs del evento, alertas y resumen global |
| **Presupuesto** | `/panel` → tab Presupuesto | Escenarios, inscripciones por tramo, ingresos/gastos |
| **Voluntarios** | `/panel` → tab Voluntarios | Gestión de voluntarios, asignaciones, QR |
| **Portal voluntario** | `/voluntarios/mi-ficha` | Portal público de registro y edición de ficha |
| **Logística** | `/panel` → tab Logística | Material, pedidos y trazabilidad |
| **Patrocinadores** | `/panel` → tab Patrocinadores | Contratos, importes, seguimiento de pagos |
| **Proyecto** | `/panel` → tab Proyecto | Gantt, hitos y equipo |
| **Camisetas** | `/panel` → tab Camisetas | Pedido y tallas |
| **Documentos** | `/panel` → tab Documentos | Subvenciones, ficheros en Vercel Blob |
| **Día de Carrera** | `/dia-carrera` | Panel tiempo real, mapa, checklist, alertas |
| **Configuración** | `/panel` → tab Configuración | Ajustes del evento, PIN de acceso |

---

## Rutas de la aplicación

| Ruta | Componente | Acceso |
|---|---|---|
| `/` | `Landing.tsx` | Público |
| `/panel` | `Index.jsx` | Autenticado (PIN) |
| `/voluntarios/mi-ficha` | `VoluntarioPortal.jsx` | Público |
| `/dia-carrera` | `DiaCarreraPage.jsx` | Autenticado |
| `*` | `NotFound.tsx` | — |

> Las rutas `/voluntarios` y `/voluntarios/registro` redirigen a `/voluntarios/mi-ficha` por compatibilidad.

---

## Configuración local

### Prerrequisitos

- Node.js 20+
- [Vercel CLI](https://vercel.com/docs/cli) (`npm i -g vercel`) — necesario para `vercel dev`
- Cuenta en [Neon](https://neon.tech/) con una base de datos PostgreSQL

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/trailelguerrero/app-carrera.git
cd app-carrera

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Edita .env.local y rellena los valores (ver sección Variables de entorno)

# 4. Inicializar la base de datos (solo la primera vez)
vercel dev &   # levanta el servidor local
curl -X POST http://localhost:3000/api/setup -H "x-api-key: TU_API_KEY"

# 5. Desarrollo con funciones serverless
vercel dev

# — O bien, solo frontend sin backend (modo offline) —
# Cambia VITE_ADAPTER=localStorage en .env.local
npm run dev
```

> ⚠️ Con `VITE_API_PROXY_TARGET` apuntando a producción, las peticiones locales modifican los datos reales.

---

## Variables de entorno

| Variable | Prefijo | Requerida | Descripción |
|---|---|---|---|
| `DATABASE_URL` | — | ✅ | Cadena de conexión Neon PostgreSQL (pooled, para DML/DQL) |
| `DIRECT_URL` | — | Recomendada | Conexión directa Neon (sin PgBouncer), usada solo para DDL (`api/setup.js`) |
| `API_KEY` | — | ✅ | Clave privada del servidor. **Nunca usar prefijo `VITE_`** |
| `ALLOWED_ORIGIN` | — | ✅ | Dominio permitido en CORS (ej: `https://appcarrera.vercel.app`) |
| `BLOB_READ_WRITE_TOKEN` | — | ✅ | Token de Vercel Blob. Sin él, `api/docs` y `api/images` fallan con 500 |
| `VITE_ADAPTER` | `VITE_` | — | `api` (producción) o `localStorage` (offline). Fallback: `api` |
| `VITE_SENTRY_DSN` | `VITE_` | — | DSN público de Sentry. Sin él, Sentry queda desactivado |
| `VITE_API_PROXY_TARGET` | `VITE_` | Dev | URL del backend real para proxy de Vite en desarrollo |

> ⚠️ Las variables `VITE_*` se incluyen en el bundle JS público. Solo se pueden usar datos no secretos.

---

## Scripts disponibles

```bash
npm run dev          # Servidor de desarrollo Vite (solo frontend)
vercel dev           # Servidor de desarrollo con funciones serverless

npm run build        # Build de producción
npm run preview      # Previsualizar build de producción localmente

npm run lint         # ESLint sobre todo el proyecto
npm test             # Tests unitarios (Vitest, modo run)
npm run test:watch   # Tests unitarios en modo watch
npm run test:e2e     # Tests E2E con Playwright

npm run analyze      # Build + informe de bundle (scripts/check-bundle.js)
npm run build:ci     # Build con Sentry release tagging (CI/CD)
```

---

## Tests

### Unitarios (Vitest)

```bash
npm test
```

Suites principales en `src/test/`:

- `api-voluntarios.test.js` — endpoints de voluntarios
- `session.test.js` — gestión de sesión y cookies
- `voluntario-schema-sync.test.js` — sincronización schema Zod frontend↔backend
- `ui-ux.test.js` — accesibilidad y componentes UI
- ...y ~20 suites adicionales por módulo

### E2E (Playwright)

```bash
npm run test:e2e
```

Configuración en `playwright.config.ts`. Cubre flujos críticos: autenticación, portal de voluntarios, presupuesto, día de carrera y logística.

---

## Despliegue en Vercel

1. Conecta el repositorio en el [dashboard de Vercel](https://vercel.com/dashboard).
2. Configura las variables de entorno (ver tabla anterior).
3. El build command es `npm run build` (configurado en `vercel.json`).
4. Las funciones serverless en `api/` se despliegan automáticamente.

### Configuración de funciones (`vercel.json`)

| Función | `maxDuration` |
|---|---|
| `api/**/*.js` (general) | 10 s |
| `api/images/index.js` | 25 s |
| `api/push/index.js` | 25 s |
| `api/setup.js` | 30 s |

> Los assets estáticos en `/assets/*` tienen `Cache-Control: public, max-age=31536000, immutable`.

---

## Estructura del proyecto

```
app-carrera/
├── api/                          # Vercel Serverless Functions
│   ├── proxy.js                  # BFF — única puerta de entrada del frontend
│   ├── setup.js                  # DDL inicial de la base de datos
│   ├── data/
│   │   ├── [collection].js       # CRUD genérico por colección (allowlisted)
│   │   ├── batch.js              # Lecturas en lote (Promise.all)
│   │   └── public.js             # Endpoint público sin autenticación
│   ├── voluntarios/index.js      # Registro y gestión de voluntarios
│   ├── budget-log/index.js       # Log de cambios de presupuesto
│   ├── docs/[patId].js           # Documentos de patrocinadores (Vercel Blob)
│   ├── documents/index.js        # Gestión de documentos/subvenciones
│   ├── images/index.js           # Subida de imágenes (Vercel Blob)
│   ├── panel/auth.js             # Autenticación PIN del panel
│   ├── push/index.js             # Web Push notifications
│   └── lib/
│       ├── db.js                 # Instancia Neon (pooled + direct)
│       ├── logger.js             # Logging estructurado
│       ├── rateLimiter.js        # Rate limiting con Neon
│       ├── session.js            # JWT de sesión en cookie HttpOnly
│       └── voluntarioValidation.js  # Validación Zod en backend
│
├── src/
│   ├── App.tsx                   # Router principal + ThemeProvider
│   ├── main.tsx                  # Entry point + QueryClient + Sentry
│   ├── pages/                    # Páginas de nivel de ruta
│   │   ├── Index.jsx             # Panel principal (autenticado)
│   │   ├── Landing.tsx           # Página de inicio pública
│   │   ├── VoluntarioPortal.jsx  # Portal público de voluntarios
│   │   ├── DiaCarreraPage.jsx    # Panel del día de la carrera
│   │   └── NotFound.tsx
│   ├── components/
│   │   ├── blocks/               # Módulos funcionales grandes
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Presupuesto.jsx
│   │   │   ├── Voluntarios.jsx
│   │   │   ├── Logistica.jsx / LogisticaPedidos.jsx
│   │   │   ├── Patrocinadores.jsx
│   │   │   ├── Proyecto.jsx
│   │   │   ├── Camisetas.jsx
│   │   │   ├── Documentos.jsx
│   │   │   ├── DiaCarrera.jsx
│   │   │   └── Configuracion.jsx
│   │   └── ui/                   # Componentes atómicos (shadcn/Radix)
│   ├── hooks/                    # Custom hooks de lógica de negocio
│   │   ├── useData.ts            # Hook base de persistencia (React Query)
│   │   ├── useBudgetLogic.ts     # Cálculos de presupuesto
│   │   ├── useVoluntarios.js     # Gestión de voluntarios
│   │   ├── useDashboardData.ts   # Agregación de KPIs
│   │   └── ...
│   ├── lib/
│   │   ├── dataService.ts        # Adapter de persistencia (api | localStorage)
│   │   ├── schemas/              # Esquemas Zod compartidos
│   │   │   ├── voluntarioSchema.js
│   │   │   ├── logisticaSchema.js
│   │   │   ├── camisetaSchema.js
│   │   │   └── conceptoSchema.js
│   │   ├── budgetUtils.js        # Utilidades de cálculo financiero
│   │   ├── exportUtils.js        # Exportación a Excel/PDF
│   │   └── utils.ts              # Utilidades generales (cn, dates, etc.)
│   ├── store/
│   │   ├── useAppStore.ts        # Store Zustand principal
│   │   └── slices/               # Slices por módulo
│   │       ├── uiSlice.ts
│   │       ├── logisticaSlice.ts
│   │       ├── diaCarreraSlice.ts
│   │       └── eventBusSlice.js
│   └── test/                     # Suites de tests unitarios
│
├── public/                       # Assets estáticos + SW + manifest
├── scripts/                      # Utilidades de build (check-bundle.js)
├── .env.example                  # Plantilla de variables de entorno
├── vercel.json                   # Configuración de despliegue y seguridad
├── vite.config.ts                # Configuración Vite + PWA + Sentry
├── tailwind.config.ts            # Configuración Tailwind
├── tsconfig.json                 # TypeScript (raíz)
├── playwright.config.ts          # Tests E2E
├── vitest.config.ts              # Tests unitarios
└── docs/
    ├── ARCHITECTURE.md           # Arquitectura detallada + diagramas
    └── API.md                    # Referencia completa de la API
```

---

## Documentación adicional

| Documento | Descripción |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arquitectura detallada, flujo BFF, estado y schemas |
| [`docs/API.md`](docs/API.md) | Referencia completa de todos los endpoints |
| [`SECURITY.md`](SECURITY.md) | CSP, rate limiting, decisiones de seguridad y vulnerabilidades conocidas |
| [`ROADMAP.md`](ROADMAP.md) | Roadmap de mejoras y estado de cada fase |

---

*Repositorio: `trailelguerrero/app-carrera` · Desplegado en Vercel*
