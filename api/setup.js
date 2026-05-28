import { neon } from '@neondatabase/serverless';

// MEJORA-02: instancia única a nivel de módulo
const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  // T1.2 — SEC: protect setup endpoint with API key
  const apiKey = req.headers['x-api-key'];
  const configuredKey = process.env.API_KEY;
  if (!configuredKey) return res.status(503).json({ error: 'Setup endpoint not configured' });
  if (!apiKey || apiKey !== configuredKey) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // Crear tabla principal key-value JSON store
    await sql`
      CREATE TABLE IF NOT EXISTS collections (
        key        VARCHAR(255) PRIMARY KEY,
        value      JSONB NOT NULL,
        version    BIGINT NOT NULL DEFAULT 1,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Migración: añadir columna version si la tabla existía sin ella
    await sql`
      ALTER TABLE collections
      ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1
    `.catch(() => {}); // ignorar si ya existe

    // MEJORA-02: índice GIN sobre value JSONB para queries sobre contenido
    await sql`
      CREATE INDEX IF NOT EXISTS idx_collections_value_gin
      ON collections USING GIN (value)
    `;

    // Índice sobre updated_at para queries de sincronización por fecha
    await sql`
      CREATE INDEX IF NOT EXISTS idx_collections_updated_at
      ON collections (updated_at DESC)
    `;

    return res.status(200).json({
      message: 'Database setup successful!',
      indexes: ['idx_collections_value_gin (GIN)', 'idx_collections_updated_at'],
    });
  } catch (error) {
    console.error('Setup error:', error);
    return res.status(500).json({ error: error.message });
  }
}
