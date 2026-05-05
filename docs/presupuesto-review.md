# Revisión del bloque Presupuesto

---

## 1. Resumen del bloque

El bloque **Presupuesto** resuelve la gestión económica completa de una carrera de trail running: desde la previsión de ingresos por inscripciones hasta el análisis de rentabilidad por distancia y el cálculo del punto de equilibrio. Las entidades principales son: **tramos de inscripción** (Early Bird, Fase 1, etc. con precios por distancia), **conceptos de costes** (fijos prorrateados y variables por corredor), **inscritos** (número de participantes por tramo y distancia), **máximos de aforo** por distancia, e **ingresos extra** (patrocinios, merchandising, subvenciones). El flujo de usuario sigue un wizard lineal de 5 pasos: configurar tramos y precios → introducir inscritos → añadir costes → revisar el P&L → analizar el punto de equilibrio. Los datos se persisten en Neon PostgreSQL vía `dataService.set/get` con auto-guardado cada 2 segundos (debounce) y guardado manual. El bloque lee patrocinadores de `teg_patrocinadores_v1_pats` y pedidos de camisetas de `teg_camisetas_v1_pedidos` para sincronizar ingresos extra automáticamente. `Index.jsx` lee directamente desde localStorage para calcular el badge de alerta `"!"` si el resultado es negativo, usando una lógica simplificada paralela a la del bloque.

---

## 2. Modelo de datos y dependencias

### 2.1 Tramo de inscripción

```typescript
interface Tramo {
  id:       number;
  nombre:   string;           // "Early Bird", "Fase 1", etc.
  fechaFin: string;           // ISO date — determina si el tramo está cerrado o no
  precios:  Record<"TG7"|"TG13"|"TG25", number>;
}
```

Los tramos no tienen `fechaInicio` explícita — se infiere como la fechaFin del tramo anterior.

### 2.2 Concepto de coste

```typescript
interface Concepto {
  id:                number;
  nombre:            string;
  tipo:              "fijo" | "variable";
  activo:            boolean;
  costeTotal?:       number;       // Solo fijo: coste total a prorratear
  costePorDistancia: Record<"TG7"|"TG13"|"TG25", number|null>;  // Variable: €/corredor por distancia
  activoDistancias:  Record<"TG7"|"TG13"|"TG25", boolean>;      // Si aplica a cada distancia
  modoUniforme?:     boolean;      // Variable: mismo precio para todas las distancias activas
  // Campos de gestión de compras (opcionales):
  proveedor?:        string;
  contacto?:         string;
  fechaPago?:        string;
  fechaEntrega?:     string;
  costeUnitarioReal?:number;
  estadoPago?:       string;
  estadoPedido?:     string;
  notas?:            string;
}
```

### 2.3 Inscritos y máximos

```typescript
interface InscritosState {
  tramos: Record<number, Record<"TG7"|"TG13"|"TG25", number>>;
}

type MaximosState = Record<"TG7"|"TG13"|"TG25", number>;
```

### 2.4 Ingresos extra

```typescript
interface IngresoExtra {
  id:       number;
  nombre:   string;
  valor:    number;
  activo:   boolean;
  synced:   boolean;   // Si el valor viene de otro bloque
  syncKey?: "patrocinios" | "patrociniosCobrado" | "camisetas";
}
```

### 2.5 Claves de persistencia

| Clave localStorage/DB | Tipo | Descripción |
|----------------------|------|-------------|
| `teg_presupuesto_v1_tramos` | `Tramo[]` | Tramos de inscripción |
| `teg_presupuesto_v1_conceptos` | `Concepto[]` | Costes fijos y variables |
| `teg_presupuesto_v1_inscritos` | `InscritosState` | Inscritos por tramo y distancia |
| `teg_presupuesto_v1_maximos` | `MaximosState` | Aforo máximo por distancia |
| `teg_presupuesto_v1_ingresosExtra` | `IngresoExtra[]` | Patrocinios, merch, subvenciones |
| `teg_presupuesto_v1_merchandising` | `MerchandiseLine[]` | Plan de merch manual (alternativa al sync) |
| `teg_presupuesto_v1_syncConfig` | `SyncConfig` | Toggles de sincronización entre bloques |
| `teg_patrocinadores_v1_pats` | `Patrocinador[]` | Leído en modo solo lectura para sync |
| `teg_camisetas_v1_pedidos` | `Pedido[]` | Leído en modo solo lectura para sync |

### 2.6 Carga y guardado

