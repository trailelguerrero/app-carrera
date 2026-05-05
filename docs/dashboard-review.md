# Revisión del bloque Dashboard

**Fecha:** Mayo 2026 · `app-carrera` · Trail El Guerrero 2026
**Archivo analizado:** `src/components/blocks/Dashboard.jsx` (1.772 líneas)

---

## 1. Resumen del bloque

El Dashboard es la vista central de mando del panel de gestión. Su propósito es dar al organizador una fotografía instantánea del estado del evento: cuántos días quedan, cómo está la salud de cada módulo, qué acciones son urgentes y cuál es el resultado financiero actual. No es un simple agregador de KPIs — incorpora lógica de priorización temporal (los umbrales de alerta cambian según los días que quedan para la carrera) y una lista de "acciones concretas" que guía al organizador hacia la tarea más crítica en cada momento.

**Métricas y vistas principales:**

| Sección | Qué muestra |
|---------|-------------|
| **Hero / Countdown** | Días hasta el evento + barra de salud global (colapsable) |
| **Haz esto ahora** | Lista priorizada de acciones concretas con CTA directo al módulo |
| **KPIs financieros** | Inscritos por distancia, ingresos, costes, resultado, ROI |
| **KPIs voluntarios** | Cobertura de puestos, confirmados, pendientes |
| **KPIs patrocinadores** | Captado vs objetivo, cobrado, pipeline, contraprestaciones |
| **KPIs logística** | Tareas pre-operativas completadas, materiales en alerta |
| **Timeline de hitos** | Próximos 5 hitos del proyecto no completados |
| **Alertas** | Críticas (rojo) y avisos (ámbar/azul) ordenados por prioridad |
| **Dependencia patrocinadores** | Ranking de % por empresa sobre total de ingresos |
| **Banner escenario activo** | Aviso cuando hay un escenario activo en Presupuesto |
| **Banner día de carrera** | CTA prominente cuando quedan ≤7 días |

**Relación con otros bloques:** El Dashboard es el único bloque que lee datos de todos los demás. No escribe en ninguna clave — es puro consumidor de lectura. Se actualiza al montar (carga batch vía `dataService.getMultiple`), y escucha el evento `teg-sync` para refrescar, con un throttle de 10 segundos.

---

## 2. Modelo de datos y dependencias

### 2.1 Carga de datos

- **Carga inicial:** `dataService.getMultiple(ALL_KEYS)` — una sola llamada batch que lee 20+ claves.
- **Actualización:** Listener sobre `window.addEventListener("teg-sync")` throttled a 10s.
- **Caché optimista:** Carga desde `localStorage` mientras espera la API, luego actualiza con los datos reales (`rawData` → `data` via `useMemo`).
- **Sin invalidación manual:** No hay botón de "refrescar". Si el usuario cambia datos en otro bloque y no se emite `teg-sync`, el Dashboard no se actualiza.

### 2.2 Claves consumidas

| Clave | Origen | Uso en Dashboard |
|-------|--------|-----------------|
| `teg_presupuesto_v1_conceptos` | Presupuesto | Cálculo de costes |
| `teg_presupuesto_v1_tramos` | Presupuesto | Inscritos, ingresos, tramos cerrando |
| `teg_presupuesto_v1_inscritos` | Presupuesto | Totales por distancia |
| `teg_presupuesto_v1_ingresosExtra` | Presupuesto | Resultado financiero |
| `teg_presupuesto_v1_merchandising` | Presupuesto | Beneficio merch |
| `teg_presupuesto_v1_syncConfig` | Presupuesto | Toggles de sincronización |
| `teg_presupuesto_v1_maximos` | Presupuesto | Ocupación por distancia |
| `teg_voluntarios_v1_voluntarios` | Voluntarios | Cobertura, confirmados, pendientes |
| `teg_voluntarios_v1_puestos` | Voluntarios | Análisis por puesto |
| `teg_patrocinadores_v1_pats` | Patrocinadores | Captado, cobrado, pipeline |
| `teg_patrocinadores_v1_obj` | Patrocinadores | Objetivo de captación |
| `teg_logistica_v1_mat` | Logística | Alertas de stock |
| `teg_logistica_v1_asig` | Logística | Sobreasignación |
| `teg_logistica_v1_tl` | Logística | Progreso runbook |
| `teg_logistica_v1_ck` | Logística | Checklist pre-operativo |
| `teg_proyecto_v1_hitos` | Proyecto | Timeline y hitos críticos |
| `teg_proyecto_v1_tareas` | Proyecto | Progreso, vencidas, bloqueadas |
| `teg_documentos_v1` | Documentos | Vencidos y próximos |
| `teg_documentos_v1_gestiones` | Documentos | Permisos, licencias, seguros |
| `teg_camisetas_v1_pedidos` | Camisetas | Beneficio merchandising |
| `teg_camisetas_v1_coste` | Camisetas | Coste unitario de fabricación |
| `teg_event_config_v1` | Configuración | Nombre, fecha, umbrales |
| `teg_scenario_active_name` | Presupuesto | Banner de escenario activo |

