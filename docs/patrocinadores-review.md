# Revisión del bloque Patrocinadores

**Fecha:** Mayo 2026 · `app-carrera` · Trail El Guerrero 2026
**Archivo analizado:** `src/components/blocks/Patrocinadores.jsx` (2.302 líneas)

---

## 1. Resumen del bloque

### Problema que resuelve
El bloque gestiona el **ciclo de vida completo de los acuerdos comerciales** del evento: desde la prospección inicial hasta la cobranza y la entrega de contraprestaciones. Actúa como un CRM ligero integrado con el módulo de presupuesto.

### Tipos de patrocinadores soportados

| Nivel | Propósito | Campo clave |
|-------|-----------|-------------|
| Oro | Patrocinio principal — logo prominente | `importe` alto |
| Plata | Patrocinio secundario | `importe` medio |
| Bronce | Patrocinio pequeño | `importe` bajo |
| Colaborador | Empresas locales, acuerdos menores | `importe` reducido |
| Especie | Aportación en productos/servicios | `especie`, `especieItems[]` |

### Relaciones gestionadas
- Acuerdo económico: `importe` + `importeCobrado` (cobro parcial)
- Acuerdo en especie: `especie` + `especieItems[]` (inventario de productos aportados)
- Entregables: `contraprestaciones[]` (qué recibe el patrocinador a cambio)
- Documentos adjuntos: `docs[]` vía Vercel Blob
- Seguimiento comercial: `estado`, `proximoContacto`, `fechaAcuerdo`, `fechaVencimiento`

---

## 2. Modelo de datos

### Estructura completa de un patrocinador

```typescript
interface Patrocinador {
  id:               number;
  nombre:           string;
  sector:           string;           // Enum de texto (10 opciones)
  nivel:            "Oro" | "Plata" | "Bronce" | "Colaborador" | "Especie";
  contacto:         string;           // Nombre del interlocutor
  telefono:         string;
  email:            string;
  importe:          number;           // Importe acordado
  importeCobrado:   number;           // Importe realmente cobrado (cobros parciales)
  especie:          number;           // Valor estimado aportación en especie
  estado:           "prospecto" | "negociando" | "confirmado" | "cobrado" | "cancelado";
  fechaAcuerdo:     string;           // ISO date
  fechaVencimiento: string;           // ISO date — deadline de cobro
  proximoContacto:  string;           // ISO date — recordatorio CRM
  contraprestaciones: Contraprestacion[];
  especieItems:       EspecieItem[];
  docs:               Doc[];
  notas:            string;
}

interface Contraprestacion {
  id:       number;
  tipo:     string;    // Texto libre con datalist de sugerencias
  detalle:  string;
  estado:   "pendiente" | "entregado" | "cancelado";
  patId?:   number;    // Denormalizado en TabContraprestaciones
}
```

### Persistencia
- **Clave principal:** `teg_patrocinadores_v1_pats` en Neon PostgreSQL
- **Objetivo de captación:** `teg_patrocinadores_v1_obj` (escalar separado)
- **Sincronización con Presupuesto:** `useBudgetLogic` lee `LS_PATS` directamente
- **Sin versionado:** no existe histórico de cambios por patrocinador

---

## 3. Inconsistencias y duplicidades

### 3.1 Doble fuente de verdad en cálculo del cobrado

La lógica `cobrado = importeCobrado ?? importe` está duplicada en `Patrocinadores.jsx` (stats) y en `useBudgetLogic.js` (totalPatCobrado). Si se cambia en un lugar, el otro queda desincronizado.

**Fix:** Extraer a función utilitaria en `budgetUtils.js`:
```js
export const getImporteCobrado = (pat) =>
  pat.importeCobrado != null ? pat.importeCobrado : (pat.importe || 0);
```

### 3.2 Incoherencia estado cobrado vs importeCobrado

Un patrocinador puede tener `estado: "cobrado"` con `importeCobrado: 0`, o `importeCobrado: 500` con `estado: "confirmado"`. No existe validación que garantice coherencia:

```
Caso A: estado=confirmado, importeCobrado=500 → cobro parcial silencioso, no aparece en KPI cobrado
Caso B: estado=cobrado,    importeCobrado=0   → aparece en KPI cobrado pero sin importe real
```

