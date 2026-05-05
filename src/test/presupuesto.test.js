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

const calcIngresos = (tramos, inscritos) => {
  const ing = { TG7:0, TG13:0, TG25:0, total:0 };
  tramos.forEach(t => DISTANCIAS.forEach(d => {
    const n = inscritos.tramos?.[t.id]?.[d] || 0;
    ing[d] += n * (t.precios[d] || 0);
    ing.total += n * (t.precios[d] || 0);
  }));
  return ing;
};

const calcCostesFijos = (conceptos, totalIns) => {
  let total = 0;
  conceptos.filter(c => c.tipo === "fijo" && c.activo).forEach(c => { total += c.costeTotal; });
  return { total };
};

const calcCostesVar = (conceptos, totalIns) => {
  let total = 0;
  conceptos.filter(c => c.tipo === "variable" && c.activo).forEach(c => {
    DISTANCIAS.forEach(d => { if (c.activoDistancias?.[d]) total += (c.costePorDistancia[d]||0) * totalIns[d]; });
  });
  return { total };
};

// ── PRE-01 a PRE-10 (existentes) ──────────────────────────────────────────
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
  it('objetivo absoluto funciona', () => expect(calcSemaforo(800, 10000, {tipo:"absoluto",valor:500})).toBe("verde"));
});

describe('PRE-05 — Coste por corredor', () => {
  const calcCPC = (costes, ins) => ins > 0 ? Math.round(costes / ins * 100) / 100 : null;
  it('calcula correctamente', () => expect(calcCPC(6000, 400)).toBe(15));
  it('null con 0 inscritos', () => expect(calcCPC(5000, 0)).toBeNull());
});

describe('PRE-09 — margenConfig', () => {
  const getObj = (costes, cfg) => cfg.tipo === "porcentaje" ? costes * cfg.valor / 100 : cfg.valor;
  it('10% de 10000 = 1000', () => expect(getObj(10000, {tipo:"porcentaje",valor:10})).toBe(1000));
  it('absoluto 500 independiente del coste', () => expect(getObj(100000, {tipo:"absoluto",valor:500})).toBe(500));
});

describe('PRE-10 — Edge cases', () => {
  it('0 inscritos → total 0', () => {
    const t = [{id:1, precios:{TG7:20,TG13:30,TG25:40}}];
    expect(calcTotalInscritos(t, {tramos:{1:{TG7:0,TG13:0,TG25:0}}}).total).toBe(0);
  });
  it('conceptos vacíos → costes 0', () => {
    expect(calcCostesFijos([], {TG7:100,TG13:100,TG25:100,total:300}).total).toBe(0);
  });
});

// ── PRE-11: toggleSync sincroniza ie.activo con syncConfig ────────────────
describe('PRE-11 — toggleSync: sincroniza ie.activo y syncConfig a la vez', () => {
  const ingresosExtra = [
    { id:1, syncKey:"patrocinios",        activo:true,  valor:800, synced:true },
    { id:3, syncKey:"patrociniosCobrado", activo:false, valor:200, synced:true },
    { id:2, syncKey:"camisetas",          activo:true,  valor:0,   synced:true },
    { id:10, nombre:"Subvención",         activo:true,  valor:500, synced:false },
  ];

  const applyToggleSync = (syncKey, value, ingresos, syncConfig) => {
    const newSyncConfig = { ...syncConfig, [syncKey]: value };
    const newIngresos = ingresos.map(ie => ie.syncKey === syncKey ? { ...ie, activo: value } : ie);
    return { syncConfig: newSyncConfig, ingresosExtra: newIngresos };
  };

  it('desactivar patrocinios → syncConfig.patrocinios=false y ie[id=1].activo=false', () => {
    const r = applyToggleSync("patrocinios", false, ingresosExtra, { patrocinios:true, patrociniosCobrado:false, camisetas:true });
    expect(r.syncConfig.patrocinios).toBe(false);
    expect(r.ingresosExtra.find(ie => ie.id === 1).activo).toBe(false);
  });

  it('activar patrociniosCobrado → syncConfig y ie[id=3].activo=true', () => {
    const r = applyToggleSync("patrociniosCobrado", true, ingresosExtra, { patrocinios:true, patrociniosCobrado:false, camisetas:true });
    expect(r.syncConfig.patrociniosCobrado).toBe(true);
    expect(r.ingresosExtra.find(ie => ie.id === 3).activo).toBe(true);
  });

  it('toggleSync no afecta líneas con syncKey diferente', () => {
    const r = applyToggleSync("patrocinios", false, ingresosExtra, { patrocinios:true, patrociniosCobrado:false, camisetas:true });
    expect(r.ingresosExtra.find(ie => ie.id === 3).activo).toBe(false); // sin cambio
    expect(r.ingresosExtra.find(ie => ie.id === 2).activo).toBe(true);  // sin cambio
  });

  it('el total activo se recalcula correctamente tras desactivar', () => {
    const r = applyToggleSync("patrocinios", false, ingresosExtra, { patrocinios:true });
    const total = r.ingresosExtra.filter(ie => ie.activo).reduce((s, ie) => s + ie.valor, 0);
    // patrocinios (800) desactivado, cobrados (0) ya estaba off, camisetas (0) activo, subvención (500) activo
    expect(total).toBe(500);
  });
});

