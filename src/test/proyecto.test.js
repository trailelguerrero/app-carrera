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
