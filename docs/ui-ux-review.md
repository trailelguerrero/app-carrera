# Revisión global de UI/UX – Trail El Guerrero

**Fecha:** Mayo 2026 · `app-carrera` — Panel interno + VoluntarioPortal

---

## 1. Visión general de la experiencia

### Panel interno (organizador)

El panel transmite una identidad visual clara y profesional: fondo oscuro profundo (`#08091a`), tipografía Syne como display y DM Mono como fuente funcional, acentos en cyan (`#22d3ee`) y una paleta semántica de colores bien definida (verde/ámbar/rojo). La estética "ops dashboard" es coherente con el perfil de un organizador técnico que gestiona un evento de montaña.

**Fortalezas:** sistema de tokens bien pensado en `blockStyles.js`, componentes reutilizables (cards, badges, buttons, inputs, modales), el indicador de auto-guardado es claro, y el sistema de toasts funciona bien.

**Debilidades principales:** densidad de información muy alta en algunos bloques (Presupuesto, Logística), variabilidad en los tamaños de fuente entre módulos (el panel usa `--fs-base: 0.82rem` pero `Index.jsx` usa `--fs-xs: 0.85rem` — los dos tokens referencian tamaños distintos), y muchos colores hardcoded (`#dc2626`, `#059669`, `#f87171`) mezclados con los tokens CSS del sistema.

### VoluntarioPortal

El portal es una aplicación autónoma con su propio CSS inlined (más de 300 líneas en un template literal). El diseño prioriza correctamente la sencillez y el tacto: max-width de 460px centrado, botones grandes (min-height 56px en CTA principales), jerarquía de pantallas clara. Para un voluntario que accede desde el móvil el día de la carrera, es suficiente.

**Fortalezas:** flujo lineal y predecible, el numpad de PIN es muy usable en táctil, los estados de error son claros, y el botón de "Confirmar llegada" fue movido a una posición prominente.

**Debilidades principales:** el CSS duplicado replica casi exactamente los tokens del panel (misma paleta, misma tipografía, mismos radios) pero en un sistema completamente aislado — cualquier cambio de marca exige actualizarlo en dos sitios.

### Mobile-first y uso en contexto de carrera

Ambas aplicaciones funcionan razonablemente en móvil, pero el panel no fue diseñado _para_ móvil: la nav inferior funciona, pero los bloques de gestión (Presupuesto, Logística, Voluntarios) tienen tablas y grids que no escalan bien en pantallas pequeñas. El VoluntarioPortal sí es nativo-mobile. DíaCarrera es el único bloque del panel pensado explícitamente para el día de carrera en táctil.

---

## 2. Sistema visual y diseño (Design System)

### 2.1 Tipografía, color y componentes

#### Tipografías

| Fuente | Rol | Uso |
|--------|-----|-----|
| Syne | Display / Headings | Títulos de módulos, KPIs, botones primarios |
| DM Mono | Datos / Labels / UI | Metadatos, timestamps, badges, inputs |

La dualidad Syne + DM Mono es acertada: Syne da personalidad y DM Mono alinea horizontalmente los datos numéricos. Sin embargo:

- `--fs-base` en `blockStyles.js` = `0.82rem` → equivale a ~13px en una pantalla 16px-base. Es pequeño para uso en móvil bajo estrés.
- `--fs-xs` en `blockStyles.js` = `0.70rem` → 11.2px. Los badges y metadatos son prácticamente ilegibles en móviles con DPI bajo o en interiores con poca luz.
- `VoluntarioPortal.jsx` usa `--fs-xs: 0.85rem` — exactamente el tamaño que el panel llama `--fs-sm`. Los mismos tokens tienen valores distintos en los dos contextos.

#### Paleta de colores

Ambas apps comparten la misma paleta semántica (cyan, green, amber, red, violet, orange) con los mismos valores hexadecimales. **Esto es bueno** — es la base para una futura unificación.

El problema está en los colores hardcoded dispersos en el código:
- `#dc2626` (rojo Tailwind) en `Index.jsx` líneas 293, 383 — no es el `var(--red)` del sistema
- `#059669` (verde Tailwind) en `Index.jsx` línea 369 — no es el `var(--green)` del sistema
- `#f0f4ff` como color de texto base en el portal — no tiene token
- `rgba(248,113,113,0.12)`, `#f87171` hardcoded en la nav de `Index.jsx`
- `fontFamily:"'Syne', 'Inter', system-ui, sans-serif"` hardcoded en `Index.jsx` línea 712 en lugar de `var(--font-display)`

