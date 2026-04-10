import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // Temporal — solo GET para poder llamarlo desde el móvil
  const sql = neon(process.env.DATABASE_URL);
  try {
    await sql`DELETE FROM documents`;
    await sql`DELETE FROM pat_docs`;
    return res.status(200).json({ ok: true, msg: 'Tablas vaciadas ✓' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
