# Revisión del bloque Proyecto

**Fecha:** Mayo 2026 · `app-carrera` · Trail El Guerrero 2026
**Archivo analizado:** `src/components/blocks/Proyecto.jsx` (2.443 líneas)

---

## 1. Resumen del bloque

El bloque Proyecto resuelve la **gestión del plan de trabajo completo del evento**: las 50 tareas pre-configuradas que van desde los permisos legales hasta el informe post-evento, más los hitos clave (fechas inamovibles), el equipo organizador y el cronograma visual (Gantt). Es el "tablero de operaciones" del organizador: permite saber qué está vencido, qué está bloqueado y qué hay que hacer esta semana.

### Entidades gestionadas

| Entidad | Descripción | Persistencia |
|---------|-------------|-------------|
| **Tarea** | Unidad de trabajo con estado, prioridad, área, responsable, fecha límite y dependencias | `teg_proyecto_v1_tareas` |
| **Hito** | Fecha inamovible del evento (apertura inscripciones, día de carrera...) | `teg_proyecto_v1_hitos` |
| **Equipo** | Personas del equipo organizador con rol y área | `teg_proyecto_v1_equipo` |
| **Gestiones legales** | Leídas del bloque Documentos (`teg_documentos_v1_gestiones`) en modo solo lectura | Externo |

### Estados de tarea

`"pendiente"` · `"en curso"` · `"completado"` · `"bloqueado"`

### Integración en el flujo global

- El badge de la nav muestra el número de tareas vencidas (no completadas con `fechaLimite` pasada).
- El Dashboard consume `teg_proyecto_v1_tareas` para mostrar tareas vencidas, hitos próximos y progreso global.
- El bloque se integra con Documentos (gestiones legales en `TabDash`) y Logística/Voluntarios mediante referencias textuales en las notas.

---

## 2. Modelo de datos y estados

### 2.1 Tarea

```typescript
interface Tarea {
  id:            number;
  area:          string;      // ID de AREAS: "permisos", "economico", "voluntarios"...
  titulo:        string;
  responsableId: number | null;  // ID del equipo
  fechaLimite:   string;      // ISO date "YYYY-MM-DD"
  estado:        "pendiente" | "en curso" | "completado" | "bloqueado";
  prioridad:     "alta" | "media" | "baja";
  notas?:        string;
  dependeDe:     number | null;  // ID de otra tarea (precedencia simple)
  // Campos NO en el modelo pero presentes en TAREAS0:
  // Ninguno — el modelo es minimalista
}
```

### 2.2 Hito

```typescript
interface Hito {
  id:         number;
  nombre:     string;
  fecha:      string;         // ISO date
  critico:    boolean;        // Si afecta al badge de la nav
  completado: boolean;
}
```

### 2.3 Miembro del equipo

```typescript
interface Persona {
  id:       number;
  nombre:   string;
  rol:      string;
  area:     string;           // Área principal de responsabilidad
  color:    string;           // Color de identificación visual
  email:    string;
  telefono: string;
}
```

### 2.4 Persistencia y carga

- **Carga inicial única:** `useData(LS + "_tareas", initialTareas)` — si `teg_proyecto_initialized` no existe en localStorage, carga las 50 tareas por defecto.
- **Guard de inicialización:** La función `initialTareas()` comprueba `localStorage.getItem("teg_proyecto_initialized")` para evitar sobreescribir datos reales con los defaults. Este es el único bloque de la app que usa este patrón.
- **Auto-guardado:** Depende del mecanismo de `useData`, que usa `dataService.set` con debounce.

### 2.5 Relación con fechas y el día D

- `TODAY` es una constante declarada **al nivel de módulo** (línea 15): `const TODAY = new Date()`. Esto significa que `TODAY` nunca cambia mientras la app esté montada — si el usuario deja el panel abierto de un día para otro, `TODAY` quedará obsoleto hasta el siguiente reload.
- `diasHasta(fecha)` calcula días entre `fecha` y `TODAY`. Si `TODAY` es ayer, todas las comparaciones de "vencido" quedan desfasadas.
- Los hitos de `hitos` tienen `fecha` pero no `hora` — todos los hitos del mismo día son tratados como equivalentes independientemente del orden.

---

## 3. Inconsistencias, incongruencias y duplicidades

### 3.1 `TODAY` estático vs cálculo dinámico en Index.jsx

