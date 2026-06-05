// MEJORA-03: usar sqlDirect del módulo compartido — conexión no pooled para DDL
import { sqlDirect as sqlDDL } from './lib/db.js';
import { logError, requestContext } from './lib/logger.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  // T1.2 — SEC: protect setup endpoint with API key
  const apiKey = req.headers['x-api-key'];
  const configuredKey = process.env.API_KEY;
  if (!configuredKey) return res.status(503).json({ error: 'Setup endpoint not configured' });
  if (!apiKey || apiKey !== configuredKey) return res.status(401).json({ error: 'Unauthorized' });

  const usingDirectUrl = !!process.env.DIRECT_URL;

  try {
    // Crear tabla principal key-value JSON store
    await sqlDDL`
      CREATE TABLE IF NOT EXISTS collections (
        key        VARCHAR(255) PRIMARY KEY,
        value      JSONB NOT NULL,
        version    BIGINT NOT NULL DEFAULT 1,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Migración: añadir columna version si la tabla existía sin ella
    await sqlDDL`
      ALTER TABLE collections
      ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1
    `.catch(() => {}); // ignorar si ya existe

    // MEJORA-02: índice GIN sobre value JSONB para queries sobre contenido
    await sqlDDL`
      CREATE INDEX IF NOT EXISTS idx_collections_value_gin
      ON collections USING GIN (value)
    `;

    // Índice sobre updated_at para queries de sincronización por fecha
    await sqlDDL`
      CREATE INDEX IF NOT EXISTS idx_collections_updated_at
      ON collections (updated_at DESC)
    `;

    // C2: tabla rate_limit y su índice, centralizados aquí para evitar DDL en cada request
    await sqlDDL`
      CREATE TABLE IF NOT EXISTS rate_limit (
        ip         TEXT        NOT NULL,
        scope      TEXT        NOT NULL,
        window_end TIMESTAMPTZ NOT NULL,
        count      INTEGER     NOT NULL DEFAULT 1,
        PRIMARY KEY (ip, scope)
      )
    `;

    // C2: índice en window_end para acelerar el housekeeping DELETE expired rows
    await sqlDDL`
      CREATE INDEX IF NOT EXISTS idx_rate_limit_window_end
      ON rate_limit (window_end)
    `;

    // FASE-7: tabla documents (subvenciones/documentos del evento)
    await sqlDDL`
      CREATE TABLE IF NOT EXISTS documents (
        id                TEXT PRIMARY KEY,
        nombre            TEXT NOT NULL,
        nombre_display    TEXT,
        emisor            TEXT,
        categoria         TEXT NOT NULL,
        subcategoria      TEXT,
        nota              TEXT,
        estado            TEXT DEFAULT 'pendiente',
        fecha_vencimiento TEXT,
        size              INTEGER,
        tipo              TEXT,
        blob_url          TEXT,
        fecha_subida      TIMESTAMPTZ DEFAULT NOW(),
        fecha_modificacion TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    // Migración: añadir blob_url si la tabla existía con columna 'data'
    await sqlDDL`ALTER TABLE documents ADD COLUMN IF NOT EXISTS blob_url TEXT`.catch(() => {});
    await sqlDDL`ALTER TABLE documents DROP COLUMN IF EXISTS data`.catch(() => {});
    // Índices para filtrado frecuente por categoría y estado
    await sqlDDL`
      CREATE INDEX IF NOT EXISTS idx_documents_categoria
      ON documents (categoria)
    `;
    await sqlDDL`
      CREATE INDEX IF NOT EXISTS idx_documents_estado
      ON documents (estado)
    `;
    await sqlDDL`
      CREATE INDEX IF NOT EXISTS idx_documents_fecha_subida
      ON documents (fecha_subida DESC)
    `;

    // FASE-7: tabla pat_docs (documentos de patrocinadores)
    await sqlDDL`
      CREATE TABLE IF NOT EXISTS pat_docs (
        id         SERIAL PRIMARY KEY,
        pat_id     INTEGER NOT NULL,
        nombre     TEXT NOT NULL,
        tipo       TEXT,
        mime       TEXT,
        blob_url   TEXT,
        size       INTEGER,
        fecha      TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sqlDDL`ALTER TABLE pat_docs ADD COLUMN IF NOT EXISTS blob_url TEXT`.catch(() => {});
    await sqlDDL`ALTER TABLE pat_docs DROP COLUMN IF EXISTS data`.catch(() => {});
    // Índice para lookup por pat_id (consulta más frecuente)
    await sqlDDL`
      CREATE INDEX IF NOT EXISTS idx_pat_docs_pat_id
      ON pat_docs (pat_id)
    `;

    // FASE-7: tabla budget_log (auditoría de cambios presupuestarios)
    await sqlDDL`
      CREATE TABLE IF NOT EXISTS budget_log (
        id          SERIAL PRIMARY KEY,
        ts          TIMESTAMPTZ DEFAULT NOW(),
        concepto_id INTEGER,
        concepto    TEXT NOT NULL,
        campo       TEXT NOT NULL,
        valor_antes TEXT,
        valor_nuevo TEXT,
        tipo        TEXT
      )
    `;
    // Índice para queries de historial ordenado por fecha
    await sqlDDL`
      CREATE INDEX IF NOT EXISTS idx_budget_log_ts
      ON budget_log (ts DESC)
    `;

    return res.status(200).json({
      message: 'Database setup successful!',
      indexes: [
        'idx_collections_value_gin (GIN)',
        'idx_collections_updated_at',
        'idx_rate_limit_window_end',
        'idx_documents_categoria',
        'idx_documents_estado',
        'idx_documents_fecha_subida',
        'idx_pat_docs_pat_id',
        'idx_budget_log_ts',
      ],
      tables: ['collections', 'rate_limit', 'documents', 'pat_docs', 'budget_log'],
      direct_url_configured: usingDirectUrl,
      connection_used: usingDirectUrl
        ? 'DIRECT_URL (non-pooled)'
        : 'DATABASE_URL (pooled — set DIRECT_URL for reliable DDL)',
    });
  } catch (error) {
    logError('[setup]', error, requestContext(req));
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