- **Carga inicial:** `useBudgetLogic` hace 6 llamadas `Promise.all` a `dataService.get` al montar.
- **Auto-guardado:** `useEffect` sobre las 6 entidades con debounce de 2 segundos. Emite `teg-save-status` pero no limpia el spinner "saving" si falla.
- **Guardado manual:** `saveData()` hace las mismas 6 llamadas — **duplicación exacta del auto-guardado**.
- **Sincronización:** `useEffect` sobre los totales calculados de patrocinadores y camisetas actualiza `ingresosExtra` en cada render donde cambien.

---

## 3. Inconsistencias, incongruencias y duplicidades

### 3.1 Lógica y datos

#### INC-01: Lógica de alertas en `Index.jsx` no incluye ingresos extra ni syncConfig

**Archivo:** `src/pages/Index.jsx`, líneas 581-600.

`Index.jsx` calcula `ingresos - costes < 0` usando solo los ingresos de inscripciones y los costes de conceptos activos. **No incluye patrocinios, merchandising ni subvenciones** aunque estos estén activos y sincronizados en el bloque Presupuesto. Un evento con 0 beneficio en inscripciones pero 5.000€ de patrocinio mostraría el badge `"!"` incorrectamente.

```javascript
// Index.jsx — simplificación incorrecta:
if (ingresos - costes < 0 && totalIns > 0) badges["presupuesto"] = "!";
// Falta: + ingresosExtra activos
```

**Corrección:** Leer `teg_presupuesto_v1_ingresosExtra` del localStorage y sumar los valores activos al cálculo de `ingresos`.

---

#### INC-02: `saveData` y el auto-guardado son idénticos — doble escritura

**Archivo:** `src/hooks/useBudgetLogic.js`, líneas 140-165 (saveData) y 167-183 (autoSave).

Ambos hacen exactamente las mismas 6 llamadas a `dataService.set`. Cuando el usuario pulsa "Guardar", el autoSave también se disparará 2 segundos después, resultando en 12 escrituras a la base de datos para un único cambio.

**Corrección:** El botón manual debería cancelar el timer del autoSave y ejecutar el guardado inmediatamente, o simplemente forzar el debounce a 0ms.

---

#### INC-03: `calculateResultadoFinanciero` en `budgetUtils.js` replica lógica de `useBudgetLogic`

**Archivo:** `src/lib/budgetUtils.js`, línea 219+.

`calculateResultadoFinanciero` fue pensada como "fuente única de verdad" para Dashboard y `useBudgetLogic`. Sin embargo, `useBudgetLogic` **no usa esta función** — calcula el resultado directamente con `calculateResultado()`. El Dashboard sí la usa. El resultado puede diferir entre el bloque Presupuesto y el Dashboard en escenarios con `patrociniosCobrado` activo, ya que `calculateResultadoFinanciero` solo maneja `syncConfig.patrocinios` (no el toggle `patrociniosCobrado`).

**Corrección:** Hacer que `useBudgetLogic` use `calculateResultadoFinanciero` o eliminar dicha función y unificar en `useBudgetLogic`.

---

#### INC-04: `inscritos.tramos` puede tener claves de tramos eliminados

**Archivo:** `src/hooks/useBudgetLogic.js`, función `removeTramo` (ausente — no existe).

No hay función `removeTramo` en `useBudgetLogic`. Si el usuario añade un tramo con `addTramo()`, no puede eliminarlo desde la UI. Los datos de inscritos de tramos obsoletos permanecen en `inscritos.tramos` indefinidamente, afectando a los totales si el tramo fue re-añadido con el mismo id.

**Corrección:** Añadir `removeTramo(id)` que borre tanto de `tramos[]` como de `inscritos.tramos[id]`.

---

#### INC-05: Edge case — tramo con todos los precios a 0

Si `t.precios[d] = 0` para todas las distancias, `calculatePrecioMedioDistancia` devuelve `{TG7: 0, TG13: 0, TG25: 0, total: 0}`, lo que hace que `calculatePuntoEquilibrio` calcule `margen = precioMedio - costesVar = 0 - X < 0` y devuelva `pe[d] = "∞"` — un string, no un número. `TabEquilibrio` debe manejar este valor especial explícitamente o producirá `NaN` en operaciones numéricas.

---

#### INC-06: `modoUniforme` ausente en conceptos fijos

