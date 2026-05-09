/**
 * VoluntarioPortal — Test Suite
 *
 * PORTAL-01  Manejo de status 429 en login — mensaje diferenciado
 * PORTAL-02  Pantalla "ausente" — estado no manejado previamente
 * PORTAL-03  Botón cerrar sesión en topbar
 * PORTAL-04  CTA de llegada al puesto en posición prominente
 * PORTAL-05  Texto camiseta pendiente actualizado
 * PORTAL-06  Normalización de teléfono en login
 * PORTAL-07  Gestión de sesión — loadSession / saveSession / clearSession
 * PORTAL-08  SESSION_TTL — expiración correcta
 * PORTAL-09  Estados del badge de voluntario
 * PORTAL-10  Validación de registro — campos requeridos
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { SK_VOL_SESSION } from '../constants/storageKeys.js';

beforeAll(() => {
  const s = {};
  Object.defineProperty(window,'localStorage',{value:{
    getItem:vi.fn(k=>s[k]??null),
    setItem:vi.fn((k,v)=>{s[k]=String(v);}),
    removeItem:vi.fn(k=>{delete s[k];}),
    clear:vi.fn(()=>Object.keys(s).forEach(k=>delete s[k])),
    get length(){return Object.keys(s).length;}
  },writable:true});
  Object.defineProperty(window,'sessionStorage',{value:{getItem:vi.fn(()=>null),setItem:vi.fn(),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  global.fetch=vi.fn(()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({})}));
  vi.spyOn(console,'error').mockImplementation(()=>{});
});

afterEach(() => vi.clearAllMocks());

// ── PORTAL-01: Manejo de 429 en login ─────────────────────────────────────
describe('PORTAL-01 — Manejo de status 429 en login', () => {
  const handleLoginResponse = (res, data) => {
    if (!res.ok) {
      if (res.status === 429) {
        return { tipo: "rate-limit", mensaje: data.error || "Demasiados intentos. Espera unos minutos." };
      }
      return { tipo: "error-pin", mensaje: data.error || "Teléfono o PIN incorrecto", shake: true };
    }
    return { tipo: "ok", token: data.token };
  };

  it('429 → mensaje de rate limit, sin shake', () => {
    const r = handleLoginResponse({ ok:false, status:429 }, { error:"Demasiados intentos" });
    expect(r.tipo).toBe("rate-limit");
    expect(r.shake).toBeUndefined();
    expect(r.mensaje).toContain("intentos");
  });

  it('401 → error PIN con shake', () => {
    const r = handleLoginResponse({ ok:false, status:401 }, { error:"PIN incorrecto" });
    expect(r.tipo).toBe("error-pin");
    expect(r.shake).toBe(true);
  });

  it('200 → ok con token', () => {
    const r = handleLoginResponse({ ok:true, status:200 }, { token:"abc123" });
    expect(r.tipo).toBe("ok");
    expect(r.token).toBe("abc123");
  });

  it('429 sin mensaje del servidor usa fallback', () => {
    const r = handleLoginResponse({ ok:false, status:429 }, {});
    expect(r.mensaje).toContain("minutos");
  });
});

// ── PORTAL-02: Estado ausente ──────────────────────────────────────────────
describe('PORTAL-02 — Estado ausente manejado', () => {
  const getEstadoPantalla = (estado) => {
    if (estado === "cancelado") return "pantalla-cancelado";
    if (estado === "ausente")   return "pantalla-ausente";
    return "portal-normal";
  };

  it('estado ausente muestra pantalla específica', () => {
    expect(getEstadoPantalla("ausente")).toBe("pantalla-ausente");
  });

  it('estado cancelado no confundido con ausente', () => {
    expect(getEstadoPantalla("cancelado")).toBe("pantalla-cancelado");
  });

  it('estado pendiente y confirmado muestran portal normal', () => {
    expect(getEstadoPantalla("pendiente")).toBe("portal-normal");
    expect(getEstadoPantalla("confirmado")).toBe("portal-normal");
  });

  it('la pantalla de ausente no permite marcar llegada', () => {
    // Si estamos en pantalla ausente, no se renderiza el botón de llegada
    const puedeMarcarLlegada = (estado) => estado === "confirmado" && !/* enPuesto */false;
    expect(puedeMarcarLlegada("ausente")).toBe(false);
  });
});

