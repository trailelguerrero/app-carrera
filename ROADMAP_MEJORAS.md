# ROADMAP DE MEJORAS — App Carrera (Trail El Guerrero 2026)

> **Documento de trabajo** para Claude.  
> Contiene el plan completo de mejoras acordado, los skills necesarios para implementar cada una,
> y las reglas de trabajo que debemos seguir juntos.

---

## 📋 REGLAS DE TRABAJO (obligatorias antes de cualquier implementación)

Estas reglas se aplican **siempre**, sin excepción:

1. **Explicación previa en lenguaje sencillo.** Antes de tocar código, explicaré qué vamos a hacer
   como si se lo contara a alguien que no sabe programar. Si algo no está claro, no empezamos.

2. **Aprobación explícita requerida.** No avanzaré a la siguiente mejora hasta que me digas
   explícitamente que la anterior está correcta y puedes darme el OK.

3. **Tests antes del push.** Después de cada implementación ejecutaré los tests relevantes
   y mostraré el resultado. Si fallan, corrijo antes de hacer push.

4. **Un push por mejora.** Cada mejora completa y aprobada genera un commit y push propios,
   con un mensaje descriptivo que indica qué se implementó.

5. **Prompt de trabajo estandarizado.** Al inicio de cada implementación leeré los skills
   indicados en esta sección antes de escribir una sola línea de código.

---

## 🗂️ CÓMO USAR LOS SKILLS

Los skills están en el repositorio `https://github.com/sickn33/antigravity-awesome-skills`.
Localmente, en esta sesión, están clonados en:

```
/home/claude/antigravity-awesome-skills/plugins/antigravity-awesome-skills/skills/<nombre-skill>/SKILL.md
```

**Para indicarme que use un skill**, simplemente di:

> *"Implementa la mejora X del roadmap"*

Yo leeré automáticamente los skills indicados en esa sección antes de empezar.

**Para indicarme que use un skill concreto fuera del roadmap:**

> *"Lee el skill `nombre-skill` y aplícalo a `ruta/del/archivo.js`"*

---

## 🔢 PRIORIDAD DE IMPLEMENTACIÓN

| # | Mejora | Área | Riesgo | Impacto |
|---|--------|------|--------|---------|
| 1 | Rate limiter + seguridad auth | Seguridad | 🔴 Crítico | Alto |
| 2 | Neon PostgreSQL + connection pooling | Backend/BD | 🔴 Crítico | Alto |
| 3 | Bus de eventos tipado (teg-sync) | Arquitectura | 🟠 Medio | Alto |
| 4 | Contratos entre módulos (APIs públicas) | Arquitectura | 🟠 Medio | Alto |
| 5 | Dashboard: KPIs con cache independiente | Frontend | 🟠 Medio | Alto |
| 6 | Offline sync: retry y separación reads/writes | Backend/UX | 🟡 Bajo | Medio |
| 7 | Rendimiento React: memoización y re-renders | Frontend | 🟡 Bajo | Medio |
| 8 | Presupuesto: cálculos memoizados | Frontend | 🟡 Bajo | Medio |
| 9 | Formularios de Voluntarios: validación Zod | Frontend | 🟡 Bajo | Medio |
| 10 | PWA: offline-first + background sync | PWA | 🟡 Bajo | Medio |
| 11 | Tests E2E: portal público de voluntarios | Testing | 🟡 Bajo | Medio |

---

## 📦 MEJORA 1 — Seguridad del sistema de autenticación

### 🗣️ Explicación para no técnicos

La aplicación tiene un sistema de acceso con PIN (como un cajero automático).
Actualmente, existe una protección básica que impide intentar el PIN muchas veces seguidas,
pero esa protección **se olvida cada vez que el servidor se reinicia** (lo que pasa varias veces
al día en Vercel). Esto significa que un atacante podría intentar miles de PINs sin restricción.
Además, falta añadir cabeceras de seguridad HTTP que protegen contra tipos de ataques comunes
en navegadores.

**Lo que vamos a hacer:** guardar el contador de intentos en la base de datos (en lugar de en
memoria), añadir cabeceras de seguridad a todas las respuestas del servidor, y revisar que
la comparación del PIN no sea vulnerable a un tipo de ataque llamado "timing attack".

