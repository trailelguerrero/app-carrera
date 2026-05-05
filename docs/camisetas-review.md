# Revisión del bloque Camisetas
**Fecha:** Mayo 2026 · `app-carrera` · Trail El Guerrero 2026
**Archivo analizado:** `src/components/blocks/Camisetas.jsx` (1.890 líneas)

---

## 1. Resumen del bloque

### Propósito
El bloque gestiona el **ciclo de vida completo del merchandising textil** del evento:
desde la previsión de unidades por talla hasta la entrega física el día de carrera,
pasando por el pedido al fabricante, el cobro de extras y el seguimiento de entregas.

### Tipos de usuarios afectados

| Tipo | Cómo interactúa | Dato clave |
|------|-----------------|-----------|
| **Corredor** | Recibe camiseta con la inscripción (dato importado manualmente de la plataforma) | Talla declarada en inscripción |
| **Voluntario** | Recibe camiseta de regalo o a precio reducido | Talla declarada en el Portal del Voluntario |
| **Niño** | Camiseta infantil; tallas propias (`4-6`, `6-8`, `8-10`, `10-12`) | Entrada manual |
| **Staff / Familiar / Extra** | Pedido individualizado con precio libre | Pedido en `TabPedidos` |
| **Organizador** | Gestiona todo: stock, previsiones, entregas, cobros | Panel completo |

### Las 4 pestañas del bloque

| Pestaña | Función |
|---------|---------|
| **Dashboard** | KPIs de unidades, costes, beneficio, progreso de entrega |
| **Pedido al proveedor** (`TabTallas`) | Tabla consolidada de tallas para pedir al fabricante |
| **Extras y familiares** (`TabPedidos`) | Pedidos individuales con líneas, precios y estados |
| **Entrega** (`TabChecklist`) | Checklist de entrega con modo rápido el día de carrera |

---

## 2. Modelo de datos

### 2.1 Pedido (`Pedido`)

```typescript
interface Pedido {
  id:       number;
  nombre:   string;      // Nombre del destinatario
  telefono: string;
  email:    string;
  notas:    string;
  lineas:   LineaPedido[];
}

interface LineaPedido {
  id:            number;
  tipo:          "corredor" | "voluntario" | "nino";  // Afecta al coste de fabricación
  talla:         string;   // De TALLAS[] o TALLAS_NINO[]
  cantidad:      number;
  precioVenta:   number;   // 0 para regalos
  estadoPago:    "pendiente" | "pagado" | "regalo";
  estadoEntrega: "pendiente" | "entregado";
}
```

### 2.2 Fuentes de demanda de tallas

```typescript
// Corredores: entrada manual (importación desde plataforma externa)
const corredoresExt: Record<string, number>  // { "S": 45, "M": 120, ... }

// Voluntarios: lectura automática desde teg_voluntarios_v1_voluntarios
const voluntariosActivos: Voluntario[]       // Filtrados por estado confirmado/pendiente

// Niños: entrada manual
const ninoExt: Record<string, number>        // { "4-6": 5, "6-8": 12, ... }

// Extras: pedidos individuales en TabPedidos
const pedidos: Pedido[]
```

### 2.3 Costes de fabricación

```typescript
const coste: { corredor: number; voluntario: number; nino: number }
// Defecto: { corredor: 8, voluntario: 7, nino: 6 }
```

### 2.4 Relación con el Portal del Voluntario

El Portal usa `TALLAS_PORTAL = ["XS","S","M","L","XL","XXL","3XL"]` — **7 tallas**.
El bloque Camisetas usa `TALLAS = ["XXS","XS","S","M","L","XL","XXL","3XL","4XL"]` — **9 tallas**.

```
Portal voluntario:     XS  S   M   L   XL  XXL  3XL
Camisetas (panel):  XXS XS  S   M   L   XL  XXL  3XL  4XL
                    ^^^                              ^^^^^^^^
                    Nunca seleccionable             No visible en portal
```

- Un voluntario que pida `XXS` o `4XL` desde el portal **no puede** porque no aparecen.
- Si un voluntario tiene guardado `4XL` (puesto manualmente por el organizador), en el panel sí aparece en el consolidado de tallas.

