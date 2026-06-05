// FASE-7: instancia compartida — evita múltiples conexiones por módulo
import { sql } from '../lib/db.js';
import { put, del } from '@vercel/blob';
import { logError, logWarn, requestContext } from '../lib/logger.js';
import { checkRateLimit } from '../lib/rateLimiter.js'; // MEJ-22

const auth = (req, res) => {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.API_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
};

// FASE-7: DDL movido a /api/setup — tabla documents gestionada allí

export default async function handler(req, res) {
  if (!auth(req, res)) return;

  try {
    // ── GET — un documento (redirect a blob) o listar metadatos ──────────
    if (req.method === 'GET') {
      // GET /api/documents?id=xxx → redirige al blob (absorbe /api/documents/[id])
      const onlyId = req.query.id && Object.keys(req.query).length === 1;
      if (onlyId) {
        const rows = await sql`
          SELECT blob_url, tipo, nombre FROM documents WHERE id = ${req.query.id}
        `;
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        const doc = rows[0];
        if (doc.blob_url) return res.redirect(302, doc.blob_url);
        return res.status(404).json({ error: 'Documento sin archivo asociado' });
      }

      const rows = await sql`
        SELECT id, nombre, nombre_display, emisor, categoria, subcategoria,
               nota, estado, fecha_vencimiento, size, tipo, blob_url,
               fecha_subida, fecha_modificacion
        FROM documents ORDER BY fecha_subida DESC
      `;
      return res.status(200).json(rows.map(r => ({
        id:                r.id,
        nombre:            r.nombre,
        nombreDisplay:     r.nombre_display,
        emisor:            r.emisor,
        categoria:         r.categoria,
        subcategoria:      r.subcategoria,
        nota:              r.nota,
        estado:            r.estado,
        fechaVencimiento:  r.fecha_vencimiento,
        size:              r.size,
        tipo:              r.tipo,
        blobUrl:           r.blob_url,   // ← URL directa al archivo en Vercel Blob
        fechaSubida:       r.fecha_subida,
        fechaModificacion: r.fecha_modificacion,
      })));
    }

    // ── POST — subir archivo a Vercel Blob, guardar URL en Neon ────────────
    if (req.method === 'POST') {
      // MEJ-22: rate limit — 20 uploads/min por IP
      const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
      if (await checkRateLimit(sql, ip, 'documents-upload', { max: 20, windowMs: 60 * 1000 })) {
        return res.status(429).json({ error: 'Demasiados uploads. Inténtalo en un momento.' });
      }
      const { id, nombre, nombreDisplay, emisor, categoria,
              subcategoria, nota, estado, fechaVencimiento,
              size, tipo, data } = req.body;

      if (!id || !nombre || !categoria || !data)
        return res.status(400).json({ error: 'Faltan campos: id, nombre, categoria, data' });

      // Convertir base64 → Buffer → Vercel Blob
      // C6: límite 10MB antes de crear el buffer [F8-02]
      const base64  = data.includes(',') ? data.split(',')[1] : data;
      const sizeBytes = Buffer.byteLength(Buffer.from(base64, 'base64'));
      if (sizeBytes > 10 * 1024 * 1024) {
        return res.status(413).json({ error: 'Archivo demasiado grande. Máximo 10MB.' });
      }
      const buffer  = Buffer.from(base64, 'base64');
      const ext     = nombre.split('.').pop()?.toLowerCase() || 'bin';
      const mimeMap = { pdf:'application/pdf', png:'image/png',
                        jpg:'image/jpeg', jpeg:'image/jpeg', webp:'image/webp' };
      const mimeType = tipo || mimeMap[ext] || 'application/octet-stream';

      const blob = await put(`documents/${id}.${ext}`, buffer, {
        access:      'public',
        contentType: mimeType,
        token:       process.env.BLOB_READ_WRITE_TOKEN,
      });

      await sql`
        INSERT INTO documents
          (id, nombre, nombre_display, emisor, categoria, subcategoria,
           nota, estado, fecha_vencimiento, size, tipo, blob_url)
        VALUES
          (${id}, ${nombre}, ${nombreDisplay||null}, ${emisor||null},
           ${categoria}, ${subcategoria||null}, ${nota||null},
           ${estado||'pendiente'}, ${fechaVencimiento||null},
           ${size||0}, ${mimeType}, ${blob.url})
        ON CONFLICT (id) DO UPDATE SET
          nombre_display    = EXCLUDED.nombre_display,
          emisor            = EXCLUDED.emisor,
          categoria         = EXCLUDED.categoria,
          subcategoria      = EXCLUDED.subcategoria,
          nota              = EXCLUDED.nota,
          estado            = EXCLUDED.estado,
          fecha_vencimiento = EXCLUDED.fecha_vencimiento,
          blob_url          = EXCLUDED.blob_url,
          fecha_modificacion = NOW()
      `;

      return res.status(200).json({ success: true, id, blobUrl: blob.url });
    }

    // ── PATCH — actualizar metadatos (sin tocar el archivo) ────────────────
    if (req.method === 'PATCH') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Falta id' });
      const { nombreDisplay, emisor, categoria, subcategoria,
              nota, estado, fechaVencimiento } = req.body;
      await sql`
        UPDATE documents SET
          nombre_display    = COALESCE(${nombreDisplay||null}, nombre_display),
          emisor            = ${emisor??null},
          categoria         = COALESCE(${categoria||null}, categoria),
          subcategoria      = ${subcategoria??null},
          nota              = ${nota??null},
          estado            = COALESCE(${estado||null}, estado),
          fecha_vencimiento = ${fechaVencimiento??null},
          fecha_modificacion = NOW()
        WHERE id = ${id}
      `;
      return res.status(200).json({ success: true });
    }

    // ── DELETE — borrar de Blob Y de Neon ──────────────────────────────────
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Falta id' });

      // Obtener URL del blob antes de borrar la fila
      const rows = await sql`SELECT blob_url FROM documents WHERE id = ${id}`;
      if (rows.length && rows[0].blob_url) {
        try {
          await del(rows[0].blob_url, { token: process.env.BLOB_READ_WRITE_TOKEN });
        } catch (e) {
          logWarn('[documents]', 'Error borrando blob', { message: e.message });
        }
      }

      await sql`DELETE FROM documents WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });

  } catch (error) {
    logError('[documents]', error, requestContext(req));
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
