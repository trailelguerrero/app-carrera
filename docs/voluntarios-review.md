# Revisión del bloque Voluntarios (panel)

**Fecha:** Mayo 2026 · `app-carrera` · Trail El Guerrero 2026
**Archivo analizado:** `src/components/blocks/Voluntarios.jsx` (3.692 líneas)
**Archivos relacionados:** `src/pages/VoluntarioPortal.jsx`, `src/pages/Index.jsx`

---

## 1. Resumen del bloque

El bloque Voluntarios resuelve la gestión completa del personal no remunerado del evento: desde el alta inicial hasta el control de presencia el día de carrera. Cubre el ciclo de vida completo del voluntario — registro, confirmación, asignación a puesto, entrega de camiseta y marcado de llegada — así como la planificación de los puestos operativos de la prueba.

**Entidades principales:**
- **Voluntario:** persona con nombre, teléfono, email, talla, estado, rol y asignación a un puesto.
- **Puesto:** posición operativa del evento (avituallamiento, control, seguridad...) con horarios, distancias que atiende, número de voluntarios necesarios y responsable.
- **Asignación:** relación implícita entre voluntario y puesto vía `voluntario.puestoId`.

**Fases de uso:**

| Fase | Acciones típicas |
|------|-----------------|
| Captación (T-90d) | Alta masiva de voluntarios, configuración de puestos y cupos |
| Confirmación (T-30d) | Cambio de estado pendiente → confirmado, ajuste de tallas |
| Día de carrera | Control de llegada al puesto, seguimiento de cobertura en tiempo real |
| Post-evento | Consulta de asistencia, base para la edición siguiente |

Existe un **Portal del Voluntario** (`/voluntarios/mi-ficha`) que permite al propio voluntario registrarse, consultar su ficha, cambiar su PIN y marcar su llegada al puesto. Panel interno y portal comparten la misma clave de base de datos.

---

## 2. Modelo de datos y persistencia

### 2.1 Voluntario

```typescript
interface Voluntario {
  // Identidad
  id:                   number;
  nombre:               string;
  apellidos?:           string;      // Campo opcional — FormularioPublico lo usa, el panel no
  telefono:             string;
  email?:               string;
  talla:                string;      // De TALLAS = ["XXS"..."4XL"]
  
  // Asignación
  puestoId:             number | null;
  rol:                  "responsable" | "apoyo";

  // Estado del acuerdo
  estado:               "pendiente" | "confirmado" | "cancelado" | "ausente";
  fechaRegistro?:       string;

  // Logística
  coche:                boolean;
  notas?:               string;
  telefonoEmergencia?:  string;
  contactoEmergencia?:  string;      // Campo legado — migrado a telefonoEmergencia
  alergias?:            string;
  medicacion?:          string;

  // Día de carrera (escritos desde el portal)
  enPuesto:             boolean;
  horaLlegada:          string | null;
  camisetaEntregada:    boolean;
  
  // Seguridad (escritos solo por el API)
  pinHash?:             string;
  pinPersonalizado?:    boolean;
  sessionToken?:        string;
  sessionTokenExpiry?:  string;
  
  // CRM voluntario
  historial?:           EntradaHistorial[];
  origenImportacion?:   "csv" | null;
}
```

### 2.2 Puesto

```typescript
interface Puesto {
  id:            number;
  nombre:        string;
  tipo:          "Salida/Meta" | "Avituallamiento" | "Control" | "Seguridad" 
                | "Señalización" | "Parking" | "Organización" | "Primeros Auxilios";
  distancias:    ("TG7" | "TG13" | "TG25" | "Todas")[];
  horaInicio:    string;   // "HH:MM"
  horaFin:       string;
  necesarios:    number;   // Cupo objetivo
  responsableId: number | null;
  tiempoLimite?: string;   // Solo controles — hora de corte de carrera
  notas?:        string;
  localizacionId?: number; // Vinculación con bloque Logística (opcional)
}
```

### 2.3 Asignación voluntario-puesto