**Fix:** Si `importeCobrado > 0 && importeCobrado < importe`, mostrar badge "Cobrado parcialmente". Si `estado=cobrado && importeCobrado=0`, mostrar alerta.

### 3.3 `especie` escalar desincronizado de `especieItems`

`pat.especie` es un número editable manualmente, pero debería calcularse como `especieItems.reduce((s, i) => s + valorEstimado(i), 0)`. Al añadir/editar/eliminar un `especieItem`, el campo `especie` no se recalcula automáticamente → pueden divergir.

### 3.4 Riesgo de sobreescritura en contraprestaciones

ModalPat edita `form.contraprestaciones` en estado local. ModalDetalle usa `updateContraprestacion` que muta el estado global inmediatamente. Si el organizador:
1. Abre ModalDetalle y marca una contraprestación como "entregado"
2. Abre ModalPat (editar) sin recargar — el form carga el snapshot anterior
3. Guarda desde ModalPat → sobreescribe con las contraprestaciones del snapshot

**Fix:** Inicializar `form.contraprestaciones` en ModalPat con los datos del estado global en el momento de abrir, no en el momento de montar el componente.

### 3.5 Nivel "Especie" como nivel de patrocinio

`"Especie"` está mezclado con `["Oro", "Plata", "Bronce", "Colaborador"]` pero es una categoría ortogonal (modo de pago, no nivel de visibilidad). Un patrocinador puede ser "Oro en especie".

**Fix:** Separar en dos campos:
- `nivel: "Oro" | "Plata" | "Bronce" | "Colaborador"`
- `tipoAportacion: "monetaria" | "especie" | "mixta"`

### 3.6 Objetivo sin contexto ni diferenciación captado/cobrado

`teg_patrocinadores_v1_obj` es un número fijo sin fecha límite ni distinción entre objetivo de captación y objetivo de tesorería.

### 3.7 `proximoContacto` sin timezone

Se compara con `new Date()` local. En servidor Vercel (UTC) puede haber diferencias de ±1 día.

---

## 4. Flujos de trabajo y UX

### 4.1 Alta de patrocinador
**Flujo actual:** Botón "+ Nuevo" → ModalPat (formulario en una columna) → Guardar

**Problemas:**
- Formulario sin secciones claras — en móvil requiere scroll extenso
- Sin deduplicación por email/teléfono
- Sin plantillas de contraprestaciones por nivel de patrocinio

### 4.2 Seguimiento de negociación
**Flujo actual:** TabPipeline con vista kanban + `proximoContacto` como único recordatorio

**Problemas:**
- Sin historial de interacciones — imposible saber cuándo se contactó y qué resultado hubo
- `notas` es un bloque de texto libre sin timestamps
- Sin tipos de próxima acción (llamar, enviar propuesta, reunión, enviar factura...)
- Sin drag & drop en el kanban para cambiar estado

### 4.3 Registro de aportaciones
**Flujo actual:** ModalDetalle → sub-tab económico → editar importe/importeCobrado manualmente

**Problemas:**
- Sin fecha de cobro registrada — solo el estado "cobrado"
- Sin soporte para pagos fraccionados (50% ahora, 50% en agosto)
- `especieItems` sin alerta de entrega tardía

### 4.4 Control de entregables
**Flujo actual:** TabContraprestaciones lista todos los compromisos activos por estado

**Problemas:**
- Sin fecha límite por contraprestación
- Sin vinculación con hitos del Proyecto
- Sin evidencia de entrega (foto/archivo)
- Campo `tipo` era enum fijo, ahora texto libre → datos históricos inconsistentes

---

## 5. Mejoras operativas

### 5.1 Vista CRM con próxima acción

Añadir `proximaAccion: { tipo, fecha, notas }` al modelo y mostrarlo en la tarjeta de cada patrocinador en el pipeline:

```
[Decathlon Ávila]  Confirmado   📧 Enviar factura (15/06) ── 12 días
[Clínica Fisio]    Negociando   📞 Llamada seguimiento (vencido 3d) ── ⚠️
[Hotel Gredos]     Prospecto    ── Sin acción programada
```

