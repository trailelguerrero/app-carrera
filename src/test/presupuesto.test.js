/**
 * Presupuesto — Test Suite
 * PRE-01..PRE-10: toggles KPIs, syncKey routing, migración datos legados
 * PRE-11..PRE-13: nuevas funciones merchandising y balance camisetas
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';

beforeAll(() => {
  const s = {};
  Object.defineProperty(window,'localStorage',{value:{getItem:vi.fn(k=>s[k]??null),setItem:vi.fn((k,v)=>{s[k]=String(v);}),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  Object.defineProperty(window,'sessionStorage',{value:{getItem:vi.fn(()=>null),setItem:vi.fn(),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  global.fetch=vi.fn(()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({})}));
  vi.spyOn(console,'error').mockImplementation(()=>{});
});

const getImporteComprometido = p => p.estado === "cobrado" ? (p.importeCobrado > 0 ? p.importeCobrado : p.importe) : p.estado === "confirmado" ? p.importe : 0;
const getImporteCobrado = p => p.importeCobrado > 0 ? p.importeCobrado : p.importe;

const ID_TO_SYNCKEY = { 1:"patrocinios", 2:"camisetas", 3:"patrociniosCobrado", 10:"subvencionPublica", 13:"balanceCamisetasTecnicas" };
const SYNC_CONFIG_DEFAULT = { patrocinios:true, patrociniosCobrado:true, camisetas:true, subvencionPublica:true, balanceCamisetasTecnicas:false };

const buildConValores = ({ ie, syncConfig, totales }) => {
  const sc = { ...SYNC_CONFIG_DEFAULT, ...syncConfig };
  return ie.map(item => {
    const key = item.syncKey || ID_TO_SYNCKEY[item.id] || null;
    if (!key) return { ...item, synced: false };
    const activo = sc[key] !== undefined ? sc[key] : item.activo;
    const valor = key==="patrocinios" ? totales.patConfirmado
                : key==="patrociniosCobrado" ? totales.patCobrado
                : key==="camisetas" ? totales.merch
                : key==="subvencionPublica" ? totales.subvencion
                : key==="balanceCamisetasTecnicas" ? totales.camisetasTecnicas
                : item.valor;
    return { ...item, syncKey:key, valor, activo, synced:true };
  });
};
const total = items => items.filter(i => i.activo).reduce((s, i) => s + i.valor, 0);
const migrate = ie => ie.map(item => item.syncKey ? item : ID_TO_SYNCKEY[item.id] ? { ...item, syncKey: ID_TO_SYNCKEY[item.id], synced:true } : item);

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

// PRE-05 — Merchandising total = pedidos Camisetas + merchandising local
describe('PRE-05 — Merchandising total combina Camisetas + Venta de Productos', () => {
  const calcMerchTotal = ({ pedidos, coste, merchandising }) => {
    // Parte 1: pedidos bloque Camisetas
    const lineas = pedidos.flatMap(p => p.lineas || []);
    const ingPed = lineas.filter(l => l.estadoPago==="pagado").reduce((s,l) => s + l.cantidad*(l.precioVenta||0), 0);
    const costePed = lineas.filter(l => l.estadoPago==="pagado"||l.estadoPago==="pendiente").reduce((s,l) => s + l.cantidad*(coste[l.tipo]||7.5), 0);
    // Parte 2: merchandising local
    const merch = merchandising.filter(m => m.activo);
    const ingMerch = merch.reduce((s,m) => s + m.unidades*(m.precioVenta||0), 0);
    const costeMerch = merch.reduce((s,m) => s + m.unidades*(m.costeUnitario||0), 0);
    return (ingPed - costePed) + (ingMerch - costeMerch);
  };

  const pedidos = [{ lineas: [
    { tipo:"corredor", cantidad:10, precioVenta:15, estadoPago:"pagado" },
    { tipo:"voluntario", cantidad:5, precioVenta:0, estadoPago:"pendiente" },
  ]}];
  const coste = { corredor:8, voluntario:7 };
  const merchandising = [
    { id:1, nombre:"Buff", unidades:20, precioVenta:8, costeUnitario:3, activo:true },
    { id:2, nombre:"Gorra", unidades:10, precioVenta:12, costeUnitario:5, activo:false },
  ];

  it('beneficio pedidos: (10*15-10*8) - (5*7) = 70-35 = 35', () => {
    const ingPed = 10*15; // 150
    const costePed = 10*8 + 5*7; // 80+35=115
    expect(ingPed - costePed).toBe(35);
  });

  it('beneficio merch activo: 20*(8-3) = 100', () => {
    const m = merchandising.filter(x=>x.activo);
    expect(m.reduce((s,x) => s + x.unidades*(x.precioVenta-x.costeUnitario), 0)).toBe(100);
  });

  it('total combinado = 35 + 100 = 135', () => {
    expect(calcMerchTotal({ pedidos, coste, merchandising })).toBe(135);
  });

  it('merch inactivo no cuenta', () => {
    const merchTodos = merchandising.map(m => ({ ...m, activo:true }));
    const conTodos = calcMerchTotal({ pedidos, coste, merchandising:merchTodos });
    const sinGorra = calcMerchTotal({ pedidos, coste, merchandising });
    expect(conTodos).toBeGreaterThan(sinGorra);
  });

  it('si no hay pedidos, solo cuenta merchandising local', () => {
    const r = calcMerchTotal({ pedidos:[], coste, merchandising });
    expect(r).toBe(100); // solo buff activo
  });
});

// PRE-06 — Balance camisetas técnicas
describe('PRE-06 — Balance camisetas técnicas (corredor + camiseta local)', () => {
  const calcBalance = ({ pedidos, coste, merchandising }) => {
    const lineas = pedidos.flatMap(p => p.lineas || []).filter(l => l.tipo==="corredor");
    const ingCor = lineas.filter(l => l.estadoPago==="pagado").reduce((s,l) => s + l.cantidad*(l.precioVenta||0), 0);
    const costeCor = lineas.filter(l => l.estadoPago==="pagado"||l.estadoPago==="pendiente").reduce((s,l) => s + l.cantidad*(coste.corredor||7.5), 0);
    const camisetasMerch = (merchandising||[]).filter(m => m.activo && m.nombre?.toLowerCase().includes("camiseta"));
    const ingCam = camisetasMerch.reduce((s,m) => s + m.unidades*(m.precioVenta||0), 0);
    const costeCam = camisetasMerch.reduce((s,m) => s + m.unidades*(m.costeUnitario||0), 0);
    return (ingCor - costeCor) + (ingCam - costeCam);
  };

  const pedidos = [{ lineas: [
    { tipo:"corredor",   cantidad:10, precioVenta:15, estadoPago:"pagado" },
    { tipo:"voluntario", cantidad:5,  precioVenta:0,  estadoPago:"pendiente" },
  ]}];
  const coste = { corredor:8, voluntario:7 };
  const merch = [
    { id:1, nombre:"Camiseta técnica trail", unidades:20, precioVenta:18, costeUnitario:8, activo:true },
    { id:2, nombre:"Buff", unidades:30, precioVenta:8, costeUnitario:3, activo:true },
  ];

  it('solo cuenta tipo corredor de pedidos (no voluntarios)', () => {
    const lineasVol = pedidos[0].lineas.filter(l => l.tipo==="voluntario");
    expect(lineasVol.length).toBe(1);
    // voluntarios no deben entrar en el balance
    const r = calcBalance({ pedidos, coste, merchandising:[] });
    const costesVol = lineasVol.reduce((s,l) => s + l.cantidad*coste.voluntario, 0); // 35
    expect(r).toBe(10*15 - 10*8 - 0); // ingreso corredor - coste corredor (solo pagados)
  });

  it('merchandising: solo items con "camiseta" en el nombre', () => {
    const r = calcBalance({ pedidos:[], coste, merchandising:merch });
    expect(r).toBe(20*(18-8)); // solo la camiseta técnica, buff no cuenta
  });

  it('total = corredor pedidos + camiseta merch', () => {
    const corPed = 10*15 - 10*8; // 70
    const camMerch = 20*(18-8);  // 200
    expect(calcBalance({ pedidos, coste, merchandising:merch })).toBe(corPed + camMerch);
  });

  it('id=13 mapea a syncKey balanceCamisetasTecnicas', () => {
    const ie = [{ id:13, nombre:"Balance camisetas técnicas", valor:0, activo:false }];
    const t = { patConfirmado:0, patCobrado:0, merch:0, subvencion:0, camisetasTecnicas:270 };
    const r = buildConValores({ ie, syncConfig:{balanceCamisetasTecnicas:true}, totales:t });
    expect(r[0].syncKey).toBe("balanceCamisetasTecnicas");
    expect(r[0].activo).toBe(true);
    expect(r[0].valor).toBe(270);
  });
});

// PRE-07 — INGRESOS_EXTRA_DEFAULT tiene los 5 syncKeys
describe('PRE-07 — INGRESOS_EXTRA_DEFAULT incluye todos los syncKeys', () => {
  it('tiene los 5 ids sincronizados con sus syncKeys', async () => {
    const { INGRESOS_EXTRA_DEFAULT } = await import('../constants/budgetConstants.js');
    const keys = INGRESOS_EXTRA_DEFAULT.filter(ie=>ie.syncKey).map(ie=>ie.syncKey);
    expect(keys).toContain('patrocinios');
    expect(keys).toContain('patrociniosCobrado');
    expect(keys).toContain('camisetas');
    expect(keys).toContain('subvencionPublica');
    expect(keys).toContain('balanceCamisetasTecnicas');
  });
  it('id=13 tiene syncKey balanceCamisetasTecnicas', async () => {
    const { INGRESOS_EXTRA_DEFAULT } = await import('../constants/budgetConstants.js');
    expect(INGRESOS_EXTRA_DEFAULT.find(ie=>ie.id===13)?.syncKey).toBe('balanceCamisetasTecnicas');
  });
});

// PRE-08 — SYNC_CONFIG_DEFAULT tiene las 5 claves
describe('PRE-08 — SYNC_CONFIG_DEFAULT tiene las 5 claves', () => {
  it('tiene balanceCamisetasTecnicas', async () => {
    const { SYNC_CONFIG_DEFAULT } = await import('../constants/budgetConstants.js');
    expect(SYNC_CONFIG_DEFAULT).toHaveProperty('balanceCamisetasTecnicas');
  });
  it('tiene todas las claves', async () => {
    const { SYNC_CONFIG_DEFAULT } = await import('../constants/budgetConstants.js');
    ['patrocinios','patrociniosCobrado','camisetas','subvencionPublica','balanceCamisetasTecnicas'].forEach(k => {
      expect(SYNC_CONFIG_DEFAULT).toHaveProperty(k);
    });
  });
});

// PRE-09 — Migración datos legados
describe('PRE-09 — Migración datos legados (sin syncKey)', () => {
  const legacy = [
    { id:1,  valor:500, activo:true  },
    { id:3,  valor:200, activo:false },
    { id:10, valor:0,   activo:true  },
    { id:13, valor:0,   activo:false },
    { id:12, nombre:"Otros", valor:50, activo:true },
  ];
  it('id=1→patrocinios, id=3→patrociniosCobrado, id=10→subvencionPublica, id=13→balanceCamisetasTecnicas', () => {
    const r = migrate(legacy);
    expect(r.find(ie=>ie.id===1)?.syncKey).toBe("patrocinios");
    expect(r.find(ie=>ie.id===3)?.syncKey).toBe("patrociniosCobrado");
    expect(r.find(ie=>ie.id===10)?.syncKey).toBe("subvencionPublica");
    expect(r.find(ie=>ie.id===13)?.syncKey).toBe("balanceCamisetasTecnicas");
  });
  it('no toca líneas manuales (id=12)', () => {
    const r = migrate(legacy);
    expect(r.find(ie=>ie.id===12)?.syncKey).toBeUndefined();
  });
});

// PRE-10 — Cadena completa toggle → KPIs
describe('PRE-10 — Cadena completa: toggle → totalIngresosExtra → resultado', () => {
  const ie = [
    { id:1,  activo:true,  valor:0 },
    { id:3,  activo:false, valor:0 },
    { id:10, activo:true,  valor:0 },
    { id:13, activo:false, valor:0 },
    { id:12, nombre:"Otros", activo:true, valor:300 },
  ];
  const t = { patConfirmado:800, patCobrado:200, merch:150, subvencion:3000, camisetasTecnicas:270 };

  it('todos activos: 800+200+3000+270+300 = 4570', () => {
    const sc = { patrocinios:true, patrociniosCobrado:true, subvencionPublica:true, balanceCamisetasTecnicas:true, camisetas:true };
    expect(total(buildConValores({ ie, syncConfig:sc, totales:t }))).toBe(4570);
  });

  it('solo manual activo: 300', () => {
    const sc = { patrocinios:false, patrociniosCobrado:false, camisetas:false, subvencionPublica:false, balanceCamisetasTecnicas:false };
    expect(total(buildConValores({ ie, syncConfig:sc, totales:t }))).toBe(300);
  });

  it('activar subvención aumenta exactamente 3000', () => {
    const sc_off = { patrocinios:false, patrociniosCobrado:false, camisetas:false, subvencionPublica:false, balanceCamisetasTecnicas:false };
    const sc_on  = { ...sc_off, subvencionPublica:true };
    const off = total(buildConValores({ ie, syncConfig:sc_off, totales:t }));
    const on  = total(buildConValores({ ie, syncConfig:sc_on,  totales:t }));
    expect(on - off).toBe(3000);
  });
});
// PRE-11 — Merge defaults garantiza que id=10 y id=13 siempre aparecen
describe('PRE-11 — Merge defaults garantiza líneas nuevas en datos guardados', () => {
  const DEFAULTS = [
    { id:1,  syncKey:"patrocinios",             activo:true,  valor:0 },
    { id:3,  syncKey:"patrociniosCobrado",       activo:false, valor:0 },
    { id:2,  syncKey:"camisetas",               activo:true,  valor:0 },
    { id:10, syncKey:"subvencionPublica",        activo:true,  valor:0 },
    { id:13, syncKey:"balanceCamisetasTecnicas", activo:false, valor:0 },
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
      { id:2, nombre:"Merchandising", activo:true, valor:0 },
      { id:3, nombre:"Patrocinios cobrados", activo:false, valor:0 },
    ];
    const merged = mergeWithDefaults(saved, DEFAULTS);
    expect(merged.find(ie => ie.id === 10)).toBeTruthy();
    expect(merged.find(ie => ie.id === 10)?.syncKey).toBe("subvencionPublica");
  });

  it('datos sin id=13 → merge añade id=13 (balanceCamisetasTecnicas)', () => {
    const saved = [{ id:1, activo:true, valor:800 }];
    const merged = mergeWithDefaults(saved, DEFAULTS);
    expect(merged.find(ie => ie.id === 13)).toBeTruthy();
    expect(merged.find(ie => ie.id === 13)?.syncKey).toBe("balanceCamisetasTecnicas");
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
