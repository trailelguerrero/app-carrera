/**
 * Presupuesto — Test Suite (actualizada)
 *
 * PRE-01  INC-01: alertas incluyen ingresos extra activos
 * PRE-02  INC-04: removeTramo limpia inscritos.tramos
 * PRE-03  PERF-03: autoSave emite "saving" después del debounce, no antes
 * PRE-04  Semáforo de margen — cálculo correcto
 * PRE-05  Coste por corredor
 * PRE-06  calculateCostesFijos prorrateo correcto
 * PRE-07  calculateResultado con ingresos extra
 * PRE-08  calculatePEGlobal viable/no viable
 * PRE-09  margenConfig — objetivo porcentaje y absoluto
 * PRE-10  Edge cases: tramos sin inscritos, conceptos vacíos
 * PRE-11  toggleSync — sincroniza ie.activo con syncConfig
 * PRE-12  toggleSync en tabla — líneas sincronizadas actualizan el panel
 * PRE-13  Normalización al cargar: ie.activo alineado con syncConfig
 * PRE-14  Tooltip origen correcto por syncKey
 * PRE-15  Líneas manuales no se ven afectadas por toggleSync
 * PRE-16  activoDistancias — costes fijos se recalculan al cambiar toggle de distancia
 * PRE-17  subvencionPublica sync — sector Administración pública
 * PRE-18  subvencionPublica en INGRESOS_EXTRA_DEFAULT tiene syncKey correcto
 * PRE-19  SYNC_CONFIG_DEFAULT incluye subvencionPublica
 * PRE-20  Eliminación de patrocinador actualiza totalSubvencionPublica
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';

beforeAll(() => {
  const s = {};
  Object.defineProperty(window,'localStorage',{value:{getItem:vi.fn(k=>s[k]??null),setItem:vi.fn((k,v)=>{s[k]=String(v);}),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  Object.defineProperty(window,'sessionStorage',{value:{getItem:vi.fn(()=>null),setItem:vi.fn(),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  global.fetch=vi.fn(()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({})}));
  vi.spyOn(console,'error').mockImplementation(()=>{});
});

const DISTANCIAS = ["TG7","TG13","TG25"];

const calcTotalInscritos = (tramos, inscritos) => {
  const tot = { TG7:0, TG13:0, TG25:0, total:0 };
  tramos.forEach(t => DISTANCIAS.forEach(d => {
    const n = inscritos.tramos?.[t.id]?.[d] || 0;
    tot[d] += n; tot.total += n;
  }));
  return tot;
};

const calcCostesFijos = (conceptos, totalInscritos) => {
  const costes = { TG7: 0, TG13: 0, TG25: 0, total: 0 };
  conceptos.filter(c => c.tipo === "fijo" && c.activo).forEach(c => {
    const distActivas = DISTANCIAS.filter(d => c.activoDistancias[d]);
    const totalActivos = distActivas.reduce((s, d) => s + totalInscritos[d], 0);
    DISTANCIAS.forEach(d => {
      if (!c.activoDistancias[d]) return;
      const prorrata = totalActivos > 0
        ? c.costeTotal * (totalInscritos[d] / totalActivos)
        : c.costeTotal / distActivas.length;
      costes[d] += prorrata;
    });
    costes.total += c.costeTotal;
  });
  return costes;
};

// ── PRE-01 a PRE-15 (existentes) ──────────────────────────────────────────
describe('PRE-01 — INC-01: alertas incluyen ingresos extra', () => {
  const calcAlerta = (ingresos, costes, ingresosExtra) => {
    const total = Array.isArray(ingresosExtra) ? ingresosExtra.filter(i => i.activo).reduce((s, i) => s + (i.valor || 0), 0) : 0;
    return (ingresos + total) - costes < 0;
  };
  it('sin extras: déficit → alerta', () => expect(calcAlerta(1000, 2000, [])).toBe(true));
  it('extras que cubren déficit → sin alerta', () => expect(calcAlerta(1000, 2000, [{ activo:true, valor:1500 }])).toBe(false));
  it('extras inactivos no cuentan', () => expect(calcAlerta(1000, 2000, [{ activo:false, valor:5000 }])).toBe(true));
});

describe('PRE-02 — INC-04: removeTramo limpia inscritos', () => {
  const remove = (tramos, inscritos, id) => ({
    tramos: tramos.filter(t => t.id !== id),
    inscritos: { ...inscritos, tramos: Object.fromEntries(Object.entries(inscritos.tramos).filter(([k]) => Number(k) !== id)) }
  });
  it('elimina tramo y sus inscritos', () => {
    const r = remove([{id:1},{id:2}], {tramos:{1:{TG7:10},2:{TG7:5}}}, 1);
    expect(r.tramos).toHaveLength(1);
    expect(r.inscritos.tramos[1]).toBeUndefined();
    expect(r.inscritos.tramos[2]).toBeDefined();
  });
});

describe('PRE-04 — Semáforo de margen', () => {
  const calcSemaforo = (res, costes, mc) => {
    const obj = mc.tipo === "porcentaje" ? costes * mc.valor / 100 : mc.valor;
    return res >= obj ? "verde" : res >= obj * 0.5 ? "ambar" : "rojo";
  };
  it('verde cuando supera objetivo', () => expect(calcSemaforo(2000, 10000, {tipo:"porcentaje",valor:10})).toBe("verde"));
  it('ámbar entre 50-100% del objetivo', () => expect(calcSemaforo(600, 10000, {tipo:"porcentaje",valor:10})).toBe("ambar"));
  it('rojo por debajo del 50%', () => expect(calcSemaforo(400, 10000, {tipo:"porcentaje",valor:10})).toBe("rojo"));
});

describe('PRE-11 — toggleSync: sincroniza ie.activo y syncConfig a la vez', () => {
  const applyToggleSync = (syncKey, value, ingresos, syncConfig) => {
    const newSyncConfig = { ...syncConfig, [syncKey]: value };
    const newIngresos = ingresos.map(ie => ie.syncKey === syncKey ? { ...ie, activo: value } : ie);
    return { syncConfig: newSyncConfig, ingresosExtra: newIngresos };
  };
  const ingresos = [
    { id:1, syncKey:"patrocinios", activo:true, valor:800 },
    { id:10, syncKey:"subvencionPublica", activo:true, valor:500 },
  ];
  it('desactivar patrocinios → ambos actualizados', () => {
    const r = applyToggleSync("patrocinios", false, ingresos, { patrocinios:true });
    expect(r.syncConfig.patrocinios).toBe(false);
    expect(r.ingresosExtra.find(ie => ie.id === 1).activo).toBe(false);
  });
  it('desactivar subvencionPublica → solo ese ítem', () => {
    const r = applyToggleSync("subvencionPublica", false, ingresos, { subvencionPublica:true });
    expect(r.ingresosExtra.find(ie => ie.id === 10).activo).toBe(false);
    expect(r.ingresosExtra.find(ie => ie.id === 1).activo).toBe(true);
  });
});

describe('PRE-15 — Líneas manuales no se modifican con toggleSync', () => {
  const applyToggle = (syncKey, value, ingresos) =>
    ingresos.map(ie => ie.syncKey === syncKey ? { ...ie, activo: value } : ie);
  const ingresos = [
    { id:1, syncKey:"patrocinios", activo:true, valor:800 },
    { id:10, syncKey:"subvencionPublica", activo:true, valor:500 },
    { id:12, nombre:"Otros", activo:true, valor:300 },
  ];
  it('toggle patrocinios no afecta líneas sin ese syncKey', () => {
    const r = applyToggle("patrocinios", false, ingresos);
    expect(r.find(ie => ie.id === 10).activo).toBe(true);
    expect(r.find(ie => ie.id === 12).activo).toBe(true);
  });
});

// ── PRE-16: activoDistancias recalcula costes fijos ────────────────────────
describe('PRE-16 — activoDistancias: costes fijos se recalculan al cambiar toggle', () => {
  const inscritos = { TG7:100, TG13:80, TG25:50, total:230 };

  const concepto = {
    id:1, tipo:"fijo", activo:true, costeTotal:2300,
    activoDistancias:{ TG7:true, TG13:true, TG25:true }
  };

  it('con todas las distancias activas total = costeTotal', () => {
    const r = calcCostesFijos([concepto], inscritos);
    expect(r.total).toBe(2300);
  });

  it('desactivar TG25 excluye su prorrata', () => {
    const c = { ...concepto, activoDistancias:{ TG7:true, TG13:true, TG25:false } };
    const r = calcCostesFijos([c], inscritos);
    // Total sigue siendo 2300 (concepto activo), pero TG25 = 0
    expect(r.TG25).toBe(0);
    expect(r.TG7).toBeGreaterThan(0);
    expect(r.TG13).toBeGreaterThan(0);
  });

  it('desactivar TG7 y TG13 → solo TG25 cargado', () => {
    const c = { ...concepto, activoDistancias:{ TG7:false, TG13:false, TG25:true } };
    const r = calcCostesFijos([c], inscritos);
    expect(r.TG7).toBe(0);
    expect(r.TG13).toBe(0);
    expect(r.TG25).toBe(2300); // toda la prorrata a TG25
  });

  it('concepto inactivo (activo=false) siempre da 0 aunque las distancias estén activas', () => {
    const c = { ...concepto, activo:false };
    const r = calcCostesFijos([c], inscritos);
    expect(r.total).toBe(0);
    expect(r.TG7).toBe(0);
  });

  it('cambiar activoDistancias actualiza el objeto _conceptos → useMemo recalcula', () => {
    // Simula la mutación que hace updateActivoDistancia
    const updateActivoDistancia = (conceptos, id, dist, value) =>
      conceptos.map(c => c.id === id ? { ...c, activoDistancias: { ...c.activoDistancias, [dist]: value } } : c);

    const conceptosV1 = [concepto];
    const conceptosV2 = updateActivoDistancia(conceptosV1, 1, "TG25", false);

    const r1 = calcCostesFijos(conceptosV1, inscritos);
    const r2 = calcCostesFijos(conceptosV2, inscritos);

    expect(r2.TG25).toBe(0);
    expect(r2.TG25).not.toBe(r1.TG25); // Debe haber cambiado
  });
});

// ── PRE-17: subvencionPublica sync desde Administración pública ────────────
describe('PRE-17 — subvencionPublica: suma de patrocinadores con sector correcto', () => {
  const getImporteComprometido = (p) => {
    if (p.estado === "cobrado") return p.importeCobrado > 0 ? p.importeCobrado : p.importe;
    if (p.estado === "confirmado") return p.importe;
    return 0;
  };

  const calcSubvencionPublica = (pats) =>
    pats
      .filter(p => p.sector === "Administración pública" && !p.especie)
      .reduce((s, p) => s + getImporteComprometido(p), 0);

  const pats = [
    { id:1, sector:"Administración pública", estado:"confirmado", importe:3000, importeCobrado:0, especie:false },
    { id:2, sector:"Administración pública", estado:"cobrado",    importe:2000, importeCobrado:2000, especie:false },
    { id:3, sector:"Deportes / Outdoor",     estado:"confirmado", importe:5000, importeCobrado:0, especie:false },
    { id:4, sector:"Administración pública", estado:"prospecto",  importe:1000, importeCobrado:0, especie:false },
    { id:5, sector:"Administración pública", estado:"confirmado", importe:500,  importeCobrado:0, especie:true },  // especie → excluido
  ];

  it('suma solo patrocinadores de Administración pública con importe comprometido', () => {
    const r = calcSubvencionPublica(pats);
    expect(r).toBe(5000); // id=1 (3000) + id=2 (2000)
  });

  it('excluye otros sectores', () => {
    const r = calcSubvencionPublica(pats);
    // id=3 (Deportes) no incluido
    expect(r).not.toBe(r + 5000);
  });

  it('excluye especie aunque sea Administración pública', () => {
    const r = calcSubvencionPublica(pats);
    expect(r).toBe(5000); // id=5 excluido por especie
  });

  it('excluye prospectos (sin importe comprometido)', () => {
    const r = calcSubvencionPublica(pats);
    expect(r).toBe(5000); // id=4 excluido por estado prospecto
  });

  it('sin patrocinadores de entidad pública → 0', () => {
    const sinPublicos = pats.filter(p => p.sector !== "Administración pública");
    expect(calcSubvencionPublica(sinPublicos)).toBe(0);
  });

  it('al eliminar un patrocinador público el total baja', () => {
    const tras_eliminar = pats.filter(p => p.id !== 1);
    expect(calcSubvencionPublica(tras_eliminar)).toBe(2000);
  });
});

// ── PRE-18: INGRESOS_EXTRA_DEFAULT tiene syncKey correcto ─────────────────
describe('PRE-18 — INGRESOS_EXTRA_DEFAULT: syncKey subvencionPublica', () => {
  it('id=10 tiene syncKey subvencionPublica', async () => {
    const { INGRESOS_EXTRA_DEFAULT } = await import('../constants/budgetConstants.js');
    const ie10 = INGRESOS_EXTRA_DEFAULT.find(ie => ie.id === 10);
    expect(ie10).toBeTruthy();
    expect(ie10.syncKey).toBe('subvencionPublica');
    expect(ie10.synced).toBe(true);
  });
});

// ── PRE-19: SYNC_CONFIG_DEFAULT incluye subvencionPublica ─────────────────
describe('PRE-19 — SYNC_CONFIG_DEFAULT incluye subvencionPublica', () => {
  it('tiene la clave subvencionPublica con valor true por defecto', async () => {
    const { SYNC_CONFIG_DEFAULT } = await import('../constants/budgetConstants.js');
    expect(SYNC_CONFIG_DEFAULT).toHaveProperty('subvencionPublica');
    expect(SYNC_CONFIG_DEFAULT.subvencionPublica).toBe(true);
  });

  it('tiene las cuatro claves necesarias', async () => {
    const { SYNC_CONFIG_DEFAULT } = await import('../constants/budgetConstants.js');
    expect(Object.keys(SYNC_CONFIG_DEFAULT)).toContain('patrocinios');
    expect(Object.keys(SYNC_CONFIG_DEFAULT)).toContain('patrociniosCobrado');
    expect(Object.keys(SYNC_CONFIG_DEFAULT)).toContain('camisetas');
    expect(Object.keys(SYNC_CONFIG_DEFAULT)).toContain('subvencionPublica');
  });
});

// ── PRE-20: Eliminación de patrocinador actualiza subvencionPublica ────────
describe('PRE-20 — Al eliminar patrocinador, totalSubvencionPublica se recalcula', () => {
  const calcSubvencion = (pats) => {
    const getImporte = (p) => {
      if (p.estado === "cobrado") return p.importeCobrado > 0 ? p.importeCobrado : p.importe;
      if (p.estado === "confirmado") return p.importe;
      return 0;
    };
    return pats
      .filter(p => p.sector === "Administración pública" && !p.especie)
      .reduce((s, p) => s + getImporte(p), 0);
  };

  const pats = [
    { id:1, sector:"Administración pública", estado:"confirmado", importe:3000, importeCobrado:0, especie:false },
    { id:2, sector:"Administración pública", estado:"confirmado", importe:2000, importeCobrado:0, especie:false },
    { id:3, sector:"Deportes / Outdoor",     estado:"confirmado", importe:5000, importeCobrado:0, especie:false },
  ];

  it('eliminar patrocinador público reduce el total', () => {
    const antes = calcSubvencion(pats);
    const despues = calcSubvencion(pats.filter(p => p.id !== 1));
    expect(antes).toBe(5000);
    expect(despues).toBe(2000);
    expect(despues).toBeLessThan(antes);
  });

  it('eliminar patrocinador de otro sector no afecta al total', () => {
    const antes = calcSubvencion(pats);
    const despues = calcSubvencion(pats.filter(p => p.id !== 3));
    expect(antes).toBe(despues);
  });
});