### 2.3 Cálculos internos

El `useMemo` de `data` (líneas 113-390) hace todos los cálculos en una función pura de ~280 líneas que devuelve 50+ valores. Usa `calculateTotalInscritos`, `calculateCostesFijos`, `calculateCostesVariables` (de `budgetUtils.js`) y `calculateResultadoFinanciero` como fuente única de verdad financiera.

---

## 3. Inconsistencias y problemas detectados

### 3.1 Lógica y datos

#### BUG-01: `patCobrado` usa `p.importe` en lugar de `getImporteCobrado(p)`

**Línea 201:**
```javascript
const patCobrado = pats.filter(p => p.estado==="cobrado")
  .reduce((s,p) => s+(p.importe||0), 0);
```

La función utilitaria `getImporteCobrado(p)` ya existe en `budgetUtils.js` y maneja el caso de cobros parciales (`p.importeCobrado < p.importe`). El Dashboard siempre muestra el importe acordado, no el realmente cobrado. Si un patrocinador tiene `importeCobrado: 800` sobre `importe: 1000`, el Dashboard muestra `1000€` cobrados aunque solo hayan entrado `800€` en caja.

**Solución:** Reemplazar la línea 201 con:
```javascript
import { getImporteCobrado } from "@/lib/budgetUtils";
const patCobrado = pats.filter(p => p.estado==="cobrado")
  .reduce((s,p) => s + getImporteCobrado(p), 0);
```

---

#### BUG-02: `calculateResultadoFinanciero` ignora el toggle `patrociniosCobrado`

**Línea 175, `calculateResultadoFinanciero` en `budgetUtils.js`:**

La función acepta `syncConfig` pero solo maneja `syncConfig.patrocinios`. El toggle `patrociniosCobrado` (introducido en sprints recientes) no está implementado en `calculateResultadoFinanciero`. Esto significa que cuando el usuario activa el toggle "Patrocinios cobrados" en Presupuesto, el resultado cambia en el bloque Presupuesto pero el Dashboard siempre muestra el resultado con el toggle de "captados" (o ninguno, según el estado de `syncConfig.patrocinios`).

**Solución:** Actualizar `calculateResultadoFinanciero` para que respete ambos toggles, priorizando el activo:

```javascript
// Si patrociniosCobrado está activo, usar totalPatCobrado
// Si patrocinios está activo, usar totalPatConfirmado
// Si ninguno, usar 0
```

---

#### INC-01: El `useMemo` de `data` es un monolito de 280 líneas

El bloque entero de cálculo vive en un único `useMemo` con dependencia `[rawData]`. Cualquier cambio en cualquier dato recalcula absolutamente todo — inscritos, voluntarios, logística, documentos, alertas — aunque solo haya cambiado el nombre de un patrocinador. No hay memoización granular por módulo.

**Impacto:** En eventos con muchos datos (150+ voluntarios, 20+ conceptos, 50+ tareas), el recálculo puede tardar 30-50ms, causando un frame drop visible al navegar al Dashboard.