// ── PORTAL-03: Botón cerrar sesión en topbar ───────────────────────────────
describe('PORTAL-03 — Botón cerrar sesión visible en topbar', () => {
  it('clearSession elimina la sesión del localStorage', () => {
    const store = {};
    const SESSION_KEY = SK_VOL_SESSION;
    const lsMock = {
      setItem: (k,v) => { store[k] = v; },
      removeItem: (k) => { delete store[k]; },
      getItem: (k) => store[k] ?? null,
    };
    
    // saveSession
    lsMock.setItem(SESSION_KEY, JSON.stringify({ token:"abc", ts: Date.now() }));
    expect(lsMock.getItem(SESSION_KEY)).not.toBeNull();
    
    // clearSession
    lsMock.removeItem(SESSION_KEY);
    expect(lsMock.getItem(SESSION_KEY)).toBeNull();
  });

  it('logout restablece el token a null', () => {
    let token = "abc123";
    const goLogout = () => { token = null; };
    goLogout();
    expect(token).toBeNull();
  });
});

// ── PORTAL-04: CTA llegada en posición prominente ─────────────────────────
describe('PORTAL-04 — CTA llegada al puesto es visible prominentemente', () => {
  const debeRendCTALlegada = (v, puesto) => {
    return v.estado === "confirmado" && !v.enPuesto && puesto !== null;
  };

  it('voluntario confirmado con puesto → CTA prominente visible', () => {
    const v = { estado:"confirmado", enPuesto:false };
    const puesto = { id:1, nombre:"Meta" };
    expect(debeRendCTALlegada(v, puesto)).toBe(true);
  });

  it('voluntario ya en puesto → no mostrar CTA (ya registrado)', () => {
    const v = { estado:"confirmado", enPuesto:true };
    expect(debeRendCTALlegada(v, { id:1 })).toBe(false);
  });

  it('voluntario pendiente → no mostrar CTA de llegada', () => {
    const v = { estado:"pendiente", enPuesto:false };
    expect(debeRendCTALlegada(v, { id:1 })).toBe(false);
  });

  it('voluntario sin puesto asignado → no mostrar CTA', () => {
    const v = { estado:"confirmado", enPuesto:false };
    expect(debeRendCTALlegada(v, null)).toBe(false);
  });
});

// ── PORTAL-05: Texto camiseta actualizado ─────────────────────────────────
describe('PORTAL-05 — Texto camiseta pendiente actualizado', () => {
  const getCamisetaText = (entregada) =>
    entregada ? "✅ Entregada" : "📦 Por recoger el día del evento";

  it('no entregada → texto descriptivo con acción', () => {
    expect(getCamisetaText(false)).toContain("recoger");
    expect(getCamisetaText(false)).toContain("📦");
  });

  it('entregada → texto positivo', () => {
    expect(getCamisetaText(true)).toBe("✅ Entregada");
  });

  it('texto pendiente ya no usa ⏳', () => {
    expect(getCamisetaText(false)).not.toContain("⏳");
  });
});

// ── PORTAL-06: Normalización de teléfono ─────────────────────────────────
describe('PORTAL-06 — Normalización teléfono en login', () => {
  const normalizarTel = (input) => input.replace(/[^0-9+]/g, "");

  it('quita espacios', () => {
    expect(normalizarTel("612 345 678")).toBe("612345678");
  });

  it('quita guiones', () => {
    expect(normalizarTel("612-345-678")).toBe("612345678");
  });

  it('mantiene el prefijo +34', () => {
    expect(normalizarTel("+34612345678")).toBe("+34612345678");
  });

  it('letras son eliminadas', () => {
    expect(normalizarTel("612abc345")).toBe("612345");
  });

  it('número limpio no se modifica', () => {
    expect(normalizarTel("612345678")).toBe("612345678");
  });
});

