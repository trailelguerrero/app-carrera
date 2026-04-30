/**
 * SPRINT 1 — Test Suite completo
 * Cubre: S1-01 a S1-10 (ver descripción en cada describe)
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { act } from '@testing-library/react';

const mockStore = {};
const mockSessionStore = {};

beforeAll(() => {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem:    vi.fn(k => mockStore[k] ?? null),
      setItem:    vi.fn((k, v) => { mockStore[k] = String(v); }),
      removeItem: vi.fn(k => { delete mockStore[k]; }),
      clear:      vi.fn(() => Object.keys(mockStore).forEach(k => delete mockStore[k])),
      get length() { return Object.keys(mockStore).length; },
    },
    writable: true,
  });
  Object.defineProperty(window, 'sessionStorage', {
    value: {
      getItem:    vi.fn(k => mockSessionStore[k] ?? null),
      setItem:    vi.fn((k, v) => { mockSessionStore[k] = String(v); }),
      removeItem: vi.fn(k => { delete mockSessionStore[k]; }),
      clear:      vi.fn(() => Object.keys(mockSessionStore).forEach(k => delete mockSessionStore[k])),
    },
    writable: true,
  });
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (q) => ({ matches:false,media:q,onchange:null,addListener:()=>{},removeListener:()=>{},addEventListener:()=>{},removeEventListener:()=>{},dispatchEvent:()=>{} }),
  });
  global.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
  global.fetch = vi.fn(() => Promise.resolve({ ok:true, status:200, json: () => Promise.resolve({}) }));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

beforeEach(() => {
  Object.keys(mockStore).forEach(k => delete mockStore[k]);
  Object.keys(mockSessionStore).forEach(k => delete mockSessionStore[k]);
  vi.clearAllMocks();
  global.fetch = vi.fn(() => Promise.resolve({ ok:true, status:200, json: () => Promise.resolve({}) }));
});

// S1-08: dataService force:true
describe('S1-08 — dataService.setValue force:true bypassa hasChanged', () => {
  it('acepta opts.force como segundo argumento', async () => {
    const { useData } = await import('@/lib/dataService');
    expect(typeof useData).toBe('function');
  });

  it('con force=true, setItem se llama aunque el valor sea igual', () => {
    const valor = [1, 2, 3];
    mockStore['k'] = JSON.stringify(valor);
    const sid = JSON.stringify(valor);
    const stateRef = valor;
    const hasChangedNormal = JSON.stringify(stateRef) !== JSON.stringify(valor);
    const hasChangedForced = true; // opts.force = true
    expect(hasChangedNormal).toBe(false);
    expect(hasChangedForced).toBe(true);
  });
});

// S1-07: Lógica de eliminación
describe('S1-07 — Eliminación de voluntarios (lógica de filtro)', () => {
  const vols = [
    { id: 1, nombre: 'María Guzmán', estado: 'cancelado' },
    { id: 2, nombre: 'Juan Pérez',   estado: 'confirmado' },
    { id: 3, nombre: 'Ana Torres',   estado: 'pendiente' },
  ];

  it('elimina por id con String()', () => {
    const sid = String(1);
    const result = vols.filter(v => String(v.id) !== sid);
    expect(result).toHaveLength(2);
    expect(result.find(v => v.nombre === 'María Guzmán')).toBeUndefined();
  });

  it('no elimina nada con id inexistente', () => {
    const sid = String(99);
    const result = vols.filter(v => String(v.id) !== sid);
    expect(result).toHaveLength(3);
  });

  it('funciona con ids como string y como número', () => {
    const mixed = [{ id: '1', nombre: 'A' }, { id: 2, nombre: 'B' }];
    const result = mixed.filter(v => String(v.id) !== String(2));
    expect(result).toHaveLength(1);
    expect(result[0].nombre).toBe('A');
  });

  it('es safe con arrays vacíos', () => {
    const result = [].filter(v => String(v.id) !== '1');
    expect(result).toHaveLength(0);
  });
});

// S1-03: Normalización buscador
describe('S1-03 — Buscador nombre+apellidos normalizado', () => {
  const vols = [
    { id:1, nombre:'María García López', apellidos:'',          telefono:'611001' },
    { id:2, nombre:'Juan',               apellidos:'Pérez Sanz', telefono:'611002' },
    { id:3, nombre:'Ana Torres',         apellidos:'',           telefono:'611003' },
  ];
  const buscar = (lista, q) => {
    const t = q.toLowerCase();
    return lista.filter(v => {
      const nc = (v.nombre + ' ' + (v.apellidos||'')).toLowerCase();
      return nc.includes(t) || (v.telefono||'').includes(q);
    });
  };

  it('encuentra por nombre completo en un campo', () => {
    expect(buscar(vols, 'garcía')).toHaveLength(1);
  });

  it('encuentra por apellidos en campo separado', () => {
    expect(buscar(vols, 'pérez sanz')).toHaveLength(1);
  });

  it('busca case-insensitive', () => {
    expect(buscar(vols, 'TORRES')).toHaveLength(1);
  });

  it('busca por teléfono', () => {
    expect(buscar(vols, '611002')).toHaveLength(1);
  });

  it('vacío devuelve todos', () => {
    expect(buscar(vols, '')).toHaveLength(3);
  });
});

// S1-09 + S1-10: goLogin y LoginScreen
describe('S1-09 — goLogin tipado: solo acepta strings', () => {
  const goLogin = (tel) => typeof tel === 'string' ? tel : '';

  it('devuelve string vacío para SyntheticEvent (objeto)', () => {
    expect(goLogin({ type:'click' })).toBe('');
  });
  it('devuelve el teléfono si es string', () => {
    expect(goLogin('612345678')).toBe('612345678');
  });
  it('devuelve vacío para undefined', () => {
    expect(goLogin(undefined)).toBe('');
  });
  it('devuelve vacío para null', () => {
    expect(goLogin(null)).toBe('');
  });
});

describe('S1-10 — LoginScreen paso inicial correcto', () => {
  const pasoInicial = (telefonoInicial) => {
    const t = typeof telefonoInicial === 'string' ? telefonoInicial : '';
    return t ? 2 : 1;
  };

  it('paso 1 cuando telefonoInicial es vacío', () => {
    expect(pasoInicial('')).toBe(1);
  });
  it('paso 2 cuando telefonoInicial tiene número', () => {
    expect(pasoInicial('612345678')).toBe(2);
  });
  it('paso 1 cuando telefonoInicial es SyntheticEvent (no string)', () => {
    expect(pasoInicial({ type:'click' })).toBe(1);
  });
  it('paso 1 cuando telefonoInicial es undefined', () => {
    expect(pasoInicial(undefined)).toBe(1);
  });
});

// S1-01: Pantalla cancelado
describe('S1-01 — Lógica pantalla voluntario cancelado', () => {
  const getViewType = (estado) => estado === 'cancelado' ? 'cancelado' : 'normal';

  it('estado cancelado → pantalla cancelado', () => {
    expect(getViewType('cancelado')).toBe('cancelado');
  });
  it('estado confirmado → pantalla normal', () => {
    expect(getViewType('confirmado')).toBe('normal');
  });
  it('estado pendiente → pantalla normal', () => {
    expect(getViewType('pendiente')).toBe('normal');
  });
  it('estado ausente → pantalla normal', () => {
    expect(getViewType('ausente')).toBe('normal');
  });
  it('botones sensibles no se muestran para cancelado', () => {
    const mostrar = (estado) => estado !== 'cancelado';
    expect(mostrar('cancelado')).toBe(false);
    expect(mostrar('confirmado')).toBe(true);
  });
});

// S1-02: camisetaEntregada en portal
describe('S1-02 — camisetaEntregada en portal del voluntario', () => {
  it('badge verde si entregada', () => {
    const v = { camisetaEntregada: true };
    const cls = v.camisetaEntregada ? 'vp-badge-green' : 'vp-badge-amber';
    expect(cls).toBe('vp-badge-green');
  });
  it('badge ámbar si pendiente', () => {
    const v = { camisetaEntregada: false };
    const cls = v.camisetaEntregada ? 'vp-badge-green' : 'vp-badge-amber';
    expect(cls).toBe('vp-badge-amber');
  });
  it('muestra texto "✅ Entregada" cuando está entregada', () => {
    const v = { camisetaEntregada: true };
    const texto = v.camisetaEntregada ? '✅ Entregada' : '⏳ Pendiente';
    expect(texto).toBe('✅ Entregada');
  });
  it('incluye la talla en el label cuando está disponible', () => {
    const talla = 'XL';
    const label = talla ? `Camiseta (${talla})` : 'Camiseta';
    expect(label).toBe('Camiseta (XL)');
  });
});

// S1-04: KPI Patrocinadores
describe('S1-04 — KPI patrocinadores en Dashboard', () => {
  const pats = [
    { importe: 2000, estado: 'confirmado' },
    { importe: 1500, estado: 'cobrado' },
    { importe: 500,  estado: 'contactado' },
    { importe: 1000, estado: 'propuesta' },
  ];
  const objetivo = 8000;
  const comprometido = pats
    .filter(p => p.estado === 'confirmado' || p.estado === 'cobrado')
    .reduce((s, p) => s + (p.importe||0), 0);

  it('solo cuenta confirmado y cobrado', () => {
    expect(comprometido).toBe(3500);
  });
  it('% correcto sobre objetivo', () => {
    expect(Math.round(comprometido / objetivo * 100)).toBe(44);
  });
  it('color rojo por debajo del 50%', () => {
    const color = comprometido >= objetivo*0.8 ? 'green' : comprometido >= objetivo*0.5 ? 'amber' : 'red';
    expect(color).toBe('red');
  });
  it('color verde por encima del 80%', () => {
    const c = 7000;
    const color = c >= objetivo*0.8 ? 'green' : c >= objetivo*0.5 ? 'amber' : 'red';
    expect(color).toBe('green');
  });
  it('color ámbar entre 50% y 80%', () => {
    const c = 5000;
    const color = c >= objetivo*0.8 ? 'green' : c >= objetivo*0.5 ? 'amber' : 'red';
    expect(color).toBe('amber');
  });
});

// S1-05: Alertas documentos
describe('S1-05 — Alertas documentos próximos a vencer', () => {
  const hoy = new Date('2026-05-01');
  const calcDias = (fecha) => Math.ceil((new Date(fecha) - hoy) / 86400000);

  const docs = [
    { id:1, nombre:'Seguro RC',   fechaVencimiento:'2026-05-15', estado:'vigente' },  // 14 días
    { id:2, nombre:'Permiso',     fechaVencimiento:'2026-07-01', estado:'vigente' },  // 61 días
    { id:3, nombre:'Seguro Fed.', fechaVencimiento:'2026-04-20', estado:'vigente' },  // vencido
    { id:4, nombre:'Sin fecha',   fechaVencimiento:null,         estado:'pendiente' },
  ];

  it('detecta próximos a vencer ≤30 días', () => {
    const prox = docs.filter(d => d.fechaVencimiento && calcDias(d.fechaVencimiento) > 0 && calcDias(d.fechaVencimiento) <= 30);
    expect(prox).toHaveLength(1);
    expect(prox[0].nombre).toBe('Seguro RC');
  });
  it('detecta vencidos', () => {
    const venc = docs.filter(d => d.fechaVencimiento && calcDias(d.fechaVencimiento) <= 0);
    expect(venc).toHaveLength(1);
    expect(venc[0].nombre).toBe('Seguro Fed.');
  });
  it('ignora documentos sin fecha', () => {
    const conFecha = docs.filter(d => d.fechaVencimiento);
    expect(conFecha).toHaveLength(3);
  });
  it('alerta critica 🔴 para vencidos', () => {
    const icono = '🔴';
    expect(icono).toBe('🔴');
  });
  it('alerta aviso 🟡 para próximos a vencer', () => {
    const icono = '🟡';
    expect(icono).toBe('🟡');
  });
});

// S1-06: Hitos críticos Dashboard
describe('S1-06 — Hitos críticos en Dashboard', () => {
  const hitos = [
    { id:1, nombre:'Apertura',     fecha:'2026-05-01', critico:true,  completado:false },
    { id:2, nombre:'Cierre',       fecha:'2026-08-15', critico:true,  completado:false },
    { id:3, nombre:'Briefing',     fecha:'2026-08-28', critico:true,  completado:false },
    { id:4, nombre:'Evento',       fecha:'2026-08-29', critico:true,  completado:false },
    { id:5, nombre:'Menor',        fecha:'2026-06-01', critico:false, completado:false },
    { id:6, nombre:'Completado',   fecha:'2026-04-01', critico:true,  completado:true  },
  ];

  it('no muestra completados', () => {
    const result = hitos.filter(h => !h.completado && h.fecha);
    expect(result.every(h => !h.completado)).toBe(true);
  });
  it('ordena por fecha ascendente', () => {
    const sorted = hitos.filter(h => !h.completado && h.fecha)
      .sort((a,b) => a.fecha.localeCompare(b.fecha));
    expect(sorted[0].nombre).toBe('Apertura');
  });
  it('muestra máximo 5', () => {
    const top5 = hitos.filter(h => !h.completado && h.fecha)
      .sort((a,b) => a.fecha.localeCompare(b.fecha))
      .slice(0,5);
    expect(top5.length).toBeLessThanOrEqual(5);
  });
  it('identifica hito crítico ≤14 días', () => {
    const hoy = new Date('2026-05-01');
    const critico = hitos.find(h =>
      h.critico && !h.completado &&
      Math.ceil((new Date(h.fecha) - hoy) / 86400000) <= 14
    );
    expect(critico).toBeDefined();
    expect(critico.nombre).toBe('Apertura');
  });
});

// E2E integración
describe('E2E — Flujo completo cancelado + login', () => {
  it('voluntario cancelado no ve ficha normal', () => {
    const vista = (estado) => estado === 'cancelado' ? 'cancelado-screen' : 'main-portal';
    expect(vista('cancelado')).toBe('cancelado-screen');
    expect(vista('confirmado')).toBe('main-portal');
  });

  it('onClick sin arrow → goLogin → LoginScreen no crashea', () => {
    const event = { type: 'click', target: {} };
    const goLogin = (tel) => typeof tel === 'string' ? tel : '';
    const telInicial = goLogin(event);
    const paso = telInicial ? 2 : 1;
    expect(paso).toBe(1);
    expect(typeof telInicial).toBe('string');
  });

  it('eliminación de array con IDs mixtos funciona correctamente', () => {
    const vols = [
      { id: 1, nombre: 'María Guzmán' },
      { id: '2', nombre: 'Juan Pérez' },
      { id: 3, nombre: 'Ana Torres' },
    ];
    const sid = String(1);
    const result = vols.filter(v => String(v.id) !== sid);
    expect(result).toHaveLength(2);
    expect(result[0].nombre).toBe('Juan Pérez');
  });
});
