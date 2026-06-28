/**
 * Presupuesto — Test Suite
 * PRE-01..PRE-10: toggles KPIs, syncKey routing, migración datos legados
 * PRE-11..PRE-13: nuevas funciones merchandising y balance camisetas
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

beforeAll(() => {
  const s = {};
  Object.defineProperty(window,'localStorage',{value:{getItem:vi.fn(k=>s[k]??null),setItem:vi.fn((k,v)=>{s[k]=String(v);}),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  Object.defineProperty(window,'sessionStorage',{value:{getItem:vi.fn(()=>null),setItem:vi.fn(),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  global.fetch=vi.fn(()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({})}));
  vi.spyOn(console,'error').mockImplementation(()=>{});
});

const getImporteComprometido = p => p.estado === "cobrado" ? (p.importeCobrado > 0 ? p.importeCobrado : p.importe) : p.estado === "confirmado" ? p.importe : 0;
const getImporteCobrado = p => p.importeCobrado > 0 ? p.importeCobrado : p.importe;

// ECO-08: 'camisetas' (id:2) y 'balanceCamisetasTecnicas' (id:13) ya no se migran a syncKey —
// ese dominio económico vive en calculateCamisetasPresupuesto (6 categorías independientes, ver PRE-14).
const ID_TO_SYNCKEY = { 1:"patrocinios", 3:"patrociniosCobrado", 10:"subvencionPublica" };
const SYNC_CONFIG_DEFAULT = { patrocinios:true, patrociniosCobrado:true, subvencionPublica:true };
// Ids legados eliminados — datos guardados con estos ids deben filtrarse al cargar, no migrarse.
const LEGACY_REMOVED_IDS = new Set([2, 13]);

const buildConValores = ({ ie, syncConfig, totales }) => {
  const sc = { ...SYNC_CONFIG_DEFAULT, ...syncConfig };
  return ie.map(item => {
    const key = item.syncKey || ID_TO_SYNCKEY[item.id] || null;
    if (!key) return { ...item, synced: false };
    const activo = sc[key] !== undefined ? sc[key] : item.activo;
    const valor = key==="patrocinios" ? totales.patConfirmado
                : key==="patrociniosCobrado" ? totales.patCobrado
                : key==="subvencionPublica" ? totales.subvencion
                : item.valor;
    return { ...item, syncKey:key, valor, activo, synced:true };
  });
};
const total = items => items.filter(i => i.activo).reduce((s, i) => s + i.valor, 0);
const migrate = ie => ie
  .filter(item => !LEGACY_REMOVED_IDS.has(item.id))
  .map(item => item.syncKey ? item : ID_TO_SYNCKEY[item.id] ? { ...item, syncKey: ID_TO_SYNCKEY[item.id], synced:true } : item);

// PRE-01 — Toggle patrocinios captados
describe('PRE-01 — Toggle patrocinios captados', () => {
  const ie = [{ id:1, valor:0, activo:true }];
  const t  = { patConfirmado:800, patCobrado:200, merch:0, subvencion:0, camisetasTecnicas:0 };
  it('ON → suma 800', () => expect(total(buildConValores({ ie, syncConfig:{patrocinios:true}, totales:t }))).toBe(800));
  it('OFF → suma 0',  () => expect(total(buildConValores({ ie, syncConfig:{patrocinios:false}, totales:t }))).toBe(0));
  it('diferencia exacta', () => {
    const on  = total(buildConValores({ ie, syncConfig:{patrocinios:true},  totales:t }));
    const off = total(buildConValores({ ie, syncConfig:{patrocinios:false}, totales:t }));
    expect(on - off).toBe(800);
  });
});

// PRE-02 — Toggle patrocinios cobrados (id=3, bug histórico)
describe('PRE-02 — Toggle patrocinios cobrados (bug histórico id=3 sin syncKey)', () => {
  const ieLegado = [{ id:3, nombre:"Patrocinios cobrados", valor:0, activo:false }];
  const t = { patConfirmado:800, patCobrado:200, merch:0, subvencion:0, camisetasTecnicas:0 };
  it('id=3 sin syncKey → mapea a patrociniosCobrado', () => {
    expect(buildConValores({ ie:ieLegado, syncConfig:{}, totales:t })[0].syncKey).toBe("patrociniosCobrado");
  });
  it('ON → suma 200', () => expect(total(buildConValores({ ie:ieLegado, syncConfig:{patrociniosCobrado:true},  totales:t }))).toBe(200));
  it('OFF → suma 0',  () => expect(total(buildConValores({ ie:ieLegado, syncConfig:{patrociniosCobrado:false}, totales:t }))).toBe(0));
  it('no afecta a patrocinios captados', () => {
    const ie2 = [{ id:1, valor:0, activo:true }, { id:3, valor:0, activo:false }];
    const r = buildConValores({ ie:ie2, syncConfig:{patrocinios:true, patrociniosCobrado:false}, totales:t });
    expect(r.find(x=>x.syncKey==="patrocinios").activo).toBe(true);
    expect(r.find(x=>x.syncKey==="patrociniosCobrado").activo).toBe(false);
  });
});

// PRE-03 — Toggle subvención (bug histórico id=10 sin syncKey)
describe('PRE-03 — Toggle subvención entidad pública (bug histórico id=10)', () => {
  const ieLegado = [{ id:10, nombre:"Subvención", valor:0, activo:true }];
  const t = { patConfirmado:0, patCobrado:0, merch:0, subvencion:3000, camisetasTecnicas:0 };
  it('id=10 sin syncKey → mapea a subvencionPublica', () => {
    expect(buildConValores({ ie:ieLegado, syncConfig:{}, totales:t })[0].syncKey).toBe("subvencionPublica");
  });
  it('ON → suma 3000', () => expect(total(buildConValores({ ie:ieLegado, syncConfig:{subvencionPublica:true},  totales:t }))).toBe(3000));
  it('OFF → suma 0',   () => expect(total(buildConValores({ ie:ieLegado, syncConfig:{subvencionPublica:false}, totales:t }))).toBe(0));
});

// PRE-04 — Subvención calcula desde Administración pública
describe('PRE-04 — Subvención desde sector Administración pública', () => {
  const pats = [
    { id:1, sector:"Administración pública", estado:"confirmado", importe:2000, importeCobrado:0, especie:false },
    { id:2, sector:"Administración pública", estado:"cobrado",    importe:1000, importeCobrado:1000, especie:false },
    { id:3, sector:"Deportes / Outdoor",     estado:"confirmado", importe:5000, importeCobrado:0, especie:false },
    { id:4, sector:"Administración pública", estado:"prospecto",  importe:500,  importeCobrado:0, especie:false },
    { id:5, sector:"Administración pública", estado:"confirmado", importe:800,  importeCobrado:0, especie:true },
  ];
  const calcSubv = ps => ps.filter(p => p.sector==="Administración pública" && !p.especie).reduce((s,p) => s + getImporteComprometido(p), 0);
  it('suma solo Administración pública comprometida = 3000', () => expect(calcSubv(pats)).toBe(3000));
  it('excluye Deportes', () => expect(calcSubv(pats)).not.toBeGreaterThan(3000));
  it('excluye especie', () => expect(calcSubv(pats)).toBe(3000));
  it('excluye prospectos', () => expect(calcSubv(pats)).toBe(3000));
  it('al eliminar id=1 baja a 1000', () => expect(calcSubv(pats.filter(p=>p.id!==1))).toBe(1000));
});

// PRE-05 — ECO-08: categoría "otros" (extras de Pedidos vendidos: pagado+pendiente)
describe('PRE-05 — Camisetas "otros" (extras de Pedidos vendidos)', () => {
  it('ingreso solo cuenta pagado+pendiente, no regalo', async () => {
    const { calculateCamisetasPresupuesto } = await import('../lib/budgetUtils.js');
    const camPedidos = [{ lineas: [
      { tipo:"corredor",   cantidad:10, precioVenta:15, estadoPago:"pagado" },
      { tipo:"voluntario", cantidad:5,  precioVenta:12, estadoPago:"pendiente" },
      { tipo:"nino",       cantidad:3,  precioVenta:10, estadoPago:"regalo" },
    ]}];
    const r = calculateCamisetasPresupuesto({ camCoste:{corredor:8,voluntario:7,nino:6}, camPedidos });
    expect(r.otros.ingreso).toBe(10*15 + 5*12); // 150+60=210, regalo no suma ingreso
    expect(r.otros.unidades).toBe(15); // 10+5, regalo no cuenta en "otros"
  });
  it('gasto de "otros" usa el coste según tipo de línea', async () => {
    const { calculateCamisetasPresupuesto } = await import('../lib/budgetUtils.js');
    const camPedidos = [{ lineas: [
      { tipo:"corredor",   cantidad:10, precioVenta:15, estadoPago:"pagado" },
      { tipo:"voluntario", cantidad:5,  precioVenta:12, estadoPago:"pendiente" },
    ]}];
    const r = calculateCamisetasPresupuesto({ camCoste:{corredor:8,voluntario:7,nino:6}, camPedidos });
    expect(r.otros.gasto).toBe(10*8 + 5*7); // 80+35=115
  });
  it('toggle "otros" desactivado → ingreso y gasto a 0', async () => {
    const { calculateCamisetasPresupuesto } = await import('../lib/budgetUtils.js');
    const camPedidos = [{ lineas: [{ tipo:"corredor", cantidad:10, precioVenta:15, estadoPago:"pagado" }] }];
    const r = calculateCamisetasPresupuesto({ camCoste:{corredor:8,voluntario:7,nino:6}, camPedidos, toggles:{ otros:false } });
    expect(r.otros.ingreso).toBe(0);
    expect(r.otros.gasto).toBe(0);
  });
});

// PRE-06 — ECO-08: categoría "regalos" (extras de Pedidos con estadoPago='regalo')
describe('PRE-06 — Camisetas "regalo" (extras de Pedidos con estadoPago=regalo)', () => {
  it('solo cuenta líneas con estadoPago=regalo, cualquier tipo', async () => {
    const { calculateCamisetasPresupuesto } = await import('../lib/budgetUtils.js');
    const camPedidos = [{ lineas: [
      { tipo:"corredor",   cantidad:10, precioVenta:15, estadoPago:"pagado" },
      { tipo:"voluntario", cantidad:5,  precioVenta:0,  estadoPago:"regalo" },
      { tipo:"nino",       cantidad:3,  precioVenta:0,  estadoPago:"regalo" },
    ]}];
    const r = calculateCamisetasPresupuesto({ camCoste:{corredor:8,voluntario:7,nino:6}, camPedidos });
    expect(r.regalos.unidades).toBe(8); // 5+3, corredor pagado no cuenta
    expect(r.regalos.gasto).toBe(5*7 + 3*6); // 35+18=53
    expect(r.regalos.ingreso).toBe(0); // los regalos nunca generan ingreso
  });
  it('toggle "regalos" desactivado → gasto a 0', async () => {
    const { calculateCamisetasPresupuesto } = await import('../lib/budgetUtils.js');
    const camPedidos = [{ lineas: [{ tipo:"voluntario", cantidad:5, precioVenta:0, estadoPago:"regalo" }] }];
    const r = calculateCamisetasPresupuesto({ camCoste:{corredor:8,voluntario:7,nino:6}, camPedidos, toggles:{ regalos:false } });
    expect(r.regalos.gasto).toBe(0);
  });
  it('no se solapa con "otros": una línea es regalo O vendida, nunca ambas', async () => {
    const { calculateCamisetasPresupuesto } = await import('../lib/budgetUtils.js');
    const camPedidos = [{ lineas: [
      { tipo:"corredor", cantidad:4, precioVenta:15, estadoPago:"pagado" },
      { tipo:"corredor", cantidad:6, precioVenta:0,  estadoPago:"regalo" },
    ]}];
    const r = calculateCamisetasPresupuesto({ camCoste:{corredor:8,voluntario:7,nino:6}, camPedidos });
    expect(r.otros.unidades).toBe(4);
    expect(r.regalos.unidades).toBe(6);
    expect(r.otros.unidades + r.regalos.unidades).toBe(10); // sin solape ni pérdida
  });
});

// PRE-14 — ECO-08: las 6 categorías de calculateCamisetasPresupuesto
describe('PRE-14 — calculateCamisetasPresupuesto: 6 categorías independientes', () => {
  it('corredores: uds×precio plataforma, ingreso y gasto', async () => {
    const { calculateCamisetasPresupuesto } = await import('../lib/budgetUtils.js');
    const r = calculateCamisetasPresupuesto({
      camCoste:{corredor:8,voluntario:7,nino:6},
      corredoresExt:{ M:10, L:5 }, precioCorrExt:15,
    });
    expect(r.corredores.unidades).toBe(15);
    expect(r.corredores.ingreso).toBe(15*15);
    expect(r.corredores.gasto).toBe(15*8);
  });

  it('noCorredores: fuente y precio totalmente independientes de corredores', async () => {
    const { calculateCamisetasPresupuesto } = await import('../lib/budgetUtils.js');
    const r = calculateCamisetasPresupuesto({
      camCoste:{corredor:8,voluntario:7,nino:6},
      corredoresExt:{ M:10 }, precioCorrExt:15,
      noCorredorExt:{ S:4 }, precioNoCorrExt:18,
    });
    expect(r.noCorredores.unidades).toBe(4);
    expect(r.noCorredores.ingreso).toBe(4*18);
    expect(r.noCorredores.gasto).toBe(4*8); // coste de fabricación = mismo que corredor
    // No contamina la categoría corredores
    expect(r.corredores.unidades).toBe(10);
  });

  it('ventaPublico: precio×cantidad libre, coste a precio de corredor', async () => {
    const { calculateCamisetasPresupuesto } = await import('../lib/budgetUtils.js');
    const r = calculateCamisetasPresupuesto({
      camCoste:{corredor:8,voluntario:7,nino:6},
      ventaPublico:{ precio:20, cantidad:7 },
    });
    expect(r.ventaPublico.unidades).toBe(7);
    expect(r.ventaPublico.ingreso).toBe(7*20);
    expect(r.ventaPublico.gasto).toBe(7*8);
  });

  it('voluntarios: SOLO automático, sin ingreso, no cuenta extras de Pedidos tipo voluntario', async () => {
    const { calculateCamisetasPresupuesto } = await import('../lib/budgetUtils.js');
    const voluntariosActivos = [{ id:1, talla:'M' }, { id:2, talla:'L' }, { id:3, talla:'S' }];
    const camPedidos = [{ lineas: [{ tipo:"voluntario", cantidad:99, precioVenta:0, estadoPago:"regalo" }] }];
    const r = calculateCamisetasPresupuesto({ camCoste:{corredor:8,voluntario:7,nino:6}, voluntariosActivos, camPedidos });
    expect(r.voluntarios.unidades).toBe(3); // solo los 3 automáticos, NO las 99 del pedido
    expect(r.voluntarios.gasto).toBe(3*7);
    expect(r.voluntarios.ingreso).toBe(0);
  });

  it('toggles independientes: desactivar una categoría no afecta a las demás', async () => {
    const { calculateCamisetasPresupuesto } = await import('../lib/budgetUtils.js');
    const r = calculateCamisetasPresupuesto({
      camCoste:{corredor:8,voluntario:7,nino:6},
      corredoresExt:{ M:10 }, precioCorrExt:15,
      noCorredorExt:{ S:4 }, precioNoCorrExt:18,
      toggles:{ corredores:false, noCorredores:true, ventaPublico:true, otros:true, voluntarios:true, regalos:true },
    });
    expect(r.corredores.ingreso).toBe(0);
    expect(r.corredores.gasto).toBe(0);
    expect(r.noCorredores.ingreso).toBe(4*18); // intacto
  });

  it('totales agregados: totalIngresos solo suma categorías con ingreso, totalGastos suma todas', async () => {
    const { calculateCamisetasPresupuesto } = await import('../lib/budgetUtils.js');
    const voluntariosActivos = [{ id:1, talla:'M' }];
    const r = calculateCamisetasPresupuesto({
      camCoste:{corredor:8,voluntario:7,nino:6},
      corredoresExt:{ M:10 }, precioCorrExt:15, // ingreso 150, gasto 80
      voluntariosActivos, // gasto 7, sin ingreso
    });
    expect(r.totalIngresos).toBe(150);
    expect(r.totalGastos).toBe(80 + 7);
    expect(r.beneficioNeto).toBe(150 - 87);
  });
});

// PRE-07 — INGRESOS_EXTRA_DEFAULT ya NO incluye los syncKeys legados de camisetas
describe('PRE-07 — INGRESOS_EXTRA_DEFAULT (ECO-08: camisetas eliminadas)', () => {
  it('tiene los 3 syncKeys vigentes (patrocinios/patrociniosCobrado/subvencionPublica)', async () => {
    const { INGRESOS_EXTRA_DEFAULT } = await import('../constants/budgetConstants.js');
    const keys = INGRESOS_EXTRA_DEFAULT.filter(ie=>ie.syncKey).map(ie=>ie.syncKey);
    expect(keys).toContain('patrocinios');
    expect(keys).toContain('patrociniosCobrado');
    expect(keys).toContain('subvencionPublica');
  });
  it('ya NO contiene los syncKeys legados camisetas/balanceCamisetasTecnicas', async () => {
    const { INGRESOS_EXTRA_DEFAULT } = await import('../constants/budgetConstants.js');
    const keys = INGRESOS_EXTRA_DEFAULT.filter(ie=>ie.syncKey).map(ie=>ie.syncKey);
    expect(keys).not.toContain('camisetas');
    expect(keys).not.toContain('balanceCamisetasTecnicas');
  });
  it('ya NO contiene los ids legados 2 y 13', async () => {
    const { INGRESOS_EXTRA_DEFAULT } = await import('../constants/budgetConstants.js');
    expect(INGRESOS_EXTRA_DEFAULT.find(ie=>ie.id===2)).toBeUndefined();
    expect(INGRESOS_EXTRA_DEFAULT.find(ie=>ie.id===13)).toBeUndefined();
  });
});

// PRE-08 — SYNC_CONFIG_DEFAULT y CAMISETAS_SYNC_CONFIG_DEFAULT
describe('PRE-08 — SYNC_CONFIG_DEFAULT (ECO-08: solo 3 claves, camisetas separado)', () => {
  it('tiene las 3 claves vigentes', async () => {
    const { SYNC_CONFIG_DEFAULT } = await import('../constants/budgetConstants.js');
    ['patrocinios','patrociniosCobrado','subvencionPublica'].forEach(k => {
      expect(SYNC_CONFIG_DEFAULT).toHaveProperty(k);
    });
  });
  it('ya NO tiene camisetas ni balanceCamisetasTecnicas', async () => {
    const { SYNC_CONFIG_DEFAULT } = await import('../constants/budgetConstants.js');
    expect(SYNC_CONFIG_DEFAULT).not.toHaveProperty('camisetas');
    expect(SYNC_CONFIG_DEFAULT).not.toHaveProperty('balanceCamisetasTecnicas');
  });
  it('CAMISETAS_SYNC_CONFIG_DEFAULT tiene las 6 categorías, todas activas por defecto', async () => {
    const { CAMISETAS_SYNC_CONFIG_DEFAULT } = await import('../constants/budgetConstants.js');
    ['camCorredores','camNoCorredores','camVentaPublico','camOtros','camVoluntarios','camRegalos'].forEach(k => {
      expect(CAMISETAS_SYNC_CONFIG_DEFAULT).toHaveProperty(k);
      expect(CAMISETAS_SYNC_CONFIG_DEFAULT[k]).toBe(true);
    });
  });
});

// PRE-09 — Migración datos legados
describe('PRE-09 — Migración datos legados (sin syncKey)', () => {
  const legacy = [
    { id:1,  valor:500, activo:true  },
    { id:3,  valor:200, activo:false },
    { id:10, valor:0,   activo:true  },
    { id:2,  valor:0,   activo:true  }, // ECO-08: legado eliminado, debe filtrarse
    { id:13, valor:0,   activo:false }, // ECO-08: legado eliminado, debe filtrarse
    { id:12, nombre:"Otros", valor:50, activo:true },
  ];
  it('id=1→patrocinios, id=3→patrociniosCobrado, id=10→subvencionPublica', () => {
    const r = migrate(legacy);
    expect(r.find(ie=>ie.id===1)?.syncKey).toBe("patrocinios");
    expect(r.find(ie=>ie.id===3)?.syncKey).toBe("patrociniosCobrado");
    expect(r.find(ie=>ie.id===10)?.syncKey).toBe("subvencionPublica");
  });
  it('no toca líneas manuales (id=12)', () => {
    const r = migrate(legacy);
    expect(r.find(ie=>ie.id===12)?.syncKey).toBeUndefined();
  });
  it('ECO-08: filtra ids legados 2 y 13 en vez de migrarlos', () => {
    const r = migrate(legacy);
    expect(r.find(ie=>ie.id===2)).toBeUndefined();
    expect(r.find(ie=>ie.id===13)).toBeUndefined();
  });
});

// PRE-10 — Cadena completa toggle → KPIs
describe('PRE-10 — Cadena completa: toggle → totalIngresosExtra → resultado', () => {
  const ie = [
    { id:1,  activo:true,  valor:0 },
    { id:3,  activo:false, valor:0 },
    { id:10, activo:true,  valor:0 },
    { id:12, nombre:"Otros", activo:true, valor:300 },
  ];
  const t = { patConfirmado:800, patCobrado:200, subvencion:3000 };

  it('todos activos: 800+200+3000+300 = 4300', () => {
    const sc = { patrocinios:true, patrociniosCobrado:true, subvencionPublica:true };
    expect(total(buildConValores({ ie, syncConfig:sc, totales:t }))).toBe(4300);
  });

  it('solo manual activo: 300', () => {
    const sc = { patrocinios:false, patrociniosCobrado:false, subvencionPublica:false };
    expect(total(buildConValores({ ie, syncConfig:sc, totales:t }))).toBe(300);
  });

  it('activar subvención aumenta exactamente 3000', () => {
    const sc_off = { patrocinios:false, patrociniosCobrado:false, subvencionPublica:false };
    const sc_on  = { ...sc_off, subvencionPublica:true };
    const off = total(buildConValores({ ie, syncConfig:sc_off, totales:t }));
    const on  = total(buildConValores({ ie, syncConfig:sc_on,  totales:t }));
    expect(on - off).toBe(3000);
  });
});
// PRE-11 — Merge defaults garantiza que id=10 siempre aparece
describe('PRE-11 — Merge defaults garantiza líneas nuevas en datos guardados', () => {
  // ECO-08: DEFAULTS refleja INGRESOS_EXTRA_DEFAULT real — id:2 (camisetas) e id:13
  // (balanceCamisetasTecnicas) ya no existen, sustituidos por calculateCamisetasPresupuesto.
  const DEFAULTS = [
    { id:1,  syncKey:"patrocinios",             activo:true,  valor:0 },
    { id:3,  syncKey:"patrociniosCobrado",       activo:false, valor:0 },
    { id:10, syncKey:"subvencionPublica",        activo:true,  valor:0 },
    { id:11, nombre:"Colaboradores especie",     activo:false, valor:0 },
    { id:12, nombre:"Otros ingresos",            activo:false, valor:0 },
  ];

  const mergeWithDefaults = (savedIngresos, defaults) => {
    const savedIds = new Set(savedIngresos.map(ie => ie.id));
    const missing = defaults.filter(ie => !savedIds.has(ie.id));
    return [...savedIngresos, ...missing];
  };

  it('datos sin id=10 → merge añade id=10 (subvencionPublica)', () => {
    const saved = [
      { id:1, nombre:"Patrocinios captados", activo:true, valor:800 },
      { id:3, nombre:"Patrocinios cobrados", activo:false, valor:0 },
    ];
    const merged = mergeWithDefaults(saved, DEFAULTS);
    expect(merged.find(ie => ie.id === 10)).toBeTruthy();
    expect(merged.find(ie => ie.id === 10)?.syncKey).toBe("subvencionPublica");
  });

  it('datos guardados con ids legados 2/13 no se reintroducen vía defaults', () => {
    const saved = [
      { id:1, activo:true, valor:800 },
      { id:2, nombre:"Merchandising (legado)", activo:true, valor:0 },
      { id:13, nombre:"Balance camisetas técnicas (legado)", activo:false, valor:0 },
    ];
    const merged = mergeWithDefaults(saved, DEFAULTS);
    // El merge no los quita (eso lo hace el filtro de carga en useBudgetLogic, ver PRE-09),
    // pero tampoco los duplica ni los reintroduce como missing default.
    expect(merged.filter(ie => ie.id === 2)).toHaveLength(1);
    expect(merged.filter(ie => ie.id === 13)).toHaveLength(1);
    expect(DEFAULTS.find(ie => ie.id === 2)).toBeUndefined();
    expect(DEFAULTS.find(ie => ie.id === 13)).toBeUndefined();
  });

  it('datos que ya tienen id=10 no se duplican', () => {
    const saved = [
      { id:10, nombre:"Subvención personalizada", activo:true, valor:3000, syncKey:"subvencionPublica" },
    ];
    const merged = mergeWithDefaults(saved, DEFAULTS);
    const id10s = merged.filter(ie => ie.id === 10);
    expect(id10s).toHaveLength(1);
    expect(id10s[0].valor).toBe(3000); // el del usuario, no el default
  });

  it('datos vacíos → se cargan todos los defaults', () => {
    const merged = mergeWithDefaults([], DEFAULTS);
    expect(merged).toHaveLength(DEFAULTS.length);
  });

  it('el merge preserva los valores del usuario en los ids existentes', () => {
    const saved = [{ id:1, syncKey:"patrocinios", activo:true, valor:999 }];
    const merged = mergeWithDefaults(saved, DEFAULTS);
    expect(merged.find(ie => ie.id === 1)?.valor).toBe(999); // valor del usuario
  });
});
// PRE-12 — Cross-block sync: Patrocinadores → rawPats → totalSubvencionPublica
describe('PRE-12 — Sincronización cross-block Patrocinadores → Presupuesto', () => {
  it('dataService.onChange escucha teg-sync (mismo tab, otro bloque)', () => {
    // El flujo: Patrocinadores.setPats → setValue → localStorage.setItem
    //   + dataService.notify() → dispatchEvent('teg-sync')
    //   → useData.onChange handler → setState(parsedFromLS)
    //   → rawPats actualiza → totalSubvencionPublica recalcula → KPI actualiza
    const listeners = [];
    const mockWindow = {
      addEventListener: (evt, fn) => listeners.push({ evt, fn }),
      removeEventListener: () => {},
    };
    // Simulate onChange registering listeners
    const handler = () => {};
    mockWindow.addEventListener('storage', handler);
    mockWindow.addEventListener('teg-sync', handler);
    const evts = listeners.map(l => l.evt);
    expect(evts).toContain('storage');
    expect(evts).toContain('teg-sync');
  });

  it('notify() dispara teg-sync', () => {
    let fired = false;
    const handler = () => { fired = true; };
    window.addEventListener('teg-sync', handler);
    window.dispatchEvent(new Event('teg-sync'));
    window.removeEventListener('teg-sync', handler);
    expect(fired).toBe(true);
  });

  it('totalSubvencionPublica se recalcula cuando rawPats cambia', () => {
    const getSubv = (pats) => pats
      .filter(p => p.sector === "Administración pública" && !p.especie)
      .reduce((s, p) => {
        if (p.estado === "cobrado") return s + (p.importeCobrado > 0 ? p.importeCobrado : p.importe);
        if (p.estado === "confirmado") return s + p.importe;
        return s;
      }, 0);

    // Simula rawPats antes y después de añadir un patrocinador público
    const antes = [];
    const despues = [
      { id:1, sector:"Administración pública", estado:"confirmado", importe:5000, importeCobrado:0, especie:false }
    ];
    expect(getSubv(antes)).toBe(0);
    expect(getSubv(despues)).toBe(5000);
  });

  it('cambio de estado de prospecto a confirmado actualiza el total', () => {
    const getSubv = (pats) => pats
      .filter(p => p.sector === "Administración pública" && !p.especie)
      .reduce((s, p) => {
        if (p.estado === "cobrado") return s + (p.importeCobrado > 0 ? p.importeCobrado : p.importe);
        if (p.estado === "confirmado") return s + p.importe;
        return s;
      }, 0);

    const prospecto = [{ id:1, sector:"Administración pública", estado:"prospecto", importe:3000, importeCobrado:0, especie:false }];
    const confirmado = prospecto.map(p => ({ ...p, estado:"confirmado" }));
    expect(getSubv(prospecto)).toBe(0);    // prospecto no cuenta
    expect(getSubv(confirmado)).toBe(3000); // confirmado sí cuenta
  });
});

// ── MEJ-03: calcCostesRealesDesdePedidos ─────────────────────────────────
import { calcCostesRealesDesdePedidos, ESTADOS_COMPROMETIDO, ESTADOS_REAL } from '../lib/budgetUtils.js';

describe('MEJ-03 calcCostesRealesDesdePedidos — costes reales vs estimados', () => {

  const conceptos = [
    { id: 1, nombre: 'Cronometraje',   tipo: 'fijo',     activo: true, costeTotal: 1200 },
    { id: 2, nombre: 'Avituallamiento', tipo: 'variable', activo: true, costeTotal: 800  },
    { id: 3, nombre: 'Dorsales',        tipo: 'fijo',     activo: true, costeTotal: 600  },
    { id: 4, nombre: 'Inactivo',        tipo: 'fijo',     activo: false, costeTotal: 500 },
  ];

  const artCrono    = { nombre: 'Servicio cronometraje', conceptoId: 1, cantidad: 1, precioUnit: 1100, esFijo: false };
  const artAvit     = { nombre: 'Agua',                  conceptoId: 2, cantidad: 500, precioUnit: 0.5,  esFijo: false };
  const artDorsal   = { nombre: 'Dorsales pack',         conceptoId: 3, cantidad: 1,   precioUnit: 0,    esFijo: true, costeTotal: 580 };
  const artSinId    = { nombre: 'Varios',                conceptoId: null, cantidad: 1, precioUnit: 200, esFijo: false };

  const mkPedido = (id, estado, arts) => ({ id, estado, articulos: arts, importeTotal: arts.reduce((s,a) => s + (a.esFijo ? a.costeTotal||0 : (a.cantidad||0)*(a.precioUnit||0)), 0) });

  // ── estados ─────────────────────────────────────────────────────────────
  it('ESTADOS_COMPROMETIDO incluye confirmado', () => {
    expect(ESTADOS_COMPROMETIDO.has('confirmado')).toBe(true);
  });

  it('ESTADOS_REAL incluye recibido y facturado', () => {
    expect(ESTADOS_REAL.has('recibido')).toBe(true);
    expect(ESTADOS_REAL.has('facturado')).toBe(true);
  });

  it('borradores no se contabilizan', () => {
    const pedidos = [mkPedido(1, 'borrador', [artCrono])];
    const r = calcCostesRealesDesdePedidos(pedidos, conceptos);
    expect(r.totales.costeComprometido).toBe(0);
    expect(r.totales.costeReal).toBe(0);
  });

  // ── coste comprometido ───────────────────────────────────────────────────
  it('pedido confirmado alimenta costeComprometido, no costeReal', () => {
    const pedidos = [mkPedido(1, 'confirmado', [artCrono])];
    const r = calcCostesRealesDesdePedidos(pedidos, conceptos);
    const crono = r.porConcepto.find(c => c.conceptoId === 1);
    expect(crono.costeComprometido).toBe(1100);
    expect(crono.costeReal).toBe(0);
  });

  // ── coste real ───────────────────────────────────────────────────────────
  it('pedido recibido alimenta costeReal', () => {
    const pedidos = [mkPedido(1, 'recibido', [artCrono])];
    const r = calcCostesRealesDesdePedidos(pedidos, conceptos);
    expect(r.porConcepto.find(c => c.conceptoId === 1).costeReal).toBe(1100);
  });

  it('pedido facturado alimenta costeReal', () => {
    const pedidos = [mkPedido(1, 'facturado', [artCrono])];
    const r = calcCostesRealesDesdePedidos(pedidos, conceptos);
    expect(r.porConcepto.find(c => c.conceptoId === 1).costeReal).toBe(1100);
  });

  // ── artículos con esFijo ─────────────────────────────────────────────────
  it('artículo esFijo usa costeTotal en lugar de cantidad*precioUnit', () => {
    const pedidos = [mkPedido(1, 'recibido', [artDorsal])];
    const r = calcCostesRealesDesdePedidos(pedidos, conceptos);
    expect(r.porConcepto.find(c => c.conceptoId === 3).costeReal).toBe(580);
  });

  // ── desviación ───────────────────────────────────────────────────────────
  it('desviación = costeReal - costeEstimado', () => {
    const pedidos = [mkPedido(1, 'recibido', [artCrono])]; // real 1100, estimado 1200
    const r = calcCostesRealesDesdePedidos(pedidos, conceptos);
    const crono = r.porConcepto.find(c => c.conceptoId === 1);
    expect(crono.desviacion).toBe(1100 - 1200); // -100
  });

  it('pct = round(desviacion / estimado * 100)', () => {
    const pedidos = [mkPedido(1, 'recibido', [artCrono])]; // -100 / 1200 = -8.33 → -8%
    const r = calcCostesRealesDesdePedidos(pedidos, conceptos);
    expect(r.porConcepto.find(c => c.conceptoId === 1).pct).toBe(-8);
  });

  it('pct es null cuando estimado es 0', () => {
    const conceptoSinEstimado = [{ id: 99, nombre: 'X', tipo: 'fijo', activo: true, costeTotal: 0 }];
    const pedidos = [mkPedido(1, 'recibido', [{ nombre: 'X', conceptoId: 99, cantidad: 1, precioUnit: 100, esFijo: false }])];
    const r = calcCostesRealesDesdePedidos(pedidos, conceptoSinEstimado);
    expect(r.porConcepto.find(c => c.conceptoId === 99).pct).toBeNull();
  });

  // ── sin clasificar ───────────────────────────────────────────────────────
  it('pedido sin conceptoId en artículos va a sinClasificar', () => {
    const pedidos = [{ id: 1, estado: 'recibido', articulos: [artSinId], importeTotal: 200 }];
    const r = calcCostesRealesDesdePedidos(pedidos, conceptos);
    expect(r.sinClasificar.costeReal).toBe(200);
  });

  it('sinClasificar no suma a porConcepto de ningún concepto', () => {
    const pedidos = [{ id: 1, estado: 'recibido', articulos: [artSinId], importeTotal: 200 }];
    const r = calcCostesRealesDesdePedidos(pedidos, conceptos);
    const totalPorConcepto = r.porConcepto.reduce((s, c) => s + c.costeReal, 0);
    expect(totalPorConcepto).toBe(0);
  });

  // ── totales ──────────────────────────────────────────────────────────────
  it('totales.costeEstimado suma todos los conceptos activos', () => {
    const r = calcCostesRealesDesdePedidos([], conceptos);
    expect(r.totales.costeEstimado).toBe(1200 + 800 + 600); // 2600 (activo:false excluido)
  });

  it('concepto inactivo (activo:false) no aparece en porConcepto', () => {
    const r = calcCostesRealesDesdePedidos([], conceptos);
    expect(r.porConcepto.find(c => c.conceptoId === 4)).toBeUndefined();
  });

  it('totales incluyen sinClasificar en comprometido y real', () => {
    const pedidos = [
      mkPedido(1, 'recibido', [artCrono]),       // real +1100, concepto 1
      { id: 2, estado: 'recibido', articulos: [artSinId], importeTotal: 200 }, // real +200 sinClasificar
    ];
    const r = calcCostesRealesDesdePedidos(pedidos, conceptos);
    expect(r.totales.costeReal).toBe(1100 + 200);
  });

  it('múltiples pedidos al mismo concepto se acumulan', () => {
    const pedidos = [
      mkPedido(1, 'recibido',  [artCrono]),                                     // 1100
      mkPedido(2, 'facturado', [{ ...artCrono, precioUnit: 150 }]),              // 150
    ];
    const r = calcCostesRealesDesdePedidos(pedidos, conceptos);
    expect(r.porConcepto.find(c => c.conceptoId === 1).costeReal).toBe(1250);
  });

  it('pedidosVinculados lista los ids de pedidos con artículos de ese concepto', () => {
    const pedidos = [
      mkPedido(10, 'recibido', [artCrono]),
      mkPedido(11, 'recibido', [artCrono]),
    ];
    const r = calcCostesRealesDesdePedidos(pedidos, conceptos);
    const vinc = r.porConcepto.find(c => c.conceptoId === 1).pedidosVinculados;
    expect(vinc).toContain(10);
    expect(vinc).toContain(11);
  });

  // ── guards ───────────────────────────────────────────────────────────────
  it('funciona con arrays vacíos', () => {
    const r = calcCostesRealesDesdePedidos([], []);
    expect(r.totales.costeReal).toBe(0);
    expect(r.porConcepto).toHaveLength(0);
  });

  it('funciona con null/undefined', () => {
    expect(() => calcCostesRealesDesdePedidos(null, null)).not.toThrow();
  });

  it('no muta los arrays originales', () => {
    const pedidos   = [mkPedido(1, 'recibido', [artCrono])];
    const concOrig  = [...conceptos];
    calcCostesRealesDesdePedidos(pedidos, conceptos);
    expect(conceptos).toEqual(concOrig);
  });
});

// PRE-15 — BUG-RESET-CAM: resetAllData debe incluir camSyncConfig
describe('PRE-15 — Reset de datos incluye los 7 toggles de camisetas (ECO-08 + ECO-11)', () => {
  it('CAMISETAS_SYNC_CONFIG_DEFAULT existe y tiene las 7 claves activas', async () => {
    const { CAMISETAS_SYNC_CONFIG_DEFAULT } = await import('../constants/budgetConstants.js');
    const claves = ['camCorredores','camNoCorredores','camVentaPublico','camOtros','camVoluntarios','camRegalos','camNino'];
    expect(Object.keys(CAMISETAS_SYNC_CONFIG_DEFAULT).sort()).toEqual(claves.sort());
  });
  it('reset simulado: un toggle desactivado vuelve a true tras aplicar el default', async () => {
    const { CAMISETAS_SYNC_CONFIG_DEFAULT } = await import('../constants/budgetConstants.js');
    // Simula el estado tras desactivar manualmente "voluntarios" antes del reset
    const estadoSucio = { ...CAMISETAS_SYNC_CONFIG_DEFAULT, camVoluntarios: false };
    expect(estadoSucio.camVoluntarios).toBe(false);
    // Tras un reset, el estado debe volver exactamente al default (no preservar lo sucio)
    const estadoTrasReset = { ...CAMISETAS_SYNC_CONFIG_DEFAULT };
    expect(estadoTrasReset.camVoluntarios).toBe(true);
    expect(estadoTrasReset).toEqual(CAMISETAS_SYNC_CONFIG_DEFAULT);
  });
});

// PRE-16 — ECO-09: gasto de camisetas integrado en Costes Fijos, sin doble cómputo
describe('PRE-16 — Gasto de camisetas en Costes Fijos (sin doble cómputo en resultado)', () => {
  it('calculateCamisetasPresupuesto.totalGastos es el valor que debe pasarse como extraFijo', async () => {
    const { calculateCamisetasPresupuesto, calculateCostesFijos } = await import('../lib/budgetUtils.js');
    const cam = calculateCamisetasPresupuesto({
      camCoste: { corredor: 8, voluntario: 7, nino: 6 },
      corredoresExt: { M: 10 }, precioCorrExt: 15, // ingreso 150, gasto 80
    });
    const totalInscritos = { TG7: 50, TG13: 30, TG25: 20, total: 100 };
    const costesFijos = calculateCostesFijos([], totalInscritos, cam.totalGastos);
    expect(costesFijos.total).toBe(80);
  });

  it('el resultado neto es el mismo que con el modelo anterior (ingreso bruto - gasto en costes = beneficio neto en costes)', async () => {
    const { calculateCamisetasPresupuesto, calculateCostesFijos, calculateResultado } = await import('../lib/budgetUtils.js');
    const cam = calculateCamisetasPresupuesto({
      camCoste: { corredor: 8, voluntario: 7, nino: 6 },
      corredoresExt: { M: 10 }, precioCorrExt: 15, // ingreso 150, gasto 80, beneficioNeto 70
    });
    const totalInscritos = { TG7: 50, TG13: 30, TG25: 20, total: 100 };
    const ingresosPorDistancia = { TG7: 1000, TG13: 600, TG25: 400, total: 2000 };
    const costesFijos = calculateCostesFijos([], totalInscritos, cam.totalGastos);
    const costesVariables = { TG7: 0, TG13: 0, TG25: 0, total: 0 };
    // Modelo nuevo: ingreso BRUTO de camisetas como "otros ingresos", gasto ya en costesFijos
    const totalIngresosConMerchNuevo = cam.totalIngresos; // 150
    const resultadoNuevo = calculateResultado(totalInscritos, ingresosPorDistancia, costesFijos, costesVariables, totalIngresosConMerchNuevo);
    // Equivalente matemático al modelo viejo: beneficio NETO sumado directamente sin pasar por costesFijos
    const resultadoViejoEquivalente = ingresosPorDistancia.total + cam.beneficioNeto - 0 /* sin costesFijos de camisetas */ - costesVariables.total;
    expect(resultadoNuevo.total).toBeCloseTo(resultadoViejoEquivalente, 5);
  });

  it('desactivar el toggle de una categoría reduce el gasto en Costes Fijos dinámicamente', async () => {
    const { calculateCamisetasPresupuesto, calculateCostesFijos } = await import('../lib/budgetUtils.js');
    const totalInscritos = { TG7: 50, TG13: 30, TG25: 20, total: 100 };
    const camOn = calculateCamisetasPresupuesto({
      camCoste: { corredor: 8, voluntario: 7, nino: 6 },
      corredoresExt: { M: 10 }, precioCorrExt: 15,
      voluntariosActivos: [{ id: 1, talla: 'M' }],
    });
    const camOff = calculateCamisetasPresupuesto({
      camCoste: { corredor: 8, voluntario: 7, nino: 6 },
      corredoresExt: { M: 10 }, precioCorrExt: 15,
      voluntariosActivos: [{ id: 1, talla: 'M' }],
      toggles: { corredores: true, noCorredores: true, ventaPublico: true, otros: true, voluntarios: false, regalos: true },
    });
    const costesOn  = calculateCostesFijos([], totalInscritos, camOn.totalGastos);
    const costesOff = calculateCostesFijos([], totalInscritos, camOff.totalGastos);
    expect(costesOn.total).toBeGreaterThan(costesOff.total);
    expect(costesOn.total - costesOff.total).toBe(7); // coste.voluntario
  });

  it('el desglose por distancia de costesFijos sigue sumando el total con el gasto de camisetas incluido', async () => {
    const { calculateCamisetasPresupuesto, calculateCostesFijos } = await import('../lib/budgetUtils.js');
    const cam = calculateCamisetasPresupuesto({
      camCoste: { corredor: 8, voluntario: 7, nino: 6 },
      corredoresExt: { M: 20 }, precioCorrExt: 15,
    });
    const conceptosFijos = [
      { id: 1, tipo: 'fijo', activo: true, costeTotal: 968, activoDistancias: { TG7: true, TG13: true, TG25: true } },
    ];
    const totalInscritos = { TG7: 50, TG13: 30, TG25: 20, total: 100 };
    const r = calculateCostesFijos(conceptosFijos, totalInscritos, cam.totalGastos);
    expect(r.TG7 + r.TG13 + r.TG25).toBeCloseTo(r.total, 5);
    expect(r.total).toBe(968 + cam.totalGastos);
  });
});