Los conceptos de tipo `"fijo"` nunca tienen `modoUniforme`, pero `updateCostePorDistancia` comprueba `if (c.modoUniforme)` en todos los conceptos. Si por algún motivo un concepto fijo tuviera `modoUniforme: true` (ej. un bug de migración), su `costeTotal` no se actualizaría cuando el usuario cambia el precio — solo se actualizaría `costePorDistancia`.

---

#### INC-07: Auto-guardado no persiste `syncConfig`

**Archivo:** `src/hooks/useBudgetLogic.js`.

`syncConfig` se lee/escribe via `useData("teg_presupuesto_v1_syncConfig", ...)` que tiene su propio mecanismo de auto-guardado integrado. Sin embargo, si `dataService` falla en su escritura (error de red), el estado local y la BD quedan desincronizados sin que el usuario lo sepa. Tampoco aparece en el `saveData` manual.

---

### 3.2 UX/UI del módulo Presupuesto

#### UX-01: El wizard de 5 pasos no muestra el estado global en todo momento

El `KpiGlobal` está siempre visible en la parte superior, pero en móvil queda oculto al hacer scroll. Un organizador editando costes en el paso 2 no puede ver en tiempo real si el resultado global pasa a positivo o negativo sin hacer scroll hacia arriba.

#### UX-02: La diferencia entre "captado" y "cobrado" no es obvia para usuarios no financieros

El panel de sincronización en `TabIngresos` tiene dos toggles: "Patrocinios captados" y "Patrocinios cobrados". Para un organizador no técnico, la distinción entre ambos no es intuitiva. El texto de ayuda existe pero es pequeño y en mono.

#### UX-03: Los conceptos fijos no muestran el coste prorrateado por corredor

El usuario introduce un coste fijo total (ej. ambulancias: 2.700€) pero no ve cuánto representa por corredor (ej. 4,50€/corredor a 600 inscritos). Esta información es clave para entender el impacto marginal de cada inscripción.

#### UX-04: La pestaña "Historial" es confusa — mezcla cambios automáticos y manuales

`TabHistorial` registra cambios de conceptos via `logCambio`. Sin embargo, los cambios automáticos de sincronización (cuando se actualiza `ingresosExtra` al cambiar patrocinios) no se registran, creando un historial incompleto.

#### UX-05: Nombres internos expuestos al usuario

En la tabla de costes, la columna "Uniforme" (para `modoUniforme`) es un término técnico interno. Debería mostrarse como "Mismo precio en todas las distancias" o con un tooltip más descriptivo.

---

### 3.3 Rendimiento y mantenibilidad

#### PERF-01: `useBudgetLogic` devuelve 35+ valores — hook demasiado grande

El hook retorna `tab, setTab, tramos, setTramos, totalPatConfirmado, totalPatCobrado, totalMerchBeneficio, syncConfig, setSyncConfig, conceptos, setConceptos...` — más de 35 propiedades. Cualquier componente que lo consuma se re-renderiza cuando cambia cualquiera de ellas. Debería dividirse en sub-hooks: `useTramos`, `useConceptos`, `useInscritos`, `useSyncIngresos`.

#### PERF-02: El cálculo de `realTotalInscritos` y `realResultado` duplica los cálculos principales

Hay dos pipelines de cálculo casi idénticos en `useBudgetLogic`: el principal (usado en escenarios) y el "real" (con datos sin escenario). Esto duplica 6 `useMemo` con dependencias distintas. Debería crearse un helper `calcularPipeline(tramos, inscritos, conceptos)` reutilizable.

#### PERF-03: Auto-guardado emite `teg-save-status: "saving"` antes del debounce

El auto-guardado emite el evento `saving` inmediatamente cuando el usuario escribe, no cuando el debounce se dispara. Esto muestra el spinner "Guardando..." con cada pulsación de tecla aunque el guardado no ocurra hasta 2 segundos después.

---

## 4. Flujos de trabajo y mejoras operativas

### 4.1 Flujos actuales

**Configurar tramos y precios:**
1. Ir a pestaña "Inscripciones" → sección "Fases y precios"
2. Editar nombre, fechaFin y precios por distancia en tabla inline
3. Añadir tramo con "+" → se crea con precios por defecto
4. Auto-guardado a los 2s

**Introducir/modificar inscritos:**
1. Misma pestaña "Inscripciones" → sección inferior
2. Inputs numéricos por tramo × distancia
3. Los totales se calculan en tiempo real

