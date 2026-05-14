# Roadmap de Implementación — app-carrera

> **Tercer documento.** Leer al inicio de cada fase nueva.

## Resumen de fases

| Fase | Días | Objetivo |
|------|------|----------|
| 0 | 1–2 | Seguridad crítica e infraestructura rota |
| 1 | 2–3 | Consolidación de storage keys |
| 2 | 3–5 | CSS unificado |
| 3 | 6–9 | División de monolitos + limpieza técnica |
| 4 | 2–3 | PIN del panel a bcrypt |
| 5 | 2–3 | Funcionalidades pendientes |
| 6 | 2–3 | UX: skeletons y estados vacíos |
| 7 | 3–5 | Tests |

**Total estimado: 28–44 días de trabajo efectivo.**

> ⚠️ El orden de las primeras 4 fases NO es negociable.
> No empezar Fase 1 sin cerrar Fase 0. No empezar Fase 3 sin cerrar Fase 1.
> **STOP: backup de Neon antes de Fase 1.**

---

## Fase 0 — Seguridad e infraestructura rota

**Duración:** 1–2 días | **Prerrequisito:** ninguno

**Criterio de cierre:** `npm run build` no incluye `VITE_API_KEY`; el panel tiene lockout; el manifest existe; el proxy valida `VERCEL_URL`; el conflicto de versión tiene UI de resolución.

### Tarea 0.1 — Corregir README y .env.example

- **Tipo:** documentación + seguridad | **Prioridad:** crítica | **Tiempo:** 30 min
- **Archivos:** `README.md`, `.env.example`
- **Qué hacer:** Eliminar toda mención a `VITE_API_KEY`. Actualizar tabla de variables para que solo liste `DATABASE_URL`, `API_KEY` y `ALLOWED_ORIGIN`. Añadir nota explicando que el frontend llama a `/api/proxy/*`.
- **Criterio de aceptación:**
```bash
grep -r "VITE_API_KEY" dist/   # vacío tras npm run build
grep "VITE_API_KEY" README.md  # vacío
```
- **Prompt de rol:** Technical Writer senior especializado en documentación de seguridad de APIs. Conoces la diferencia entre variables del cliente (expuestas en bundle) y del servidor (solo en runtime). Eliminas instrucciones que causan brechas y explicas el motivo en términos no técnicos. Output claro, directo, sin ambigüedades. **NO reescribir código.**

---

### Tarea 0.2 — Crear public/manifest.json

- **Tipo:** nueva funcionalidad | **Prioridad:** alta | **Tiempo:** 45 min
- **Archivos:** `public/manifest.json` (nuevo)
- **Qué hacer:** Crear con campos W3C: `name`, `short_name`, `start_url: "/"`, `display: "standalone"`, `theme_color: "#22d3ee"`, `background_color: "#08091a"`, icons referenciando `icon-192.webp` e `icon-512.webp`. No usar vite-plugin-pwa.
- **Criterio de aceptación:** Chrome DevTools → Application → Manifest sin errores. Lighthouse PWA ≥ 90.
- **Prompt de rol:** Frontend Engineer especializado en PWA. Conoces la especificación W3C y requisitos de Chrome, Safari/iOS y Android. Verificas que los iconos referenciados existen en `/public/` antes de generarlos. **NO generar manifest genérico sin adaptar valores reales del proyecto.**

---

### Tarea 0.3 — Lockout por intentos fallidos en PinScreen.jsx

- **Tipo:** corrección de seguridad | **Prioridad:** alta | **Tiempo:** 1–2 horas
- **Archivos:** `src/components/auth/PinScreen.jsx`, `src/constants/storageKeys.js`
- **Qué hacer:** Añadir contador de intentos en localStorage. Tras 10 intentos fallidos en 5 minutos, bloquear 60s con countdown visual. El lockout sobrevive recargas. Añadir `SK_AUTH_LOCKOUT` a storageKeys.js.
- **Modelo de amenaza (documentar en comentario):** Protege contra acceso físico no autorizado al dispositivo. NO protege contra ataques externos (nueva ventana de incógnito = localStorage limpio). La protección externa se implementa en Fase 4.
- **Criterio de aceptación:** 10 PINs incorrectos → countdown de 60s y teclado deshabilitado. Recarga dentro del período → bloqueo persiste.
- **Prompt de rol:** Security Engineer con experiencia en autenticación frontend. El lockout que implementas protege contra acceso físico, NO contra ataques automatizados externos. Tu código documenta este modelo de amenaza en un comentario al inicio del módulo. **NO afirmar que el lockout "dificulta" ataques automatizados externos.**

