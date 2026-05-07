# Auditoría técnica — app-carrera · Trail El Guerrero 2026

> **Fecha:** Mayo 2026 · Commit `c5364d1`  
> **Estado:** 595 tests pasando · 45 dependencias activas · Build limpio  
> Nivel: arquitectura + seguridad + producto + deuda técnica residual

---

## 1. Estado ejecutivo

La aplicación ha completado un roadmap de 7 fases que resolvió los problemas más críticos de seguridad, duplicación de código, separación de responsabilidades y estabilidad de datos. El resultado es un código base considerablemente más sano que hace dos meses, pero sigue teniendo zonas de alta deuda técnica que limitarán la velocidad de desarrollo en los próximos meses si no se abordan.

**Lo que funciona bien:**
- Sistema de eventos custom (`teg-navigate`, `teg-sync`, `teg-save-status`, `teg-toast`) desacoplado y robusto
- `budgetUtils.js` + `useBudgetLogic.js` como fuente única de verdad financiera
- Portal de voluntarios completo e independiente con flujo de registro, login, ficha y recuperación de PIN
- `dataService` con adapter pattern (localStorage ↔ Neon) funcionando en producción
- Sincronización cross-block real: cambios en Patrocinadores se reflejan en Presupuesto sin recarga
- Sincronización offline real: cola de reintentos al recuperar conexión
- 595 tests unitarios cubriendo todos los bloques principales

**Lo que sigue siendo un problema:**
- Tres archivos superan las 2.500 líneas: `Voluntarios.jsx` (3.713), `Logistica.jsx` (2.890), `Patrocinadores.jsx` (2.554)
- `hashPin` (djb2) duplicado en frontend y backend sin plan de migración activo
- `FormularioPublico` fue copiado a `/components/voluntarios/` pero el original sigue en `Voluntarios.jsx`
- `usePaginacion.jsx` existe en dos rutas idénticas: `src/lib/` y `src/hooks/`
- `BUG-DS-02` sin resolver: `setMultiple` comparte cola de debounce entre todos los módulos

---

## 2. Arquitectura actual