---

## 3. Inconsistencias y duplicidades

### 3.1 TALLAS vs TALLAS_PORTAL — incompatibilidad silenciosa

**Problema:** El Portal ofrece 7 tallas, el panel trabaja con 9.

```javascript
// Portal (VoluntarioPortal.jsx línea 39):
const TALLAS_PORTAL = ["XS","S","M","L","XL","XXL","3XL"];

// Panel (Camisetas.jsx línea 15):
const TALLAS = ["XXS","XS","S","M","L","XL","XXL","3XL","4XL"];
```

Si el organizador necesita `XXS` o `4XL`, tiene que añadirlos manualmente en la ficha del voluntario, pero el voluntario no los puede seleccionar desde su portal.

**Fix propuesto:** Definir `TALLAS_PANEL` y `TALLAS_PORTAL` en un único archivo de constantes compartido y asegurarse de que el portal ofrezca todas las tallas disponibles o justificar cuáles se excluyen.

### 3.2 Tipo "nino" vs tipos de tallas infantiles — doble registro

Los pedidos de tipo `"nino"` usan `TALLAS = ["XXS","XS","S","M","L","XL","XXL","3XL","4XL"]` igual que adultos en las líneas de pedido, pero el resumen de tallas usa `TALLAS_NINO = ["4-6","6-8","8-10","10-12"]` para el resumen de previsión. No hay validación que impida crear un pedido `tipo: "nino", talla: "M"`.

```javascript
// línea de pedido tipo nino con talla adulto — no hay validación:
{ tipo: "nino", talla: "L", cantidad: 1, ... }  // pasa validación sin problema
```

### 3.3 Logica de sincronización Camisetas → Voluntarios incompleta

```javascript
// Camisetas.jsx updateLinea():
// Solo actualiza camisetaEntregada en Voluntarios cuando el matching de nombre coincide
const nombreCompleto = ((v.nombre||"") + " " + (v.apellidos||"")).toLowerCase().trim();
const nombrePed = pedidoNombre.toLowerCase().trim();
if (nombreCompleto === nombrePed || ...matching parcial...) {
  return { ...v, camisetaEntregada: true };
}
```

Si el nombre del pedido no coincide exactamente con el nombre del voluntario (ej: "Juan García" en el pedido vs "Juan García López" en Voluntarios), la sincronización falla silenciosamente.

### 3.4 `calcularTallasConsolidadas` — lógica duplicada de conteo de voluntarios

El conteo de tallas de voluntarios se hace en dos lugares:

```javascript
// En TabTallas (línea 928):
voluntariosActivos.forEach(v => { if (map[v.talla] !== undefined) map[v.talla]++; });

// En stats (línea 953):
tot[t] = (tallasVol[t] || 0) + (tallasExtras[t]?.voluntario || 0);
```

Ambos hacen el mismo cómputo pero con variables distintas. Un cambio en la lógica de filtrado solo se aplica en uno.

### 3.5 El precio de corredores externos no es editable por talla

Los corredores de plataforma externa tienen un precio único `precioCorrExt` para todos, independientemente de la talla. En la realidad, algunos eventos usan precios distintos por talla (p.ej., 4XL puede costar 3€ más de fabricación).

### 3.6 `PEDIDOS_DEFAULT` tiene datos ficticios en producción

El `PEDIDOS_DEFAULT` incluye "Ejemplo Persona" con teléfono `600000001` y email `ejemplo@email.com`. Un usuario nuevo que abra el bloque verá datos ficticios. Debería ser `[]`.

### 3.7 `estadoEntrega` y `camisetaEntregada` — dos fuentes de verdad

- **En Camisetas:** `linea.estadoEntrega === "entregado"`
- **En Voluntarios:** `voluntario.camisetaEntregada === true`

Cuando se marca en `TabChecklist`, se actualiza `linea.estadoEntrega` y se intenta sincronizar `camisetaEntregada`. Pero no hay mecanismo inverso: si el organizador marca en el bloque Voluntarios, `linea.estadoEntrega` no se actualiza. Son dos fuentes de verdad que pueden divergir.