**Crear/modificar conceptos:**
1. Pestaña "Costes" → tablas separadas para fijos y variables
2. Editar nombre, importe total (fijo) o €/corredor por distancia (variable)
3. Toggle por distancia para activar/desactivar
4. Reordenar con drag & drop

**Revisar el resultado:**
1. `KpiGlobal` siempre visible: ingresos, costes, resultado
2. Pestaña "P&L": desglose por distancia con tabla
3. Pestaña "Equilibrio": punto de equilibrio por distancia y global

### 4.2 Mejoras propuestas

- **Indicador de margen en tiempo real junto a cada concepto:** Al lado de cada coste fijo, mostrar `€ por corredor (a los inscritos actuales)`. Para variables, mostrar el impacto total actual. Permite detectar qué concepto tiene más peso sin ir al P&L.

- **Semáforo de margen de seguridad en el KpiGlobal:** Mostrar un indicador verde/ámbar/rojo según el margen sobre los costes. Verde > 20%, ámbar 5-20%, rojo < 5%. Actualmente solo se muestra el número, sin contexto de si es "suficiente".

- **Botón "¿Qué pasa si añado 50 inscritos más en TG25?":** Un control deslizante rápido en la pantalla de equilibrio que ajuste los inscritos por distancia y muestre el impacto en el resultado sin salir del wizard.

- **Alerta de coste fijo sin inscritos en alguna distancia:** Si un concepto fijo está marcado para TG7 pero hay 0 inscritos en TG7, el coste fijo aún se prorratea sobre las otras distancias — un comportamiento que puede confundir. Mostrar un badge de aviso en el concepto.

- **Vista de "coste por kilómetro de carrera":** Métrica adicional para contexto: coste total / km totales del evento. Útil para comparativas entre ediciones.

---

## 5. Interconexiones con otros bloques

### 5.1 Estado actual

```
Patrocinadores.pats[]     → useBudgetLogic.totalPatConfirmado/Cobrado → ingresosExtra[1,3]
Camisetas.pedidos[]       → useBudgetLogic.totalMerchBeneficio         → ingresosExtra[2]
Dashboard.rawData         → lee teg_presupuesto_v1_* directamente via getMultiple
Index.jsx                 → lee localStorage directamente para badge de alerta
```

### 5.2 Integraciones propuestas

#### INT-01: Voluntarios → Presupuesto (costes de personal)

**Caso de uso:** El número de voluntarios confirmados debería actualizar automáticamente el coste "Camisetas voluntarios" (id=12 en CONCEPTOS_DEFAULT, actualmente hardcoded a 970€).

**Datos a compartir:**
- `teg_voluntarios_v1_voluntarios` → `count(estado === "confirmado")` × coste por camiseta voluntario

**Cambios mínimos:** Añadir un `syncKey: "voluntarios"` en el concepto id=12 de ingresosExtra, y calcular `totalVoluntariosConfirmados × camCoste.voluntario` en `useBudgetLogic`.

---

#### INT-02: Logística → Presupuesto (costes de material)

**Caso de uso:** Los pedidos de material en el bloque Logística (módulo Pedidos) tienen importes. Debería existir una línea de ingresosExtra (o más bien de costes) que sincronice el total de pedidos de logística.

**Datos a compartir:** `teg_logistica_v1_pedidos` → suma de importes de pedidos confirmados.

**Cambios mínimos:** Nueva línea en CONCEPTOS_DEFAULT de tipo `"fijo"` con `syncKey: "logistica"`.

---

#### INT-03: Presupuesto → Dashboard (métricas financieras detalladas)

**Caso de uso:** El Dashboard muestra el resultado global, pero no desglosa el origen de los ingresos (inscripciones vs patrocinios vs merch) ni el peso de cada grupo de costes (fijos vs variables).

**Datos a compartir:** Exponer desde `useBudgetLogic` o `calculateResultadoFinanciero`: `{pctInscripciones, pctPatrocinios, pctMerch, pctCostosFijos, pctCostesVariables}`.

**Cambios mínimos:** Añadir estos campos al return de `calculateResultadoFinanciero` y consumirlos en `Dashboard.jsx`.

---

#### INT-04: Presupuesto → Index.jsx (alerta correcta incluyendo ingresos extra)

**Caso de uso:** El badge `"!"` en la nav solo considera inscripciones y costes, ignorando patrocinios y merchandising.

**Datos a compartir:** `teg_presupuesto_v1_ingresosExtra` → suma de items con `activo: true`.

