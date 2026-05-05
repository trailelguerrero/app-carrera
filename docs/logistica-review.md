# Revisión del bloque Logística

**Fecha:** Mayo 2026 · `app-carrera` · Trail El Guerrero 2026
**Archivo analizado:** `src/components/blocks/Logistica.jsx` (2.825 líneas)

---

## 1. Resumen del bloque

El bloque Logística es el **centro de operaciones físicas del evento**: gestiona todo lo que no es dinero ni personas, desde el inventario de material hasta las rutas de reparto el día de carrera, pasando por el directorio de contactos de emergencia y las incidencias operativas. Es el segundo bloque más grande de la aplicación (2.825 líneas) y el más usado el día de la carrera.

### Entidades gestionadas

| Entidad | Clave BD | Descripción |
|---------|---------|-------------|
| **Material** | `teg_logistica_v1_mat` | Inventario de material (carpas, mesas, walkies, avituallamiento...) |
| **Asignaciones** | `teg_logistica_v1_asig` | Qué material va a cada puesto/localización |
| **Vehículos** | `teg_logistica_v1_veh` | Furgonetas y vehículos operativos del evento |
| **Rutas** | `teg_logistica_v1_rut` | Rutas de distribución y recogida por vehículo |
| **Runbook (tl)** | `teg_logistica_v1_tl` | Timeline de operaciones hora a hora (cronograma del día D) |
| **Contactos** | `teg_logistica_v1_cont` | Directorio de contactos operativos y de emergencia |
| **Incidencias** | `teg_logistica_v1_inc` | Registro de incidencias el día de carrera |
| **Checklist** | `teg_logistica_v1_ck` | Tareas pre-operativas con fases y responsables |
| **Localizaciones** | `teg_logistica_v1_loc` | Puestos/localizaciones del evento con coordenadas |
| **Pedidos a proveedor** | `teg_logistica_v1_pedidos_prov` | Pedidos de compra/alquiler a proveedores |

El bloque también lee en modo solo lectura desde `teg_patrocinadores_v1_pats` (para mostrar material aportado en especie) y `teg_voluntarios_v1_voluntarios` (para identificar voluntarios con coche disponible).

---

## 2. Modelo de datos y gestión de incidencias

### 2.1 Modelo de Incidencia

```typescript
interface Incidencia {
  id:           number;
  hora:         string;        // "HH:MM" — hora del día, NO timestamp completo
  tipo:         "médica" | "señalización" | "avituallamiento" | "corredor perdido" | "meteorológica" | "otra";
  gravedad:     "baja" | "media" | "alta";
  descripcion:  string;
  responsable:  string;        // Nombre libre, no vinculado a ningún ID de equipo
  estado:       "abierta" | "resuelta";
  resolucion?:  string;        // Texto libre, solo cuando estado=resuelta
  // Campos AUSENTES pero necesarios:
  // fecha?: string          — no hay fecha, solo hora (problema cross-día)
  // puestoId?: number       — no hay vinculación con la localización
  // creadaEn?: string       — no hay timestamp de creación automático
  // resueltaEn?: string     — no hay timestamp de resolución
}
```

### 2.2 Problemas del modelo

**No hay timestamp de fecha:** El campo `hora` es solo `"HH:MM"`. Si el evento dura más de 24 horas (o si se registra una incidencia el día previo al montaje), no hay forma de distinguir qué día ocurrió.

**No hay `puestoId`:** La incidencia no está vinculada a ninguna localización. Un accidente en el Avituallamiento KM 9 solo puede registrarse en texto libre en la descripción. No hay forma de filtrar incidencias por puesto.

**No hay timestamps automáticos:** `creadaEn` y `resueltaEn` no existen. Al marcar una incidencia como "resuelta", no queda registrado cuándo se resolvió. Esto impide calcular el tiempo de respuesta (SLA).

**No hay prioridad diferente a gravedad:** `gravedad` es "baja/media/alta" para el impacto, pero no hay distinción de urgencia de respuesta (puede ser alta gravedad pero no urgente si ya está siendo atendida).

### 2.3 Persistencia

