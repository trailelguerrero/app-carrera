import { neon } from '@neondatabase/serverless';

// Este endpoint solo se usa para documentos migrados sin blobUrl
// Los nuevos documentos tienen blobUrl y el cliente los abre directamente
export default async function handler(req, res) {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.API_KEY)
    return res.status(401).json({ error: 'Unauthorized' });

  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const sql = neon(process.env.DATABASE_URL);
    const { id } = req.query;
    const rows = await sql`
      SELECT blob_url, tipo, nombre FROM documents WHERE id = ${id}
    `;
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    const doc = rows[0];
    if (doc.blob_url) {
      // Redirigir al blob directamente — sin pasar datos por Neon
      return res.redirect(302, doc.blob_url);
    }

    return res.status(404).json({ error: 'Documento sin archivo asociado' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
