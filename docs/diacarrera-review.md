# Revisión del bloque DíaCarrera

**Fecha:** Mayo 2026 · `app-carrera` · Trail El Guerrero 2026
**Archivo analizado:** `src/components/blocks/DiaCarrera.jsx` (595 líneas)
**Tipo de componente:** Modal fullscreen cargado via `React.lazy` desde `Index.jsx`

---

## 1. Resumen del bloque

El bloque DíaCarrera es el **centro de mando para el día de la prueba**: una vista modal a pantalla completa que se superpone al panel, diseñada para usarse en tablet o móvil durante las horas de la carrera. Su propósito es condensar en una sola interfaz todo lo que el coordinador necesita sin tener que navegar entre bloques.

### Información principal que muestra

| Elemento | Descripción |
|---------|-------------|
| **Reloj en tiempo real** | Hora actual actualizada cada segundo |
| **Progreso del Runbook** | % de entradas completadas del cronograma del día |
| **Próxima tarea pendiente** | Primera entrada del Runbook sin completar |
| **Presencia de voluntarios** | Toggle de llegada por voluntario confirmado |
| **Estado por puesto** | Cuántos voluntarios están en cada puesto vs los necesarios |
| **Incidencias abiertas** | Contador y botón de registro rápido |
| **Contactos de emergencia** | Directorio de urgencia con click-to-call |
| **Checklist pre-operativo** | Tareas de verificación por fase |

### Acciones posibles

- Marcar entrada del Runbook como completada (toggle)
- Marcar voluntario como presente (toggle de llegada)
- Registrar nueva incidencia con formulario rápido (3 campos)
- Marcar ítem del checklist como completado
- Llamar a un contacto de emergencia (link `tel:`)

---

## 2. Modelo de datos y fuentes

### 2.1 Fuentes de datos consumidas

| Clave | Origen | Uso en DíaCarrera |
|-------|--------|------------------|
| `teg_logistica_v1_tl` | Logística — Runbook | Cronograma de operaciones del día |
| `teg_logistica_v1_cont` | Logística — Contactos | Directorio de emergencias |
| `teg_logistica_v1_ck` | Logística — Checklist | Tareas pre-operativas |
| `teg_logistica_v1_inc` | Logística — Incidencias | Registro de incidencias (lectura y escritura) |
| `teg_voluntarios_v1_puestos` | Voluntarios — Puestos | Estructura de puestos del evento |
| `teg_voluntarios_v1_voluntarios` | Voluntarios | Lista de voluntarios confirmados |
| `teg_event_config_v1` | Configuración global | Nombre del evento, fecha, logo |

### 2.2 Mecanismo de actualización

- **Datos propios:** Lectura única al montar via `useData` (internamente usa `dataService.get`).
- **Sin escucha de `teg-sync`:** No hay `addEventListener("teg-sync", ...)`. Si el bloque Logística registra una incidencia mientras DíaCarrera está abierto, el contador de incidencias **no se actualiza automáticamente**.
- **Reloj:** `setInterval` de 1 segundo para `ahora: Date`.
- **Escrituras:** Cuando el coordinador marca presencia, completa una tarea o registra una incidencia, el bloque llama a `dataService.notify()` que emite `teg-sync`. Pero él mismo no escucha esos eventos.

### 2.3 Campo `presente` — campo propio de DíaCarrera

El bloque crea el campo `v.presente: boolean` cuando el coordinador marca llegada desde DíaCarrera. Sin embargo, el modelo canónico del voluntario usa `v.enPuesto: boolean` (escrito desde el VoluntarioPortal cuando el voluntario confirma su llegada). Son **dos campos paralelos con la misma semántica**.

---

## 3. Inconsistencias y problemas

### INC-01: `v.presente` vs `v.enPuesto` — dos fuentes de verdad para la presencia

**DíaCarrera:** `toggleVol` actualiza `v.presente`
```javascript
setVols(prev => prev.map(v => v.id===id ? {...v, presente:!v.presente} : v))
```

**VoluntarioPortal:** escribe `v.enPuesto = true` y `v.horaLlegada`
```javascript
// api/voluntarios/index.js
{ enPuesto: true, horaLlegada: HH:MM }
```

