import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.API_KEY)
    return res.status(401).json({ error: 'Unauthorized' });

  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const sql = neon(process.env.DATABASE_URL);
    // Crear tabla si no existe (primer acceso)
    await sql`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY, nombre TEXT NOT NULL,
        nombre_display TEXT, emisor TEXT, categoria TEXT NOT NULL,
        subcategoria TEXT, nota TEXT, estado TEXT DEFAULT 'pendiente',
        fecha_vencimiento TEXT, size INTEGER, tipo TEXT, data TEXT NOT NULL,
        fecha_subida TIMESTAMPTZ DEFAULT NOW(),
        fecha_modificacion TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    const { id } = req.query;
    const rows = await sql`SELECT data, tipo, nombre FROM documents WHERE id = ${id}`;
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json({ data: rows[0].data, tipo: rows[0].tipo, nombre: rows[0].nombre });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