**Bloque Proyecto (línea 15):**
```javascript
const TODAY = new Date(); // Se evalúa UNA VEZ al importar el módulo
const diasHasta = (fecha) => Math.ceil((new Date(fecha) - TODAY) / 86400000);
```

**Index.jsx (línea 553):**
```javascript
Math.ceil((new Date(t.fechaLimite) - new Date()) / 86400000) < 0
```

`Index.jsx` usa `new Date()` en el momento del cálculo (dinámico). `Proyecto.jsx` usa `TODAY` estático. Si el usuario lleva la app abierta desde ayer, el bloque Proyecto puede mostrar 0 tareas vencidas mientras el badge de la nav muestra 3.

**Riesgo:** Inconsistencia visual entre la nav y el interior del bloque.

**Solución:** Cambiar `const TODAY = new Date()` por una función `const getToday = () => new Date()` y usar `getToday()` en cada cálculo.

---

### 3.2 Estado `"bloqueado"` no implica dependencia satisfecha

El estado `"bloqueado"` es manual — el usuario lo asigna sin que el sistema verifique si la tarea que bloquea (campo `dependeDe`) está completada. Una tarea puede estar en estado `"en curso"` aunque su dependencia (`dependeDe`) no esté completada. No hay advertencia de que la tarea depende de otra sin completar.

**Impacto:** Un organizador puede completar tareas en orden incorrecto sin darse cuenta.

**Solución:** En `updEstado`, si se intenta cambiar a `"en curso"` o `"completado"` y `dependeDe` apunta a una tarea no completada, mostrar un aviso (no bloqueante).

---

### 3.3 `dependeDe` solo soporta una dependencia

El campo `dependeDe: number | null` solo permite una tarea predecesora. En la realidad, el briefing de voluntarios (id=32) depende del cierre de plazas (id=30) y del envío de instrucciones (id=31), pero solo puede referenciar uno.

**Impacto:** El Gantt no puede mostrar correctamente la cadena de dependencias múltiples.

---

### 3.4 `cometario` del Gantt hardcoded vs datos reales

El Gantt (`TabGantt`) calcula la posición visual de cada tarea usando fechas reales, pero los colores de "en riesgo" o "vencido" se calculan con `diasHasta` (que usa `TODAY` estático). La misma inconsistencia del punto 3.1.

---

### 3.5 Badge en nav incluye tareas `"bloqueado"` como "vencidas"

**Index.jsx:**
```javascript
tareas.filter(t =>
  t.estado !== "completado" && t.fechaLimite &&
  Math.ceil(...) < 0
)
```

Esto incluye tareas en estado `"bloqueado"` como vencidas. Una tarea bloqueada intencionadamente (esperando otro proceso externo) que tiene fechaLimite pasada aparecerá en el badge. El bloque interno hace lo mismo, así que son coherentes, pero el comportamiento puede no ser el deseado.

**Alternativa:** `t.estado !== "completado" && t.estado !== "bloqueado"` — no alertar por tareas que el organizador sabe que están bloqueadas.

---

### 3.6 `TAREAS0` y `teg_proyecto_initialized` — patrón de inicialización frágil

Si el usuario limpia el localStorage del navegador o accede desde otro dispositivo, `teg_proyecto_initialized` no existe y las 50 tareas por defecto sobrescriben los datos reales de la BD. El patrón de guardado de `useData` guarda en BD, pero la condición de inicialización solo verifica localStorage.

**Riesgo:** En un dispositivo nuevo o tras un cache-bust, el organizador podría perder todas sus tareas personalizadas.

---

### 3.7 `EQUIPO0` con datos ficticios en producción

Los datos por defecto del equipo incluyen `"Iván García"`, `"María López"`, etc. con teléfonos `611 100 001`. En producción, si el organizador nunca edita el equipo, estos nombres aparecerán como responsables de las 50 tareas. No hay guard similar al de tareas para el equipo.

---

## 4. Flujos de trabajo y UX

### 4.1 Crear tarea

1. Click en `+` (nuevo) o `QuickCreateTarea` → abre modal compacto
2. Rellena título, área, estado, prioridad, responsable, fecha límite, notas, dependencia
3. Guardar → aparece en el tablón y en el Gantt