### 📁 Archivos afectados

```
api/panel/auth.js
api/lib/rateLimiter.js
api/proxy.js
src/components/auth/pinAuth.js
```

### 🔧 Skills necesarios

| Skill | Ruta local | Para qué se usa |
|-------|-----------|-----------------|
| `security-auditor` | `skills/security-auditor/SKILL.md` | Auditoría completa del sistema de auth |
| `api-security-best-practices` | `skills/api-security-best-practices/SKILL.md` | Headers HTTP, rate limiting serverless |
| `auth-implementation-patterns` | `skills/auth-implementation-patterns/SKILL.md` | Patrones de sesión, expiración, timing |

### 🎯 Prompt de implementación

```
Lee los skills security-auditor, api-security-best-practices y auth-implementation-patterns.
Luego analiza:
- api/panel/auth.js (comparación PIN, respuestas de error)
- api/lib/rateLimiter.js (ya usa Neon — verificar que sea correcto)
- api/proxy.js (cabeceras CORS y seguridad)
- src/components/auth/pinAuth.js (lógica cliente)

Identifica y corrige:
1. ¿El rate limiter persiste correctamente entre instancias serverless?
2. ¿Faltan cabeceras de seguridad HTTP (CSP, X-Frame-Options, etc.)?
3. ¿La comparación del PIN es vulnerable a timing attacks?
4. ¿Los mensajes de error revelan información sensible?

No implementes nada todavía. Primero explícame los hallazgos y propón los cambios.
```

### ✅ Tests a ejecutar tras la implementación

```bash
npm run test -- src/test/api-voluntarios.test.js   # cubre auth indirectamente
npm run test:e2e                                     # login flow
```

---

## 📦 MEJORA 2 — Base de datos: Neon + connection pooling correcto

### 🗣️ Explicación para no técnicos

Imagina que la base de datos es una centralita telefónica. Cada vez que alguien llama (hace
una petición), se abre una línea. Si se abren demasiadas líneas a la vez, la centralita se
colapsa. La solución es tener un "pool" (un grupo de líneas reutilizables): en lugar de abrir
y cerrar una línea por cada llamada, se reutilizan las que ya están abiertas.

Actualmente la app conecta a Neon sin aprovechar este sistema de pool, y las queries sobre
datos JSON no tienen índices (como buscar en un libro sin índice — hay que leer todo para
encontrar algo).

**Lo que vamos a hacer:** configurar el pool de conexiones correctamente, añadir índices
en las columnas más consultadas, y optimizar las queries que se hacen en serie para que
vayan en paralelo.

### 📁 Archivos afectados

```
api/proxy.js
api/data/[collection].js
api/data/batch.js
api/setup.js
```

### 🔧 Skills necesarios

| Skill | Ruta local | Para qué se usa |
|-------|-----------|-----------------|
| `neon-postgres` | `skills/neon-postgres/SKILL.md` | Patrones de pooling, branching, Neon SDK |
| `postgresql-optimization` | `skills/postgresql-optimization/SKILL.md` | Índices JSONB, EXPLAIN ANALYZE, vacuums |
| `performance-optimizer` | `skills/performance-optimizer/SKILL.md` | Queries paralelas con Promise.all |

### 🎯 Prompt de implementación

```
Lee los skills neon-postgres, postgresql-optimization y performance-optimizer.
Luego analiza:
- api/proxy.js (cómo se instancia neon())
- api/data/[collection].js (queries de SELECT/INSERT)
- api/data/batch.js (batch inserts)
- api/setup.js (schema inicial)

Propón:
1. Configuración correcta de DATABASE_URL (pooled) vs DIRECT_URL (migrations)
2. Índices GIN sobre columnas JSONB para las colecciones más consultadas
3. Conversión de getMultiple() de serie a Promise.all paralelo
4. Añadir EXPLAIN ANALYZE a las 3 queries más frecuentes para detectar seq scans

No implementes todavía. Primero muéstrame el diagnóstico y los cambios propuestos.
```

### ✅ Tests a ejecutar tras la implementación

```bash
npm run test -- src/test/dataservice.test.js
npm run test -- src/test/sprint2.test.js
npm run test -- src/test/sprint3.test.js
```

---

