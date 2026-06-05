// FASE-7: instancia compartida + try/catch completo + DDL movido a setup.js
import { sql } from '../lib/db.js';
import { put, del } from '@vercel/blob';
import { logError, logWarn, requestContext } from '../lib/logger.js';

export default async function handler(req, res) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY)
    return res.status(401).json({ error: 'Unauthorized' });

  const { patId } = req.query;
  const patIdInt = parseInt(patId, 10);
  if (isNaN(patIdInt)) return res.status(400).json({ error: 'patId inválido' });

  try {
    // GET — metadatos + blob_url (sin base64)
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, pat_id, nombre, tipo, mime, blob_url, size, fecha
        FROM pat_docs WHERE pat_id = ${patIdInt}
        ORDER BY created_at DESC
      `;
      return res.status(200).json(rows);
    }

    // POST — subir a Vercel Blob, guardar URL en Neon
    if (req.method === 'POST') {
      const { nombre, tipo, mime, data, size, fecha } = req.body || {};

      if (!data) return res.status(400).json({ error: 'Falta data' });

      // Validar MIME permitido
      const ALLOWED_MIME = [
        'application/pdf',
        'image/jpeg', 'image/png', 'image/webp',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/msword',
        'application/vnd.ms-excel',
      ];
      const mimeToCheck = mime || 'application/octet-stream';
      if (!ALLOWED_MIME.includes(mimeToCheck)) {
        return res.status(415).json({ error: `Tipo de archivo no permitido: ${mimeToCheck}` });
      }

      // C6: límite 10MB antes de crear el buffer
      const base64 = data.includes(',') ? data.split(',')[1] : data;
      const sizeBytes = Buffer.byteLength(Buffer.from(base64, 'base64'));
      if (sizeBytes > 10 * 1024 * 1024) {
        return res.status(413).json({ error: 'Archivo demasiado grande. Máximo 10MB.' });
      }
      const buffer   = Buffer.from(base64, 'base64');
      const ext      = nombre?.split('.').pop()?.toLowerCase() || 'bin';
      const mimeType = mime || 'application/octet-stream';
      const blobName = `pat_docs/${patIdInt}_${Date.now()}.${ext}`;

      const blob = await put(blobName, buffer, {
        access:      'public',
        contentType: mimeType,
        token:       process.env.BLOB_READ_WRITE_TOKEN,
      });

      const [row] = await sql`
        INSERT INTO pat_docs (pat_id, nombre, tipo, mime, blob_url, size, fecha)
        VALUES (${patIdInt}, ${nombre}, ${tipo}, ${mimeType}, ${blob.url}, ${size}, ${fecha})
        RETURNING id
      `;
      return res.status(200).json({ id: row.id, fecha, blob_url: blob.url });
    }

    // DELETE — borrar de Blob Y de Neon
    if (req.method === 'DELETE') {
      const { docId } = req.query;
      const docIdInt = parseInt(docId, 10);
      if (isNaN(docIdInt)) return res.status(400).json({ error: 'docId inválido' });

      const rows = await sql`SELECT blob_url FROM pat_docs WHERE id = ${docIdInt}`;
      if (rows.length && rows[0].blob_url) {
        try {
          await del(rows[0].blob_url, { token: process.env.BLOB_READ_WRITE_TOKEN });
        } catch (e) {
          logWarn('[pat_docs]', 'Error borrando blob', { docId: docIdInt, err: e.message });
        }
      }
      await sql`DELETE FROM pat_docs WHERE id = ${docIdInt} AND pat_id = ${patIdInt}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    logError('[docs/patId]', error, { ...requestContext(req), patId: patIdInt });
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