**Solución:** Dividir en sub-memos:
```javascript
const dataPresupuesto = useMemo(() => calcPresupuesto(rawData), [rawData?.presupuesto]);
const dataVoluntarios = useMemo(() => calcVoluntarios(rawData), [rawData?.voluntarios]);
// etc.
```

---

#### INC-02: `teg_proyecto_v1_tareas` en `ALL_KEYS` pero no en la BD sync

`ALL_KEYS` incluye `teg_proyecto_v1_tareas` con valor por defecto `[]`, pero esta clave no se lista en el bloque Proyecto como una clave gestionada. Si el bloque Proyecto usa una clave diferente o no la sincroniza, el Dashboard siempre mostrará 0 tareas aunque existan.

**Solución:** Verificar que el bloque Proyecto escribe en `teg_proyecto_v1_tareas` y añadir la clave al listener de `teg-sync` en Proyecto.

---

#### INC-03: Throttle de `teg-sync` a 10s puede ocultar cambios urgentes

Si el organizador confirma un voluntario (emite `teg-sync`) y luego marca otro como cancelado 3 segundos después (emite otro `teg-sync`), el Dashboard solo procesará el primero. El segundo queda ignorado durante 10 segundos.

**Impacto:** En el día de carrera, con múltiples operaciones simultáneas, el Dashboard puede mostrar datos obsoletos hasta 10s después del cambio real.

**Solución:** Implementar un debounce en lugar de un throttle hard-coded: el Dashboard espera 500ms de inactividad antes de recargar, no un mínimo de 10s entre recargas.

---

#### INC-04: `camCoste` por defecto `{ corredor: 7.5, voluntario: 7.5 }` no coincide con `COSTE_DEFAULT`

El Dashboard usa `{ corredor: 7.5, voluntario: 7.5 }` como defecto para el coste de camisetas. El bloque Camisetas usa `COSTE_DEFAULT = { corredor: 8, voluntario: 7, nino: 6 }`. Si la clave `teg_camisetas_v1_coste` no está inicializada en la BD, los cálculos de beneficio de merchandising serán distintos entre Dashboard y Camisetas.

**Solución:** Importar y usar `COSTE_DEFAULT` de `budgetConstants` en lugar del objeto hardcoded.

---

#### INC-05: Alertas de voluntarios duplicadas en `alertasCriticas` y en la sección "Haz esto ahora"

Cuando la cobertura de voluntarios es crítica, el organizador ve la alerta en dos lugares: en el panel "🔴 Alertas críticas" y en la sección "Haz esto ahora" — con el mismo texto y mismo CTA. El código tiene comentarios indicando que no se deben duplicar, pero en los casos de `puestosAlerta.length > 0 && diasHasta <= 45`, ambas secciones generan entradas.

---

### 3.2 UX/UI del Dashboard

#### UX-01: Jerarquía visual invertida — las alertas aparecen debajo de los KPIs

El organizador que llega al Dashboard quiere saber primero si hay algo urgente. Actualmente el flujo es:

```
[Hero/Countdown] → [Haz esto ahora] → [KPIs financieros] → [KPIs voluntarios] → 
[KPIs patrocinadores] → [Timeline] → [Alertas] → [Dependencia patrocinadores]
```

Las alertas críticas están al **final** del scroll, después de 8 secciones de KPIs. Un organizador mobile que ve el Hero y los KPIs puede no llegar a las alertas críticas.

**Propuesta:** Mover el panel de alertas críticas al segundo lugar (justo después del Hero), por encima de los KPIs.

---

#### UX-02: 6 KPI grids en fila generan fatiga visual

El Dashboard presenta más de 20 KPIs distribuidos en 4-5 grids consecutivos. En móvil se traduce en 20+ tarjetas de scroll. No hay ninguna jerarquía entre "métricas de decisión" y "métricas informativas".

**Propuesta:** Colapsar los grupos de KPIs secundarios (logística, documentos) por defecto, expandibles con un tap. Mostrar solo los KPIs más críticos de cada área en el estado colapsado.

---