## 📦 MEJORA 3 — Bus de eventos tipado entre módulos

### 🗣️ Explicación para no técnicos

Actualmente los módulos de la app se comunican entre sí como personas que gritan en una
habitación: cualquiera puede gritar "¡algo cambió!" pero nadie sabe quién gritó, qué cambió
exactamente, ni si alguien lo escuchó. Esto se llama `teg-sync` en el código — un evento
anónimo y sin estructura.

**Lo que vamos a hacer:** reemplazar esos gritos anónimos por un sistema de mensajería
ordenado, como WhatsApp: cada mensaje tiene un remitente, un tipo, y un contenido concreto.
Así, cuando Presupuesto cambia un dato, el Dashboard sabe exactamente *qué* cambió y solo
actualiza lo que necesita, sin recargar todo.

La tecnología que usaremos es **Zustand** — una librería de gestión de estado muy ligera
que ya existe en el ecosistema React y no requiere cambios grandes en la app.

### 📁 Archivos afectados

```
src/lib/dataService.js          (métodos notify/onChange)
src/hooks/useAlertasBadges.js   (suscripciones a teg-sync)
src/hooks/useData.js            (re-suscripción en onChange)
src/hooks/useDashboardData.js   (listener de teg-sync)
src/pages/Index.jsx             (dispatch de teg-sync)
src/lib/toast.js                (eventos teg-toast)
```

### 🔧 Skills necesarios

| Skill | Ruta local | Para qué se usa |
|-------|-----------|-----------------|
| `react-state-management` | `skills/react-state-management/SKILL.md` | Zustand store, slices por módulo |
| `event-sourcing-architect` | `skills/event-sourcing-architect/SKILL.md` | Catálogo de eventos tipados de dominio |

### 🎯 Prompt de implementación

```
Lee los skills react-state-management y event-sourcing-architect.
Luego analiza:
- src/lib/dataService.js (métodos notify(), onChange(), y el dispatch de teg-sync)
- src/hooks/useAlertasBadges.js (todo calcBadgeModulo y el listener de teg-sync)
- src/hooks/useDashboardData.js (el useEffect con addEventListener teg-sync)
- grep de "dispatchEvent" y "CustomEvent" en todo src/

Propón:
1. Un store Zustand con slices por módulo (presupuesto, voluntarios, logistica, etc.)
2. Un catálogo de 6-8 eventos de dominio tipados que reemplacen el CustomEvent anónimo
   (ej: PRESUPUESTO_ACTUALIZADO, VOLUNTARIO_CONFIRMADO, INCIDENCIA_ABIERTA)
3. Cómo migrar useAlertasBadges para suscribirse al store en lugar de localStorage
4. Compatibilidad hacia atrás: mantener el CustomEvent teg-sync durante la transición

No implementes todavía. Primero muéstrame el diseño del store y el catálogo de eventos.
```

### ✅ Tests a ejecutar tras la implementación

```bash
npm run test -- src/test/dashboard.test.js
npm run test -- src/test/dashboardKpis.test.js
npm run test -- src/test/runtime.test.jsx
```

---

## 📦 MEJORA 4 — Contratos entre módulos (APIs públicas por módulo)

### 🗣️ Explicación para no técnicos

Actualmente algunos módulos de la app "meten la mano" en los cajones de otros para coger
datos directamente. Por ejemplo, el módulo de "Día de Carrera" conoce las claves internas
de Logística y Voluntarios, y accede a ellas directamente. Si mañana Logística cambia cómo
guarda sus datos, "Día de Carrera" se rompe sin avisar.

**Lo que vamos a hacer:** que cada módulo tenga una "ventanilla" oficial por donde los demás
pueden pedir datos. Así, si Logística cambia internamente, solo tiene que actualizar su
ventanilla, y el resto de la app sigue funcionando.

Esto es como pasar de que cualquiera pueda entrar en el almacén a que haya un mostrador
donde pides lo que necesitas.

### 📁 Archivos afectados

```
src/components/blocks/DiaCarrera.jsx          (consume datos de Logística y Voluntarios)
src/lib/semaforoRiesgos.js                    (agrega datos de 4 módulos)
src/hooks/useAlertasBadges.js                 (calcBadgeModulo lee datos ajenos)
src/hooks/useDashboardKpis.js                 (lee datos de todos los módulos)
```

