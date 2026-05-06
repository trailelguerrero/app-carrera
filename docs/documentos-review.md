# Revisión del bloque Documentos

**Fecha:** Mayo 2026 · `app-carrera` · Trail El Guerrero 2026
**Archivo analizado:** `src/components/blocks/Documentos.jsx` (1.489 líneas)

---

## 1. Resumen del bloque

El bloque Documentos gestiona **toda la documentación legal y administrativa del evento**: permisos, seguros, licencias y certificaciones. Para un evento de trail running en terreno público como Trail El Guerrero, este es el bloque de mayor riesgo legal — sin el permiso del Ayuntamiento o sin el seguro de RC no se puede celebrar la prueba.

Se divide en dos entidades:
- **Documentos generales:** archivos subidos por el organizador (PDFs, imágenes) agrupados por categoría.
- **Gestiones legales:** trámites burocráticos predefinidos con estado de tramitación, fecha de vencimiento y notas.

### Categorías de documentos

| Categoría | Subcategorías típicas |
|-----------|----------------------|
| Permisos y licencias | Ayuntamiento, CCAA, Guardia Civil, SEPRONA |
| Seguros | RC, Accidentes, Voluntarios |
| Documentación deportiva | Licencia RFEA, Aval Federación, Reglamento |
| Salud y seguridad | Plan de emergencias, Cobertura médica |
| Contratos | Cronometraje, Catering, Medios |
| Otros | Logotipo, Memorias, Otros |

### Gestiones legales predefinidas (GESTIONES_DEFAULT)

1. Autorización Ayuntamiento de Candeleda
2. Aval Federación de Atletismo Castilla y León
3. Seguro de Responsabilidad Civil
4. Permiso de uso monte público (Junta CyL)
5. Servicio médico Cruz Roja

---

## 2. Modelo de datos y estados

### 2.1 Documento

```typescript
interface Documento {
  id:               number;
  nombre:           string;
  categoria:        string;       // id de CATEGORIAS
  subcategoria?:    string;
  emisor?:          string;       // Organismo que emite el documento
  estado:           EstadoDoc;
  fechaVencimiento?: string;      // ISO date "YYYY-MM-DD"
  nota?:            string;
  archivos?:        ArchivoDoc[]; // Adjuntos via Vercel Blob
  creadoEn?:        string;       // ISO datetime de creación
}

interface ArchivoDoc {
  nombre:    string;
  url:       string;              // URL de Vercel Blob
  mime:      string;
  size:      number;
  subidoEn:  string;              // ISO datetime
}
```

### 2.2 Gestión legal

```typescript
interface GestionLegal {
  id:               number;
  nombre:           string;       // Descripción del trámite
  subcategoria:     string;       // Organismo: "Ayuntamiento", "CCAA", etc.
  estado:           EstadoDoc;    // Mismo enum que Documento
  fechaVencimiento: string;       // ISO date — obligatoria
  nota?:            string;
  url?:             string;       // Enlace a web del organismo
  fechaSubida?:     string;       // ISO datetime — cuando se aportó documentación
}
```

### 2.3 Estados

```typescript
type EstadoDoc =
  | "pendiente"   // Sin tramitar
  | "en_tramite"  // En proceso
  | "enviado"     // Documentación enviada al organismo
  | "firmado"     // Firmado digitalmente
  | "aprobado"    // Aprobado por el organismo
  | "denegado"    // Rechazado
  // + estados fantasma:
  | "vigente"     // Usado en el código pero NOT en ESTADOS_DOC (ver INC-01)
  | "vencido"     // Asignado automáticamente pero NOT en ESTADOS_DOC (ver INC-01)
```

### 2.4 Cálculo de vencimiento

```javascript
// Documentos.jsx
const diasHasta = (iso) => {
  if (!iso) return null;
  return Math.ceil((new Date(iso) - new Date()) / 86400000);
};

// Auto-marcar como vencido al cargar (línea 131):
if (d.fechaVencimiento && d.estado !== "vigente" && d.estado !== "vencido") {
  if (Math.ceil((new Date(d.fechaVencimiento) - hoy) / 86400000) < 0)
    return { ...d, estado: "vencido" };
}
```