- **Clave:** `teg_logistica_v1_inc`
- **Inicialización:** `INC0 = []` — sin datos por defecto. Es la única entidad del bloque que arranca vacía.
- **Carga:** vía `useData(LS+"_inc", INC0)` con auto-guardado debounced.

### 2.4 Badge en `Index.jsx`

```javascript
// Index.jsx línea 611
const incidencias = get("teg_logistica_v1_inc", []);
const incAbiertas = incidencias.filter(i => i.estado === "abierta").length;
if (incAbiertas > 0) badges["logistica"] = incAbiertas;
```

El badge es coherente con el filtro interno del bloque — ambos usan `estado === "abierta"`. No hay inconsistencia.

### 2.5 Relación con puestos y voluntarios

Las asignaciones (`asig`) vinculan material con puestos mediante `puesto: string` (nombre literal) Y `localizacionId: number | null` (vínculo con las localizaciones del bloque). Esta dualidad es un bug potencial: si el nombre del puesto cambia, la asignación queda desincronizada. Si `localizacionId` está presente, debería ser la fuente de verdad única.

---

## 3. Inconsistencias y problemas

### INC-01: `setInc2` — prop sin uso real

En `TabEmergencias` se pasa `setInc2={setInc}`:

```jsx
{tab==="emergencias" && <TabEmergencias cont={cont} inc={inc} setInc={setInc}
  abrirModal={abrirModal} abrirFicha={abrirFicha}
  setInc2={setInc}  // ← duplicación exacta de setInc
  tiposContacto={tiposContacto} />}
```

`setInc2` es un alias exacto de `setInc`. No se usa de forma diferente en ningún lugar. Es código muerto que genera confusión.

---

### INC-02: Dos rutas para crear incidencias — `TabEmergencias` y `TabCont`

El botón `+ Incidencia` existe en dos tabs distintos (`TabEmergencias` y `TabCont`) pero ambos crean la misma entidad en el mismo array. No hay diferencia en el formulario ni en los datos creados. El organizador puede no saber cuál usar y puede crear duplicados.

---

### INC-03: `asig.puesto` (string) vs `asig.localizacionId` (number) — doble referencia

```javascript
// ModalRouter — línea 2490
onSave={v=>{\
  const locObj = locs && locs.find(l => l.nombre === v.puesto);
  sv(setAsigs,asigs,{...v,...,localizacionId:locObj?.id||null},"asig");
}}
```

Al crear una asignación se guardan tanto `puesto: "Avituallamiento KM 4"` (string) como `localizacionId: 3` (number). Si la localización se renombra en el bloque, `localizacionId` sigue siendo correcto pero `puesto` queda desactualizado. La UI usa `localizacionId` para cálculos pero puede mostrar el string desactualizado.

---

### INC-04: `ESTADO_TAREA` y `ESTADO_ENTREGA` solapan semánticamente

```javascript
const ESTADO_ENTREGA = ["pendiente","en tránsito","entregado","recogido"];
const ESTADO_TAREA   = ["pendiente","en curso","completado","bloqueado"];
```

Ambos tienen `"pendiente"`. El Runbook usa `ESTADO_TAREA`, las asignaciones usan `ESTADO_ENTREGA`. En el componente `ESTADO_COLORES` ambos se mezclan en un único objeto, lo que puede causar colores incorrectos si una tarea usa accidentalmente un estado de entrega.

---

### INC-05: Checklist (`ck`) usa `prioridad` como string libre

```javascript
// CK0 línea 115
{ id:1, fase:"Semana antes", tarea:"...", responsable:"Organización", estado:"pendiente", prioridad:"alta", notas:"" }
```

El campo `prioridad` en el checklist no tiene un enum definido (no hay `PRIORIDADES_CK`). El modal de edición tampoco lo define como select. Puede tener cualquier valor, y los filtros de "prioridad alta" solo funcionan si el string es exactamente `"alta"`.

---

### INC-06: `hora` en incidencias solo es `HH:MM` — no hay fecha

Si el organizador registra una incidencia en el briefing del día previo (28/08) y otra durante la carrera (29/08), ambas aparecen en la misma lista sin posibilidad de distinguirlas por fecha. Al ordenar por hora, una incidencia de las 23:00 del día previo aparecerá después de las de las 22:00 del día de carrera.

---

