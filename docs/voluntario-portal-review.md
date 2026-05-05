# Revisión del VoluntarioPortal

**Fecha:** Mayo 2026 · `app-carrera` · Trail El Guerrero 2026
**Archivo analizado:** `src/pages/VoluntarioPortal.jsx` (1.762 líneas)
**URL de acceso:** `/voluntarios/mi-ficha`

---

## 1. Mapa de pantallas y flujo completo

### 1.1 Diagrama de flujo

```
[URL /voluntarios/mi-ficha]
        │
        ▼
┌── Sesión en localStorage? ──────── SÍ ──→ Token válido? ──SÍ──→ [Portal ficha]
│         NO                                      │ NO
│                                                 ▼
│                                          [Landing] (sesión limpiada)
│
└──→ [Landing]
        │
        ├──→ "Registrarme" ──→ [Registro cargando] (fetch puestos/config/opciones)
        │                           │
        │                           ▼
        │                    [Paso 1: Nombre + Teléfono + Talla (+ emergencia opcional)]
        │                           │ Siguiente →
        │                           ▼
        │                    [Paso 2: Camiseta (imágenes frontal/dorsal + guía de tallas)]
        │                           │ Siguiente →
        │                           ▼
        │                    [Paso 3: Puesto (opcional) + Vehículo (opcional) + Email (opcional)]
        │                           │ Confirmar →
        │                           ▼
        │                    [POST /api/data/public — crear voluntario estado=pendiente]
        │                           │ OK
        │                           ▼
        │                    [Registro OK] ← muestra teléfono, instrucciones para acceder
        │                           │ "Acceder ahora" →
        │                           ▼
        │                    [Login paso 1: teléfono] ← pre-rellenado con el registrado
        │
        └──→ "Ya soy voluntario" ──→ [Login paso 1: teléfono]
                                            │ Siguiente →
                                            ▼
                                     [Login paso 2: PIN numpad 4 dígitos]
                                            │ Error → shake + mensaje
                                            │ OK →
                                            ▼
                                     [POST /api/voluntarios?action=auth]
                                            │ Éxito → saveSession(token)
                                            ▼
                                     [Portal ficha]
                                            │
                                     ┌──────┴──────────────────────────────────────────┐
                                     │  Si estado=cancelado → [Pantalla cancelado]     │
                                     │  Si estado=pendiente → [Ficha con banner PIN]   │
                                     │  Si estado=confirmado → [Ficha completa]         │
                                     └──────────────────────────────────────────────────┘
                                            │
                                     ┌──────┴──────┐
                                     │             │
                                     ▼             ▼
                              [Editar datos]  [Cambiar PIN]
                                     │             │ OK →
                                     ▼             ▼
                              [PATCH ficha]  [Confirmación PIN cambiado]
                                             (auto-logout en 3s)
```

### 1.2 Pantallas y estados principales

| Pantalla / Estado | Condición de acceso | Descripción |
|------------------|--------------------|-|
| `landing` | Sin sesión | Dos CTAs: Registrarme / Ya soy voluntario |
| `registro` | Click "Registrarme" | 3 pasos con StepperForm |
| `registroOk` | Registro completado | Confirmación con teléfono y próximos pasos |
| `login` | Click "Ya soy voluntario" o tras RegistroOk | 2 pasos: teléfono + PIN numpad |
| `portal` | Token válido | Ficha principal con todas las secciones |
| **Portal: estado `pendiente`** | `v.estado === "pendiente"` | Banner de PIN temporal amarillo |
| **Portal: estado `confirmado`** | `v.estado === "confirmado"` | Ficha completa con sección de llegada |
| **Portal: estado `cancelado`** | `v.estado === "cancelado"` | Pantalla de participación cancelada con CTA de contacto |
| **Portal: estado `ausente`** | `v.estado === "ausente"` | No manejado — cae en el caso por defecto del portal |
| `cambiarPin` | Dentro del portal | Formulario: PIN actual + nuevo + confirmación |
| `editarDatos` | Dentro del portal | Campos: talla, teléfono emergencia, alergias, medicación, nota |
| `enPuesto` | `v.enPuesto === true` | El botón "Llegué a mi puesto" se reemplaza por estado confirmado con hora |

---

## 2. Modelo de datos y gestión de sesión

