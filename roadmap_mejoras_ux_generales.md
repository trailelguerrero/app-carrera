# Roadmap — Mejoras UX Generales
## app-carrera · Trail El Guerrero 2026

**Versión:** 1.0  
**Estimación total:** ~7 semanas  
**Fecha objetivo:** todo completado antes del 10 de agosto 2026  
**Excluye:** Portal Personal del Voluntario (documento separado)

---

## Sprint 1 — Problemas Globales de Usabilidad
*Afecta a toda la aplicación. Base necesaria antes de cualquier otra mejora.*

### 1.1 Áreas táctiles insuficientes en móvil
**Problema:** `.btn-sm` tiene `min-height: 34px`. Apple HIG y Material Design recomiendan 44px mínimo. Los botones de acción en listas (editar, eliminar, selects de estado) son difíciles de pulsar con precisión.  
**Corrección:** Subir `min-height` de `.btn-sm` a 44px. Añadir `padding` horizontal generoso en botones dentro de filas de lista.

### 1.2 Tipografía demasiado pequeña
**Problema:** `--fs-xs: 0.60rem` (~9.6px). Se usa en metadatos de fichas, etiquetas de campos, subtítulos de KPIs y datos de tablas. Ilegible en móvil sin zoom, crítico bajo luz solar.  
**Corrección:** `--fs-xs` sube a `0.70rem` mínimo. Los datos críticos (teléfonos, estados, tallas) usan `--fs-sm` como mínimo.

### 1.3 Sin feedback de guardado en Logística
**Problema:** Logística tiene 0 toasts pese a ser el bloque con más operaciones CRUD. El usuario no sabe si su acción se guardó.  
**Corrección:** `toast.success()` en todas las operaciones de guardado de material, vehículos, rutas, contactos, TL y CK. Mismo patrón que Voluntarios.

### 1.4 Sin estados de carga en bloques críticos
**Problema:** DíaCarrera, Camisetas y Voluntarios muestran datos o nada durante la carga. En campo con señal débil parece un fallo.  
**Corrección:** Spinner o skeleton mínimo durante la carga inicial. Prioritario en DíaCarrera.

### 1.5 Sin confirmación visual al cerrar modales tras guardar
**Problema:** ModalVoluntario, ModalPedido y similares se cierran sin feedback. El usuario puede dudar de si el guardado funcionó.  
**Corrección:** `toast.success()` inmediatamente después de cerrar el modal con éxito.

### 1.6 Indicador de bloque activo poco contrastado
**Problema:** En móvil el indicador de tab activo en la barra de navegación es sutil.  
**Corrección:** Franja de color más prominente (3px) bajo el icono activo con color `--cyan`.

| Tarea | Esfuerzo |
|-------|---------|
| 1.1 Áreas táctiles | Bajo |
| 1.2 Tipografía | Bajo |
| 1.3 Toasts en Logística | Bajo |
| 1.4 Skeletons en DíaCarrera y Camisetas | Bajo |
| 1.5 Toast al cerrar modales | Bajo |
| 1.6 Indicador activo en nav | Bajo |

**Estimación: 3-4 días**

---

## Sprint 2 — Dashboard
*El hub central necesita más contexto y menos números sueltos.*

### 2.1 KPIs accionables
**Problema:** "Cobertura 67%" no dice qué hacer. Un número sin contexto obliga al usuario a calcular mentalmente.  
**Corrección:** Subtítulo dinámico bajo cada KPI:
- Voluntarios: *"Faltan 12 voluntarios para el 100%"* o *"✓ Cobertura completa"*
- Resultado económico: *"Por encima del punto de equilibrio"* o *"⚠ Faltan 45 inscritos para cubrir costes"*
- Documentos: *"2 permisos próximos a vencer"*

### 2.2 Tarjeta económica con mini-desglose
**Problema:** El resultado final se muestra pero no su composición. El usuario tiene que ir a Presupuesto para entender el número.  
**Corrección:** Bajo el resultado, dos líneas: `Ingresos: 42.500€ · Costes: 38.200€`. Clicable para ir a Presupuesto.

### 2.3 Acceso directo a DíaCarrera desde Dashboard
**Problema:** El día del evento, el organizador necesita el Runbook en un toque. Actualmente el acceso está en la barra de navegación pero no destaca.  
**Corrección:** Tarjeta/botón prominente en el Dashboard: `🏁 Abrir Panel Día de Carrera` visible solo cuando la fecha del evento es ≤7 días.