---

### Tarea 0.4 — Modal de resolución de conflicto de versión

- **Tipo:** mejora de funcionalidad existente | **Prioridad:** alta | **Tiempo:** 2–3 horas
- **Archivos:** `src/pages/Index.jsx`, nuevo `src/components/common/ConflictModal.jsx`, `src/lib/dataService.js`
- **Qué hacer:** Reemplazar el toast de `teg-conflict` por un modal con: nombre de colección en lenguaje legible, botón "Mantener mis cambios" (PUT con `forceOverwrite: true`), botón "Recargar datos del servidor" (invalida caché).
- **Criterio de aceptación:** Simular 409 → modal aparece con nombre de colección y ambas opciones funcionan.
- **Prompt de rol:** Product Engineer en intersección de frontend técnico y UX. Defines estados posibles desde la perspectiva del usuario antes de implementar. Copy en español claro, sin tecnicismos. Hooks estándar, sin dependencias nuevas. **NO implementar merge complejo. Dos botones, explicación clara.**

---

### Tarea 0.5 — Validar VERCEL_URL en api/proxy.js

- **Tipo:** corrección de infraestructura | **Prioridad:** alta | **Tiempo:** 15 min
- **Archivos:** `api/proxy.js`
- **Qué hacer:** Reemplazar el fallback silencioso a `http://localhost:3000` por:
```javascript
const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : null;
if (!baseUrl) {
  console.error("[proxy] VERCEL_URL no configurada");
  return res.status(503).json({ error: "Servicio no disponible: configuración de entorno incompleta." });
}
```
- **Criterio de aceptación:** Deploy sin `VERCEL_URL` devuelve 503, no falla silenciosamente.
- **Prompt de rol:** Backend Engineer con experiencia en Vercel serverless. Reemplazas fallbacks silenciosos por errores explícitos con código HTTP y mensaje descriptivo. Dos líneas de validación son suficientes.

---

## Fase 1 — Consolidación de storage keys

**Duración:** 2–3 días | **Prerrequisito:** Fase 0 completa

> ⚠️ **BACKUP OBLIGATORIO:** exportar dump completo de Neon (`pg_dump`) antes del primer deploy. Un typo en cualquier clave puede perder datos en producción de forma silenciosa.

**Criterio de cierre:**
```bash
grep -rn '"teg_' src/ --include="*.jsx" --include="*.js" \
  | grep -v storageKeys.js | grep -v "//.*teg_" | wc -l
# debe retornar 0
```

### Tarea 1.1 — Añadir las 24 claves faltantes a storageKeys.js

- **Tipo:** ampliación de infraestructura | **Prioridad:** alta | **Tiempo:** 1 hora
- **Archivos:** `src/constants/storageKeys.js`
- **Claves a añadir:**
```javascript
SK_CAM_ROOT              = "teg_camisetas_v1"
SK_CAM_CORREDORES        = "teg_camisetas_v1_corredores"
SK_CAM_NINO              = "teg_camisetas_v1_nino"
SK_CAM_PRECIO_PLATAFORMA = "teg_camisetas_v1_precio_plataforma"
SK_CAM_STATS             = "teg_camisetas_v1_stats"
SK_UI_CODIGOS_PROMO      = "teg_codigos_promo_v1"
SK_LOC_LOCALIZACIONES    = "teg_localizaciones_v1"
SK_LOG_ROOT              = "teg_logistica_v1"
SK_LOG_CONT              = "teg_logistica_v1_cont"
SK_LOG_PEDIDOS_PROV      = "teg_logistica_v1_pedidos_prov"
SK_LOG_RUT               = "teg_logistica_v1_rut"
SK_LOG_TIPOS_CONT        = "teg_logistica_v1_tipos_cont"
SK_LOG_VEH               = "teg_logistica_v1_veh"
SK_PAT_ROOT              = "teg_patrocinadores_v1"
SK_PPTO_ROOT             = "teg_presupuesto_v1"
SK_PROY_ROOT             = "teg_proyecto_v1"
SK_PROY_EQUIPO           = "teg_proyecto_v1_equipo"
SK_SCENARIOS             = "teg_scenarios_v1"
SK_VOL_ROOT              = "teg_voluntarios_v1"
SK_VOL_IMG_BACK          = "teg_voluntarios_v1_imgBack"
SK_VOL_IMG_FRONT         = "teg_voluntarios_v1_imgFront"
SK_VOL_IMG_GUIA_TALLAS   = "teg_voluntarios_v1_imgGuiaTallas"
SK_VOL_OPCION_PUESTO     = "teg_voluntarios_v1_opcionPuesto"
SK_VOL_OPCION_VEHICULO   = "teg_voluntarios_v1_opcionVehiculo"
SK_AUTH_LOCKOUT          = "teg_auth_lockout_v1"
```
- **Criterio de aceptación:** `Object.keys(SK).length === 59`. Valores únicos sin colisiones.
- **Prompt de rol:** Arquitecto de datos con experiencia en persistencia clave-valor. Sigues convenciones estrictas y documentas cada clave con comentario de una línea. **NO crear alias inconsistentes con el patrón `teg_<módulo>_v1_<entidad>`.**

