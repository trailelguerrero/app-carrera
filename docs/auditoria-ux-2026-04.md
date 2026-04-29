# Auditoría UX — app-carrera · Trail El Guerrero 2026
**Fecha:** Abril 2026  
**Auditor:** Principal UX Auditor (asistido por IA)  
**Metodología:** Heurísticas de Nielsen (10), análisis de flujos, coherencia visual, consistencia de datos, usabilidad móvil  
**Archivos analizados:** `Voluntarios.jsx` (3.119 líneas), `VoluntarioPortal.jsx` (1.433 líneas), `Dashboard.jsx`, `Camisetas.jsx`, `Logistica.jsx`, `Configuracion.jsx` + APIs `ficha.js`, `auth.js`, `check.js`

---

## Resumen ejecutivo

La aplicación es funcionalmente rica y tiene una base sólida. El módulo de voluntarios es el más complejo y crítico de toda la suite, y ha evolucionado rápidamente. Sin embargo, la velocidad de desarrollo ha generado deuda UX notable: inconsistencias visuales, flujos incompletos, fallos de comunicación entre el panel del organizador y el portal del voluntario, y varios problemas de usabilidad que, en el contexto de un evento en tiempo real con 150 voluntarios, pueden derivar en errores operativos graves.

**Estado general: 6.5/10** — Funcional pero no fiable bajo presión de evento.

---

## 1. Heurística 1 — Visibilidad del estado del sistema

### 1.1 Estado de guardado ambiguo

**Severidad: Alta**

El botón "Guardar" en el header del bloque (`guardar()`) despacha un evento `teg-sync` pero no hay confirmación visual clara de que los datos se han persistido en la base de datos. El `saveStatus` cambia a `"saved"` durante 2,5 s pero solo afecta a la UI local, no al estado real de sincronización con Neon PostgreSQL.

> **Problema:** El usuario no sabe si sus cambios han llegado al servidor. En un evento en tiempo real con múltiples coordinadores, esto puede llevar a pérdida de datos.

**Recomendación:** Mostrar indicador diferenciado: "💾 Guardando…" → "☁️ Sincronizado" → "⚠️ Error de red". Usar el estado real del debounce en `dataService.js`.

---

### 1.2 El KPI "En su puesto" desaparece cuando no hay voluntarios marcados

**Severidad: Media**

```jsx
{stats.enPuesto > 0 && (
  <div className="kpi green...">📍 En su puesto</div>
)}
```

El KPI es condicional: si nadie ha marcado llegada, el grid de KPIs tiene 4 celdas en lugar de 5, creando un layout inconstante. El organizador no puede saber si el sistema de marcaje está activo o si nadie ha llegado aún.

**Recomendación:** Mostrar el KPI siempre, con valor "0" y texto "Ninguno aún" durante el evento. Antes del evento, ocultarlo está bien, pero el umbral debería ser la fecha del evento, no `stats.enPuesto > 0`.

---

### 1.3 Sincronización unidireccional organizador → voluntario sin feedback

**Severidad: Alta**

Cuando el organizador cambia el estado de un voluntario a "confirmado", el voluntario no recibe ninguna notificación. El portal no tiene sistema de notificaciones push ni polling activo — el voluntario solo ve su estado actualizado si recarga manualmente su ficha.

**Recomendación:** Añadir `pull-to-refresh` en el portal móvil y un indicador de "Última actualización: hace X min" con botón de actualización visible. A largo plazo: webhook o polling cada 5 min al cargar la app.

---

### 1.4 Estado del PIN nunca visible en la ficha del organizador

**Severidad: Media**

El organizador no puede saber si un voluntario ha configurado su acceso (tiene PIN personalizado) o si nunca ha entrado en el portal. Esto dificulta el soporte cuando un voluntario dice "no puedo entrar".

**Recomendación:** En `FichaVoluntario` del organizador, añadir en la sección de datos: `🔐 Acceso portal: Nunca accedido | PIN inicial | PIN personalizado | Sesión activa`.

---

## 2. Heurística 2 — Coincidencia entre sistema y mundo real

### 2.1 Terminología inconsistente: "presente" vs "enPuesto"

**Severidad: Alta (ya parcialmente corregida)**