### 2.4 Badges de alertas en la barra de navegación
**Problema:** Las alertas viven dentro de cada bloque. Desde la barra de navegación no hay ningún indicador de que algo necesita atención.  
**Corrección:** Badges numéricos rojos en los iconos de navegación cuando hay alertas activas:
- Voluntarios: puestos sin cobertura
- Proyecto: tareas vencidas
- Documentos: permisos próximos a vencer o vencidos
- Logística: incidencias abiertas

| Tarea | Esfuerzo |
|-------|---------|
| 2.1 KPIs accionables | Medio |
| 2.2 Mini-desglose económico | Bajo |
| 2.3 Acceso directo a DíaCarrera | Mínimo |
| 2.4 Badges de alertas en nav | Medio |

**Estimación: 3-4 días**

---

## Sprint 3 — Voluntarios
*El bloque más usado en la fase previa al evento.*

### 3.1 Indicador visual de estado en la lista
**Problema:** El estado (confirmado/pendiente/cancelado) se lee en el select de cada fila pero no se ve de un vistazo al escanear la lista.  
**Corrección:** Punto de color a la izquierda del nombre: verde (confirmado), ámbar (pendiente), rojo (cancelado).

### 3.2 Grupos expandidos por defecto cuando hay pocos voluntarios
**Problema:** Los tres grupos (confirmado/pendiente/cancelado) están colapsados por defecto. Con pocos voluntarios, el organizador tiene que expandir todo para ver algo.  
**Corrección:** Si el total de voluntarios ≤20, expandir todos los grupos por defecto. Si >20, colapsados por defecto.

### 3.3 Campo "Camiseta entregada" en la ficha del voluntario
**Decisión de diseño:** La entrega de camisetas de voluntarios se gestiona desde la ficha del voluntario, no desde el bloque Camisetas. Camisetas gestiona solo extras/familiares y la consolidación del pedido al proveedor.  
**Corrección:** Toggle `🎽 Camiseta entregada` en FichaVoluntario, marcado por el organizador. Se añade el campo `camisetaEntregada: boolean` al modelo.

### 3.4 Iconos de camiseta y llegada en la lista
**Corrección:** Columna compacta al final de cada fila con `🎽` (entregada) y `📍` (en puesto). Visibles solo cuando son relevantes.

| Tarea | Esfuerzo |
|-------|---------|
| 3.1 Punto de color de estado | Bajo |
| 3.2 Grupos expandidos por defecto | Bajo |
| 3.3 Campo camisetaEntregada | Bajo |
| 3.4 Iconos en lista | Bajo |

**Estimación: 2-3 días**

---

## Sprint 4 — Camisetas
*Refocus y simplificación. El bloque más confuso para usuarios nuevos.*

### Decisión de alcance
A partir de este sprint, el bloque Camisetas gestiona exclusivamente:
- **Pedido al proveedor:** consolidación de tallas (corredores externos + voluntarios automático + niños)
- **Extras y familiares:** pedidos individuales con pago, gestión de entrega
- **Entrega** de extras y familiares

La entrega de camisetas a voluntarios se gestiona desde Voluntarios (Sprint 3).

### 4.1 Vista simplificada de la tabla de tallas
**Problema:** La tabla tiene 5-6 columnas que en móvil requieren scroll horizontal. La columna TOTAL es lo que importa en el 90% de los casos.  
**Corrección:** Vista por defecto muestra solo Talla + TOTAL. Botón `Ver desglose por fuente` expande las columnas de corredores/voluntarios/niños. La tabla completa sigue disponible — es un añadido, no un reemplazo.

### 4.2 Setup wizard persistente
**Problema:** El wizard desaparece cuando hay cualquier dato, aunque el flujo no esté completo.  
**Corrección:** Mostrar el wizard mientras haya pasos incompletos. Los pasos completados muestran ✓, los pendientes su CTA. Se puede colapsar.

### 4.3 Indicador de estado combinado en pedidos
**Problema:** Cada pedido tiene estado de pago Y estado de entrega de forma independiente, pero en la lista no se ve el estado combinado de un vistazo.  
**Corrección:** Un único emoji de estado en la tarjeta de cada pedido:
- 🟡 Pendiente pago y entrega
- 🔵 Pagado, pendiente de entrega
- 🟢 Pagado y entregado
- 🎁 Regalo

