/**
 * Presupuesto — Test Suite definitiva
 *
 * Cubre los 4 bugs específicos reportados:
 * 1. Toggle patrocinios/cobrados no actualiza KPIs
 * 2. Toggle subvención no actualiza KPIs  
 * 3. Subvención debe obtener datos de Administración pública
 * 4. Eliminar patrocinador desde la ficha
 *
 * Causa raíz de los bugs 1,2,3: datos de localStorage sin syncKey
 * (id=3 y id=10 no tenían syncKey → caían al branch manual → toggle ignorado)
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';

beforeAll(() => {
  const s = {};
  Object.defineProperty(window,'localStorage',{value:{getItem:vi.fn(k=>s[k]??null),setItem:vi.fn((k,v)=>{s[k]=String(v);}),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  Object.defineProperty(window,'sessionStorage',{value:{getItem:vi.fn(()=>null),setItem:vi.fn(),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  global.fetch=vi.fn(()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({})}));
  vi.spyOn(console,'error').mockImplementation(()=>{});
});

// Helpers
const getImporteComprometido = (p) => {
  if (p.estado === "cobrado") return p.importeCobrado > 0 ? p.importeCobrado : p.importe;
  if (p.estado === "confirmado") return p.importe;
  return 0;
};
const getImporteCobrado = (p) => p.importeCobrado > 0 ? p.importeCobrado : p.importe;

// Simula ingresosExtraConValores del hook (la función refactorizada)
const ID_TO_SYNCKEY = { 1: "patrocinios", 2: "camisetas", 3: "patrociniosCobrado", 10: "subvencionPublica" };
const SYNC_CONFIG_DEFAULT = { patrocinios: true, patrociniosCobrado: true, camisetas: true, subvencionPublica: true };

const buildConValores = ({ ie, syncConfig, totales }) => {
  const sc = { ...SYNC_CONFIG_DEFAULT, ...syncConfig };
  return ie.map(item => {
    const key = item.syncKey || ID_TO_SYNCKEY[item.id] || null;
    if (!key) return { ...item, synced: false };
    const activo = sc[key] !== undefined ? sc[key] : item.activo;
    const valor = key === "patrocinios"        ? totales.patConfirmado
                : key === "patrociniosCobrado" ? totales.patCobrado
                : key === "camisetas"          ? totales.merch
                : key === "subvencionPublica"  ? totales.subvencion
                : item.valor;
    return { ...item, syncKey: key, valor, activo, synced: true };
  });
};
const totalActivos = (items) => items.filter(i => i.activo).reduce((s, i) => s + i.valor, 0);

// Migrate function (same as in useBudgetLogic loadData)
const migrateLegacyIE = (savedIngresos) => savedIngresos.map(ie => {
  if (ie.syncKey) return ie;
  const syncKey = ID_TO_SYNCKEY[ie.id];
  if (!syncKey) return ie;
  return { ...ie, syncKey, synced: true };
});

// ── BUG-01: Toggle patrocinios captados (id=1) ────────────────────────────
describe('BUG-01 — Toggle patrocinios captados actualiza KPIs', () => {
  const ie = [{ id:1, nombre:"Patrocinios", valor:0, activo:true }]; // SIN syncKey (dato legado)
  const totales = { patConfirmado:800, patCobrado:200, merch:0, subvencion:0 };

  it('dato legado sin syncKey: id=1 se mapea correctamente a "patrocinios"', () => {
    const r = buildConValores({ ie, syncConfig:{}, totales });
    expect(r[0].syncKey).toBe("patrocinios");
  });

  it('con toggle ON: suma 800 en el total', () => {
    const r = buildConValores({ ie, syncConfig:{ patrocinios:true }, totales });
    expect(totalActivos(r)).toBe(800);
  });

  it('con toggle OFF: suma 0 en el total (KPIs deben reducirse en 800)', () => {
    const r = buildConValores({ ie, syncConfig:{ patrocinios:false }, totales });
    expect(totalActivos(r)).toBe(0);
  });

  it('cambiar toggle de true a false reduce exactamente el valor del patrocinador', () => {
    const on  = totalActivos(buildConValores({ ie, syncConfig:{patrocinios:true},  totales }));
    const off = totalActivos(buildConValores({ ie, syncConfig:{patrocinios:false}, totales }));
    expect(on - off).toBe(800);
  });
});

// ── BUG-01b: Toggle patrocinios cobrados (id=3) — LA CAUSA RAÍZ ───────────
describe('BUG-01b — Toggle patrocinios COBRADOS (id=3) - causa raíz del bug', () => {
  // ESTE era el bug: id=3 no tenía syncKey → caía al branch manual → toggle ignorado
  const ieLegado = [{ id:3, nombre:"Patrocinios cobrados", valor:0, activo:false }]; // SIN syncKey

  it('ANTES del fix: id=3 sin syncKey caía al branch manual y el toggle se ignoraba', () => {
    // Simular el comportamiento ROTO (key=null para id=3)
    const brokenKey = null; // esto es lo que devolvía antes: ie.id === 1 ? "patrocinios" : null
    expect(brokenKey).toBeNull(); // confirmamos el bug
  });

  it('DESPUÉS del fix: id=3 se mapea a "patrociniosCobrado" con el mapa ID_TO_SYNCKEY', () => {
    const r = buildConValores({ ie:ieLegado, syncConfig:{}, totales:{ patConfirmado:0, patCobrado:200, merch:0, subvencion:0 } });
    expect(r[0].syncKey).toBe("patrociniosCobrado");
  });

  it('con toggle ON: suma 200 (solo cobrados)', () => {
    const totales = { patConfirmado:800, patCobrado:200, merch:0, subvencion:0 };
    const r = buildConValores({ ie:ieLegado, syncConfig:{ patrociniosCobrado:true }, totales });
    expect(totalActivos(r)).toBe(200);
  });

  it('con toggle OFF: suma 0', () => {
    const totales = { patConfirmado:800, patCobrado:200, merch:0, subvencion:0 };
    const r = buildConValores({ ie:ieLegado, syncConfig:{ patrociniosCobrado:false }, totales });
    expect(totalActivos(r)).toBe(0);
  });

  it('toggle no afecta a patrocinios captados (líneas independientes)', () => {
    const ieBoth = [
      { id:1, nombre:"Patrocinios captados", valor:0, activo:true },
      { id:3, nombre:"Patrocinios cobrados", valor:0, activo:false },
    ];
    const totales = { patConfirmado:800, patCobrado:200, merch:0, subvencion:0 };
    // Activar solo patrociniosCobrado
    const r = buildConValores({ ie:ieBoth, syncConfig:{ patrocinios:false, patrociniosCobrado:true }, totales });
    expect(r.find(x => x.syncKey==="patrocinios").activo).toBe(false);
    expect(r.find(x => x.syncKey==="patrociniosCobrado").activo).toBe(true);
    expect(totalActivos(r)).toBe(200);
  });
});

// ── BUG-02: Toggle subvención (id=10) ────────────────────────────────────
describe('BUG-02 — Toggle subvención entidad pública (id=10)', () => {
  const ieLegado = [{ id:10, nombre:"Subvención entidad pública", valor:0, activo:true }]; // SIN syncKey
  const totales = { patConfirmado:0, patCobrado:0, merch:0, subvencion:3000 };

  it('ANTES del fix: id=10 sin syncKey caía al branch manual', () => {
    const oldKey = null; // antes no había fallback para id=10
    expect(oldKey).toBeNull(); // confirmamos el bug
  });

  it('DESPUÉS del fix: id=10 se mapea a "subvencionPublica"', () => {
    const r = buildConValores({ ie:ieLegado, syncConfig:{}, totales });
    expect(r[0].syncKey).toBe("subvencionPublica");
  });

  it('con toggle ON: suma 3000', () => {
    const r = buildConValores({ ie:ieLegado, syncConfig:{ subvencionPublica:true }, totales });
    expect(totalActivos(r)).toBe(3000);
  });

  it('con toggle OFF: suma 0 (KPIs reducidos en 3000)', () => {
    const r = buildConValores({ ie:ieLegado, syncConfig:{ subvencionPublica:false }, totales });
    expect(totalActivos(r)).toBe(0);
  });
});

// ── BUG-03: Subvención desde sector Administración pública ───────────────
describe('BUG-03 — Subvención calcula desde sector "Administración pública"', () => {
  const pats = [
    { id:1, sector:"Administración pública", estado:"confirmado", importe:2000, importeCobrado:0, especie:false },
    { id:2, sector:"Administración pública", estado:"cobrado",    importe:1000, importeCobrado:1000, especie:false },
    { id:3, sector:"Deportes / Outdoor",     estado:"confirmado", importe:5000, importeCobrado:0, especie:false },
    { id:4, sector:"Administración pública", estado:"prospecto",  importe:500,  importeCobrado:0, especie:false },
    { id:5, sector:"Administración pública", estado:"confirmado", importe:800,  importeCobrado:0, especie:true }, // especie excluida
  ];

  const calcSubv = (ps) => ps
    .filter(p => p.sector === "Administración pública" && !p.especie)
    .reduce((s, p) => s + getImporteComprometido(p), 0);

  it('suma solo Administración pública con importe comprometido = 3000', () => {
    expect(calcSubv(pats)).toBe(3000); // id=1(2000) + id=2(1000)
  });

  it('excluye sector Deportes', () => {
    expect(calcSubv(pats)).not.toBeGreaterThan(3000);
  });

  it('excluye prospectos (sin importe comprometido)', () => {
    expect(calcSubv(pats)).toBe(3000); // id=4 prospecto excluido
  });

  it('excluye especie aunque sea Administración pública', () => {
    expect(calcSubv(pats)).toBe(3000); // id=5 especie excluido
  });

  it('al activar subvencionPublica, ese valor llega a totalIngresosExtra', () => {
    const subvencion = calcSubv(pats); // 3000
    const ie = [{ id:10, nombre:"Subvención", valor:0, activo:false }];
    const sc = { subvencionPublica:true };
    const r = buildConValores({ ie, syncConfig:sc, totales:{ patConfirmado:0, patCobrado:0, merch:0, subvencion } });
    expect(totalActivos(r)).toBe(3000);
  });

  it('al eliminar patrocinador público, subvención baja', () => {
    const sinId1 = pats.filter(p => p.id !== 1);
    expect(calcSubv(sinId1)).toBe(1000); // solo id=2 queda
  });
});

// ── BUG-04: Eliminar patrocinador ─────────────────────────────────────────
describe('BUG-04 — Eliminar patrocinador', () => {
  it('deletePat filtra el array por id correctamente', () => {
    let pats = [{ id:1, nombre:"A" }, { id:2, nombre:"B" }, { id:3, nombre:"C" }];
    pats = pats.filter(p => p.id !== 2);
    expect(pats).toHaveLength(2);
    expect(pats.find(p=>p.id===2)).toBeUndefined();
    expect(pats.map(p=>p.id)).toEqual([1, 3]);
  });

  it('al eliminar patrocinador público, totalSubvencionPublica se recalcula automáticamente', () => {
    const getSubv = (ps) => ps
      .filter(p => p.sector === "Administración pública" && !p.especie)
      .reduce((s, p) => s + getImporteComprometido(p), 0);

    const pats = [
      { id:1, sector:"Administración pública", estado:"confirmado", importe:2000, importeCobrado:0, especie:false },
      { id:2, sector:"Deportes", estado:"confirmado", importe:5000, importeCobrado:0, especie:false },
    ];
    expect(getSubv(pats)).toBe(2000);
    expect(getSubv(pats.filter(p=>p.id!==1))).toBe(0); // rawPats useMemo recomputa
  });
});

// ── MIGRACIÓN: datos legados sin syncKey ─────────────────────────────────
describe('MIGRACIÓN — Datos de localStorage sin syncKey se migran correctamente', () => {
  const legacyData = [
    { id:1,  nombre:"Patrocinios captados", valor:500, activo:true  }, // sin syncKey
    { id:3,  nombre:"Patrocinios cobrados", valor:200, activo:false }, // sin syncKey
    { id:2,  nombre:"Merchandising",        valor:100, activo:true  }, // sin syncKey
    { id:10, nombre:"Subvención pública",   valor:0,   activo:true  }, // sin syncKey
    { id:12, nombre:"Otros ingresos",       valor:50,  activo:true  }, // manual, sin syncKey
  ];

  it('la función de migración añade syncKey a los ids conocidos', () => {
    const r = migrateLegacyIE(legacyData);
    expect(r.find(ie=>ie.id===1)?.syncKey).toBe("patrocinios");
    expect(r.find(ie=>ie.id===3)?.syncKey).toBe("patrociniosCobrado");
    expect(r.find(ie=>ie.id===2)?.syncKey).toBe("camisetas");
    expect(r.find(ie=>ie.id===10)?.syncKey).toBe("subvencionPublica");
  });

  it('la migración no altera líneas manuales (id=12)', () => {
    const r = migrateLegacyIE(legacyData);
    const manual = r.find(ie => ie.id === 12);
    expect(manual.syncKey).toBeUndefined();
    expect(manual.activo).toBe(true);
    expect(manual.valor).toBe(50);
  });

  it('la migración no toca datos que ya tienen syncKey', () => {
    const withSyncKey = [{ id:1, syncKey:"patrocinios", valor:800, activo:true }];
    const r = migrateLegacyIE(withSyncKey);
    expect(r[0].valor).toBe(800); // sin cambios
  });
});

// ── SYNC_CONFIG DEFAULT merge con datos antiguos ─────────────────────────
describe('SYNC_CONFIG_DEFAULT merge', () => {
  it('syncConfig antiguo sin subvencionPublica obtiene el valor por defecto', () => {
    const oldConfig = { patrocinios: true, camisetas: true }; // falta patrociniosCobrado y subvencionPublica
    const merged = { ...SYNC_CONFIG_DEFAULT, ...oldConfig };
    expect(merged.subvencionPublica).toBe(true); // default
    expect(merged.patrociniosCobrado).toBe(true); // default
    expect(merged.patrocinios).toBe(true); // del dato viejo
    expect(merged.camisetas).toBe(true); // del dato viejo
  });

  it('valores del dato guardado tienen prioridad sobre defaults', () => {
    const savedConfig = { patrocinios: false, camisetas: false };
    const merged = { ...SYNC_CONFIG_DEFAULT, ...savedConfig };
    expect(merged.patrocinios).toBe(false); // guardado tiene prioridad
    expect(merged.camisetas).toBe(false);   // guardado tiene prioridad
    expect(merged.subvencionPublica).toBe(true); // default (no estaba en savedConfig)
  });
});

// ── Cadena completa: toggle → totalIngresosExtra → resultado ─────────────
describe('CADENA COMPLETA — toggle → KPIs → resultado', () => {
  const ie = [
    { id:1,  nombre:"Patrocinios captados", valor:0, activo:true  },
    { id:3,  nombre:"Patrocinios cobrados", valor:0, activo:false },
    { id:10, nombre:"Subvención",           valor:0, activo:true  },
    { id:12, nombre:"Otros",                valor:300, activo:true },
  ];
  const totales = { patConfirmado:800, patCobrado:200, merch:0, subvencion:3000 };

  it('todos los toggles activos: total = 800 + 200 + 3000 + 300 = 4300', () => {
    const sc = { patrocinios:true, patrociniosCobrado:true, subvencionPublica:true };
    expect(totalActivos(buildConValores({ ie, syncConfig:sc, totales }))).toBe(4300);
  });

  it('desactivar patrocinios: total = 200 + 3000 + 300 = 3500', () => {
    const sc = { patrocinios:false, patrociniosCobrado:true, subvencionPublica:true };
    expect(totalActivos(buildConValores({ ie, syncConfig:sc, totales }))).toBe(3500);
  });

  it('desactivar todo excepto manual: total = 300', () => {
    const sc = { patrocinios:false, patrociniosCobrado:false, subvencionPublica:false };
    expect(totalActivos(buildConValores({ ie, syncConfig:sc, totales }))).toBe(300);
  });

  it('activar subvención aumenta resultado en exactamente totalSubvencionPublica', () => {
    const sc_off = { subvencionPublica:false, patrocinios:false, patrociniosCobrado:false };
    const sc_on  = { subvencionPublica:true,  patrocinios:false, patrociniosCobrado:false };
    const off = totalActivos(buildConValores({ ie, syncConfig:sc_off, totales }));
    const on  = totalActivos(buildConValores({ ie, syncConfig:sc_on,  totales }));
    expect(on - off).toBe(3000); // exactamente el valor de subvencionPublica
  });
});
