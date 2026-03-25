import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { patId } = req.query;
  const sql = neon(process.env.DATABASE_URL);

  // Ensure table exists
  await sql`
    CREATE TABLE IF NOT EXISTS pat_docs (
      id        SERIAL PRIMARY KEY,
      pat_id    INTEGER NOT NULL,
      nombre    TEXT NOT NULL,
      tipo      TEXT,
      mime      TEXT,
      data      TEXT,
      size      INTEGER,
      fecha     TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  if (req.method === 'GET') {
    const rows = await sql`
      SELECT id, pat_id, nombre, tipo, mime, data, size, fecha
      FROM pat_docs WHERE pat_id = ${parseInt(patId)}
      ORDER BY created_at DESC
    `;
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const { nombre, tipo, mime, data, size, fecha } = req.body;
    const [row] = await sql`
      INSERT INTO pat_docs (pat_id, nombre, tipo, mime, data, size, fecha)
      VALUES (${parseInt(patId)}, ${nombre}, ${tipo}, ${mime}, ${data}, ${size}, ${fecha})
      RETURNING id
    `;
    return res.status(200).json({ id: row.id });
  }

  if (req.method === 'DELETE') {
    const { docId } = req.query;
    await sql`DELETE FROM pat_docs WHERE id = ${parseInt(docId)} AND pat_id = ${parseInt(patId)}`;
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
