# App Carrera - Gestión de Presupuestos

Este proyecto es una aplicación para la gestión de presupuestos de carreras y eventos deportivos.

## Características
- Gestión de presupuestos detallados (tramos, inscritos, ingresos, gastos).
- Persistencia en tiempo real utilizando Neon (PostgreSQL) y Vercel Functions.
- Refactorización modular para alta mantenibilidad.

## Seguridad y Configuración

El proyecto utiliza una **API Key** para proteger los endpoints de la base de datos.

### Configuración Local
1. Copia `.env.example` a `.env.local`.
2. Completa las variables `DATABASE_URL`, `API_KEY` y `VITE_API_KEY`.
   - `API_KEY`: Utilizada por las funciones de Vercel.
   - `VITE_API_KEY`: Utilizada por el frontend de Vite.
   *Ambas deben ser idénticas.*

### Despliegue (Vercel)
Asegúrate de configurar las siguientes variables de entorno en el panel de Vercel:
- `DATABASE_URL`
- `API_KEY`
- `VITE_API_KEY`

## Estructura del Proyecto
- `api/`: Funciones serverless de Vercel.
- `src/components/budget/`: Componentes modulares del presupuesto.
- `src/hooks/useBudgetLogic.js`: Lógica de negocio centralizada.
- `src/lib/dataService.js`: Servicio de persistencia con soporte offline y sincronización API.