#### UX-03: "Salud del evento" en barra colapsada pierde su impacto

La barra de salud es quizás el KPI más valioso del Dashboard — un resumen visual de 6 módulos en una sola cifra. Pero está colapsada por defecto (`setSaludExpandida(false)`). El usuario solo ve un porcentaje sin contexto. Si está en 45% (rojo), el usuario no sabe qué módulo está mal sin expandirla.

**Propuesta:** Mostrar siempre los módulos con score rojo o ámbar, aunque el panel esté "colapsado". Solo colapsar los módulos en verde.

---

#### UX-04: Los KPIs financieros no muestran contexto de progreso temporal

El resultado financiero muestra un número absoluto (+2.340€) pero no indica si es bueno o malo en el contexto del evento. ¿Es el 80% del objetivo? ¿Ha empeorado respecto al mes pasado?

**Propuesta:** Añadir debajo del resultado un indicador de "vs último mes" o "% del objetivo de margen" cuando `margenConfig` esté configurado.

---

#### UX-05: La sección "Haz esto ahora" no tiene límite visual de acciones

En un evento con muchos problemas activos, la lista de "Haz esto ahora" puede tener 8-9 items que llenan media pantalla antes de llegar a los KPIs. No hay priorización visual clara entre los items (todos se ven iguales salvo el color del punto de prioridad).

**Propuesta:** Limitar a 3-4 items visibles con "Ver más" colapsable. Añadir número de orden visible (1, 2, 3...) para enfatizar la secuencia.

---

#### UX-06: Los KPIs de inscripciones muestran total pero no tendencia

El KPI de inscritos muestra el número actual (ej. 324/600) pero no da información sobre la velocidad de captación. Un organizador no sabe si está en la curva esperada o si el ritmo se ha ralentizado.

---

### 3.3 Rendimiento y mantenibilidad

#### PERF-01: Componente de 1.772 líneas — todo en un único archivo

El Dashboard combina: lógica de carga, cálculos de datos, generación de alertas, renderizado de 8+ secciones y 400+ líneas de CSS inline. Es el componente más grande de la aplicación.

**Propuesta de extracción:**
- `DashboardData.js` — el `useMemo` de cálculos (actualmente 280 líneas en el componente)
- `DashHeroSection.jsx` — countdown + salud
- `DashKpiGrid.jsx` — grids de KPIs reutilizables
- `DashAlertPanel.jsx` — panel de alertas con lógica de priorización
- `DashTimeline.jsx` — timeline de hitos
- `DashAcciones.jsx` — sección "Haz esto ahora"

---

#### PERF-02: CSS en string literal de 200+ líneas dentro del componente

`DASH_EXTRA_CSS` está definido como template literal dentro de `Dashboard.jsx` e inyectado vía `<style>`. En cada render que incluya un cambio en `DASH_EXTRA_CSS`, el navegador reparsea el CSS completo.

**Solución:** Mover a un archivo CSS/SCSS importado estáticamente, igual que `BLOCK_CSS`.

---

#### PERF-03: El listener `teg-sync` no limpia correctamente en StrictMode

```javascript
window.addEventListener("teg-sync", handler);
return () => window.removeEventListener("teg-sync", handler);
```

En React StrictMode (desarrollo), el efecto se monta y desmonta dos veces. El handler se registra dos veces si la limpieza no se ejecuta antes del segundo mount. Puede causar doble recarga.

---

## 4. Mejoras operativas y de flujo de trabajo

### 4.1 Jerarquía de información propuesta

El Dashboard debería responder estas preguntas en orden:
1. **¿Hay algo urgente?** → Alertas críticas al inicio, no al final
2. **¿Cuánto tiempo queda?** → Countdown (ya en posición correcta)
3. **¿Cuál es el estado general?** → Barra de salud siempre visible con módulos en rojo/ámbar
4. **¿Qué hago ahora?** → Acciones concretas (ya existe pero demasiado larga)
5. **¿Cómo está el dinero?** → KPIs financieros clave (resultado, ocupación)
6. **Detalle por módulo** → Colapsable