**Dashboard:** usa `v.enPuesto` para calcular cobertura real
```javascript
const coberturaReal = voluntarios.filter(v => v.enPuesto).length;
```

**Impacto:** Si el coordinador marca presencia en DíaCarrera (`presente=true`) pero el voluntario no se ha registrado desde su portal (`enPuesto=false`), el Dashboard mostrará una cobertura incorrecta. Y viceversa: si el voluntario marca llegada desde su portal pero el coordinador no lo ha marcado en DíaCarrera, el bloque mostrará 0 presentes.

**Solución:** Unificar en `enPuesto`. El toggle de DíaCarrera debe actualizar `enPuesto`, no crear un nuevo campo `presente`.

---

### INC-02: Incidencias creadas desde DíaCarrera no tienen `creadaEn`

```javascript
// DiaCarrera.jsx línea 113-125
const nueva = {
  id: `inc_${Date.now()}`,
  hora: new Date().toTimeString().slice(0, 5),
  tipo: incForm.tipo,
  gravedad: incForm.gravedad,
  descripcion: incForm.descripcion.trim(),
  responsable: "Día de Carrera",
  estado: "abierta",
  resolucion: "",
  // AUSENTE: creadaEn — impide calcular el SLA visual que se añadió en el sprint de Logística
};
```

El bloque Logística ahora usa `creadaEn` para el SLA visual. Las incidencias creadas desde DíaCarrera nunca tendrán SLA porque les falta ese campo.

**Solución:** Añadir `creadaEn: new Date().toISOString()` al objeto `nueva`.

---

### INC-03: Sin escucha de `teg-sync` — datos obsoletos mientras está abierto

Si un voluntario confirma su llegada desde el portal (escribe `enPuesto=true`), DíaCarrera no se entera porque no hay listener de `teg-sync`. El contador de "Presentes" sigue mostrando el valor antiguo.

**Impacto crítico:** El día de carrera, con múltiples actores modificando datos simultáneamente, el bloque puede mostrar información obsoleta durante minutos.

---

### INC-04: `presentes` usa `v.presente` pero `confirmados` usa `v.estado === "confirmado"`

```javascript
const confirmados = vols.filter(v => v.estado === "confirmado");
const presentes   = vols.filter(v => v.presente).length;
```

`confirmados` es la lista de voluntarios con estado confirmado (del bloque Voluntarios).
`presentes` es el conteo de los que el coordinador ha marcado en DíaCarrera.

Un voluntario puede estar en `confirmados` pero no en `presentes` (no ha llegado aún), lo que es correcto conceptualmente. Pero si el voluntario llegó sin que el coordinador lo marcara (`enPuesto=true` desde el portal pero `presente=false`), aparece como no presente en DíaCarrera aunque esté en su puesto.

---

### INC-05: El checklist pre-operativo mezcla datos de Logística con acciones de DíaCarrera

El checklist usa `rawCk` de Logística (`teg_logistica_v1_ck`). Las tareas del checklist tienen fases como "Semana antes", "Día antes", etc. En DíaCarrera se muestran todas las fases mezcladas, sin filtrar por "Mañana carrera" o "Durante carrera". El coordinador ve ítems de "3 meses antes" que son irrelevantes el día D.

---

### INC-06: `id: `inc_${Date.now()}`` — formato de ID diferente al del bloque Logística

```javascript
// DiaCarrera.jsx:
id: `inc_${Date.now()}`   // → "inc_1722000000000"

// Logística (via genIdNum):
id: 1234567890             // → número
```

Esto puede causar problemas si el bloque Logística filtra o procesa incidencias por id numérico.

---

## 4. UX específica de operación en tiempo real

### 4.1 Legibilidad en móvil

- El componente tiene CSS propio (`CSS` literal) separado de los tokens del sistema. Los tamaños de fuente son correctos para táctil.
- El reloj en tiempo real es claro y prominente.
- Los 5 tabs horizontales (`⏱ Runbook | 👥 Voluntarios | 📍 Puestos | 🚨 Contactos | ✅ Pre-operativo`) se pueden scrollear en móvil — correcto. Pero no hay indicador visual de que hay más tabs fuera de pantalla.

### 4.2 Número de clics para acciones frecuentes

