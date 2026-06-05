#!/usr/bin/env node
/**
 * scripts/check-bundle.js — D2: Análisis de bundle en CI
 *
 * Lee los archivos .js del directorio dist/assets, calcula su tamaño gzip
 * y falla si algún chunk supera su umbral definido.
 *
 * Uso:
 *   node scripts/check-bundle.js              → tabla + exit 1 si hay violaciones
 *   node scripts/check-bundle.js --json       → salida JSON (para GitHub Actions)
 *   node scripts/check-bundle.js --no-fail    → solo informa, nunca falla
 */

import { readdirSync, readFileSync } from 'fs';
import { resolve, join } from 'path';
import { gzipSync } from 'zlib';

const args = process.argv.slice(2);
const JSON_OUTPUT = args.includes('--json');
const NO_FAIL    = args.includes('--no-fail');

// ── Umbrales gzip en KB ────────────────────────────────────────────────────
// Margen +15% sobre el tamaño actual en el momento de implementar D2 (2026-05-30)
// Actualizar cuando se añadan dependencias nuevas intencionadamente.
const THRESHOLDS = {
  'vendor-react':   75,   // actual 62 kB gzip
  'vendor-charts':  110,  // actual 92 kB gzip
  'vendor-exceljs': 320,  // actual 271 kB gzip (librería no divisible)
  'vendor-pdf':     100,  // referencia; aparece si se usa jspdf
  'vendor-leaflet': 50,   // actual ~42 kB gzip (mapa interactivo)
  'vendor-icons':   10,   // actual 0.91 kB gzip
  'vendor-qr':      15,   // actual 9.66 kB gzip
  // Chunk principal de la app — más flexible por crecimiento orgánico
  'index':          250,
};

// Umbral para el TOTAL de JS gzip
// actual 2026-05-30: ~740 kB (incluye todos los chunks de app + vendors)
const TOTAL_THRESHOLD_KB = 850;

// ── Leer dist/assets ────────────────────────────────────────────────────────
const distDir = resolve(process.cwd(), 'dist', 'assets');

let files;
try {
  files = readdirSync(distDir).filter(f => f.endsWith('.js'));
} catch {
  console.error('❌  No se encuentra dist/assets — ejecuta npm run build primero');
  process.exit(1);
}

// ── Calcular tamaños ────────────────────────────────────────────────────────
function gzipKb(filepath) {
  const buf = readFileSync(filepath);
  return gzipSync(buf, { level: 9 }).length / 1024;
}

/** Extrae el nombre lógico del chunk desde el nombre de archivo con hash.
 *  vendor-react-C2jDQgsg.js → vendor-react
 *  index-Abc123.js          → index
 */
function chunkName(filename) {
  return filename.replace(/-[A-Za-z0-9]{8,}\.js$/, '').replace(/\.js$/, '');
}

const chunks = files.map(f => {
  const kb = gzipKb(join(distDir, f));
  const name = chunkName(f);
  const limit = THRESHOLDS[name] ?? null;
  const over  = limit !== null && kb > limit;
  return { file: f, name, kb: +kb.toFixed(2), limit, over };
});

const totalKb    = +chunks.reduce((s, c) => s + c.kb, 0).toFixed(2);
const totalOver  = totalKb > TOTAL_THRESHOLD_KB;
const violations = chunks.filter(c => c.over);
const hasFailure = violations.length > 0 || totalOver;

// ── Salida JSON (para Actions) ───────────────────────────────────────────────
if (JSON_OUTPUT) {
  console.log(JSON.stringify({ chunks, totalKb, totalThreshold: TOTAL_THRESHOLD_KB, violations, hasFailure }, null, 2));
  process.exit((!NO_FAIL && hasFailure) ? 1 : 0);
}

// ── Salida tabla legible ─────────────────────────────────────────────────────
const COL = { name: 28, kb: 10, limit: 10, status: 8 };
const line = (n, k, l, s) =>
  n.padEnd(COL.name) + k.padStart(COL.kb) + l.padStart(COL.limit) + s.padStart(COL.status);

console.log('\n📦  Bundle size report (gzip)\n');
console.log(line('Chunk', 'gzip kB', 'límite', 'estado'));
console.log('─'.repeat(COL.name + COL.kb + COL.limit + COL.status));

for (const c of chunks.sort((a, b) => b.kb - a.kb)) {
  const status = c.limit === null ? '  —' : c.over ? '  ❌ OVER' : '  ✅';
  const limitStr = c.limit !== null ? `${c.limit} kB` : '—';
  console.log(line(c.name, `${c.kb} kB`, limitStr, status));
}

console.log('─'.repeat(COL.name + COL.kb + COL.limit + COL.status));
const totalStatus = totalOver ? '  ❌ OVER' : '  ✅';
console.log(line('TOTAL JS', `${totalKb} kB`, `${TOTAL_THRESHOLD_KB} kB`, totalStatus));
console.log();

if (violations.length > 0) {
  console.log('❌  Chunks que superan el umbral:');
  for (const v of violations) {
    console.log(`   ${v.name}: ${v.kb} kB > ${v.limit} kB (exceso: +${(v.kb - v.limit).toFixed(2)} kB)`);
  }
  console.log();
}

if (totalOver) {
  console.log(`❌  Total JS gzip ${totalKb} kB supera el límite de ${TOTAL_THRESHOLD_KB} kB\n`);
}

if (!hasFailure) {
  console.log('✅  Todos los chunks dentro de los umbrales.\n');
}

if (!NO_FAIL && hasFailure) process.exit(1);
