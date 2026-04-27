# Roadmap — Portal Personal del Voluntario
## app-carrera · Trail El Guerrero 2026

**Versión:** 3.0  
**Estimación total:** ~2 semanas de desarrollo  
**Fecha objetivo:** operativo antes del 1 de agosto 2026

---

## Diseño del sistema de acceso

### Autenticación: teléfono + PIN de 4 dígitos

| Concepto | Detalle |
|----------|---------|
| Identificador | Número de teléfono (ya único en la BD) |
| PIN inicial | Últimos 4 dígitos del teléfono · automático |
| PIN personalizado | El voluntario puede cambiarlo desde su portal |
| Sesión | 7 días en `localStorage` del móvil |
| Reset de PIN | El organizador puede resetearlo desde FichaVoluntario |
| Acceso del organizador | Ve todas las fichas desde `/panel` sin PIN adicional |

### Voluntarios ya registrados (antes del portal)

- El `pinHash` se genera automáticamente en el primer intento de acceso
- No requieren ninguna acción previa
- Comunicación: un mensaje al grupo de WhatsApp es suficiente

---

## Nuevos campos en el modelo del voluntario

```javascript
{
  // ── Campos existentes (sin cambios) ───────────────────────────────────
  id, nombre, telefono, talla, puestoId, estado, /* ... */

  // ── Campos nuevos ─────────────────────────────────────────────────────
  pinHash:           "-1234567890",  // hash(4 últimos dígitos del teléfono)
  sessionToken:      "xyz...",       // token de sesión activa (null si no hay)
  camisetaEntregada: false,          // marcado por el organizador
  enPuesto:          false,          // marcado por el voluntario desde su portal
  horaLlegada:       null,           // "08:45" — se registra con enPuesto=true
}
```

---

## Pantalla del portal del voluntario

```
/voluntarios/mi-ficha
──────────────────────────────────────────────
  🏔 TRAIL EL GUERRERO 2026

  Hola, Ana 👋  · Estado: ✅ Confirmado

  ┌──────────────────────────────────────────┐
  │ 📍 Tu puesto                             │
  │ Avituallamiento KM 7                     │
  │ 🕗 Incorporación: 07:30                  │
  │ 📏 Distancias: TG13 · TG25              │
  └──────────────────────────────────────────┘

  ─────────────────────────────────────────
  [ 📍  YA ESTOY EN MI PUESTO  ]    ← 56px
  ─────────────────────────────────────────
       (o ✓ Llegada registrada · 08:45)

  👥 Compañeros en tu puesto (3)
  ────────────────────────────────
  · Luis Mora        📞 623 456 789
  · Carmen Ruiz      📞 634 567 890
  · Pedro Sánchez    📞 645 678 901
  (Solo voluntarios confirmados y pendientes)

  Mis datos            [✏️ Editar]
  ─────────────────────────────────
  📞 Teléfono         612 345 678
  🚨 Emergencia       654 321 987
  🎽 Talla            M
  🎽 Camiseta         ⏳ Pendiente
                  (o ✅ Entregada el 29/08)

  ──────────────────────────────────
  🔐 Cambiar mi PIN  [→]
  ──────────────────────────────────

  Contacto organizador:
  📞 Ivan · 6XX XXX XXX
──────────────────────────────────────────────
```

### Pantalla de login

```
/voluntarios/mi-ficha  (sin sesión activa)
──────────────────────────────────────────
  🏔 Trail El Guerrero 2026
  Accede a tu ficha de voluntario

  Teléfono
  [___ ___ ___]   ← input tel, 9 dígitos

  PIN  (4 dígitos)
  [_][_][_][_]    ← numpad estilo iOS

  [  Entrar  ]

  ──────────────────────────────────────
  ¿No recuerdas tu PIN?
  Contacta con el organizador
──────────────────────────────────────────
```

### Pantalla de confirmación del formulario de registro

Al completar el registro, la pantalla `🎉 ¡Registro completado!` incluye:

```
  ┌─────────────────────────────────────────┐
  │  📱 Tu ficha personal                    │
  │                                          │
  │  Cuando te confirmemos, accede con:      │
  │  · Tu teléfono: 612 *** ***              │
  │  · PIN inicial: 5678                     │
  │    (últimos 4 dígitos de tu teléfono)    │
  │                                          │
  │  [Copiar enlace al portal]               │
  └─────────────────────────────────────────┘
```

---

## Nuevos endpoints de API

### `api/voluntarios/auth.js`

```
POST /api/voluntarios/auth
Body: { telefono: "612345678", pin: "5678" }

→ 200: {
    id, nombre, telefono, talla, estado,
    puestoNombre, horaIncorporacion,
    enPuesto, horaLlegada, camisetaEntregada,
    sessionToken  ← guardado en localStorage del voluntario
  }
→ 401: "Teléfono o PIN incorrecto"
→ 429: "Demasiados intentos. Espera 5 minutos"
```

Seguridad: rate limiting 5 intentos / 10 min por IP. Mensaje de error idéntico para teléfono inexistente y PIN incorrecto (evita enumeración).

### `api/voluntarios/ficha.js`

