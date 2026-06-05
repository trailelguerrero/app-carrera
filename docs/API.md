# Referencia de API — App Carrera · Trail El Guerrero 2026

Todos los endpoints son **Vercel Serverless Functions** en `api/`.

El frontend **solo llama a `/api/proxy/*`** — el BFF reenvía al endpoint interno correspondiente inyectando `x-api-key` server-side.

---

## Autenticación

Todos los endpoints internos (salvo `/api/data/public`) requieren `x-api-key` en la cabecera.  
El proxy la inyecta automáticamente; el cliente nunca la incluye directamente.

Los endpoints del panel también requieren una **cookie de sesión** (`panel_session`) emitida tras autenticarse con PIN.

---

## BFF Proxy

### `GET|PUT|DELETE|POST /api/proxy/{path}`

Punto de entrada único del frontend. Redirige la petición al endpoint interno correspondiente.

| Paso | Descripción |
|---|---|
| CORS | Verifica origen exacto contra allowlist |
| Sesión | Verifica JWT en cookie HttpOnly para rutas de negocio |
| Rate limit | Delega en `api/lib/rateLimiter.js` |
| Seguridad | Añade cabeceras HTTP de seguridad |
| Forward | Inyecta `x-api-key` y reenvía |

**Rutas directas a Neon** (sin HTTP interno, ~4-6× más rápido):  
`/api/proxy/data/:collection` → consulta SQL directa

**Rutas por forward HTTP:**  
Resto de rutas → `https://{host}/api/{path}`

---

## Colecciones de datos

### `GET /api/data/{collection}`

Obtiene el valor de una colección.

**Auth:** `x-api-key`  
**Rate limit:** 60 req/min por IP

**Colecciones permitidas** (allowlist):
```
teg_voluntarios, teg_logistica, teg_presupuesto, teg_camisetas,
teg_patrocinadores, teg_pat_log, teg_localizaciones, teg_documentos,
teg_proyecto, teg_event_config, teg_scenarios, teg_codigos_promo,
teg_codigos_initialized, teg_panel_pin_hash, teg_panel_pin_length,
teg_escenarios, teg_dia_carrera, teg_scenario_active_name, teg_auto_backup
(+ sufijos de versión: _v1, _v2, etc.)
```

**Respuesta 200:**
```json
{ "data": <jsonb>, "version": 3 }
```

**Respuesta 404:** colección no existe aún  
**Respuesta 403:** colección no en allowlist  
**Respuesta 429:** rate limit excedido

---

### `PUT /api/data/{collection}`

Guarda o actualiza el valor de una colección. Soporta versionado optimista.

**Auth:** `x-api-key`  
**Rate limit:** 60 req/min por IP

**Body:** cualquier JSON válido. Campo opcional `__version` para detección de conflictos.

```json
{
  "__version": 2,
  "datos": "..."
}
```

**Respuesta 200:**
```json
{ "ok": true, "version": 3 }
```

**Respuesta 409 (conflicto):**
```json
{
  "error": "Conflict",
  "serverVersion": 5,
  "clientVersion": 2,
  "message": "Los datos fueron modificados por otro dispositivo. Recarga para ver los cambios."
}
```

---

### `DELETE /api/data/{collection}`

Elimina una colección.

**Auth:** `x-api-key`  
**Respuesta 200:** `{ "ok": true }`

---

### `GET /api/data/batch`

Obtiene varias colecciones en una sola petición (Promise.all interno).

**Auth:** `x-api-key`  
**Rate limit:** 60 req/min por IP  
**Query params:** `keys=col1,col2,col3`

**Respuesta 200:**
```json
{
  "teg_voluntarios": { "data": [...], "version": 1 },
  "teg_logistica":   { "data": {...}, "version": 2 }
}
```

---

### `GET /api/data/public`

Endpoint público (sin autenticación) para el portal de voluntarios.

**Rate limit:** 30 req/min por IP  
**Colecciones de lectura permitidas:**
- `teg_voluntarios_v1_puestos`
- `teg_voluntarios_v1_imgFront` / `imgBack` / `imgGuiaTallas`
- `teg_voluntarios_v1_opcionPuesto` / `opcionVehiculo` / `opcionEmail` / `opcionEmergencia`
- `teg_event_config_v1`

**Colecciones de escritura permitidas:**
- `teg_voluntarios_v1_voluntarios` — solo APPEND (nunca sobreescribe el array)

---

## Voluntarios

### `POST /api/voluntarios?action=auth`

Login del voluntario (teléfono + PIN).

**Auth:** ninguna (pública)  
**Rate limit:** `register` — 10 req/10min por IP

**Body:**
```json
{ "telefono": "612345678", "pin": "1234" }
```

**Respuesta 200:**
```json
{ "ok": true, "sessionToken": "..." }
```

**Respuesta 401:** PIN incorrecto  
**Respuesta 404:** voluntario no encontrado

---

### `GET /api/voluntarios?action=ficha`

Obtiene la ficha del voluntario autenticado.

**Auth:** `sessionToken` (query param o header)

**Respuesta 200:**
```json
{
  "id": "uuid",
  "nombre": "...",
  "telefono": "...",
  "puesto": "...",
  "talla": "...",
  "...": "..."
}
```

---

### `PATCH /api/voluntarios?action=ficha`

Edita los datos del voluntario autenticado.

**Auth:** `sessionToken`

**Body:** campos a actualizar (parcial).

**Respuesta 200:** `{ "ok": true }`

---

### `POST /api/voluntarios?action=presente`

Marca la llegada del voluntario a su puesto.

**Auth:** `sessionToken`

**Respuesta 200:** `{ "ok": true, "hora": "09:15" }`

---

### `POST /api/voluntarios?action=cancelar`