**Cambios mínimos:** En `Index.jsx` función `alertasBadges`, leer `teg_presupuesto_v1_ingresosExtra` y sumar `filter(i=>i.activo).reduce((s,i)=>s+i.valor,0)` al cálculo de ingresos.

---

#### INT-05: Proyecto → Presupuesto (fechas de cierre de tramos)

**Caso de uso:** Los tramos de inscripción tienen `fechaFin`. Si el organizador cambia las fechas en el bloque Proyecto (hitos del evento), los tramos de inscripción deberían poder sincronizarse.

**Datos a compartir:** `teg_proyecto_v1_hitos` → filtrar hitos de tipo "inscripción" y mapear a tramos.

**Cambios mínimos:** Campo `hitoId?` en `Tramo` que vincula con un hito del Proyecto. Cuando el hito se actualiza, propagar via `teg-sync`.

---

## 6. Nuevas funciones sugeridas

### 6.1 Escenarios "What If" por número de inscritos

**Descripción funcional:**
Panel lateral o sección inferior en la pestaña Equilibrio con sliders por distancia. El usuario arrastra un slider de "inscritos adicionales en TG25: +50" y ve en tiempo real cómo cambia el resultado, el punto de equilibrio y el margen de seguridad. Debe poder guardar escenarios nombrados para comparar después ("Escenario optimista", "Escenario pesimista").

**Cambios en estado:**
```typescript
interface Scenario {
  id:          string;    // nanoid
  nombre:      string;
  inscritos:   InscritosState;   // override por distancia
  conceptos?:  Concepto[];       // override de costes (escenario de subida de precios)
  createdAt:   string;
  resultado?:  ResultadoState;   // calculado al guardar
}

// En useBudgetLogic:
const [scenarios, setScenarios] = useData("teg_presupuesto_v1_scenarios", []);
const [activeScenarioId, setActiveScenarioId] = useState<string|null>(null);
```

**Pseudocódigo del hook:**
```javascript
// useScenario.js (ya existe parcialmente — extenderlo)
export function useScenario(tramos, conceptos, ingresosExtra, merchandising, maximos) {
  const [scenarios, setScenarios] = useData("teg_presupuesto_v1_scenarios", []);
  const [activeId, setActiveId] = useState(null);
  const active = scenarios.find(s => s.id === activeId) ?? null;

  const saveScenario = (nombre, inscritosOverride) => {
    const id = nanoid();
    const resultado = calculateResultado(
      calculateTotalInscritos(tramos, inscritosOverride),
      calculateIngresosPorDistancia(tramos, inscritosOverride),
      calculateCostesFijos(conceptos, calculateTotalInscritos(tramos, inscritosOverride)),
      calculateCostesVariables(conceptos, calculateTotalInscritos(tramos, inscritosOverride)),
      ingresosExtra.filter(i=>i.activo).reduce((s,i)=>s+i.valor,0)
    );
    setScenarios(prev => [...prev, { id, nombre, inscritos: inscritosOverride, resultado, createdAt: new Date().toISOString() }]);
    return id;
  };

  return { scenarios, active, setActiveId, saveScenario, deleteScenario: (id) => setScenarios(prev => prev.filter(s => s.id !== id)) };
}
```

---

### 6.2 Margen mínimo objetivo con alertas visuales

**Descripción funcional:**
El organizador define un margen mínimo aceptable (ej. 15% sobre los costes totales o un importe fijo de reserva). El `KpiGlobal` muestra un indicador de semáforo y el sistema genera alertas automáticas cuando el margen calculado cae por debajo. En la pestaña Equilibrio aparece una línea de "margen mínimo objetivo" en el gráfico de punto de equilibrio.

**Cambios en estado:**
```typescript
// Añadir a syncConfig o crear nueva entrada en budgetConstants:
interface MargenConfig {
  tipo:        "porcentaje" | "absoluto";
  valor:       number;   // % o €
  alertaActiva: boolean;
}

// Nueva clave:
const [margenConfig, setMargenConfig] = useData("teg_presupuesto_v1_margen", {
  tipo: "porcentaje", valor: 10, alertaActiva: true
});
```