| Acción | Clics actuales | Óptimo |
|--------|---------------|--------|
| Marcar voluntario presente | 2 (tab Voluntarios + toggle) | 2 |
| Registrar incidencia | 3+ (botón ⚠️ + rellenar form + Guardar) | 3 |
| Ver estado de un puesto | 2 (tab Puestos + scroll) | 2 |
| Completar tarea del runbook | 2 (tab Runbook + toggle) | 1 (está visible si es la próxima) |
| Llamar a emergencias | 3 (tab Contactos + scroll + tap) | 2 |

### 4.3 Problemas de UX bajo estrés

- **La pantalla de incidencias es un formulario de 3 campos en modo slide-down.** Bajo estrés, un coordinador que registra "corredor caído en KM 7" tiene que: pulsar el botón, seleccionar el tipo, la gravedad y escribir la descripción. El campo de puesto no existe (INC-02 del sprint de Logística).
- **El Runbook no resalta la tarea ACTUAL.** La "próxima tarea" se calcula comparando hora (`t.hora >= hora`), pero no hay forma visual clara de "estás aquí" en el timeline.
- **El tab Voluntarios muestra todos los confirmados**, incluyendo los que ya están marcados presentes. En el momento álgido (07:00-08:00), el coordinador necesita ver primero quién NO ha llegado.
- **Sin vista de "alertas del momento"** — no hay una sección que combine: incidencias abiertas + puestos sin cobertura + runbook retrasado en una sola pantalla de primer vistazo.
- **El formulario de incidencia no tiene campo de puesto**, aunque ese campo se añadió en el sprint de Logística. La incidencia queda sin localización.

---

## 5. Mejoras operativas

### 5.1 Vista de primer vistazo — "Mission Control"

Añadir un tab o sección inicial llamada "🎯 Ahora" que muestre en una sola pantalla:
- Hora actual + tiempo hasta el cierre de ruta (countdown)
- La tarea actual del runbook (resaltada en grande)
- Incidencias abiertas (número + botón de ver)
- Puestos con cobertura < 100% (solo los que tienen problema)
- El siguiente voluntario confirmado que aún no ha llegado

### 5.2 Tab Voluntarios — ordenación dinámica

- Por defecto: sin llegar primero, llegados después
- Búsqueda por nombre con filtro rápido
- Badge de `enPuesto` para voluntarios que se registraron desde el portal

### 5.3 Runbook con "estás aquí"

Resaltar la tarea actual en el Runbook con un borde verde pulsante. Añadir el tiempo restante/transcurrido respecto a la hora de cada tarea.

### 5.4 Checklist filtrado por fase del día

Mostrar solo las fases "Mañana carrera" y "Durante carrera" en DíaCarrera. Un chip de filtro permite ver las demás fases si el coordinador necesita verificar algo previo.

### 5.5 Modo noche / alto contraste

Para uso en condiciones de poca luz (madrugada antes de la carrera), añadir un toggle de modo de alto contraste en el header del bloque.

---

## 6. Nuevas funciones

### 6.1 Vista "Ahora" — panel de primer vistazo en tiempo real

**Descripción:** Tab inicial por defecto que muestra en una sola pantalla todos los estados críticos del momento: tarea del runbook en curso, incidencias abiertas, puestos con problemas, próximos cierres de ruta. Funciona como el HUD (heads-up display) de la carrera.

**Datos necesarios:** Solo lectura de datos ya disponibles en el bloque. Sin cambios de modelo.