La asignación es **implícita**: no existe una tabla de asignaciones. Un voluntario está en un puesto si `voluntario.puestoId === puesto.id`. Esto significa:
- Un voluntario solo puede estar en **un puesto** (sin soporte para voluntarios que cubren varios turnos o varios puestos).
- Si se elimina un puesto, los `puestoId` de los voluntarios asignados quedan como IDs huérfanos.
- No hay histórico de cambios de puesto.

### 2.4 Claves de persistencia

| Clave | Tipo | Descripción |
|-------|------|-------------|
| `teg_voluntarios_v1_voluntarios` | `Voluntario[]` | Lista principal |
| `teg_voluntarios_v1_puestos` | `Puesto[]` | Puestos del evento |
| `teg_voluntarios_v1_imgFront` | `string` (blob URL) | Imagen camiseta frontal |
| `teg_voluntarios_v1_imgBack` | `string` (blob URL) | Imagen camiseta dorsal |
| `teg_voluntarios_v1_imgGuiaTallas` | `string` (blob URL) | Guía de tallas para el portal |

---

## 3. Inconsistencias, incongruencias y duplicidades

### 3.1 Voluntarios vs VoluntarioPortal

#### INC-01: `nombre` y `apellidos` separados en el portal, unificados en el panel

**Panel (`VOLUNTARIOS_DEFAULT`):** `nombre: "María García López"` — nombre completo en un único campo.

**Portal (`FormularioPublico`):** `{ nombre: "", apellidos: "" }` — dos campos separados que se concatenan al crear el voluntario.

**Impacto:** El nombre creado desde el panel tiene un formato diferente al creado desde el portal. El buscador del panel filtra por `v.nombre`, mientras que el portal muestra `${v.nombre} ${v.apellidos}`. Si un voluntario se registró desde el portal como `nombre="Juan", apellidos="García López"` pero en el panel aparece como `"Juan"`, los filtros de nombre no coinciden.

**Solución:** Añadir `apellidos?: string` al modelo canónico. En el panel, cuando se muestre o busque, concatenar `nombre + " " + (apellidos || "")`. En el `ModalVoluntario`, separar los campos.

---

#### INC-02: `contactoEmergencia` (legado) vs `telefonoEmergencia`

**Panel:** Campo `telefonoEmergencia` existe en el modal de edición. El campo `contactoEmergencia` es el nombre legado.

**Portal:** Migración automática: `if (v.contactoEmergencia && !v.telefonoEmergencia) { telefonoEmergencia = contactoEmergencia }`. La ficha muestra `v.telefonoEmergencia || v.contactoEmergencia`.

**Impacto:** El panel puede crear voluntarios con `contactoEmergencia` sin `telefonoEmergencia` si se edita con una versión antigua. La migración existe pero no se aplica al cargar desde el panel — solo se aplica en el portal.

**Solución:** Normalizar en `dataService.get("teg_voluntarios_v1_voluntarios")` con un mapper: si `contactoEmergencia` existe y `telefonoEmergencia` no, copiar el valor. Aplicar la misma migración en el panel al cargar datos.

---

#### INC-03: Estado `ausente` existe en el panel pero no en el portal

**Panel:** `const ESTADOS = { pendiente, confirmado, cancelado, ausente }` — 4 estados.

**Portal:** Solo maneja `pendiente`, `confirmado` y `cancelado`. El estado `ausente` se debe establecer manualmente desde el panel. El portal no distingue entre "no llegó" y "canceló con antelación".

**Impacto:** El día de carrera, si un voluntario confirmado no aparece, el organizador marca `ausente` desde el panel. Pero el portal del voluntario no sabe interpretar ese estado y puede mostrar pantallas incorrectas si el voluntario intenta acceder.

**Solución:** Añadir tratamiento de `ausente` en `VoluntarioPortal.jsx` (mostrar mensaje de contacto con organización). Considerar fusionarlo con `cancelado` añadiendo un campo `motivoCancelacion: "anticipado" | "ausente"`.

---

#### INC-04: Cálculo de cobertura con criterios diferentes

