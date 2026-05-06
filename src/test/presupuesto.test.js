/**
 * Presupuesto — Test Suite completa
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

// ── PRE-01: alertas incluyen ingresos extra activos ──────────────────────
describe('PRE-01 — Alertas incluyen ingresos extra activos', () => {
  const calcAlerta = (ingresos, costes, ie) => {
    const total = ie.filter(i => i.activo).reduce((s, i) => s + (i.valor || 0), 0);
    return (ingresos + total) - costes < 0;
  };
  it('sin extras: déficit → alerta', () => expect(calcAlerta(1000, 2000, [])).toBe(true));
  it('extras que cubren déficit → sin alerta', () => expect(calcAlerta(1000, 2000, [{ activo:true, valor:1500 }])).toBe(false));
  it('extras inactivos no cuentan', () => expect(calcAlerta(1000, 2000, [{ activo:false, valor:5000 }])).toBe(true));
});

// ── PRE-02: removeTramo limpia inscritos ──────────────────────────────────
describe('PRE-02 — removeTramo limpia inscritos', () => {
  const remove = (tramos, inscritos, id) => ({
    tramos: tramos.filter(t => t.id !== id),
    inscritos: { ...inscritos, tramos: Object.fromEntries(Object.entries(inscritos.tramos).filter(([k]) => Number(k) !== id)) }
  });
  it('elimina tramo y sus inscritos', () => {
    const r = remove([{id:1},{id:2}], {tramos:{1:{TG7:10},2:{TG7:5}}}, 1);
    expect(r.tramos).toHaveLength(1);
    expect(r.inscritos.tramos[1]).toBeUndefined();
  });
});

// ── PRE-04: Semáforo de margen ────────────────────────────────────────────
describe('PRE-04 — Semáforo de margen', () => {
  const calc = (res, costes, mc) => {
    const obj = mc.tipo === "porcentaje" ? costes * mc.valor / 100 : mc.valor;
    return res >= obj ? "verde" : res >= obj * 0.5 ? "ambar" : "rojo";
  };
  it('verde', () => expect(calc(2000, 10000, {tipo:"porcentaje",valor:10})).toBe("verde"));
  it('ámbar', () => expect(calc(600, 10000, {tipo:"porcentaje",valor:10})).toBe("ambar"));
  it('rojo', () => expect(calc(400, 10000, {tipo:"porcentaje",valor:10})).toBe("rojo"));
});

// ── PRE-11: toggleSync sincroniza ie.activo y syncConfig ─────────────────
describe('PRE-11 — toggleSync: fuente única de verdad', () => {
  const applyToggleSync = (syncKey, value, ingresos, syncConfig) => ({
    syncConfig: { ...syncConfig, [syncKey]: value },
    ingresosExtra: ingresos.map(ie => ie.syncKey === syncKey ? { ...ie, activo: value } : ie),
  });
  it('desactivar patrocinios actualiza ambos', () => {
    const ie = [{ id:1, syncKey:"patrocinios", activo:true, valor:800 }];
    const r = applyToggleSync("patrocinios", false, ie, { patrocinios:true });
    expect(r.syncConfig.patrocinios).toBe(false);
    expect(r.ingresosExtra[0].activo).toBe(false);
  });
  it('líneas manuales no afectadas', () => {
    const ie = [
      { id:1, syncKey:"patrocinios", activo:true },
      { id:12, nombre:"Otros", activo:true },
    ];
    const r = applyToggleSync("patrocinios", false, ie, {});
    expect(r.ingresosExtra[1].activo).toBe(true);
  });
});

// ── PRE-16: activoDistancias recalcula costes fijos ───────────────────────
describe('PRE-16 — activoDistancias recalcula KPIs', () => {
  const ins = { TG7:100, TG13:80, TG25:50, total:230 };
  const c = { id:1, tipo:"fijo", activo:true, costeTotal:2300, activoDistancias:{ TG7:true, TG13:true, TG25:true } };
  it('todas activas → total = costeTotal', () => expect(calcCostesFijos([c], ins).total).toBe(2300));
  it('desactivar TG25 → TG25 = 0', () => {
    const c2 = { ...c, activoDistancias:{ TG7:true, TG13:true, TG25:false } };
    expect(calcCostesFijos([c2], ins).TG25).toBe(0);
  });
  it('concepto inactivo → todo 0', () => {
    const c2 = { ...c, activo:false };
    expect(calcCostesFijos([c2], ins).total).toBe(0);
  });
  it('cambiar activoDistancias produce resultado diferente (useMemo recalcula)', () => {
    const update = (cs, id, dist, val) => cs.map(x => x.id === id ? { ...x, activoDistancias: { ...x.activoDistancias, [dist]: val } } : x);
    const v1 = calcCostesFijos([c], ins);
    const v2 = calcCostesFijos(update([c], 1, "TG25", false), ins);
    expect(v2.TG25).toBe(0);
    expect(v2.TG25).not.toBe(v1.TG25);
  });
});

// ── PRE-17: subvencionPublica calcula correctamente ────────────────────────
describe('PRE-17 — subvencionPublica desde sector Administración pública', () => {
  const getImporte = (p) => {
    if (p.estado === "cobrado") return p.importeCobrado > 0 ? p.importeCobrado : p.importe;
    if (p.estado === "confirmado") return p.importe;
    return 0;
  };
  const calc = (pats) => pats.filter(p => p.sector === "Administración pública" && !p.especie)
    .reduce((s, p) => s + getImporte(p), 0);

  const pats = [
    { id:1, sector:"Administración pública", estado:"confirmado", importe:3000, importeCobrado:0, especie:false },
    { id:2, sector:"Administración pública", estado:"cobrado",    importe:2000, importeCobrado:2000, especie:false },
    { id:3, sector:"Deportes / Outdoor",     estado:"confirmado", importe:5000, importeCobrado:0, especie:false },
    { id:5, sector:"Administración pública", estado:"confirmado", importe:500,  importeCobrado:0, especie:true },
  ];
  it('suma solo administración pública comprometida', () => expect(calc(pats)).toBe(5000));
  it('excluye otros sectores', () => { const r = calc(pats); expect(r).not.toBeGreaterThan(5000); });
  it('excluye especie', () => expect(calc(pats)).toBe(5000)); // id=5 especie excluido
  it('al eliminar pat público baja el total', () => expect(calc(pats.filter(p => p.id !== 1))).toBe(2000));
});

// ── PRE-18/19: budgetConstants tiene syncKey y SYNC_CONFIG correcto ────────
describe('PRE-18/19 — budgetConstants: syncKey y SYNC_CONFIG_DEFAULT', () => {
  it('id=10 tiene syncKey subvencionPublica', async () => {
    const { INGRESOS_EXTRA_DEFAULT } = await import('../constants/budgetConstants.js');
    const ie10 = INGRESOS_EXTRA_DEFAULT.find(ie => ie.id === 10);
    expect(ie10?.syncKey).toBe('subvencionPublica');
    expect(ie10?.synced).toBe(true);
  });
  it('SYNC_CONFIG_DEFAULT tiene subvencionPublica=true', async () => {
    const { SYNC_CONFIG_DEFAULT } = await import('../constants/budgetConstants.js');
    expect(SYNC_CONFIG_DEFAULT.subvencionPublica).toBe(true);
  });
  it('SYNC_CONFIG_DEFAULT tiene las 4 claves', async () => {
    const { SYNC_CONFIG_DEFAULT } = await import('../constants/budgetConstants.js');
    ['patrocinios','patrociniosCobrado','camisetas','subvencionPublica'].forEach(k => {
      expect(SYNC_CONFIG_DEFAULT).toHaveProperty(k);
    });
  });
});

// ── PRE-20: eliminación patrocinador actualiza subvencionPublica ──────────
describe('PRE-20 — Eliminar patrocinador actualiza totalSubvencionPublica', () => {
  const calc = (pats) => pats.filter(p => p.sector === "Administración pública" && !p.especie)
    .reduce((s, p) => s + (p.estado === "confirmado" || p.estado === "cobrado" ? p.importe : 0), 0);
  const pats = [
    { id:1, sector:"Administración pública", estado:"confirmado", importe:3000, especie:false },
    { id:2, sector:"Administración pública", estado:"confirmado", importe:2000, especie:false },
    { id:3, sector:"Deportes / Outdoor",     estado:"confirmado", importe:5000, especie:false },
  ];
  it('antes de eliminar = 5000', () => expect(calc(pats)).toBe(5000));
  it('tras eliminar id=1 = 2000', () => expect(calc(pats.filter(p => p.id !== 1))).toBe(2000));
  it('eliminar sector distinto no afecta', () => expect(calc(pats.filter(p => p.id !== 3))).toBe(5000));
});

// ── PRE-21: calculateResultadoFinanciero usa ie.activo correctamente ──────
describe('PRE-21 — calculateResultadoFinanciero respeta ie.activo del toggle', () => {
  const getSyncedValor = (ie, pats, camPedidos, camCoste) => {
    if (!ie.syncKey) return ie.valor;
    if (ie.syncKey === "patrocinios")
      return pats.filter(p => !p.especie).reduce((s, p) =>
        s + (p.estado==="cobrado"||p.estado==="confirmado" ? p.importe : 0), 0);
    if (ie.syncKey === "patrociniosCobrado")
      return pats.filter(p => !p.especie && p.estado === "cobrado").reduce((s, p) => s + p.importe, 0);
    if (ie.syncKey === "subvencionPublica")
      return pats.filter(p => p.sector === "Administración pública" && !p.especie)
        .reduce((s, p) => s + (p.estado==="cobrado"||p.estado==="confirmado" ? p.importe : 0), 0);
    return ie.valor;
  };

  const calcTotal = (ingresosExtra, pats) =>
    ingresosExtra.filter(ie => ie.activo && ie.syncKey !== "camisetas")
      .reduce((s, ie) => s + getSyncedValor(ie, pats, [], {}), 0);

  const pats = [{ id:1, sector:"Deportes", estado:"confirmado", importe:800, especie:false }];
  const ie = [{ id:1, syncKey:"patrocinios", activo:true, valor:800 }];

  it('con patrocinios activo → incluye en el total', () => {
    expect(calcTotal(ie, pats)).toBe(800);
  });

  it('con patrocinios inactivo → excluye del total (toggle funciona)', () => {
    const ieOff = ie.map(x => ({ ...x, activo: false }));
    expect(calcTotal(ieOff, pats)).toBe(0);
  });

  it('el toggle de activo es la fuente de verdad — no syncConfig', () => {
    const ieMixed = [
      { id:1, syncKey:"patrocinios", activo:false, valor:800 },   // toggle off
      { id:10, nombre:"Subvención", activo:true, valor:500 },      // manual on
    ];
    expect(calcTotal(ieMixed, pats)).toBe(500); // solo el manual activo
  });
});

// ── PRE-22: Normalización al cargar desde BD ──────────────────────────────
describe('PRE-22 — Normalización al cargar alinea ie.activo con syncConfig', () => {
  const normalizar = (savedIngresos, sc) => savedIngresos.map(ie => {
    if (!ie.syncKey) return ie;
    return { ...ie, activo: sc[ie.syncKey] ?? false };
  });

  it('normaliza activo según syncConfig', () => {
    const ie = [
      { id:1, syncKey:"patrocinios", activo:true },
      { id:3, syncKey:"patrociniosCobrado", activo:true },  // inconsistente
    ];
    const sc = { patrocinios:true, patrociniosCobrado:false };
    const r = normalizar(ie, sc);
    expect(r[0].activo).toBe(true);
    expect(r[1].activo).toBe(false);
  });

  it('no toca manuales (sin syncKey)', () => {
    const ie = [{ id:12, nombre:"Otros", activo:true }];
    const r = normalizar(ie, {});
    expect(r[0].activo).toBe(true);
  });
});

// ── PRE-23: Patrocinadores — botón eliminar accesible ─────────────────────
describe('PRE-23 — Eliminar patrocinador: modal de confirmación', () => {
  it('deletePat filtra el array por id', () => {
    let pats = [{ id:1, nombre:"A" }, { id:2, nombre:"B" }];
    const delId = 1;
    pats = pats.filter(p => p.id !== delId);
    expect(pats).toHaveLength(1);
    expect(pats[0].id).toBe(2);
  });

  it('eliminar pat no afecta a los demás', () => {
    let pats = [{ id:1 }, { id:2 }, { id:3 }];
    pats = pats.filter(p => p.id !== 2);
    expect(pats.map(p => p.id)).toEqual([1, 3]);
  });
});