---

### Tarea 1.2 — Reemplazar strings literales por constantes SK_

- **Tipo:** refactor de alto riesgo | **Prioridad:** alta | **Tiempo:** 1–2 días
- **Orden de menor a mayor riesgo:**
  1. `useAlertasBadges.js` (9 refs, solo lectura)
  2. `useBudgetLogic.js` (14 refs)
  3. `Logistica.jsx` (8 refs)
  4. `Voluntarios.jsx` (3 refs)
  5. `Proyecto.jsx` (5 refs)
  6. `Dashboard.jsx` (17 refs, solo lectura)
  7. `Configuracion.jsx` (35 refs — ALTO RIESGO, backup antes)
  8. `Index.jsx`, `VoluntarioPortal.jsx`, constantes, `DiaCarrera.jsx`, `Documentos.jsx`, `Camisetas.jsx`
- **Regla crítica:** el valor del string debe mantenerse idéntico. Solo cambia el token en código fuente, NUNCA el valor en localStorage/Neon.
- **Criterio de aceptación:** `grep -rn '"teg_' src/` (excluyendo storageKeys.js y comentarios) retorna vacío.
- **Prompt de rol:** Refactoring Specialist con experiencia en migraciones de alto riesgo. Metodología: 1) auditar estado actual, 2) proponer cambios en orden de riesgo, 3) especificar exactamente qué string se reemplaza por qué constante, 4) indicar cómo verificar. **NO hacer find-and-replace global sin verificar que cada clave mantiene el mismo string value.**

---

### Tarea 1.3 — Eliminar src/components/patrocinadores/constants.js (duplicado)

- **Tipo:** limpieza técnica | **Prioridad:** media | **Tiempo:** 30 min
- **Archivos:** `src/components/patrocinadores/constants.js` (eliminar), `src/components/blocks/Patrocinadores.jsx`
- **Qué hacer:** Verificar con grep todos los imports. Canónico: `src/components/blocks/patrocinadores/constants.js`. Hacer diff exhaustivo antes de eliminar.
- **Criterio de aceptación:** `grep -rn "from.*components/patrocinadores/constants" src/` retorna vacío.
- **Prompt de rol:** Code Reviewer con experiencia en consolidación de código duplicado. Primer paso: diff exhaustivo para confirmar que son funcionalmente idénticos. **NO asumir que son iguales. Siempre verificar con diff.**

---

## Fase 2 — Refactor de CSS

**Duración:** 3–5 días | **Prerrequisito:** Fase 1 completa

**Criterio de cierre:** `document.querySelectorAll('style').length` es constante independientemente del módulo activo.

### Tarea 2.1 — Mover BLOCK_CSS a archivo CSS estático