### 2.1 Voluntario (shape que devuelve la API)

```typescript
interface VoluntarioPublico {
  // Identidad
  id:                   number;
  nombre:               string;   // Puede incluir apellidos concatenados
  telefono:             string;
  email?:               string;
  talla:                string;

  // Asignación
  puestoId:             number | null;
  rol:                  "responsable" | "apoyo";

  // Estado
  estado:               "pendiente" | "confirmado" | "cancelado" | "ausente";
  fechaRegistro?:       string;

  // Logística
  coche:                boolean;
  notas?:               string;
  telefonoEmergencia?:  string;   // Campo actual
  contactoEmergencia?:  string;   // Campo legado (migrado en API)
  alergias?:            string;
  medicacion?:          string;

  // Día de carrera
  enPuesto:             boolean;
  horaLlegada:          string | null;
  camisetaEntregada:    boolean;

  // Seguridad (NO se devuelven al cliente)
  // pinHash, sessionToken, sessionTokenExpiry → stripped en la API
  pinPersonalizado?:    boolean;  // Sí se devuelve para mostrar el banner de PIN temporal

  mensajeOrganizador?:  string;
}
```

### 2.2 Puesto (shape de `PuestoDetalle`)

```typescript
interface PuestoPortal {
  id:            number;
  nombre:        string;
  tipo:          string;
  distancias:    string[];
  horaInicio:    string;
  horaFin:       string;
  necesarios:    number | null;
  notas?:        string;
  tiempoLimite?: string;    // Hora de corte (solo controles)
  // Campos NO incluidos aunque existen en el panel:
  // responsableId, localizacionId
}
```

### 2.3 Gestión de sesión

**Mecanismo:** Token almacenado en `localStorage[SESSION_KEY]` con timestamp.

```javascript
SESSION_KEY = "teg_vol_session"
SESSION_TTL = 7 * 24 * 60 * 60 * 1000  // 7 días
```

**Ciclo de vida:**
1. Login OK → `saveSession({ token, voluntario, ts: Date.now() })`
2. Al montar el componente → `loadSession()` verifica que `Date.now() - ts < SESSION_TTL`
3. Expiración → `localStorage.removeItem(SESSION_KEY)` + redirige a landing
4. Logout manual → `clearSession()` + `setScreen("landing")`

**Problema: `loadSession` está duplicada en el archivo.** Las funciones `loadSession`, `saveSession`, `clearSession` y `fetchPublic` aparecen definidas dos veces en el archivo (líneas 18-34 y repetidas justo después). JavaScript usa la última definición, lo que es un bug latente.

**Problema de seguridad:** El token de sesión se almacena en `localStorage`. En un dispositivo compartido (tablet del organizador, móvil prestado), si otro voluntario usa el mismo dispositivo y no cierra sesión, tendrá acceso a la ficha del voluntario anterior hasta que expire el token (7 días). No hay botón de "cerrar sesión" visible en la pantalla principal — está enterrado bajo el scroll en la sección de cancelación.

**Qué ocurre al expirar la sesión:**
- Si el voluntario llega con el portal ya abierto en pantalla, no hay un listener de tiempo que cierre la sesión. La sesión expira solo la próxima vez que el componente se monta (siguiente visita).
- Si el token del servidor ha expirado pero el localStorage no, la petición `GET ?action=ficha` devuelve 401 y el portal limpia la sesión y redirige a landing.

---

## 3. Inconsistencias, incongruencias y duplicidades

### 3.1 Respecto al bloque Voluntarios del panel

#### INC-01: `nombre` y `apellidos` — campo unificado vs separado

**Portal:** Registra `nombre` y `apellidos` por separado en `StepperForm`, pero el API crea el voluntario con `nombre: "Nombre Apellidos"` concatenado (sin campo `apellidos`).

**Panel:** Tiene ahora el campo `apellidos` separado (arreglado en sprint anterior), pero al mostrar voluntarios creados desde el portal, el campo `apellidos` estará vacío y el nombre completo estará en `nombre`.

**Riesgo:** Búsqueda por apellido en el panel puede no encontrar voluntarios registrados desde el portal si el nombre completo está en `nombre`.

**Solución:** El endpoint `POST /api/data/public` para crear voluntarios debería guardar `apellidos` por separado si viene en el body.