#### Componentes

| Componente | Panel | Portal | Coherencia |
|-----------|-------|--------|-----------|
| Botón primario | `.btn.btn-primary` | `.vp-btn.vp-btn-primary` | ⚠️ mismo aspecto, clases distintas |
| Botón ghost | `.btn.btn-ghost` | `.vp-btn.vp-btn-ghost` | ⚠️ mismo aspecto, clases distintas |
| Input | `.inp` | `<input className="inp">` via CSS interno | ⚠️ mismos estilos, misma clase, contextos aislados |
| Badge | `.badge` | `.vp-badge` | ⚠️ mismo sistema semántico, prefijo distinto |
| Card | `.card` | `.vp-card` | ⚠️ mismos radios, mismo fondo, prefijos distintos |
| Modal | `.modal-box` | No existe en portal | ✅ apropiado — portal no usa modales |
| Toast | `.teg-toast` | No existe (usa inline) | ❌ inconsistente |

---

### 2.2 Coherencia entre panel y VoluntarioPortal

#### Diferencias visuales principales

| Aspecto | Panel | Portal | Evaluación |
|---------|-------|--------|-----------|
| Fondo base | `#08091a` | `#08091a` | ✅ Idéntico |
| Tipografía | Syne + DM Mono | Syne + DM Mono | ✅ Idéntica |
| Paleta semántica | cyan/green/amber/red | cyan/green/amber/red | ✅ Idéntica |
| `--fs-base` | `0.82rem` | `1.02rem` | ❌ 20% más grande en portal |
| `--fs-xs` | `0.70rem` | `0.85rem` | ❌ Nombres iguales, valores distintos |
| Radius | `--r: 10px` | `--r: 12px` | ⚠️ Diferencia menor |
| Max-width | Sin restricción | `460px` centrado | ✅ Apropiado por contexto |
| Densidad | Alta (backoffice) | Baja (portal público) | ✅ Apropiado por contexto |

**¿Tiene sentido que sean distintos?** Sí, parcialmente. El portal debe ser más espacioso y táctil. **Pero** la divergencia en los _valores_ de los mismos _nombres de tokens_ (`--fs-xs`, `--fs-base`) es un error de mantenibilidad, no una decisión de diseño intencional.

#### Estrategia de unificación propuesta

1. **Fase 1 — Tokens compartidos:** Crear `src/styles/tokens.css` con la paleta semántica, tipografías y breakpoints. Importar desde ambos contextos.
2. **Fase 2 — Escala tipográfica contextual:** Un único conjunto de tokens con dos escalas:
   ```css
   /* tokens.css */
   --fs-base-panel:  0.82rem;   /* backoffice, alta densidad */
   --fs-base-portal: 1.02rem;   /* portal público, táctil */
   ```
3. **Fase 3 — Componentes base comunes:** `Button.jsx`, `Badge.jsx`, `Card.jsx`, `Input.jsx` como componentes React con variantes controladas por props en lugar de clases CSS duplicadas.

---

## 3. Navegación y estructura de la información

### 3.1 Panel interno

#### Estructura de navegación

El panel usa una **nav inferior en móvil** (slots: DASH, PROY, PRES, VOLS, LOG, Más) y una **top bar** con el nombre del evento. La arquitectura funciona bien para los 5 módulos principales, pero tiene problemas:

- **El menú "Más" esconde bloques críticos.** Patrocinadores, Camisetas, Documentos y Configuración están detrás de un drawer. En el día de carrera, si el coordinador necesita acceder a Documentos para mostrar un permiso, tiene que abrir "Más", buscar el bloque y hacer clic. Son 3 toques en lugar de 1.

- **DíaCarrera no tiene icono en la nav.** Se accede desde el botón "DÍA D" en el Dashboard o via `autoOpenDia` en la configuración. Es el bloque más crítico el día del evento y no tiene acceso directo desde la nav.

- **Los badges de alerta son visibles pero pequeños.** El número superpuesto sobre el icono (`fontFamily:"monospace", border:"1.5px solid var(--bg)"`) usa una fuente monoespaciada que no es la del sistema (debería ser DM Mono o al menos `var(--font-mono)`).

- **El estado activo en la nav** usa un punto bajo el icono + color cyan. Es sutil — en condiciones de luz solar directa sobre la pantalla puede ser difícil de distinguir el tab activo.