**Problema:** `hoy` en el auto-marcado se calcula en el `useEffect` pero `diasHasta` usa `new Date()` en tiempo real. Si el componente se monta a las 23:59 y el usuario usa el bloque a las 00:01 del día siguiente, `hoy` queda desactualizado pero `diasHasta` es correcto. Inconsistencia similar al bug `TODAY` del bloque Proyecto.

---

## 3. Inconsistencias y problemas

### INC-01: Estados "vigente" y "vencido" no están en ESTADOS_DOC

`ESTADOS_DOC` define 6 estados: `pendiente`, `en_tramite`, `enviado`, `firmado`, `aprobado`, `denegado`. **Sin embargo**, el código usa `"vigente"` y `"vencido"` en múltiples lugares:

```javascript
// Documentos.jsx línea 134:
if (d.estado !== "vigente" && d.estado !== "vencido") { ... }

// vencidos filter (línea 424):
return ndias !== null && ndias < 0 && doc.estado !== "aprobado";
// Nota: NO excluye "vigente" — un documento "vigente" con fecha pasada sí aparece como vencido
```

`"vigente"` existe como estado legacy en datos guardados pero no en el enum actual. Al llamar `getEstadoCfg("vigente")`, devuelve el default (`ESTADOS_DOC[0]` = `"pendiente"`), mostrando el documento en gris como si estuviera pendiente aunque esté vigente.

`"vencido"` se asigna automáticamente al cargar, pero al abrirse el selector de estado en la edición del documento, no aparece `"vencido"` como opción. Si el usuario edita el documento, pierde el estado `"vencido"` porque el selector no lo lista.

---

### INC-02: Badge de Index.jsx incluye gestiones denegadas — el bloque no

**Index.jsx (línea 569-581):**
```javascript
// Solo cuenta vencidos, NO denegados
const docsV = docs.filter(d =>
  d.fechaVencimiento && d.estado !== "vigente" &&
  Math.ceil(...) < 0
).length;
```

**Bloque Documentos.jsx (línea 416):**
```javascript
const gestionesCriticas = gestiones.filter(g => g.estado === "denegado");
```

El bloque muestra `gestionesCriticas` (denegadas) como urgentes, pero `Index.jsx` no las incluye en el badge. Una gestión denegada aparece como urgente dentro del bloque pero el badge de la nav no lo refleja.

---

### INC-03: Cálculo de vencimiento doble — `hoy` estático y `new Date()` dinámico

En el `useEffect` de carga (línea 130):
```javascript
const hoy = new Date(); // evaluado UNA VEZ al montar
```

En `diasHasta` (línea 83):
```javascript
return Math.ceil((new Date(iso) - new Date()) / 86400000); // dinámico
```

En el filtro `vencidos` (línea 424):
```javascript
return ndias !== null && ndias < 0 && doc.estado !== "aprobado";
// ndias = diasHasta(...) = usa new Date() dinámico
```

El auto-marcado de "vencido" al cargar usa `hoy` estático; las alertas de la UI usan `diasHasta` dinámico. Si el bloque lleva abierto mucho tiempo, puede mostrar un documento como "próximo a vencer" sin que el auto-marcado lo haya convertido a "vencido" todavía.

---

### INC-04: `fechaSubida` en GESTIONES_DEFAULT tiene `new Date(0)` — epoch Unix

```javascript
// GESTIONES_DEFAULT línea 41:
{ ..., fechaSubida: new Date(0).toISOString() }
// → "1970-01-01T00:00:00.000Z"
```

Este valor se usa en la lógica de "documentación aportada". Un campo con fecha 1970 puede confundir cualquier comparación de fechas relativas y muestra una fecha absurda en la UI si se renderiza.