**Archivos nuevos a crear:**

```
src/hooks/public/usePresupuestoPublic.js
src/hooks/public/useVoluntariosPublic.js
src/hooks/public/useLogisticaPublic.js
src/hooks/public/useProyectoPublic.js
src/hooks/public/useDocumentosPublic.js
```

### 🔧 Skills necesarios

| Skill | Ruta local | Para qué se usa |
|-------|-----------|-----------------|
| `ddd-tactical-patterns` | `skills/ddd-tactical-patterns/SKILL.md` | Contratos de dominio, aggregate boundaries |
| `react-ui-patterns` | `skills/react-ui-patterns/SKILL.md` | Hooks de integración, composition patterns |

### 🎯 Prompt de implementación

```
Lee los skills ddd-tactical-patterns y react-ui-patterns.
Luego analiza:
- src/components/blocks/DiaCarrera.jsx (qué datos importa de otros módulos)
- src/lib/semaforoRiesgos.js (qué datos necesita de cada módulo)
- src/hooks/useAlertasBadges.js (función calcBadgeModulo, qué lee de cada módulo)
- src/hooks/useDashboardKpis.js (imports de storageKeys de otros módulos)
- src/constants/storageKeys.js (todas las claves)

Propón:
1. Un hook público por módulo (usePresupuestoPublic, etc.) que exponga
   solo los datos que otros módulos necesitan, con tipos JSDoc claros
2. Qué datos expone cada hook (mínimo necesario)
3. Cómo DiaCarrera y semaforoRiesgos consumen estos hooks en lugar de acceder
   directamente a las claves de storage

No implementes todavía. Primero muéstrame el diseño de cada hook público.
```

### ✅ Tests a ejecutar tras la implementación

```bash
npm run test -- src/test/diacarrera.test.js
npm run test -- src/test/dashboard.test.js
npm run test -- src/test/dashboardBugFixes.test.js
```

---

## 📦 MEJORA 5 — Dashboard: KPIs con caché independiente por módulo

### 🗣️ Explicación para no técnicos

El Dashboard es el "cuadro de mandos" de la app. Actualmente, cuando cualquier cosa cambia
en cualquier parte de la app, el Dashboard recarga TODOS los datos de TODOS los módulos,
aunque solo haya cambiado una cosa de Presupuesto. Es como si cada vez que cambias una
bombilla de tu casa, tuvieras que revisar todo el edificio.

**Lo que vamos a hacer:** el Dashboard tendrá una "memoria" separada para cada módulo.
Cuando cambia Presupuesto, solo recarga lo de Presupuesto. Cuando cambia Logística, solo
recarga lo de Logística. Esto hace la app más rápida y más eficiente.

La tecnología que usaremos es **TanStack Query** (también conocida como React Query),
que es el estándar de la industria para este tipo de caché inteligente en React.

### 📁 Archivos afectados

```
src/hooks/useDashboardData.js     (fetching actual — todo en un bloque)
src/hooks/useDashboardKpis.js     (cálculo de KPIs — ~300 líneas)
src/components/blocks/Dashboard.jsx
src/components/dashboard/KPI.jsx
src/components/dashboard/SeccionCharts.jsx
src/components/dashboard/SemaforoRiesgos.jsx
```

### 🔧 Skills necesarios

| Skill | Ruta local | Para qué se usa |
|-------|-----------|-----------------|
| `tanstack-query-expert` | `skills/tanstack-query-expert/SKILL.md` | useQuery, queryClient, invalidation por módulo |
| `kpi-dashboard-design` | `skills/kpi-dashboard-design/SKILL.md` | Patrones de agregación de KPIs, alertas |
| `react-state-management` | `skills/react-state-management/SKILL.md` | Server state vs local state |
| `full-stack-orchestration-full-stack-feature` | `skills/full-stack-orchestration-full-stack-feature/SKILL.md` | Contratos de datos frontend-backend |

### 🎯 Prompt de implementación