- **Configuración está en el drawer "Más"** y no tiene badge de alerta ni indicador visual si hay problemas de configuración. Un organizador nuevo puede no encontrarla.

#### Problemas de descubribilidad

- El acceso a la pantalla de **onboarding** se activa vía un botón `?` muy pequeño en el top bar. En Android, este botón puede solaparse con la barra de navegación del sistema.
- El **indicador de auto-guardado** aparece en la top bar. En móvil, cuando el teclado está abierto, la top bar queda fuera de la pantalla y el usuario no ve el estado de guardado.

---

### 3.2 VoluntarioPortal

#### Flujo de navegación

```
Landing → [Registrarme | Ya soy voluntario]
  Registrarme → Paso 1 (datos) → Paso 2 (camiseta) → Paso 3 (puesto) → RegistroOK
  Ya soy voluntario → Login p1 (teléfono) → Login p2 (PIN) → Ficha
```

**Puntos fuertes:** el stepper de 3 pasos tiene progreso visual claro. El numpad de PIN es grande y fácil de usar con el pulgar.

**Problemas de navegación:**

- **No hay botón "Atrás" en el stepper de registro.** Si el usuario comete un error en el paso 2 (camiseta), tiene que recargar la página para volver al paso 1. Riesgo de abandono elevado.

- **La sección de la ficha no tiene anclas de navegación interna.** Con 7+ secciones (puesto, equipo, material, mis datos, seguridad, cancelar...), en un móvil el scroll es la única forma de navegar. Las secciones no tienen headers flotantes ni índice rápido.

- **El botón "Salir" está en el topbar** (bien), pero es muy pequeño (texto "Salir" en rojo con padding mínimo). El tap target podría ser insuficiente para dedos grandes.

---

## 4. Flujos de trabajo clave y coherencia funcional

### 4.1 Organización interna

#### Revisar el estado global (Dashboard)

**Fluido:** los KPIs están bien organizados, las alertas son visibles y la sección "¿Qué hago hoy?" del sprint de Proyecto añade mucho valor.

**Fricciones:**
- Los KPIs de diferentes módulos tienen tamaños de fuente inconsistentes (`--fs-xl` para los valores grandes del bloque Presupuesto, pero valores más pequeños en el Dashboard de voluntarios).
- El módulo de salud del evento (barra colapsable) está en la parte superior del Dashboard pero colapsado por defecto — la información más crítica requiere un tap extra para verse.

#### Gestión de Presupuesto

**Fluido:** el wizard de pestañas (Inscripciones, Costes, Otros ingresos, P&L, Equilibrio) tiene lógica clara.

**Fricciones:**
- Las tablas de conceptos de coste tienen columnas con headers muy pequeños (`--fs-xs` = 0.70rem = ~11px) con información crítica. En móvil son prácticamente ilegibles.
- El `KpiGlobal` es sticky en desktop pero en móvil queda fuera de pantalla al editar conceptos.

#### Gestión de Voluntarios

**Fluido:** la separación entre la lista de voluntarios y la vista de puestos es clara.

**Fricciones:**
- El modal de edición del voluntario es largo (muchos campos) y no tiene secciones colapsables. En móvil requiere mucho scroll.
- Las sugerencias de reubicación (nuevo) no tienen un CTA visual suficientemente prominente.

#### Uso de DíaCarrera

**Fluido:** el tab "🎯 Ahora" añadido reciente es exactamente lo correcto.

**Fricciones:**
- La transición entre el panel principal y DíaCarrera (modal fullscreen) no tiene animación de entrada en algunos dispositivos — el cambio de contexto es abrupto.
- No hay forma de volver al panel desde DíaCarrera sin cerrar el modal completo.

---

### 4.2 Experiencia del voluntario

#### Registro

**Fluido:** 3 pasos bien definidos, validación inline.

**Fricciones:**
- El campo "Nombre" en el paso 1 no indica explícitamente que se necesitan nombre Y apellidos. Un voluntario puede registrarse solo con el nombre.
- La guía de tallas en el paso 2 (imagen) puede no cargarse si la conexión es lenta. No hay placeholder ni indicador de carga.
- El paso 3 (puesto) muestra todos los puestos del evento. Para un evento con 12+ puestos, la lista puede ser muy larga en móvil sin ningún agrupamiento.

#### Login

**Fluido:** normalización del teléfono y numpad son acertados.