```
GET /api/voluntarios/ficha?tel=612345678&token=SESSION_TOKEN
→ 200: {
    // Datos del voluntario
    id, nombre, telefono, telefonoEmergencia, talla,
    enPuesto, horaLlegada, camisetaEntregada,
    // Datos del puesto
    puesto: { nombre, horaInicio, distancias, notas },
    // Compañeros de puesto — SOLO nombre y teléfono
    companerosEnPuesto: [
      { nombre: "Luis Mora",    telefono: "623456789" },
      { nombre: "Carmen Ruiz", telefono: "634567890" },
    ]
  }

PATCH /api/voluntarios/ficha
Body: { tel, token, cambios: { telefono?, telefonoEmergencia?, talla? } }
→ 200: { success: true }

POST /api/voluntarios/ficha/presente
Body: { tel, token }
→ 200: { enPuesto: true, horaLlegada: "08:45" }

POST /api/voluntarios/ficha/cambiar-pin
Body: { tel, token, pinNuevo: "1234" }
→ 200: { success: true }
```

**Seguridad de los compañeros:** El endpoint filtra exactamente `v.puestoId === voluntario.puestoId` y devuelve **únicamente** `nombre` y `telefono`. Nunca devuelve email, talla, estado de camiseta, horaLlegada ni notas de otros voluntarios.

---

## Cambios en el panel del organizador

### FichaVoluntario — 4 nuevos elementos

1. **Badge de llegada** en el header: si `enPuesto=true` → `📍 En puesto · 08:45`
2. **Toggle camiseta** en los campos: `🎽 Camiseta entregada` (solo el organizador puede marcarlo)
3. **Botón "📱 Copiar enlace al portal"** → copia el enlace al portapapeles para enviar por WhatsApp
4. **Botón "🔑 Resetear PIN"** → regenera el PIN a los últimos 4 del teléfono

### TabVoluntarios — nueva columna compacta

Dos iconos al final de cada fila: `📍` (en puesto, con tooltip de la hora) y `🎽` (camiseta entregada).

### TabDiaD — columna "En puesto"

La columna de presencia (marcada por el organizador) se complementa con la hora de llegada registrada por el voluntario:

| Voluntario | Puesto | 📍 Llegada | ✓ Presente |
|------------|--------|-----------|------------|
| Ana García | AV KM7 | 08:45     | ✅ |
| Luis Mora  | Meta   | —         | ⬜ |

### Pantalla de confirmación del formulario de registro

Añadir el bloque de acceso al portal (teléfono + PIN inicial) en la pantalla `🎉 ¡Registro completado!`.

---

## Plan de implementación por fases

### Fase 1 — Backend (2-3 días)

- [ ] Añadir campos `pinHash`, `sessionToken`, `camisetaEntregada`, `enPuesto`, `horaLlegada` al sanitizado en `api/data/public.js`
- [ ] Generación automática de `pinHash` al registrarse: `hash(telefono.slice(-4))`
- [ ] Crear `api/voluntarios/auth.js` con rate limiting (5 intentos / 10 min)
- [ ] Crear `api/voluntarios/ficha.js` con GET, PATCH, POST /presente, POST /cambiar-pin
- [ ] Tests manuales con Postman / curl

### Fase 2 — Portal del voluntario (3-4 días)

- [ ] Nueva ruta `/voluntarios/mi-ficha` en `App.tsx`
- [ ] Componente `VoluntarioPortal.jsx`:
  - `VolLogin` — pantalla de login con numpad de PIN estilo iOS
  - `VolDashboard` — ficha principal con botón "En puesto" prominente
  - `VolCompaneros` — lista de compañeros del puesto (nombre + teléfono clicable)
  - `VolEditar` — formulario de edición de datos personales
  - `VolCambiarPin` — cambio de PIN con confirmación
- [ ] CSS mobile-first: botones ≥56px, tipografía mínimo 16px, alto contraste

### Fase 3 — Integración con el panel (1-2 días)

- [ ] Badge y campo `enPuesto` / `horaLlegada` en FichaVoluntario
- [ ] Toggle `camisetaEntregada` en FichaVoluntario
- [ ] Iconos `📍` y `🎽` en lista de TabVoluntarios
- [ ] Columna hora de llegada en TabDiaD
- [ ] Botones "Copiar enlace" y "Resetear PIN" en FichaVoluntario
- [ ] Bloque de acceso al portal en pantalla de confirmación del registro

### Fase 4 — Pruebas con voluntarios reales (3-5 días)

- [ ] Prueba con 5 voluntarios del club (iOS Safari + Android Chrome)
- [ ] Verificar que el botón "En puesto" llega al panel en tiempo real
- [ ] Verificar edición de datos personales y reflejo en el panel
- [ ] Verificar que los compañeros de puesto se muestran correctamente
- [ ] Ajustes de UX basados en feedback

---

## Consideraciones adicionales

**¿Qué pasa si el voluntario no tiene puesto asignado aún?**  
La sección "Tu puesto" muestra: *"Pendiente de asignación. Te informaremos pronto."* La sección de compañeros no aparece.

**¿Qué pasa si el voluntario cambia de puesto?**  
Los compañeros se recalculan en tiempo real en el backend al hacer GET. El voluntario verá los compañeros del puesto actual siempre actualizado.

**¿Voluntarios cancelados aparecen en la lista de compañeros?**  
No. El endpoint filtra `estado !== 'cancelado'` antes de devolver los compañeros.

**¿El organizador ve que un voluntario ha cambiado su PIN?**  
No necesita saberlo. Solo puede resetearlo si el voluntario se lo pide.

**¿Hay notificación al organizador cuando un voluntario marca "En puesto"?**  
No hay push notification (requeriría Service Worker + servidor de notificaciones). El organizador ve la actualización la próxima vez que carga el TabDiaD (dato reactivo via `useData`).

---

*Portal del Voluntario v3.0 · Trail El Guerrero 2026 · Club Deportivo Trail Candeleda*