---

### INC-05: No hay diferenciación entre "vencido por fecha" y "denegado por organismo"

Ambas situaciones se tratan como urgentes, pero tienen implicaciones muy diferentes:
- Un documento vencido puede renovarse fácilmente.
- Una gestión denegada puede requerir recurso, nueva solicitud o cambio de proveedor.

La UI mezcla ambos en el panel de "urgentes" sin indicar la causa del problema.

---

### INC-06: `url` en GestionLegal confunde enlace web con adjunto

El campo `url` en gestiones se usa para "enlace a la web del organismo" (ej: sede electrónica del Ayuntamiento), pero visualmente aparece en el mismo lugar que los adjuntos de los documentos normales. Un organizador puede confundirlo con un adjunto.

---

## 4. Flujos de trabajo

### 4.1 Alta de documento

1. Click `+ Nuevo documento` → seleccionar categoría → modal con nombre, subcategoría, emisor, estado, fecha de vencimiento, notas
2. Guardar → aparece en la categoría seleccionada
3. Subir adjuntos → en la ficha del documento ya creado, botón "Adjuntar"

**Problema:** La subida de adjuntos es un paso separado. El organizador tiene que crear el documento primero y luego adjuntar, en vez de hacerlo todo en un paso.

### 4.2 Actualización de gestiones legales

1. Hacer click en la gestión → ficha de detalle con campo `estado`
2. Cambiar estado, añadir nota, subir URL del documento aportado
3. Guardar

**Problema:** No hay campo para adjuntar el PDF del permiso directamente en la gestión. Solo hay un campo de URL, lo que obliga a usar un enlace externo (Google Drive, etc.) en lugar de subir el archivo al panel.

### 4.3 Renovación de documento vencido

No hay flujo específico de renovación. El organizador tiene que:
1. Editar el documento
2. Cambiar estado manualmente (de `"vencido"` a `"en_tramite"`)
3. Actualizar la fecha de vencimiento

**Problema grave:** `"vencido"` no está en ESTADOS_DOC, por lo que al editar, el selector muestra `"pendiente"` en lugar de `"vencido"`. El organizador no sabe que el estado actual es "vencido" hasta que lo busca.

### 4.4 Problemas de UX globales

- **Densidad alta:** La vista de categorías muestra todos los documentos en lista sin separación visual clara entre categorías.
- **Sin indicación de urgencia en la lista:** Un documento próximo a vencer no tiene ninguna señal visual en la lista general hasta que se entra en él.
- **Sin filtro rápido:** No hay forma de ver "todos los documentos que vencen en los próximos 30 días" de forma global.
- **Sin fecha de aprobación separada de fecha de vencimiento:** Solo hay `fechaVencimiento`, no `fechaAprobacion`. Un seguro aprobado el 15/05 con validez hasta el 29/08 no registra cuándo fue aprobado.

---

## 5. Mejoras operativas

### 5.1 Semáforo de riesgo legal global

Un KPI en la parte superior del bloque que combine el estado de todas las gestiones legales críticas (permiso Ayuntamiento, seguro RC, aval RFEA) en un único indicador:

| Estado | Semáforo | Criterio |
|--------|---------|---------|
| ✅ Verde | Todo OK | Todas las gestiones críticas en `aprobado` |
| 🟡 Ámbar | Atención | Alguna gestión en trámite o próxima a vencer (<30 días) |
| 🔴 Rojo | Riesgo | Alguna gestión denegada o vencida |

### 5.2 Vista "Próximos vencimientos" consolidada

Una vista única que cruza documentos y gestiones, ordenada por días hasta vencimiento, mostrando:
- Nombre del documento/gestión
- Días hasta vencer (con color)
- Estado actual
- CTA de "Renovar" o "Tramitar"

### 5.3 Alertas escalonadas por tiempo

Añadir umbrales configurables de alerta: 60 / 30 / 15 / 7 días antes del vencimiento, con distintos colores y niveles de urgencia en el panel.