---

#### INC-02: Estado `ausente` no manejado en el portal

**Panel:** Define 4 estados: `pendiente`, `confirmado`, `cancelado`, `ausente`.

**Portal:** Solo maneja `pendiente`, `confirmado` y `cancelado`. El estado `ausente` cae en el bloque por defecto del portal — el voluntario ve la ficha normal aunque el organizador lo haya marcado como ausente.

**Riesgo:** Un voluntario marcado como ausente después del evento puede seguir viendo su ficha como si todo estuviese normal.

**Solución:**
```jsx
if (v.estado === "ausente") return (
  <AusenteScreen v={v} onLogout={handleLogout} />
);
```

---

#### INC-03: `hashPin` definida en el portal y en la API con lógica idéntica pero sin compartir código

**Portal (`VoluntarioPortal.jsx` líneas 20-25):**
```javascript
function hashPin(pin) {
  let h = 0;
  for (let i = 0; i < pin.length; i++) {
    h = (Math.imul(31, h) + pin.charCodeAt(i)) | 0;
  }
  return String(h);
}
```

**API (`api/voluntarios/index.js` líneas 7-12):** Idéntica.

**Panel interno (`Voluntarios.jsx`):** También tiene su propia copia de `hashPinLocal`.

Hay **3 copias** de la misma función. Si alguna vez cambia el algoritmo de hashing, hay que actualizarlas todas manualmente.

**Solución:** Extraer a `src/lib/pinUtils.js` y `api/lib/pinUtils.js` (compartir entre frontend y serverless).

---

#### INC-04: `cobertura` y `companerosEnPuesto` calculados en la API, no en el portal

El portal recibe `companerosEnPuesto` pre-calculado desde la API. El panel calcula la cobertura localmente. No hay un helper compartido de cálculo de cobertura.

---

#### INC-05: `camisetaEntregada` mostrado pero no actualizable desde el portal

El portal muestra el estado de entrega de la camiseta en la ficha pero no tiene ningún mecanismo para que el voluntario lo marque desde el portal. La actualización viene exclusivamente del bloque Camisetas del panel. No hay inconsistencia de semántica, pero la UX es confusa: el voluntario ve "⏳ Pendiente" pero no puede hacer nada con eso.

---

### 3.2 Gestión del PIN y seguridad

#### PIN inicial predictible

El PIN inicial es `telefono.slice(-4)`. Un número de teléfono `612345678` tiene PIN `5678`. Para un atacante que conozca el teléfono de un voluntario (visible en carteles de la organización), adivinar el PIN es trivial si el voluntario no lo ha cambiado.

**Métricas del riesgo:** Si `pinPersonalizado === false`, el PIN es 100% predecible con el número de teléfono.

#### Rate limiting solo en el servidor, no en el cliente

La API tiene rate limiting de 5 intentos / 10 minutos por IP. El portal no tiene ningún feedback visual de bloqueo — solo muestra el error genérico "Teléfono o PIN incorrecto" en todos los casos, incluyendo cuando la API devuelve 429.

**Código relevante:**
```javascript
// VoluntarioPortal.jsx — sin diferenciación de respuesta 429
if (!res.ok) {
  // No hay manejo específico de status 429
  shake(); setErr("Teléfono o PIN incorrecto");
}
```

**Solución:**
```javascript
if (res.status === 429) {
  const data = await res.json();
  setErr(data.error || "Demasiados intentos. Espera unos minutos.");
  return;
}
```

#### Banner de PIN temporal no lleva a cambiar el PIN

El banner "⚠️ Estás usando el PIN temporal" en la ficha tiene el texto correcto pero al hacer click solo hace scroll hasta la sección de seguridad al final de la página. En móvil, este banner puede no ser obvio.

#### Cambio de PIN requiere PIN actual — correcto, pero el reset no

El cambio de PIN desde el portal requiere conocer el PIN actual (correcto). Pero el reset desde el panel no requiere autenticación adicional del organizador más allá de la `x-api-key`. Si alguien intercepta la clave de API, puede resetear el PIN de cualquier voluntario.

---

## 4. UX y flujos de trabajo del voluntario

### 4.1 Registro en 3 pasos

**Problemas detectados:**

