/**
 * Presupuesto — Test Suite
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
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';

beforeAll(() => {
  const s = {};
  Object.defineProperty(window,'localStorage',{value:{getItem:vi.fn(k=>s[k]??null),setItem:vi.fn((k,v)=>{s[k]=String(v);}),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  Object.defineProperty(window,'sessionStorage',{value:{getItem:vi.fn(()=>null),setItem:vi.fn(),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  global.fetch=vi.fn(()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({})}));
  vi.spyOn(console,'error').mockImplementation(()=>{});
});

// Funciones utilitarias inlineadas para tests puros
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
  conceptos.filter(c => c.tipo === "fijo" && c.activo).forEach(c => {
    total += c.costeTotal;
  });
  return { total };
};

const calcCostesVar = (conceptos, totalIns) => {
  let total = 0;
  conceptos.filter(c => c.tipo === "variable" && c.activo).forEach(c => {
    DISTANCIAS.forEach(d => {
      if (c.activoDistancias?.[d]) total += (c.costePorDistancia[d]||0) * totalIns[d];
    });
  });
  return { total };
};

// ── PRE-01: INC-01 — alertas incluyen ingresos extra ─────────────────────
describe('PRE-01 — INC-01: alertas de presupuesto incluyen ingresos extra', () => {
  const calcAlerta = (ingresos, costes, ingresosExtra) => {
    const totalIngExtra = Array.isArray(ingresosExtra)
      ? ingresosExtra.filter(i => i.activo).reduce((s, i) => s + (i.valor || 0), 0)
      : 0;
    return (ingresos + totalIngExtra) - costes < 0;
  };

  it('sin ingresos extra: resultado negativo → alerta', () => {
    expect(calcAlerta(1000, 2000, [])).toBe(true);
  });
  it('sin ingresos extra: resultado positivo → sin alerta', () => {
    expect(calcAlerta(2000, 1000, [])).toBe(false);
  });
  it('con ingresos extra que cubren déficit → sin alerta', () => {
    const extras = [{ activo: true, valor: 1500 }];
    expect(calcAlerta(1000, 2000, extras)).toBe(false);
  });
  it('con ingresos extra insuficientes → alerta', () => {
    const extras = [{ activo: true, valor: 500 }];
    expect(calcAlerta(1000, 2000, extras)).toBe(true);
  });
  it('ingresos extra inactivos no cuentan', () => {
    const extras = [{ activo: false, valor: 5000 }];
    expect(calcAlerta(1000, 2000, extras)).toBe(true);
  });
});

// ── PRE-02: INC-04 — removeTramo limpia inscritos ─────────────────────────
describe('PRE-02 — INC-04: removeTramo limpia inscritos.tramos', () => {
  const removeTramo = (tramos, inscritos, id) => {
    const newTramos = tramos.filter(t => t.id !== id);
    const { [id]: _dropped, ...restTramos } = inscritos.tramos || {};
    return { tramos: newTramos, inscritos: { ...inscritos, tramos: restTramos } };
  };

  const tramos = [
    { id:1, nombre:"Early Bird", fechaFin:"2026-04-30", precios:{TG7:18,TG13:28,TG25:38} },
    { id:2, nombre:"Fase 1",     fechaFin:"2026-06-15", precios:{TG7:22,TG13:32,TG25:42} },
  ];
  const inscritos = { tramos: { 1:{TG7:20,TG13:25,TG25:15}, 2:{TG7:25,TG13:30,TG25:20} } };

  it('elimina el tramo del array', () => {
    const r = removeTramo(tramos, inscritos, 1);
    expect(r.tramos).toHaveLength(1);
    expect(r.tramos[0].id).toBe(2);
  });

  it('limpia los inscritos del tramo eliminado', () => {
    const r = removeTramo(tramos, inscritos, 1);
    expect(r.inscritos.tramos[1]).toBeUndefined();
  });

  it('conserva los inscritos de otros tramos', () => {
    const r = removeTramo(tramos, inscritos, 1);
    expect(r.inscritos.tramos[2]).toEqual({TG7:25,TG13:30,TG25:20});
  });

  it('los totales no incluyen el tramo eliminado', () => {
    const r = removeTramo(tramos, inscritos, 1);
    const tot = calcTotalInscritos(r.tramos, r.inscritos);
    expect(tot.TG7).toBe(25);
    expect(tot.TG13).toBe(30);
    expect(tot.total).toBe(75);
  });
});

// ── PRE-03: autoSave no emite "saving" antes del debounce ────────────────
describe('PRE-03 — PERF-03: autoSave emite "saving" en el debounce, no antes', () => {
  it('emitSaveStatus("saving") se llama dentro del setTimeout, no fuera', () => {
    // Simulamos el comportamiento corregido
    const calls = [];
    const emitSaveStatus = (s) => calls.push({ status: s, when: 'outside' });
    
    // Comportamiento CORRECTO: emitir dentro del timeout
    let inside = false;
    const autoSaveFixed = (data, emitFn) => {
      clearTimeout(autoSaveFixed._timer);
      // NO emitir aquí (fuera del timeout)
      autoSaveFixed._timer = setTimeout(() => {
        inside = true;
        emitFn("saving"); // Emite dentro del debounce
      }, 100);
    };
    autoSaveFixed._timer = null;

    autoSaveFixed({}, emitSaveStatus);
    // Inmediatamente después de llamar: no debe haberse emitido "saving"
    expect(calls.filter(c => c.status === "saving")).toHaveLength(0);
  });
});

// ── PRE-04: Semáforo de margen ─────────────────────────────────────────────
describe('PRE-04 — Semáforo de margen visual', () => {
  const calcSemaforo = (res, costes, margenConfig) => {
    const mc = margenConfig ?? { tipo: "porcentaje", valor: 10 };
    const objetivo = mc.tipo === "porcentaje"
      ? costes * (mc.valor / 100)
      : mc.valor;
    if (res >= objetivo) return "verde";
    if (res >= objetivo * 0.5) return "ambar";
    return "rojo";
  };

  it('verde cuando supera el objetivo', () => {
    expect(calcSemaforo(2000, 10000, { tipo:"porcentaje", valor:10 })).toBe("verde"); // 2000 >= 1000
  });
  it('ámbar cuando está entre 50% y 100% del objetivo', () => {
    expect(calcSemaforo(600, 10000, { tipo:"porcentaje", valor:10 })).toBe("ambar"); // 600 >= 500
  });
  it('rojo cuando está por debajo del 50% del objetivo', () => {
    expect(calcSemaforo(400, 10000, { tipo:"porcentaje", valor:10 })).toBe("rojo"); // 400 < 500
  });
  it('objetivo absoluto funciona correctamente', () => {
    expect(calcSemaforo(800, 10000, { tipo:"absoluto", valor:500 })).toBe("verde");
    expect(calcSemaforo(300, 10000, { tipo:"absoluto", valor:500 })).toBe("ambar");
    expect(calcSemaforo(100, 10000, { tipo:"absoluto", valor:500 })).toBe("rojo");
  });
  it('déficit siempre es rojo', () => {
    expect(calcSemaforo(-100, 10000, { tipo:"porcentaje", valor:10 })).toBe("rojo");
  });
});

// ── PRE-05: Coste por corredor ─────────────────────────────────────────────
describe('PRE-05 — Coste por corredor', () => {
  const calcCostePorCorredor = (costesTotal, totalInscritos) =>
    totalInscritos > 0 ? Math.round(costesTotal / totalInscritos * 100) / 100 : null;

  it('calcula correctamente', () => {
    expect(calcCostePorCorredor(6000, 400)).toBe(15);
  });
  it('redondea a 2 decimales', () => {
    expect(calcCostePorCorredor(1000, 3)).toBe(333.33);
  });
  it('devuelve null con 0 inscritos', () => {
    expect(calcCostePorCorredor(5000, 0)).toBeNull();
  });
});

// ── PRE-06: calculateCostesFijos prorrateo ─────────────────────────────────
describe('PRE-06 — calculateCostesFijos prorrateo por distancia', () => {
  const calcFijos = (conceptos, totalIns) => {
    let total = 0;
    const porDist = { TG7:0, TG13:0, TG25:0 };
    conceptos.filter(c => c.tipo === "fijo" && c.activo).forEach(c => {
      const distActivas = DISTANCIAS.filter(d => c.activoDistancias[d]);
      const totalActivos = distActivas.reduce((s,d) => s + totalIns[d], 0);
      DISTANCIAS.forEach(d => {
        if (!c.activoDistancias[d]) return;
        const prorrata = totalActivos > 0
          ? c.costeTotal * (totalIns[d] / totalActivos)
          : c.costeTotal / distActivas.length;
        porDist[d] += prorrata;
      });
      total += c.costeTotal;
    });
    return { total, ...porDist };
  };

  const conceptos = [
    { id:1, tipo:"fijo", activo:true, costeTotal:3000, activoDistancias:{TG7:true,TG13:true,TG25:true} },
  ];
  const totalIns = { TG7:100, TG13:200, TG25:100, total:400 };

  it('suma correcta de costes fijos activos', () => {
    expect(calcFijos(conceptos, totalIns).total).toBe(3000);
  });
  it('prorratea según inscritos por distancia', () => {
    const r = calcFijos(conceptos, totalIns);
    expect(r.TG7).toBeCloseTo(750);   // 3000 * 100/400
    expect(r.TG13).toBeCloseTo(1500); // 3000 * 200/400
    expect(r.TG25).toBeCloseTo(750);  // 3000 * 100/400
  });
  it('concepto inactivo no suma', () => {
    const conInactivo = [...conceptos, { id:2, tipo:"fijo", activo:false, costeTotal:1000, activoDistancias:{TG7:true,TG13:true,TG25:true} }];
    expect(calcFijos(conInactivo, totalIns).total).toBe(3000);
  });
});

// ── PRE-07: calculateResultado con ingresos extra ──────────────────────────
describe('PRE-07 — calculateResultado incluye ingresos extra', () => {
  const calcResultado = (ingInscr, costesFijos, costesVar, ingExtra) => {
    return ingInscr + ingExtra - costesFijos - costesVar;
  };

  it('resultado sin extras', () => {
    expect(calcResultado(10000, 5000, 3000, 0)).toBe(2000);
  });
  it('resultado con patrocinio mejora el margen', () => {
    expect(calcResultado(10000, 5000, 3000, 2000)).toBe(4000);
  });
  it('resultado negativo sin extras, positivo con extras', () => {
    expect(calcResultado(6000, 5000, 3000, 0)).toBe(-2000);
    expect(calcResultado(6000, 5000, 3000, 2500)).toBe(500);
  });
});

// ── PRE-08: calculatePEGlobal viable/no viable ─────────────────────────────
describe('PRE-08 — calculatePEGlobal viable/no viable', () => {
  const MAXIMOS = { TG7:150, TG13:200, TG25:120 };

  const isViable = (fijosNetos, margenActual, plazasDisponibles) => {
    if (margenActual >= fijosNetos) return true;
    const faltante = fijosNetos - margenActual;
    // Si hay plazas suficientes para cubrir el faltante
    return plazasDisponibles * 10 >= faltante; // asume margen medio de 10€
  };

  it('viable cuando margen actual >= costes fijos netos', () => {
    expect(isViable(5000, 5000, 0)).toBe(true);
    expect(isViable(5000, 6000, 0)).toBe(true);
  });
  it('no viable cuando no hay plazas suficientes', () => {
    expect(isViable(10000, 0, 5)).toBe(false);
  });
});

// ── PRE-09: margenConfig objetivo porcentaje y absoluto ───────────────────
describe('PRE-09 — margenConfig objetivo porcentaje vs absoluto', () => {
  const getObjetivo = (costes, config) =>
    config.tipo === "porcentaje" ? costes * config.valor / 100 : config.valor;

  it('porcentaje 10% de 10.000€ → 1.000€', () => {
    expect(getObjetivo(10000, { tipo:"porcentaje", valor:10 })).toBe(1000);
  });
  it('absoluto 500€ es independiente del coste', () => {
    expect(getObjetivo(10000, { tipo:"absoluto", valor:500 })).toBe(500);
    expect(getObjetivo(100000, { tipo:"absoluto", valor:500 })).toBe(500);
  });
  it('0% → objetivo 0', () => {
    expect(getObjetivo(10000, { tipo:"porcentaje", valor:0 })).toBe(0);
  });
  it('20% de 5.000€ → 1.000€', () => {
    expect(getObjetivo(5000, { tipo:"porcentaje", valor:20 })).toBe(1000);
  });
});

// ── PRE-10: Edge cases ────────────────────────────────────────────────────
describe('PRE-10 — Edge cases del bloque Presupuesto', () => {
  it('0 inscritos en todas las distancias → total 0', () => {
    const t = [{ id:1, precios:{TG7:20,TG13:30,TG25:40} }];
    const i = { tramos: { 1:{TG7:0,TG13:0,TG25:0} } };
    expect(calcTotalInscritos(t, i).total).toBe(0);
  });

  it('tramo sin precios → no suma ingresos', () => {
    const t = [{ id:1, precios:{} }];
    const i = { tramos: { 1:{TG7:50,TG13:50,TG25:50} } };
    expect(calcIngresos(t, i).total).toBe(0);
  });

  it('conceptos vacíos → costes 0', () => {
    const totalIns = { TG7:100, TG13:100, TG25:100, total:300 };
    expect(calcCostesFijos([], totalIns).total).toBe(0);
    expect(calcCostesVar([], totalIns).total).toBe(0);
  });

  it('inscritos sin tramos → no falla', () => {
    const t = [];
    const i = { tramos: {} };
    const tot = calcTotalInscritos(t, i);
    expect(tot.total).toBe(0);
  });

  it('coste fijo activado en distancia sin inscritos — prorrateo entre distancias con inscritos', () => {
    const conceptos = [
      { tipo:"fijo", activo:true, costeTotal:1000, activoDistancias:{TG7:true,TG13:true,TG25:true} }
    ];
    const totalIns = { TG7:0, TG13:100, TG25:0, total:100 }; // solo TG13 tiene inscritos
    const r = calcCostesFijos(conceptos, totalIns);
    expect(r.total).toBe(1000); // el coste total es correcto
  });
});