- **Tipo:** refactor de rendimiento | **Prioridad:** alta | **Tiempo:** 1 día
- **Archivos:** nuevo `src/styles/blocks.css`, `src/main.tsx`, todos los archivos con `BLOCK_CSS`
- **Qué hacer:** Crear `src/styles/blocks.css` con contenido de `BLOCK_CSS`. Importar en `main.tsx`. En cada bloque, eliminar `BLOCK_CSS` y mantener solo `CSS_LOCAL` si lo hay. Marcar `BLOCK_CSS` como `@deprecated`.
- **Criterio de aceptación:** navegar entre los 9 módulos sin que aumente el número de `<style>` tags en el `<head>`.
- **Prompt de rol:** CSS Architect especializado en design systems. Evalúas orden de carga, especificidad y si hay estilos dinámicos que no pueden ser estáticos. Output incluye plan paso a paso con riesgos. **NO mover todo el CSS sin verificar si hay partes de BLOCK_CSS que dependen de variables JS.**

---

### Tarea 2.2 — Unificar tokens de color

- **Tipo:** refactor de mantenibilidad | **Prioridad:** media | **Tiempo:** 2–3 días
- **Qué hacer:** Crear tabla de mapeo (variable vieja → nueva → valor claro → oscuro). Verificar equivalencia perceptual HSL vs hex. Añadir variables huérfanas a `index.css`. Eliminar bloque `:root` de `blockStyles.js`. Eliminar colores hex hardcodeados de `Index.jsx`.
- **Criterio de aceptación:** cambiar `--teg-cyan` en `index.css` propaga a todos los módulos sin tocar otros archivos.
- **Prompt de rol:** Design System Engineer con experiencia en migración de tokens. Creas tabla completa de equivalencias antes de proponer cambios. Output: 1) tabla de mapeo, 2) lista de variables huérfanas, 3) plan de migración, 4) lista de componentes para revisión visual. **NO renombrar variables sin verificar equivalencia perceptual.**

---

## Fase 3 — División de monolitos y limpieza técnica

**Duración:** 6–9 días | **Prerrequisito:** Fases 0 y 1 completas

**Criterio de cierre:** ningún archivo en `src/components/blocks/` supera las 400 líneas.

### Tarea 3.1 — Centralizar fmtEur duplicado

- **Tipo:** limpieza técnica | **Prioridad:** alta | **Tiempo:** 30 min
- **Archivos:** `src/components/blocks/LogisticaPedidos.jsx`
- **Qué hacer:** Eliminar redefinición local en línea 23. Importar `fmtEur2` desde `@/lib/utils`.
- **Criterio de aceptación:** `grep -rn "Intl.NumberFormat" src/components/blocks/ | grep -v utils` retorna vacío.
- **Prompt de rol:** Desarrollador JavaScript/React. Sigues convenciones establecidas. **NO convertir fmtEur en clase ni añadir opciones innecesarias.**

---

### Tarea 3.2 — Diagnosticar bug TDZ en Logistica.jsx

- **Tipo:** corrección de bug oculto | **Prioridad:** alta | **Tiempo:** 2–4 horas
- **Archivos:** `src/components/blocks/Logistica.jsx`, `vite.config.ts`
- **Paso 0 obligatorio:**
```bash
npx madge --circular src/components/blocks/Logistica.jsx
npx madge --circular src/components/blocks/LogisticaPedidos.jsx
```
- **Criterio de aceptación:** `npm run build` con `minifyIdentifiers: true` y la app funciona sin errores TDZ.
- **Prompt de rol:** Senior Frontend Engineer especializado en tooling (Vite, esbuild, Rollup). Primer paso: descartar circularidades con madge. **NO mantener `minifyIdentifiers: false` como solución permanente.**

---

### Tarea 3.3 — Dividir Proyecto.jsx (2.503 líneas)

- **Tipo:** refactor de arquitectura | **Prioridad:** media | **Tiempo:** 2–3 días
- **Archivos:** `src/components/blocks/Proyecto.jsx` → `src/components/proyecto/*.jsx`, `src/constants/proyectoConstants.js`
- **Qué hacer:** Extraer constantes semilla a `proyectoConstants.js`. Revisar `EQUIPO0` por datos personales reales. Crear `TabTareas.jsx`, `TabHitos.jsx`, `TabEquipo.jsx`, `TabRoadmap.jsx`. Proyecto.jsx resultante: orquestador < 200 líneas.
- **Regla de corte:** si un sub-componente necesita >5 props del padre, la división está mal planteada.
- **Criterio de aceptación:** `wc -l src/components/blocks/Proyecto.jsx < 200`
- **Prompt de rol:** Senior React Engineer especializado en refactoring. Metodología: 1) mapear estado (global vs local del tab), 2) identificar props por sub-componente, 3) proponer jerarquía que minimice prop drilling, 4) extraer un tab a la vez verificando funcionalidad. **NO extraer sub-componentes que siguen dependiendo de 15 props del padre.**

