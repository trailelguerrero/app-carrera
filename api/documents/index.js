import { neon }     from '@neondatabase/serverless';
import { put, del } from '@vercel/blob';

const auth = (req, res) => {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.API_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
};

const ensureTable = async (sql) => {
  await sql`
    CREATE TABLE IF NOT EXISTS documents (
      id                TEXT PRIMARY KEY,
      nombre            TEXT NOT NULL,
      nombre_display    TEXT,
      emisor            TEXT,
      categoria         TEXT NOT NULL,
      subcategoria      TEXT,
      nota              TEXT,
      estado            TEXT DEFAULT 'pendiente',
      fecha_vencimiento TEXT,
      size              INTEGER,
      tipo              TEXT,
      blob_url          TEXT,
      fecha_subida      TIMESTAMPTZ DEFAULT NOW(),
      fecha_modificacion TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  // Migración: añadir blob_url si la tabla ya existía con columna 'data'
  try {
    await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS blob_url TEXT`;
    await sql`ALTER TABLE documents DROP COLUMN IF EXISTS data`;
  } catch {}
};

let tableReady = false;

export default async function handler(req, res) {
  if (!auth(req, res)) return;

  try {
    const sql = neon(process.env.DATABASE_URL);
    if (!tableReady) { await ensureTable(sql); tableReady = true; }

    // ── GET — listar metadatos ──────────────────────────────────────────────
    if (req.method === 'GET') {
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
      const { id, nombre, nombreDisplay, emisor, categoria,
              subcategoria, nota, estado, fechaVencimiento,
              size, tipo, data } = req.body;

      if (!id || !nombre || !categoria || !data)
        return res.status(400).json({ error: 'Faltan campos: id, nombre, categoria, data' });

      // Convertir base64 → Buffer → Vercel Blob
      const base64  = data.includes(',') ? data.split(',')[1] : data;
      const buffer  = Buffer.from(base64, 'base64');
      const ext     = nombre.split('.').pop()?.toLowerCase() || 'bin';
      const mimeMap = { pdf:'application/pdf', png:'image/png',
                        jpg:'image/jpeg', jpeg:'image/jpeg', webp:'image/webp' };
      const mimeType = tipo || mimeMap[ext] || 'application/octet-stream';

      const blob = await put(`documents/${id}.${ext}`, buffer, {
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
          console.warn('[documents] Error borrando blob:', e.message);
        }
      }

      await sql`DELETE FROM documents WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });

  } catch (error) {
    console.error('[documents]', error);
    return res.status(500).json({ error: error.message });
  }
}