### INC-07: `PUESTOS_REF` hardcoded como fallback cuando no hay localizaciones

```javascript
const locNames = locs && locs.length > 0 ? locs.map(l => l.nombre) : PUESTOS_REF;
```

Si el organizador no ha configurado localizaciones, el selector de puestos en el formulario de asignaciones muestra 12 puestos hardcoded de Trail El Guerrero. Para otro evento, estos datos serían incorrectos. Debería mostrar un mensaje "Configura localizaciones primero" en lugar de datos ficticios.

---

## 4. Flujos de trabajo

### 4.1 Crear incidencia

1. Ir a tab "Emergencias" o "Contactos" → subtab "Incidencias"
2. Click en `+ Incidencia` → modal con 7 campos: hora, tipo, gravedad, descripción, responsable, estado, resolución
3. Guardar → aparece en la lista de incidencias de ambos tabs

**Problemas:**
- El campo `hora` no tiene sugerencia de la hora actual de forma visual destacada (se inicializa con `new Date().toTimeString().slice(0,5)` pero no hay indicador de que ya está rellenado).
- No hay campo de `puesto/localización` en el formulario — el organizador tiene que escribir el puesto en la descripción de texto libre.
- La `resolucion` aparece en el formulario de creación, antes de que la incidencia esté resuelta. Confunde al operador.

### 4.2 Actualizar estado

- **Inline:** Botón "Marcar resuelta" en la tarjeta — toggle entre `"abierta"` y `"resuelta"`. Un solo click.
- **Modal de edición:** Abriendo la ficha y editando el campo `estado` + añadiendo el texto de resolución.

**Problemas:**
- El botón inline solo alterna el estado, pero no pide el texto de resolución. Si el organizador marca "resuelta" con un click, no queda registro de cómo se resolvió.
- No hay timestamp de resolución — no se sabe cuánto tardó en resolverse.

### 4.3 Resolver/cerrar incidencia

Solo hay dos estados: `"abierta"` y `"resuelta"`. No hay estado intermedio como `"en proceso"` o `"escalada"`.

**Problema:** Una incidencia grave que está siendo atendida pero no resuelta aparece igual que una que nadie ha visto todavía.

### 4.4 Problemas globales de UX

- **Runbook (tl) y Checklist (ck) son difíciles de distinguir.** Ambos listan tareas con estado, responsable y fases temporales. La diferencia conceptual (runbook = qué pasa hora a hora el día D; checklist = tareas pre-evento) no es evidente para un organizador nuevo.
- **Sin filtro por gravedad en la lista de incidencias** — con 10+ incidencias, no hay forma de ver solo las críticas.
- **La vista de incidencias no tiene ordenación** — se muestran en orden de creación, no por gravedad o estado.

---

## 5. Mejoras operativas

### 5.1 Vista día de carrera — modo operaciones

Una vista simplificada para el día D con solo las entidades activas:
- Incidencias abiertas ordenadas por gravedad (altas primero)
- Runbook con la siguiente tarea pendiente resaltada
- Checklist de "Mañana carrera" con progreso en tiempo real
- Mapa de puestos con estado (verde/rojo) si hay incidencias abiertas asociadas

### 5.2 Captura rápida de incidencia en móvil

Botón flotante `⚠ Incidencia rápida` siempre visible en el tab Emergencias. Al pulsar, formulario mínimo de 3 campos: tipo (selector con iconos grandes), descripción (textara), puesto (selector). La hora se rellena automáticamente. El resto de campos son opcionales.

```jsx
function BotonIncidenciaRapida({ onSave }) {
  return (
    <button style={{
      position:"fixed", bottom:"5rem", right:"1rem",
      background:"var(--red)", color:"white",
      borderRadius:"50%", width:56, height:56,
      fontSize:"1.5rem", border:"none", boxShadow:"0 4px 20px rgba(248,113,113,.5)",
      zIndex:1000,
    }} onClick={onSave}>⚠️</button>
  );
}
```

### 5.3 Cola de trabajo para el coordinador

Ordenar el runbook por hora e identificar la "siguiente acción pendiente" de cada responsable. Mostrar en el dashboard de Logística una sección "Próximas 3 acciones" con el nombre del responsable y la hora.