---

### Tarea 3.4 — Dividir Camisetas.jsx y Dashboard.jsx

- **Tipo:** refactor de arquitectura | **Prioridad:** media | **Tiempo:** 2–3 días
- **Camisetas:** extraer a `src/components/camisetas/`: `ModalPedido.jsx`, `ModalCoste.jsx`, `TabPedidos.jsx`, `TabInventario.jsx`, `TabEstadisticas.jsx`.
- **Dashboard:** extraer `useDashboardData.js` (fetching) y `useDashboardKpis.js` (cálculos). El componente solo renderiza.
- **Criterio de aceptación:** ambos archivos < 400 líneas.
- **Prompt de rol:** igual que Tarea 3.3.

---

### Tarea 3.5 — Eliminar logo base64 de VoluntarioPortal.jsx

- **Tipo:** limpieza técnica | **Prioridad:** baja | **Tiempo:** 15 min
- **Archivos:** `src/pages/VoluntarioPortal.jsx`
- **Qué hacer:** Reemplazar cadena base64 por `<img src="/logo.webp" alt="Trail El Guerrero" />`.
- **Criterio de aceptación:** bundle del portal reduce ≈18 KB. Logo visible en portal.

---

## Fase 4 — Seguridad: migrar PIN del panel a bcrypt

**Duración:** 2–3 días | **Prerrequisito:** Fase 0 completa (lockout activo antes de migrar el hash)

**Criterio de cierre:** `hashPin` en `pinAuth.js` solo se usa para leer hashes legacy. El hash en Neon empieza con `$2b$`.

### Tarea 4.1 — Crear endpoint api/panel/auth.js

- **Tipo:** nueva funcionalidad de backend | **Prioridad:** alta | **Tiempo:** 1–2 días
- **Archivos:** nuevo `api/panel/auth.js`, `api/proxy.js`, `vercel.json`, `src/components/auth/PinScreen.jsx`, `src/components/auth/ChangePinModal.jsx`, `src/components/auth/pinAuth.js`
- **Qué hacer:** Dos acciones: `verify` (POST con migración transparente djb2→bcrypt) y `change` (POST verifica actual, guarda bcrypt). Estrategia de fallback con timeout de 3s:
```javascript
async function verifyPinWithFallback(pin) {
  try {
    const res = await Promise.race([
      fetch("/api/proxy/panel/auth", { method: "POST", body: JSON.stringify({ pin }) }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000))
    ]);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { valid } = await res.json();
    return valid;
  } catch (err) {
    console.warn("[auth] Fallback a verificación local:", err.message);
    return verifyPin(pin);
  }
}
```
- **Criterio de aceptación:** hash en Neon empieza con `$2b$10$`. Login incorrecto devuelve `{ valid: false }` sin información adicional.
- **Prompt de rol:** Backend Security Engineer especializado en autenticación serverless. Documentas: modelo de amenaza, limitaciones del entorno serverless, casos de error que no revelan información. **NO usar bcrypt con >12 rondas en serverless (timeout risk). NO usar VITE_* para feature flag.**

---

## Fase 5 — Funcionalidades pendientes

**Duración:** 2–3 días | **Prerrequisito:** Fases 0 y 1

### Tarea 5.1 — setSyncConfig con useCallback

- **Tiempo:** 30 min | **Archivos:** `src/hooks/useBudgetLogic.js`
- **Criterio de aceptación:** React DevTools Profiler muestra 0 re-renders de `TabEquilibrio` al cambiar un campo que no afecta a `syncConfig`.
- **Prompt de rol:** Senior React Engineer. Envuelves en `useCallback` con dependencias mínimas correctas. **NO aplicar `useCallback` de forma preventiva a funciones que no se pasan hacia abajo.**

---

### Tarea 5.2 — Upload de imágenes de camisetas

- **Tiempo:** 1 día | **Archivos:** `src/components/blocks/Configuracion.jsx`
- **Antes de empezar:** `grep -n "imgFront\|imgBack\|input.*type.*file" src/components/blocks/Configuracion.jsx`
- **Validaciones obligatorias:** solo JPEG/PNG/WEBP, máximo 500 KB, previsualizar con `URL.createObjectURL` antes de guardar.
- **Prompt de rol:** Frontend Engineer con experiencia en File API. Siempre: validación MIME, validación tamaño, preview local, feedback de error. **NO usar librería de upload de terceros.**

