# Auditoría Técnica — app-carrera

> **Segundo documento de lectura obligatoria.** Leer completo antes de tocar cualquier módulo.

---

## Parte I — Auditoría técnica

### 1. Resumen ejecutivo

`app-carrera` es una SPA React + Vite que actúa como panel de gestión integral para un evento de trail running. Cubre presupuesto, voluntarios, logística, patrocinadores, camisetas, documentos y proyecto, con persistencia dual: `localStorage` en desarrollo y **Neon PostgreSQL vía Vercel Serverless Functions** en producción, con un BFF proxy que protege la API key server-side. Existe además un portal público de voluntarios en `/voluntarios/mi-ficha`.

El estado general es **funcionalmente completo y arquitectónicamente correcto** en sus decisiones de fondo, pero acumula deuda técnica en tres ejes que ya frenan la velocidad de desarrollo:

1. **24 claves de storage sin registrar** en `storageKeys.js` y 134 líneas con strings `"teg_..."` hardcodeados fuera de él.
2. **CSS fragmentado en tres sistemas paralelos** (CSS-in-JS, variables CSS, Tailwind) que se mezclan con especificidades impredecibles.
3. **Cinco archivos entre 1.500 y 2.503 líneas** que mezclan lógica, UI, constantes y estilos.

Hay **cuatro problemas de seguridad activos**, uno de ellos crítico para producción.

---

### 2. Inventario de archivos críticos

| Archivo | Líneas | Problema principal |
|---|---|---|
| `src/components/blocks/Proyecto.jsx` | 2.503 | Monolito: Kanban + Hitos + Equipo + Roadmap + 12 useState |
| `src/components/blocks/Camisetas.jsx` | 2.041 | `fmtEur` redefinida local, constantes mezcladas, clave raíz hardcoded |
| `src/components/blocks/Dashboard.jsx` | 1.948 | 17 claves hardcodeadas, sin skeletons en carga inicial |
| `src/pages/VoluntarioPortal.jsx` | 1.934 | Logo base64 incrustado (≈18 KB), CSS redefinido triple |
| `src/components/blocks/Documentos.jsx` | 1.535 | Monolito sin división por responsabilidad |
| `src/lib/blockStyles.js` | 1.006 | Design system CSS-in-JS inyectado N veces como `<style>` |
| `src/hooks/useBudgetLogic.js` | 476 | `LS_PATS` hardcoded, `setSyncConfig` sin `useCallback` |
| `src/lib/dataService.js` | 476 | Shim `useData` con bug sutil en closure de `onChange` |
| `src/components/auth/pinAuth.js` | 58 | Hash djb2 no criptográfico, sin lockout |

---

### 3. Análisis exhaustivo por módulo

#### 3.1 Sistema de persistencia — `dataService.js` + `useData.js`

**Arquitectura general: correcta.** El patrón adapter con TTL de caché de 4h, cola offline con `__pending_sync_*`, versionado optimista y debounce de 2s es apropiado para una aplicación mono-usuario con conectividad intermitente.

**Problema DS-01 — Shim `useData` en `dataService.js` con bug de closure:**
El shim exportado al final de `dataService.js` tiene un `onChange` handler que lee de localStorage directamente sin actualizar `stateRef.current`. La versión canónica en `hooks/useData.js` actualiza `stateRef.current` dentro del setter de estado. Si un componente importa `useData` desde `@/lib/dataService` en lugar de `@/hooks/useData`, puede perder actualizaciones de estado en el closure de `setValue`. Hay componentes que todavía usan el import incorrecto.

**Problema DS-02 — `setMultiple` con clave aleatoria rompe el debounce:**
El fix `BUG-DS-02` generó una clave única por llamada (`batch_${Date.now()}_${random}`). Como consecuencia, el debounce nunca puede colapsar dos `setMultiple` del mismo módulo. Si el usuario edita inscritos rápido en el presupuesto, cada pulsación genera un timeout independiente y todos se ejecutan. Solución: clave semántica estable por módulo (`"batch_presupuesto"`).

**Problema DS-03 — `syncPendingQueue` puede fallar silenciosamente:**
Si `API_KEY` no está configurada en Vercel, los PUT del retry devuelven 401 sin limpiar las marcas `__pending_sync_*`. El loop continúa en cada reconexión emitiendo `teg-save-status: error` sin feedback explicativo al usuario.