El campo `enPuesto` es el canónico en la API y en el modelo de datos, pero el texto en TabDiaD decía "presentes" (término diferente al usado en el portal del voluntario "Ya estoy en mi puesto"). Esto genera confusión cuando el organizador marca a alguien como presente desde su panel, y el voluntario lo ha marcado desde el portal.

**Estado actual:** Unificado a `enPuesto` en el código, pero la UI del TabDiaD aún usa el texto "presentes" en algunos lugares.

**Recomendación:** Usar siempre "en su puesto" en todas las interfaces. Evitar "presente" (ambiguo — ¿presente en el evento o en el puesto específico?).

---

### 2.2 "Cobertura" confunde voluntarios asignados con confirmados

**Severidad: Media**

```js
const cobertura = p?.necesarios > 0 ? Math.round((vols.length / p.necesarios) * 100) : 0;
const coberturaConf = p?.necesarios > 0 ? Math.round((confirmados / p.necesarios) * 100) : 0;
```

Existe `cobertura` (incluye pendientes) y `coberturaConf` (solo confirmados), pero la UI solo muestra `cobertura`. Un puesto puede mostrar "100% cobertura" con todos sus voluntarios en estado "pendiente" — nunca han confirmado. Esto da una falsa sensación de seguridad.

**Recomendación:** El badge de cobertura debe usar `coberturaConf`. El valor `cobertura` puede mostrarse como barra secundaria "Asignados: X%".

---

### 2.3 El Dashboard del bloque Voluntarios no diferencia "necesarios" de "asignados"

**Severidad: Media**

El KPI de cobertura global calcula `confirmados / totalNecesarios`. Pero si un puesto tiene 5 asignados y solo necesita 3, no se refleja el excedente. El organizador no sabe qué puestos están sobre-cubiertos (y por tanto de dónde puede reasignar).

**Recomendación:** En el card de "Cobertura por puesto" del dashboard, añadir indicador visual de excedente (verde oscuro para >110%).

---

## 3. Heurística 3 — Control y libertad del usuario

### 3.1 No hay deshacer en acciones destructivas del portal del voluntario

**Severidad: Media**

El voluntario puede marcar "Ya estoy en mi puesto" pero no puede desmarcarlo desde su portal. Si se equivoca (toca sin querer), debe contactar con el organizador para corregirlo.

**Recomendación:** Permitir al voluntario desmarcar dentro de un margen de 30 minutos. Tras ese tiempo, solo el organizador puede corregirlo. Añadir confirmación "¿Confirmas que ya estás en tu puesto de voluntario?" antes de registrar.

---

### 3.2 No hay forma de que el voluntario cancele su participación desde el portal

**Severidad: Alta**

El portal del voluntario no tiene botón de "cancelar mi participación". Si un voluntario no puede asistir, debe llamar al organizador. Esto genera carga innecesaria y el organizador puede no enterarse a tiempo.

**Recomendación:** Añadir "⚠️ No puedo asistir" con un modal de confirmación + campo de motivo opcional. Esto notifica al organizador y cambia el estado a "cancelado" automáticamente.

---

### 3.3 El organizador no puede enviar mensajes/notas a un voluntario específico

**Severidad: Media**

La comunicación solo fluye del voluntario al organizador (campo `notaVoluntario`). El organizador puede escribir `notas` internas pero el voluntario no las ve.

**Recomendación:** Añadir campo `mensajeOrganizador` en la ficha que el voluntario SÍ puede leer en su portal. Sería un mensaje informal tipo "Recuerda traer ropa de abrigo para el turno nocturno". Mostrar con badge "📢 Mensaje del organizador" en el portal.

---

### 3.4 La edición en el modal de voluntario sobreescribe campos sin advertir

**Severidad: Baja**

Al editar un voluntario en `ModalVoluntario`, si el voluntario ha modificado su teléfono desde el portal (campo `telefono`), el organizador al abrir el modal verá el teléfono original y al guardar puede sobreescribir el actualizado por el voluntario.

**Recomendación:** En el modal del organizador, indicar visualmente qué campos fueron modificados por el voluntario desde su portal (badge "Actualizado por el voluntario").

---

## 4. Heurística 4 — Consistencia y estándares