### 5.4 Checklist exportable para autoridades

Generar un PDF o tabla resumen de todos los documentos con estado para presentar en reuniones con organizaciones de montaña o federaciones.

---

## 6. Interconexiones

### 6.1 Proyecto → Documentos

**Estado actual:** El bloque Proyecto muestra gestiones legales en `TabDash` (lectura de `teg_documentos_v1_gestiones`), pero no hay vinculación inversa — una gestión denegada no genera automáticamente una tarea en Proyecto.

**Mejora:** Campo `tareasVinculadas: number[]` en `GestionLegal` o en `Documento`. Al denegaruna gestión, ofrecer "Crear tarea en Proyecto" que pre-rellene título, área=`"permisos"` y prioridad=`"alta"`.

### 6.2 DíaCarrera

**Impacto directo:**
- Sin `"aprobado"` en el permiso del Ayuntamiento → la carrera no puede celebrarse.
- Sin seguro RC aprobado → la RFEA no otorga el aval y la prueba pierde el amparo federativo.
- Sin cobertura médica → la carrera no puede empezar según el reglamento.

**Mejora:** En el bloque Dashboard y en el panel del Día de Carrera, mostrar un aviso bloqueante si cualquiera de las 3 gestiones críticas (`id` 1, 2, 3 de GESTIONES_DEFAULT) no está en estado `"aprobado"`.

### 6.3 Presupuesto

Las gestiones tienen coste (el seguro RC puede costar 800-2000€). Actualmente no hay vínculo entre `GestionLegal` y ningún concepto de gasto en Presupuesto.

**Mejora:** Campo `presupuestoConceptoId?: number` en `GestionLegal` para vincular con el bloque Presupuesto.

---

## 7. Nuevas funciones

### 7.1 Timeline por documento / gestión

**Descripción:** Cada documento o gestión tiene un historial de cambios de estado con timestamps, similar al historial implementado en el bloque Proyecto. Permite ver la evolución completa: `pendiente (1 ene)` → `en_tramite (15 feb)` → `enviado (1 mar)` → `aprobado (15 mar)`.

**Datos necesarios:**
```typescript
interface EntradaHistorialDoc {
  id:      string;
  fecha:   string;  // ISO datetime
  campo:   "estado" | "nota" | "archivo_subido";
  antes?:  string;
  despues: string;
}

// Añadir a Documento y GestionLegal:
historial?: EntradaHistorialDoc[];
```

**Implementación en `saveGestion`:**
```javascript
const saveGestion = (gst) => {
  const anterior = gestiones.find(g => g.id === gst.id);
  const entrada = anterior && anterior.estado !== gst.estado ? {
    id:      String(Date.now()),
    fecha:   new Date().toISOString(),
    campo:   "estado",
    antes:   anterior.estado,
    despues: gst.estado,
  } : null;
  const next = gestiones.map(g => g.id === gst.id
    ? { ...gst, historial: [...(g.historial||[]), ...(entrada?[entrada]:[])].slice(-30) }
    : g);
  setGestiones(next);
  dataService.set(LS_KEY + "_gestiones", next).then(() => dataService.notify());
};
```

**En la UI:**
```jsx
{Array.isArray(g.historial) && g.historial.length > 0 && (
  <div style={{ marginTop:".75rem", borderTop:"1px dashed var(--border)", paddingTop:".6rem" }}>
    <div className="mono xs muted" style={{ marginBottom:".4rem" }}>🕐 Historial</div>
    {[...g.historial].reverse().map(e => (
      <div key={e.id} style={{ display:"flex", gap:".5rem", padding:".25rem 0",
        borderBottom:"1px solid var(--border)", fontSize:"var(--fs-xs)" }}>
        <span className="mono muted">{new Date(e.fecha).toLocaleDateString("es-ES")}</span>
        <span>{ESTADOS_DOC.find(s=>s.id===e.antes)?.label||e.antes} → {ESTADOS_DOC.find(s=>s.id===e.despues)?.label||e.despues}</span>
      </div>
    ))}
  </div>
)}
```