**Estado del evento `teg-conflict`:** se emite correctamente en 409 y `Index.jsx` muestra un `toast.warning`. Esto es funcionalmente insuficiente: un toast que desaparece en 3 segundos no es una resolución de conflicto de datos. Si el usuario tiene el foco en otro modal en ese momento, no lo ve y pierde datos sin saberlo. **Estado real: ⚠️ Incompleto — toast sin acción.** Requiere modal con decisión explícita del usuario (ver Tarea 0.4).

---

#### 3.2 Autenticación del panel — `pinAuth.js` + `PinScreen.jsx`

**Problema SEC-01 — Hash djb2:**
`hashPin` usa un algoritmo de tabla hash (`Math.imul(31, h) + charCode`), no criptográfico. Con un PIN de 4 dígitos (10.000 posibilidades), el espacio es enumerable en milisegundos offline si alguien accede al localStorage. El hash del voluntario (`api/voluntarios/index.js`) ya usa bcrypt con 10 rondas y migración transparente de hashes legacy. La asimetría es marcada.

**Problema SEC-02 — Sin lockout:**
`PinScreen.jsx` no tiene contador de intentos fallidos. Se pueden probar los 10.000 PINs de 4 dígitos programáticamente con `dispatchEvent` sin ningún límite. Importante: el lockout en localStorage solo protege contra acceso físico no autorizado al dispositivo del organizador. NO protege contra ataques automatizados externos (nueva ventana de incógnito = localStorage limpio). La solución real para ataques externos es la Fase 4 (bcrypt server-side con rate limiting en PostgreSQL).

**Problema SEC-03 — `DEFAULT_PIN` en claro:**
`export const DEFAULT_PIN = "1975"` en el código fuente. Cualquier persona con acceso al repositorio conoce el PIN por defecto.

**Problema SEC-04 — PIN inicial del portal predecible:**
El PIN inicial de cada voluntario en el portal son los últimos 4 dígitos de su teléfono. No hay aviso en el primer login que indique al voluntario que debe cambiarlo. Esta información es semipública (conocida por el organizador y por cualquiera que tenga el teléfono del voluntario).

**Bien resuelto:** `checkSession()` valida TTL de 8h y versión de sesión. `createSession()` es correcto.

---

#### 3.3 README y `.env.example` — Instrucción de seguridad activamente incorrecta

- `README.md` línea 16: *"Completa las variables `DATABASE_URL`, `API_KEY` y `VITE_API_KEY`"*.
- `README.md` línea 18: *"VITE_API_KEY: Utilizada por el frontend de Vite"*.
- `.env.example` línea 14: `VITE_API_KEY=tu_clave_secreta_aqui`.

El refactor `SEC-01` ya eliminó completamente la necesidad de `VITE_API_KEY` del cliente. El frontend llama a `/api/proxy/*` que inyecta la key server-side. Un desarrollador nuevo siguiendo el README expondrá la clave en el bundle de producción. **Esta es la vulnerabilidad más grave del proyecto** porque afecta al despliegue, no al código.

---

#### 3.4 `storageKeys.js` — El contrato roto

`storageKeys.js` define **34 claves**. El código fuente usa **58 claves únicas** con strings hardcodeados, de las cuales **24 no están en `storageKeys.js`**:

```
teg_camisetas_v1               teg_camisetas_v1_corredores
teg_camisetas_v1_nino          teg_camisetas_v1_precio_plataforma
teg_camisetas_v1_stats         teg_codigos_promo_v1
teg_localizaciones_v1          teg_logistica_v1
teg_logistica_v1_cont          teg_logistica_v1_pedidos_prov
teg_logistica_v1_rut           teg_logistica_v1_tipos_cont
teg_logistica_v1_veh           teg_patrocinadores_v1
teg_presupuesto_v1             teg_proyecto_v1
teg_proyecto_v1_equipo         teg_scenarios_v1
teg_voluntarios_v1             teg_voluntarios_v1_imgBack
teg_voluntarios_v1_imgFront    teg_voluntarios_v1_imgGuiaTallas
teg_voluntarios_v1_opcionPuesto  teg_voluntarios_v1_opcionVehiculo
```

