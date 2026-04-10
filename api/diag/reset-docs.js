import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.API_KEY)
    return res.status(401).json({ error: 'Unauthorized' });

  const sql = neon(process.env.DATABASE_URL);
  await sql`DELETE FROM documents`;
  await sql`DELETE FROM pat_docs`;
  return res.status(200).json({ ok: true, msg: 'Tablas documents y pat_docs vaciadas' });
}