### 4.2 Nuevos KPIs sugeridos

| KPI | Lógica | Dónde mostrarlo |
|-----|--------|-----------------|
| **Velocidad de inscripciones** | (inscritos_esta_semana / inscritos_total) × 100 | KPI de ocupación |
| **Días hasta cierre de patrocinios** | config.fechaCierrePatrocinios - hoy | KPI patrocinadores |
| **% contraprestaciones entregadas** | entregadas / total × 100 | KPI patrocinadores |
| **Cobertura voluntarios por distancia** | puestos_TG25_cubiertos / puestos_TG25_total | KPI voluntarios |
| **Runbook progress** | tlDone / tlTotal | KPI logística |

### 4.3 Mejoras de navegación

- **Deep link desde alertas:** Cada alerta debería navegar al módulo y subtab exacto (ej. `navigate("voluntarios", "puestos")` en lugar de solo `navigate("voluntarios")`). Ya se usa `teg-navigate` con `subtab`, pero no todas las alertas lo especifican.
- **Breadcrumb contextual:** Al volver al Dashboard desde un bloque, mostrar "Volviste desde Voluntarios" con el contexto de la acción que se estaba haciendo.
- **Estado "sin datos"** más claro: Cuando `rawData` es nulo o vacío, mostrar CTAs específicos por sección ("Configura los tramos", "Añade voluntarios") en lugar de KPIs con valor 0.

---

## 5. Interconexiones con otros módulos

### 5.1 Estado actual de las interconexiones

```
Presupuesto  → Dashboard: resultado, inscritos, tramos, costes, ingresos extra
Patrocinadores → Dashboard: captado, cobrado, pipeline, contraprestaciones
Voluntarios  → Dashboard: cobertura, puestos, confirmados, pendientes
Logística    → Dashboard: stock, runbook, checklist
Proyecto     → Dashboard: tareas, hitos, progreso global
Documentos   → Dashboard: vencidos, próximos a vencer, gestiones
Camisetas    → Dashboard: coste y beneficio de merchandising (vía calculateResultadoFinanciero)
```

### 5.2 Badges de alertas vs Dashboard — desincronización estructural

`Index.jsx` calcula los badges de alerta (el `"!"` en la nav) con una lógica simplificada sobre `localStorage`. El Dashboard hace los mismos cálculos pero con datos de la API y lógica más completa. Pueden divergir:

- Un badge `"!"` en Presupuesto puede desaparecer en el Dashboard si los ingresos extra cubren el déficit (ya corregido en INC-01 del bloque Presupuesto).
- Un badge `"!"` en Voluntarios desaparece cuando `diasHasta > volDiasAviso`, pero `Index.jsx` puede no respetar ese umbral temporal.

**Propuesta:** Unificar la lógica de alertas en una función compartida `calcAlertasBadges(rawData)` en `budgetUtils.js` que tanto `Index.jsx` como el Dashboard usen.

### 5.3 Integraciones propuestas

#### INT-01: Panel de riesgos cruzados

Combinar datos de múltiples módulos para detectar riesgos que ningún módulo individual detecta:

```
Riesgo 1: Patrocinador cubre >20% de ingresos + estado "negociando" → riesgo presupuestario
Riesgo 2: Cobertura de voluntarios < 70% + hito "Briefing voluntarios" en <14 días
Riesgo 3: Permiso sin aprobar + evento en <60 días → riesgo legal
Riesgo 4: Camisetas no pedidas + T-45 días → riesgo logístico
```

#### INT-02: Timeline unificado

Un único timeline que mezcle hitos de Proyecto + fechas de cierre de tramos + fechas de vencimiento de documentos + fechas de entrega de contraprestaciones. Actualmente el Dashboard solo muestra hitos de Proyecto.

#### INT-03: KPI de temperatura del evento

Un único indicador (0-100) que pondere: ocupación de inscritos (30%), cobertura de voluntarios (25%), resultado financiero positivo (25%), documentos en regla (20%). Más intuitivo que la barra de salud actual que pondera por módulos.

---

## 6. Nuevas funciones sugeridas