```
Lee los skills tanstack-query-expert, kpi-dashboard-design, react-state-management
y full-stack-orchestration-full-stack-feature.
Luego analiza:
- src/hooks/useDashboardData.js (el getMultiple y el listener de teg-sync)
- src/hooks/useDashboardKpis.js (completo — cómo calcula KPIs de cada módulo)
- src/components/blocks/Dashboard.jsx (primeras 50 líneas — cómo carga ALL_KEYS)

Propón:
1. Instalación de TanStack Query (ya no es una dependencia del proyecto)
2. Un useQuery por módulo con queryKey específica y staleTime apropiado
3. Invalidación de cache por módulo cuando llega un evento del store Zustand (Mejora 3)
4. Separación del cálculo de KPIs en funciones puras testables
5. Loading state granular: el dashboard muestra datos mientras otros aún cargan

IMPORTANTE: Esta mejora depende de Mejora 3 (bus de eventos) y Mejora 4 (contratos).
Confirma que están implementadas antes de empezar.

No implementes todavía. Primero muéstrame la arquitectura propuesta.
```

### ✅ Tests a ejecutar tras la implementación

```bash
npm run test -- src/test/dashboard.test.js
npm run test -- src/test/dashboardKpis.test.js
npm run test -- src/test/dashboardBugFixes.test.js
npm run test:e2e
```

---

## 📦 MEJORA 6 — Offline sync: retry inteligente y separación lecturas/escrituras

### 🗣️ Explicación para no técnicos

La app puede usarse sin conexión a internet (modo offline). Cuando vuelve la conexión,
intenta guardar los cambios pendientes. Pero actualmente, si el primer intento de guardado
falla, se rinde. Además, no hay distinción entre "leer datos" y "escribir datos" — ambas
operaciones se tratan igual, cuando en realidad son muy diferentes: leer puede esperar y
usar datos guardados, escribir necesita persistir sí o sí.

**Lo que vamos a hacer:** hacer que los guardados pendientes reintenten automáticamente
(esperando un poco más cada vez, como hacer redial si la línea está ocupada), y separar
claramente las operaciones de lectura de las de escritura para que cada una tenga la
estrategia correcta.

### 📁 Archivos afectados

```
src/lib/dataService.js        (syncPendingQueue, handler de 'online')
src/components/blocks/ConflictModal.jsx
src/hooks/useOnlineStatus.js
```

### 🔧 Skills necesarios

| Skill | Ruta local | Para qué se usa |
|-------|-----------|-----------------|
| `error-handling-patterns` | `skills/error-handling-patterns/SKILL.md` | Retry con backoff, circuit breaker |
| `cqrs-implementation` | `skills/cqrs-implementation/SKILL.md` | Separación lectura/escritura, write queue |

### 🎯 Prompt de implementación

```
Lee los skills error-handling-patterns y cqrs-implementation.
Luego analiza:
- src/lib/dataService.js (bloque syncPendingQueue al final del archivo,
  el handler window.addEventListener('online'), y el emit de teg-conflict)
- src/components/blocks/ConflictModal.jsx (cómo resuelve conflictos HTTP 409)
- src/hooks/useOnlineStatus.js

Propón:
1. Retry con backoff exponencial para la pending queue
   (ej: 1s, 2s, 4s, 8s, máximo 5 reintentos)
2. Separación explícita: capa de LECTURA con TTL/cache local,
   capa de ESCRITURA con queue + retry
3. Mejorar ConflictModal para mostrar el contexto del flujo que generó el conflicto,
   no solo el nombre de la colección
4. Estado visual en la UI cuando hay escrituras pendientes (badge o indicador)

No implementes todavía. Primero muéstrame el diseño propuesto.
```

### ✅ Tests a ejecutar tras la implementación

```bash
npm run test -- src/test/dataservice.test.js
npm run test -- src/test/sw-patterns.test.js
```

---

## 📦 MEJORA 7 — Rendimiento React: memoización y re-renders

### 🗣️ Explicación para no técnicos

En React, los componentes se "redibujan" cada vez que algo cambia. El problema es que
a veces se redibujan aunque nada relevante para ellos haya cambiado, lo cual es trabajo
innecesario que ralentiza la app. Es como si cada vez que alguien en casa enciende una luz,
todas las luces parpadearan aunque no tuvieran ninguna razón para hacerlo.