- **El campo "Nombre" acepta cualquier valor sin validación de apellido.** Un voluntario puede registrarse como "Juan" sin apellido. El panel no puede identificarlo luego entre múltiples "Juan".
- **Paso 2 (camiseta) puede ser confuso para el voluntario:** No es obvio que el paso 2 solo sirve para elegir la talla viendo la imagen. Muchos voluntarios pueden presionar "Siguiente" sin elegir talla.
- **El campo de "Puesto" en el paso 3 muestra la lista completa de puestos** sin indicar cuáles están llenos. Un voluntario puede elegir un puesto que ya tiene cobertura completa.
- **El manejo de errores de red es básico:** Si el servidor está caído durante el registro, el botón "Confirmar registro" muestra un spinner y luego un texto de error genérico sin opción de reintentar.
- **No hay confirmación de duplicado de teléfono:** Si el voluntario ya está registrado e intenta registrarse de nuevo, la API devolverá un error pero el mensaje no es específico sobre la causa.

**Propuestas de mejora:**
1. Añadir validación de apellido obligatorio en paso 1
2. En el paso 3, mostrar el número de voluntarios ya asignados vs necesarios por cada puesto
3. Manejar `res.status === 409` del servidor con mensaje específico: "Ya existe un voluntario con este teléfono. Accede con tu PIN."
4. Añadir botón "Reintentar" en los errores de red

---

### 4.2 Login (teléfono + PIN con numpad)

**Problemas detectados:**

- **El error "Teléfono o PIN incorrecto" es idéntico** para teléfono no encontrado y para PIN erróneo. No permite al voluntario distinguir si olvidó el teléfono con el que se registró o si olvidó el PIN.
- **El numpad no muestra los números en orden natural** en móviles donde el teclado del sistema también aparece. El voluntario puede confundirse entre el numpad personalizado y el teclado del sistema.
- **No hay "¿Olvidaste tu PIN?"** en la pantalla de login. Un voluntario que olvidó el PIN no tiene ninguna instrucción sobre qué hacer.
- **La validación del teléfono en el paso 1 acepta formatos variados** pero el PIN inicial se basa en los últimos 4 dígitos. Si el voluntario escribió `+34 612 345 678` en el registro pero ahora escribe `612345678`, la normalización puede fallar.
- **No se maneja el status 429** del rate limiting — el error aparece igual que una contraseña incorrecta.

**Propuestas de mejora:**
1. Mensaje diferenciado: "Teléfono no encontrado" vs "PIN incorrecto" (aunque implique más información para un atacante, mejora enormemente la UX)
2. Añadir enlace "Contacta con la organización" al pie del paso de PIN
3. Manejar explícitamente el status 429 con countdown visual
4. Normalizar el teléfono al escribirlo (quitar espacios, guiones, +34) antes de enviar

---

### 4.3 Ficha del voluntario

**Estructura actual:**
```
[Header: Nombre + Badge estado]
[Banner PIN temporal — si aplica]
[Banner escenario semana de carrera — si aplica]
[Confirmación de llegada — si confirmado]
[Sección: Tu puesto]
[Sección: Tu equipo en el puesto]
[Sección: Material en tu puesto]
[Sección: Mis datos]
[Sección: Contacto con la organización]
[Sección: Seguridad (cambiar PIN)]
[Sección: Cancelar participación — si no cancelado]
```

**Problemas detectados:**

- **"Confirmación de llegada" está demasiado abajo.** En el día de carrera, esta es la acción más crítica del voluntario. Debería estar en la primera pantalla visible, no después del puesto y el equipo.
- **La sección "Tu equipo en el puesto" muestra a los compañeros** pero sin teléfonos. El voluntario no puede contactar con su responsable sin ir a "Contacto con la organización". Mostrar el teléfono del responsable del puesto sería muy útil.
- **"Cancelar participación" está al final de un scroll largo.** Una acción irreversible tan importante no debería estar escondida, pero tampoco tan accesible que sea fácil activarla por error.
- **El mensaje del organizador (`mensajeOrganizador`)** se muestra en la ficha pero no tiene timestamp. El voluntario no sabe si el mensaje es de hoy o de hace 3 semanas.
- **El formulario de edición de datos** (talla, teléfono emergencia, alergias, medicación) aparece como un inline form dentro de la sección "Mis datos". El botón "Guardar cambios" no da feedback claro de si el guardado fue exitoso más allá del mensaje emergente.
- **El estado `camisetaEntregada: false` muestra "⏳ Pendiente"** con un emoji de reloj que sugiere que algo está en proceso. Sería mejor "📦 Pendiente de recoger" con instrucciones sobre cómo recibirla.