Tipos de acción: `llamar` | `enviar-propuesta` | `enviar-factura` | `enviar-contrato` | `reunion` | `enviar-contraprestacion` | `otro`

### 5.2 Historial de interacciones automático

Registro automático de todos los cambios de estado + notas manuales con timestamp:

```
14/05/2026 10:32 — Estado cambiado: negociando → confirmado
12/05/2026 16:15 — Nota: "Confirmado por Carlos por teléfono. Enviar contrato esta semana."
08/05/2026 09:00 — Estado cambiado: prospecto → negociando
```

### 5.3 Recordatorios vinculados al evento

Alertas automáticas basadas en `config.fecha`:
- T-90 días: "Cierre de propuestas de patrocinio"
- T-60 días: "Confirmación de contraprestaciones gráficas"
- T-30 días: "Revisión de entregables pendientes"
- T-0: "Check final de compromisos para el día de carrera"

### 5.4 Plantillas de contraprestaciones por nivel

```js
const PLANTILLAS = {
  "Oro":   [ "Logo en camiseta corredores", "Banner en zona meta", "Stand", "5 menciones RRSS" ],
  "Plata": [ "Logo en camiseta corredores", "Banner en avituallamiento", "3 menciones RRSS" ],
  "Bronce":[ "Logo en díptico", "Banner en avituallamiento", "1 mención RRSS" ],
};
```
Al seleccionar el nivel en ModalPat, prerellenar contraprestaciones del pack estándar (editable).

---

## 6. Interconexiones con Presupuesto y Dashboard

### 6.1 Integración actual con Presupuesto

```
Patrocinadores.pats[]
    ├─→ useBudgetLogic.totalPatConfirmado  → ingresosExtra[id=1]  (Captados, toggle)
    └─→ useBudgetLogic.totalPatCobrado     → ingresosExtra[id=3]  (Cobrados, toggle)
```

**Problema pendiente:** Las líneas sincronizadas siguen siendo editables en la tabla de Presupuesto. Si el usuario escribe manualmente un valor, se sobreescribirá en el próximo ciclo de render. Falta lock visual (campo read-only + icono 🔒 cuando sync está activo).

### 6.2 Métricas que deberían aparecer en Dashboard

**Ya implementadas:**
- % objetivo captado con barra de progreso
- Alerta si `comprometido/objetivo < 50%`
- Alerta de seguimientos vencidos
- Conteo de contraprestaciones pendientes

**Ausentes y críticas:**

| Métrica | Lógica | Alerta |
|---------|--------|--------|
| Cobrado vs captado | `cobrado / comprometido * 100` | `< 60%` a T-30 días |
| Entregables sin fecha | `contraprestaciones.filter(c => !c.fechaEntrega && c.estado==='pendiente').length` | `> 0` a T-60 días |
| Patrocinadores en riesgo | `negociando && proximoContacto vencido > 15 días` | Siempre |
| Dependencia crítica | Patrocinador cuyo `importe / totalIngresos > 20%` | Siempre si `estado !== cobrado` |

---

## 7. Nuevas funciones

### 7.1 Ranking de dependencia económica

```js
/**
 * Calcula el % del total de ingresos del evento que depende de cada patrocinador.
 * Alta dependencia = riesgo si cancela.
 */
function calcularDependencia(pats, totalIngresos) {
  return pats
    .filter(p => p.estado !== "cancelado")
    .map(p => {
      const aportacion = p.importe + p.especie;
      const pct = totalIngresos > 0 ? (aportacion / totalIngresos) * 100 : 0;
      return {
        id: p.id,
        nombre: p.nombre,
        aportacion,
        pctDelTotal: Math.round(pct * 10) / 10,
        nivel: pct > 20 ? "critica" : pct > 10 ? "alta" : pct > 5 ? "media" : "baja",
        alerta: pct > 15
          ? `⚠️ ${p.nombre} representa el ${pct.toFixed(0)}% de los ingresos — riesgo si cancela`
          : null,
      };
    })
    .sort((a, b) => b.aportacion - a.aportacion);
}

// Uso: mostrar tabla en TabDashboard con semáforo de dependencia
// Patrocinadores con nivel "critica" aparecen con fondo rojo suave
```

### 7.2 Historial automático de cambios de estado