**Implementación:**
```jsx
function TabAhora({ tl, tlDone, hora, incidencias, puestos, vols, onVerInc, onNuevaInc }) {
  const tareaActual = tl.find(t => !tlDone(t) && t.hora >= hora) || tl.find(t => !tlDone(t));
  const proxima     = tl.find(t => !tlDone(t) && t.hora > hora);
  const incAbiertas = incidencias.filter(i => i.estado === "abierta");
  const incAltas    = incAbiertas.filter(i => i.gravedad === "alta");

  const puestosAlerta = puestos.map(p => {
    const asig = vols.filter(v => v.puestoId === p.id && (v.enPuesto || v.presente));
    return { ...p, presentes: asig.length, pct: p.necesarios > 0 ? asig.length / p.necesarios : 1 };
  }).filter(p => p.pct < 1).sort((a,b) => a.pct - b.pct);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:".85rem", padding:"1rem" }}>
      {/* Tarea actual del runbook */}
      {tareaActual && (
        <div style={{ background:"linear-gradient(135deg,rgba(52,211,153,.12),rgba(34,211,238,.08))",
          border:"2px solid rgba(52,211,153,.3)", borderRadius:12, padding:"1rem" }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:".62rem", color:"var(--green)",
            fontWeight:700, textTransform:"uppercase", marginBottom:".35rem" }}>
            ⏱ AHORA — {tareaActual.hora}
          </div>
          <div style={{ fontWeight:800, fontSize:"var(--fs-lg)" }}>{tareaActual.titulo}</div>
          {tareaActual.responsable && (
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"var(--fs-xs)", color:"var(--text-muted)", marginTop:".25rem" }}>
              👤 {tareaActual.responsable}
            </div>
          )}
        </div>
      )}

      {/* Incidencias activas */}
      {incAbiertas.length > 0 && (
        <div style={{ background:"var(--red-dim)", border:"1px solid rgba(248,113,113,.3)",
          borderRadius:10, padding:".75rem", cursor:"pointer" }}
          onClick={onVerInc}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontWeight:700, color:"var(--red)" }}>
              🚨 {incAbiertas.length} incidencia{incAbiertas.length!==1?"s":""} abierta{incAbiertas.length!==1?"s":""}
            </span>
            {incAltas.length > 0 && (
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"var(--fs-xs)",
                background:"var(--red)", color:"white", borderRadius:4, padding:".1rem .4rem" }}>
                {incAltas.length} ALTA{incAltas.length!==1?"S":""}
              </span>
            )}
          </div>
          {incAbiertas.slice(0,2).map(i => (
            <div key={i.id} style={{ fontFamily:"'DM Mono',monospace", fontSize:"var(--fs-xs)",
              color:"var(--text-muted)", marginTop:".25rem" }}>
              · {i.descripcion.slice(0,60)}{i.descripcion.length>60?"...":""}
            </div>
          ))}
        </div>
      )}

      {/* Puestos sin cobertura */}
      {puestosAlerta.length > 0 && (
        <div style={{ background:"rgba(251,191,36,.08)", border:"1px solid rgba(251,191,36,.3)",
          borderRadius:10, padding:".75rem" }}>
          <div style={{ fontWeight:700, color:"var(--amber)", marginBottom:".4rem" }}>
            ⚠️ {puestosAlerta.length} puesto{puestosAlerta.length!==1?"s":""} sin cobertura completa
          </div>
          {puestosAlerta.slice(0,3).map(p => (
            <div key={p.id} style={{ fontFamily:"'DM Mono',monospace", fontSize:"var(--fs-xs)",
              color:"var(--text-muted)", marginTop:".2rem" }}>
              📍 {p.nombre} — {p.presentes}/{p.necesarios}
            </div>
          ))}
        </div>
      )}

      {incAbiertas.length === 0 && puestosAlerta.length === 0 && (
        <div style={{ textAlign:"center", color:"var(--green)", fontFamily:"'DM Mono',monospace",
          fontSize:"var(--fs-sm)", padding:"1.5rem 0" }}>
          ✅ Todo operativo — sin alertas activas
        </div>
      )}

      {/* FAB nueva incidencia */}
      <button onClick={onNuevaInc} style={{
        position:"fixed", bottom:"5rem", right:"1rem", width:52, height:52, borderRadius:"50%",
        background:"var(--red)", color:"white", border:"none", fontSize:"1.4rem",
        cursor:"pointer", boxShadow:"0 4px 20px rgba(248,113,113,.5)", zIndex:1000,
      }}>⚠️</button>
    </div>
  );
}
```

---

### 6.2 Sincronización en tiempo real con `teg-sync`

**Descripción:** DíaCarrera actualmente no escucha el evento `teg-sync`. Si 5 personas están usando el panel simultáneamente el día de carrera, las actualizaciones de unos no se reflejan en la pantalla de otros. Añadir el listener con debounce de 500ms para recargar los datos cuando otro bloque los modifica.

**Cambios necesarios:** Añadir `useEffect` con listener, igual al patrón del Dashboard pero con debounce más corto (el día D se requiere máxima reactividad).