Cancela la asistencia del voluntario.

**Auth:** `sessionToken`

**Respuesta 200:** `{ "ok": true }`

---

### `POST /api/voluntarios?action=cambiar-pin`

Cambia el PIN del voluntario.

**Auth:** `sessionToken`

**Body:**
```json
{ "pinActual": "1234", "pinNuevo": "5678" }
```

**Respuesta 200:** `{ "ok": true }`

---

### `POST /api/voluntarios?action=reset-pin`

Resetea el PIN de un voluntario (acción de organizador).

**Auth:** `x-api-key`

**Body:**
```json
{ "telefono": "612345678" }
```

**Respuesta 200:** `{ "ok": true, "pinInicial": "5678" }`

---

### `POST /api/voluntarios?action=delete`

Elimina un voluntario (acción de administrador).

**Auth:** `x-api-key`

**Body:**
```json
{ "id": "uuid" }
```

**Respuesta 200:** `{ "ok": true }`

---

### `GET /api/voluntarios?action=check`

Verifica si un voluntario ya tiene PIN personalizado.

**Auth:** ninguna  
**Query:** `telefono=612345678`

**Respuesta 200:**
```json
{ "found": true, "pinPersonalizado": false }
```

---

## Panel de autenticación

### `POST /api/panel/auth`

Verifica el PIN del panel o lo cambia.

**Auth:** ninguna para `verify`; `x-api-key` no requerida

**Rate limit:** 10 req/5min por IP (protección fuerza bruta)

**Body — verificar PIN:**
```json
{ "action": "verify", "pin": "1234" }
```

**Respuesta 200:**
```json
{ "valid": true }
```
Si `valid: true`, se emite cookie de sesión `panel_session` (HttpOnly, SameSite=Strict, 8h).

**Body — cambiar PIN:**
```json
{ "action": "change", "currentPin": "1234", "newPin": "5678" }
```

**Respuesta 200:**
```json
{ "ok": true }
```

---

## Log de presupuesto

### `GET /api/budget-log`

Obtiene el historial de cambios del presupuesto.

**Auth:** `x-api-key`  
**Rate limit:** 30 req/min  
**Query:** `limit` (máx 200, default 50)

**Respuesta 200:** array de entradas de log
```json
[
  {
    "id": 1,
    "ts": "2026-05-15T10:30:00Z",
    "concepto_id": 3,
    "concepto": "Dorsal A",
    "campo": "precio",
    "valor_antes": "20",
    "valor_nuevo": "22",
    "tipo": "inscripcion"
  }
]
```

---

### `POST /api/budget-log`

Registra un cambio en el presupuesto.

**Auth:** `x-api-key`  
**Rate limit:** 30 req/min

**Body:**
```json
{
  "concepto_id": 3,
  "concepto": "Dorsal A",
  "campo": "precio",
  "valor_antes": "20",
  "valor_nuevo": "22",
  "tipo": "inscripcion"
}
```

**Respuesta 201:** `{ "ok": true, "id": 42 }`

---

## Documentos de patrocinadores

### `GET /api/docs/{patId}`

Obtiene los metadatos de los documentos de un patrocinador.

**Auth:** `x-api-key`

**Respuesta 200:**
```json
[
  { "name": "contrato.pdf", "url": "https://...", "size": 12345, "uploadedAt": "..." }
]
```

---

### `POST /api/docs/{patId}`

Sube un documento para un patrocinador a Vercel Blob.

**Auth:** `x-api-key`  
**Content-Type:** `multipart/form-data`

**Respuesta 201:**
```json
{ "ok": true, "url": "https://...", "name": "contrato.pdf" }
```

---

### `DELETE /api/docs/{patId}`

Elimina un documento de un patrocinador.

**Auth:** `x-api-key`  
**Query:** `name=contrato.pdf`

**Respuesta 200:** `{ "ok": true }`

---

## Documentos generales

### `GET|POST|DELETE /api/documents`

Gestión de documentos y subvenciones del evento (Vercel Blob).

**Auth:** `x-api-key`

Similar a `/api/docs/{patId}` pero para documentos del evento en general.

---

## Imágenes

### `POST /api/images`

Sube una imagen a Vercel Blob.

**Auth:** `x-api-key`  
**Content-Type:** `multipart/form-data`  
**Max duration:** 25 s

**Respuesta 201:**
```json
{ "ok": true, "url": "https://..." }
```

---

## Push Notifications

### `POST /api/push`

Envía una notificación push a todos los suscriptores registrados.

**Auth:** `x-api-key`  
**Max duration:** 25 s

**Body:**
```json
{
  "title": "¡Nuevo voluntario!",
  "body": "Juan García se ha registrado.",
  "url": "/panel"
}
```

**Respuesta 200:**
```json
{ "ok": true, "sent": 12, "failed": 0 }
```

---

## Setup

### `POST /api/setup`

Inicializa el esquema de la base de datos (DDL). Solo ejecutar una vez al desplegar.

**Auth:** `x-api-key`  
**Max duration:** 30 s

**Respuesta 200:**
```json
{ "ok": true, "message": "Schema inicializado correctamente" }
```

> Usa `sqlDirect` (conexión sin pool) para evitar problemas de DDL con PgBouncer.

---

## Códigos de error comunes

| Código | Significado |
|---|---|
| `400` | Petición malformada o datos inválidos (Zod) |
| `401` | API key ausente o incorrecta / sesión inválida |
| `403` | Colección no en allowlist / acción no permitida |
| `404` | Recurso no encontrado |
| `409` | Conflicto de versión optimista |
| `429` | Rate limit excedido — reintentar tras un momento |
| `500` | Error interno del servidor |
| `503` | Variable de entorno crítica no configurada |