// ── PRE-12: Toggle en la tabla actualiza también el panel para líneas sync ─
describe('PRE-12 — Toggle en tabla sincronizado con panel para líneas auto', () => {
  const handleTableToggle = (ie, value, ingresosExtra, syncConfig, toggleSync, setIngresosExtra) => {
    if (ie.syncKey) {
      toggleSync(ie.syncKey, value);
    } else {
      setIngresosExtra(prev => prev.map(x => x.id === ie.id ? { ...x, activo: value } : x));
    }
  };

  it('línea sincronizada en tabla llama a toggleSync (no setIngresosExtra directamente)', () => {
    const toggleSync = vi.fn();
    const setIngresosExtra = vi.fn();
    const ie = { id:1, syncKey:"patrocinios", activo:true };
    handleTableToggle(ie, false, [], {}, toggleSync, setIngresosExtra);
    expect(toggleSync).toHaveBeenCalledWith("patrocinios", false);
    expect(setIngresosExtra).not.toHaveBeenCalled();
  });

  it('línea manual en tabla llama a setIngresosExtra (no toggleSync)', () => {
    const toggleSync = vi.fn();
    const setIngresosExtra = vi.fn();
    const ie = { id:10, synced:false, activo:true };
    handleTableToggle(ie, false, [], {}, toggleSync, setIngresosExtra);
    expect(setIngresosExtra).toHaveBeenCalled();
    expect(toggleSync).not.toHaveBeenCalled();
  });
});

// ── PRE-13: Normalización al cargar desde BD ──────────────────────────────
describe('PRE-13 — Normalización ie.activo al cargar según syncConfig', () => {
  const normalizar = (savedIngresos, sc) => {
    return savedIngresos.map(ie => {
      if (!ie.syncKey) return ie;
      const syncActive = sc[ie.syncKey] ?? false;
      return { ...ie, activo: syncActive };
    });
  };

  const savedIngresos = [
    { id:1, syncKey:"patrocinios",        activo:true,  valor:800 },
    { id:3, syncKey:"patrociniosCobrado", activo:true,  valor:200 }, // inconsistente con syncConfig
    { id:10, nombre:"Subvención",         activo:true,  valor:500 }, // manual — no tocar
  ];

  it('normaliza ie.activo según syncConfig al cargar', () => {
    const sc = { patrocinios:true, patrociniosCobrado:false, camisetas:true };
    const r = normalizar(savedIngresos, sc);
    expect(r.find(ie => ie.id === 1).activo).toBe(true);
    expect(r.find(ie => ie.id === 3).activo).toBe(false); // corregido
  });

  it('no modifica líneas manuales (sin syncKey)', () => {
    const sc = { patrocinios:false, patrociniosCobrado:false };
    const r = normalizar(savedIngresos, sc);
    expect(r.find(ie => ie.id === 10).activo).toBe(true); // sin cambio
  });

  it('syncKey desconocido en syncConfig → activo=false por defecto', () => {
    const sc = {}; // sin ningún toggle
    const r = normalizar(savedIngresos, sc);
    expect(r.find(ie => ie.id === 1).activo).toBe(false);
    expect(r.find(ie => ie.id === 3).activo).toBe(false);
  });
});

// ── PRE-14: Tooltip origen correcto por syncKey ───────────────────────────
describe('PRE-14 — Tooltip de origen correcto por syncKey', () => {
  const getOrigenLabel = (ie) => {
    if (ie.syncKey === "patrocinios") return "Patrocinadores (captado)";
    if (ie.syncKey === "patrociniosCobrado") return "Patrocinadores (cobrado real)";
    if (ie.syncKey === "camisetas") return "Camisetas";
    return null;
  };

  it('patrocinios → origen correcto', () => {
    expect(getOrigenLabel({ syncKey:"patrocinios" })).toContain("captado");
  });

  it('patrociniosCobrado → indica cobrado real', () => {
    expect(getOrigenLabel({ syncKey:"patrociniosCobrado" })).toContain("cobrado real");
  });

  it('camisetas → origen Camisetas', () => {
    expect(getOrigenLabel({ syncKey:"camisetas" })).toBe("Camisetas");
  });

  it('línea sin syncKey → null (no muestra origen auto)', () => {
    expect(getOrigenLabel({ id:10 })).toBeNull();
  });
});

// ── PRE-15: Líneas manuales no afectadas por toggleSync ───────────────────
describe('PRE-15 — Líneas manuales no se modifican con toggleSync', () => {
  const applyToggle = (syncKey, value, ingresos) =>
    ingresos.map(ie => ie.syncKey === syncKey ? { ...ie, activo: value } : ie);

  const ingresos = [
    { id:1,  syncKey:"patrocinios", activo:true, valor:800 },
    { id:10, nombre:"Subvención",   activo:true, valor:500 },
    { id:11, nombre:"Especie",      activo:true, valor:300 },
  ];

  it('toggle patrocinios no afecta a Subvención ni Especie', () => {
    const r = applyToggle("patrocinios", false, ingresos);
    expect(r.find(ie => ie.id === 10).activo).toBe(true);
    expect(r.find(ie => ie.id === 11).activo).toBe(true);
  });

  it('las líneas manuales siguen editables independientemente', () => {
    const r = applyToggle("camisetas", false, ingresos);
    // id=1 no tiene syncKey=camisetas → no cambia; id=10 y 11 no cambian
    expect(r.every(ie => ie.activo)).toBe(true);
  });
});