**Propuestas de mejora:**
1. Mover "Confirmar llegada" a la primera sección visible, con botón grande
2. En "Tu equipo", mostrar el teléfono del responsable del puesto
3. Añadir timestamp al mensaje del organizador
4. Cambiar "⏳ Pendiente" de camiseta por "📦 Por recoger el día del evento"
5. Añadir botón de "Cerrar sesión" visible en el header, no solo en el scroll inferior

---

## 5. Interconexión fuerte con el panel interno

### 5.1 Campos que deben ser 100% compartidos

| Campo | Portal | Panel | Estado |
|-------|--------|-------|--------|
| `nombre` | String concatenado | String + `apellidos` separado | ⚠️ Divergente |
| `apellidos` | No guardado | Campo separado | ⚠️ Divergente |
| `telefono` | String normalizado | String raw | ⚠️ Normalización inconsistente |
| `talla` | `TALLAS_PORTAL` = TALLAS | `TALLAS` en Camisetas | ✅ Unificado (sprint anterior) |
| `estado` | `"pendiente"|"confirmado"|"cancelado"` | + `"ausente"` | ⚠️ Estado ausente sin handler en portal |
| `telefonoEmergencia` | Campo actual | Campo actual + migración de `contactoEmergencia` | ⚠️ Migración solo en API |
| `alergias` / `medicacion` | Editable en portal | Visible en panel | ✅ Compartido |
| `enPuesto` | Solo lectura desde portal | Editable desde portal (POST presente) | ✅ Compartido |
| `camisetaEntregada` | Solo lectura | Escrito por Camisetas | ✅ Compartido |
| `pinHash` | Gestionado en API | No visible en panel | ✅ Solo API |
| `puestoId` | Solo lectura | Editable | ✅ Shared via BD |

### 5.2 Estrategia de modelo compartido

**Problema actual:** El shape de voluntario se infiere en cada capa — el portal lo conoce por la respuesta de la API, el panel lo tiene en `VOLUNTARIOS_DEFAULT`, y la API lo define en `api/voluntarios/index.js`. No hay un único contrato tipado.

**Propuesta — Contrato de API común:**

```typescript
// src/types/voluntario.ts — compartido por portal y panel
export type EstadoVoluntario = "pendiente" | "confirmado" | "cancelado" | "ausente";

export interface VoluntarioBase {
  id:                  number;
  nombre:              string;
  apellidos?:          string;
  telefono:            string;
  email?:              string;
  talla:               string;
  puestoId:            number | null;
  rol:                 "responsable" | "apoyo";
  estado:              EstadoVoluntario;
  coche:               boolean;
  notas?:              string;
  telefonoEmergencia?: string;
  alergias?:           string;
  medicacion?:         string;
  enPuesto:            boolean;
  horaLlegada:         string | null;
  camisetaEntregada:   boolean;
  fechaRegistro?:      string;
}

// Lo que devuelve la API (sin campos de seguridad)
export type VoluntarioPublico = Omit<VoluntarioBase, never> & {
  mensajeOrganizador?: string;
  pinPersonalizado?:   boolean;
};
```

**Propuesta — Normalización en capa de servicios:**

Crear `src/lib/voluntarioUtils.js` con funciones puras:
```javascript
export const normalizarTelefono = (tel) => tel.replace(/\D/g, "").replace(/^34/, "");
export const nombreMostrado = (v) => [v.nombre, v.apellidos].filter(Boolean).join(" ");
export const estadoLabel = (estado) => ({ pendiente:"⏳ Pendiente", confirmado:"✓ Confirmado", cancelado:"✕ Cancelado", ausente:"🚫 Ausente" }[estado] ?? estado);
```

---

## 6. Nuevas funciones sugeridas

### 6.1 Briefing personal descargable en PDF