**Implementación en KpiGlobal:**
```jsx
// En KpiGlobal.jsx:
const margenObjetivo = margenConfig.tipo === "porcentaje"
  ? (costes * margenConfig.valor / 100)
  : margenConfig.valor;

const margenActual = resultado.total;
const estadoMargen = margenActual >= margenObjetivo ? "verde"
  : margenActual >= margenObjetivo * 0.5 ? "ambar"
  : "rojo";

const COLORES = { verde: "var(--green)", ambar: "var(--amber)", rojo: "var(--red)" };

return (
  <div className="kpi" style={{ borderColor: COLORES[estadoMargen] }}>
    <div className="kpi-label">Margen sobre objetivo</div>
    <div className="kpi-value" style={{ color: COLORES[estadoMargen] }}>
      {fmt(margenActual - margenObjetivo)}
    </div>
    <div className="kpi-sub">
      Objetivo: {fmt(margenObjetivo)} · Actual: {fmt(margenActual)}
    </div>
  </div>
);
```

---

### 6.3 Historial de versiones del presupuesto por edición

Guardar snapshots completos del presupuesto en momentos clave (al inicio de cada fase de inscripción, mensualmente, o manualmente). Cada snapshot incluye todos los valores calculados. Permite comparar "presupuesto inicial vs realidad a 30 días del evento".

**Cambios mínimos:** Nueva clave `teg_presupuesto_v1_snapshots: Snapshot[]` con función `createSnapshot(label)` que guarda el estado actual serializado.

---

### 6.4 Exportación Excel/PDF con detalle por tramo y concepto

Exportación completa del P&L con:
- Hoja 1: Resumen ejecutivo (resultado, margen, punto de equilibrio)
- Hoja 2: Detalle de inscritos y ingresos por tramo y distancia
- Hoja 3: Costes fijos con prorrateo por distancia
- Hoja 4: Costes variables con detalle por tipo de participante
- Hoja 5: Ingresos extra desglosados

**Implementación:** Usar la librería `xlsx` ya instalada en el proyecto para generar el archivo, siguiendo el mismo patrón que `exportarPatrocinadores.js` en `exportUtils.js`.

---

## 7. Plan de refactor recomendado

### Corto plazo — 1-2 sprints (alto valor, bajo riesgo)

1. **Corregir `alertasBadges` en `Index.jsx`** para incluir ingresos extra activos — fix de 5 líneas de alto impacto visual (INC-01).

2. **Eliminar duplicación de `saveData`** — el autoSave ya cubre todo; simplificar `saveData` para que limpie el timer y fuerce el guardado inmediato (INC-02).

3. **Añadir `removeTramo(id)`** — sin ella el bloque no está completo para el organizador (INC-04).

4. **Añadir el coste prorrateado por corredor** en la vista de conceptos fijos — dato crítico para decisiones operativas (UX-03).

5. **Semáforo de margen en KpiGlobal** — indicador visual verde/ámbar/rojo sobre el resultado. 20 líneas de JSX.

6. **Corregir `emitSaveStatus("saving")` en autoSave** para que emita después del debounce, no antes (PERF-03).

### Medio plazo — refactors estructurales

1. **Unificar `calculateResultadoFinanciero` y `calculateResultado`** — una única función en `budgetUtils.js` usada tanto por `useBudgetLogic` como por Dashboard, eliminando la divergencia de cálculos (INC-03).

2. **Dividir `useBudgetLogic` en sub-hooks** — `useTramos`, `useConceptos`, `useInscritos`, `useSyncIngresos`. Reducir el número de re-renders y facilitar el testing unitario.

3. **Añadir campo `syncKey: "voluntarios"`** en el concepto de "Camisetas voluntarios" para que se actualice automáticamente (INT-01).

4. **Implementar escenarios "What If"** con sliders por distancia — la base ya existe en `useScenario.js` (sección 6.1).

5. **Implementar snapshots/historial de versiones** — clave para auditoría y comparativas entre ediciones.

### Riesgos si no se acometen

- **INC-01 sin corregir:** Alertas falsas de presupuesto negativo aunque el evento sea rentable gracias a patrocinios. Genera desconfianza del organizador en la herramienta.
- **INC-02 sin corregir:** Doble escritura a Neon DB en cada auto-guardado. Con 10+ sesiones activas simultáneas puede saturar el plan Hobby (1.000 req/día).
- **INC-03 sin corregir:** Dashboard y Presupuesto pueden mostrar resultados diferentes para el mismo estado de datos. Crítico para la credibilidad financiera del panel.
- **No hay `removeTramo`:** El organizador no puede eliminar tramos erróneos sin resetear todo el presupuesto.

---

*Informe generado sobre el commit `8d10a9a` de `trailelguerrero/app-carrera`.*
*Revisión recomendada: antes del cierre del Early Bird (30/04/2026).*