**Panel (líneas 619-620):**
```javascript
const cobertura     = p?.necesarios > 0 ? Math.round((vols.length / p.necesarios) * 100) : 0;
const coberturaConf = p?.necesarios > 0 ? Math.round((confirmados / p.necesarios) * 100) : 0;
```
`cobertura` incluye todos (pendientes + confirmados). `coberturaConf` solo confirmados.

**Index.jsx (línea 561-563):**
```javascript
const asign = vols.filter(v => v.puestoId === p.id && v.estado !== "cancelado").length;
return p.necesarios > 0 && asign / p.necesarios < 0.5;
```
El badge de `Index.jsx` usa todos menos cancelados (incluye pendientes como si fueran cubiertos). El panel muestra `coberturaConf` (solo confirmados) para las alertas internas pero `cobertura` para la barra de progreso.

**Impacto:** El badge en la nav puede mostrar 0 puestos críticos mientras el panel interno muestra 3 puestos en alerta. Un organizador puede creer que todo va bien mirando la nav, aunque haya problemas reales.

**Solución:** Unificar en una función compartida `calcularCoberturaPuesto(puesto, voluntarios)` en `budgetUtils.js` o en un nuevo `voluntariosUtils.js`. La función debería usar `estado !== "cancelado"` de forma coherente en ambos sitios.

---

#### INC-05: `localizacionId` en Puesto — campo semi-implementado

Los puestos tienen `localizacionId` vinculado al bloque Logística pero es opcional y no se muestra ni edita en el modal de edición del puesto del panel. La API del portal lee `teg_localizaciones_v1` para obtener el material asignado al puesto, pero si `localizacionId` no está asignado, el voluntario no ve el material de su puesto.

**Solución:** Añadir selector de localización en el modal de edición del puesto, mostrando las localizaciones disponibles de `teg_logistica_v1_mat`.

---

#### INC-06: `rol` del voluntario con valores inconsistentes

**Panel:** `rol: "responsable" | "apoyo"`.

**Portal:** Solo muestra el campo `rol` en la ficha pero no permite cambiarlo. `FormularioPublico` asigna siempre `rol: "apoyo"` al registrarse.

**Impacto:** El organizador asigna "responsable" manualmente, pero el portal nunca lo presenta como tal de forma diferenciada. En el panel, el "responsable" vinculado a un puesto se gestiona via `puesto.responsableId` (ID del voluntario), no via `voluntario.rol`. Hay redundancia entre `voluntario.rol === "responsable"` y `puesto.responsableId === voluntario.id`.

**Solución:** Eliminar `voluntario.rol` y unificar en `puesto.responsableId`. El panel ya usa esta relación correctamente.

---

### 3.2 Voluntarios vs alertas de Index.jsx

| Criterio | Panel (Voluntarios.jsx) | Index.jsx (badge) |
|----------|------------------------|-------------------|
| Qué cuenta como "cubierto" | Todos menos cancelados (para `cobertura`) o solo confirmados (para `coberturaConf`) | Todos menos cancelados |
| Umbral de "crítico" | `coberturaConf < 50%` (solo confirmados) | `asign / necesarios < 0.5` (incluye pendientes) |
| Qué se muestra al usuario | Alerta en rojo si `coberturaConf < 50%` | Badge con número de puestos críticos |
| Riesgo | Panel más estricto que badge → el badge puede ocultar problemas reales | Badge puede mostrar 0 puestos críticos aunque haya muchos pendientes sin confirmar |

**Corrección recomendada:** El badge de `Index.jsx` debería usar `estado === "confirmado"` en lugar de `estado !== "cancelado"` para ser coherente con las alertas del panel.

---

## 4. Flujos de trabajo y UX en el panel

### 4.1 Flujos actuales

**Crear/editar voluntarios:**
1. Botón "+" o "Añadir voluntario" → Modal con nombre, teléfono, email, talla, puesto, estado
2. Guardar → auto-guardado a los 2s
3. También se puede importar desde CSV (📥 Importar CSV, añadido en sprint 2)