**Fricciones:**
- El mensaje "Teléfono o PIN incorrecto" es genérico (correcto por seguridad) pero no hay ninguna indicación de dónde pedir ayuda. El enlace "Contacta con la organización" añadido es insuficiente si el usuario no sabe el teléfono de la organización.

#### Ficha del voluntario

**Fricciones de coherencia entre portal y panel:**

| Concepto | Portal (voluntario ve) | Panel (organizador ve) | Coherencia |
|---------|----------------------|----------------------|-----------|
| Estado confirmado | "✓ Confirmado" (badge verde) | "confirmado" en select | ✅ |
| Puesto | Nombre del puesto + horario | Nombre del puesto | ✅ |
| Talla | XXS…4XL (9 tallas) | XXS…4XL (9 tallas) | ✅ (corregido) |
| Llegada | "✅ En puesto desde las HH:MM" | `enPuesto` + `horaLlegada` | ✅ (corregido) |
| Camiseta | "📦 Por recoger el día del evento" | `camisetaEntregada: false` | ✅ (corregido) |

La coherencia ha mejorado significativamente con los últimos sprints.

**Fricciones restantes:**
- El sección "Tu equipo en el puesto" muestra a los compañeros con nombre pero sin teléfono. El voluntario no puede contactar con su responsable sin ir a la sección de contactos.
- El mensaje del organizador (`mensajeOrganizador`) no tiene timestamp — el voluntario no sabe si es información de hoy o de hace semanas.

---

## 5. Accesibilidad y uso en móvil

### Tamaños tipográficos

| Token | Panel | Portal | WCAG mínimo |
|-------|-------|--------|------------|
| `--fs-xs` | **0.70rem** (~11px) | 0.85rem (~14px) | 12px recomendado |
| `--fs-sm` | 0.75rem (~12px) | 0.92rem (~15px) | OK |
| `--fs-base` | 0.82rem (~13px) | 1.02rem (~16px) | OK en portal, límite en panel |

`--fs-xs` en el panel (0.70rem = ~11.2px) está por debajo del umbral de legibilidad cómoda para textos de interfaz. Los badges, metadatos y timestamps que usan este tamaño son difíciles de leer en condiciones de campo.

### Tap targets

- Los botones `.btn` tienen `min-height: 44px` — cumple el mínimo de Apple HIG (44px) pero no el de Material Design (48px).
- Los badges de alerta en la nav (el número rojo sobre el icono) tienen ~20×20px de área interactiva real — son informativos, no interactivos, lo cual es correcto.
- El botón "Salir" en el topbar del portal es texto puro con padding mínimo — el tap target es inferior a 44px.

### Contraste

