import { neon }     from '@neondatabase/serverless';
import { put, del } from '@vercel/blob';

export default async function handler(req, res) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY)
    return res.status(401).json({ error: 'Unauthorized' });

  const { patId } = req.query;
  const sql = neon(process.env.DATABASE_URL);

  // Crear/migrar tabla: añadir blob_url, eliminar data si existe
  await sql`
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
  try {
    await sql`ALTER TABLE pat_docs ADD COLUMN IF NOT EXISTS blob_url TEXT`;
    await sql`ALTER TABLE pat_docs DROP COLUMN IF EXISTS data`;
  } catch {}

  // GET — metadatos + blob_url (sin base64)
  if (req.method === 'GET') {
    const rows = await sql`
      SELECT id, pat_id, nombre, tipo, mime, blob_url, size, fecha
      FROM pat_docs WHERE pat_id = ${parseInt(patId)}
      ORDER BY created_at DESC
    `;
    return res.status(200).json(rows);
  }

  // POST — subir a Vercel Blob, guardar URL en Neon
  if (req.method === 'POST') {
    const { nombre, tipo, mime, data, size, fecha } = req.body;

    if (!data) return res.status(400).json({ error: 'Falta data' });

    const base64   = data.includes(',') ? data.split(',')[1] : data;
    const buffer   = Buffer.from(base64, 'base64');
    const ext      = nombre?.split('.').pop()?.toLowerCase() || 'bin';
    const mimeType = mime || 'application/octet-stream';
    const blobName = `pat_docs/${patId}_${Date.now()}.${ext}`;

    const blob = await put(blobName, buffer, {
      access:      'public',
      contentType: mimeType,
      token:       process.env.BLOB_READ_WRITE_TOKEN,
    });

    const [row] = await sql`
      INSERT INTO pat_docs (pat_id, nombre, tipo, mime, blob_url, size, fecha)
      VALUES (${parseInt(patId)}, ${nombre}, ${tipo}, ${mimeType}, ${blob.url}, ${size}, ${fecha})
      RETURNING id
    `;
    return res.status(200).json({ id: row.id, fecha, blob_url: blob.url });
  }

  // DELETE — borrar de Blob Y de Neon
  if (req.method === 'DELETE') {
    const { docId } = req.query;
    const rows = await sql`SELECT blob_url FROM pat_docs WHERE id = ${parseInt(docId)}`;
    if (rows.length && rows[0].blob_url) {
      try {
        await del(rows[0].blob_url, { token: process.env.BLOB_READ_WRITE_TOKEN });
      } catch (e) {
        console.warn('[pat_docs] Error borrando blob:', e.message);
      }
    }
    await sql`DELETE FROM pat_docs WHERE id = ${parseInt(docId)} AND pat_id = ${parseInt(patId)}`;
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