**Crear/editar puestos:**
1. Pestaña "Puestos" → tabla de puestos existentes
2. Botón "+" → modal con nombre, tipo, distancias, horario, cupo, notas
3. No hay forma de duplicar un puesto existente (muy útil para avituallaminetos similares)

**Asignar voluntarios a puestos:**
1. Desde la ficha del voluntario → cambiar `puestoId` en el modal
2. Desde la vista de puestos → click en un puesto → ver voluntarios asignados y arrastrar/asignar
3. No hay drag & drop ni asignación masiva desde la vista de puestos

**Gestionar cancelaciones:**
1. Abrir ficha del voluntario → cambiar estado a "cancelado"
2. El puesto queda sin ese voluntario (conteo actualizado automáticamente)
3. No hay notificación al voluntario desde el panel

**Revisar cobertura global:**
1. Dashboard de Voluntarios: KPIs de cobertura, confirmados, pendientes
2. Lista de puestos con % de cobertura por barra de progreso
3. Alertas de puestos con `coberturaConf < 50%`

### 4.2 Problemas de UX

**UX-01: Asignación de voluntario a puesto requiere abrir la ficha completa**
Para asignar 10 voluntarios a sus puestos hay que abrir cada ficha individualmente, cambiar el puesto y guardar. No hay vista de "arrastrar voluntario a puesto" ni asignación masiva.

**UX-02: No hay feedback visual de voluntarios sin puesto asignado**
Un voluntario con `puestoId: null` aparece en la lista general pero no hay filtro rápido de "sin asignar". Con 150 voluntarios, encontrarlos requiere scrollear toda la lista.

**UX-03: La vista de puestos no muestra quiénes están asignados de forma directa**
Hay que hacer click en el puesto para ver la lista de voluntarios asignados. No hay vista de "mapa de puestos" donde se vean todos los puestos y sus voluntarios en una sola pantalla.

**UX-04: Estado "ausente" no tiene flujo específico el día de carrera**
El día de carrera, el organizador necesita marcar rápidamente quién llegó y quién no. No hay un "modo día de carrera" en el panel que filtre a los confirmados y muestre solo "llegó / no llegó".

**UX-05: El reset de PIN del voluntario está en la ficha pero no es visible de un vistazo**
La función de reset de PIN está en la pestaña de seguridad dentro del modal. En una situación de urgencia (voluntario olvidó su PIN en el día de carrera), el organizador tarda en encontrarlo.

---

## 5. Mejoras operativas sugeridas

### 5.1 Vistas nuevas

**Vista "Tablero de cobertura":** Una cuadrícula con todos los puestos ordenados por criticidad. Cada celda muestra el puesto con sus voluntarios confirmados como chips. Los puestos en rojo primero. Permite drag & drop para reasignar.

**Vista "Día de carrera":** Filtro automático a voluntarios confirmados, ordenados por puesto y hora de inicio. Cada voluntario tiene un toggle "✅ En puesto" y el campo `horaLlegada`. Sin otras opciones visibles para reducir ruido.

**Vista "Sin asignar":** Filtro de voluntarios con `puestoId === null`. CTA directo para asignar cada uno.

### 5.2 Filtros y ordenaciones útiles

- Filtro rápido: Sin puesto / Por tipo de puesto / Por distancia
- Ordenar por: Hora de inicio del puesto / Criticidad del puesto / Apellido
- Búsqueda con prefijos: `puesto:Meta`, `estado:pendiente`, `rol:responsable`

### 5.3 Mejoras para el día de carrera

- **Checklist rápido por puesto:** Vista compacta por puesto, marca de llegada con 1 click
- **Modo "reubicar" voluntario:** Seleccionar voluntario → mostrar puestos con hueco → asignar en 2 clicks
- **Alerta de puesto a punto de abrir sin cobertura:** X minutos antes de `horaInicio` del puesto, si cobertura < 100%, alerta en el dashboard

### 5.4 Lista priorizada de mejoras