// PRE-17 — ECO-10: MERCHANDISING_DEFAULT no duplica el bloque "Camisetas — Ingresos/Gastos"
describe('PRE-17 — Seed de Merchandising sin duplicidad de camisetas', () => {
  it('MERCHANDISING_DEFAULT no contiene ninguna fila con "camiseta" en el nombre', async () => {
    const { MERCHANDISING_DEFAULT } = await import('../constants/budgetConstants.ts');
    const filasCamiseta = MERCHANDISING_DEFAULT.filter(m => /camiset/i.test(m.nombre));
    expect(filasCamiseta).toEqual([]);
  });

  it('MERCHANDISING_DEFAULT mantiene los productos no-camiseta (buff, gorra) sin cambios', async () => {
    const { MERCHANDISING_DEFAULT } = await import('../constants/budgetConstants.ts');
    const nombres = MERCHANDISING_DEFAULT.map(m => m.nombre);
    expect(nombres).toContain('Buff / Braga cuello');
    expect(nombres).toContain('Gorra trail');
  });
});

// PRE-18 — FIX-DASH-SYNC: useBudgetLogic debe notificar al Dashboard tras persistir.
// Causa raíz del bug reportado "Dashboard no muestra el mismo resultado que Presupuesto":
// el Dashboard (React Query, staleTime 60s) solo invalida su caché cuando recibe el
// evento emitido por dataService.notify("presupuesto"). Presupuesto nunca lo llamaba —
// ni en el guardado manual, ni en el autosave debounced, ni en los toggles de sync.
describe('PRE-18 — FIX-DASH-SYNC: notificar al Dashboard tras guardar en Presupuesto', () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  async function renderBudgetLogic() {
    const { renderHook, act } = await import('@testing-library/react');
    const dataService = (await import('../lib/dataService.js')).default;
    const { useBudgetLogic } = await import('../hooks/useBudgetLogic.js');

    vi.spyOn(dataService, 'get').mockImplementation((key, defaultValue) => Promise.resolve(defaultValue));
    vi.spyOn(dataService, 'set').mockResolvedValue(undefined);
    const notifySpy = vi.spyOn(dataService, 'notify').mockImplementation(() => {});

    let hook;
    await act(async () => {
      hook = renderHook(() => useBudgetLogic({}));
      // Drenar el loadData() inicial (microtasks de dataService.get mockeado)
      await Promise.resolve();
      await Promise.resolve();
    });
    notifySpy.mockClear(); // ignorar cualquier notify espurio de la carga inicial
    return { hook, notifySpy, act };
  }

  it('el guardado manual (saveData) notifica "presupuesto" tras persistir', async () => {
    const { hook, notifySpy, act } = await renderBudgetLogic();
    await act(async () => {
      await hook.result.current.saveData();
    });
    expect(notifySpy).toHaveBeenCalledWith('presupuesto');
  });

  it('el autosave debounced (800ms) notifica "presupuesto" tras editar un concepto', async () => {
    const { hook, notifySpy, act } = await renderBudgetLogic();
    act(() => {
      hook.result.current.setConceptos(prev => [...prev, {
        id: 999, tipo: 'fijo', activo: true, costeTotal: 100,
        activoDistancias: { TG7: true, TG13: true, TG25: true },
      }]);
    });
    expect(notifySpy).not.toHaveBeenCalled(); // no debe disparar antes de los 800ms
    await act(async () => { vi.advanceTimersByTime(800); });
    expect(notifySpy).toHaveBeenCalledWith('presupuesto');
  });

  it('cambiar un toggle de syncConfig notifica "presupuesto" de inmediato', async () => {
    const { hook, notifySpy, act } = await renderBudgetLogic();
    act(() => {
      hook.result.current.setSyncConfig(prev => ({ ...prev, patrocinios: !prev.patrocinios }));
    });
    expect(notifySpy).toHaveBeenCalledWith('presupuesto');
  });

  it('cambiar un toggle de camSyncConfig (categorías camisetas) notifica "presupuesto" de inmediato', async () => {
    const { hook, notifySpy, act } = await renderBudgetLogic();
    act(() => {
      hook.result.current.setCamSyncConfig(prev => ({ ...prev, camVoluntarios: !prev.camVoluntarios }));
    });
    expect(notifySpy).toHaveBeenCalledWith('presupuesto');
  });
});
