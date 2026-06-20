/**
 * Proyecto — Test Suite
 *
 * PROY-01  diasHasta dinámico (no usa TODAY estático)
 * PROY-02  vencidas excluye tareas bloqueadas
 * PROY-03  badge Index.jsx excluye bloqueadas
 * PROY-04  updEstado — registra historial automático
 * PROY-05  updEstado — aviso de dependencia sin completar
 * PROY-06  updEstado — notifica tareas desbloqueadas al completar
 * PROY-07  Vista ¿Qué hago hoy? — agrupación correcta por urgencia
 * PROY-08  Vista ¿Qué hago hoy? — excluye completadas y bloqueadas
 * PROY-09  Historial — acumula hasta 20 entradas
 * PROY-10  Historial — campos correctos en la entrada
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
const diasHasta = (fecha) => Math.ceil((new Date(fecha) - new Date()) / 86400000);

const calcVencidas = (tareas) => tareas.filter(t =>
  t.estado !== "completado" && t.estado !== "bloqueado" &&
  t.fechaLimite && diasHasta(t.fechaLimite) < 0
);

const updEstadoFn = (prevTareas, id, estado) => {
  const tarea = prevTareas.find(t => t.id === id);
  if (!tarea) return { tareas: prevTareas, avisos: [], desbloqueadas: [] };
  const avisos = [];
  const desbloqueadas_notif = [];
  if ((estado === "en curso" || estado === "completado") && tarea.dependeDe) {
    const dep = prevTareas.find(t => t.id === tarea.dependeDe);
    if (dep && dep.estado !== "completado") avisos.push(dep.titulo);
  }
  const entrada = {
    id: String(Date.now()),
    fecha: new Date().toISOString(),
    campo: "estado",
    antes: tarea.estado,
    despues: estado,
  };
  const historial = [...(Array.isArray(tarea.historial) ? tarea.historial : []), entrada].slice(-20);
  if (estado === "completado") {
    prevTareas.filter(t => t.id !== id && t.dependeDe === id && t.estado === "pendiente")
      .forEach(t => desbloqueadas_notif.push(t.titulo));
  }
  return {
    tareas: prevTareas.map(t => t.id === id ? { ...t, estado, historial } : t),
    avisos,
    desbloqueadas: desbloqueadas_notif,
  };
};

// ── PROY-01: diasHasta dinámico ────────────────────────────────────────────
describe('PROY-01 — diasHasta usa new Date() dinámico', () => {
  it('fecha de hoy devuelve 0 o 1', () => {
    const hoy = new Date().toISOString().slice(0,10);
    const dias = diasHasta(hoy);
    expect([0, 1]).toContain(dias); // ceil puede ser 0 o 1 según hora
  });

  it('fecha de ayer devuelve valor negativo', () => {
    const ayer = new Date(Date.now() - 86400000).toISOString().slice(0,10);
    expect(diasHasta(ayer)).toBeLessThan(0);
  });

  it('fecha futura devuelve valor positivo', () => {
    const futuro = new Date(Date.now() + 7 * 86400000).toISOString().slice(0,10);
    expect(diasHasta(futuro)).toBeGreaterThan(0);
  });

  it('dos llamadas consecutivas dan el mismo resultado', () => {
    const fecha = "2026-12-31";
    expect(diasHasta(fecha)).toBe(diasHasta(fecha));
  });
});

// ── PROY-02: vencidas excluye bloqueadas ─────────────────────────────────
describe('PROY-02 — calcVencidas excluye tareas bloqueadas', () => {
  const ayer = new Date(Date.now() - 86400000).toISOString().slice(0,10);
  const tareas = [
    { id:1, estado:"pendiente",  fechaLimite:ayer },
    { id:2, estado:"bloqueado",  fechaLimite:ayer }, // debe excluirse
    { id:3, estado:"completado", fechaLimite:ayer }, // debe excluirse
    { id:4, estado:"en curso",   fechaLimite:ayer }, // debe incluirse
  ];

  it('pendiente vencida → incluida', () => {
    const r = calcVencidas(tareas);
    expect(r.some(t => t.id === 1)).toBe(true);
  });

  it('bloqueada vencida → excluida', () => {
    const r = calcVencidas(tareas);
    expect(r.some(t => t.id === 2)).toBe(false);
  });

  it('completada → excluida', () => {
    const r = calcVencidas(tareas);
    expect(r.some(t => t.id === 3)).toBe(false);
  });

  it('en curso vencida → incluida', () => {
    const r = calcVencidas(tareas);
    expect(r.some(t => t.id === 4)).toBe(true);
  });

  it('total correcto: 2 vencidas (no 3)', () => {
    expect(calcVencidas(tareas)).toHaveLength(2);
  });
});

// ── PROY-03: badge Index.jsx excluye bloqueadas ───────────────────────────
describe('PROY-03 — Badge de tareas vencidas excluye bloqueadas', () => {
  const calcBadge = (tareas) => tareas.filter(t =>
    t.estado !== "completado" && t.estado !== "bloqueado" &&
    t.fechaLimite && Math.ceil((new Date(t.fechaLimite) - new Date()) / 86400000) < 0
  ).length;

  const ayer = new Date(Date.now() - 86400000).toISOString().slice(0,10);

  it('bloqueada vencida no incrementa el badge', () => {
    const tareas = [{ id:1, estado:"bloqueado", fechaLimite:ayer }];
    expect(calcBadge(tareas)).toBe(0);
  });

  it('pendiente vencida incrementa el badge', () => {
    const tareas = [{ id:1, estado:"pendiente", fechaLimite:ayer }];
    expect(calcBadge(tareas)).toBe(1);
  });

  it('mix de 3 tareas → badge = 1 (solo la pendiente)', () => {
    const tareas = [
      { id:1, estado:"pendiente",  fechaLimite:ayer },
      { id:2, estado:"bloqueado",  fechaLimite:ayer },
      { id:3, estado:"completado", fechaLimite:ayer },
    ];
    expect(calcBadge(tareas)).toBe(1);
  });
});

// ── PROY-04: updEstado registra historial ─────────────────────────────────
describe('PROY-04 — updEstado registra historial automático', () => {
  const tareas = [
    { id:1, estado:"pendiente", historial:[], dependeDe:null },
  ];

  it('cambia el estado correctamente', () => {
    const r = updEstadoFn(tareas, 1, "en curso");
    expect(r.tareas[0].estado).toBe("en curso");
  });

  it('registra una entrada en historial', () => {
    const r = updEstadoFn(tareas, 1, "en curso");
    expect(r.tareas[0].historial).toHaveLength(1);
  });

  it('entrada tiene los campos correctos', () => {
    const r = updEstadoFn(tareas, 1, "en curso");
    const h = r.tareas[0].historial[0];
    expect(h.campo).toBe("estado");
    expect(h.antes).toBe("pendiente");
    expect(h.despues).toBe("en curso");
    expect(h.fecha).toBeTruthy();
  });

  it('acumula múltiples cambios', () => {
    let t = tareas;
    t = updEstadoFn(t, 1, "en curso").tareas;
    t = updEstadoFn(t, 1, "completado").tareas;
    expect(t[0].historial).toHaveLength(2);
    expect(t[0].historial[1].antes).toBe("en curso");
    expect(t[0].historial[1].despues).toBe("completado");
  });
});

// ── PROY-05: aviso de dependencia ─────────────────────────────────────────
describe('PROY-05 — Aviso al activar tarea con dependencia sin completar', () => {
  const tareas = [
    { id:1, estado:"pendiente",  historial:[], dependeDe:null },
    { id:2, estado:"pendiente",  historial:[], dependeDe:1 },   // depende de 1
    { id:3, estado:"completado", historial:[], dependeDe:null },
    { id:4, estado:"pendiente",  historial:[], dependeDe:3 },   // depende de 3 (completada)
  ];

  it('avisa si la dependencia no está completada', () => {
    const r = updEstadoFn(tareas, 2, "en curso");
    expect(r.avisos).toHaveLength(1); // tarea 1 no completada
  });

  it('no avisa si la dependencia sí está completada', () => {
    const r = updEstadoFn(tareas, 4, "en curso");
    expect(r.avisos).toHaveLength(0); // tarea 3 completada
  });

  it('no avisa si no hay dependencia', () => {
    const r = updEstadoFn(tareas, 1, "en curso");
    expect(r.avisos).toHaveLength(0);
  });
});

// ── PROY-06: notificación de tareas desbloqueadas ─────────────────────────
describe('PROY-06 — Notifica tareas desbloqueadas al completar', () => {
  const tareas = [
    { id:1, estado:"en curso",  historial:[], dependeDe:null },
    { id:2, estado:"pendiente", historial:[], dependeDe:1 },   // se desbloquea al completar 1
    { id:3, estado:"pendiente", historial:[], dependeDe:1 },   // también se desbloquea
    { id:4, estado:"en curso",  historial:[], dependeDe:1 },   // ya en curso — no notifica
  ];

  it('al completar notifica las tareas pendientes que dependen de ella', () => {
    const r = updEstadoFn(tareas, 1, "completado");
    expect(r.desbloqueadas).toHaveLength(2); // id=2 y id=3
  });

  it('no notifica tareas que ya estaban en curso o completadas', () => {
    const r = updEstadoFn(tareas, 1, "completado");
    expect(r.desbloqueadas.length).toBe(2); // id=4 no incluido (en curso)
  });

  it('si no hay tareas pendientes dependientes, sin notificación', () => {
    const solas = [{ id:5, estado:"pendiente", historial:[], dependeDe:null }];
    const r = updEstadoFn(solas, 5, "completado");
    expect(r.desbloqueadas).toHaveLength(0);
  });
});

// ── PROY-07: Vista ¿Qué hago hoy? ────────────────────────────────────────
describe('PROY-07 — Vista ¿Qué hago hoy? agrupa por urgencia', () => {
  const hoy = new Date();
  const ayer = (n = 1) => new Date(hoy.getTime() - n * 86400000).toISOString().slice(0,10);
  const manana = (n = 1) => new Date(hoy.getTime() + n * 86400000).toISOString().slice(0,10);

  const calcGrupos = (tareas) => {
    const activas = tareas.filter(t => t.estado !== "completado" && t.estado !== "bloqueado" && t.fechaLimite);
    const calcDias = (f) => Math.ceil((new Date(f) - hoy) / 86400000);
    return {
      rojas:     activas.filter(t => calcDias(t.fechaLimite) < 0),
      amarillas: activas.filter(t => calcDias(t.fechaLimite) >= 0 && calcDias(t.fechaLimite) <= 7),
      azules:    activas.filter(t => calcDias(t.fechaLimite) > 7 && calcDias(t.fechaLimite) <= 30),
    };
  };

  const tareas = [
    { id:1, estado:"pendiente",  fechaLimite:ayer(3)    }, // vencida → roja
    { id:2, estado:"pendiente",  fechaLimite:manana(3)  }, // esta semana → amarilla
    { id:3, estado:"pendiente",  fechaLimite:manana(15) }, // próximo mes → azul
    { id:4, estado:"completado", fechaLimite:ayer(1)    }, // excluida
    { id:5, estado:"bloqueado",  fechaLimite:ayer(2)    }, // excluida
    { id:6, estado:"pendiente",  fechaLimite:manana(60) }, // demasiado lejos — excluida de azul
  ];

  it('agrupa vencidas en rojo', () => {
    expect(calcGrupos(tareas).rojas.map(t => t.id)).toContain(1);
  });

  it('agrupa esta semana en amarillo', () => {
    expect(calcGrupos(tareas).amarillas.map(t => t.id)).toContain(2);
  });

  it('agrupa próximos 30 días en azul', () => {
    expect(calcGrupos(tareas).azules.map(t => t.id)).toContain(3);
  });

  it('excluye completadas', () => {
    const g = calcGrupos(tareas);
    const todos = [...g.rojas, ...g.amarillas, ...g.azules].map(t => t.id);
    expect(todos).not.toContain(4);
  });

  it('excluye bloqueadas', () => {
    const g = calcGrupos(tareas);
    const todos = [...g.rojas, ...g.amarillas, ...g.azules].map(t => t.id);
    expect(todos).not.toContain(5);
  });

  it('excluye tareas > 30 días de azul', () => {
    expect(calcGrupos(tareas).azules.map(t => t.id)).not.toContain(6);
  });
});

// ── PROY-08: Vista ¿Qué hago hoy? estado vacío ──────────────────────────
describe('PROY-08 — Vista ¿Qué hago hoy? muestra OK cuando no hay urgentes', () => {
  const calcGrupos = (tareas) => {
    const hoy = new Date();
    const activas = tareas.filter(t => t.estado !== "completado" && t.estado !== "bloqueado" && t.fechaLimite);
    const calcDias = (f) => Math.ceil((new Date(f) - hoy) / 86400000);
    return {
      rojas:     activas.filter(t => calcDias(t.fechaLimite) < 0),
      amarillas: activas.filter(t => calcDias(t.fechaLimite) >= 0 && calcDias(t.fechaLimite) <= 7),
    };
  };

  it('sin vencidas ni urgentes → ambos grupos vacíos', () => {
    const futuro = new Date(Date.now() + 60 * 86400000).toISOString().slice(0,10);
    const tareas = [{ id:1, estado:"pendiente", fechaLimite:futuro }];
    const g = calcGrupos(tareas);
    expect(g.rojas).toHaveLength(0);
    expect(g.amarillas).toHaveLength(0);
  });

  it('todas completadas → sin grupos', () => {
    const ayer = new Date(Date.now() - 86400000).toISOString().slice(0,10);
    const tareas = [{ id:1, estado:"completado", fechaLimite:ayer }];
    const g = calcGrupos(tareas);
    expect(g.rojas).toHaveLength(0);
    expect(g.amarillas).toHaveLength(0);
  });
});

// ── PROY-09: Historial máx 20 entradas ───────────────────────────────────
describe('PROY-09 — Historial limitado a 20 entradas', () => {
  it('no supera 20 entradas aunque haya más cambios', () => {
    let tareas = [{ id:1, estado:"pendiente", historial:[], dependeDe:null }];
    const estados = ["en curso","pendiente","en curso","completado","en curso","pendiente",
      "completado","pendiente","en curso","completado","pendiente","en curso",
      "completado","pendiente","en curso","completado","pendiente","en curso",
      "completado","pendiente","en curso","completado"]; // 22 cambios
    for (const e of estados) {
      tareas = updEstadoFn(tareas, 1, e).tareas;
    }
    expect(tareas[0].historial.length).toBeLessThanOrEqual(20);
  });
});

// ── PROY-10: Estructura de entrada de historial ───────────────────────────
describe('PROY-10 — Estructura correcta de entrada de historial', () => {
  it('entry tiene id, fecha, campo, antes, despues', () => {
    const tareas = [{ id:1, estado:"pendiente", historial:[], dependeDe:null }];
    const r = updEstadoFn(tareas, 1, "completado");
    const entry = r.tareas[0].historial[0];
    expect(entry.id).toBeTruthy();
    expect(entry.fecha).toBeTruthy();
    expect(entry.campo).toBe("estado");
    expect(entry.antes).toBe("pendiente");
    expect(entry.despues).toBe("completado");
  });

  it('fecha es una cadena ISO válida', () => {
    const tareas = [{ id:1, estado:"pendiente", historial:[], dependeDe:null }];
    const r = updEstadoFn(tareas, 1, "en curso");
    const fecha = r.tareas[0].historial[0].fecha;
    expect(() => new Date(fecha)).not.toThrow();
    expect(new Date(fecha).getTime()).toBeGreaterThan(0);
  });
});

// ── SYNC-03: sincronización inversa Proyecto → CK ─────────────────────────
describe('SYNC-03 updEstado Proyecto propaga estado a ítems CK vinculados', () => {
  // Simulación de la lógica de propagación inversa de updEstado
  function propagarACK(ckActual, tareaId, nuevoEstado) {
    if (!Array.isArray(ckActual)) return ckActual;
    const ckEstado = nuevoEstado === 'completado' ? 'completado' : 'pendiente';
    return ckActual.map(c =>
      c.proyectoTareaId === tareaId ? { ...c, estado: ckEstado } : c
    );
  }

  const ckBase = [
    { id: 1, tarea: 'Confirmar autorización', estado: 'pendiente', proyectoTareaId: 1 },
    { id: 2, tarea: 'Señalizar ruta',         estado: 'pendiente', proyectoTareaId: 35 },
    { id: 3, tarea: 'Sin vínculo',             estado: 'pendiente', proyectoTareaId: null },
  ];

  it('completar tarea Proyecto → CK vinculado pasa a "completado"', () => {
    const resultado = propagarACK(ckBase, 1, 'completado');
    expect(resultado.find(c => c.id === 1).estado).toBe('completado');
  });

  it('revertir tarea Proyecto → CK vinculado vuelve a "pendiente"', () => {
    const ckConCompletado = ckBase.map(c => c.id === 1 ? { ...c, estado: 'completado' } : c);
    const resultado = propagarACK(ckConCompletado, 1, 'pendiente');
    expect(resultado.find(c => c.id === 1).estado).toBe('pendiente');
  });

  it('cambio en tarea Proyecto no afecta a ítems CK sin vínculo', () => {
    const resultado = propagarACK(ckBase, 1, 'completado');
    expect(resultado.find(c => c.id === 3).estado).toBe('pendiente');
  });

  it('cambio en tarea Proyecto no afecta a ítems CK vinculados a OTRA tarea', () => {
    const resultado = propagarACK(ckBase, 1, 'completado');
    expect(resultado.find(c => c.id === 2).estado).toBe('pendiente');
  });

  it('"en curso" en Proyecto pone CK en "pendiente" (no en curso — CK no tiene ese estado)', () => {
    const resultado = propagarACK(ckBase, 1, 'en curso');
    expect(resultado.find(c => c.id === 1).estado).toBe('pendiente');
    expect(resultado.find(c => c.id === 1).estado).not.toBe('en curso');
  });

  it('propagación con CK vacío no falla', () => {
    expect(() => propagarACK([], 1, 'completado')).not.toThrow();
    expect(propagarACK([], 1, 'completado')).toEqual([]);
  });

  it('propagación con CK null devuelve el mismo valor (guard)', () => {
    expect(propagarACK(null, 1, 'completado')).toBe(null);
  });
});

// ── SYNC-04: cálculo del widget de progreso cruzado ───────────────────────
describe('SYNC-04 widget CK en TabDash Proyecto — cálculos correctos', () => {
  const ckSample = [
    { id:1, estado:'completado',  proyectoTareaId: 1  },
    { id:2, estado:'completado',  proyectoTareaId: 41 },
    { id:3, estado:'pendiente',   proyectoTareaId: 42 },
    { id:4, estado:'pendiente',   proyectoTareaId: null },
    { id:5, estado:'completado',  proyectoTareaId: null },
  ];

  const calcWidget = (ck) => {
    const total    = ck.length;
    const done     = ck.filter(c => c.estado === 'completado').length;
    const pct      = total > 0 ? Math.round(done / total * 100) : 0;
    const vinc     = ck.filter(c => c.proyectoTareaId != null);
    const vincDone = vinc.filter(c => c.estado === 'completado').length;
    return { total, done, pct, vincTotal: vinc.length, vincDone };
  };

  it('total, done y pct correctos', () => {
    const r = calcWidget(ckSample);
    expect(r.total).toBe(5);
    expect(r.done).toBe(3);
    expect(r.pct).toBe(60);
  });

  it('vinculados totales y completados correctos', () => {
    const r = calcWidget(ckSample);
    expect(r.vincTotal).toBe(3); // ids 1,2,3 tienen proyectoTareaId
    expect(r.vincDone).toBe(2);  // ids 1,2 están completados
  });

  it('pct es 100 cuando todos completados', () => {
    const todos = ckSample.map(c => ({ ...c, estado:'completado' }));
    expect(calcWidget(todos).pct).toBe(100);
  });

  it('pct es 0 con array vacío (no divide por cero)', () => {
    expect(calcWidget([]).pct).toBe(0);
  });
});

// ── SYNC-05: widget de Proyecto en TabDashLog — filtro de áreas ──────────
describe('SYNC-05 widget Proyecto en TabDashLog — filtro áreas logistica/ruta/diaD/sanitario', () => {
  const tareasSample = [
    { id:38, area:'logistica', estado:'pendiente',   titulo:'Inventario material',  fechaLimite:'2026-04-30' },
    { id:39, area:'logistica', estado:'completado',  titulo:'Lista material',        fechaLimite:'2026-05-15' },
    { id:35, area:'ruta',      estado:'pendiente',   titulo:'Señalización ruta',     fechaLimite:'2026-08-25' },
    { id:48, area:'diaD',      estado:'pendiente',   titulo:'Montaje zona meta',     fechaLimite:'2026-08-29' },
    { id:41, area:'sanitario', estado:'completado',  titulo:'Servicio médico',       fechaLimite:'2026-05-15' },
    { id:1,  area:'permisos',  estado:'pendiente',   titulo:'Autorización local',    fechaLimite:'2026-04-01' },
    { id:7,  area:'economico', estado:'pendiente',   titulo:'Cierre presupuesto',    fechaLimite:'2026-04-01' },
  ];

  const AREAS_LOG = ['logistica','ruta','diaD','sanitario'];
  const filtrar = (ts) => ts.filter(t => AREAS_LOG.includes(t.area));

  it('solo incluye áreas logistica, ruta, diaD, sanitario', () => {
    const r = filtrar(tareasSample);
    expect(r).toHaveLength(5);
    expect(r.every(t => AREAS_LOG.includes(t.area))).toBe(true);
  });

  it('excluye permisos, economico y otras áreas', () => {
    const r = filtrar(tareasSample);
    expect(r.find(t => t.area === 'permisos')).toBeUndefined();
    expect(r.find(t => t.area === 'economico')).toBeUndefined();
  });

  it('pct logístico correcto sobre las tareas filtradas', () => {
    const r = filtrar(tareasSample);
    const done = r.filter(t => t.estado === 'completado').length;
    const pct  = Math.round(done / r.length * 100);
    expect(done).toBe(2); // logistica(completado) + sanitario(completado)
    expect(pct).toBe(40);
  });
});

// ── MEJORA-02: auto-promoción de tareas a hitos ───────────────────────────
// Las funciones son exports nombrados de Proyecto.jsx. Las replicamos aquí
// como funciones puras para testear sin el entorno React.

const AREAS_CON_HITO_AUTO = new Set(["logistica","diaD","ruta","sanitario"]);

function calcHitoDesdeArea(tarea) {
  if (!tarea) return null;
  if (!AREAS_CON_HITO_AUTO.has(tarea.area)) return null;
  if (tarea.prioridad !== "alta") return null;
  if (!tarea.fechaLimite) return null;
  return {
    nombre:    `📋 ${tarea.titulo}`,
    fecha:     tarea.fechaLimite,
    critico:   false,
    completado: tarea.estado === "completado",
    _tareaId:  tarea.id,
  };
}

function syncHitoTarea(hitos, tarea, action = "upsert") {
  const lista = Array.isArray(hitos) ? hitos : [];
  const idx   = lista.findIndex(h => h._tareaId === tarea.id);

  if (action === "remove") {
    return idx === -1 ? lista : lista.filter((_, i) => i !== idx);
  }

  const datos = calcHitoDesdeArea(tarea);

  if (!datos) {
    return idx === -1 ? lista : lista.filter((_, i) => i !== idx);
  }

  if (idx === -1) {
    const maxId = lista.reduce((m, h) => Math.max(m, typeof h.id === "number" ? h.id : 0), 0);
    return [...lista, { ...datos, id: maxId + 1 }];
  }

  return lista.map((h, i) =>
    i === idx ? { ...h, ...datos, id: h.id } : h
  );
}

// ── calcHitoDesdeArea ────────────────────────────────────────────────────
describe('MEJORA-02a calcHitoDesdeArea — criterios de promoción', () => {
  const tareaBase = { id:38, area:"logistica", titulo:"Inventario material", prioridad:"alta", fechaLimite:"2026-04-30", estado:"pendiente" };

  it('genera hito para logistica+alta+fecha', () => {
    expect(calcHitoDesdeArea(tareaBase)).not.toBeNull();
  });

  it('genera hito para diaD+alta+fecha', () => {
    expect(calcHitoDesdeArea({ ...tareaBase, area:"diaD" })).not.toBeNull();
  });

  it('genera hito para ruta+alta+fecha', () => {
    expect(calcHitoDesdeArea({ ...tareaBase, area:"ruta" })).not.toBeNull();
  });

  it('genera hito para sanitario+alta+fecha', () => {
    expect(calcHitoDesdeArea({ ...tareaBase, area:"sanitario" })).not.toBeNull();
  });

  it('NO genera hito para permisos (área excluida)', () => {
    expect(calcHitoDesdeArea({ ...tareaBase, area:"permisos" })).toBeNull();
  });

  it('NO genera hito para economico', () => {
    expect(calcHitoDesdeArea({ ...tareaBase, area:"economico" })).toBeNull();
  });

  it('NO genera hito con prioridad media', () => {
    expect(calcHitoDesdeArea({ ...tareaBase, prioridad:"media" })).toBeNull();
  });

  it('NO genera hito sin fechaLimite', () => {
    expect(calcHitoDesdeArea({ ...tareaBase, fechaLimite:null })).toBeNull();
  });

  it('nombre del hito incluye el título de la tarea con prefijo 📋', () => {
    const h = calcHitoDesdeArea(tareaBase);
    expect(h.nombre).toBe("📋 Inventario material");
  });

  it('fecha del hito coincide con fechaLimite de la tarea', () => {
    expect(calcHitoDesdeArea(tareaBase).fecha).toBe("2026-04-30");
  });

  it('hito completado=true si tarea está completada', () => {
    expect(calcHitoDesdeArea({ ...tareaBase, estado:"completado" }).completado).toBe(true);
  });

  it('hito completado=false si tarea en curso', () => {
    expect(calcHitoDesdeArea({ ...tareaBase, estado:"en curso" }).completado).toBe(false);
  });

  it('_tareaId del hito es el id de la tarea', () => {
    expect(calcHitoDesdeArea(tareaBase)._tareaId).toBe(38);
  });

  it('critico siempre false (el usuario puede editarlo manualmente)', () => {
    expect(calcHitoDesdeArea(tareaBase).critico).toBe(false);
  });

  it('devuelve null para null', () => {
    expect(calcHitoDesdeArea(null)).toBeNull();
  });
});

// ── syncHitoTarea ────────────────────────────────────────────────────────
describe('MEJORA-02b syncHitoTarea — upsert / remove de hitos', () => {
  const tarea = { id:38, area:"logistica", titulo:"Inventario material", prioridad:"alta", fechaLimite:"2026-04-30", estado:"pendiente" };
  const hitosPrevios = [
    { id:1, nombre:"Hito manual",   fecha:"2026-05-01", critico:true, completado:false },
    { id:2, nombre:"Hito manual 2", fecha:"2026-06-01", critico:false, completado:false },
  ];

  it('crea hito nuevo cuando no existe ninguno con ese _tareaId', () => {
    const r = syncHitoTarea(hitosPrevios, tarea);
    expect(r).toHaveLength(3);
    expect(r.find(h => h._tareaId === 38)).toBeDefined();
  });

  it('el nuevo hito tiene id > máximo existente', () => {
    const r = syncHitoTarea(hitosPrevios, tarea);
    const nuevo = r.find(h => h._tareaId === 38);
    expect(nuevo.id).toBeGreaterThan(2);
  });

  it('no crea duplicados si ya existe un hito para esa tarea', () => {
    const hitosConExistente = [...hitosPrevios, { id:3, _tareaId:38, nombre:"📋 Inventario material", fecha:"2026-04-30", critico:false, completado:false }];
    const r = syncHitoTarea(hitosConExistente, tarea);
    expect(r.filter(h => h._tareaId === 38)).toHaveLength(1);
    expect(r).toHaveLength(3);
  });

  it('actualiza nombre y fecha al editar la tarea sin cambiar el id del hito', () => {
    const hitosConExistente = [...hitosPrevios, { id:99, _tareaId:38, nombre:"📋 Viejo nombre", fecha:"2026-01-01", critico:false, completado:false }];
    const r = syncHitoTarea(hitosConExistente, { ...tarea, titulo:"Inventario actualizado", fechaLimite:"2026-05-15" });
    const h = r.find(h => h._tareaId === 38);
    expect(h.nombre).toBe("📋 Inventario actualizado");
    expect(h.fecha).toBe("2026-05-15");
    expect(h.id).toBe(99); // id preservado
  });

  it('marca hito como completado cuando la tarea se completa', () => {
    const r = syncHitoTarea(hitosPrevios, { ...tarea, estado:"completado" });
    expect(r.find(h => h._tareaId === 38).completado).toBe(true);
  });

  it('desmarca hito al revertir tarea a pendiente', () => {
    const hitosConCompletado = [...hitosPrevios, { id:3, _tareaId:38, completado:true }];
    const r = syncHitoTarea(hitosConCompletado, { ...tarea, estado:"pendiente" });
    expect(r.find(h => h._tareaId === 38).completado).toBe(false);
  });

  it('elimina hito con action="remove"', () => {
    const hitosConExistente = [...hitosPrevios, { id:3, _tareaId:38 }];
    const r = syncHitoTarea(hitosConExistente, tarea, "remove");
    expect(r.find(h => h._tareaId === 38)).toBeUndefined();
    expect(r).toHaveLength(2);
  });

  it('remove no afecta a hitos manuales sin _tareaId', () => {
    const r = syncHitoTarea(hitosPrevios, tarea, "remove");
    expect(r).toHaveLength(2); // nada que eliminar, los manuales intactos
  });

  it('si la tarea baja prioridad a media, elimina el hito existente', () => {
    const hitosConExistente = [...hitosPrevios, { id:3, _tareaId:38 }];
    const r = syncHitoTarea(hitosConExistente, { ...tarea, prioridad:"media" });
    expect(r.find(h => h._tareaId === 38)).toBeUndefined();
  });

  it('si la tarea pierde fechaLimite, elimina el hito existente', () => {
    const hitosConExistente = [...hitosPrevios, { id:3, _tareaId:38 }];
    const r = syncHitoTarea(hitosConExistente, { ...tarea, fechaLimite:null });
    expect(r.find(h => h._tareaId === 38)).toBeUndefined();
  });

  it('hitos manuales nunca se modifican', () => {
    const r = syncHitoTarea(hitosPrevios, tarea);
    expect(r.find(h => h.id === 1)).toEqual(hitosPrevios[0]);
    expect(r.find(h => h.id === 2)).toEqual(hitosPrevios[1]);
  });

  it('funciona con lista de hitos vacía', () => {
    const r = syncHitoTarea([], tarea);
    expect(r).toHaveLength(1);
    expect(r[0]._tareaId).toBe(38);
  });

  it('funciona con lista null (guard)', () => {
    expect(() => syncHitoTarea(null, tarea)).not.toThrow();
    expect(syncHitoTarea(null, tarea)).toHaveLength(1);
  });
});

// ── Coherencia con TAREAS0 — todas las altas+área+fecha generan hito ─────
describe('MEJORA-02c coherencia TAREAS0 — auto-promoción de datos semilla', () => {
  it('al menos 10 tareas de TAREAS0 cumplen criterios de auto-promoción', async () => {
    const { TAREAS0 } = await import('../components/proyecto/proyectoConstants.js');
    const candidatas = TAREAS0.filter(t => calcHitoDesdeArea(t) !== null);
    expect(candidatas.length).toBeGreaterThanOrEqual(10);
  });

  it('ninguna tarea de área permisos/economico/comunicacion genera hito automático', async () => {
    const { TAREAS0 } = await import('../components/proyecto/proyectoConstants.js');
    const no_deben = TAREAS0.filter(t =>
      ["permisos","economico","comunicacion","camisetas","patrocinadores"].includes(t.area)
    );
    const generan = no_deben.filter(t => calcHitoDesdeArea(t) !== null);
    expect(generan).toHaveLength(0);
  });

  it('ids de hitos auto-generados son únicos si se aplican todos a lista vacía', async () => {
    const { TAREAS0 } = await import('../components/proyecto/proyectoConstants.js');
    const candidatas = TAREAS0.filter(t => calcHitoDesdeArea(t) !== null);
    let hitos = [];
    for (const t of candidatas) {
      hitos = syncHitoTarea(hitos, t);
    }
    const ids = hitos.map(h => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('aplicar syncHitoTarea dos veces con la misma tarea no duplica hitos (idempotente)', async () => {
    const { TAREAS0 } = await import('../components/proyecto/proyectoConstants.js');
    const tarea = TAREAS0.find(t => t.area === "logistica" && t.prioridad === "alta" && t.fechaLimite);
    let hitos = syncHitoTarea([], tarea);
    hitos = syncHitoTarea(hitos, tarea);
    expect(hitos.filter(h => h._tareaId === tarea.id)).toHaveLength(1);
  });
});

// ── SYNC INTERCONEXIÓN: GAP-B, GAP-C, GAP-E ─────────────────────────────────

describe('SYNC-INTER-01: updHito reverse-sync pedido (GAP-C lógica pura, N:1)', () => {
  // Réplica fiel de getPedidoIdsHito (sin I/O)
  function getPedidoIdsHito(hito) {
    if (Array.isArray(hito?._pedidoIds)) return hito._pedidoIds;
    if (hito?._pedidoId != null) return [hito._pedidoId];
    return [];
  }

  // Réplica fiel de la decisión tomada en el handler GAP-C de Proyecto.jsx
  function aplicarSyncReverso(pedidos, pedidoIdsHito, val) {
    let cambio = false;
    const next = pedidos.map(p => {
      if (!pedidoIdsHito.includes(p.id)) return p;
      if (val && (p.estado === "borrador" || p.estado === "confirmado")) { cambio = true; return { ...p, estado: "recibido" }; }
      if (!val && p.estado === "recibido") { cambio = true; return { ...p, estado: "confirmado" }; }
      return p;
    });
    return { next, cambio };
  }

  it('hito completado con _pedidoIds → estado de pedidos elegibles cambia a recibido', () => {
    const pedidos = [
      { id: 10, nombre: "Medallas finisher", estado: "confirmado" },
      { id: 11, nombre: "Dorsales",          estado: "borrador" },
    ];
    const hitoActual = { id: 99, nombre: "🛒 Pedido: Medallas finisher", _pedidoIds: [10], completado: false };
    const pedidoIdsHito = getPedidoIdsHito(hitoActual);
    const { next, cambio } = aplicarSyncReverso(pedidos, pedidoIdsHito, true);
    expect(cambio).toBe(true);
    expect(next[0].estado).toBe("recibido");
    expect(next[1].estado).toBe("borrador"); // no tocado (no vinculado a este hito)
  });

  it('hito desmarcado con _pedidoIds → pedido en "recibido" vuelve a "confirmado"', () => {
    const pedidos = [{ id: 10, nombre: "Medallas finisher", estado: "recibido" }];
    const hitoActual = { id: 99, _pedidoIds: [10], completado: true };
    const { next, cambio } = aplicarSyncReverso(pedidos, getPedidoIdsHito(hitoActual), false);
    expect(cambio).toBe(true);
    expect(next[0].estado).toBe("confirmado");
  });

  it('hito con pedido en estado "facturado" NO se modifica al desmarcar hito', () => {
    const pedidos = [{ id: 10, estado: "facturado" }];
    const { next, cambio } = aplicarSyncReverso(pedidos, [10], false);
    expect(cambio).toBe(false); // facturado no es revertible
    expect(next[0].estado).toBe("facturado");
  });

  it('hito sin _pedidoIds ni _pedidoId no dispara sync de pedido', () => {
    const hito = { id: 5, nombre: "Hito manual", completado: false };
    expect(getPedidoIdsHito(hito)).toEqual([]);
    // Lista vacía → ningún pedido coincide con includes() → no hay sync
  });

  it('hito compartido por 2 pedidos: marcar completado lleva a "recibido" a AMBOS pedidos elegibles', () => {
    const pedidos = [
      { id: 10, estado: "confirmado" },
      { id: 20, estado: "borrador" },
      { id: 30, estado: "confirmado" }, // no vinculado a este hito
    ];
    const hitoActual = { id: 99, _pedidoIds: [10, 20] };
    const { next, cambio } = aplicarSyncReverso(pedidos, getPedidoIdsHito(hitoActual), true);
    expect(cambio).toBe(true);
    expect(next.find(p => p.id === 10).estado).toBe("recibido");
    expect(next.find(p => p.id === 20).estado).toBe("recibido");
    expect(next.find(p => p.id === 30).estado).toBe("confirmado"); // intacto, no vinculado
  });

  it('retrocompatibilidad: hito antiguo con _pedidoId singular se lee como array de 1', () => {
    const hitoAntiguo = { id: 99, _pedidoId: 10 };
    expect(getPedidoIdsHito(hitoAntiguo)).toEqual([10]);
  });
});

describe('SYNC-INTER-02: GAP-B — syncHitoTarea en cadena CK→tarea→hito', () => {
  it('completar tarea vía CK y luego syncHitoTarea produce hito.completado=true', async () => {
    const { syncHitoTarea } = await import('../components/blocks/Proyecto.jsx');
    const tarea = {
      id: 38, area: "logistica", prioridad: "alta",
      titulo: "Inventario material", fechaLimite: "2026-04-30",
      estado: "completado",
    };
    const hitosPrevios = [
      { id: 3, _tareaId: 38, nombre: "📋 Inventario material", fecha: "2026-04-30", completado: false, critico: false }
    ];
    const result = syncHitoTarea(hitosPrevios, tarea, "upsert");
    const hito = result.find(h => h._tareaId === 38);
    expect(hito).toBeDefined();
    expect(hito.completado).toBe(true);
  });

  it('al volver tarea a pendiente, syncHitoTarea pone hito.completado=false', async () => {
    const { syncHitoTarea } = await import('../components/blocks/Proyecto.jsx');
    const tarea = {
      id: 38, area: "logistica", prioridad: "alta",
      titulo: "Inventario material", fechaLimite: "2026-04-30",
      estado: "pendiente",
    };
    const hitosPrevios = [
      { id: 3, _tareaId: 38, nombre: "📋 Inventario material", fecha: "2026-04-30", completado: true, critico: false }
    ];
    const result = syncHitoTarea(hitosPrevios, tarea, "upsert");
    const hito = result.find(h => h._tareaId === 38);
    expect(hito.completado).toBe(false);
  });
});

describe('SYNC-INTER-03: GAP-F — ckBloqueantes computation', () => {
  it('solo retorna ítems CK pendientes vinculados a tareas alta prioridad no completadas', () => {
    const ck = [
      { id: 1, proyectoTareaId: 10, estado: "pendiente",   tarea: "Confirmar autorización", fase: "Semana antes" },
      { id: 2, proyectoTareaId: 11, estado: "completado",  tarea: "Servicio médico",         fase: "Semana antes" },
      { id: 3, proyectoTareaId: 12, estado: "pendiente",   tarea: "Cronometraje",            fase: "1 mes antes" },
      { id: 4, proyectoTareaId: null, estado: "pendiente", tarea: "Sin vínculo",             fase: "Semana antes" },
    ];
    const tareas = [
      { id: 10, prioridad: "alta",  estado: "en curso",   titulo: "Tarea A" },
      { id: 11, prioridad: "alta",  estado: "pendiente",  titulo: "Tarea B" },
      { id: 12, prioridad: "media", estado: "pendiente",  titulo: "Tarea C" },
    ];
    const ckVinculados = ck.filter(c => c.proyectoTareaId != null);
    const ckBloqueantes = ckVinculados.filter(c => {
      if (c.estado === "completado") return false;
      const tarea = tareas.find(t => t.id === c.proyectoTareaId);
      return tarea && tarea.prioridad === "alta" && tarea.estado !== "completado";
    });
    // id=1 (pendiente, alta, en curso) ✓
    // id=2 (completado) ✗
    // id=3 (pendiente, media) ✗
    // id=4 (sin vínculo) ✗
    expect(ckBloqueantes).toHaveLength(1);
    expect(ckBloqueantes[0].id).toBe(1);
  });

  it('no incluye ítems CK de tareas ya completadas', () => {
    const ck = [{ id: 5, proyectoTareaId: 20, estado: "pendiente", tarea: "X", fase: "Semana antes" }];
    const tareas = [{ id: 20, prioridad: "alta", estado: "completado", titulo: "Tarea Y" }];
    const ckVinculados = ck.filter(c => c.proyectoTareaId != null);
    const ckBloqueantes = ckVinculados.filter(c => {
      if (c.estado === "completado") return false;
      const tarea = tareas.find(t => t.id === c.proyectoTareaId);
      return tarea && tarea.prioridad === "alta" && tarea.estado !== "completado";
    });
    expect(ckBloqueantes).toHaveLength(0);
  });
});

describe('SYNC-INTER-04: eventBusSlice — EVENT_ACTIONS.LOGISTICA CK acciones', () => {
  it('EVENT_ACTIONS.LOGISTICA tiene CK_COMPLETADO, CK_REABIERTO y FASE_COMPLETADA', async () => {
    const { EVENT_ACTIONS } = await import('../store/slices/eventBusSlice.js');
    expect(EVENT_ACTIONS.LOGISTICA.CK_COMPLETADO).toBe('ck_completado');
    expect(EVENT_ACTIONS.LOGISTICA.CK_REABIERTO).toBe('ck_reabierto');
    expect(EVENT_ACTIONS.LOGISTICA.FASE_COMPLETADA).toBe('fase_completada');
  });

  it('EVENT_ACTIONS.LOGISTICA mantiene acciones existentes', async () => {
    const { EVENT_ACTIONS } = await import('../store/slices/eventBusSlice.js');
    expect(EVENT_ACTIONS.LOGISTICA.ABIERTA).toBe('abierta');
    expect(EVENT_ACTIONS.LOGISTICA.CERRADA).toBe('cerrada');
    expect(EVENT_ACTIONS.LOGISTICA.ACTUALIZADA).toBe('actualizada');
  });
});
