/**
 * Endpoint de diagnóstico — SOLO para debugging.
 * Visitar: https://appcarrera.vercel.app/api/diagnostico
 * Eliminar después de confirmar que todo funciona.
 */
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const results = {};

  // 1. Variables de entorno
  results.env = {
    DATABASE_URL:    process.env.DATABASE_URL ? '✓ configurada' : '✗ NO CONFIGURADA',
    API_KEY:         process.env.API_KEY ? '✓ configurada' : '✗ no configurada (solo necesaria para auth de panel)',
    ALLOWED_ORIGIN:  process.env.ALLOWED_ORIGIN || '(no configurada — OK si mismo dominio)',
    VERCEL_URL:      process.env.VERCEL_URL || '(no configurada)',
    VITE_ADAPTER:    '(build-time, no visible aquí — si no se definió en Vercel env vars, es "api")',
  };

  if (!process.env.DATABASE_URL) {
    return res.status(200).json({ ...results, error: 'DATABASE_URL no configurada — ESTE ES EL PROBLEMA' });
  }

  // 2. Conectar a Neon
  try {
    const sql = neon(process.env.DATABASE_URL);

    // 3. Verificar tabla
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'collections'
      ) as exists
    `;
    results.table_exists = tableCheck[0]?.exists;

    if (!results.table_exists) {
      results.error = 'Tabla collections no existe — ejecutar /api/setup primero';
      return res.status(200).json(results);
    }

    // 4. Ver columnas de la tabla
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'collections'
      ORDER BY ordinal_position
    `;
    results.columns = columns.map(c => `${c.column_name} (${c.data_type})`);

    // 5. Contar registros
    const count = await sql`SELECT COUNT(*) as n, array_agg(key) as keys FROM collections`;
    results.total_collections = parseInt(count[0]?.n || 0);
    results.collection_keys = count[0]?.keys || [];

    // 6. Verificar voluntarios específicamente
    const vols = await sql`SELECT key, jsonb_array_length(value) as count FROM collections WHERE key = 'teg_voluntarios_v1_voluntarios'`;
    results.voluntarios = vols.length > 0
      ? `✓ ${vols[0].count} voluntarios en Neon`
      : '✗ colección no existe aún (se creará al primer guardado)';

    // 7. Probar escritura
    const testKey = '__diagnostico_test__';
    const testVal = JSON.stringify({ ts: new Date().toISOString(), test: true });
    await sql`
      INSERT INTO collections (key, value, version)
      VALUES (${testKey}, ${testVal}::jsonb, 1)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, version = collections.version + 1, updated_at = CURRENT_TIMESTAMP
    `;
    const readBack = await sql`SELECT value FROM collections WHERE key = ${testKey}`;
    results.write_test = readBack.length > 0 ? '✓ escritura y lectura OK' : '✗ escritura falló';
    await sql`DELETE FROM collections WHERE key = ${testKey}`;

    results.status = '✅ TODO OK — Neon funciona correctamente';

  } catch (err) {
    results.error = err.message;
    results.status = '❌ ERROR DE NEON';
  }

  return res.status(200).json(results);
}