---

### Tarea 5.3 — Corregir setMultiple debounce semántico

- **Tiempo:** 1 hora | **Archivos:** `src/lib/dataService.js`, `src/hooks/useBudgetLogic.js`
- **Qué hacer:** Reemplazar clave aleatoria por `batchKey` semántico estable. Fallback: `"batch_global"`.
- **Criterio de aceptación:** editar inscritos rápidamente genera un solo PUT a Neon.
- **Prompt de rol:** Senior JavaScript Engineer. Solución mínima: parámetro opcional sin romper API pública.

---

### Tarea 5.4 — Advertencia de PIN temporal en portal

- **Tiempo:** 1 hora | **Archivos:** `src/pages/VoluntarioPortal.jsx`
- **Copy:** "⚠️ Tu PIN actual es el que te asignamos automáticamente. Te recomendamos cambiarlo. [Cambiar PIN]"
- **Criterio de aceptación:** voluntario con PIN automático ve el banner. Voluntario que cambió PIN no lo ve.
- **Prompt de rol:** UX Engineer orientado a seguridad. Banner no-bloqueante, mensaje en positivo, acción clara. **NO usar modal bloqueante.**

---

## Fase 6 — UX y estados de carga

**Duración:** 2–3 días | **Prerrequisito:** Fase 2 recomendada

### Tarea 6.1 — Skeleton loaders

- **Tiempo:** 1–2 días | **Archivos:** `Dashboard.jsx`, `Voluntarios.jsx`, `Presupuesto.jsx`, `Patrocinadores.jsx`, `Documentos.jsx` + nuevo `src/components/common/SkeletonBlock.jsx`
- **Criterio de aceptación:** con throttling de red en DevTools, ningún bloque muestra datos vacíos durante la carga.
- **Prompt de rol:** Frontend UI Engineer. Skeletons imitan geometría real, animación shimmer CSS pura, misma estructura DOM para evitar CLS. **NO usar spinner centralizado.**

---

### Tarea 6.2 — Estados vacíos descriptivos en portal

- **Tiempo:** 2–3 horas | **Archivos:** `src/pages/VoluntarioPortal.jsx`
- **Copy cuando puesto es null:** icono ⏳, "Tu puesto aún no está asignado", "El organizador te lo comunicará por email cuando esté confirmado."
- **Criterio de aceptación:** voluntario sin puesto asignado ve el estado descriptivo, no un espacio en blanco.
- **Prompt de rol:** UX Writer. Patrón: título (en positivo), subtítulo (qué puede esperar), icono contextual. **NO reutilizar EmptyState genérico si el mensaje pierde precisión.**

---

## Fase 7 — Tests

**Duración:** 3–5 días | **Prerrequisito:** todas las fases anteriores

### Tarea 7.0 — Diagnóstico previo (obligatorio)

```bash
npm run test -- --reporter=verbose 2>&1 | tail -30
```
Registrar: total tests, passed, failed, skipped. Si hay tests rojos, hacer pasar primero los de código ya implementado.

### Tarea 7.1 — Auditar roadmap.test.js y suites existentes

- **Tiempo:** 1–2 días
- **Clasificar cada test:** 1) valor, 2) implementación, 3) especulativo, 4) frágil.
- **Criterio de aceptación:** `npm run test` pasa al 100% sin warnings de tests obsoletos.
- **Prompt de rol:** QA Engineer. Clasificas cada test, propones mantener/refactorizar/eliminar. **NO eliminar tests que fallan sin entender por qué.**

### Tarea 7.2 — Tests E2E del flujo de login y portal

- **Tiempo:** 1–2 días | **Archivos:** nuevo `src/test/e2e/login.spec.ts`, `src/test/e2e/portal.spec.ts`, `playwright.config.ts`
- **Flujos:** login correcto/incorrecto/lockout; portal registro y recuperación de PIN.
- **Criterio de aceptación:** `npm run test:e2e` pasa en local. Usar `getByRole`, `getByText`, no selectores CSS.
- **Prompt de rol:** SDET especializado en Playwright. Tests resilientes, deterministas, que testean comportamiento de usuario. **NO usar `page.waitForTimeout(2000)`.**

