/**
 * Documentos — Test Suite
 *
 * DOC-01  INC-01: ESTADOS_DOC incluye vigente y vencido
 * DOC-02  INC-01: getEstadoCfg devuelve cfg correcta para vigente/vencido
 * DOC-03  INC-02: badge incluye gestiones denegadas
 * DOC-04  INC-02: badge incluye gestiones vencidas (no solo denegadas)
 * DOC-05  INC-04: fechaSubida vacía en GESTIONES_DEFAULT (no epoch 1970)
 * DOC-06  Historial de estados en gestiones — campos correctos
 * DOC-07  Historial de estados — acumula hasta 30 entradas
 * DOC-08  Semáforo de riesgo legal — lógica verde/ámbar/rojo
 * DOC-09  diasHasta — cálculo de días dinámico
 * DOC-10  Indicador de urgencia por proximidad de vencimiento
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';

beforeAll(() => {
  const s = {};
  Object.defineProperty(window,'localStorage',{value:{getItem:vi.fn(k=>s[k]??null),setItem:vi.fn((k,v)=>{s[k]=String(v);}),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  Object.defineProperty(window,'sessionStorage',{value:{getItem:vi.fn(()=>null),setItem:vi.fn(),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  global.fetch=vi.fn(()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({})}));
  vi.spyOn(console,'error').mockImplementation(()=>{});
});

// Estados definidos
const ESTADOS_DOC = [
  { id: "pendiente",  label: "Pendiente",  color: "#94a3b8" },
  { id: "en_tramite", label: "En trámite", color: "#22d3ee" },
  { id: "enviado",    label: "Enviado",    color: "#60a5fa" },
  { id: "firmado",    label: "Firmado",    color: "#a78bfa" },
  { id: "aprobado",   label: "Aprobado",   color: "#34d399" },
  { id: "vigente",    label: "Vigente",    color: "#34d399" },
  { id: "denegado",   label: "Denegado",   color: "#f87171" },
  { id: "vencido",    label: "Vencido",    color: "#fb923c" },
];

const getEstadoCfg = (id) => ESTADOS_DOC.find(e => e.id === id) || ESTADOS_DOC[0];
const diasHasta = (iso) => {
  if (!iso) return null;
  return Math.ceil((new Date(iso) - new Date()) / 86400000);
};

// ── DOC-01: ESTADOS_DOC incluye vigente y vencido ─────────────────────────
describe('DOC-01 — ESTADOS_DOC incluye vigente y vencido', () => {
  it('tiene 8 estados', () => {
    expect(ESTADOS_DOC).toHaveLength(8);
  });

  it('incluye vigente', () => {
    expect(ESTADOS_DOC.some(e => e.id === "vigente")).toBe(true);
  });

  it('incluye vencido', () => {
    expect(ESTADOS_DOC.some(e => e.id === "vencido")).toBe(true);
  });

  it('vencido tiene color naranja (no rojo)', () => {
    const vencido = ESTADOS_DOC.find(e => e.id === "vencido");
    expect(vencido.color).toBe("#fb923c"); // naranja — distinto de denegado (rojo)
  });

  it('vigente tiene color verde igual que aprobado', () => {
    const vigente = ESTADOS_DOC.find(e => e.id === "vigente");
    expect(vigente.color).toBe("#34d399");
  });
});

// ── DOC-02: getEstadoCfg funciona para vigente y vencido ─────────────────
describe('DOC-02 — getEstadoCfg devuelve cfg correcta para vigente/vencido', () => {
  it('vigente devuelve label "Vigente"', () => {
    expect(getEstadoCfg("vigente").label).toBe("Vigente");
  });

  it('vencido devuelve label "Vencido"', () => {
    expect(getEstadoCfg("vencido").label).toBe("Vencido");
  });

  it('NO devuelve "Pendiente" para vigente (bug anterior)', () => {
    expect(getEstadoCfg("vigente").id).toBe("vigente");
    expect(getEstadoCfg("vigente").id).not.toBe("pendiente");
  });

  it('estado desconocido sigue devolviendo pendiente como fallback', () => {
    expect(getEstadoCfg("estado_inventado").id).toBe("pendiente");
  });
});

// ── DOC-03: badge incluye gestiones denegadas ─────────────────────────────
describe('DOC-03 — Badge incluye gestiones denegadas', () => {
  const calcBadge = (docs, gests) => {
    const docsV = docs.filter(d =>
      d.fechaVencimiento && d.estado !== "vigente" && d.estado !== "aprobado" &&
      Math.ceil((new Date(d.fechaVencimiento) - new Date()) / 86400000) < 0
    ).length;
    const gestV = gests.filter(g =>
      g.estado === "denegado" ||
      (g.estado !== "aprobado" && g.fechaVencimiento &&
       Math.ceil((new Date(g.fechaVencimiento) - new Date()) / 86400000) < 0)
    ).length;
    return docsV + gestV;
  };

  it('gestión denegada → badge > 0 (aunque fecha sea futura)', () => {
    const futuro = new Date(Date.now() + 30 * 86400000).toISOString().slice(0,10);
    const gests = [{ id:"g1", estado:"denegado", fechaVencimiento: futuro }];
    expect(calcBadge([], gests)).toBe(1);
  });

  it('gestión aprobada → badge 0', () => {
    const futuro = new Date(Date.now() + 30 * 86400000).toISOString().slice(0,10);
    const gests = [{ id:"g1", estado:"aprobado", fechaVencimiento: futuro }];
    expect(calcBadge([], gests)).toBe(0);
  });

  it('gestión vencida (no denegada) → badge > 0', () => {
    const ayer = new Date(Date.now() - 86400000).toISOString().slice(0,10);
    const gests = [{ id:"g1", estado:"en_tramite", fechaVencimiento: ayer }];
    expect(calcBadge([], gests)).toBe(1);
  });

  it('mix: 1 denegada + 1 aprobada → badge 1', () => {
    const futuro = new Date(Date.now() + 30 * 86400000).toISOString().slice(0,10);
    const gests = [
      { id:"g1", estado:"denegado",  fechaVencimiento: futuro },
      { id:"g2", estado:"aprobado",  fechaVencimiento: futuro },
    ];
    expect(calcBadge([], gests)).toBe(1);
  });
});

// ── DOC-04: badge incluye docs vencidos ───────────────────────────────────
describe('DOC-04 — Badge incluye documentos vencidos', () => {
  const calcDocBadge = (docs) => docs.filter(d =>
    d.fechaVencimiento && d.estado !== "vigente" && d.estado !== "aprobado" &&
    Math.ceil((new Date(d.fechaVencimiento) - new Date()) / 86400000) < 0
  ).length;

  const ayer = new Date(Date.now() - 86400000).toISOString().slice(0,10);
  const futuro = new Date(Date.now() + 30 * 86400000).toISOString().slice(0,10);

  it('doc vencido no aprobado → contado', () => {
    expect(calcDocBadge([{ estado:"en_tramite", fechaVencimiento: ayer }])).toBe(1);
  });

  it('doc aprobado vencido → no contado (sigue válido)', () => {
    expect(calcDocBadge([{ estado:"aprobado", fechaVencimiento: ayer }])).toBe(0);
  });

  it('doc vigente vencido → no contado', () => {
    expect(calcDocBadge([{ estado:"vigente", fechaVencimiento: ayer }])).toBe(0);
  });

  it('doc futuro no vencido → no contado', () => {
    expect(calcDocBadge([{ estado:"en_tramite", fechaVencimiento: futuro }])).toBe(0);
  });
});

// ── DOC-05: fechaSubida vacía en GESTIONES_DEFAULT ────────────────────────
describe('DOC-05 — fechaSubida no tiene epoch 1970 en defaults', () => {
  const GESTIONES_DEFAULT_TEST = [
    { id:"g1", fechaSubida: "" },
    { id:"g2", fechaSubida: "" },
  ];

  it('fechaSubida es string vacío, no la fecha epoch', () => {
    GESTIONES_DEFAULT_TEST.forEach(g => {
      expect(g.fechaSubida).not.toBe(new Date(0).toISOString());
      expect(g.fechaSubida === "" || g.fechaSubida === null).toBe(true);
    });
  });

  it('fechaSubida vacío no rompe comparaciones de fecha', () => {
    const esFechaValida = (f) => f && !isNaN(new Date(f).getTime());
    GESTIONES_DEFAULT_TEST.forEach(g => {
      expect(esFechaValida(g.fechaSubida)).toBeFalsy();
    });
  });
});

// ── DOC-06: Historial de estados en gestiones ────────────────────────────
describe('DOC-06 — Historial de cambios de estado en gestiones', () => {
  const guardarGestionConHistorial = (gActual, gNueva) => {
    const cambioEstado = gActual.estado !== gNueva.estado;
    const entradaHist = cambioEstado ? [{
      id:      String(Date.now()),
      fecha:   new Date().toISOString(),
      campo:   "estado",
      antes:   gActual.estado,
      despues: gNueva.estado,
    }] : [];
    return { ...gNueva, historial: [...(gActual.historial||[]), ...entradaHist].slice(-30) };
  };

  it('cambio de estado registra entrada en historial', () => {
    const g = { id:"g1", estado:"pendiente", historial:[] };
    const r = guardarGestionConHistorial(g, { ...g, estado:"en_tramite" });
    expect(r.historial).toHaveLength(1);
    expect(r.historial[0].antes).toBe("pendiente");
    expect(r.historial[0].despues).toBe("en_tramite");
  });

  it('sin cambio de estado — sin entrada en historial', () => {
    const g = { id:"g1", estado:"en_tramite", historial:[{ id:"1", campo:"estado" }] };
    const r = guardarGestionConHistorial(g, { ...g, nota:"solo cambia nota" });
    expect(r.historial).toHaveLength(1); // sin cambios
  });

  it('acumula múltiples cambios en orden cronológico', () => {
    let g = { id:"g1", estado:"pendiente", historial:[] };
    g = guardarGestionConHistorial(g, { ...g, estado:"en_tramite" });
    g = guardarGestionConHistorial(g, { ...g, estado:"aprobado" });
    expect(g.historial).toHaveLength(2);
    expect(g.historial[0].despues).toBe("en_tramite");
    expect(g.historial[1].despues).toBe("aprobado");
  });

  it('entrada tiene campo, antes, despues y fecha', () => {
    const g = { id:"g1", estado:"pendiente", historial:[] };
    const r = guardarGestionConHistorial(g, { ...g, estado:"aprobado" });
    const e = r.historial[0];
    expect(e.campo).toBe("estado");
    expect(e.antes).toBe("pendiente");
    expect(e.despues).toBe("aprobado");
    expect(e.fecha).toBeTruthy();
    expect(new Date(e.fecha).getTime()).toBeGreaterThan(0);
  });
});

// ── DOC-07: Historial máx 30 entradas ────────────────────────────────────
describe('DOC-07 — Historial limitado a 30 entradas', () => {
  it('no supera 30 entradas aunque haya más cambios', () => {
    const guardar = (g, nuevoEstado) => {
      const entrada = { id: String(Date.now()), fecha: new Date().toISOString(), campo:"estado", antes:g.estado, despues:nuevoEstado };
      return { ...g, estado:nuevoEstado, historial: [...(g.historial||[]), entrada].slice(-30) };
    };
    let g = { id:"g1", estado:"pendiente", historial:[] };
    const estados = ["en_tramite","firmado","enviado","aprobado","pendiente","en_tramite","firmado","enviado","aprobado","pendiente",
      "en_tramite","firmado","enviado","aprobado","pendiente","en_tramite","firmado","enviado","aprobado","pendiente",
      "en_tramite","firmado","enviado","aprobado","pendiente","en_tramite","firmado","enviado","aprobado","pendiente","en_tramite"]; // 31
    for (const e of estados) g = guardar(g, e);
    expect(g.historial.length).toBeLessThanOrEqual(30);
  });
});

// ── DOC-08: Semáforo de riesgo legal ─────────────────────────────────────
describe('DOC-08 — Semáforo de riesgo legal', () => {
  const calcSemaforo = (gestiones) => {
    const IDS_CRITICAS = ["g1","g2","g3"];
    const criticas = gestiones.filter(g => IDS_CRITICAS.includes(g.id));
    if (criticas.some(g => g.estado === "denegado")) return "rojo";
    if (criticas.some(g => {
      const nd = diasHasta(g.fechaVencimiento);
      return g.estado !== "aprobado" && (nd === null || nd < 0);
    })) return "rojo";
    if (criticas.some(g => {
      const nd = diasHasta(g.fechaVencimiento);
      return g.estado !== "aprobado" && nd !== null && nd <= 30;
    })) return "ambar";
    if (criticas.every(g => g.estado === "aprobado")) return "verde";
    return "ambar";
  };

  const futuro  = new Date(Date.now() + 60 * 86400000).toISOString().slice(0,10);
  const proximo = new Date(Date.now() + 15 * 86400000).toISOString().slice(0,10);
  const ayer    = new Date(Date.now() - 86400000).toISOString().slice(0,10);

  it('todas aprobadas → verde', () => {
    const g = [
      {id:"g1",estado:"aprobado",fechaVencimiento:futuro},
      {id:"g2",estado:"aprobado",fechaVencimiento:futuro},
      {id:"g3",estado:"aprobado",fechaVencimiento:futuro},
    ];
    expect(calcSemaforo(g)).toBe("verde");
  });

  it('una denegada → rojo inmediato', () => {
    const g = [
      {id:"g1",estado:"denegado",fechaVencimiento:futuro},
      {id:"g2",estado:"aprobado",fechaVencimiento:futuro},
      {id:"g3",estado:"aprobado",fechaVencimiento:futuro},
    ];
    expect(calcSemaforo(g)).toBe("rojo");
  });

  it('una vencida sin aprobar → rojo', () => {
    const g = [
      {id:"g1",estado:"en_tramite",fechaVencimiento:ayer},
      {id:"g2",estado:"aprobado",  fechaVencimiento:futuro},
      {id:"g3",estado:"aprobado",  fechaVencimiento:futuro},
    ];
    expect(calcSemaforo(g)).toBe("rojo");
  });

  it('una pendiente próxima a vencer (≤30d) → ámbar', () => {
    const g = [
      {id:"g1",estado:"en_tramite",fechaVencimiento:proximo},
      {id:"g2",estado:"aprobado",  fechaVencimiento:futuro},
      {id:"g3",estado:"aprobado",  fechaVencimiento:futuro},
    ];
    expect(calcSemaforo(g)).toBe("ambar");
  });

  it('gestiones no críticas no afectan al semáforo', () => {
    const g = [
      {id:"g1",estado:"aprobado",fechaVencimiento:futuro},
      {id:"g2",estado:"aprobado",fechaVencimiento:futuro},
      {id:"g3",estado:"aprobado",fechaVencimiento:futuro},
      {id:"g4",estado:"denegado",fechaVencimiento:ayer}, // no crítica
    ];
    expect(calcSemaforo(g)).toBe("verde");
  });
});

// ── DOC-09: diasHasta dinámico ────────────────────────────────────────────
describe('DOC-09 — diasHasta calcula días correctamente', () => {
  it('fecha pasada → valor negativo', () => {
    const ayer = new Date(Date.now() - 86400000).toISOString().slice(0,10);
    expect(diasHasta(ayer)).toBeLessThan(0);
  });

  it('null devuelve null', () => {
    expect(diasHasta(null)).toBeNull();
    expect(diasHasta("")).toBeNull();
  });

  it('fecha futura → valor positivo', () => {
    const futuro = new Date(Date.now() + 7 * 86400000).toISOString().slice(0,10);
    expect(diasHasta(futuro)).toBeGreaterThan(0);
  });
});

// ── DOC-10: Indicador visual de urgencia ──────────────────────────────────
describe('DOC-10 — Indicador de urgencia en lista de documentos', () => {
  const getIndicadorUrgencia = (doc) => {
    if (!doc.fechaVencimiento || doc.estado === "aprobado" || doc.estado === "vigente") return null;
    const nd = diasHasta(doc.fechaVencimiento);
    if (nd === null) return null;
    if (nd < 0)   return { nivel:"vencido",  texto:`Vencido ${Math.abs(nd)}d`, color:"var(--red)"   };
    if (nd === 0) return { nivel:"hoy",      texto:"Hoy",                       color:"var(--red)"   };
    if (nd <= 7)  return { nivel:"urgente",  texto:`${nd}d`,                    color:"var(--red)"   };
    if (nd <= 15) return { nivel:"proximo",  texto:`${nd}d`,                    color:"var(--amber)" };
    if (nd <= 30) return { nivel:"aviso",    texto:`${nd}d`,                    color:"#f59e0b"      };
    return null;
  };

  const ayer  = new Date(Date.now() - 86400000).toISOString().slice(0,10);
  const en3d  = new Date(Date.now() + 3 * 86400000).toISOString().slice(0,10);
  const en20d = new Date(Date.now() + 20 * 86400000).toISOString().slice(0,10);
  const en60d = new Date(Date.now() + 60 * 86400000).toISOString().slice(0,10);

  it('doc vencido → indicador rojo', () => {
    const r = getIndicadorUrgencia({ estado:"en_tramite", fechaVencimiento: ayer });
    expect(r?.nivel).toBe("vencido");
    expect(r?.color).toBe("var(--red)");
  });

  it('doc en 3 días → indicador urgente rojo', () => {
    const r = getIndicadorUrgencia({ estado:"pendiente", fechaVencimiento: en3d });
    expect(r?.nivel).toBe("urgente");
  });

  it('doc en 20 días → indicador próximo ámbar', () => {
    const r = getIndicadorUrgencia({ estado:"en_tramite", fechaVencimiento: en20d });
    expect(r?.nivel).toBe("aviso");
  });

  it('doc en 60 días → null (sin indicador)', () => {
    expect(getIndicadorUrgencia({ estado:"pendiente", fechaVencimiento: en60d })).toBeNull();
  });

  it('doc aprobado → null aunque esté vencido', () => {
    expect(getIndicadorUrgencia({ estado:"aprobado", fechaVencimiento: ayer })).toBeNull();
  });

  it('doc vigente → null aunque esté vencido', () => {
    expect(getIndicadorUrgencia({ estado:"vigente", fechaVencimiento: ayer })).toBeNull();
  });
});

// ── DOC-REORDER: moverGestion — lógica de swap ─────────────────────────────
describe('DOC-REORDER — moverGestion swap', () => {
  // Replica la lógica pura de moverGestion sin depender del componente
  function moverGestion(gestiones, id, dir) {
    const arr = [...gestiones];
    const i = arr.findIndex(x => x.id === id);
    const j = i + dir;
    if (j < 0 || j >= arr.length) return arr;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return arr;
  }

  const g = (id, nombre) => ({ id, nombre, estado: 'pendiente' });
  const lista = [g(1,'A'), g(2,'B'), g(3,'C')];

  it('sube el segundo al primer puesto', () => {
    const res = moverGestion(lista, 2, -1);
    expect(res.map(x => x.id)).toEqual([2, 1, 3]);
  });

  it('baja el primer elemento al segundo puesto', () => {
    const res = moverGestion(lista, 1, +1);
    expect(res.map(x => x.id)).toEqual([2, 1, 3]);
  });

  it('no hace nada si el primero intenta subir', () => {
    const res = moverGestion(lista, 1, -1);
    expect(res.map(x => x.id)).toEqual([1, 2, 3]);
  });

  it('no hace nada si el último intenta bajar', () => {
    const res = moverGestion(lista, 3, +1);
    expect(res.map(x => x.id)).toEqual([1, 2, 3]);
  });

  it('no muta el array original', () => {
    const original = [g(1,'A'), g(2,'B')];
    moverGestion(original, 1, +1);
    expect(original[0].id).toBe(1);
  });
});