**Problemas:**
- No hay duplicar tarea — para crear dos tareas similares (ej: dos reuniones de coordinación) hay que rellenar todo desde cero.
- La fecha límite no sugiere ningún valor por defecto contextual basado en el área o la proximidad al evento.
- `QuickCreateTarea` crea la tarea con estado `"pendiente"` y prioridad `"media"` por defecto, sin posibilidad de cambiarlos en el modal rápido.

### 4.2 Editar/actualizar tarea

1. Click en una tarea → abre `ModalTarea` (edición completa) o `FichaTarea` (detalle con historial)
2. Cambio de estado también disponible inline desde el tablón (select en cada fila)

**Problemas:**
- `ModalTarea` y `FichaTarea` son dos flujos separados para editar la misma entidad. El organizador puede no saber cuál usar.
- No hay campo de "progreso" numérico (0-100%) para tareas complejas — solo los 4 estados binarios.

### 4.3 Cambiar estado

- Disponible inline en `TabTablon` (select por fila) y en `ModalTarea`
- `updEstado(id, estado)` actualiza directamente sin confirmación

**Problemas:**
- No hay confirmación al marcar como `"completado"` — un click accidental no se puede deshacer fácilmente.
- No hay historial de cambios de estado por tarea.

### 4.4 Ver qué está vencido o pendiente

- `TabDash` muestra KPIs: completadas, en curso, vencidas, bloqueadas
- `TabTablon` tiene filtros por área, responsable, estado y prioridad
- Gantt muestra el cronograma visual con colores por estado

**Problemas:**
- No hay vista "¿Qué hago hoy?" — las tareas vencidas y críticas (≤14 días) no tienen una vista consolidada y accionable.
- El filtro por múltiples criterios simultáneos funciona con AND, no OR. No se puede ver "todas las tareas de María O todas las vencidas".
- El Gantt en móvil es ilegible — las barras son muy pequeñas y los labels se superponen.

---

## 5. Mejoras operativas

### 5.1 Vista "¿Qué hago hoy?"

La vista más valiosa para el día a día es una lista priorizada de acciones con tres grupos:
1. **🔴 URGENTE** — vencidas y no completadas
2. **🟡 ESTA SEMANA** — fechaLimite en los próximos 7 días
3. **🟢 PRÓXIMAS** — fechaLimite en los próximos 30 días

Esta vista no existe actualmente. Es la vista por defecto que debería mostrar el tab Dashboard.

### 5.2 Vistas por fase temporal

| Fase | Criterio | Tareas incluidas |
|------|----------|-----------------|
| **Pre-evento** | > 30 días antes | Permisos, presupuesto, comunicación, patrocinadores |
| **Preparación** | 30-7 días antes | Voluntarios, logística, ruta, imprenta |
| **Semana de la carrera** | 7-1 días antes | Montaje, briefings, verificaciones |
| **Día de carrera** | 0 días | Área `diaD` |
| **Post-evento** | -1 a -30 días | Memoria, cierre económico, resultados |

### 5.3 Cambios rápidos de mejora inmediata

1. **Filtro "Solo mis tareas"** — filtro rápido por `responsableId` del usuario actual
2. **Ordenación por urgencia** — fecha límite ASC como ordenación por defecto en el tablón
3. **Badge por área** en `TabTablon` — indicador rojo si el área tiene tareas vencidas
4. **Highlight de hoy** en el Gantt — línea vertical roja en la posición de hoy
5. **Botón "Completar" directo** — sin abrir modal, click rápido en tarjeta para marcar completada

---

## 6. Interconexiones con otros bloques

### 6.1 Estado actual

```
Proyecto → Dashboard: stats.vencidas, stats.hitosProx (lectura)
Proyecto ← Documentos: gestiones legales en TabDash (lectura de teg_documentos_v1_gestiones)
Proyecto ← Voluntarios: rawVols via useData (no usado actualmente)
Proyecto ← Logística: rawContLog via useData (no usado actualmente)
```

### 6.2 Documentos → Proyecto

**Caso de uso:** La tarea "Tramitar licencia federativa" (id=3) debería actualizarse automáticamente a `"completado"` cuando el documento correspondiente en el bloque Documentos cambia a estado `"aprobado"`.

**Datos necesarios:** `teg_documentos_v1_gestiones[x].estado === "aprobado"` → actualizar `tareas[id=3].estado = "completado"`.

**Cambios mínimos:** Añadir campo `documentoId?: string` a la tarea. En `TabDash`, cuando se carga la gestión correspondiente, mostrar su estado en la tarjeta de la tarea.

