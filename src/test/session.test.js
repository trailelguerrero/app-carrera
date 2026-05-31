/**
 * session.test.js — Mejora 2 (SEC-AUTHZ)
 * Cubre el módulo de sesión firmada del panel y la estructura de autorización
 * del proxy BFF para las rutas data/*.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('SEC-AUTHZ — módulo de sesión (api/lib/session.js)', () => {
  let session;
  beforeAll(async () => {
    process.env.SESSION_SECRET = 'test-secret-para-vitest-123';
    session = await import('../../api/lib/session.js');
  });

  it('emite y valida un token firmado (roundtrip)', () => {
    const t = session.createSessionToken();
    expect(typeof t).toBe('string');
    expect(session.verifySessionToken(t)).toBe(true);
  });

  it('rechaza token manipulado', () => {
    const t = session.createSessionToken();
    expect(session.verifySessionToken(t.slice(0, -2) + 'xx')).toBe(false);
  });

  it('rechaza basura, null y formato inválido', () => {
    expect(session.verifySessionToken('abc.def')).toBe(false);
    expect(session.verifySessionToken(null)).toBe(false);
    expect(session.verifySessionToken('sin-punto')).toBe(false);
  });

  it('rechaza token expirado', () => {
    const expirado = session.createSessionToken(-10);
    expect(session.verifySessionToken(expirado)).toBe(false);
  });

  it('la cookie usa HttpOnly + Secure + SameSite=Strict', () => {
    const c = session.buildSessionCookie(session.createSessionToken());
    expect(c).toMatch(/HttpOnly/);
    expect(c).toMatch(/Secure/);
    expect(c).toMatch(/SameSite=Strict/);
  });

  it('lee el token desde la cookie de la petición', () => {
    const t = session.createSessionToken();
    const req = { headers: { cookie: `foo=1; panel_session=${t}; bar=2` } };
    expect(session.readSessionCookie(req)).toBe(t);
  });
});

describe('SEC-AUTHZ — manejo de 401 en dataService y páginas', () => {
  it('dataService dispara teg-session-expired ante 401', () => {
    const ds = read('src/lib/dataService.js');
    expect(ds).toContain('notifySessionExpired');
    expect(ds).toContain('teg-session-expired');
    expect(ds).toContain("res.status === 401");
  });

  it('Index.jsx escucha teg-session-expired y re-muestra PinScreen', () => {
    const idx = read('src/pages/Index.jsx');
    expect(idx).toContain('teg-session-expired');
    expect(idx).toContain('setAuthed(false)');
  });

  it('DiaCarreraPage.jsx escucha teg-session-expired', () => {
    const dia = read('src/pages/DiaCarreraPage.jsx');
    expect(dia).toContain('teg-session-expired');
    expect(dia).toContain('setAuthed(false)');
  });
});

describe('SEC-AUTHZ — proxy exige sesión en data/* y deduplica', () => {
  const proxy = read('api/proxy.js');

  it('valida sesión antes de tocar datos de negocio', () => {
    expect(proxy).toContain('verifySessionToken');
    expect(proxy).toContain('readSessionCookie');
    expect(proxy).toContain('sesión de panel requerida');
  });

  it('ya NO contiene CRUD Neon inline para data/* (reenvía a /api/data/*)', () => {
    // La lógica duplicada/divergente se eliminó; el proxy reenvía al endpoint autenticado.
    expect(proxy).toContain('forwardWithApiKey');
    expect(proxy).not.toContain("logInfo('[proxy/data]'");
  });

  it('CORS valida origen por igualdad exacta (no startsWith)', () => {
    expect(proxy).toContain('allowed.includes(origin)');
    expect(proxy).not.toContain('origin.startsWith(o)');
  });

  it('panel/auth emite la cookie de sesión tras un PIN correcto', () => {
    const auth = read('api/panel/auth.js');
    expect(auth).toContain('issuePanelSession');
    expect(auth).toContain('buildSessionCookie');
  });
});