**Corto plazo (UI/copy, sin refactor de modelo):**
1. Filtro "Sin puesto asignado" en la lista de voluntarios
2. Vista compacta "Día de carrera" (toggle llegada por puesto)
3. Botón "Reset PIN" visible en el header de la ficha del voluntario (no enterrado en modal)
4. Duplicar puesto (clonar con incremento de nombre)
5. Tooltip en el badge de cobertura explicando los criterios (confirmados vs totales)

**Medio plazo (cambios de modelo):**
6. Separar `nombre` y `apellidos` como campos distintos
7. Función `calcularCoberturaPuesto` compartida entre panel y Index.jsx
8. Drag & drop en el tablero de puestos para asignar voluntarios
9. Campo `localizacionId` editable en el modal de puestos
10. Eliminar redundancia `voluntario.rol` / `puesto.responsableId`

---

## 6. Interconexiones con otros bloques

### 6.1 Estado actual

```
Voluntarios.voluntarios[]
  → Camisetas: rawVols leído para generar pedidos (lectura directa)
  → Camisetas: camisetaEntregada sincronizado al marcar entrega
  → Dashboard: volConfirmados, coberturaVol, puestosAlerta
  → Portal API: lee/escribe voluntarios directamente vía teg_voluntarios_v1_voluntarios
```

### 6.2 Integraciones propuestas

#### INT-01: Voluntarios → Logística (material por puesto el día de carrera)

**Caso de uso:** El voluntario de un avituallamiento necesita saber qué material tiene asignado a su puesto. Hoy ve la lista de material en el portal pero solo si `localizacionId` está configurado.

**Datos necesarios:** `puesto.localizacionId` → `teg_logistica_v1_asig` → lista de materiales.

**Cambios mínimos:** El campo ya existe en el modelo de `Puesto`. Solo falta:
1. Hacer `localizacionId` editable en el modal de puestos del panel
2. Mostrar la lista de material en la ficha del voluntario (ya existe en el portal)

---

#### INT-02: Voluntarios → Presupuesto (costes variables por voluntario)

**Caso de uso:** El presupuesto tiene un concepto variable "Camiseta voluntario" con coste por persona. Debería actualizarse automáticamente con el número de voluntarios confirmados.

**Datos necesarios:** `count(voluntarios.filter(v => v.estado === "confirmado"))` × `coste_camiseta_voluntario`.

**Cambios mínimos:** Añadir `syncKey: "voluntarios"` en el concepto de camisetas de voluntarios en `CONCEPTOS_DEFAULT`. En `useBudgetLogic`, añadir `totalVoluntariosConfirmados × camCoste.voluntario` como variable sincronizable.

---

#### INT-03: Voluntarios → Presupuesto (costes de catering/avituallamiento por puesto)

**Caso de uso:** Varios puestos tienen comida y agua para los voluntarios como coste operativo. El número de voluntarios por puesto debería actualizar automáticamente la línea de coste de avituallamiento.

**Datos necesarios:** `voluntariosPorPuesto × costePorVoluntarioPorPuesto`.

**Cambios mínimos:** Nuevo campo `costePorVoluntario?: number` en `Puesto`. Nuevo `syncKey: "avituallamiento_voluntarios"` en Presupuesto.

---

#### INT-04: Voluntarios → DíaCarrera (presencia en tiempo real)

**Caso de uso:** El coordinador del evento quiere ver en el panel del Día de Carrera qué puestos están cubiertos y cuáles están en riesgo en tiempo real.

**Datos necesarios:** `voluntarios.filter(v => v.enPuesto === true)` agrupados por `puestoId`.

**Cambios mínimos:** El panel DíaCarrera ya puede leer `teg_voluntarios_v1_voluntarios` y calcular la cobertura real en tiempo real. Solo falta la vista y el pollin/teg-sync.

---

#### INT-05: Voluntarios → Logística (incidencias por puesto)

**Caso de uso:** Si hay una incidencia en el Punto Control KM 13 y el voluntario responsable necesita información, debería poder acceder a ella desde su ficha en el portal.

