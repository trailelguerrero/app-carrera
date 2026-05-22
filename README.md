# App Carrera — Panel de Gestión · Trail El Guerrero 2026

Aplicación para la gestión integral del evento: presupuesto, voluntarios, logística, patrocinadores y proyecto.

## Características
- Gestión de presupuestos detallados (tramos, inscritos, ingresos, gastos).
- Persistencia en tiempo real con Neon (PostgreSQL) y Vercel Serverless Functions.
- Arquitectura BFF: el frontend nunca expone credenciales de API.

## Seguridad y Configuración

### Modelo de autenticación

El frontend llama **exclusivamente** a `/api/proxy/*`. Este endpoint actúa como BFF
(Backend-For-Frontend): recibe las peticiones del cliente **sin credenciales** y añade
`API_KEY` en el servidor antes de reenviarlas a los endpoints internos.

> ⚠️ **`API_KEY` es una variable de entorno del servidor (Vercel Functions) y NUNCA
> debe configurarse con el prefijo `VITE_`.** Las variables `VITE_*` se incluyen en el
> bundle JavaScript público y son visibles para cualquier usuario con DevTools.

### Configuración local

1. Copia `.env.example` a `.env.local`.
2. Rellena las variables requeridas:
   - `DATABASE_URL`: Cadena de conexión Neon PostgreSQL.
   - `API_KEY`: Clave privada usada **solo por las funciones de Vercel**. No añadir prefijo `VITE_`.
   - `ALLOWED_ORIGIN`: Dominio permitido para CORS (ej: `https://appcarrera.vercel.app`).
   - `BLOB_READ_WRITE_TOKEN`: Token de Vercel Blob (requerido para subida de documentos e imágenes). Sin este valor, las APIs `api/docs/[patId].js` e `api/images/index.js` fallan con 500.
   - `VITE_ADAPTER`: Selector de adapter de persistencia (`api` para producción con Neon, `localStorage` para desarrollo offline). Si no se define, el fallback es `api`.
3. Para desarrollo local con funciones serverless: `vercel dev` (requiere Vercel CLI).

### Despliegue (Vercel)

Variables de entorno necesarias en el panel de Vercel:
- `DATABASE_URL`
- `API_KEY`
- `ALLOWED_ORIGIN`
- `BLOB_READ_WRITE_TOKEN`
- `VITE_ADAPTER`

## Estructura del Proyecto

- `api/proxy.js`: BFF proxy — única puerta de entrada del frontend a la API privada.
- `api/`: Funciones serverless internas (no llamadas directamente por el frontend).
- `src/lib/dataService.js`: Servicio de persistencia (localStorage ↔ API).
- `src/hooks/`: Lógica de negocio (presupuesto, alertas, paginación…).
- `src/components/blocks/`: Módulos funcionales (Dashboard, Voluntarios, Logística…).