---

## 4. Flujos de trabajo

### 4.1 Planificación de stock (TabTallas)

**Flujo actual:**
1. Importar tallas de corredores desde CSV/plataforma externa (entrada manual por talla)
2. Las tallas de voluntarios se leen automáticamente desde `teg_voluntarios_v1_voluntarios`
3. Entrar tallas de niños manualmente
4. La tabla `TabTallas` consolida todo y muestra el total por talla para pedir al fabricante
5. Añadir % de margen de seguridad (no implementado actualmente — suma bruta sin buffer)

**Problemas:**
- No hay campo de "cantidad a pedir" editable — la tabla es solo lectura
- No hay exportación de la tabla de pedido al proveedor (solo hay exportación Excel de pedidos individuales)
- No hay alerta si una talla tiene 0 unidades cuando debería tener más (niños, extras raros)
- El margen de seguridad por talla no existe — ej: siempre pedir 5% más de M y L

### 4.2 Pedidos individuales (TabPedidos)

**Flujo actual:**
1. Crear pedido para persona con nombre, teléfono, email
2. Añadir líneas: tipo + talla + cantidad + precio + estado pago
3. Marcar como pagado/regalo
4. Más tarde marcar como entregado desde `TabChecklist` o desde la ficha

**Problemas:**
- No hay vinculación directa entre un pedido de tipo `"voluntario"` y el registro del voluntario en el bloque Voluntarios
- No hay importación masiva desde Voluntarios (hay que crear pedido por pedido)
- No hay validación de duplicados por nombre/teléfono
- La ficha del pedido no muestra el histórico de cambios de estado

### 4.3 Entrega el día de carrera (TabChecklist)

**Flujo actual:**
1. Lista de todas las líneas de todos los pedidos
2. Filtros: todos / por entregar / entregado / sin pagar / pagado / regalo
3. **Modo entrega rápida:** lista plana con botones grandes — diseñado para tablet/móvil
4. Marcar como entregado con 1 click

**Problemas graves para el día de carrera:**
- No hay búsqueda por nombre en el checklist — con 150 voluntarios es inviable buscar manualmente
- No hay ordenación alfabética en el modo rápido
- No hay confirmación de entrega con firma o foto — posibles reclamaciones
- El checklist mezcla pedidos de corredores, voluntarios y niños sin separación visual clara
- No hay indicación si la persona ya recogió su camiseta de corredor en otra ventanilla

---

## 5. Mejoras operativas

### 5.1 Buscador en TabChecklist

Campo de búsqueda por nombre/teléfono en el modo entrega rápida. Con 150+ entregas, es la mejora más crítica para el día D.

### 5.2 Buffer de seguridad por talla en el pedido al proveedor

Campo `margenSeguridad: number` (%, defecto 5%) que añade unidades extra por talla al total del pedido al fabricante:

```javascript
const unidadesAPedir = (tallasConsolidadas, margen) =>
  Object.fromEntries(TALLAS.map(t => [t, Math.ceil((tallasConsolidadas[t] || 0) * (1 + margen / 100))]));
```

### 5.3 Exportación del pedido al proveedor

Botón "Exportar pedido al proveedor" que genera un CSV/Excel limpio con:
- Tipo de camiseta
- Talla
- Cantidad a pedir (con margen de seguridad)
- Coste unitario y total

### 5.4 Alertas de stock crítico

Alerta en el Dashboard cuando:
- Una talla tiene `< 3 unidades` (posible infra-pedido)
- El total de unidades de voluntarios no coincide con el número de voluntarios confirmados
- Hay pedidos de tipo "nino" con tallas de adulto

### 5.5 Vista de previsión por tramo temporal

Mostrar en el dashboard cómo evoluciona el recuento de voluntarios confirmados y pendientes a lo largo del tiempo para anticipar el cierre del pedido al proveedor.

---

## 6. Interconexiones con otros módulos

### 6.1 Con Voluntarios

**Estado actual:**
```
Voluntarios.voluntario.talla ──→ (lectura automática) ──→ Camisetas.tallasVol
Camisetas.linea.estadoEntrega = "entregado" ──→ (sync matching) ──→ Voluntarios.voluntario.camisetaEntregada
```