### 5.4 Vista por tramo/puesto

Filtro rápido en la vista de incidencias y asignaciones por localización. Permite al coordinador de un tramo ver solo lo relevante para su zona.

---

## 6. Interconexión con otros bloques

### 6.1 Estado actual

```
Logística ← Patrocinadores: material en especie (patsConEspecie)
Logística ← Voluntarios: voluntarios con coche (voluntariosConCoche)
Logística ← Presupuesto: conceptos de presupuesto para vincular material (conceptosPres)
Logística → Voluntarios: localizaciones usadas en api/voluntarios/ficha.js
Logística → Dashboard: stats de runbook y checklist
```

### 6.2 Voluntarios → Logística (incidencias de personal)

**Caso de uso:** Una incidencia del tipo "voluntario no aparece en su puesto" debería poder vincularse con el registro del voluntario en el bloque Voluntarios para marcar automáticamente `enPuesto: false` o cambiar el estado.

**Datos:** `incidencia.voluntarioId?: number` → actualizar `voluntario.enPuesto` o crear una nota en la ficha del voluntario.

---

### 6.3 Proyecto → Logística (tareas generadas de incidencias)

**Caso de uso:** Una incidencia grave resuelta (ej: "baliza de control KM 7 arrancada por un corredor") debería poder convertirse en tarea en el bloque Proyecto para la próxima edición ("Revisar anclajes de balizas en cruces de montaña").

**Cambio mínimo:** Botón "Crear tarea en Proyecto" en la ficha de incidencia resuelta, que pre-rellena la tarea en `teg_proyecto_v1_tareas` con el título de la incidencia y área=`"logistica"`.

---

### 6.4 Presupuesto → Logística (coste de incidencias)

**Caso de uso:** Si una incidencia genera un gasto no previsto (ej: avería de furgoneta → taller de emergencia: 350€), el organizador debería poder registrar el coste en la incidencia y verlo reflejado en el presupuesto.

**Datos:** `incidencia.costeAsociado?: number` → nuevo ítem en `ingresosExtra` de Presupuesto con signo negativo (gasto imprevisto).

---

## 7. Nuevas funciones sugeridas

### 7.1 Timeline de incidencias con SLA

**Descripción:** Visualización cronológica de todas las incidencias del día con el tiempo transcurrido desde la apertura. Si una incidencia de gravedad alta lleva más de 15 minutos abierta, muestra una alerta visual.

**Datos necesarios:** Añadir `creadaEn: string` (ISO datetime) y `resueltaEn?: string` al modelo de incidencia.

**Implementación:**
```javascript
// Al crear la incidencia — en ModalRouter tipo="inc":
init={data || {
  hora: new Date().toTimeString().slice(0,5),
  creadaEn: new Date().toISOString(),  // timestamp automático
  tipo:"médica", gravedad:"media",
  descripcion:"", responsable:"", estado:"abierta", resolucion:""
}}

// SLA visual:
const SLA_MINUTOS = { alta: 15, media: 30, baja: 60 };

function SLABadge({ incidencia }) {
  const minutos = incidencia.creadaEn
    ? Math.floor((Date.now() - new Date(incidencia.creadaEn)) / 60000) : null;
  const limite = SLA_MINUTOS[incidencia.gravedad];
  const urgente = minutos !== null && minutos > limite && incidencia.estado === "abierta";
  if (!minutos) return null;
  return (
    <span style={{
      fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
      color: urgente ? "var(--red)" : "var(--text-muted)",
      background: urgente ? "var(--red-dim)" : "var(--surface3)",
      padding:"0.1rem 0.35rem", borderRadius:4,
    }}>
      ⏱ {minutos}min{urgente ? " ⚠️ SLA superado" : ""}
    </span>
  );
}
```

---

### 7.2 Puesto vinculado en incidencias

**Descripción:** El formulario de incidencias incluye un selector de puesto (de la lista de localizaciones del bloque). La incidencia queda vinculada a un puesto concreto. La vista de incidencias puede filtrarse por puesto.

**Datos necesarios:** Añadir `puestoId?: number` y `puestoNombre?: string` al modelo de incidencia.