### 6.1 Panel de riesgos cruzados

**Descripción funcional:**
Una nueva sección en el Dashboard que detecta automáticamente combinaciones de riesgo que requieren atención coordinada entre módulos. Se mostraría entre "Haz esto ahora" y los KPIs. Cada riesgo incluye: descripción, módulos afectados, nivel de urgencia y CTA.

**Cambios en modelo de datos:** Ninguno. Solo lectura de los datos ya disponibles en `data`.

**Pseudocódigo:**
```javascript
function calcularRiesgosCruzados(data) {
  const riesgos = [];

  // Riesgo 1: Dependencia crítica de patrocinio con acuerdo sin cerrar
  const depCritica = data.pats?.find(p =>
    (p.importe / data.totalIngresos > 0.2) &&
    p.estado !== "cobrado"
  );
  if (depCritica) {
    riesgos.push({
      nivel: "critico",
      icono: "⚠️",
      titulo: `${depCritica.nombre} representa ${Math.round(depCritica.importe/data.totalIngresos*100)}% de ingresos y no está cobrado`,
      modulos: ["presupuesto", "patrocinadores"],
      cta: "Revisar acuerdo",
    });
  }

  // Riesgo 2: Briefing de voluntarios próximo con cobertura baja
  const hitoBriefing = data.hitosProximos?.find(h =>
    h.nombre?.toLowerCase().includes("briefing") && !h.completado
  );
  const diasBriefing = hitoBriefing
    ? Math.ceil((new Date(hitoBriefing.fecha) - new Date()) / 86400000) : null;
  if (diasBriefing !== null && diasBriefing <= 21 && data.coberturaVol < 80) {
    riesgos.push({
      nivel: "alto",
      icono: "👥",
      titulo: `Briefing en ${diasBriefing}d con solo ${data.coberturaVol}% de cobertura de voluntarios`,
      modulos: ["voluntarios", "proyecto"],
      cta: "Confirmar voluntarios",
    });
  }

  // Riesgo 3: Permiso sin aprobar y evento en <60 días
  const permisosVencidos = data.gestiones?.filter(g =>
    g.estado !== "aprobado" && data.diasHasta < 60
  ) ?? [];
  if (permisosVencidos.length > 0) {
    riesgos.push({
      nivel: "critico",
      icono: "🏛️",
      titulo: `${permisosVencidos.length} permiso(s) sin aprobar — evento en ${data.diasHasta} días`,
      modulos: ["documentos"],
      cta: "Revisar gestiones",
    });
  }

  return riesgos.sort((a,b) => a.nivel === "critico" ? -1 : 1);
}
```

---

### 6.2 KPI de velocidad de inscripciones

**Descripción funcional:**
Muestra en el KPI de ocupación un indicador de ritmo de inscripción: cuántos inscritos se han añadido en los últimos 7 días, comparado con el período anterior. Proyecta cuándo se alcanzará el aforo máximo a ese ritmo.

**Cambios en modelo de datos:**
Requiere persistir un snapshot semanal de inscritos. Nueva clave: `teg_presupuesto_v1_inscritosHistorico: { fecha: string, total: number }[]`.

**Pseudocódigo del componente:**
```jsx
// En el KPI de inscripciones:
const historico = useData("teg_presupuesto_v1_inscritosHistorico", []);

const velocidad = useMemo(() => {
  if (historico.length < 2) return null;
  const ultimo = historico[historico.length - 1];
  const semanaAntes = historico.find(h =>
    new Date(h.fecha) <= new Date(Date.now() - 7 * 86400000)
  );
  if (!semanaAntes) return null;
  const ritmo7d = (ultimo.total - semanaAntes.total); // inscritos en los últimos 7 días
  const restantes = (totalMaximos - totalInscritos);
  const diasParaLlenar = ritmo7d > 0 ? Math.ceil(restantes / (ritmo7d / 7)) : null;
  return { ritmo7d, diasParaLlenar };
}, [historico, totalInscritos, totalMaximos]);

// En el JSX:
{velocidad && (
  <div className="kpi-sub">
    +{velocidad.ritmo7d} esta semana
    {velocidad.diasParaLlenar && ` · Lleno en ~${velocidad.diasParaLlenar}d`}
  </div>
)}
```