**Lo que vamos a hacer:** identificar qué componentes se redibujan innecesariamente
y aplicar técnicas para que solo se actualicen cuando sus datos realmente cambian.

### 📁 Archivos afectados

```
src/components/logistica/TabTimeline.jsx
src/components/logistica/TabMaterial.jsx
src/components/blocks/Presupuesto.jsx
src/hooks/useBudgetLogic.js
src/hooks/useDashboardKpis.js
src/components/common/SkeletonBlock.jsx
```

### 🔧 Skills necesarios

| Skill | Ruta local | Para qué se usa |
|-------|-----------|-----------------|
| `react-component-performance` | `skills/react-component-performance/SKILL.md` | useMemo, useCallback, React.memo |
| `react-best-practices` | `skills/react-best-practices/SKILL.md` | Bundle size, server-side, waterfalls |
| `performance-optimizer` | `skills/performance-optimizer/SKILL.md` | Medir antes/después, identificar bottlenecks |

### 🎯 Prompt de implementación

```
Lee los skills react-component-performance, react-best-practices y performance-optimizer.
Luego analiza:
- src/components/logistica/TabTimeline.jsx (tamaño y dependencias)
- src/components/logistica/TabMaterial.jsx (filtros y listas)
- src/hooks/useBudgetLogic.js (cálculos que se ejecutan en cada keystroke)
- src/hooks/useDashboardKpis.js (el useMemo gigante)

Propón con prioridad por impacto:
1. Qué componentes necesitan React.memo y por qué
2. Qué cálculos en hooks necesitan useMemo (con comparación de complejidad)
3. Dónde falta useCallback en handlers que se pasan como props
4. Si TabTimeline/TabMaterial necesitan virtualización para listas largas

No implementes todavía. Primero muéstrame el diagnóstico de re-renders.
```

### ✅ Tests a ejecutar tras la implementación

```bash
npm run test -- src/test/logistica.test.js
npm run test -- src/test/presupuesto.test.js
npm run test -- src/test/sprint1.test.jsx
```

---

## 📦 MEJORA 8 — Presupuesto: cálculos memoizados y debounce en inputs

### 🗣️ Explicación para no técnicos

El módulo de Presupuesto tiene campos numéricos donde puedes escribir cantidades.
Actualmente, cada vez que pulsas una tecla, la app recalcula TODO el presupuesto
(ingresos, costes, escenarios, ROI...) aunque solo hayas cambiado un número.
Es como si cada vez que escribes una letra en un buscador, buscara inmediatamente
sin esperar a que termines de escribir.

**Lo que vamos a hacer:** añadir un pequeño retardo (300ms) antes de recalcular,
y guardar los resultados intermedios para no recalcularlos si el dato de entrada
no ha cambiado.

### 📁 Archivos afectados

```
src/hooks/useBudgetLogic.js
src/lib/budgetUtils.js
src/components/budget/TabPresupuesto.jsx
src/components/budget/TabResumen.jsx
src/components/budget/TabEquilibrio.jsx
src/components/budget/common/NumInput.jsx
```

### 🔧 Skills necesarios

| Skill | Ruta local | Para qué se usa |
|-------|-----------|-----------------|
| `react-component-performance` | `skills/react-component-performance/SKILL.md` | useMemo en cadenas de cálculo |
| `performance-optimizer` | `skills/performance-optimizer/SKILL.md` | Debounce, medir impacto |

### 🎯 Prompt de implementación

```
Lee los skills react-component-performance y performance-optimizer.
Luego analiza:
- src/hooks/useBudgetLogic.js (flujo completo de cálculo)
- src/lib/budgetUtils.js (funciones puras de cálculo)
- src/components/budget/common/NumInput.jsx (cómo maneja onChange)

Propón:
1. Debounce de 300ms en NumInput para retrasar el recálculo mientras se escribe
2. useMemo para cada etapa del cálculo (inscritos → ingresos → costes → resultado)
   de forma que solo se recalcule la etapa afectada
3. Separar las funciones de budgetUtils.js en funciones puras sin efectos secundarios,
   para que sean fácilmente memoizables

No implementes todavía. Primero muéstrame el diagrama de dependencias del cálculo.
```

### ✅ Tests a ejecutar tras la implementación

```bash
npm run test -- src/test/presupuesto.test.js
npm run test -- src/test/budgetUtils.test.js
```