**Datos necesarios:** `teg_logistica_v1_inc` filtrado por `incidencia.puestoId === voluntario.puestoId`.

**Cambios mínimos:** Añadir `puestoId` al modelo de `Incidencia` en Logística. Mostrar incidencias activas del puesto en la ficha del voluntario en el portal.

---

## 7. Nuevas funciones sugeridas

### 7.1 Mapa de cobertura por puesto (Tablero visual)

**Descripción funcional:**
Nueva pestaña "Tablero" en el bloque Voluntarios que muestra una cuadrícula visual de todos los puestos. Cada puesto es una tarjeta que muestra:
- Nombre del puesto y tipo
- Hora de inicio
- Barra de progreso confirmados/necesarios
- Chips de voluntarios asignados (con color según estado: verde=confirmado, ámbar=pendiente)
- Zona de drop para arrastrar un voluntario desde la lista lateral
- Color de fondo rojo/ámbar/verde según cobertura

**Cambios en modelo:** Ninguno. Solo lectura de datos existentes.

**Pseudocódigo del componente:**
```jsx
function TablLeroCobertura({ voluntarios, puestos, onReasignar }) {
  const [dragging, setDragging] = useState(null);

  const puestosConStats = puestos.map(p => {
    const asignados = voluntarios.filter(v => v.puestoId === p.id && v.estado !== "cancelado");
    const confirmados = asignados.filter(v => v.estado === "confirmado");
    const pct = p.necesarios > 0 ? Math.round(confirmados.length / p.necesarios * 100) : 0;
    return { ...p, asignados, confirmados, pct };
  }).sort((a, b) => a.pct - b.pct); // más críticos primero

  const sinAsignar = voluntarios.filter(v => !v.puestoId && v.estado !== "cancelado");

  return (
    <div style={{ display: "flex", gap: "1rem" }}>
      {/* Panel lateral: voluntarios sin asignar */}
      <div style={{ width: 200, flexShrink: 0 }}>
        <div className="section-title">Sin asignar ({sinAsignar.length})</div>
        {sinAsignar.map(v => (
          <div key={v.id}
            draggable
            onDragStart={() => setDragging(v)}
            className="vol-chip draggable">
            {v.nombre}
          </div>
        ))}
      </div>
      {/* Tablero de puestos */}
      <div className="tablero-grid">
        {puestosConStats.map(p => (
          <div key={p.id}
            className={`puesto-card ${p.pct >= 100 ? "verde" : p.pct >= 50 ? "ambar" : "rojo"}`}
            onDragOver={e => e.preventDefault()}
            onDrop={() => { if (dragging) { onReasignar(dragging.id, p.id); setDragging(null); } }}>
            <div className="puesto-header">
              <span>{p.nombre}</span>
              <span className="mono">{p.horaInicio}</span>
            </div>
            <div className="cobertura-bar">
              <div style={{ width: `${Math.min(p.pct, 100)}%` }} />
            </div>
            <div className="vol-chips">
              {p.asignados.map(v => (
                <span key={v.id} className={`chip ${v.estado}`}>{v.nombre.split(" ")[0]}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### 7.2 Detección automática de subcobertura/sobrecobertura con sugerencias

**Descripción funcional:**
Una función que analiza el estado de asignaciones y sugiere reubicaciones: si el puesto A tiene 8 voluntarios pero solo necesita 4, y el puesto B tiene 1 voluntario pero necesita 4, el sistema sugiere "Reubicar 2 voluntarios de Zona de Salida/Meta a Avituallamiento KM 16". Las sugerencias se muestran en una card amarilla en el dashboard de Voluntarios.

**Cambios en modelo:** Ninguno.

**Pseudocódigo:**
```javascript
function generarSugerenciasReubicacion(puestos, voluntarios) {
  const stats = puestos.map(p => {
    const libres = voluntarios.filter(v => v.puestoId === p.id && v.estado !== "cancelado");
    const confirmados = libres.filter(v => v.estado === "confirmado");
    const exceso = Math.max(0, confirmados.length - p.necesarios);
    const deficit = Math.max(0, p.necesarios - confirmados.length);
    return { ...p, exceso, deficit, confirmados, libres };
  });

  const conExceso  = stats.filter(p => p.exceso > 0).sort((a, b) => b.exceso - a.exceso);
  const conDeficit = stats.filter(p => p.deficit > 0).sort((a, b) => b.deficit - a.deficit);

  const sugerencias = [];
  for (const destino of conDeficit) {
    for (const origen of conExceso) {
      if (sugerencias.length >= 5) break;
      const movibles = Math.min(origen.exceso, destino.deficit);
      if (movibles > 0) {
        const candidatos = origen.confirmados.filter(v => v.rol !== "responsable").slice(0, movibles);
        sugerencias.push({
          tipo: "reubicacion",
          desde: origen.nombre,
          hasta: destino.nombre,
          candidatos: candidatos.map(v => ({ id: v.id, nombre: v.nombre })),
          n: movibles,
        });
      }
    }
  }
  return sugerencias;
}
```

---

### 7.3 Exportación para coordinadores de tramo

Genera un PDF/CSV por cada tramo (TG7, TG13, TG25) con los voluntarios asignados a los puestos que atienden esa distancia, incluyendo nombre, teléfono, puesto y hora. Diseñado para imprimir y dar al coordinador de cada distancia.

---

### 7.4 Detección de duplicados en el registro

Al añadir un voluntario o al importar desde CSV, verificar si existe otro con el mismo teléfono o email y mostrar una alerta de posible duplicado antes de guardar.

---

## 8. Plan de refactor recomendado

### Corto plazo — sin cambios de modelo

1. **Filtro "Sin puesto asignado"** — botón rápido en la barra de filtros para ver voluntarios con `puestoId === null`.
2. **Unificar criterio de cobertura** — `calcularCoberturaPuesto(p, voluntarios)` en `voluntariosUtils.js` compartida con `Index.jsx`.
3. **Botón "Reset PIN" en header de la ficha** — acceso rápido sin enterrar en modal.
4. **Duplicar puesto** — botón clonar en la lista de puestos.
5. **Migración de `contactoEmergencia`** — ejecutar la normalización al cargar datos en el panel.

### Medio plazo — cambios de modelo y arquitectura

6. **Separar `nombre` y `apellidos`** en el modelo canónico del voluntario.
7. **Eliminar `voluntario.rol`** y unificar en `puesto.responsableId`.
8. **Campo `localizacionId` editable** en el modal de puestos.
9. **Tablero de cobertura con drag & drop** (función 7.1).
10. **Sugerencias de reubicación automáticas** (función 7.2).
11. **Integración presupuesto** — `syncKey: "voluntarios"` para actualizar coste de camisetas.

### Riesgos operativos si no se actúan

- **Divergencia panel/badge (INC-04):** Un organizador puede pensar que la cobertura está OK mirando el badge (que incluye pendientes) cuando en realidad hay puestos con 0 voluntarios confirmados. En la semana de carrera esto es crítico.

- **Asignación manual escalofriante con 150+ voluntarios:** Sin el tablero de cobertura ni la detección de subrecobertura, el organizador debe revisar cada puesto manualmente. A T-7 días, con cambios constantes, el riesgo de dejar un puesto sin cubrir es real.

- **Modelo desalineado panel/portal (INC-01, INC-02):** Voluntarios creados desde el portal pueden mostrar `nombre` incompleto en el panel. En una situación de emergencia el día de carrera, encontrar a un voluntario por nombre puede fallar.

- **`puestoId` huérfano al eliminar puestos:** Si se reestructuran los puestos a T-30 días, los `puestoId` de los voluntarios apuntarán a puestos inexistentes, mostrando "Sin puesto" en el panel pero con un ID guardado. No hay validación al eliminar un puesto.

---

*Informe generado sobre el commit `3075347` de `trailelguerrero/app-carrera`.*
*Revisión recomendada: al inicio del período de confirmación de voluntarios (julio 2026).*