---

### 6.3 Timeline unificado multi-fuente

Integrar en el timeline actual (hoy solo hitos de Proyecto) los cierres de tramos de inscripción, vencimientos de documentos y fechas de entrega de contraprestaciones. Mostrar con colores e iconos distintos por tipo.

---

### 6.4 Modo "Día de Carrera" del Dashboard

Cuando `diasHasta === 0`, transformar el Dashboard en una vista operacional: voluntarios por puesto en tiempo real, materiales en su destino, runbook con progreso live. Los KPIs financieros pasan a segunda pantalla.

---

### 6.5 Exportación del estado del evento como PDF

Botón "Informe del evento" que genera un PDF con todos los KPIs actuales, el estado de cada módulo y las alertas activas. Útil para reuniones de coordinación pre-evento.

---

## 7. Plan de refactor

### Corto plazo — 1-2 sprints (alto impacto, bajo riesgo)

1. **BUG-01:** Usar `getImporteCobrado(p)` en el cálculo de `patCobrado` — 1 línea.
2. **BUG-02:** Actualizar `calculateResultadoFinanciero` para respetar `patrociniosCobrado`.
3. **INC-04:** Usar `COSTE_DEFAULT` importado en lugar del objeto hardcoded `{ corredor: 7.5, voluntario: 7.5 }`.
4. **UX-01:** Mover alertas críticas al inicio del Dashboard (segundo bloque tras el Hero).
5. **UX-03:** Mostrar módulos en rojo/ámbar siempre visibles en la barra de salud aunque esté "colapsada".
6. **INC-05:** Eliminar duplicación de alertas de voluntarios en "Haz esto ahora".
7. **INC-03:** Cambiar throttle de 10s a debounce de 500ms en el listener de `teg-sync`.

### Medio plazo — refactors estructurales

1. **PERF-01:** Dividir el componente de 1.772 líneas en sub-componentes (`DashHeroSection`, `DashKpiGrid`, `DashAlertPanel`, `DashTimeline`, `DashAcciones`).
2. **PERF-02:** Mover `DASH_EXTRA_CSS` a un archivo CSS estático.
3. **INC-01:** Dividir el `useMemo` monolítico en sub-memos por módulo para reducir recálculos innecesarios.
4. **Función compartida `calcAlertasBadges`:** Unificar la lógica de alertas entre `Index.jsx` y `Dashboard.jsx`.
5. **Panel de riesgos cruzados:** Implementar la función `calcularRiesgosCruzados` y añadir sección visual.
6. **KPI velocidad de inscripciones:** Implementar snapshots semanales y proyección de llenado.

### Riesgos si no se actúa

- **BUG-01 sin corregir:** El organizador ve datos de tesorería incorrectos. Un patrocinador con cobro parcial aparece como cobrado al 100% en el Dashboard pero no en el bloque Patrocinadores — genera confusión en reuniones de control financiero.
- **PERF-01 sin abordar:** El componente seguirá creciendo con cada nueva funcionalidad. Con 2.000+ líneas, cualquier cambio requiere leer el archivo completo para entender el impacto.
- **UX-01 sin corregir:** Un organizador mobile que llega al Dashboard en la semana de carrera puede no ver las alertas críticas sin hacer scroll por 10+ secciones de KPIs.
- **INC-01 sin corregir:** El `useMemo` monolítico con 50+ cálculos se convierte en un cuello de botella inaceptable cuando el evento tiene muchos datos (150+ voluntarios, 20+ conceptos).
- **Función `calcAlertasBadges` no unificada:** Los badges de la nav y las alertas del Dashboard pueden mostrar estados contradictorios al organizador, erosionando la confianza en la herramienta.

---

*Informe generado sobre el commit `e2538c4` de `trailelguerrero/app-carrera`.*
*Próxima revisión recomendada: antes del briefing de voluntarios (agosto 2026).*