### 4.4 Modo "Entrega rápida"
**Problema:** El día del evento hay una cola de personas esperando su camiseta. La vista actual requiere expandir el pedido (2 clics) para marcar como entregado.  
**Corrección:** Botón `⚡ Modo entrega rápida` en la pestaña Entrega. Activa una lista plana de todas las líneas pendientes ordenadas por apellido, con un botón `✓ Entregar` de 56px de altura. Sin jerarquías, sin collapse.

### 4.5 Formulario de nuevo pedido en dos pasos
**Problema:** El ModalPedido pide nombre, teléfono, email, y por cada línea: tipo, talla, cantidad, precio, estado de pago y entrega. Demasiado para móvil.  
**Corrección:**
- Paso 1 (visible por defecto): nombre + tipo + talla + cantidad
- Paso 2 (avanzado, expandible): precio, estado de pago/entrega, teléfono, email, notas

### 4.6 Exportar pedido al proveedor como PDF
**Problema:** "Copiar para proveedor" genera texto plano. Para enviar al fabricante no es profesional.  
**Corrección:** Botón `🖨️ PDF` con el mismo patrón del Directorio de Logística (`window.open + document.write + window.print()`). Tabla con logo del evento, tallas, cantidades y totales.

| Tarea | Esfuerzo |
|-------|---------|
| 4.1 Vista simplificada tabla tallas | Medio |
| 4.2 Setup wizard persistente | Medio |
| 4.3 Estado combinado en pedidos | Bajo |
| 4.4 Modo entrega rápida | Medio |
| 4.5 Formulario en dos pasos | Medio |
| 4.6 PDF pedido proveedor | Bajo |

**Estimación: 5-6 días**

---

## Sprint 5 — Logística
*Orientación y reducción de complejidad visual.*

### 5.1 Indicador de scroll en tabs
**Problema:** Con 8+ tabs en la navegación de Logística, en móvil los tabs se salen de pantalla sin indicador visible de que hay más.  
**Corrección:** Gradiente de fade en el borde derecho del contenedor de tabs cuando hay overflow. Indicador `→` como hint.

### 5.2 Explicación de Runbook vs Pre-operativo
**Problema:** Los tabs TL (Runbook) y CK (Pre-operativo) son conceptualmente similares pero sin explicación de la diferencia.  
**Corrección:** Subtítulo breve bajo cada título:
- Runbook: *"Secuencia de acciones el día D con hora planificada"*
- Pre-operativo: *"Checklist de preparación previa al evento"*

### 5.3 Búsqueda en TabMaterial
**Problema:** Con muchos elementos de material, encontrar uno específico requiere scroll.  
**Corrección:** Input de búsqueda en el header de TabMaterial.

### 5.4 Reorganizar jerarquía de tabs
**Problema:** "Material" ocupa un tab de primer nivel aunque se usa mucho menos que Emergencias, Directorio o Runbook.  
**Corrección:** Mover Material a subtab dentro de "Pedidos" o crear un grupo colapsable. Los tabs de primer nivel quedan: Dashboard, Emergencias, Directorio, Runbook, Pre-operativo, Incidencias.

| Tarea | Esfuerzo |
|-------|---------|
| 5.1 Indicador scroll tabs | Bajo |
| 5.2 Subtítulos Runbook/CK | Mínimo |
| 5.3 Búsqueda en Material | Bajo |
| 5.4 Reorganizar tabs | Medio |

**Estimación: 2-3 días**

---

## Sprint 6 — Día de Carrera
*Optimización para condiciones de campo el 29 de agosto.*

### 6.1 Reloj en tiempo real en el Runbook
**Problema:** Saber qué hora es y qué acción toca en ese momento debería ser la primera información visible del Runbook.  
**Corrección:** Reloj digital prominente (hora actual en tiempo real) en el header del tab Runbook. Destacar visualmente la próxima tarea pendiente.

### 6.2 Modo arranque directo en DíaCarrera
**Problema:** El día del evento, el organizador abre la app y tiene que navegar hasta DíaCarrera.  
**Corrección:** Opción en Configuración: *"Abrir automáticamente el Panel Día de Carrera al iniciar"*. Cuando está activo, el overlay de DíaCarrera se abre automáticamente tras el PIN.

### 6.3 Búsqueda rápida en marcado de presencia
**Problema:** Con 150 voluntarios, marcar la presencia de uno concreto requiere scroll por la lista.  
**Corrección:** Input de búsqueda instantánea por nombre en el tab Voluntarios de DíaCarrera, con botón `✓ Presente` de 52px junto a cada resultado.

