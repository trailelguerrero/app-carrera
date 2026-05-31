/**
 * api/lib/db.js — Instancia única de Neon para todos los endpoints.
 *
 * MEJORA-03: centralizar la instancia sql evita abrir múltiples conexiones
 * cuando varios módulos están activos en la misma instancia serverless.
 *
 * ⚠️  DDL (CREATE TABLE, ALTER TABLE, CREATE INDEX) debe usar DIRECT_URL
 *     (conexión no pooled) para evitar problemas con PgBouncer.
 *     Usa `sqlDirect` exportado abajo, NUNCA `sql` para DDL.
 */
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no configurada — Neon no puede arrancar.');
}

/**
 * Conexión pooled (PgBouncer). Usar para todas las queries DML/DQL normales.
 * Soporta hasta ~10 000 conexiones concurrentes.
 */
export const sql = neon(process.env.DATABASE_URL);

/**
 * Conexión directa (sin pool). SOLO para DDL: CREATE/ALTER/DROP.
 * Si DIRECT_URL no está configurada, cae a DATABASE_URL como fallback
 * (funcionará en la mayoría de casos pero no es recomendable en producción).
 */
export const sqlDirect = neon(process.env.DIRECT_URL || process.env.DATABASE_URL);