**Implementación:**
```javascript
// Añadir en DiaCarrera.jsx después del useEffect del reloj:
useEffect(() => {
  let debounce = null;
  const handler = () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      // Recargar solo los datos que pueden cambiar en tiempo real
      // loadVols ya existe; añadir las demás
      if (typeof loadVols === "function")  loadVols();
      if (typeof loadInc === "function")   loadInc();
      if (typeof loadTl === "function")    loadTl();
      if (typeof loadCk === "function")    loadCk();
    }, 300); // 300ms — más rápido que el Dashboard (500ms)
  };
  window.addEventListener("teg-sync", handler);
  return () => {
    if (debounce) clearTimeout(debounce);
    window.removeEventListener("teg-sync", handler);
  };
}, []); // no depende de loadVols etc. para evitar re-registrar el handler
```

---

### 6.3 Registro de decisiones del coordinador

Un log simplificado de las decisiones tomadas durante la carrera (ej. "07:45 — Se adelanta el cierre del control KM 13 por baja participación", "09:12 — Se suspende TG25 por meteorología"). Se guarda en `teg_diacarrera_v1_decisiones` y sirve como memoria del evento para la memoria post-carrera.

---

### 6.4 Countdown hasta el cierre de ruta

Mostrar en el header un countdown dinámico hasta la hora de cierre de cada control (extraída de `tl` con categoría `"carrera"` y `tiempoLimite`). Alertas a -15min y -5min.

---

### 6.5 Estado de cobertura médica en el header

Un indicador persistente en el header de DíaCarrera que muestre si la ambulancia y el servicio médico están en posición (basado en el checklist de "Ambulancia en posición"). Si el ítem no está completado, el indicador aparece en rojo.

---

## 7. Plan de refactor

### Cambios rápidos (sin cambios de modelo)

1. **Añadir `creadaEn` en `guardarIncidencia`** — 1 línea. Imprescindible para el SLA.
2. **Añadir listener `teg-sync` con debounce 300ms** — 15 líneas. Crítico para uso colaborativo el día D.
3. **Filtrar checklist por fase** ("Mañana carrera" / "Durante carrera") — filtro rápido de 1 condición.
4. **Añadir `puestoNombre` al formulario de incidencia rápida** — selector de localizaciones, mismo patrón que en Logística.
5. **Tab "Ahora" / Mission Control** — componente nuevo, solo lectura, usa datos ya cargados.
6. **Ordenar voluntarios por presencia** (sin llegar primero) en el tab Voluntarios.

### Cambios estructurales

7. **Unificar `v.presente` y `v.enPuesto`** — el toggle de DíaCarrera debe escribir `enPuesto`, no `presente`. Requiere verificar que el Portal y el Dashboard lean el mismo campo (ya lo hacen con `enPuesto`).
8. **Armonizar formato de `id` de incidencias** — usar `genIdNum` en lugar de `` `inc_${Date.now()}` `` para coherencia con las incidencias de Logística.
9. **Integrar el campo `horaLlegada`** cuando el coordinador marca presencia — añadir el timestamp de llegada además del boolean.

### Riesgos si no se actúan

- **INC-01 sin arreglar:** `presente` y `enPuesto` crecen desacoplados. El Dashboard y DíaCarrera muestran métricas de presencia inconsistentes. En el día de carrera, con voluntarios que se registran desde el portal y coordinadores que los marcan en DíaCarrera, la cobertura real es imposible de determinar con certeza.
- **INC-03 sin arreglar (no hay teg-sync):** Con 150 voluntarios, si el VoluntarioPortal y DíaCarrera están abiertos en paralelo en varios dispositivos, los datos de presencia y de incidencias se ven obsoletos durante minutos. En una emergencia, un coordinador puede tomar decisiones con información incorrecta.
- **INC-02 sin arreglar:** Las incidencias registradas desde DíaCarrera nunca tendrán SLA visual en el bloque Logística, rompiendo la consistencia del modelo de incidencias.

---

*Informe generado sobre el commit `7a978ea` de `trailelguerrero/app-carrera`.*
*Revisión recomendada: simulacro operativo (julio 2026) y la semana antes del evento (agosto 2026).*
