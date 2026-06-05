/**
 * fase7-backend.test.js — Fase 7 · Backend y base de datos
 *
 * F7-01  Singleton db.js: sql y sqlDirect exportados correctamente
 * F7-02  Sin instancias neon() sueltas en los endpoints de API
 * F7-03  validarVoluntario: casos válidos e inválidos
 * F7-04  validarVoluntario: honeypot silencia bots
 * F7-05  Allowlist de colecciones: colecciones permitidas y denegadas
 * F7-06  setup.js: DDL cubre todas las tablas requeridas
 * F7-07  setup.js: DDL cubre todos los índices requeridos
 * F7-08  budget-log y documents ya no tienen DDL inline (ensureTable)
 * F7-09  docs/[patId].js: try/catch global presente
 * F7-10  panel/auth.js y voluntarios/index.js usan singleton db.js
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');

// ── F7-01: singleton db.js ────────────────────────────────────────────────
describe('F7-01 — db.js exporta sql y sqlDirect', () => {
  it('exporta sql (pooled)', () => {
    const src = read('api/lib/db.js');
    expect(src).toContain('export const sql');
  });

  it('exporta sqlDirect (no-pooled, para DDL)', () => {
    const src = read('api/lib/db.js');
    expect(src).toContain('export const sqlDirect');
  });

  it('usa DATABASE_URL para sql pooled', () => {
    const src = read('api/lib/db.js');
    expect(src).toContain('DATABASE_URL');
  });

  it('usa DIRECT_URL para sqlDirect con fallback', () => {
    const src = read('api/lib/db.js');
    expect(src).toContain('DIRECT_URL');
  });
});

// ── F7-02: sin instancias neon() sueltas ─────────────────────────────────
describe('F7-02 — endpoints API usan singleton, no neon() local', () => {
  const endpoints = [
    'api/voluntarios/index.js',
    'api/push/index.js',
    'api/images/index.js',
    'api/budget-log/index.js',
    'api/documents/index.js',
    'api/docs/[patId].js',
    'api/data/public.js',
    'api/panel/auth.js',
  ];

  for (const ep of endpoints) {
    it(`${ep} no llama a neon()`, () => {
      const src = read(ep);
      // Detecta cualquier llamada a neon() con argumento (instanciación)
      expect(src).not.toMatch(/neon\s*\(/);
    });

    it(`${ep} importa desde lib/db.js`, () => {
      const src = read(ep);
      expect(src).toContain("from '../lib/db.js'");
    });
  }
});

// ── F7-03: validarVoluntario — casos válidos e inválidos ──────────────────
describe('F7-03 — validarVoluntario esquema Zod server-side', async () => {
  const { validarVoluntario } = await import('../../api/lib/voluntarioValidation.js');

  const base = {
    nombre: 'Ana',
    apellidos: 'García López',
    telefono: '612345678',
    email: 'ana@ejemplo.com',
    talla: 'M',
    website: '', // honeypot vacío
  };

  it('acepta datos válidos completos', () => {
    const result = validarVoluntario(base);
    expect(result.ok).toBe(true);
    expect(result.data.nombre).toBe('Ana');
    expect(result.data.talla).toBe('M');
  });

  it('acepta datos válidos sin email (opcional)', () => {
    const { email: _, ...sinEmail } = base;
    const result = validarVoluntario(sinEmail);
    expect(result.ok).toBe(true);
  });

  it('rechaza nombre vacío', () => {
    const result = validarVoluntario({ ...base, nombre: '' });
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveProperty('nombre');
  });

  it('rechaza apellidos vacíos', () => {
    const result = validarVoluntario({ ...base, apellidos: '' });
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveProperty('apellidos');
  });

  it('rechaza teléfono no español (empieza por 1)', () => {
    const result = validarVoluntario({ ...base, telefono: '112345678' });
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveProperty('telefono');
  });

  it('rechaza teléfono demasiado corto', () => {
    const result = validarVoluntario({ ...base, telefono: '61234' });
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveProperty('telefono');
  });

  it('rechaza email malformado', () => {
    const result = validarVoluntario({ ...base, email: 'no-es-un-email' });
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveProperty('email');
  });

  it('rechaza talla inválida', () => {
    const result = validarVoluntario({ ...base, talla: 'XXXL' });
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveProperty('talla');
  });

  it('normaliza teléfono con espacios y guiones', () => {
    const result = validarVoluntario({ ...base, telefono: '612 345-678' });
    expect(result.ok).toBe(true);
    expect(result.data.telefono).toBe('612345678');
  });

  it('devuelve múltiples errores a la vez', () => {
    const result = validarVoluntario({ nombre: '', apellidos: '', telefono: '123', talla: 'MEGA' });
    expect(result.ok).toBe(false);
    expect(Object.keys(result.errors).length).toBeGreaterThan(1);
  });
});

// ── F7-04: honeypot ───────────────────────────────────────────────────────
describe('F7-04 — honeypot en public.js', () => {
  it('public.js comprueba campo website antes de insertar', () => {
    const src = read('api/data/public.js');
    expect(src).toContain('website');
    // Asegura que se devuelve 200 silencioso ante honeypot relleno
    expect(src).toContain('bot_');
  });
});

// ── F7-05: allowlist de colecciones ──────────────────────────────────────
describe('F7-05 — allowlist de colecciones en [collection].js', () => {
  // Leer el archivo con path literal correcto (corchetes incluidos)
  const src = read('api/data/[collection].js');

  it('ALLOWED_COLLECTIONS incluye teg_voluntarios', () => {
    // La regex usa teg_(voluntarios|...) — buscar el patrón correcto
    expect(src).toContain('(voluntarios|');
  });

  it('ALLOWED_COLLECTIONS incluye teg_presupuesto', () => {
    expect(src).toContain('presupuesto');
  });

  it('ALLOWED_COLLECTIONS está definida como regex', () => {
    expect(src).toMatch(/ALLOWED_COLLECTIONS\s*=\s*\//);
  });

  it('proxy.js también tiene su propia allowlist', () => {
    const proxy = read('api/proxy.js');
    expect(proxy).toMatch(/ALLOWED_COLLECTIONS\s*=\s*\//);
  });
});

// ── F7-06: setup.js cubre todas las tablas ────────────────────────────────
describe('F7-06 — setup.js gestiona todas las tablas requeridas', () => {
  const tables = ['collections', 'rate_limit', 'documents', 'pat_docs', 'budget_log'];
  const src = read('api/setup.js');

  for (const table of tables) {
    it(`crea tabla ${table}`, () => {
      expect(src).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    });
  }
});

// ── F7-07: setup.js cubre todos los índices ───────────────────────────────
describe('F7-07 — setup.js crea índices de rendimiento', () => {
  const indexes = [
    'idx_collections_value_gin',
    'idx_collections_updated_at',
    'idx_rate_limit_window_end',
    'idx_documents_categoria',
    'idx_documents_estado',
    'idx_documents_fecha_subida',
    'idx_pat_docs_pat_id',
    'idx_budget_log_ts',
  ];
  const src = read('api/setup.js');

  for (const idx of indexes) {
    it(`crea índice ${idx}`, () => {
      expect(src).toContain(idx);
    });
  }
});

// ── F7-08: no hay DDL inline en budget-log ni documents ──────────────────
describe('F7-08 — DDL inline eliminado de endpoints', () => {
  it('budget-log/index.js no tiene CREATE TABLE inline', () => {
    const src = read('api/budget-log/index.js');
    expect(src).not.toContain('CREATE TABLE');
  });

  it('budget-log/index.js no tiene ensureTable', () => {
    const src = read('api/budget-log/index.js');
    expect(src).not.toContain('ensureTable');
  });

  it('documents/index.js no tiene CREATE TABLE inline', () => {
    const src = read('api/documents/index.js');
    expect(src).not.toContain('CREATE TABLE');
  });

  it('documents/index.js no tiene ensureTable', () => {
    const src = read('api/documents/index.js');
    expect(src).not.toContain('ensureTable');
  });
});

// ── F7-09: docs/[patId].js tiene try/catch global ────────────────────────
describe('F7-09 — docs/[patId].js manejo de errores', () => {
  const src = read('api/docs/[patId].js');

  it('tiene try/catch global en el handler', () => {
    expect(src).toContain('try {');
    expect(src).toContain('catch (error)');
  });

  it('usa logError para registrar errores', () => {
    expect(src).toContain('logError');
  });

  it('valida patId con parseInt y isNaN', () => {
    expect(src).toContain('isNaN(patIdInt)');
  });
});

// ── F7-10: panel/auth.js y voluntarios usan singleton ────────────────────
describe('F7-10 — panel/auth.js y voluntarios usan db.js singleton', () => {
  it('panel/auth.js importa sql de lib/db.js', () => {
    const src = read('api/panel/auth.js');
    expect(src).toContain("from '../lib/db.js'");
  });

  it('panel/auth.js no instancia neon() directamente', () => {
    const src = read('api/panel/auth.js');
    expect(src).not.toMatch(/neon\s*\(/);
  });

  it('voluntarios/index.js importa sql de lib/db.js', () => {
    const src = read('api/voluntarios/index.js');
    expect(src).toContain("from '../lib/db.js'");
  });

  it('voluntarios/index.js no instancia neon() directamente', () => {
    const src = read('api/voluntarios/index.js');
    expect(src).not.toMatch(/neon\s*\(/);
  });
});