---

## 📦 MEJORA 9 — Voluntarios: validación robusta y formulario público

### 🗣️ Explicación para no técnicos

Cuando un voluntario rellena el formulario público para apuntarse, la app comprueba que
los datos son correctos. Pero esta comprobación está incompleta: por ejemplo, no verifica
que el teléfono tenga el formato correcto, o que el email sea válido antes de enviarlo.
Si alguien pone datos erróneos, puede que la app los guarde igualmente y luego haya
problemas.

**Lo que vamos a hacer:** añadir una validación completa con Zod (una librería ya instalada
en el proyecto) para que el formulario compruebe todos los campos antes de enviar,
y muestre mensajes de error claros y accesibles.

### 📁 Archivos afectados

```
src/components/voluntarios/FormularioPublico.jsx
src/components/voluntarios/ModalVoluntario.jsx
src/components/voluntarios/FichaVoluntario.jsx
api/voluntarios/index.js
```

### 🔧 Skills necesarios

| Skill | Ruta local | Para qué se usa |
|-------|-----------|-----------------|
| `zod-validation-expert` | `skills/zod-validation-expert/SKILL.md` | Esquemas Zod, mensajes de error, integración con react-hook-form |
| `react-ui-patterns` | `skills/react-ui-patterns/SKILL.md` | Accesibilidad ARIA, compound components |

### 🎯 Prompt de implementación

```
Lee los skills zod-validation-expert y react-ui-patterns.
Luego analiza:
- src/components/voluntarios/FormularioPublico.jsx (validación actual)
- src/components/voluntarios/ModalVoluntario.jsx (campos del voluntario)
- api/voluntarios/index.js (validación servidor)

Propón:
1. Esquema Zod completo para un voluntario (nombre, teléfono, email, talla, puesto)
   con mensajes de error en español
2. Validación tanto en el formulario público (cliente) como en la API (servidor)
3. Accesibilidad: atributos ARIA para errores (aria-invalid, aria-describedby)
4. Manejo del caso: el voluntario ya existe (¿actualizar o rechazar?)

No implementes todavía. Primero muéstrame el esquema Zod propuesto.
```

### ✅ Tests a ejecutar tras la implementación

```bash
npm run test -- src/test/voluntarios.test.js
npm run test -- src/test/api-voluntarios.test.js
npm run test -- src/test/portal.test.js
npm run test:e2e -- src/test/e2e/portal.spec.ts
```

---

## 📦 MEJORA 10 — PWA: modo offline-first y background sync

### 🗣️ Explicación para no técnicos

La app ya puede instalarse como una app en el móvil (PWA — Progressive Web App).
Actualmente tiene soporte básico para funcionar sin internet. Pero si guardas cambios
sin conexión, esos cambios se sincronizan solo cuando tú vuelves a abrir la app.

**Lo que vamos a hacer:** hacer que la sincronización ocurra automáticamente en segundo
plano (aunque no tengas la app abierta), y que los datos se muestren siempre aunque
no haya internet, usando los últimos datos guardados como fallback.

### 📁 Archivos afectados

```
public/sw.js
src/constants/swPatterns.js
public/manifest.json
```

### 🔧 Skills necesarios

| Skill | Ruta local | Para qué se usa |
|-------|-----------|-----------------|
| `progressive-web-app` | `skills/progressive-web-app/SKILL.md` | Offline-first, background sync, precaching, push |

### 🎯 Prompt de implementación

```
Lee el skill progressive-web-app.
Luego analiza:
- public/sw.js (estrategias de cache actuales)
- src/constants/swPatterns.js (patrones definidos)
- public/manifest.json (configuración de la PWA)

Propón:
1. Estrategia offline-first para /api/proxy/data/* 
   (network-first con fallback a cache para lecturas)
2. Background Sync para las mutaciones pendientes de syncPendingQueue
   (que se sincronicen aunque el usuario cierre la app)
3. Precaching correcto de los assets estáticos más importantes
4. Push notifications para el módulo DiaCarrera 
   (alertas de incidencias cuando está en segundo plano)

IMPORTANTE: Esta mejora se integra con Mejora 6 (offline sync).

No implementes todavía. Primero muéstrame el diseño de las estrategias de cache.
```