```js
/**
 * Wrapper de updateEstado que registra cada cambio en pat.historial[]
 */
const updateEstadoConHistorial = (id, nuevoEstado) => {
  setPats(prev => prev.map(p => {
    if (p.id !== id) return p;

    const entrada = {
      id:      String(Date.now()),
      fecha:   new Date().toISOString(),
      tipo:    "estado",
      texto:   `Estado: ${p.estado} → ${nuevoEstado}`,
      antes:   p.estado,
      despues: nuevoEstado,
    };

    // Registrar también el importe si pasa a cobrado
    if (nuevoEstado === "cobrado" && p.importeCobrado > 0) {
      entrada.texto += ` · Cobrado: ${p.importeCobrado}€`;
    }

    const historial = [...(p.historial || []), entrada].slice(-50); // max 50
    return { ...p, estado: nuevoEstado, historial };
  }));

  if (nuevoEstado === "cobrado") toast.success("Patrocinador marcado como cobrado ✓");
};

// Nueva sub-tab "Historial" en ModalDetalle:
// <HistorialTimeline entries={pat.historial || []} />
```

### 7.3 Timeline de entregables por fecha

Nueva pestaña `timeline` que muestra todas las contraprestaciones de todos los patrocinadores agrupadas por mes, integradas con los hitos del evento de Proyecto.

**Requiere:** añadir `fechaEntrega?: string` al modelo de Contraprestacion.

### 7.4 Importación de prospectos desde CSV

Botón "📥 Importar CSV" en el header que acepta un archivo con columnas `nombre, contacto, email, telefono, importe` y crea patrocinadores en estado `prospecto`, con deduplicación por email.

---

## 8. Plan de refactor — Lista priorizada

### Prioridad 1 — Bugs y correcciones (esta semana)

| # | Tarea | Esfuerzo |
|---|-------|----------|
| 1 | Extraer `getImporteCobrado(pat)` a `budgetUtils.js` y usarlo en ambos archivos | S |
| 2 | Validación coherencia `estado=cobrado ↔ importeCobrado > 0` con alerta visual | S |
| 3 | Lock visual en líneas sincronizadas de Presupuesto (read-only con 🔒) | S |
| 4 | Recalcular `especie` automáticamente desde `especieItems` | S |
| 5 | Inicializar `form.contraprestaciones` desde el estado global (no snapshot) en ModalPat | S |

### Prioridad 2 — Mejoras de modelo (próximas 2 semanas)

| # | Tarea | Esfuerzo |
|---|-------|----------|
| 6 | Separar `nivel` de `tipoAportacion` en el modelo | M |
| 7 | Añadir `fechaEntrega` a `Contraprestacion` | S |
| 8 | Añadir `historial: EntradaHistorial[]` al modelo + `updateEstadoConHistorial()` | M |
| 9 | Añadir `proximaAccion: { tipo, fecha }` al modelo + UI en ModalPat y TabPipeline | M |

### Prioridad 3 — Nuevas funcionalidades

| # | Tarea | Esfuerzo |
|---|-------|----------|
| 10 | `calcularDependencia()` + tarjeta en TabDashboard de Patrocinadores | M |
| 11 | Sub-tab "Historial" en ModalDetalle con timeline visual | M |
| 12 | Timeline global de entregables por fecha (nueva pestaña) | L |
| 13 | Importación de prospectos desde CSV | M |
| 14 | Plantillas de contraprestaciones por nivel | S |

### Prioridad 4 — UX y mobile

| # | Tarea | Esfuerzo |
|---|-------|----------|
| 15 | ModalPat con secciones colapsables (Identidad / Acuerdo / Entregables) | M |
| 16 | TabPipeline con drag & drop para cambio de estado entre columnas | L |
| 17 | Métricas adicionales en Dashboard principal (cobrado/captado, dependencia) | M |
| 18 | Buscador con filtros de texto `sector:` y `nivel:` | M |

### Leyenda
- **S** = Small (0.5–1 día) · **M** = Medium (1–3 días) · **L** = Large (3–5 días)

---

*Informe generado sobre el commit `7b78313` de `trailelguerrero/app-carrera`.*
*Revisión recomendada: antes de la apertura de inscripciones (junio 2026).*