### 4.1 Dos sistemas de estilos coexistiendo (BLOCK_CSS vs CSS literal en portal)

**Severidad: Alta**

El bloque Voluntarios usa `BLOCK_CSS` + clases utilitarias (`btn`, `card`, `badge`, `kpi`...). El portal del voluntario tiene ~200 líneas de CSS literal inline en una constante `CSS`. Los colores, radios, tipografías y espaciados están definidos por separado con valores ligeramente distintos.

**Evidencia:**
- `--r: 12px` en portal vs `var(--r)` heredado en bloque
- `font-size: .75rem` vs `var(--fs-xs)` para el mismo nivel visual
- `.vp-btn` (minHeight: 54px) vs `.btn` (minHeight: 40px)
- Gradiente de fondo en landing (`radial-gradient`) sin equivalente en la app

**Recomendación:** Extraer el CSS del portal a un archivo `voluntario-portal.css` o, mejor, compartir las custom properties del design system global. Al menos los colores semánticos deben ser idénticos.

---

### 4.2 Botones con clases duplicadas (`className` repetido)

**Severidad: Media (bug potencial)**

```jsx
<button
  className="btn btn-ghost btn-sm"
  className="mono-sm"  // ← JSX solo acepta el último
```

Hay al menos 4 botones en el header del bloque Voluntarios con `className` duplicado. Esto hace que el segundo sobreescriba al primero — los botones pierden su estilo de `btn`.

**Recomendación:** Unificar a `className="btn btn-ghost btn-sm mono-sm"` en todos los casos.

---

### 4.3 Paginación no coherente entre tabs

**Severidad: Media**

El tab de Voluntarios usa `usePaginacion` (20 items/página). El tab de Puestos no tiene paginación. El tab de Día D muestra todos los voluntarios sin paginar. No hay consistencia.

**Recomendación:** Definir una política uniforme: paginación a partir de N>25 items en todos los listados, o infinite scroll. Actualmente el tab Día D puede volverse inmanejable con 100+ voluntarios.

---

### 4.4 Inconsistencia en la gestión de "apellidos"

**Severidad: Media**

El modelo de datos tiene voluntarios con nombre completo en campo `nombre` (ej: `"María García López"`) Y voluntarios con `nombre` + `apellidos` separados. El modal de edición tiene campos separados. La visualización en listas usa `v.nombre` directamente.

**Evidencia en datos por defecto:**
```js
{ nombre: "María García López", ... }  // nombre completo
vs
{ nombre: "Nombre", apellidos: "Apellidos", ... }  // campos separados
```

**Recomendación:** Normalizar al modelo `nombre + apellidos`. Añadir migración en `useEffect` que detecte nombres con espacios y los separe.

---

### 4.5 El formulario de registro (StepperForm en portal) y ModalVoluntario (organizador) están desacoplados

**Severidad: Alta**

Los campos del `StepperForm` (portal voluntario) y `ModalVoluntario` (organizador) no están sincronizados. El portal tiene campos `nombre`, `apellidos`, `telefono`, `email`, `talla`, `puestoId`, `coche`, `telefonoEmergencia`. El modal del organizador tiene campos adicionales: `rol`, `notas` (organizador), `estado`. Pero si el organizador crea un voluntario manualmente, el `apellidos` no se captura como campo separado.

**Recomendación:** Crear un tipo `VoluntarioData` compartido y usar el mismo esquema en ambos formularios. El modal del organizador debe incluir todos los campos del portal + los campos exclusivos del organizador.

---

## 5. Heurística 5 — Prevención de errores

### 5.1 El PIN inicial del voluntario es predecible y no hay fuerza a cambiarlo

**Severidad: Alta**

El PIN inicial son los últimos 4 dígitos del teléfono. Esto es público (cualquiera que conozca el número puede entrar). No hay ningún mensaje en el portal que invite al voluntario a cambiar su PIN.

**Recomendación:** En la primera entrada al portal (cuando `pinPersonalizado === false`), mostrar un banner prominente: "🔐 Tu PIN es temporal. Te recomendamos cambiarlo por seguridad." con botón directo a cambiar PIN.

---

### 5.2 No hay validación de teléfono duplicado al añadir voluntario manualmente

**Severidad: Media**