**Descripción funcional:**
Botón "📄 Descargar mi briefing" en la ficha del voluntario que genera un PDF de una página con: nombre del voluntario, puesto asignado, horario, distancias que atiende, tiempo límite (si es control), teléfonos de los coordinadores, lista de material asignado, alergias/medicación relevante y mapa de ubicación del puesto (si está disponible). El PDF es ligero y pensado para imprimir o guardar offline.

**Datos y endpoints necesarios:**
- Todo ya disponible en la respuesta de `GET /api/voluntarios?action=ficha`
- Generación: cliente-side con `jspdf` o `html2canvas` sobre un componente oculto
- No requiere cambios en la API

**Propuesta técnica:**
```jsx
import jsPDF from 'jspdf';

function BriefingButton({ voluntario, puesto, material, config }) {
  const generarPDF = async () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    // Cabecera
    doc.setFontSize(22); doc.text("Trail El Guerrero 2026", 20, 25);
    doc.setFontSize(14); doc.text(`Briefing de voluntario`, 20, 35);
    
    // Datos del voluntario
    doc.setFontSize(18); doc.text(nombreMostrado(voluntario), 20, 52);
    doc.setFontSize(11); doc.text(`📞 ${voluntario.telefono}`, 20, 60);
    
    // Puesto
    if (puesto) {
      doc.setFontSize(13); doc.text("🏔️ Tu puesto", 20, 75);
      doc.setFontSize(11);
      doc.text(puesto.nombre, 25, 83);
      doc.text(`⏰ ${puesto.horaInicio} – ${puesto.horaFin}`, 25, 90);
      if (puesto.tiempoLimite) doc.text(`🚩 Tiempo límite: ${puesto.tiempoLimite}`, 25, 97);
    }
    
    // Material
    if (material?.length > 0) {
      doc.setFontSize(13); doc.text("📦 Material en tu puesto", 20, 112);
      material.forEach((m, i) => doc.text(`• ${m.nombre} × ${m.cantidad}`, 25, 120 + i * 7));
    }
    
    doc.save(`briefing_${(voluntario.nombre || 'voluntario').replace(/\s+/g,'_')}.pdf`);
  };
  
  return (
    <button className="vp-btn vp-btn-secondary" onClick={generarPDF}>
      📄 Descargar mi briefing
    </button>
  );
}
```

---

### 6.2 Mensajes de broadcast del organizador

**Descripción funcional:**
Una sección en la parte superior de la ficha que muestra mensajes enviados por el organizador a todos los voluntarios (o a un puesto específico). Los mensajes tienen timestamp y pueden ser: informativos (azul), importantes (ámbar) o urgentes (rojo). El voluntario puede marcarlos como leídos. En el panel interno, el organizador tiene un formulario para crear y enviar estos mensajes.

**Datos y endpoints necesarios:**
- Nueva clave en BD: `teg_voluntarios_v1_mensajes` → `Mensaje[]`
- `GET /api/data/public?collection=teg_voluntarios_v1_mensajes` → mensajes activos
- `Mensaje = { id, texto, nivel, fecha, destinatarios: "todos" | puestoId[], activo: boolean }`
- Los mensajes leídos se marcan en localStorage del voluntario (sin llamada al servidor)