---

*Última actualización: 2026-05-10*

---

## Bugs económicos pendientes — sesión 2026-05-14

> Identificados durante el análisis de inconsistencias entre el bloque Presupuesto y el Dashboard.
> `BUG-ECO-01` ya está resuelto (commit `d9afb44`). Los dos siguientes quedan pendientes para F10.

---

### BUG-ECO-01 ✅ RESUELTO — Divergencia en cálculo de camisetas (commit `d9afb44`)

- **Causa:** `useBudgetLogic.totalMerchBeneficio` usaba lógica manual que omitía el coste de camisetas de corredor externo (plataforma), voluntarios y niños. El Dashboard usaba `calculateCosteCamisetasDesglosado` que sí los incluía.
- **Impacto:** el resultado del Presupuesto era más optimista que el del Dashboard en una cantidad igual al coste de fabricación de esas camisetas. Con 100 corredores y 30 voluntarios, la diferencia típica era de 1.000–1.500 €.
- **Fix aplicado:** `useBudgetLogic` ahora usa `calculateCosteCamisetasDesglosado` como única fuente de verdad, igual que el Dashboard.

---

### BUG-ECO-02 — Dashboard puede mostrar datos de patrocinadores obsoletos

- **Impacto:** 🟡 Medio — el KPI de resultado en el Dashboard puede estar desactualizado si el usuario modifica patrocinadores sin que se dispare el evento `teg-sync`.
- **Causa:** `useDashboardData` lee un snapshot de `localStorage` y solo se actualiza al cargar la página o al recibir el evento `teg-sync`. `useBudgetLogic` usa el hook reactivo `useData` que siempre tiene el valor en tiempo real.
- **Archivos afectados:** `src/hooks/useDashboardData.js`, `src/components/blocks/Patrocinadores.jsx` (el emisor de `teg-sync`)
- **Diagnóstico detallado:**
  - `useDashboardData` hace `localStorage.getItem(key)` en un efecto inicial y en el handler de `teg-sync`.
  - Si `teg-sync` no se emite al guardar un patrocinador (por ejemplo, si la acción de guardado falla silenciosamente o el evento se pierde), el Dashboard queda desincronizado hasta la siguiente recarga.
- **Corrección propuesta:** Auditar todos los puntos de guardado del módulo Patrocinadores para garantizar que siempre emiten `teg-sync` al persistir. Añadir test de regresión que verifique la emisión del evento.
- **Fase:** F10
- **Esfuerzo estimado:** 2–4 horas
- **Criterio de aceptación:** modificar el importe de un patrocinador en el módulo Patrocinadores actualiza el KPI de resultado en el Dashboard sin necesidad de recargar la página.

---

### BUG-ECO-03 — Pedidos de camisetas cancelados se contabilizan como coste en el Dashboard

- **Impacto:** 🟡 Medio — el resultado del Dashboard es ligeramente más pesimista de lo real cuando existen pedidos cancelados.
- **Causa:** `calculateCosteCamisetasDesglosado` (usado por el Dashboard) suma el coste de **todas** las líneas de pedido sin filtrar por `estadoPago`. `useBudgetLogic` en cambio filtraba solo las líneas con `estadoPago === "pagado" || "pendiente"`, excluyendo las canceladas.
- **Archivos afectados:** `src/lib/budgetUtils.js` — función `calculateCosteCamisetasDesglosado`
- **Corrección propuesta:** en `calculateCosteCamisetasDesglosado`, filtrar `extrasLineas` para excluir líneas con `estadoPago === "cancelado"` antes de calcular el coste:
  ```js
  // ANTES:
  const extrasLineas = lineas;
  // DESPUÉS:
  const extrasLineas = lineas.filter(l => l.estadoPago !== "cancelado");
  ```
- **Nota:** este fix debe aplicarse en la misma función que el resto del código ya usa como fuente de verdad, de modo que ambos bloques sigan alineados tras BUG-ECO-01.
- **Fase:** F10
- **Esfuerzo estimado:** 30 minutos + test de regresión
- **Criterio de aceptación:** un pedido con estado `cancelado` no incrementa el coste total de camisetas ni reduce el resultado neto.

---

*Registro actualizado: 2026-05-14 — sesión de análisis económico*