El endpoint público `/api/data/public` sí comprueba duplicados (409). Pero `addVoluntario()` en el panel del organizador no hace ninguna comprobación:

```js
const addVoluntario = (data) => {
  const pinHash = hashPinLocal(pinInicialLocal(data.telefono || ''));
  const nuevo = { id: genIdNum(voluntarios), ... };
  setVoluntarios(prev => [...prev, nuevo]);
  toast.success("Voluntario añadido");
};
```

Si el organizador añade manualmente a alguien que ya se registró por el portal, habrá dos registros con el mismo teléfono. El sistema de login por teléfono encontrará el primero, no el segundo.

**Recomendación:** Añadir validación en `addVoluntario` y en `ModalVoluntario.onSave`:
```js
const telExistente = voluntarios.find(v => v.telefono?.replace(/\D/g,'') === data.telefono?.replace(/\D/g,''));
if (telExistente) { toast.error("Ya existe un voluntario con ese teléfono"); return; }
```

---

### 5.3 La eliminación de un puesto desasigna silenciosamente a voluntarios

**Severidad: Alta**

```js
const deletePuesto = (id) => {
  setPuestos(prev => prev.filter(p => p.id !== id));
  setVoluntarios(prev => prev.map(v => v.puestoId === id ? { ...v, puestoId: null } : v));
  toast.success("Puesto eliminado");
};
```

El organizador no ve cuántos voluntarios quedan sin puesto. El toast solo dice "Puesto eliminado", no "Puesto eliminado — 4 voluntarios han quedado sin asignar".

**Recomendación:** El modal de confirmación debe mostrar: "¿Eliminar el puesto 'Avituallamiento KM 4'? 3 voluntarios quedarán sin puesto asignado." El toast debe decir cuántos voluntarios se han desasignado.

---

### 5.4 El token de sesión del portal no tiene expiración en el servidor

**Severidad: Media**

El `SESSION_TTL` de 7 días está implementado en el cliente (localStorage). Pero en la API, `verifyToken` solo comprueba que el token coincide, sin fecha de expiración:

```js
function verifyToken(voluntario, token) {
  return voluntario && voluntario.sessionToken && voluntario.sessionToken === token;
}
```

Si el token se filtra, es válido indefinidamente hasta que el voluntario haga login de nuevo.

**Recomendación:** Almacenar `sessionTokenExpiry` en el voluntario. En `verifyToken`, comprobar que no ha expirado. Alternativa más simple: añadir timestamp al token (`token_timestamp`) y rechazar tokens de más de 30 días.

---

### 5.5 No hay confirmación al marcar llegada masiva en TabDiaD

**Severidad: Media**

El TabDiaD no tiene opción de "marcar todos como presentes" pero tampoco tiene ninguna protección contra clics accidentales en las filas. Un toque involuntario marca a un voluntario como "en puesto" sin confirmación.

**Recomendación:** Añadir confirmación con pequeño delay visual (300ms hold para confirmar) o un micro-modal "¿Confirmar llegada de [Nombre]?".

---

## 6. Heurística 6 — Reconocimiento antes que recuerdo

### 6.1 La asignación de puestos requiere recordar el nombre del puesto

**Severidad: Media**

En el `ModalVoluntario`, el selector de puesto es un `<select>` plano con nombres de puesto. No muestra horario, tipo, cobertura actual ni cuántos voluntarios faltan. El organizador debe recordar o consultar en otro tab.

**Recomendación:** El selector de puesto debería mostrar:
```
📍 Avituallamiento KM 4 — 06:30-14:00 — 2/4 voluntarios
```

---

### 6.2 El portal del voluntario no muestra el contexto del evento

**Severidad: Media**

Cuando el voluntario entra a su ficha, no ve la fecha del evento en un lugar prominente, ni el lugar, ni cuántos días faltan. Esta información es crítica (especialmente en los días previos) y requiere scroll hasta el footer.

**Recomendación:** Añadir bajo el topbar un banner contextual:
```
Trail El Guerrero 2026 · 29 Agosto · Candeleda — 📅 X días
```
Que cambie a `⚡ ¡MAÑANA ES EL DÍA!` o `🏃 HOY ES EL DÍA` según la proximidad.