| Elemento | Color texto | Fondo | Ratio estimado | WCAG AA |
|---------|------------|-------|---------------|---------|
| `--text-muted` (#96aacf) sobre `--bg2` (#0f172a) | Azul-gris claro | Azul muy oscuro | ~4.8:1 | ✅ |
| `--fs-xs` texto normal (#f0f4ff) | Blanco | `--surface` (#0d1121) | ~14:1 | ✅ |
| Badge red (`#f87171`) sobre `var(--red-dim)` rgba(248,113,113,.10) | Coral | ~#0e1223 con tinte rojo | ~4.2:1 | ✅ |
| `--text-dim` (#6680a8) sobre `--surface2` (#121829) | Azul-gris apagado | Azul oscuro | ~3.1:1 | ⚠️ Falla AA para texto pequeño |

**Problema de contraste:** `var(--text-dim)` sobre `var(--surface2)` tiene ratio ~3.1:1, que falla WCAG AA para texto menor de 18px. Este par se usa frecuentemente en metadatos, helpers y labels secundarios en `--fs-xs` y `--fs-sm`.

### Estados de foco

El panel no tiene estilos de `:focus-visible` personalizados consistentes. Los inputs y botones usan el outline del navegador (azul en Chrome, naranja en Firefox) que contrasta mal sobre el fondo oscuro. No hay indicadores de foco adaptados al tema oscuro.

### Problemas concretos

1. **Tablas en Presupuesto y Logística** — en móvil (<430px) las columnas se solapan o producen scroll horizontal sin indicador visual de que hay más columnas.
2. **El modal de edición de voluntario** — cuando se abre el teclado en Android, el modal no hace scroll correctamente y el botón "Guardar" queda detrás del teclado virtual.
3. **El numpad de PIN del portal** — usa CSS grid con columnas de 80px fijos. En pantallas < 320px de ancho (antiguas), los botones pueden solaparse.
4. **Formulario de incidencia en DíaCarrera** — el textarea de descripción tiene `resize: vertical`. En móvil esto puede causar que el formulario sea difícil de usar si el usuario arrastra el handle de resize accidentalmente.

---

## 6. Recomendaciones de unificación y guía de estilo

### 6.1 Principios de diseño recomendados

1. **Un único acento de color.** El cyan (`#22d3ee`) es el color de la marca. Todos los CTAs primarios, estados activos y highlights usan cyan. Los demás colores (green, amber, red) tienen roles semánticos, nunca decorativos.

2. **Jerarquía por peso, no por tamaño.** Máximo 3 tamaños de texto por pantalla (título, cuerpo, metadato). La distinción entre niveles se hace con `font-weight: 800 / 600 / 400` antes que con tamaños distintos.

3. **Densidad contextual.** El panel puede ser denso (organizador experto, pantalla grande), el portal debe ser espacioso (voluntario no-técnico, móvil, estrés). Los componentes compartidos tienen una prop `dense` que activa la variante de alta densidad.

4. **Datos en mono, interfaz en display.** Números, fechas, códigos, porcentajes → DM Mono. Títulos, descripciones, acciones → Syne. No mezclar en el mismo elemento.

5. **Estado siempre visible.** Cada entidad tiene un badge de estado visible en la lista sin necesidad de abrir la ficha. Verde = OK, ámbar = atención, rojo = problema, gris = inactivo/sin datos.

6. **Feedback inmediato.** Toda acción que modifica datos emite un toast en menos de 300ms. Toda operación de red muestra un spinner o skeleton antes de mostrar el resultado.

7. **Mobile-first desde el diseño, no como afterthought.** El tap target mínimo es 48px. Los textos de interfaz son `>= 14px` (~0.875rem). Los formularios largos tienen secciones plegables con resumen visible.

8. **Una fuente de verdad por concepto.** Un estado de "confirmado", un color de "vencido", un texto de "sin datos". Definidos en constantes compartidas, no repetidos en componentes.

---

#### Manifiesto de diseño

> **Trail El Guerrero es una herramienta operativa, no un producto de consumo.** Cada píxel debe ayudar al organizador a tomar decisiones correctas más rápido bajo presión. La belleza es consecuencia de la claridad, no un objetivo en sí mismo.
>
> — En caso de duda entre más información o más espacio, elegir espacio.
> — En caso de duda entre innovar en la interacción o usar el patrón conocido, usar el patrón conocido.
> — En caso de duda entre colores, usar el token semántico, nunca el hexadecimal hardcoded.

---

### 6.2 Propuesta de Design System unificado

#### Tokens recomendados

```css
/* src/styles/tokens.css — importado por panel y portal */

:root {
  /* Marca */
  --brand:        #22d3ee;
  --brand-dim:    rgba(34,211,238,.10);
  --brand-border: rgba(34,211,238,.28);

  /* Semánticos */
  --color-success:  #34d399;
  --color-warning:  #fbbf24;
  --color-danger:   #f87171;
  --color-info:     #a78bfa;

  /* Fondo */
  --bg-deep:    #08091a;
  --bg-base:    #0f172a;
  --bg-surface: #0d1121;
  --bg-raised:  #121829;
  --bg-top:     #18203a;

  /* Texto */
  --text-primary:   #f0f4ff;
  --text-secondary: #96aacf;
  --text-tertiary:  #6680a8;  /* solo usar en tamaños >= 0.875rem */

  /* Borde */
  --border-default: #1e2d50;
  --border-light:   #2a4070;

  /* Tipografía */
  --font-display: 'Syne', sans-serif;
  --font-data:    'DM Mono', monospace;

  /* Escala tipográfica — panel (alta densidad) */
  --text-2xs:  0.688rem;  /* 11px — solo badges numéricos */
  --text-xs:   0.75rem;   /* 12px — metadatos, no interactivos */
  --text-sm:   0.875rem;  /* 14px — labels, celdas tabla */
  --text-base: 1rem;      /* 16px — cuerpo, inputs */
  --text-md:   1.125rem;  /* 18px — subtítulos sección */
  --text-lg:   1.375rem;  /* 22px — títulos módulo */
  --text-xl:   2rem;      /* 32px — KPI values */

  /* Espaciado */
  --space-1:  0.25rem;  /* 4px */
  --space-2:  0.5rem;   /* 8px */
  --space-3:  0.75rem;  /* 12px */
  --space-4:  1rem;     /* 16px */
  --space-6:  1.5rem;   /* 24px */
  --space-8:  2rem;     /* 32px */

  /* Radios */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;

  /* Sombras */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.4);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.5);
}

/* Variante portal — sobreescribir escala tipográfica */
.portal-context {
  --text-xs:   0.875rem;
  --text-sm:   1rem;
  --text-base: 1.125rem;
}
```

#### Componentes base comunes recomendados

```
Button.jsx     — variantes: primary, secondary, ghost, danger, icon-only
              — tamaños: sm (40px), md (44px), lg (52px)
Badge.jsx      — variantes: success, warning, danger, info, neutral, outline
              — tamaños: xs, sm, md
Input.jsx      — estados: default, focus, error, disabled
              — variantes: text, number, date, select, textarea
Card.jsx       — variantes: default, highlighted, clickable
Toast.jsx      — tipos: success, error, warning, info
              — posición: bottom (ajustable para nav inferior)
Spinner.jsx    — tamaños: sm, md, lg
EmptyState.jsx — con icono, título, descripción y CTA opcional
```

---

## 7. Lista priorizada de mejoras UI/UX

### Corto plazo — 1–2 sprints

| # | Mejora | Impacto | Esfuerzo |
|---|--------|---------|---------|
| 1 | Aumentar `--fs-xs` del panel de `0.70rem` a `0.75rem` y `--fs-base` de `0.82rem` a `0.875rem` | Alto | Bajo |
| 2 | Eliminar colores hardcoded en `Index.jsx` (`#dc2626`, `#059669`, `#f87171`) → usar tokens CSS | Medio | Bajo |
| 3 | Aumentar el tap target del botón "Salir" en el portal a `min-height: 44px` | Alto | Bajo |
| 4 | Añadir botón "← Atrás" en el stepper de registro del portal | Alto | Bajo |
| 5 | Añadir `:focus-visible` con outline de 2px cyan en panel y portal | Medio | Bajo |
| 6 | Timestamp en `mensajeOrganizador` del portal | Medio | Bajo |
| 7 | Teléfono del responsable de puesto en "Tu equipo" del portal | Medio | Bajo |
| 8 | DíaCarrera — añadir acceso directo desde la nav (no solo desde Dashboard) | Alto | Bajo |
| 9 | Corregir `--text-dim` sobre `--surface2`: ratio 3.1:1 → buscar par con >= 4.5:1 | Medio | Bajo |
| 10 | Fix del textarea con `resize: vertical` en DíaCarrera — usar `resize: none` en móvil | Bajo | Bajo |

### Medio plazo — unificación y refactors

| # | Mejora | Impacto | Esfuerzo |
|---|--------|---------|---------|
| 11 | Crear `src/styles/tokens.css` con paleta unificada | Alto | Medio |
| 12 | Extraer `Button.jsx`, `Badge.jsx`, `Input.jsx` como componentes compartidos | Alto | Medio |
| 13 | Tablas del panel con scroll horizontal indicado (sombra en el borde) | Medio | Medio |
| 14 | Modal de edición de voluntario con secciones plegables | Medio | Medio |
| 15 | Stepper de onboarding revisado — flow más corto (de 5 pasos a 3) | Medio | Medio |
| 16 | Secciones de ficha del voluntario con chips de navegación fija (tabs) | Medio | Medio |
| 17 | Indicador de "Más pestañas disponibles" en nav inferior con flechas sutiles | Bajo | Bajo |
| 18 | Animación de entrada para DíaCarrera (fade + scale) | Bajo | Bajo |

### Largo plazo — rediseños estructurales

| # | Mejora | Impacto | Esfuerzo |
|---|--------|---------|---------|
| 19 | Nav del panel con 6 slots visibles en lugar de 5+Más: DASH, PROY, VOLS, LOG, DOCS, ··· | Alto | Alto |
| 20 | Panel responsive con sidebar en tablet/desktop en lugar de nav inferior | Medio | Alto |
| 21 | Modo "Día de carrera" global — cuando `diasHasta === 0`, toda la app pivota a DíaCarrera como pantalla principal | Alto | Alto |
| 22 | Sistema de notificaciones push para voluntarios (cuando el organizador actualiza su puesto o horario) | Alto | Alto |

---

*Informe generado sobre el commit `221b129` de `trailelguerrero/app-carrera`.*