**Cambio en ModalRouter:**
```javascript
if (tipo === "inc") return <MF
  title={data ? "✏️ Editar incidencia" : "⚠️ Registrar incidencia"}
  onClose={onClose}
  fields={[
    { k:"hora",      l:"Hora",         t:"time" },
    { k:"puestoId",  l:"Puesto",       t:"sel",
      o:[null,...locs.map(l=>l.id)],
      lb:["— Sin puesto específico",...locs.map(l=>l.nombre)],
      num:true, nullable:true },
    { k:"tipo",      l:"Tipo",         t:"sel", o:["médica","señalización","avituallamiento","corredor perdido","meteorológica","otra"] },
    { k:"gravedad",  l:"Gravedad",     t:"sel", o:["baja","media","alta"] },
    { k:"descripcion",l:"Descripción *",t:"text" },
    { k:"responsable",l:"Responsable", t:"text" },
    // Resolución solo al editar
    ...(data ? [{ k:"estado",   l:"Estado", t:"sel", o:["abierta","resuelta"] },
                { k:"resolucion",l:"Resolución",t:"text" }] : []),
  ]}
  init={data || {
    hora: new Date().toTimeString().slice(0,5),
    creadaEn: new Date().toISOString(),
    puestoId: null, tipo:"médica", gravedad:"media",
    descripcion:"", responsable:"", estado:"abierta",
  }}
  onSave={v => {
    const loc = locs.find(l => l.id === parseInt(v.puestoId));
    sv(setInc, inc, {
      ...v,
      puestoId: v.puestoId ? parseInt(v.puestoId) : null,
      puestoNombre: loc?.nombre || null,
    }, "inc");
  }} />;
```

---

### 7.3 Botón "Crear tarea en Proyecto" desde incidencia resuelta

Convierte una incidencia en tarea del bloque Proyecto con un click, pre-rellenando título (descripción de la incidencia), área (`"logistica"`), prioridad (basada en gravedad) y notas (con la resolución).

---

### 7.4 Filtros y ordenación en la lista de incidencias

Filtros rápidos por gravedad (chips), estado (activas/resueltas) y puesto. Ordenación por hora o por gravedad descendente. Actualmente no existe ningún filtro.

---

### 7.5 Estadísticas post-evento de incidencias

Resumen al final del día: número de incidencias por tipo y gravedad, tiempo medio de resolución (si hay `creadaEn` y `resueltaEn`), puesto con más incidencias. Exportable como parte del informe post-evento.

---

## 8. Plan de refactor

### Cambios inmediatos (sin cambios de modelo)

1. **Eliminar `setInc2`** — prop duplicada en `TabEmergencias`. 1 línea.
2. **Unificar el botón `+ Incidencia`** — mover solo a `TabEmergencias`, eliminar de `TabCont`.
3. **Ocultar campo `resolucion`** del formulario de creación — solo mostrarlo al editar con estado="resuelta".
4. **Ordenación por gravedad** en la lista de incidencias (alta primero).
5. **Filtro por gravedad** con chips en `TabEmergencias.sub === "incidencias"`.
6. **Eliminar `PUESTOS_REF` como fallback** — si no hay localizaciones, mostrar mensaje "Configura los puestos en la pestaña Localizaciones".

### Cambios estructurales (modelo + UX)

7. **Añadir `creadaEn` y `resueltaEn` a `Incidencia`** — timestamps automáticos. El botón inline "Marcar resuelta" rellena `resueltaEn`.
8. **Añadir `puestoId` a `Incidencia`** — selector en el formulario, filtro en la lista.
9. **SLA visual por incidencia** — indicador de tiempo transcurrido con alerta si supera el umbral por gravedad.
10. **Unificar `asig.puesto` y `asig.localizacionId`** — usar `localizacionId` como fuente de verdad única; `puesto` solo como label para compatibilidad.
11. **Vista modo día de carrera** — vista simplificada con incidencias, runbook y checklist en pantalla única.
12. **Botón de captura rápida** — FAB flotante `⚠️` visible en tab Emergencias para registro de 3 clicks.

---

*Informe generado sobre el commit `d723355` de `trailelguerrero/app-carrera`.*
*Revisión recomendada: durante el simulacro pre-evento (julio 2026).*