---

### 6.3 En el listado de voluntarios no se ve a qué puesto está asignado cada uno

**Severidad: Alta**

La fila de cada voluntario en el listado muestra: nombre, estado, talla, badges de enPuesto/nota/coche. Pero no muestra el nombre del puesto. El organizador debe abrir la ficha para ver la asignación.

**Recomendación:** Añadir en la fila el nombre del puesto (truncado) en tono muted:
```
María García · ✓ Confirmado · 📍 Avituallamiento KM 4
```

---

## 7. Heurística 7 — Flexibilidad y eficiencia

### 7.1 No hay acciones masivas desde el listado de voluntarios

**Severidad: Media**

Aunque existe `onBulkUpdate`, no hay UI de selección múltiple visible por defecto en el listado. El organizador no puede confirmar 10 voluntarios de una vez.

**Recomendación:** Añadir checkbox en cada fila (visible al hover o swipe). Cuando hay selección, mostrar toolbar flotante: "Confirmar seleccionados | Asignar puesto | Exportar | Cancelar". Ideal para después de un evento de registro masivo.

---

### 7.2 No hay acceso rápido al portal desde la ficha del organizador

**Severidad: Baja**

La `FichaVoluntario` del organizador tiene el teléfono como enlace `tel:`, pero no tiene enlace directo al portal del voluntario con su token (para comprobar qué ve él exactamente) ni un botón para enviarle el enlace de acceso.

**Recomendación:** Botón "📱 Ver portal del voluntario" que abra `/voluntarios/mi-ficha` en nueva pestaña. Botón "📤 Enviar enlace" que copie o genere un WhatsApp con el enlace y las instrucciones de acceso.

---

### 7.3 La configuración del formulario público está enterrada y no es intuitiva

**Severidad: Media**

El card "⚙️ Configuración formulario público" está colapsado por defecto y contiene una mezcla de opciones de campos (toggles) y subida de imágenes. No es obvio que aquí se configura el formulario que ven los voluntarios en el portal.

**Recomendación:** Renombrar a "⚙️ Configuración del portal de voluntarios". Separar en dos secciones: "Campos del formulario de registro" y "Imágenes de camiseta". Añadir preview inline de qué muestra el formulario al cambiar opciones.

---

### 7.4 No hay exportación de voluntarios por puesto

**Severidad: Media**

`exportarVoluntarios()` exporta todos los voluntarios. No hay forma de exportar "los 4 voluntarios del Avituallamiento KM 4 con sus teléfonos" para pasarlo al responsable de ese puesto.

**Recomendación:** En `FichaPuesto` del organizador, añadir botón "📊 Exportar lista del puesto" que genere un CSV/PDF con: nombre, teléfono, estado, horario, talla.

---

## 8. Heurística 8 — Estética y diseño minimalista

### 8.1 El header del bloque Voluntarios tiene demasiados botones

**Severidad: Alta**

El `block-actions` del header contiene: badge de cobertura, "+ Voluntario", "📊 Excel", "🔗 Portal voluntarios", "🔲 QR", "↗ Previsualizar". Son 6 elementos de acción en una sola línea, más la redundancia de que "Portal voluntarios", "QR" y "Previsualizar" hacen lo mismo (abrir/compartir el portal).

**Recomendación:** Consolidar en un menú dropdown "🔗 Compartir portal ▾" que contenga: Copiar enlace, Ver QR, Abrir en nueva pestaña. Reduce 3 botones a 1 sin perder funcionalidad.

---

### 8.2 El banner del portal URL está duplicado respecto al header

**Severidad: Baja**

El header ya tiene "🔗 Portal voluntarios" y "↗ Previsualizar". El banner bajo el header repite el enlace completo de nuevo. Dos zonas del UI hacen lo mismo.

**Recomendación:** Mantener el banner pero eliminar "Portal voluntarios" y "Previsualizar" del header (o viceversa).

---

### 8.3 El CSS del portal tiene 200+ líneas inline que dificultan el mantenimiento

**Severidad: Media**

La constante `CSS` en `VoluntarioPortal.jsx` tiene estilos completos para todas las pantallas del portal. Esto mezcla lógica y presentación, hace el componente muy pesado para leer, y los estilos no pueden ser reutilizados por otros componentes.

