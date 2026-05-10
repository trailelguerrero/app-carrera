# Flujo de Trabajo por Tarea — app-carrera

> **Cuarto documento.** Leer antes de ejecutar cualquier tarea concreta.
> Este archivo describe el protocolo exacto de ensamblaje de contexto antes de escribir código.

---

## ¿Cómo ejecutar una tarea?

Para cada tarea del roadmap, construye el prompt de trabajo combinando **5 piezas** en este orden:

```
1. PROMPT DE ROL        → del roadmap-referencia.md (sección "Prompt de rol" de la tarea)
2. CONTEXTO DE AUDITORÍA → de auditoria-contexto.md (sección §3.x relevante)
3. TAREA DEL ROADMAP    → de roadmap-referencia.md (la tarea completa con qué hacer + criterio)
4. CÓDIGO ACTUAL        → los archivos reales del proyecto que vas a modificar
5. INSTRUCCIÓN DE ANCLAJE → siempre la misma (ver abajo)
```

---

## Instrucción de anclaje (usar en TODAS las tareas)

```
Aplica los cambios mínimos necesarios para cumplir el criterio de aceptación.
No refactorices código fuera del alcance de esta tarea.
No cambies el valor de ninguna clave "teg_..." — solo el token en el código fuente.
Cuando termines, muestra el diff de cada archivo modificado.
```

---

## Ejemplo completo: Tarea 0.3

### Pieza 1 — Prompt de rol

```
Eres un Security Engineer con experiencia en autenticación frontend.
Sabes que localStorage es manipulable y que los contadores en memoria
se resetean con F5. El lockout que implementas protege contra acceso
físico no autorizado al dispositivo del organizador, NO contra ataques
automatizados externos (ese vector se mitiga en Fase 4).
Tu código documenta este modelo de amenaza en un comentario al inicio
del módulo de lockout. Es simple, sin dependencias externas.

Lo que NO debes hacer: afirmar que el lockout "dificulta" ataques
automatizados externos. No lo hace. Solo documenta lo que sí hace.
```

### Pieza 2 — Contexto de auditoría (§3.2)

```
Problema SEC-02 — Sin lockout:
PinScreen.jsx no tiene contador de intentos fallidos. Se pueden probar
los 10.000 PINs de 4 dígitos programáticamente con dispatchEvent sin
ningún límite. Importante: el lockout en localStorage solo protege contra
acceso físico no autorizado al dispositivo del organizador. NO protege
contra ataques automatizados externos (nueva ventana de incógnito =
localStorage limpio). La solución real para ataques externos es la
Fase 4 (bcrypt server-side con rate limiting en PostgreSQL).

Problema SEC-03 — DEFAULT_PIN en claro:
export const DEFAULT_PIN = "1975" en el código fuente.

Bien resuelto: checkSession() valida TTL de 8h y versión de sesión.
```

### Pieza 3 — Tarea del roadmap (0.3)

```
Tarea 0.3 — Lockout por intentos fallidos en PinScreen.jsx
Tipo: corrección de seguridad | Prioridad: alta | Tiempo: 1–2 horas

Qué hacer:
En PinScreen.jsx, añadir lógica de lockout: guardar en localStorage el
contador de intentos fallidos y el timestamp del primer intento del período.
Tras 10 intentos fallidos en una ventana de 5 minutos, bloquear el formulario
durante 60 segundos con countdown visual. Al desbloquear, resetear el contador.
El lockout debe sobrevivir a recargas de página.
Añadir clave SK_AUTH_LOCKOUT a storageKeys.js.

Archivos: src/components/auth/PinScreen.jsx, src/constants/storageKeys.js

Criterio de aceptación:
Introducir 10 PINs incorrectos → formulario muestra countdown de 60s y teclado
deshabilitado. Recargar la página dentro del período → bloqueo persiste.
```

### Pieza 4 — Código actual

```
[Aquí pegas el contenido completo de:]
- src/components/auth/PinScreen.jsx
- src/constants/storageKeys.js
```

### Pieza 5 — Instrucción de anclaje

```
Aplica los cambios mínimos necesarios para cumplir el criterio de aceptación.
No refactorices código fuera del alcance de esta tarea.
No cambies el valor de ninguna clave "teg_..." — solo el token en el código fuente.
Cuando termines, muestra el diff de cada archivo modificado.
```

---

## Plantilla genérica (copiar y rellenar para cada tarea)

```
## ROL

[Pegar el bloque "Prompt de rol" de la tarea en roadmap-referencia.md]

## CONTEXTO DE AUDITORÍA

[Pegar la sección §3.x relevante de auditoria-contexto.md]

## TAREA

[Pegar la tarea completa de roadmap-referencia.md:
 - Tipo, prioridad, tiempo estimado
 - Qué hacer (lista completa)
 - Archivos afectados
 - Criterio de aceptación
 - Riesgos si los hay]

## CÓDIGO ACTUAL

[Pegar el contenido de cada archivo que vas a modificar, con su ruta:]

### src/ruta/al/archivo.jsx
```jsx
[contenido completo]
```

## INSTRUCCIÓN DE ANCLAJE

Aplica los cambios mínimos necesarios para cumplir el criterio de aceptación.
No refactorices código fuera del alcance de esta tarea.
No cambies el valor de ninguna clave "teg_..." — solo el token en el código fuente.
Cuando termines, muestra el diff de cada archivo modificado.
```

---

## Mapa rápido: tarea → secciones de auditoría relevantes

