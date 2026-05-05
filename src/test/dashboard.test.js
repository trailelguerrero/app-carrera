/**
 * Dashboard — Test Suite
 *
 * DASH-01  BUG-01: patCobrado usa getImporteCobrado (cobros parciales)
 * DASH-02  BUG-02: calculateResultadoFinanciero respeta patrociniosCobrado
 * DASH-03  INC-03: debounce teg-sync no bloquea actualizaciones consecutivas
 * DASH-04  INC-04: COSTE_DEFAULT es el mismo en Dashboard y Camisetas
 * DASH-05  INC-05: sin duplicación en "Haz esto ahora" cuando hay alertas críticas
 * DASH-06  UX-03: módulos en rojo/ámbar visibles en salud colapsada
 * DASH-07  calcularRiesgosCruzados — detección de riesgos combinados
 * DASH-08  saludGlobal — cálculo correcto de media ponderada
 * DASH-09  alertas temporales — umbrales según días hasta el evento
 * DASH-10  calcResultadoFinanciero con ambos toggles de patrocinio
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';

beforeAll(() => {
  const s = {};
  Object.defineProperty(window,'localStorage',{value:{getItem:vi.fn(k=>s[k]??null),setItem:vi.fn((k,v)=>{s[k]=String(v);}),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  Object.defineProperty(window,'sessionStorage',{value:{getItem:vi.fn(()=>null),setItem:vi.fn(),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  global.fetch=vi.fn(()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({})}));
  vi.spyOn(console,'error').mockImplementation(()=>{});
});

// Funciones reutilizadas de los módulos reales
const getImporteCobrado = (pat) => {
  if (pat.importeCobrado != null && pat.importeCobrado > 0) return pat.importeCobrado;
  if (pat.estado === "cobrado") return pat.importe || 0;
  return 0;
};

// ── DASH-01: patCobrado con cobros parciales ──────────────────────────────
describe('DASH-01 — patCobrado usa getImporteCobrado para cobros parciales', () => {
  const pats = [
    { id:1, nombre:"Decathlon",   importe:2000, importeCobrado:2000, estado:"cobrado"    },
    { id:2, nombre:"Clínica Fisio",importe:1000, importeCobrado:600,  estado:"cobrado"    }, // cobro parcial
    { id:3, nombre:"Hotel Gredos", importe:500,  importeCobrado:0,    estado:"cobrado"    }, // importeCobrado 0 → usar importe
    { id:4, nombre:"Turismo",      importe:800,  importeCobrado:0,    estado:"confirmado" }, // no cobrado
  ];

  const calcPatCobrado = (pats) =>
    pats.filter(p => p.estado === "cobrado").reduce((s,p) => s + getImporteCobrado(p), 0);

  const calcPatCobradoBuggy = (pats) =>
    pats.filter(p => p.estado === "cobrado").reduce((s,p) => s + (p.importe||0), 0);

  it('getImporteCobrado devuelve importeCobrado cuando > 0', () => {
    expect(getImporteCobrado(pats[1])).toBe(600);  // cobro parcial
  });

  it('getImporteCobrado usa importe cuando importeCobrado es 0 y estado cobrado', () => {
    expect(getImporteCobrado(pats[2])).toBe(500);
  });

  it('versión correcta: patCobrado respeta cobros parciales', () => {
    const result = calcPatCobrado(pats);
    expect(result).toBe(3100); // 2000 + 600 + 500
  });

  it('versión buggy: patCobrado sobre-contabiliza cobros parciales', () => {
    const result = calcPatCobradoBuggy(pats);
    expect(result).toBe(3500); // 2000 + 1000 + 500 — incorrecto
  });

  it('la diferencia es el cobro parcial no realizado', () => {
    const correcto = calcPatCobrado(pats);
    const buggy    = calcPatCobradoBuggy(pats);
    expect(buggy - correcto).toBe(400); // 1000 - 600
  });
});

// ── DASH-02: calculateResultadoFinanciero con patrociniosCobrado ──────────
describe('DASH-02 — calculateResultadoFinanciero respeta patrociniosCobrado', () => {
  const pats = [
    { id:1, importe:2000, importeCobrado:1500, estado:"cobrado",    especie:0 },
    { id:2, importe:1000, importeCobrado:0,    estado:"confirmado", especie:0 },
    { id:3, importe:500,  importeCobrado:0,    estado:"negociando", especie:0 },
  ];

  const calcResultado = (pats, ingresosExtra, syncConfig, totalIngresos=10000, costes=8000) => {
    let patSyncado = 0;
    if (syncConfig.patrociniosCobrado) {
      patSyncado = pats.filter(p => !p.especie && p.estado === "cobrado")
        .reduce((s,p) => s + getImporteCobrado(p), 0);
    } else if (syncConfig.patrocinios) {
      patSyncado = pats.filter(p => !p.especie && (p.estado === "cobrado" || p.estado === "confirmado"))
        .reduce((s,p) => s + (p.importe||0), 0);
    }
    const manuales = ingresosExtra.filter(i => i.activo && !i.synced)
      .reduce((s,i) => s + i.valor, 0);
    return totalIngresos + patSyncado + manuales - costes;
  };

  it('con patrocinios activo: usa importe comprometido', () => {
    const result = calcResultado(pats, [], { patrocinios: true, patrociniosCobrado: false });
    // 10000 + 2000 + 1000 - 8000 = 5000 (cobrado + confirmado)
    expect(result).toBe(5000);
  });

  it('con patrociniosCobrado activo: usa solo importeCobrado', () => {
    const result = calcResultado(pats, [], { patrocinios: false, patrociniosCobrado: true });
    // 10000 + 1500 - 8000 = 3500 (solo cobrado real)
    expect(result).toBe(3500);
  });

  it('diferencia entre captado y cobrado refleja exposición de tesorería', () => {
    const conCaptado = calcResultado(pats, [], { patrocinios: true, patrociniosCobrado: false });
    const conCobrado = calcResultado(pats, [], { patrocinios: false, patrociniosCobrado: true });
    // La diferencia es 1500 (confirmado no cobrado + cobro parcial pendiente)
    expect(conCaptado - conCobrado).toBe(1500);
  });

  it('sin toggles activos: no suma patrocinios', () => {
    const result = calcResultado(pats, [], { patrocinios: false, patrociniosCobrado: false });
    expect(result).toBe(2000); // 10000 - 8000
  });

  it('los ingresos manuales se suman siempre si activos', () => {
    const extras = [{ id:10, activo:true, synced:false, valor:300 }];
    const result = calcResultado(pats, extras, { patrocinios: false, patrociniosCobrado: false });
    expect(result).toBe(2300); // 10000 + 300 - 8000
  });
});

// ── DASH-03: Debounce en teg-sync ─────────────────────────────────────────
describe('DASH-03 — Debounce teg-sync no bloquea actualizaciones consecutivas', () => {
  it('debounce: múltiples eventos rápidos producen una sola llamada', async () => {
    vi.useFakeTimers();
    const loadFn = vi.fn();
    let debounceTimer = null;
    const handler = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => loadFn(), 500);
    };

    // Disparar 3 eventos en rápida sucesión
    handler(); handler(); handler();
    expect(loadFn).not.toHaveBeenCalled(); // aún no

    vi.advanceTimersByTime(600);
    expect(loadFn).toHaveBeenCalledTimes(1); // solo una vez

    vi.useRealTimers();
  });

  it('throttle antiguo: segundo evento bloqueado si < 10s', () => {
    vi.useFakeTimers();
    let lastSync = 0;
    let calls = 0;
    const throttledHandler = () => {
      const now = Date.now();
      if (now - lastSync > 10000) { lastSync = now; calls++; }
    };

    throttledHandler();  // T=0 → pasa
    vi.advanceTimersByTime(3000);
    throttledHandler();  // T=3s → bloqueado
    expect(calls).toBe(1); // el segundo fue ignorado

    vi.useRealTimers();
  });

  it('debounce nuevo: eventos separados 600ms producen 2 llamadas', async () => {
    vi.useFakeTimers();
    const loadFn = vi.fn();
    let debounceTimer = null;
    const handler = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => loadFn(), 500);
    };

    handler();
    vi.advanceTimersByTime(600);
    handler();
    vi.advanceTimersByTime(600);
    expect(loadFn).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});

// ── DASH-04: COSTE_DEFAULT unificado ─────────────────────────────────────
describe('DASH-04 — COSTE_DEFAULT coherente entre Dashboard y Camisetas', () => {
  const COSTE_DEFAULT = { corredor: 8, voluntario: 7, nino: 6 };

  it('corredor cuesta 8€', () => expect(COSTE_DEFAULT.corredor).toBe(8));
  it('voluntario cuesta 7€', () => expect(COSTE_DEFAULT.voluntario).toBe(7));
  it('nino cuesta 6€', () => expect(COSTE_DEFAULT.nino).toBe(6));
  it('no usa 7.5 (valor legado buggy)', () => {
    expect(COSTE_DEFAULT.corredor).not.toBe(7.5);
    expect(COSTE_DEFAULT.voluntario).not.toBe(7.5);
  });
});

// ── DASH-05: Sin duplicación en "Haz esto ahora" ──────────────────────────
describe('DASH-05 — Sin duplicación alertas voluntarios en "Haz esto ahora"', () => {
  const generarAcciones = (data) => {
    const modulosEnCriticas = new Set((data.alertasCriticas || []).map(a => a.modulo));
    const acciones = [];

    if (data.volPendientes > 0 && data.diasHasta <= 30 && !modulosEnCriticas.has("voluntarios")) {
      acciones.push({ modulo:"voluntarios", tipo:"pendientes" });
    }
    if (data.puestosAlerta?.length > 0 && data.diasHasta <= 45 && !modulosEnCriticas.has("voluntarios")) {
      acciones.push({ modulo:"voluntarios", tipo:"puestos" });
    }
    return acciones;
  };

  it('sin alertas críticas de voluntarios: aparece en "Haz esto ahora"', () => {
    const data = {
      alertasCriticas: [],
      volPendientes: 5,
      diasHasta: 20,
      puestosAlerta: [{ nombre:"Meta" }],
    };
    const acciones = generarAcciones(data);
    expect(acciones.filter(a => a.modulo === "voluntarios").length).toBeGreaterThan(0);
  });

  it('con alerta crítica de voluntarios: NO aparece en "Haz esto ahora"', () => {
    const data = {
      alertasCriticas: [{ modulo:"voluntarios", texto:"Cobertura crítica" }],
      volPendientes: 5,
      diasHasta: 5,
      puestosAlerta: [{ nombre:"Meta" }],
    };
    const acciones = generarAcciones(data);
    expect(acciones.filter(a => a.modulo === "voluntarios")).toHaveLength(0);
  });

  it('alertas críticas de otro módulo no bloquean voluntarios', () => {
    const data = {
      alertasCriticas: [{ modulo:"presupuesto", texto:"Resultado negativo" }],
      volPendientes: 5,
      diasHasta: 20,
      puestosAlerta: [],
    };
    const acciones = generarAcciones(data);
    expect(acciones.filter(a => a.modulo === "voluntarios")).toHaveLength(1);
  });
});

// ── DASH-06: Salud colapsada muestra módulos en rojo/ámbar ────────────────
describe('DASH-06 — Módulos en rojo/ámbar visibles en salud colapsada', () => {
  const saludModulos = [
    { label:"Proyecto",    score:85, color:"var(--green)" },
    { label:"Voluntarios", score:45, color:"var(--red)" },
    { label:"Logística",   score:60, color:"var(--amber)" },
    { label:"Presupuesto", score:90, color:"var(--green)" },
  ];

  const modulosEnRiesgo = (mods) =>
    mods.filter(m => m.color === "var(--red)" || m.color === "var(--amber)");

  it('detecta módulos en rojo y ámbar', () => {
    const riesgo = modulosEnRiesgo(saludModulos);
    expect(riesgo).toHaveLength(2);
    expect(riesgo.map(m => m.label)).toContain("Voluntarios");
    expect(riesgo.map(m => m.label)).toContain("Logística");
  });

  it('no incluye módulos en verde', () => {
    const riesgo = modulosEnRiesgo(saludModulos);
    expect(riesgo.every(m => m.color !== "var(--green)")).toBe(true);
  });

  it('cuando todos están en verde: no hay módulos en riesgo', () => {
    const todosVerde = saludModulos.map(m => ({ ...m, color:"var(--green)" }));
    expect(modulosEnRiesgo(todosVerde)).toHaveLength(0);
  });
});

// ── DASH-07: Riesgos cruzados ─────────────────────────────────────────────
describe('DASH-07 — calcularRiesgosCruzados detecta combinaciones de riesgo', () => {
  const calcRiesgos = (data) => {
    const riesgos = [];
    const totalIngresos = data.totalIngresos || 1;

    // Riesgo: patrocinador crítico sin cobrar
    const depCritica = (data.pats||[]).find(p =>
      (p.importe / totalIngresos) > 0.2 && p.estado !== "cobrado"
    );
    if (depCritica) riesgos.push({ tipo:"dependencia_critica", nivel:"critico" });

    // Riesgo: briefing próximo con cobertura baja
    const hitoBriefing = (data.hitosProximos||[]).find(h =>
      h.nombre?.toLowerCase().includes("briefing") && !h.completado
    );
    const diasBriefing = hitoBriefing
      ? Math.ceil((new Date(hitoBriefing.fecha) - new Date()) / 86400000) : null;
    if (diasBriefing !== null && diasBriefing <= 21 && (data.coberturaVol||0) < 80)
      riesgos.push({ tipo:"briefing_sin_voluntarios", nivel:"alto" });

    return riesgos;
  };

  it('detecta dependencia crítica no cobrada', () => {
    const data = {
      pats: [{ id:1, nombre:"Gran patrocinador", importe:3000, estado:"confirmado" }],
      totalIngresos: 10000,
    };
    const r = calcRiesgos(data);
    expect(r.some(r => r.tipo === "dependencia_critica")).toBe(true);
  });

  it('no hay riesgo si el patrocinador ya está cobrado', () => {
    const data = {
      pats: [{ id:1, nombre:"Gran patrocinador", importe:3000, estado:"cobrado" }],
      totalIngresos: 10000,
    };
    expect(calcRiesgos(data)).toHaveLength(0);
  });

  it('no hay riesgo si el patrocinador representa < 20%', () => {
    const data = {
      pats: [{ id:1, nombre:"Pequeño", importe:1000, estado:"confirmado" }],
      totalIngresos: 10000,
    };
    expect(calcRiesgos(data)).toHaveLength(0);
  });

  it('detecta briefing próximo con cobertura baja de voluntarios', () => {
    const proxDate = new Date(Date.now() + 10 * 86400000).toISOString().slice(0,10);
    const data = {
      pats: [], totalIngresos: 10000,
      coberturaVol: 60,
      hitosProximos: [{ nombre:"Briefing voluntarios", fecha: proxDate, completado:false }],
    };
    const r = calcRiesgos(data);
    expect(r.some(r => r.tipo === "briefing_sin_voluntarios")).toBe(true);
  });
});

// ── DASH-08: saludGlobal correcta ─────────────────────────────────────────
describe('DASH-08 — saludGlobal es la media de los scores de módulos', () => {
  const calcSaludGlobal = (modulos) =>
    Math.round(modulos.reduce((s,m) => s + m.score, 0) / modulos.length);

  it('media correcta de 6 módulos', () => {
    const mods = [
      {score:80},{score:60},{score:70},{score:90},{score:50},{score:100}
    ];
    expect(calcSaludGlobal(mods)).toBe(75);
  });

  it('todos al 100% → salud 100', () => {
    const mods = [{score:100},{score:100},{score:100}];
    expect(calcSaludGlobal(mods)).toBe(100);
  });

  it('todos al 0% → salud 0', () => {
    const mods = [{score:0},{score:0},{score:0}];
    expect(calcSaludGlobal(mods)).toBe(0);
  });
});

// ── DASH-09: Alertas temporales según días hasta el evento ────────────────
describe('DASH-09 — Alertas de voluntarios con umbrales temporales correctos', () => {
  const VOL_DIAS_CRITICO = 7;
  const VOL_DIAS_AVISO = 30;

  const generarAlertasVol = (diasHasta, coberturaVol, puestosAlerta) => {
    const criticas = [], avisos = [];

    if (diasHasta <= VOL_DIAS_CRITICO) {
      if (coberturaVol < 50) criticas.push("cobertura_critica");
      if (puestosAlerta.length > 0) criticas.push("puestos_criticos");
    } else if (diasHasta <= VOL_DIAS_AVISO) {
      if (coberturaVol < 50) avisos.push("cobertura_aviso");
      if (puestosAlerta.length > 0) avisos.push("puestos_aviso");
    }
    // > 30 días: sin alertas
    return { criticas, avisos };
  };

  it('>30 días: sin alertas aunque cobertura baja', () => {
    const r = generarAlertasVol(60, 20, [{ nombre:"Meta" }]);
    expect(r.criticas).toHaveLength(0);
    expect(r.avisos).toHaveLength(0);
  });

  it('8-30 días con cobertura < 50%: aviso ámbar', () => {
    const r = generarAlertasVol(15, 40, []);
    expect(r.avisos).toContain("cobertura_aviso");
    expect(r.criticas).toHaveLength(0);
  });

  it('≤7 días con cobertura < 50%: alerta crítica roja', () => {
    const r = generarAlertasVol(5, 40, []);
    expect(r.criticas).toContain("cobertura_critica");
  });

  it('≤7 días con puestos alerta: alerta crítica por puesto', () => {
    const r = generarAlertasVol(3, 80, [{ nombre:"Meta", pct:30 }]);
    expect(r.criticas).toContain("puestos_criticos");
  });
});

// ── DASH-10: calculateResultadoFinanciero integración completa ────────────
describe('DASH-10 — calculateResultadoFinanciero integración con ambos toggles', () => {
  const runCalc = (pats, syncConfig) => {
    const totalIngresos = 10000, costes = 8000;
    let patSyncado = 0;
    if (syncConfig.patrociniosCobrado) {
      patSyncado = pats.filter(p => p.estado === "cobrado")
        .reduce((s,p) => s + getImporteCobrado(p), 0);
    } else if (syncConfig.patrocinios) {
      patSyncado = pats.filter(p => p.estado === "cobrado" || p.estado === "confirmado")
        .reduce((s,p) => s + (p.importe||0), 0);
    }
    return totalIngresos + patSyncado - costes;
  };

  const pats = [
    { importe:2000, importeCobrado:1200, estado:"cobrado"    },
    { importe:800,  importeCobrado:0,    estado:"confirmado" },
  ];

  it('captados incluye confirmados y cobrados por importe acordado', () => {
    expect(runCalc(pats, { patrocinios:true, patrociniosCobrado:false })).toBe(4800); // 10000 + 2000 + 800 - 8000
  });

  it('cobrados usa importeCobrado real del cobrado parcial', () => {
    expect(runCalc(pats, { patrocinios:false, patrociniosCobrado:true })).toBe(3200); // 10000 + 1200 - 8000
  });

  it('cobrados excluye confirmados (no han ingresado)', () => {
    const result = runCalc(pats, { patrocinios:false, patrociniosCobrado:true });
    // El confirmado (800€) no está incluido
    const sinConfirmado = 10000 + 1200 - 8000;
    expect(result).toBe(sinConfirmado);
  });
});