**Recomendación:** Extraer a `/src/styles/voluntario-portal.css` o bien a módulos CSS. Al menos dividir por sección: `portal-layout.css`, `portal-numpad.css`, `portal-forms.css`.

---

### 8.4 Tipografía inconsistente entre portal y panel

**Severidad: Media**

- Panel: usa `var(--font-display)` (Syne) para títulos y `var(--font-mono)` (DM Mono) para valores  
- Portal: también usa Syne y DM Mono pero los font-sizes no están vinculados a las mismas variables (`--fs-xs` vs `.72rem`, `--fs-base` vs `.85rem`)

**Recomendación:** El portal debe importar y usar las mismas custom properties del design system global. Definir en `:root` del documento principal y heredar.

---

## 9. Flujos críticos — Análisis de extremo a extremo

### 9.1 Flujo: Voluntario nuevo → Registro → Acceso portal ✅ Implementado

```
Landing → "Quiero ser voluntario" → StepperForm (3 pasos) 
→ RegistroOkScreen (instrucciones PIN + enlace) 
→ LoginScreen → PortalMain
```
**Estado: Completo.** Puntos de mejora: confirmación de marcar llegada, banner de PIN temporal.

---

### 9.2 Flujo: Voluntario existente → Login → Consulta puesto ✅ Implementado

```
Landing → "Ya soy voluntario" → Check endpoint (pinCambiado?) 
→ LoginScreen con mensaje contextual → PortalMain → PuestoDetalle (expandible)
```
**Estado: Completo.** Mejora pendiente: banner "X días para el evento".

---

### 9.3 Flujo: Voluntario → Cancelar asistencia ❌ No implementado

```
PortalMain → ??? 
```
**Estado: No existe.** El voluntario no tiene forma de indicar que no puede asistir. Impacto operativo alto.

---

### 9.4 Flujo: Organizador → Ver voluntarios en puesto en tiempo real 🟡 Parcial

```
TabDashboard (KPI enPuesto) → TabDiaD (checklist) 
→ Filtro "En puesto" en TabVoluntarios
```
**Estado: Implementado.** Problema: no hay auto-refresh. Si un voluntario marca su llegada, el organizador debe recargar manualmente para verlo.

---

### 9.5 Flujo: Organizador → Detectar voluntario sin puesto → Asignar ✅ Implementado

```
Dashboard card "Sin puesto asignado" 
→ Click en voluntario → FichaVoluntario → Editar → Asignar puesto
```
**Estado: Completo.**

---

### 9.6 Flujo: Organizador → Gestión de emergencia (voluntario no aparece) ❌ Parcial

No hay flujo definido para cuando un voluntario confirmado no aparece el día del evento. El organizador no puede:
- Marcar a un voluntario como "no presentado" (diferente de "cancelado")
- Ver qué puestos tienen voluntarios confirmados que no han llegado pasada la hora de inicio
- Contactar rápidamente a voluntarios de un mismo puesto

**Recomendación:** Nuevo estado `"ausente"` diferente de `"cancelado"`. En TabDiaD, después de la hora de inicio del puesto, resaltar en rojo los voluntarios confirmados que no han marcado llegada.

---

### 9.7 Flujo: Voluntario → Recibir instrucciones del organizador ❌ No implementado

El organizador puede escribir `notas` en la ficha del voluntario, pero el voluntario no las ve en su portal. El campo `notas` es solo interno.

**Estado: La nota del voluntario (notaVoluntario) SÍ llega al organizador. El sentido inverso NO está implementado.**

---

## 10. Integraciones entre bloques — Análisis

### 10.1 Voluntarios ↔ Camisetas ✅ Bien integrado

Camisetas lee automáticamente `teg_voluntarios_v1_voluntarios` y extrae tallas de confirmados/pendientes. La integración es unidireccional pero correcta. El toggle `camisetaEntregada` en la ficha del organizador actualiza el estado individual.

**Mejora:** El bloque Camisetas podría mostrar qué voluntarios faltan por recoger su camiseta (filtro `camisetaEntregada === false && estado === 'confirmado'`).

---

### 10.2 Voluntarios ↔ Logística 🟡 Integración por nombre de localización (frágil)