---

### 6.3 Logística → Proyecto

**Caso de uso:** La tarea "Inventario y revisión material" (id=38) debería vincularse con el inventario del bloque Logística. Cuando el checklist de logística está al 100%, la tarea se puede marcar completada.

**Datos necesarios:** `teg_logistica_v1_ck` (checklist pre-operativo) → completionPct.

**Cambios mínimos:** Mostrar en la ficha de la tarea el % de completitud del checklist relacionado.

---

### 6.4 Voluntarios → Proyecto

**Caso de uso:** La tarea "Cierre de plazas de voluntarios" (id=30) debería vincularse con el contador de voluntarios confirmados del bloque Voluntarios. Cuando se alcanza el objetivo (45), la tarea puede marcarse completada automáticamente.

**Datos necesarios:** `count(voluntarios.filter(v => v.estado === "confirmado"))`.

**Cambios mínimos:** Añadir campo `umbralVoluntarios?: number` a la tarea. Si `umbralVoluntarios` existe y se supera el count, marcar automáticamente como completada.

---

## 7. Nuevas funciones y cambios de código

### 7.1 Vista "¿Qué hago hoy?" — acción diaria priorizada

**Descripción:** Vista nueva en el Dashboard del bloque que agrupa las tareas más urgentes del usuario en tres grupos claros. Es la primera cosa que ve el organizador al abrir el panel.

**Cambios en datos:** Ninguno. Solo lectura.

**Implementación:**

```jsx
function VistaHoyAcciones({ tareas, equipo, onIrTarea, hoy = new Date() }) {
  const urgentes = useMemo(() => {
    const calcDias = (f) => Math.ceil((new Date(f) - hoy) / 86400000);
    return {
      rojas:     tareas.filter(t => t.estado !== "completado" && t.fechaLimite && calcDias(t.fechaLimite) < 0)
                       .sort((a,b) => calcDias(a.fechaLimite) - calcDias(b.fechaLimite)),
      amarillas: tareas.filter(t => t.estado !== "completado" && t.fechaLimite && calcDias(t.fechaLimite) >= 0 && calcDias(t.fechaLimite) <= 7)
                       .sort((a,b) => calcDias(a.fechaLimite) - calcDias(b.fechaLimite)),
      azules:    tareas.filter(t => t.estado !== "completado" && t.fechaLimite && calcDias(t.fechaLimite) > 7 && calcDias(t.fechaLimite) <= 30)
                       .sort((a,b) => calcDias(a.fechaLimite) - calcDias(b.fechaLimite)).slice(0,5),
    };
  }, [tareas, hoy]);

  const grupos = [
    { key:"rojas",     titulo:"🔴 Vencidas",         color:"var(--red)",   lista:urgentes.rojas },
    { key:"amarillas", titulo:"🟡 Esta semana",       color:"var(--amber)", lista:urgentes.amarillas },
    { key:"azules",    titulo:"🔵 Próximos 30 días",  color:"var(--cyan)",  lista:urgentes.azules },
  ];

  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom:".5rem" }}>📋 ¿Qué hago hoy?</div>
      {grupos.map(g => g.lista.length > 0 && (
        <div key={g.key} style={{ marginBottom:".75rem" }}>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:g.color,
            fontWeight:700, textTransform:"uppercase", marginBottom:".3rem" }}>
            {g.titulo} ({g.lista.length})
          </div>
          {g.lista.map(t => {
            const resp = equipo.find(p => p.id === t.responsableId);
            const dias = Math.ceil((new Date(t.fechaLimite) - hoy) / 86400000);
            return (
              <div key={t.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:".4rem .6rem", borderRadius:7, background:"var(--surface2)",
                borderLeft:`3px solid ${g.color}`, marginBottom:".25rem", cursor:"pointer" }}
                onClick={() => onIrTarea(t)}>
                <div>
                  <div style={{ fontWeight:600, fontSize:"var(--fs-sm)" }}>{t.titulo}</div>
                  {resp && <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)" }}>{resp.nombre}</div>}
                </div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:g.color, fontWeight:700, flexShrink:0 }}>
                  {dias === 0 ? "Hoy" : dias < 0 ? `${Math.abs(dias)}d pasados` : `${dias}d`}
                </div>
              </div>
            );
          })}
        </div>
      ))}
      {urgentes.rojas.length === 0 && urgentes.amarillas.length === 0 && (
        <div style={{ color:"var(--green)", fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)" }}>
          ✅ Sin tareas urgentes — todo en orden esta semana
        </div>
      )}
    </div>
  );
}
```