### 2.1 Mapa de capas

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND — React + Vite + TypeScript/JSX                       │
│                                                                  │
│  pages/         Index.jsx (shell + auth) · Landing · Portal      │
│  components/    blocks/ (10 módulos) · budget/ · auth/ · common/│
│  hooks/         useBudgetLogic · useAlertasBadges · useData      │
│  lib/           dataService · budgetUtils · blockStyles           │
│  constants/     budgetConstants · camisetasConstants · eventConfig│
└─────────────────────┬───────────────────────────────────────────┘
                       │ fetch /api/*
┌─────────────────────▼───────────────────────────────────────────┐
│  BACKEND — Vercel Serverless Functions                           │
│                                                                  │
│  /api/data/[collection]  CRUD genérico protegido por x-api-key  │
│  /api/data/batch         GET/PUT múltiples colecciones           │
│  /api/data/public        POST sin auth (registro voluntarios)    │
│  /api/voluntarios/       Portal: auth, ficha, pin, recover-pin   │
│  /api/docs/[patId]       Vercel Blob upload/delete + Neon meta   │
│  /api/documents/         CRUD documentos con gestiones           │
│  /api/budget-log/        Log de cambios presupuestarios          │
│  /api/setup              Crea tablas (protegido por x-api-key)   │
└─────────────────────┬───────────────────────────────────────────┘
                       │ @neondatabase/serverless
┌─────────────────────▼───────────────────────────────────────────┐
│  PERSISTENCIA — Neon PostgreSQL + Vercel Blob                    │
│                                                                  │
│  table: collections  key VARCHAR PK + value JSONB + updated_at  │
│  table: budget_log   id + ts + concepto + campo + valores        │
│  table: documents    (deducida de docs/[patId].js)               │
│  Vercel Blob         documentos de patrocinadores                │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Sistema de eventos custom (el núcleo del desacoplamiento)

| Evento | Emitido por | Escuchado por | Propósito |
|--------|------------|---------------|-----------|
| `teg-navigate` | Cualquier bloque | `Index.jsx` | Navegar a otro bloque |
| `teg-sync` | `dataService.notify()` | `useData`, `useAlertasBadges`, `DiaCarrera` | Propagar cambios cross-block |
| `teg-sync` + `detail.module` | Nuevo (T7.2) | `useAlertasBadges` | Recalcular solo el módulo afectado |
| `teg-save-status` | `dataService`, bloques | `Index.jsx` | Indicador de autosave global |
| `teg-toast` | `toast.js` | `Index.jsx` | Sistema de notificaciones |

**Fortaleza:** el patrón es elegante y evita prop-drilling. **Debilidad:** no hay tipado ni documentación de qué `detail` espera cada evento. Un cambio en el schema de `detail.module` rompe silenciosamente el throttle de badges.

### 2.3 Flujo de datos entre bloques (conexiones activas)

```
Patrocinadores ──notify()──► useBudgetLogic
  ├─ totalPatConfirmado → ingresosExtra[syncKey="patrocinios"]
  ├─ totalPatCobrado    → ingresosExtra[syncKey="patrociniosCobrado"]
  └─ totalSubvencionPublica (sector=Admin. pública) → ingresosExtra[id=10]

Camisetas ──teg-sync──► useBudgetLogic
  └─ rawCamPedidos + merchandising → totalMerchBeneficio → ingresosExtra[id=2]

useBudgetLogic ──useMemo cascada──► KPIs → Dashboard
  ├─ ingresosExtraConValores (tiempo real, sin useEffect)
  ├─ totalIngresosExtra → resultado → puntoEquilibrio
  └─ alertas → badge nav (via useAlertasBadges)

VoluntarioPortal (público)
  ├─ registro → POST /api/data/public → Neon
  ├─ login → POST /api/voluntarios?action=auth → Neon (JWT)
  ├─ ficha → GET /api/voluntarios → Neon
  └─ recover-pin → POST /api/voluntarios?action=recover-pin → Neon

Proyecto ──teg_proyecto_v1_tareas──► Dashboard (badges, stats)
Logística ──teg_logistica_v1_inc──► useAlertasBadges (badge)
Documentos ──teg_documentos_v1──► useAlertasBadges (badge)
DíaCarrera ──teg-sync──► Voluntarios (presencia en puesto)
```

---

## 3. Análisis por capa

### 3.1 `dataService.js` — Bugs residuales no resueltos

#### BUG-DS-02 (sin resolver) — `setMultiple` comparte cola de debounce
```javascript
// Línea 217 — El problema
const collection = 'batch'; // TODAS las operaciones batch comparten esta clave
```
Si dos módulos llaman `setMultiple` en el mismo segundo (ej. Presupuesto y Voluntarios al hacer batch save), el segundo cancela al primero. Los datos del primero se pierden en Neon aunque están en localStorage. **Riesgo real en producción con múltiples pestañas o guardados rápidos.**

**Fix:** usar una clave única por llamada o un array FIFO de operaciones pendientes.

#### BUG-DS-03 (sin resolver) — `onChange` lee localStorage, no `dataService.get()`
```javascript
// useEffect en useData — el handler hace:
const raw = localStorage.getItem(key);
```
Si hay datos más recientes en Neon que no están en localStorage (caso: otro dispositivo guardó algo), el hook nunca los verá. **Los datos del panel no se sincronizan entre dispositivos en tiempo real.**

#### NUEVO: `syncPendingQueue` pasa `x-api-key: ''` vacío
```javascript
// api/voluntarios/index.js — recover-pin añadido en T4.1
headers: { 'Content-Type': 'application/json', 'x-api-key': '' },
```
El endpoint `PUT /api/data/{collection}` requiere `x-api-key`. Si el API key no está disponible en el cliente (correcto — no debe estarlo), el reintento offline siempre fallará con 401 para las colecciones protegidas. El mecanismo funciona para el adapter `localStorage` pero falla silenciosamente para el adapter `api`.

### 3.2 Autenticación — SEC-01 pendiente

`hashPin` usa djb2 (no criptográfico) tanto en `src/components/auth/pinAuth.js` como en `api/voluntarios/index.js`. Son la misma función copy-paste. Si alguien accede al localStorage del navegador puede encontrar el hash y hacer fuerza bruta en milisegundos (10.000 combinaciones para PIN de 4 dígitos).

**Contexto:** para un panel de administración en dispositivo controlado es aceptable. Para un sistema con acceso desde múltiples dispositivos o con datos sensibles reales, no lo es.

**Fix cuando sea necesario:** bcrypt en backend para `pinHash` de voluntarios; para el panel, migrar a token de sesión firmado con `crypto.subtle` o un secret del servidor.

### 3.3 `Voluntarios.jsx` — Residuo de T2.2

`FormularioPublico` fue copiado a `src/components/voluntarios/FormularioPublico.jsx` (correcto), pero el original **sigue en `Voluntarios.jsx` línea 64** ocupando ~360 líneas. También mantiene imágenes base64 placeholder de camiseta que ya están en `camisetasConstants.js`. El archivo es todavía 3.713 líneas.

El interior del archivo tiene una estructura clara con 8 sub-componentes bien delimitados por comentarios `// ─── TAB`:
- `FormularioPublico` (línea 64) — a mover/eliminar
- `AppShell` (línea 1179) — lógica de estado principal, 600+ líneas
- `TabDashboard` (línea 1397)
- `TabVoluntarios` (línea 1654)
- `TabPuestos` (línea 2062)
- `TabTallas` (línea 2279)
- `TabDiaD` (línea 2406)
- `FichaVoluntario` (línea 2697)

### 3.4 `Logistica.jsx` — 2.890 líneas con sub-componentes bien definidos

Similar a Voluntarios: código bien estructurado pero monolítico. Sub-componentes:
- `TabDash` (línea 463) — dashboard logístico
- `TabMat` (línea 683) — inventario de material
- `TabVeh` (línea 837) — vehículos y rutas
- `TabTL` (línea 1003) — timeline de tareas
- `TabDirectorio` (línea 1160) — directorio de contactos
- `TabEmergencias` (línea 1375) — protocolo de emergencias
- `TabComunicaciones` (línea 1640) — comunicaciones

### 3.5 API backend — Patrones y consistencia

| Endpoint | Auth | Método | Estado |
|---------|------|--------|--------|
| `/api/setup` | x-api-key | GET/POST | ✅ Protegido (T1.2) |
| `/api/data/[collection]` | x-api-key | GET/PUT | ✅ Protegido |
| `/api/data/batch` | x-api-key | GET/PUT | ✅ Protegido |
| `/api/data/public` | Sin auth | POST | ✅ Correcto (registro) |
| `/api/voluntarios` | JWT + x-api-key | GET/POST/PATCH | ✅ Bien estructurado |
| `/api/voluntarios?action=recover-pin` | Sin auth | POST | ✅ Correcto (T5.4) |
| `/api/docs/[patId]` | x-api-key | GET/POST/DELETE | ✅ Vercel Blob |
| `/api/documents/[id]` | x-api-key | GET/PUT/DELETE | ✅ Gestiones |
| `/api/budget-log` | x-api-key | GET/POST | ⚠️ Llamado solo desde useBudgetLogic y TabHistorial (sin VITE_API_KEY en cliente) |

**Bug silencioso en budget-log:** `useBudgetLogic.logCambio()` llama a `/api/budget-log` con `x-api-key: import.meta.env.VITE_API_KEY`. Si `VITE_API_KEY` no está configurada en Vercel (no debería estarlo — es una clave pública), todos los logs de presupuesto fallan silenciosamente. `TabHistorial` también hace `fetch('/api/budget-log?limit=100')` sin x-api-key en el header, lo que devolvería 401.

---

## 4. Interconexiones incompletas o frágiles

### CONN-01 — DíaCarrera no muestra localizaciones GPS

`teg_localizaciones_v1` existe y se usa en `Logistica.jsx` y `Voluntarios.jsx` para mostrar puestos en el mapa. `DiaCarrera.jsx` no los consume. El coordinador en el día de carrera no puede ver el mapa de puestos desde el módulo más relevante para ese día.

### CONN-02 — Camisetas → Presupuesto: ventana de 2 segundos de datos obsoletos

Cuando el usuario actualiza pedidos en Camisetas y navega inmediatamente al Dashboard o a la pestaña de P&L del Presupuesto, el debounce de 2 segundos de `dataService` hace que los KPIs muestren valores desactualizados. No hay indicador visual de "actualizando".

### CONN-03 ✅ — mensajeOrganizador: ya implementado (T5.3)

El campo existe en el modal de edición de voluntario (`MensajeOrganizadorEdit`) y se muestra en el portal. Conexión completa.

### CONN-04 — budget-log: endpoint activo, UI parcialmente conectada

`api/budget-log/index.js` existe y tiene tabla en Neon. `useBudgetLogic.logCambio()` lo llama al modificar conceptos, pero con `VITE_API_KEY` que no debe estar en el cliente. `TabHistorial.jsx` sí tiene UI para mostrarlo pero el fetch falla por falta de autenticación correcta.

### MISSING-04 — Códigos promocionales aislados

`Configuracion.jsx` tiene una sección completa de códigos de descuento con importación masiva por CSV. Estos datos (`teg_codigos_promo_v1`) no están integrados con el módulo de Presupuesto ni con el contador de inscritos. Los códigos existen pero no afectan a ningún cálculo.

---

## 5. Deuda técnica priorizada

### 🔴 Crítica — Impacto inmediato

| ID | Descripción | Riesgo | Esfuerzo |
|----|-------------|--------|---------|
| BUG-DS-02 | `setMultiple` comparte debounce: pérdida de datos en guardados rápidos | Alto | Medio |
| SEC-01-partial | `hashPin` duplicado en frontend y backend; lógica de hash fuera de sincronía | Medio | Bajo |
| RESIDUO-T2.2 | `FormularioPublico` duplicado en `Voluntarios.jsx` y en `/components/voluntarios/` | Alto | Bajo |
| BUG-SYNCQUEUE | `syncPendingQueue` pasa `x-api-key: ''` vacío → reintentos offline fallan con 401 | Medio | Bajo |

### 🟡 Alta — Impacto a medio plazo

| ID | Descripción | Riesgo | Esfuerzo |
|----|-------------|--------|---------|
| BUG-DS-03 | `onChange` lee localStorage, no la API: no sincroniza entre dispositivos | Alto | Alto |
| CONN-04 | budget-log: autenticación incorrecta en cliente → logs de presupuesto silenciados | Medio | Bajo |
| CONN-01 | DíaCarrera no muestra mapa de puestos (datos disponibles pero no conectados) | Medio | Bajo |
| DUP-PAGINACION | `usePaginacion.jsx` duplicado en `lib/` y `hooks/` | Bajo | Bajo |
| MANT-VOLUNTARIOS | `Voluntarios.jsx` tiene 3.713 líneas con sub-componentes separables | Alto | Alto |
| MANT-LOGISTICA | `Logistica.jsx` tiene 2.890 líneas con sub-componentes separables | Alto | Alto |

### 🟢 Media — Mejoras de calidad

| ID | Descripción | Riesgo | Esfuerzo |
|----|-------------|--------|---------|
| MISSING-04 | Códigos promocionales no integrados con Presupuesto | Bajo | Alto |
| MISSING-02 | Sin resolución de conflictos entre dispositivos (last-write-wins) | Medio | Alto |
| FRAG-DASH-01 | Carga optimista sin indicador de "datos provisionales" | Bajo | Bajo |
| INC-ORG-06 | `@neondatabase/serverless` en deps del frontend (no se importa, pero está declarado) | Bajo | Bajo |
| SEC-01-upgrade | Migrar hashPin a bcrypt/PBKDF2 | Bajo (uso privado) | Alto |

---

## 6. Cobertura de tests

### Estado actual: 595 tests en 16 ficheros

| Fichero | Tests | Qué cubre |
|---------|-------|-----------|
| `roadmap.test.js` | 75 | Fases del roadmap (T1.1–T7.2) |
| `voluntarios.test.js` | ~45 | Bloque Voluntarios |
| `dashboard.test.js` | ~43 | Bloque Dashboard |
| `sprint3.test.js` | ~46 | Patrocinadores avanzado |
| `presupuesto.test.js` | ~35 | Presupuesto y toggles |
| `sprint2.test.js` | ~32 | Presupuesto básico |
| `budgetUtils.test.js` | ~22 | Funciones puras financieras |
| `portal.test.js` | ~40 | VoluntarioPortal |
| `diacarrera.test.js` | ~30 | DíaCarrera |
| `documentos.test.js` | ~38 | Documentos |
| `logistica.test.js` | ~33 | Logística |
| `camisetas.test.js` | ~41 | Camisetas |
| `proyecto.test.js` | ~33 | Proyecto |
| `sprint1.test.jsx` | ~42 | Patrocinadores básico |
| `ui-ux.test.js` | ~31 | UI/UX global |
| `runtime.test.jsx` | ~8 | Smoke tests de renderizado |

### Gaps de cobertura críticos

- **`dataService.js`:** sin tests. BUG-DS-02 y BUG-DS-03 no están cubiertos.
- **`useAlertasBadges`:** sin tests de integración. El throttle se prueba con mocks de timer.
- **`TabHistorial.jsx`:** sin tests. El fetch a budget-log no está testeado.
- **Flujos de end-to-end:** no hay tests de integración que simulen el ciclo completo (registro voluntario → login → ficha → confirmación llegada).
- **`api/voluntarios/index.js`:** sin tests unitarios de las acciones (auth, recover-pin, cambiar-pin).

---

## 7. Próximos pasos recomendados

### Sprint 1 — Correctivos de alta urgencia (3–5 días)

**Paso 1: Eliminar FormularioPublico de Voluntarios.jsx (RESIDUO-T2.2)**
```
T2.2 real: eliminar las líneas 63–423 de Voluntarios.jsx
Actualizar src/components/voluntarios/FormularioPublico.jsx
para que use imports de camisetasConstants en lugar de tener los
datos hardcodeados (ya lo tiene, verificar que funciona sin el original).
Impacto: -360 líneas de Voluntarios.jsx. Riesgo: ninguno si los tests pasan.
```

**Paso 2: Fix BUG-DS-02 — clave de debounce única por operación batch**
```javascript
// En apiAdapter.setMultiple:
const batchKey = `batch_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
// En lugar de: const collection = 'batch';
// Esto rompe el debounce intencional, pero es correcto para batch
// (el debounce de batch es contraproducente: los módulos tienen su propio debounce)
```

**Paso 3: Fix syncPendingQueue — API key correcta**
```javascript
// El reintento offline necesita acceder al API key de Vercel
// Solución: leer el key de la respuesta inicial del servidor,
// o usar un endpoint público especial para sincronización offline.
// Alternativa simple: SOLO sincronizar si el adapter es 'localStorage'
// (que es el caso en producción actual).
```

**Paso 4: Eliminar usePaginacion.jsx duplicado de src/lib/**
```
src/lib/usePaginacion.jsx → archivo vacío que re-exporta desde src/hooks/
o simplemente eliminarlo. Los imports en Voluntarios.jsx ya usan @/lib/
pero si todos los imports actualizados usan @/hooks/, la lib/ puede eliminarse.
```

**Paso 5: Fix budget-log autenticación**
```javascript
// Opción A: hacer GET /api/budget-log sin autenticación (solo lectura)
// Opción B: crear endpoint público /api/budget-log?public=1 para lectura
// Opción C: pasar el apiKey vía header en TabHistorial
// Recomendado: Opción A — el historial de cambios es información interna no sensible
```

---

### Sprint 2 — Refactor modular (1–2 semanas)

**Separar Voluntarios.jsx en módulos**

La estructura interna ya está delimitada por comentarios. El trabajo es mecánico:

```
src/components/voluntarios/
  VoluntariosApp.jsx          (AppShell actual, ~600 líneas)
  TabVoluntariosList.jsx      (TabVoluntarios actual, ~400 líneas)
  TabPuestos.jsx              (TabPuestos + PuestoCard, ~200 líneas)
  TabTallas.jsx               (TabTallas, ~130 líneas)
  TabDiaD.jsx                 (TabDiaD, ~290 líneas)
  TabDashboard.jsx            (TabDashboard, ~260 líneas)
  FichaVoluntario.jsx         (FichaVoluntario + subcomponentes, ~350 líneas)
  FormularioPublico.jsx       (ya existe)
```

**Separar Logistica.jsx en módulos**

```
src/components/logistica/
  LogisticaApp.jsx            (estado principal + Shell)
  TabDash.jsx
  TabMaterial.jsx
  TabVehiculos.jsx
  TabTimeline.jsx
  TabDirectorio.jsx
  TabEmergencias.jsx
  TabComunicaciones.jsx
```

---

### Sprint 3 — Funcionalidades pendientes de alto valor (1–2 semanas)

**Conectar DíaCarrera con mapa de localizaciones (CONN-01)**
- `teg_localizaciones_v1` contiene coordenadas GPS de los puestos
- `DiaCarrera.jsx` ya tiene el tab de puestos y voluntarios
- Añadir una vista de mapa usando MapLibre GL (ya era parte del diseño original del PWA)
- Impacto operativo: el coordinador puede ver la posición de cada puesto el día D

**Integrar budget-log con TabHistorial (CONN-04)**
- Corregir la autenticación (ver Sprint 1 Paso 5)
- El historial ya tiene endpoint y tabla en Neon
- `TabHistorial.jsx` tiene la UI pero no funciona
- Impacto: visibilidad de auditoría de cambios presupuestarios

**Indicador de "datos provisionales" en Dashboard (FRAG-DASH-01)**
```jsx
// En Dashboard, cuando isRefreshing = true, mostrar un banner sutil:
{isRefreshing && (
  <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
    color:"var(--amber)", padding:".25rem .5rem" }}>
    ↻ Actualizando datos…
  </div>
)}
```

---

### Sprint 4 — Calidad y tests (1 semana)

**Tests para dataService**
```javascript
// Los más críticos:
// 1. Test BUG-DS-02: dos llamadas a setMultiple rápidas no pierden la primera
// 2. Test BUG-DS-03: onChange llama a dataService.get, no a localStorage directamente
// 3. Test syncPendingQueue: reintenta correctamente al recuperar conexión
```

**Test de integración del portal de voluntarios**
```javascript
// Flujo completo:
// 1. Registrar voluntario via /api/data/public (mock)
// 2. Login via /api/voluntarios?action=auth
// 3. Cargar ficha
// 4. Confirmar llegada
// 5. Recover-pin via email
```

**Tests para api/voluntarios/index.js**
```javascript
// Cada acción tiene su test unitario con Neon mockeado:
// auth, check, reset-pin, recover-pin, delete, ficha GET, ficha PATCH
```

---

### Sprint 5 — Seguridad y multiusuario (2–3 semanas)

**Migrar hashPin a bcrypt (cuando haya más de un organizador)**

El riesgo actual es bajo porque el panel tiene acceso físico controlado. Cuando el evento tenga múltiples organizadores accediendo desde dispositivos distintos:

```javascript
// Backend: api/voluntarios/index.js
const bcrypt = require('bcrypt');
// Al crear/cambiar PIN:
const pinHash = await bcrypt.hash(pin, 10);
// Al verificar:
const valid = await bcrypt.compare(pin, storedHash);
// Migración: marcar pines bcrypt con prefijo '$2b$' para distinguirlos de djb2
```

**Resolución de conflictos básica (MISSING-02)**

Last-write-wins funciona para un organizador. Con dos:

```javascript
// En dataService.apiAdapter.set: añadir version counter
// GET → recibir { value, version }
// PUT → enviar { value, version } → backend rechaza si version no es la actual
// UI: mostrar dialog "Otro dispositivo guardó cambios más recientes. ¿Sobreescribir?"
```

---

## 8. Métricas del proyecto

| Métrica | Valor | Tendencia |
|---------|-------|-----------|
| Archivos fuente (src/) | 72 | ↓ (limpieza continua) |
| Líneas de código total | ~23.000 | ↓ vs peak de ~31.000 |
| Tests pasando | 595 | ↑ |
| Dependencias frontend | 21 | ↓↓ (de 80 a 21) |
| Archivos con >2.000 líneas | 3 | ↓ (de 5 a 3) |
| Bugs críticos de seguridad | 0 | ✅ (todos resueltos) |
| Endpoints sin autenticación | 2 | ✅ (public y recover-pin, correcto) |
| Colecciones Neon activas | ~18 | — |

---

## 9. Decisiones de arquitectura pendientes

### 9.1 ¿Migrar a TypeScript progresivamente?

El proyecto tiene `App.tsx`, `Landing.tsx`, `NotFound.tsx` y `ThemeToggle.tsx` en TypeScript, y el resto en JavaScript. El tsconfig está configurado para tolerar JS.

**Recomendación:** empezar por los archivos con interfaces de datos más críticos:
1. `src/lib/budgetUtils.js` → tipos para `Concepto`, `Tarea`, `Patrocinador`
2. `src/constants/budgetConstants.js` → tipos para constantes
3. `src/hooks/useBudgetLogic.js` → tipo retorno del hook

No hay urgencia de migrar los bloques de UI (3.000+ líneas de JSX). El valor del tipado está en los modelos de datos, no en los componentes.

### 9.2 ¿Store global vs eventos custom?

El sistema de eventos (`teg-*`) funciona bien para comunicación unidireccional. El problema es que no hay forma de "preguntar" el estado a otro módulo sin leer localStorage. Si en algún momento se necesita:
- Saber si el bloque Patrocinadores tiene datos cargados sin que emita un evento
- Compartir configuración global reactiva entre 5+ bloques

Entonces vale la pena considerar Zustand (muy ligero, sin boilerplate). Por ahora, no hay urgencia.

### 9.3 ¿Sincronización en tiempo real con WebSockets?

Para el día de carrera con múltiples coordinadores en campo, la sincronización cada 5 segundos via polling sería suficiente. WebSockets añadiría complejidad sin beneficio claro hasta tener 3+ usuarios simultáneos activos.

---

## 10. Resumen de acciones por prioridad

```
INMEDIATO (esta semana):
  □ Eliminar FormularioPublico duplicado de Voluntarios.jsx
  □ Fix BUG-DS-02: clave de debounce única en setMultiple
  □ Eliminar usePaginacion.jsx duplicado de src/lib/
  □ Corregir autenticación de budget-log en cliente
  □ Fix syncPendingQueue: API key correcta o condición de adapter

PRÓXIMAS 2-3 SEMANAS:
  □ Separar Voluntarios.jsx en 7-8 archivos
  □ Separar Logistica.jsx en 7-8 archivos
  □ Conectar DíaCarrera con mapa de localizaciones
  □ Tests para dataService y api/voluntarios

PRÓXIMO MES (antes de agosto):
  □ Indicador de datos provisionales en Dashboard
  □ hashPin → bcrypt si hay más de un organizador
  □ Tests de integración del portal de voluntarios
  □ Resolución de conflictos básica si se usan múltiples dispositivos
```

---

*Auditoría generada sobre el commit `c5364d1` de `trailelguerrero/app-carrera`.*  
*Fecha: Mayo 2026 · Próxima revisión recomendada: 2 semanas antes del evento (agosto 2026).*