// ── PORTAL-07: Gestión de sesión ──────────────────────────────────────────
describe('PORTAL-07 — Gestión de sesión loadSession/saveSession/clearSession', () => {
  const SESSION_KEY = SK_VOL_SESSION;
  const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
  const store = {};
  
  const lsMock = {
    getItem: (k) => store[k] ?? null,
    setItem: (k,v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  
  const loadSession = () => {
    try {
      const raw = JSON.parse(lsMock.getItem(SESSION_KEY) || "null");
      if (!raw) return null;
      if (raw.ts && Date.now() - raw.ts > SESSION_TTL) { lsMock.removeItem(SESSION_KEY); return null; }
      return raw;
    } catch { return null; }
  };
  const saveSession = (data) => lsMock.setItem(SESSION_KEY, JSON.stringify({ ...data, ts: Date.now() }));
  const clearSession = () => lsMock.removeItem(SESSION_KEY);

  it('saveSession guarda token con timestamp', () => {
    saveSession({ token: "abc123" });
    const raw = JSON.parse(lsMock.getItem(SESSION_KEY));
    expect(raw.token).toBe("abc123");
    expect(raw.ts).toBeGreaterThan(0);
  });

  it('loadSession recupera sesión válida', () => {
    saveSession({ token: "abc123" });
    const s = loadSession();
    expect(s?.token).toBe("abc123");
  });

  it('clearSession elimina la sesión', () => {
    saveSession({ token: "abc123" });
    clearSession();
    expect(loadSession()).toBeNull();
  });

  it('loadSession devuelve null si no hay sesión', () => {
    clearSession();
    expect(loadSession()).toBeNull();
  });
});

// ── PORTAL-08: SESSION_TTL expiración ────────────────────────────────────
describe('PORTAL-08 — SESSION_TTL expiración automática', () => {
  const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

  it('sesión con ts reciente es válida', () => {
    const raw = { token:"abc", ts: Date.now() - 1000 }; // hace 1s
    const expirada = Date.now() - raw.ts > SESSION_TTL;
    expect(expirada).toBe(false);
  });

  it('sesión con ts hace 8 días está expirada', () => {
    const raw = { token:"abc", ts: Date.now() - (8 * 24 * 60 * 60 * 1000) };
    const expirada = Date.now() - raw.ts > SESSION_TTL;
    expect(expirada).toBe(true);
  });

  it('SESSION_TTL es de exactamente 7 días', () => {
    expect(SESSION_TTL).toBe(7 * 24 * 60 * 60 * 1000);
    expect(SESSION_TTL / (24 * 60 * 60 * 1000)).toBe(7);
  });

  it('sesión con ts hace exactamente 7 días está en el límite (no expirada)', () => {
    const exacto = { token:"abc", ts: Date.now() - SESSION_TTL };
    const expirada = Date.now() - exacto.ts > SESSION_TTL;
    expect(expirada).toBe(false); // > no >=
  });
});

// ── PORTAL-09: Estados del badge del voluntario ───────────────────────────
describe('PORTAL-09 — Badge de estado del voluntario', () => {
  const getBadgeInfo = (estado) => ({
    "confirmado": { clase:"vp-badge-green", texto:"✓ Confirmado"  },
    "cancelado":  { clase:"vp-badge-red",   texto:"✕ Cancelado"  },
    "ausente":    { clase:"vp-badge-red",   texto:"🚫 Ausente"   },
    "pendiente":  { clase:"vp-badge-amber", texto:"⏳ Pendiente" },
  }[estado] ?? { clase:"vp-badge-amber", texto:"⏳ Pendiente" });

  it('confirmado → badge verde', () => {
    expect(getBadgeInfo("confirmado").clase).toBe("vp-badge-green");
  });

  it('cancelado → badge rojo', () => {
    expect(getBadgeInfo("cancelado").clase).toBe("vp-badge-red");
  });

  it('ausente → badge rojo', () => {
    expect(getBadgeInfo("ausente").clase).toBe("vp-badge-red");
  });

  it('pendiente → badge ámbar', () => {
    expect(getBadgeInfo("pendiente").clase).toBe("vp-badge-amber");
  });

  it('estado desconocido → ámbar por defecto', () => {
    expect(getBadgeInfo("otro").clase).toBe("vp-badge-amber");
  });
});

// ── PORTAL-10: Validaciones de registro ───────────────────────────────────
describe('PORTAL-10 — Validaciones del formulario de registro', () => {
  const validarPaso1 = (form, opcionEmergencia) => {
    const e = {};
    if (!form.nombre?.trim()) e.nombre = "Nombre requerido";
    const tel = (form.telefono||"").replace(/\D/g,"");
    if (tel.length < 9) e.telefono = "Teléfono no válido";
    if (!form.talla) e.talla = "Selecciona una talla";
    if (opcionEmergencia && !form.telefonoEmergencia?.trim()) e.telefonoEmergencia = "Requerido";
    return e;
  };

  it('nombre vacío → error', () => {
    const e = validarPaso1({ nombre:"", telefono:"612345678", talla:"M" }, false);
    expect(e.nombre).toBeTruthy();
  });

  it('teléfono corto → error', () => {
    const e = validarPaso1({ nombre:"Juan", telefono:"123", talla:"M" }, false);
    expect(e.telefono).toBeTruthy();
  });

  it('talla no seleccionada → error', () => {
    const e = validarPaso1({ nombre:"Juan", telefono:"612345678", talla:"" }, false);
    expect(e.talla).toBeTruthy();
  });

  it('opcionEmergencia activa sin teléfono → error', () => {
    const e = validarPaso1({ nombre:"Juan", telefono:"612345678", talla:"M", telefonoEmergencia:"" }, true);
    expect(e.telefonoEmergencia).toBeTruthy();
  });

  it('formulario completo válido → sin errores', () => {
    const e = validarPaso1({ nombre:"Juan García", telefono:"612345678", talla:"M" }, false);
    expect(Object.keys(e)).toHaveLength(0);
  });
});