### ✅ Tests a ejecutar tras la implementación

```bash
npm run test -- src/test/sw-patterns.test.js
npm run build && npm run preview  # verificar PWA en build de producción
```

---

## 📦 MEJORA 11 — Tests E2E: cobertura del portal público de voluntarios

### 🗣️ Explicación para no técnicos

Los tests automáticos son como un inspector que verifica que todo funciona correctamente
cada vez que hacemos un cambio. Tenemos tests para el "panel de gestión" (la parte privada),
pero el "portal de voluntarios" (la página pública donde se apuntan los voluntarios) tiene
poca cobertura. Si hacemos cambios en esa parte, podríamos romper algo sin darnos cuenta.

**Lo que vamos a hacer:** ampliar los tests automáticos para cubrir el flujo completo
del voluntario: desde que accede a la página, rellena el formulario, y recibe confirmación.

### 📁 Archivos afectados

```
src/test/e2e/portal.spec.ts       (ampliar)
src/test/portal.test.js           (ampliar)
playwright.config.ts
```

### 🔧 Skills necesarios

| Skill | Ruta local | Para qué se usa |
|-------|-----------|-----------------|
| `e2e-testing` | `skills/e2e-testing/SKILL.md` | Playwright patterns, page objects, fixtures |

### 🎯 Prompt de implementación

```
Lee el skill e2e-testing.
Luego analiza:
- src/test/e2e/portal.spec.ts (tests existentes)
- src/test/e2e/login.spec.ts (como referencia de estructura)
- src/pages/VoluntarioPortal.jsx (flujo que hay que testear)
- playwright.config.ts (configuración actual)

Propón y escribe tests E2E para:
1. Acceso al portal con código QR/URL válido
2. Relleno completo del formulario de voluntario (happy path)
3. Validación de campos incorrectos (sad paths)
4. Voluntario que ya existe — flujo de actualización
5. Verificación de confirmación final

IMPORTANTE: Esta mejora depende de Mejora 9 (validación Zod).
```

### ✅ Tests a ejecutar tras la implementación

```bash
npm run test:e2e
```

---

## 📊 ESTADO DEL ROADMAP

| # | Mejora | Estado | Fecha | Commit |
|---|--------|--------|-------|--------|
| 1 | Seguridad auth | ⬜ Pendiente | — | — |
| 2 | Neon + pooling | ⬜ Pendiente | — | — |
| 3 | Bus eventos tipado | ⬜ Pendiente | — | — |
| 4 | Contratos módulos | ⬜ Pendiente | — | — |
| 5 | Dashboard cache | ⬜ Pendiente | — | — |
| 6 | Offline sync | ⬜ Pendiente | — | — |
| 7 | React performance | ⬜ Pendiente | — | — |
| 8 | Presupuesto memos | ⬜ Pendiente | — | — |
| 9 | Voluntarios Zod | ⬜ Pendiente | — | — |
| 10 | PWA offline-first | ⬜ Pendiente | — | — |
| 11 | Tests E2E portal | ⬜ Pendiente | — | — |

> **Leyenda:** ⬜ Pendiente · 🔄 En progreso · ✅ Completado · ❌ Descartado

---

## 🔗 DEPENDENCIAS ENTRE MEJORAS

```
Mejora 2 (Neon)
    └─▶ Mejora 1 (Auth) — el rate limiter ya usa Neon

Mejora 3 (Bus eventos)
    └─▶ Mejora 4 (Contratos)
            └─▶ Mejora 5 (Dashboard cache)

Mejora 6 (Offline sync)
    └─▶ Mejora 10 (PWA)

Mejora 9 (Voluntarios Zod)
    └─▶ Mejora 11 (Tests E2E)

Mejoras 7 y 8 (Performance) — independientes, pueden hacerse en cualquier momento
```

---

## 📝 NOTAS DE SESIÓN

*(Claude actualizará esta sección tras cada sesión de trabajo)*

- **2026-05-28** — Documento creado. Análisis inicial de la app completado.
  Stack confirmado: React 18 + Vite + Tailwind + Neon PostgreSQL + Vercel + PWA.
  11 mejoras identificadas, ordenadas por prioridad y dependencias.
