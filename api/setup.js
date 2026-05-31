// MEJORA-03: usar sqlDirect del módulo compartido — conexión no pooled para DDL
import { sqlDirect as sqlDDL } from './lib/db.js';

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

    return res.status(200).json({
      message: 'Database setup successful!',
      indexes: ['idx_collections_value_gin (GIN)', 'idx_collections_updated_at', 'idx_rate_limit_window_end'],
      tables: ['collections', 'rate_limit'],
      direct_url_configured: usingDirectUrl,
      connection_used: usingDirectUrl
        ? 'DIRECT_URL (non-pooled)'
        : 'DATABASE_URL (pooled — set DIRECT_URL for reliable DDL)',
    });
  } catch (error) {
    console.error('Setup error:', error);
    return res.status(500).json({ error: error.message });
  }
}