---

### 7.2 Historial de estado por tarea

**Descripción:** Cada cambio de estado queda registrado en la tarea con timestamp y responsable. La `FichaTarea` muestra el timeline de cambios.

**Cambios en datos:**

```typescript
interface EntradaHistorial {
  id:       string;
  fecha:    string;    // ISO datetime
  campo:    "estado" | "prioridad" | "notas" | "responsable";
  antes:    string;
  despues:  string;
}

// Añadir a Tarea:
historial?: EntradaHistorial[];
```

**Implementación en `updEstado`:**

```javascript
const updEstado = useCallback((id, nuevoEstado) => {
  setTareas(prev => prev.map(t => {
    if (t.id !== id) return t;
    const entrada = {
      id:      String(Date.now()),
      fecha:   new Date().toISOString(),
      campo:   "estado",
      antes:   t.estado,
      despues: nuevoEstado,
    };
    const historial = [...(t.historial || []), entrada].slice(-20); // max 20 entradas
    return { ...t, estado: nuevoEstado, historial };
  }));
}, []);
```

---

### 7.3 Plantillas de tareas por fase de evento

Permitir al organizador importar un set de tareas predefinido para una fase (pre-inscripciones, pre-carrera, post-carrera) sin tener que crearlas todas manualmente.

**Datos necesarios:** `PLANTILLAS_FASE` — objeto con arrays de tareas parciales (sin id, sin estado) por fase.

---

### 7.4 Detección automática de tareas desbloqueadas

Cuando una tarea con `dependeDe` pasa a `"completado"`, detectar todas las tareas que dependen de ella y mostrar una notificación: "✅ Tarea completada — ahora puedes iniciar: X, Y". Con botón de acción para cambiar el estado de las tareas desbloquadas a "en curso".

---

## 8. Plan de refactor

### Corto plazo — sin cambios de modelo

1. **Fix `TODAY` estático** — `const getToday = () => new Date()` para coherencia con el badge de la nav. 5 líneas.
2. **Vista "¿Qué hago hoy?"** — componente puro con datos existentes. Sin cambios de modelo.
3. **Ordenación por urgencia** como default en TabTablon.
4. **Aviso de dependencia no completada** al cambiar a "en curso" o "completado".
5. **Badge vencido por área** en los filtros del tablón.
6. **Excluir `"bloqueado"` del badge** de la nav (coherente con el criterio de urgencia).
7. **Línea vertical "hoy"** en el Gantt.

### Medio plazo — cambios de modelo

8. **`dependeDe` → `array`** para soportar múltiples dependencias.
9. **Historial de estado** — campo `historial[]` en la tarea con `updEstado` actualizado.
10. **Vinculación con otros bloques** — campo `documentoId?`, `umbralVoluntarios?` en la tarea.
11. **Fix de inicialización** — verificar contra BD (no solo localStorage) si los datos de tareas ya existen antes de cargar `TAREAS0`.
12. **Plantillas de fase** — `PLANTILLAS_FASE` con sets de tareas predefinidas importables.
13. **Progreso numérico** (0-100%) en tareas complejas como campo adicional opcional.

### Riesgos si no se actúan

- **`TODAY` estático:** El organizador puede ver el bloque sin alertas mientras el badge de la nav muestra tareas vencidas. Erosiona la confianza en la herramienta.
- **Sin historial:** No se sabe quién marcó qué como completado ni cuándo. En un equipo de 5 personas, la trazabilidad es crítica.
- **Inicialización frágil:** En cualquier dispositivo nuevo o tras un cache-bust, los 50 TAREAS0 sobrescriben los datos reales si la clave localStorage no existe. En T-30 días del evento esto sería catastrófico.
- **Sin vista "¿Qué hago hoy?":** El organizador tiene que explorar 4 pestañas para entender qué es urgente. En la semana de la carrera, esto es tiempo que no tiene.

---

*Informe generado sobre el commit `c0e9f17` de `trailelguerrero/app-carrera`.*
*Revisión recomendada: antes del inicio del período de alta intensidad operativa (julio 2026).*