### 6.4 Columna "Hora de llegada" en TabDiaD
Integración con el Portal del Voluntario: cuando el voluntario marca "Ya estoy en mi puesto" desde su portal, la hora de llegada aparece en la columna correspondiente del TabDiaD del organizador.

| Tarea | Esfuerzo |
|-------|---------|
| 6.1 Reloj en tiempo real | Mínimo |
| 6.2 Modo arranque directo | Bajo |
| 6.3 Búsqueda en marcado de presencia | Bajo |
| 6.4 Columna hora de llegada | Bajo (depende de Sprint Portal) |

**Estimación: 2-3 días**

---

## Sprint 7 — Proyecto
*Agilidad en la gestión de tareas desde móvil.*

### 7.1 Quick create de tareas
**Problema:** Crear una tarea requiere rellenar área, responsable, fecha límite, prioridad, estado, dependencias, notas y documento vinculado. Demasiado para una idea rápida en móvil.  
**Corrección:** Botón `+ Rápido` que abre un modal mínimo: título + área + fecha límite. El resto de campos se completan después desde la ficha de la tarea.

### 7.2 Gantt más usable en móvil
**Problema:** Las barras del Gantt son de ~8px de altura. En móvil son difíciles de ver y tapear.  
**Corrección:** Aumentar altura de barras a 20px. Tap en una barra → popup con las tareas del área (nombre, estado, fecha). Esto ya está parcialmente implementado con el tap que navega al área.

| Tarea | Esfuerzo |
|-------|---------|
| 7.1 Quick create | Medio |
| 7.2 Gantt más usable en móvil | Bajo |

**Estimación: 2-3 días**

---

## Sprint 8 — Presupuesto
*Vista resumen para móvil — la tabla completa no cambia.*

### 8.1 Vista "Resumen" en la tabla de conceptos
**Problema:** La tabla de conceptos tiene muchas columnas que en móvil requieren scroll horizontal.  
**Corrección:** Toggle `Vista resumen / Vista completa` en el header de la tabla. La vista resumen muestra: Nombre del concepto + Total + Estado (activo/inactivo). La tabla completa con todas las columnas sigue disponible exactamente igual — es un añadido, no un reemplazo.

### 8.2 Punto de equilibrio como insight accionable
**Problema:** "PE: 412 inscritos" obliga al usuario a calcular la diferencia con los inscritos actuales.  
**Corrección:** Texto dinámico: *"Con los inscritos actuales (380), faltan 32 para cubrir los costes fijos"* o *"✓ Has superado el punto de equilibrio por 45 inscritos"*.

| Tarea | Esfuerzo |
|-------|---------|
| 8.1 Vista resumen (añadida, no sustitutiva) | Medio |
| 8.2 PE como insight accionable | Bajo |

**Estimación: 2-3 días**

---

## Sprint 9 — Patrocinadores y Documentos
*Mejoras de flujo puntuales.*

### Patrocinadores

**9.1 Acceso rápido a contraprestaciones desde la tarjeta**  
Añadir un botón `+ Contraprestación` directamente en la tarjeta de cada patrocinador en la lista, sin necesidad de entrar en la ficha detallada.

### Documentos

**9.2 Alertas de vencimiento siempre visibles**  
Mover el banner de documentos/permisos próximos a vencer o vencidos a la parte superior del bloque, por encima de los tabs, siempre visible.

| Tarea | Esfuerzo |
|-------|---------|
| 9.1 Acceso rápido contraprestaciones | Bajo |
| 9.2 Alertas vencimiento arriba | Mínimo |

**Estimación: 1-2 días**

---

## Resumen y calendario

| Sprint | Bloque | Días estimados | Fecha objetivo |
|--------|--------|---------------|----------------|
| 1 | Problemas globales UX | 3-4 | Semana 1 mayo |
| 2 | Dashboard | 3-4 | Semana 2 mayo |
| 3 | Voluntarios | 2-3 | Semana 3 mayo |
| 4 | Camisetas | 5-6 | Semanas 4-5 mayo |
| 5 | Logística | 2-3 | Semana 1 junio |
| 6 | Día de Carrera | 2-3 | Semana 2 junio |
| 7 | Proyecto | 2-3 | Semana 3 junio |
| 8 | Presupuesto | 2-3 | Semana 4 junio |
| 9 | Patrocinadores + Documentos | 1-2 | Semana 1 julio |

**Total: ~25-31 días de desarrollo · Objetivo: completado antes del 10 de julio**

---

*Mejoras UX v1.0 · Trail El Guerrero 2026 · Club Deportivo Trail Candeleda*