| Tarea | Sección de auditoría |
|-------|---------------------|
| 0.1 — README/env | §3.3 |
| 0.2 — manifest.json | §3.6 INC-04 |
| 0.3 — Lockout PinScreen | §3.2 (SEC-02, SEC-03) |
| 0.4 — Modal teg-conflict | §3.1 (DS-01, INC-07) |
| 0.5 — VERCEL_URL proxy | §3.7 (SEC-09) |
| 1.1 — Añadir 24 claves SK | §3.4 |
| 1.2 — Reemplazar strings | §3.4 |
| 1.3 — Eliminar constants.js duplicado | §3.6 INC-01 |
| 2.1 — BLOCK_CSS a estático | §3.5 |
| 2.2 — Unificar tokens CSS | §3.5 |
| 3.1 — Centralizar fmtEur | §3.6 INC-03 |
| 3.2 — Bug TDZ Logistica.jsx | §3.6 INC-05 |
| 3.3 — Dividir Proyecto.jsx | §2 (inventario) |
| 3.4 — Dividir Camisetas/Dashboard | §2 (inventario) |
| 3.5 — Logo base64 | §3.6 INC-06 |
| 4.1 — bcrypt panel | §3.2 (SEC-01, SEC-02) |
| 5.1 — useCallback setSyncConfig | §3.1 (DS-02) |
| 5.2 — Upload imágenes camisetas | §5 (tabla de estado) |
| 5.3 — setMultiple debounce | §3.1 (DS-02) |
| 5.4 — Advertencia PIN temporal | §3.2 (SEC-04) |
| 6.1 — Skeleton loaders | §5 (tabla de estado) |
| 6.2 — Estados vacíos portal | §5 (tabla de estado) |
| 7.0 — Diagnóstico tests | §5 (tabla de estado) |
| 7.1 — Auditar suites | §5 (tabla de estado) |
| 7.2 — Tests E2E | §5 (tabla de estado) |

---

## Reglas de oro al ejecutar

1. **Leer antes de escribir.** Abre el archivo que vas a modificar completo antes de proponer código.
2. **Un archivo a la vez.** No proponer cambios en 5 archivos en paralelo — verificar uno antes de pasar al siguiente.
3. **El diff es obligatorio.** Cada respuesta termina con el diff exacto de lo que cambió.
4. **El criterio de aceptación es el juez.** Si no puedes verificarlo, no está terminado.
5. **Las claves `teg_...` son inmutables.** El valor nunca cambia. Solo el nombre del token en el código.

---

*Última actualización: 2026-05-10*

---

## Protocolo especial: tareas de refactor de alto riesgo (Fase 1)

Las tareas con muchas referencias distribuidas en múltiples archivos (como la Tarea 1.2, con 134 refs en 13 archivos) **no pueden ejecutarse en una sola sesión**. El contexto explota y aumenta el riesgo de errores.

### Regla: una sesión por archivo

Cada sesión sigue exactamente este patrón:

```
[System prompt del Refactoring Specialist]

Archivo a refactorizar: src/hooks/useAlertasBadges.js
Referencias a reemplazar: 9 strings "teg_..." (lista exacta del roadmap)

Código actual:
[contenido completo del archivo]

Regla crítica: el valor del string NO cambia. Solo el token en el código.
Implementa SOLO este archivo. No toques ningún otro.
```

### Después de cada archivo: commit + verificación parcial

```bash
# 1. Verificar que no quedaron strings sueltos en el archivo procesado
grep '"teg_' src/hooks/useAlertasBadges.js

# 2. Confirmar que los valores no cambiaron
git diff src/hooks/useAlertasBadges.js | grep '^[+-].*teg_'

# 3. Commit atómico por archivo
git add src/hooks/useAlertasBadges.js
git commit -m "refactor(storage): reemplazar strings teg_ por SK_ en useAlertasBadges"
```

### Orden de sesiones para Tarea 1.2 (de menor a mayor riesgo)

| Sesión | Archivo | Refs | Riesgo |
|--------|---------|------|--------|
| 1 | `src/hooks/useAlertasBadges.js` | 9 | Bajo — solo lectura |
| 2 | `src/hooks/useBudgetLogic.js` | 14 | Bajo-medio |
| 3 | `src/components/blocks/Logistica.jsx` | 8 | Medio |
| 4 | `src/components/blocks/Voluntarios.jsx` | 3 | Medio |
| 5 | `src/components/blocks/Proyecto.jsx` | 5 | Medio |
| 6 | `src/components/blocks/Dashboard.jsx` | 17 | Medio — solo lectura |
| 7 | `src/components/blocks/Configuracion.jsx` | 35 | **ALTO** — hacer backup antes |
| 8 | `src/pages/Index.jsx` | 3 | Medio |
| 9 | `src/pages/VoluntarioPortal.jsx` | 2 | Medio |
| 10 | Constantes (`budgetConstants.js`, `eventConfig.js`, `localizaciones.js`) | varios | Bajo |
| 11 | `src/components/blocks/DiaCarrera.jsx` | 2 | Bajo |
| 12 | `src/components/blocks/Documentos.jsx` | 1 | Bajo |
| 13 | `src/components/blocks/Camisetas.jsx` | 3 | Bajo |

### Criterio de aceptación parcial (tras cada sesión)

```bash
# Verificar que el archivo procesado no tiene strings sueltos
grep -n '"teg_' src/ruta/al/archivo.js
# debe retornar vacío

# Verificar que los valores en localStorage/Neon no cambiaron
git diff HEAD~1 -- src/ruta/al/archivo.js | grep '^[+-].*"teg_'
# solo deben aparecer líneas que cambian el NOMBRE del token, no el valor
```

### Señal de error: si ves esto, para y revisa

```diff
- dataService.get("teg_voluntarios_v1")
+ dataService.get("teg_volunteers_v1")   ← ❌ VALOR CAMBIADO — datos perdidos
```

```diff
- dataService.get("teg_voluntarios_v1")
+ dataService.get(SK_VOL_ROOT)           ← ✅ CORRECTO — solo el token
```

---