Hay además **134 líneas** con strings `"teg_..."` hardcodeados fuera de `storageKeys.js` distribuidas en: `Configuracion.jsx` (35 refs), `Dashboard.jsx` (17 refs), `useBudgetLogic.js` (14 refs), `useAlertasBadges.js` (9 refs), `Logistica.jsx` (8 refs), `Proyecto.jsx` (5 refs), `Voluntarios.jsx` (3 refs), y otros.

**El riesgo concreto:** una migración de schema (`v1 → v2`) hecha en `storageKeys.js` solo afecta a 34 claves. Las otras 24 siguen apuntando al schema antiguo. Los datos se rompen de forma silenciosa y por módulo, difícil de reproducir.

---

#### 3.5 Sistema CSS — Tres fuentes de verdad en conflicto

El proyecto usa simultáneamente:

1. Variables CSS en `index.css` con prefijo `--teg-*` (ej: `--teg-bg`, `--teg-cyan`).
2. Variables CSS en `blockStyles.js` sin prefijo (ej: `--bg`, `--cyan`, `--surface`).
3. Clases Tailwind en componentes `ui/`.
4. Inline styles con colores hex hardcodeados en `Index.jsx` (ej: `rgba(13,17,33,0.88)`).

`BLOCK_CSS` (1.006 líneas) se inyecta como `<style>` tag en cada bloque. Con 10 bloques navegables, cada navegación puede generar una nueva etiqueta `<style>` en el `<head>`. Referencias de `BLOCK_CSS`: `Camisetas.jsx` (3×), `Dashboard.jsx` (3×), `Configuracion.jsx` (2×), `Documentos.jsx` (2×), `Logistica.jsx` (2×), `Patrocinadores.jsx` (2×), `Presupuesto.jsx` (2×), `Proyecto.jsx` (2×), `Voluntarios.jsx` (2×), `LogisticaPedidos.jsx` (1×), `VoluntarioPortal.jsx` (1×).

El impacto en runtime es bajo, pero hace imposible depurar el modo claro/oscuro y obliga a editar 3 archivos para cambiar un color.

---

#### 3.6 Componentes duplicados e inconsistencias de organización

**INC-01 — Dos `constants.js` para Patrocinadores:**
`src/components/patrocinadores/constants.js` y `src/components/blocks/patrocinadores/constants.js` son funcionalmente idénticos. Las diferencias son solo de formato. Si se actualiza uno sin el otro, la app se comporta distinto según la ruta de import.

**INC-02 — `usePaginacion.jsx` en dos carpetas:**
`src/lib/usePaginacion.jsx` es un re-export shim hacia `src/hooks/usePaginacion.jsx`. La carpeta `lib/` debería contener utilidades puras sin dependencias de React.

**INC-03 — `fmtEur` con 3 implementaciones distintas:**

- `utils.js`: `fmtEur` (sin decimales) + `fmtEur2` (2 decimales) — correctas y exportadas.
- `LogisticaPedidos.jsx` línea 23: `const fmtEur = (n) => new Intl.NumberFormat("es-ES", {minimumFractionDigits:2}).format(n||0)` — redefinida localmente.

La versión local de `LogisticaPedidos.jsx` tiene `minimumFractionDigits: 2` pero no tiene `maximumFractionDigits`. Si `n` es `1234.5678`, la versión local formatea como `"1.234,5678"` (4 decimales), mientras que `fmtEur2` de `utils.js` formatea como `"1.234,57"` (2 decimales). En pantallas con precios de proveedores con decimales no redondos esto produce diferencias visuales reales.

**INC-04 — `manifest.json` ausente:**
`index.html` referencia `<link rel="manifest" href="/manifest.json">`. El directorio `/public/` tiene `icon-192.webp` e `icon-512.webp` pero no existe `manifest.json`. La PWA no puede instalarse.

**INC-05 — `minifyIdentifiers: false` en `vite.config.ts`:**
El comentario documenta que `Logistica.jsx` causa colisiones de scope al minificar. El flag resuelve el síntoma pero no la causa raíz. El bundle es 8-12% más grande. Antes de buscar la causa, hay que descartar importaciones circulares con `npx madge --circular src/components/blocks/Logistica.jsx`.