---

### 7.2 Adjuntos en gestiones legales

**Descripción:** Las gestiones legales solo tienen un campo `url` de texto libre, mientras los documentos generales tienen un sistema completo de adjuntos via Vercel Blob. Unificar para que las gestiones también puedan tener adjuntos (el PDF del permiso, el escaneado del seguro, etc.).

**Datos necesarios:** Añadir `archivos?: ArchivoDoc[]` a `GestionLegal` — mismo shape que en `Documento`.

**Cambio mínimo en la UI de gestiones:**

Añadir el mismo componente `SeccionAdjuntos` que ya existe para documentos normales a la ficha de cada gestión legal. El componente ya está implementado — solo necesita ser reutilizado con la fuente de datos de gestiones.

```jsx
// En la ficha de GestionLegal:
<SeccionAdjuntos
  doc={gst}                  // Mismo shape si tiene archivos[]
  onUpdate={(updated) => {   // Handler de actualización para gestiones
    const next = gestiones.map(g => g.id === updated.id ? updated : g);
    setGestiones(next);
    dataService.set(LS_KEY + "_gestiones", next);
  }}
  maxSize={MAX_FILE_SIZE}
/>
```

---

## 8. Plan de refactor

### Inmediato — sin cambios de modelo

1. **Añadir `"vigente"` y `"vencido"` a `ESTADOS_DOC`** — para que `getEstadoCfg` los devuelva correctamente. 2 entradas en el array.
2. **Incluir gestiones denegadas en el badge de `Index.jsx`** — coherente con lo que muestra el bloque. 1 condición adicional.
3. **Fix `fechaSubida` en GESTIONES_DEFAULT** — usar `""` o `null` en lugar de `new Date(0).toISOString()`.
4. **Mostrar indicador de urgencia en la lista** — punto de color o badge en cada documento con `fechaVencimiento < 30 días`.
5. **Ordenar vista por fecha de vencimiento** como default en la lista.

### Medio plazo — cambios de modelo y arquitectura

6. **Historial de cambios de estado** en documentos y gestiones (función 7.1).
7. **Adjuntos en gestiones legales** — reutilizar `SeccionAdjuntos` existente (función 7.2).
8. **Campo `fechaAprobacion`** en documentos para separar "cuándo fue aprobado" de "cuándo vence".
9. **Semáforo de riesgo legal** en la cabecera del bloque.
10. **Vista "Próximos vencimientos"** consolidada con filtro por umbral de días.
11. **Fix del `hoy` estático** en el `useEffect` de auto-marcado — usar `new Date()` en cada evaluación.
12. **`presupuestoConceptoId`** en gestiones para vincular costes con el bloque Presupuesto.

### Riesgos si no se actúan

- **INC-01 sin corregir:** Documentos con estado legacy `"vigente"` aparecen visualmente como `"pendiente"` (gris) en la lista. El organizador puede no darse cuenta de que están vigentes y los tramita de nuevo innecesariamente.
- **INC-02 sin corregir:** Una gestión denegada (el Ayuntamiento rechaza el permiso) no genera badge en la nav. El organizador puede no enterarse si no entra expresamente al bloque.
- **Sin historial:** No hay evidencia de cuándo se tramitó cada gestión. En una reclamación post-evento, la organización no puede demostrar que tramitó el permiso con antelación suficiente.
- **Sin adjuntos en gestiones:** El PDF del seguro o del permiso del Ayuntamiento se guarda fuera del panel (Drive, email). Si el día de carrera una autoridad pide el permiso, el organizador tiene que buscarlo en otro sitio.

---

*Informe generado sobre el commit `fc88edb` de `trailelguerrero/app-carrera`.*
*Revisión recomendada: inmediatamente — el permiso del Ayuntamiento vence el 29/08/2026 (día de la carrera).*
