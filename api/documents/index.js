import { neon } from '@neondatabase/serverless';

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
      data              TEXT NOT NULL,
      fecha_subida      TIMESTAMPTZ DEFAULT NOW(),
      fecha_modificacion TIMESTAMPTZ DEFAULT NOW()
    )
  `;
};

// Tabla creada una vez por cold start
let tableReady = false;

export default async function handler(req, res) {
  if (!auth(req, res)) return;

  try {
    const sql = neon(process.env.DATABASE_URL);
    if (!tableReady) {
      await ensureTable(sql);
      tableReady = true;
    }

    // GET — listar metadatos (sin data — no descargamos los archivos)
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, nombre, nombre_display, emisor, categoria, subcategoria,
               nota, estado, fecha_vencimiento, size, tipo,
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
        fechaSubida:       r.fecha_subida,
        fechaModificacion: r.fecha_modificacion,
        // data NO se incluye en el listado — se pide explícitamente al ver/descargar
      })));
    }

    // POST — subir nuevo documento (incluye data base64)
    if (req.method === 'POST') {
      const { id, nombre, nombreDisplay, emisor, categoria,
              subcategoria, nota, estado, fechaVencimiento,
              size, tipo, data } = req.body;

      if (!id || !nombre || !categoria || !data)
        return res.status(400).json({ error: 'Faltan campos: id, nombre, categoria, data' });

      await sql`
        INSERT INTO documents
          (id, nombre, nombre_display, emisor, categoria, subcategoria,
           nota, estado, fecha_vencimiento, size, tipo, data)
        VALUES
          (${id}, ${nombre}, ${nombreDisplay||null}, ${emisor||null},
           ${categoria}, ${subcategoria||null}, ${nota||null},
           ${estado||'pendiente'}, ${fechaVencimiento||null},
           ${size||0}, ${tipo||null}, ${data})
        ON CONFLICT (id) DO UPDATE SET
          nombre_display    = EXCLUDED.nombre_display,
          emisor            = EXCLUDED.emisor,
          categoria         = EXCLUDED.categoria,
          subcategoria      = EXCLUDED.subcategoria,
          nota              = EXCLUDED.nota,
          estado            = EXCLUDED.estado,
          fecha_vencimiento = EXCLUDED.fecha_vencimiento,
          fecha_modificacion = NOW()
      `;
      return res.status(200).json({ success: true, id });
    }

    // PATCH — actualizar metadatos (sin tocar el archivo)
    if (req.method === 'PATCH') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Falta id en query' });
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

    // DELETE
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Falta id en query' });
      await sql`DELETE FROM documents WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });

  } catch (error) {
    console.error('[documents]', error);
    return res.status(500).json({ error: error.message });
  }
}