```js
materialPuesto = allAsig.filter(a => a.puesto === loc.nombre)
```

La conexión entre puestos de voluntarios y material de logística se hace por **nombre de texto** de la localización, no por ID. Si el nombre cambia en Logística (ej: "Avituallamiento KM 4" → "Avit. KM4"), la conexión se rompe silenciosamente.

**Severidad: Alta**

**Recomendación:** Usar `localizacionId` como clave de unión en ambos sistemas. El puesto ya tiene `localizacionId` vinculado a la tabla de localizaciones. En Logística, las asignaciones deben usar `localizacionId`, no el nombre de texto.

---

### 10.3 Voluntarios ↔ Dashboard global ✅ Bien integrado

El Dashboard global lee los datos de voluntarios correctamente y genera alertas contextuales según los días que faltan para el evento. La lógica de umbrales (>30 días sin alertas, 7-30 días avisos, <7 días crítico) es apropiada.

---

### 10.4 Voluntarios ↔ Proyecto ❌ Sin integración real

El botón "📋 Ver en Proyecto →" navega al bloque Proyecto, pero no hay ningún dato de voluntarios en el bloque Proyecto. El Proyecto tiene su propio módulo de tareas/Gantt sin conexión con la cobertura real.

**Recomendación:** Añadir en el bloque Proyecto una tarjeta de estado de voluntarios: "Cobertura: X% · Pendientes de confirmar: Y · Días para el evento: Z".

---

## 11. Accesibilidad y usabilidad móvil

### 11.1 Targets táctiles insuficientes en el listado de voluntarios

**Severidad: Media**

Las filas del listado de voluntarios tienen `padding: "0.5rem 0.75rem"` — demasiado pequeño para uso con el pulgar en mobile. El estándar WCAG 2.5.5 recomienda mínimo 44×44px.

---

### 11.2 El numpad de PIN no tiene feedback háptico

**Severidad: Baja**

En iOS Safari, el numpad no genera vibración al pulsar teclas. Aunque es una limitación del navegador, se puede simular con `navigator.vibrate()` donde esté disponible.

---

### 11.3 El campo de búsqueda en móvil activa el teclado sin necesidad

**Severidad: Baja**

El buscador global tiene `autofocus` implícito en algunos contextos. En móvil, esto puede abrir el teclado al navegar al tab Voluntarios, ocultando la mitad de la pantalla.

---

### 11.4 El tabbar inferior en móvil no existe en el portal del voluntario

**Severidad: Media**

El portal del voluntario es una página larga de scroll. No hay navegación entre secciones. Con puesto, material, compañeros, mis datos, cambiar PIN y contacto organizador, el usuario debe hacer mucho scroll para encontrar lo que busca.

**Recomendación:** Añadir anclas o un índice de secciones en el topbar del portal: `Puesto | Mis datos | Contacto`.

---

## 12. Nuevas características recomendadas

### Prioridad Alta

| # | Característica | Impacto | Complejidad |
|---|---|---|---|
| 1 | **Cancelación de asistencia desde portal voluntario** | Alto — reduce carga al organizador | Baja |
| 2 | **Confirmación antes de marcar llegada** | Alto — evita errores en día de evento | Baja |
| 3 | **Mensaje del organizador visible por voluntario** | Alto — comunicación bidireccional | Media |
| 4 | **Banner "X días para el evento" en portal** | Alto — contexto temporal | Baja |
| 5 | **Validación de teléfono duplicado al añadir voluntario** | Alto — prevención de datos duplicados | Baja |
| 6 | **Estado "ausente" para voluntarios que no aparecen** | Alto — gestión de emergencia real | Media |

### Prioridad Media

| # | Característica | Impacto | Complejidad |
|---|---|---|---|
| 7 | **Auto-refresh en portal voluntario** (polling 5 min) | Medio — estado actualizado sin intervención | Baja |
| 8 | **Indicador de acceso portal en ficha organizador** | Medio — soporte más eficaz | Baja |
| 9 | **Nombre del puesto en fila del listado** | Medio — información en contexto | Baja |
| 10 | **Selector de puesto enriquecido en modal** | Medio — reducción de errores | Media |
| 11 | **Exportación por puesto desde FichaPuesto** | Medio — coordinación de responsables | Baja |
| 12 | **Acciones masivas en listado voluntarios** | Medio — eficiencia organizador | Alta |
| 13 | **Menú dropdown "Compartir portal"** en header | Medio — simplificación UI | Baja |
| 14 | **Banner PIN temporal en primera entrada** al portal | Medio — seguridad | Baja |