**Propuesta técnica:**
```jsx
function MensajesOrganizador({ puestoId }) {
  const [mensajes, setMensajes] = useState([]);
  const [leidos, setLeidos] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("teg_mensajes_leidos") || "[]")); } 
    catch { return new Set(); }
  });
  
  useEffect(() => {
    fetchPublic(LS_KEY_VOL + "_mensajes").then(data => {
      if (!Array.isArray(data)) return;
      const activos = data.filter(m => m.activo && (
        m.destinatarios === "todos" || 
        (Array.isArray(m.destinatarios) && m.destinatarios.includes(puestoId))
      ));
      setMensajes(activos.sort((a,b) => b.fecha.localeCompare(a.fecha)));
    });
  }, [puestoId]);
  
  const marcarLeido = (id) => {
    const nuevos = new Set([...leidos, id]);
    setLeidos(nuevos);
    localStorage.setItem("teg_mensajes_leidos", JSON.stringify([...nuevos]));
  };
  
  const noLeidos = mensajes.filter(m => !leidos.has(m.id));
  if (noLeidos.length === 0) return null;
  
  return (
    <div className="vp-section">
      <div className="vp-section-title">📢 Mensajes de la organización</div>
      {noLeidos.map(m => (
        <div key={m.id} className={`vp-mensaje vp-mensaje-${m.nivel || "info"}`}
          onClick={() => marcarLeido(m.id)}>
          <div className="vp-mensaje-texto">{m.texto}</div>
          <div className="vp-mensaje-meta">
            {new Date(m.fecha).toLocaleDateString("es-ES")} · Toca para marcar como leído
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

### 6.3 Historial de participaciones anteriores

Sección colapsable "Mi historial en Trail El Guerrero" que lista las ediciones anteriores en las que el voluntario ha participado, con el puesto que cubrió en cada una. Requiere guardar en el modelo de voluntario un array `historialEdiciones: { edicion: string, puesto: string, anio: number }[]`.

---

### 6.4 Avisos de cambio de puesto o horario

Cuando el organizador modifica el puesto o el horario del voluntario desde el panel, se genera una entrada en `voluntario.historial` con tipo `"cambio_puesto"`. En el portal, si existe una entrada de ese tipo más reciente que la última visita del voluntario, se muestra un aviso destacado: "⚠️ Tu puesto ha sido modificado. Revisa los detalles."

---

## 7. Plan de refactor recomendado

### Corto plazo — sin cambios de modelo

1. **Manejar status 429** en el login con mensaje diferenciado y countdown visual.
2. **Eliminar la definición duplicada** de `loadSession`, `saveSession`, `clearSession` y `fetchPublic` (líneas duplicadas al inicio del archivo).
3. **Añadir pantalla `ausente`** en el portal para el estado no manejado.
4. **Mover "Confirmar llegada"** a la primera sección visible de la ficha.
5. **Botón "Cerrar sesión" visible** en el header del portal, sin necesidad de scroll.
6. **Texto de camiseta pendiente:** "📦 Por recoger el día del evento" en lugar de "⏳ Pendiente".
7. **Timestamp en mensajes del organizador** (`mensajeOrganizador`).
8. **Normalizar teléfono** al escribirlo en el login (quitar +34, espacios, guiones).

### Medio plazo — cambios de modelo y arquitectura

9. **Guardar `apellidos` por separado** en el endpoint de registro público.
10. **Extraer `hashPin` y `pinInicial`** a un módulo compartido (evitar 3 copias).
11. **Añadir handler para `ausente`** en el portal con pantalla dedicada.
12. **Mensajes de broadcast** del organizador (función 6.2).
13. **Briefing descargable en PDF** (función 6.1).
14. **Tipo compartido `VoluntarioBase`** en `src/types/voluntario.ts`.
15. **`voluntarioUtils.js`** con `normalizarTelefono`, `nombreMostrado`, `estadoLabel`.
16. **Refactor de `SESSION_KEY` a `sessionStorage`** para sesiones más cortas y seguras en dispositivos compartidos (con opción "Mantener sesión activa 7 días" como checkbox en el login).

### Riesgos si no se actúan

- **Definición duplicada de funciones (INC-06):** Si algún día las funciones duplicadas se modifican solo en una de las dos copias, el comportamiento puede cambiar silenciosamente. El riesgo es bajo pero el coste de arreglarlo ahora es 5 minutos.
- **PIN predictible (sección 3.2):** En Trail El Guerrero con 150 voluntarios, la mayoría tendrán PIN temporal. Un attacker que conozca los teléfonos de la lista de voluntarios (disponible en acreditaciones impresas) puede acceder a las fichas de los voluntarios que no han cambiado el PIN. Con alergias y medicación en la ficha, esto es un problema de privacidad real.
- **Estado `ausente` sin handler:** Después del evento, los voluntarios marcados como ausentes ven la ficha normal. Si intentan marcar llegada al puesto, la API lo procesa como si fuesen activos. Esto puede corromper el registro de asistencia.
- **3 copias de `hashPin`:** Cuando se mejore la seguridad del PIN (por ejemplo añadiendo salt o migrando a bcrypt), habrá que recordar actualizar las tres copias. El olvido de una copiarompe el login de todos los voluntarios.

---

*Informe generado sobre el commit `1a17803` de `trailelguerrero/app-carrera`.*
*Revisión recomendada: antes de la apertura del portal a los voluntarios (junio 2026).*