**INC-06 — Logo base64 inline en `VoluntarioPortal.jsx`:**
El logo está incrustado como string base64 (≈18 KB). `/public/logo.webp` ya existe.

**INC-07 — `teg-conflict`: toast sin acción (no resuelto funcionalmente):**
El listener existe y muestra un toast, pero un toast pasivo no es suficiente para un conflicto de datos. El usuario debe poder elegir qué versión conservar. Ver Tarea 0.4.

**INC-08 — `recover-pin` en portal:** implementado y funcional. ✅

---

#### 3.7 API y backend

- **`api/proxy.js`:** correcto en general. Gap crítico: si `VERCEL_URL` no está seteada, la URL interna cae silenciosamente a `http://localhost:3000`. En un preview environment de Vercel sin la variable configurada, todas las peticiones fallan silenciosamente.
- **`api/voluntarios/index.js`:** bien implementado. bcrypt con migración transparente, rate limiting en PostgreSQL, CORS con allowlist.
- **`api/budget-log/index.js`:** implementado. `TabHistorial.jsx` llama correctamente a `/api/proxy/budget-log?limit=100`. ✅
- **`api/data/public.js`:** whitelist correcta. `teg_voluntarios_v1_voluntarios` en `WRITE_WHITELIST` pero no en `READ_WHITELIST` — correcto. Las colecciones de imágenes en `READ_WHITELIST` sin límite de tamaño: un base64 de 500 KB–1 MB puede provocar timeout en conexiones lentas del portal.

---

### 4. Mapa de seguridad

| ID | Severidad | Estado | Descripción |
|---|---|---|---|
| SEC-01 | 🔴 Crítica | ⚠️ Abierta | README instruye exponer `VITE_API_KEY` al bundle del cliente |
| SEC-02 | 🟡 Media | ⚠️ Abierta | `pinAuth.js` usa djb2 (no criptográfico) |
| SEC-03 | 🟡 Media | ⚠️ Abierta | Sin lockout por intentos fallidos en `PinScreen.jsx` |
| SEC-04 | 🟡 Media | ⚠️ Abierta | `DEFAULT_PIN = "1975"` en claro en el código fuente |
| SEC-05 | 🟡 Media | ⚠️ Abierta | PIN inicial del portal = últimos 4 dígitos del teléfono, sin aviso de cambio |
| SEC-06 | ✅ Resuelta | — | API key movida al proxy BFF server-side |
| SEC-07 | ✅ Resuelta | — | Rate limiting en PostgreSQL (sobrevive cold starts) |
| SEC-08 | ✅ Resuelta | — | bcrypt en portal de voluntarios con migración transparente |
| SEC-09 | 🔵 Baja | ⚠️ Abierta | `VERCEL_URL` ausente en proxy cae silenciosamente a localhost |
| SEC-10 | 🔵 Baja | ⚠️ Abierta | Imágenes de camisetas en endpoint público sin límite de tamaño |

---

### 5. Estado real de funcionalidades

| Funcionalidad | Estado |
|---|---|
| Evento `teg-conflict` → toast de aviso | ⚠️ Incompleto — toast sin acción de resolución |
| `recover-pin` en portal de voluntarios | ✅ Implementado |
| `TabHistorial` conectado a `budget-log` | ✅ Implementado |
| `manifest.json` para PWA | ❌ Ausente |
| Upload de imágenes de camisetas desde panel | ⚠️ Verificar — puede existir parcialmente en `Configuracion.jsx` |
| Lockout por intentos fallidos en `PinScreen` | ❌ No implementado |
| Skeleton loaders en carga inicial | ❌ No implementado |
| Estados vacíos descriptivos en portal | ⚠️ Parcial — ficha sin puesto muestra espacio en blanco |
| Test E2E con Playwright | ❌ Dependencia instalada, cero tests escritos |
| `setSyncConfig` con `useCallback` | ❌ Falta — causa re-renders innecesarios |
| Validación de `VERCEL_URL` en proxy | ❌ Falta — fallo silencioso en ausencia |
| Advertencia de PIN temporal en portal | ❌ Falta — PIN inicial predecible sin aviso |

---

*Última actualización: 2026-05-10*