### Prioridad Baja

| # | Característica | Impacto | Complejidad |
|---|---|---|---|
| 15 | **Índice de secciones en portal voluntario** | Bajo-Medio — UX móvil | Baja |
| 16 | **Feedback háptico en numpad** | Bajo — microinteracción | Baja |
| 17 | **Exportación de QR en alta resolución** (SVG) | Bajo — impresión de carteles | Baja |
| 18 | **Historial de cambios de estado** por voluntario | Bajo — trazabilidad | Alta |
| 19 | **Integración Logística por ID** en lugar de nombre | Alto técnico — robustez | Media |

---

## 13. Resumen de bugs confirmados pendientes

| Bug | Severidad | Estado |
|---|---|---|
| `className` duplicado en botones del header | Media | 🔴 Sin corregir |
| Cobertura muestra pendientes como confirmados | Alta | 🔴 Sin corregir |
| Token de sesión sin expiración en servidor | Media | 🔴 Sin corregir |
| Integración Logística por nombre (frágil) | Alta | 🔴 Sin corregir |
| `fetch()` vacío en `irAlPin` | Crítico | ✅ Corregido |
| `deleteVoluntario` race condition | Alta | ✅ Corregido |
| `presente` vs `enPuesto` incoherente | Alta | ✅ Corregido |
| `onUpdate(v.id, {...})` firma incorrecta | Media | ✅ Corregido |
| Filtro `en-puesto` lógica incorrecta | Media | ✅ Corregido |

---

## 14. Puntuación por heurística

| Heurística | Puntuación | Notas |
|---|---|---|
| 1. Visibilidad del estado | 5/10 | Estado de guardado ambiguo, sin auto-refresh |
| 2. Coincidencia mundo real | 6/10 | Terminología mejorada, cobertura confusa |
| 3. Control y libertad | 4/10 | No hay deshacer, no hay cancelación voluntario |
| 4. Consistencia y estándares | 5/10 | Dos sistemas CSS, className duplicado |
| 5. Prevención de errores | 5/10 | Duplicados no validados, token sin expiración |
| 6. Reconocimiento | 6/10 | Puesto no visible en fila, selector básico |
| 7. Flexibilidad y eficiencia | 6/10 | Sin acciones masivas visibles, sin atajos |
| 8. Estética minimalista | 6/10 | Header sobrecargado, CSS duplicado |
| 9. Ayuda al reconocer errores | 7/10 | Mensajes de error claros en general |
| 10. Ayuda y documentación | 5/10 | Tooltips en KPIs, falta guía en portal |
| **Media global** | **5.5/10** | **Funcional pero mejorable** |

---

## 15. Próximos pasos recomendados (roadmap)

### Sprint inmediato (1-2 sesiones)
1. Corregir `className` duplicado en header
2. Añadir cancelación desde portal voluntario
3. Confirmación antes de marcar llegada
4. Banner de días para el evento en portal
5. Nombre del puesto en fila del listado
6. Validación teléfono duplicado en `addVoluntario`

### Sprint medio plazo (3-5 sesiones)
1. Mensaje del organizador visible por voluntario
2. Cobertura basada en confirmados (no pendientes)
3. Índice de secciones en portal voluntario
4. Auto-refresh portal (polling 5 min)
5. Estado "ausente" en TabDiaD
6. Menú dropdown "Compartir portal"

### Sprint largo plazo
1. Refactoring CSS portal → design tokens compartidos
2. Integración Logística por ID (no por nombre)
3. Acciones masivas en listado
4. Expiración de tokens en servidor
5. Historial de cambios por voluntario

---

*Auditoría realizada sobre el commit más reciente del repositorio `trailelguerrero/app-carrera`. Versión del portal: Voluntarios.jsx (3.119 líneas), VoluntarioPortal.jsx (1.433 líneas). Fecha de análisis: Abril 2026.*