**Problemas:**
- La sincronización de entrega es unidireccional y frágil (matching por nombre)
- No hay ID de voluntario en las líneas de pedido de tipo "voluntario" — imposible vincular sin matching
- `camisetaEntregada` en Voluntarios y `estadoEntrega` en Camisetas pueden divergir

**Mejora propuesta:** Añadir campo `voluntarioId?: number` en `LineaPedido` para vincular exactamente.

**Estado deseado:**
```
Pedido.linea.voluntarioId ←→ Voluntario.id (vínculo bidireccional)
  → Al entregar en Camisetas, actualizar Voluntarios.camisetaEntregada
  → Al ver ficha del voluntario, mostrar si su camiseta está entregada o pendiente
```

### 6.2 Con Presupuesto

**Estado actual:**
```
Camisetas.stats.beneficioNetoReal ──→ useBudgetLogic.totalMerchBeneficio ──→ ingresosExtra[id=2]
Camisetas.coste ──→ gasto calculado dentro del módulo, no en Presupuesto
```

**Problema:** Los gastos de fabricación de camisetas (coste × unidades) no aparecen en el módulo de Presupuesto como concepto de gasto explícito. Solo el beneficio neto se exporta al P&L.

**Mejora propuesta:** Exportar también `totalGastosFabricacion` a Presupuesto como concepto de coste sincronizado, con su propio toggle. Así el P&L refleja tanto el gasto como el ingreso por merchandising por separado.

### 6.3 Con Documentos

**Estado actual:** Sin conexión.

**Posibilidad:** Subir el albarán del fabricante como documento en la categoría "Contratos" del bloque Documentos. Desde Camisetas, un enlace directo al documento.

**Firma digital de entrega:** En el día de carrera, mostrar una pantalla de confirmación que el receptor pueda firmar en el tablet del organizador. La firma se almacenaría en Vercel Blob asociada al pedido.

---

## 7. Nuevas funciones

### 7.1 Búsqueda rápida en TabChecklist

```javascript
function TabChecklist({ pedidos, updateLinea, abrirFicha }) {
  const [busqueda, setBusqueda] = useState("");

  const filtradas = useMemo(() => {
    const base = todas.filter(applyFiltro);
    if (!busqueda.trim()) return base;
    const q = busqueda.toLowerCase();
    return base.filter(l =>
      (l.pedNombre || "").toLowerCase().includes(q) ||
      (l.ped?.telefono || "").includes(q)
    );
  }, [todas, filtro, busqueda]);

  return (
    <>
      <input
        className="inp"
        placeholder="🔍 Buscar por nombre o teléfono..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        style={{ marginBottom: "0.75rem", fontSize: "var(--fs-md)" }}
        autoFocus
      />
      {/* Resto del checklist */}
    </>
  );
}
```

### 7.2 Exportación del pedido al proveedor como CSV

