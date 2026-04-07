import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.API_KEY)
    return res.status(401).json({ error: 'Unauthorized' });

  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const sql = neon(process.env.DATABASE_URL);
    const { id } = req.query;
    const rows = await sql`SELECT data, tipo, nombre FROM documents WHERE id = ${id}`;
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json({ data: rows[0].data, tipo: rows[0].tipo, nombre: rows[0].nombre });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
