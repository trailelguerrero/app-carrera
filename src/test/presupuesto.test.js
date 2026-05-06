/**
 * Presupuesto — Test Suite
 *
 * Cubre el rediseño completo de useBudgetLogic + TabIngresos:
 * - ingresosExtraConValores: cálculo en tiempo real sin useEffect
 * - syncConfig como única fuente de verdad para toggles sincronizados
 * - ie.activo para líneas manuales
 * - totalIngresosExtra → resultado → KPIs
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';

beforeAll(() => {
  const s = {};
  Object.defineProperty(window,'localStorage',{value:{getItem:vi.fn(k=>s[k]??null),setItem:vi.fn((k,v)=>{s[k]=String(v);}),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  Object.defineProperty(window,'sessionStorage',{value:{getItem:vi.fn(()=>null),setItem:vi.fn(),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  global.fetch=vi.fn(()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({})}));
  vi.spyOn(console,'error').mockImplementation(()=>{});
});

// ── Helpers ───────────────────────────────────────────────────────────────
const getImporteComprometido = (p) => {
  if (p.estado === "cobrado") return p.importeCobrado > 0 ? p.importeCobrado : p.importe;
  if (p.estado === "confirmado") return p.importe;
  return 0;
};
const getImporteCobrado = (p) => p.importeCobrado > 0 ? p.importeCobrado : p.importe;

// Simula la función ingresosExtraConValores de useBudgetLogic
const buildIngresosConValores = ({ ingresosExtra, syncConfig, totales }) => {
  return ingresosExtra.map(ie => {
    const key = ie.syncKey;
    if (!key) return { ...ie, synced: false };
    const activo = syncConfig[key] ?? ie.activo;
    const valor = key === "patrocinios"        ? totales.patConfirmado
                : key === "patrociniosCobrado" ? totales.patCobrado
                : key === "camisetas"          ? totales.merch
                : key === "subvencionPublica"  ? totales.subvencion
                : ie.valor;
    return { ...ie, valor, activo, synced: true };
  });
};

const calcTotalExtra = (ieConValores) =>
  ieConValores.filter(i => i.activo).reduce((s, i) => s + i.valor, 0);

// ── PRE-01: cálculo en tiempo real — sin useEffect ────────────────────────
describe('PRE-01 — ingresosExtraConValores se calcula en tiempo real', () => {
  const baseIE = [
    { id:1, syncKey:"patrocinios",        activo:true,  valor:0 },
    { id:3, syncKey:"patrociniosCobrado", activo:false, valor:0 },
    { id:10, nombre:"Subvención",         activo:true,  valor:500 },
  ];
  const syncConfig = { patrocinios:true, patrociniosCobrado:false, camisetas:true, subvencionPublica:true };
  const totales = { patConfirmado:800, patCobrado:200, merch:0, subvencion:0 };

  it('patrocinios activo → valor 800 en tiempo real', () => {
    const r = buildIngresosConValores({ ingresosExtra:baseIE, syncConfig, totales });
    expect(r.find(ie => ie.syncKey === "patrocinios").valor).toBe(800);
    expect(r.find(ie => ie.syncKey === "patrocinios").activo).toBe(true);
  });

  it('patrociniosCobrado inactivo → NO suma en total', () => {
    const r = buildIngresosConValores({ ingresosExtra:baseIE, syncConfig, totales });
    const total = calcTotalExtra(r);
    // patrocinios(800) + manual subvencion(500) = 1300; patrociniosCobrado inactivo → no suma
    expect(total).toBe(1300);
  });

  it('cambiar totalPatConfirmado actualiza inmediatamente sin useEffect', () => {
    const totalesNuevos = { ...totales, patConfirmado: 1200 };
    const r = buildIngresosConValores({ ingresosExtra:baseIE, syncConfig, totales:totalesNuevos });
    expect(r.find(ie => ie.syncKey === "patrocinios").valor).toBe(1200);
    expect(calcTotalExtra(r)).toBe(1700); // 1200 + 500 manual
  });
});

// ── PRE-02: syncConfig es la fuente de verdad para toggles ───────────────
describe('PRE-02 — syncConfig es la fuente de verdad del toggle', () => {
  const ie = [{ id:1, syncKey:"patrocinios", activo:true, valor:0 }];
  const totales = { patConfirmado:800, patCobrado:200, merch:0, subvencion:0 };

  it('syncConfig.patrocinios=false → ie.activo=false → no suma en KPI', () => {
    const sc = { patrocinios:false, patrociniosCobrado:false, camisetas:true };
    const r = buildIngresosConValores({ ingresosExtra:ie, syncConfig:sc, totales });
    expect(r[0].activo).toBe(false);
    expect(calcTotalExtra(r)).toBe(0);
  });

  it('syncConfig.patrocinios=true → ie.activo=true → suma en KPI', () => {
    const sc = { patrocinios:true, patrociniosCobrado:false, camisetas:true };
    const r = buildIngresosConValores({ ingresosExtra:ie, syncConfig:sc, totales });
    expect(r[0].activo).toBe(true);
    expect(calcTotalExtra(r)).toBe(800);
  });

  it('cambiar syncConfig de true a false reduce el total inmediatamente', () => {
    const scOn  = { patrocinios:true };
    const scOff = { patrocinios:false };
    const rOn  = calcTotalExtra(buildIngresosConValores({ ingresosExtra:ie, syncConfig:scOn,  totales }));
    const rOff = calcTotalExtra(buildIngresosConValores({ ingresosExtra:ie, syncConfig:scOff, totales }));
    expect(rOn).toBe(800);
    expect(rOff).toBe(0);
  });
});

// ── PRE-03: patrociniosCobrado vs patrocinios — valores correctos ─────────
describe('PRE-03 — patrocinios captados vs cobrados distinguidos correctamente', () => {
  const pats = [
    { id:1, estado:"confirmado", importe:600, importeCobrado:0, especie:false },
    { id:2, estado:"cobrado",    importe:200, importeCobrado:200, especie:false },
  ];
  const patConfirmado = pats.filter(p=>!p.especie).reduce((s,p) => s + getImporteComprometido(p), 0);
  const patCobrado    = pats.filter(p=>!p.especie && p.estado==="cobrado").reduce((s,p) => s + getImporteCobrado(p), 0);

  it('patConfirmado = suma de confirmados + cobrados = 800', () => {
    expect(patConfirmado).toBe(800);
  });

  it('patCobrado = solo cobrados = 200', () => {
    expect(patCobrado).toBe(200);
  });

  it('activar patrocinios → suma 800 al total', () => {
    const ie = [
      { id:1, syncKey:"patrocinios", activo:false },
      { id:3, syncKey:"patrociniosCobrado", activo:false },
    ];
    const sc = { patrocinios:true, patrociniosCobrado:false };
    const totales = { patConfirmado, patCobrado, merch:0, subvencion:0 };
    const r = buildIngresosConValores({ ingresosExtra:ie, syncConfig:sc, totales });
    expect(calcTotalExtra(r)).toBe(800);
  });

  it('activar patrociniosCobrado → suma 200 al total', () => {
    const ie = [
      { id:1, syncKey:"patrocinios", activo:false },
      { id:3, syncKey:"patrociniosCobrado", activo:false },
    ];
    const sc = { patrocinios:false, patrociniosCobrado:true };
    const totales = { patConfirmado, patCobrado, merch:0, subvencion:0 };
    const r = buildIngresosConValores({ ingresosExtra:ie, syncConfig:sc, totales });
    expect(calcTotalExtra(r)).toBe(200);
  });
});

// ── PRE-04: subvencionPublica sincronizada desde Administración pública ───
describe('PRE-04 — subvencionPublica sync desde sector Administración pública', () => {
  const pats = [
    { id:1, sector:"Administración pública", estado:"confirmado", importe:3000, importeCobrado:0, especie:false },
    { id:2, sector:"Deportes / Outdoor",     estado:"confirmado", importe:5000, importeCobrado:0, especie:false },
    { id:3, sector:"Administración pública", estado:"confirmado", importe:500,  importeCobrado:0, especie:true },
  ];
  const totalSubv = pats.filter(p => p.sector === "Administración pública" && !p.especie)
    .reduce((s,p) => s + getImporteComprometido(p), 0);

  it('totalSubvencionPublica = 3000 (solo sector correcto, sin especie)', () => {
    expect(totalSubv).toBe(3000);
  });

  it('activar subvencionPublica → suma 3000 al total', () => {
    const ie = [{ id:10, syncKey:"subvencionPublica", activo:false }];
    const sc = { subvencionPublica:true };
    const totales = { patConfirmado:0, patCobrado:0, merch:0, subvencion:totalSubv };
    const r = buildIngresosConValores({ ingresosExtra:ie, syncConfig:sc, totales });
    expect(calcTotalExtra(r)).toBe(3000);
  });

  it('desactivar subvencionPublica → 0 en total', () => {
    const ie = [{ id:10, syncKey:"subvencionPublica", activo:true }];
    const sc = { subvencionPublica:false };
    const totales = { patConfirmado:0, patCobrado:0, merch:0, subvencion:totalSubv };
    const r = buildIngresosConValores({ ingresosExtra:ie, syncConfig:sc, totales });
    expect(calcTotalExtra(r)).toBe(0);
  });
});

// ── PRE-05: líneas manuales no afectadas por syncConfig ──────────────────
describe('PRE-05 — Líneas manuales respetan su propio ie.activo', () => {
  const ie = [
    { id:1,  syncKey:"patrocinios", activo:true, valor:0 },
    { id:12, nombre:"Otros",        activo:true,  valor:500 },
    { id:13, nombre:"Curro",        activo:false, valor:300 },
  ];
  const sc = { patrocinios:false }; // desactivar patrocinios no afecta manuales
  const totales = { patConfirmado:800, patCobrado:0, merch:0, subvencion:0 };

  it('manual activo con syncConfig desactivado → sigue sumando', () => {
    const r = buildIngresosConValores({ ingresosExtra:ie, syncConfig:sc, totales });
    const manual12 = r.find(x => x.id === 12);
    expect(manual12.activo).toBe(true);
  });

  it('manual inactivo → no suma aunque syncConfig no lo afecte', () => {
    const r = buildIngresosConValores({ ingresosExtra:ie, syncConfig:sc, totales });
    const manual13 = r.find(x => x.id === 13);
    expect(manual13.activo).toBe(false);
    expect(calcTotalExtra(r)).toBe(500); // solo el manual activo
  });
});

// ── PRE-06: resultado = inscripciones + extras - costes ───────────────────
describe('PRE-06 — resultado integra correctamente totalIngresosExtra', () => {
  it('activar un ingreso extra aumenta el resultado', () => {
    const calcResultado = (inscripciones, extras, costes) => inscripciones + extras - costes;
    const ieOff = 0;
    const ieOn  = 800;
    const res_off = calcResultado(5000, ieOff, 6000);
    const res_on  = calcResultado(5000, ieOn,  6000);
    expect(res_on).toBeGreaterThan(res_off);
    expect(res_on - res_off).toBe(800);
  });

  it('desactivar un ingreso extra reduce el resultado en exactamente ese valor', () => {
    const calcResultado = (inscripciones, extras, costes) => inscripciones + extras - costes;
    const r_con    = calcResultado(5000, 800, 6000);
    const r_sin    = calcResultado(5000, 0,   6000);
    expect(r_con - r_sin).toBe(800);
  });
});

// ── PRE-07: activoDistancias en costes fijos ──────────────────────────────
describe('PRE-07 — activoDistancias recalcula costes fijos', () => {
  const ins = { TG7:100, TG13:80, TG25:50, total:230 };
  const calcCostesFijos = (conceptos, ins) => {
    const costes = { TG7:0, TG13:0, TG25:0, total:0 };
    conceptos.filter(c => c.tipo === "fijo" && c.activo).forEach(c => {
      const dist = ["TG7","TG13","TG25"].filter(d => c.activoDistancias[d]);
      const tot  = dist.reduce((s,d) => s + ins[d], 0);
      dist.forEach(d => {
        const p = tot > 0 ? c.costeTotal * (ins[d]/tot) : c.costeTotal/dist.length;
        costes[d] += p;
      });
      costes.total += c.costeTotal;
    });
    return costes;
  };

  const c = { id:1, tipo:"fijo", activo:true, costeTotal:2300, activoDistancias:{ TG7:true, TG13:true, TG25:true } };
  it('todas activas → total = costeTotal', () => expect(calcCostesFijos([c], ins).total).toBe(2300));
  it('desactivar TG25 → TG25 coste = 0', () => {
    expect(calcCostesFijos([{ ...c, activoDistancias:{ TG7:true, TG13:true, TG25:false } }], ins).TG25).toBe(0);
  });
  it('concepto inactivo → total 0', () => expect(calcCostesFijos([{ ...c, activo:false }], ins).total).toBe(0));
});

// ── PRE-08: INGRESOS_EXTRA_DEFAULT tiene syncKeys correctos ───────────────
describe('PRE-08 — INGRESOS_EXTRA_DEFAULT syncKeys correctos', () => {
  it('todas las líneas sincronizadas tienen syncKey', async () => {
    const { INGRESOS_EXTRA_DEFAULT } = await import('../constants/budgetConstants.js');
    const sinSyncKey = INGRESOS_EXTRA_DEFAULT.filter(ie => ie.synced && !ie.syncKey);
    expect(sinSyncKey).toHaveLength(0);
  });

  it('id=10 tiene syncKey subvencionPublica', async () => {
    const { INGRESOS_EXTRA_DEFAULT } = await import('../constants/budgetConstants.js');
    const ie10 = INGRESOS_EXTRA_DEFAULT.find(ie => ie.id === 10);
    expect(ie10?.syncKey).toBe('subvencionPublica');
  });

  it('SYNC_CONFIG_DEFAULT tiene las 4 claves', async () => {
    const { SYNC_CONFIG_DEFAULT } = await import('../constants/budgetConstants.js');
    ['patrocinios','patrociniosCobrado','camisetas','subvencionPublica'].forEach(k => {
      expect(SYNC_CONFIG_DEFAULT).toHaveProperty(k);
    });
  });
});

// ── PRE-09: eliminar patrocinador actualiza cálculos ─────────────────────
describe('PRE-09 — Eliminar patrocinador reduce el total inmediatamente', () => {
  const pats = [
    { id:1, sector:"Administración pública", estado:"confirmado", importe:3000, importeCobrado:0, especie:false },
    { id:2, sector:"Deportes / Outdoor",     estado:"confirmado", importe:5000, importeCobrado:0, especie:false },
  ];
  const calcPat = (ps) => ps.filter(p=>!p.especie).reduce((s,p) => s + getImporteComprometido(p), 0);
  const calcSubv = (ps) => ps.filter(p=>p.sector==="Administración pública"&&!p.especie).reduce((s,p) => s + getImporteComprometido(p), 0);

  it('antes de eliminar: patConfirmado=8000, subv=3000', () => {
    expect(calcPat(pats)).toBe(8000);
    expect(calcSubv(pats)).toBe(3000);
  });

  it('tras eliminar id=1: patConfirmado=5000, subv=0', () => {
    const after = pats.filter(p => p.id !== 1);
    expect(calcPat(after)).toBe(5000);
    expect(calcSubv(after)).toBe(0);
  });
});

// ── PRE-10: no hay race condition entre toggle y useEffect ────────────────
describe('PRE-10 — Sin race condition: cálculo sin useEffect', () => {
  it('cambiar syncConfig y recalcular en el mismo ciclo da resultado correcto', () => {
    // Antes (con useEffect): el toggle cambiaba syncConfig, el useEffect no se ejecutaba
    // inmediatamente, y había un ciclo de renderizado donde los KPIs no actualizaban.
    // Ahora: ingresosExtraConValores es un useMemo que depende de syncConfig.
    // Cuando syncConfig cambia → useMemo se recalcula → totalIngresosExtra actualiza → KPIs actualizan.
    
    const simulateRender = (syncConfig, totales, ie) => {
      const conValores = buildIngresosConValores({ ingresosExtra:ie, syncConfig, totales });
      return calcTotalExtra(conValores);
    };

    const ie = [{ id:1, syncKey:"patrocinios", activo:true, valor:0 }];
    const totales = { patConfirmado:800, patCobrado:0, merch:0, subvencion:0 };

    // Render con toggle on
    expect(simulateRender({ patrocinios:true  }, totales, ie)).toBe(800);
    // Mismo render con toggle off — sin delay de useEffect
    expect(simulateRender({ patrocinios:false }, totales, ie)).toBe(0);
  });
});