```javascript
function exportarPedidoProveedor(tallasConsolidadas, margenSeguridad = 5) {
  const lineas = [
    ["Tipo", "Talla", "Unidades_Base", "Margen_%", "Unidades_A_Pedir"],
    ...["corredor", "voluntario", "nino"].flatMap(tipo => {
      const tallasDelTipo = tipo === "nino" ? TALLAS_NINO : TALLAS;
      return tallasDelTipo
        .filter(t => (tallasConsolidadas[tipo]?.[t] || 0) > 0)
        .map(t => {
          const base = tallasConsolidadas[tipo]?.[t] || 0;
          const conMargen = Math.ceil(base * (1 + margenSeguridad / 100));
          return [tipo, t, base, `${margenSeguridad}%`, conMargen];
        });
    }),
  ];
  const csv = lineas.map(fila => fila.join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pedido-proveedor-teg-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### 7.3 Importación masiva desde Voluntarios

Función que crea automáticamente pedidos en Camisetas para todos los voluntarios que no tienen pedido todavía:

```javascript
function generarPedidosDesdeVoluntarios(voluntarios, pedidosExistentes, coste) {
  const nombresConPedido = new Set(
    pedidosExistentes.flatMap(p =>
      p.lineas.filter(l => l.tipo === "voluntario").map(() => p.nombre.toLowerCase())
    )
  );

  const voluntariosSinPedido = voluntarios
    .filter(v => v.estado !== "cancelado" && v.talla)
    .filter(v => !nombresConPedido.has(`${v.nombre} ${v.apellidos || ""}`.toLowerCase().trim()));

  return voluntariosSinPedido.map(v => ({
    id:       Date.now() + v.id,
    nombre:   `${v.nombre} ${v.apellidos || ""}`.trim(),
    telefono: v.telefono || "",
    email:    v.email || "",
    notas:    `Generado automáticamente desde Voluntarios el ${new Date().toLocaleDateString("es-ES")}`,
    voluntarioId: v.id,
    lineas: [{
      id:            Date.now() + v.id + 1,
      tipo:          "voluntario",
      talla:         v.talla,
      cantidad:      1,
      precioVenta:   0,
      estadoPago:    "regalo",
      estadoEntrega: "pendiente",
    }],
  }));
}
```

### 7.4 Alerta de desequilibrio de tallas

Detectar tallas con desproporción anómala respecto al total:

```javascript
function detectarDesequilibrioTallas(tallasConsolidadas) {
  const total = Object.values(tallasConsolidadas).reduce((s, n) => s + n, 0);
  if (total === 0) return [];
  return TALLAS
    .filter(t => (tallasConsolidadas[t] || 0) > 0)
    .map(t => {
      const pct = tallasConsolidadas[t] / total * 100;
      const alerta = pct > 40
        ? { nivel: "alto", texto: `${t} representa el ${pct.toFixed(0)}% del total — verificar` }
        : pct < 1 && tallasConsolidadas[t] > 0
        ? { nivel: "bajo", texto: `${t} solo tiene ${tallasConsolidadas[t]} ud — ¿es correcto?` }
        : null;
      return alerta ? { talla: t, pct, ...alerta } : null;
    })
    .filter(Boolean);
}
```

---

## 8. Plan de refactor

### Cambios rápidos (1-2 días)

| # | Tarea | Impacto |
|---|-------|---------|
| 1 | Añadir buscador por nombre/teléfono en TabChecklist (modo rápido) | Crítico para día D |
| 2 | Vaciar `PEDIDOS_DEFAULT` — usar `[]` en lugar de datos ficticios | Cosmético pero urgente |
| 3 | Añadir ordenación alfabética en modo entrega rápida | Alto |
| 4 | Unificar `TALLAS` y `TALLAS_PORTAL` en un archivo de constantes compartido | Medio |
| 5 | Validar que tipo "nino" solo acepta `TALLAS_NINO` | Bajo |

### Cambios estructurales (1 semana)

| # | Tarea | Impacto |
|---|-------|---------|
| 6 | Añadir `voluntarioId` en `LineaPedido` para vincular directamente con Voluntarios | Alto |
| 7 | Importación masiva desde Voluntarios (botón "Generar pedidos de voluntarios") | Alto |
| 8 | Exportación CSV del pedido al proveedor con margen de seguridad configurable | Alto |
| 9 | Exportar `totalGastosFabricacion` a Presupuesto como línea de coste sincronizada | Medio |
| 10 | Buscador + filtro por tipo en TabTallas (ver solo voluntarios / solo corredores) | Medio |

### Funciones nuevas (2 semanas)

| # | Tarea | Impacto |
|---|-------|---------|
| 11 | Alertas de desequilibrio de tallas en Dashboard | Medio |
| 12 | Campo margen de seguridad (%) en TabTallas | Medio |
| 13 | Vista listado por talla para imprimir (agrupado por talla, todos los destinatarios) | Alto — día D |
| 14 | Confirmación de entrega con firma opcional en tablet | Bajo — nicetohave |
| 15 | Asociar albarán del fabricante al bloque Documentos | Bajo |

---

*Informe generado sobre el commit `656c142` de `trailelguerrero/app-carrera`.*
*Revisión recomendada: 60 días antes del evento (final de junio 2026) para cerrar el pedido al proveedor.*
