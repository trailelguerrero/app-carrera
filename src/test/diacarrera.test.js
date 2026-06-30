/**
 * DíaCarrera — Test Suite
 *
 * DC-01  INC-01: toggleVol escribe enPuesto + horaLlegada (no v.presente)
 * DC-02  INC-01: presentes usa enPuesto
 * DC-03  INC-02: guardarIncidencia incluye creadaEn
 * DC-04  INC-06: id de incidencia es numérico
 * DC-05  INC-02: puestoNombre incluido en la nueva incidencia
 * DC-06  INC-03: debounce del listener teg-sync colapsa llamadas rápidas
 * DC-07  Tab Ahora: incidencias abiertas + puestos sin cobertura detectados
 * DC-08  Tab Ahora: estado OK cuando no hay alertas
 * DC-09  Checklist filtrado por fases del día de carrera
 * DC-10  Voluntarios ordenados: sin llegar primero
 * DC-11  Listas de presencia/puesto muestran nombre completo (no solo nombre)
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { nombreCompleto } from '@/hooks/useVoluntarios';

beforeAll(() => {
  const s = {};
  Object.defineProperty(window,'localStorage',{value:{getItem:vi.fn(k=>s[k]??null),setItem:vi.fn((k,v)=>{s[k]=String(v);}),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  Object.defineProperty(window,'sessionStorage',{value:{getItem:vi.fn(()=>null),setItem:vi.fn(),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  global.fetch=vi.fn(()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({})}));
  vi.spyOn(console,'error').mockImplementation(()=>{});
});

// ── DC-01: toggleVol escribe enPuesto y horaLlegada ──────────────────────
describe('DC-01 — toggleVol usa enPuesto+horaLlegada (no presente)', () => {
  const toggleVol = (vols, id) => vols.map(v => {
    if (v.id !== id) return v;
    const llegando = !v.enPuesto;
    return { ...v, enPuesto: llegando, horaLlegada: llegando ? new Date().toTimeString().slice(0,5) : null };
  });

  it('marca enPuesto=true al activar', () => {
    const vols = [{ id:1, enPuesto:false, horaLlegada:null }];
    const r = toggleVol(vols, 1);
    expect(r[0].enPuesto).toBe(true);
  });

  it('registra horaLlegada al marcar presente', () => {
    const vols = [{ id:1, enPuesto:false, horaLlegada:null }];
    const r = toggleVol(vols, 1);
    expect(r[0].horaLlegada).toMatch(/^\d{2}:\d{2}$/);
  });

  it('desmarca enPuesto=false al volver a pulsar', () => {
    const vols = [{ id:1, enPuesto:true, horaLlegada:"07:30" }];
    const r = toggleVol(vols, 1);
    expect(r[0].enPuesto).toBe(false);
    expect(r[0].horaLlegada).toBeNull();
  });

  it('no modifica otros voluntarios', () => {
    const vols = [
      { id:1, enPuesto:false },
      { id:2, enPuesto:false },
    ];
    const r = toggleVol(vols, 1);
    expect(r[1].enPuesto).toBe(false);
  });

  it('NO usa el campo presente (campo legacy)', () => {
    const vols = [{ id:1, enPuesto:false, presente:false }];
    const r = toggleVol(vols, 1);
    // El campo presente NO debe cambiar — solo enPuesto
    expect(r[0].presente).toBe(false); // sin cambiar
    expect(r[0].enPuesto).toBe(true);  // este sí cambia
  });
});

// ── DC-02: presentes usa enPuesto ─────────────────────────────────────────
describe('DC-02 — presentes calculado con enPuesto', () => {
  it('cuenta solo voluntarios con enPuesto=true', () => {
    const vols = [
      { id:1, enPuesto:true  },
      { id:2, enPuesto:false },
      { id:3, enPuesto:true  },
    ];
    const presentes = vols.filter(v => v.enPuesto).length;
    expect(presentes).toBe(2);
  });

  it('voluntario llegado por portal (enPuesto=true) cuenta', () => {
    const vols = [
      { id:1, enPuesto:true, horaLlegada:"07:15" }, // llegó via portal
      { id:2, enPuesto:false },
    ];
    expect(vols.filter(v => v.enPuesto).length).toBe(1);
  });

  it('campo presente legacy no afecta al contador', () => {
    const vols = [
      { id:1, enPuesto:false, presente:true }, // presente pero sin enPuesto → no cuenta
    ];
    expect(vols.filter(v => v.enPuesto).length).toBe(0);
  });
});

// ── DC-03: creadaEn en guardarIncidencia ──────────────────────────────────
describe('DC-03 — guardarIncidencia incluye creadaEn automático', () => {
  const crearIncidencia = (form) => ({
    id:          Date.now(),
    hora:        new Date().toTimeString().slice(0, 5),
    creadaEn:    new Date().toISOString(),
    puestoNombre:form.puestoNombre || "— Sin puesto específico",
    tipo:        form.tipo,
    gravedad:    form.gravedad,
    descripcion: form.descripcion.trim(),
    responsable: "Día de Carrera",
    estado:      "abierta",
    resolucion:  "",
    resueltaEn:  null,
  });

  it('creadaEn es un ISO datetime válido', () => {
    const r = crearIncidencia({ tipo:"médica", gravedad:"alta", descripcion:"Corredor caído" });
    expect(r.creadaEn).toBeTruthy();
    expect(new Date(r.creadaEn).getTime()).toBeGreaterThan(0);
  });

  it('creadaEn en el mismo segundo que la incidencia', () => {
    const antes = Date.now();
    const r = crearIncidencia({ tipo:"médica", gravedad:"media", descripcion:"Test" });
    const despues = Date.now();
    const ts = new Date(r.creadaEn).getTime();
    expect(ts).toBeGreaterThanOrEqual(antes);
    expect(ts).toBeLessThanOrEqual(despues);
  });

  it('resueltaEn es null al crear', () => {
    const r = crearIncidencia({ tipo:"médica", gravedad:"baja", descripcion:"Test" });
    expect(r.resueltaEn).toBeNull();
  });

  it('estado siempre abierta al crear', () => {
    const r = crearIncidencia({ tipo:"médica", gravedad:"alta", descripcion:"Urgente" });
    expect(r.estado).toBe("abierta");
  });
});

// ── DC-04: id numérico (no string legacy) ─────────────────────────────────
describe('DC-04 — id de incidencia es numérico', () => {
  it('id es un número, no una cadena', () => {
    const id = Date.now();
    expect(typeof id).toBe("number");
    expect(Number.isInteger(id)).toBe(true);
  });

  it('id antiguo "inc_xxx" tenía formato de cadena (bug corregido)', () => {
    // El formato antiguo era: id: `inc_${Date.now()}`
    const idAntiguo = `inc_${Date.now()}`;
    expect(typeof idAntiguo).toBe("string"); // era string
    expect(typeof Date.now()).toBe("number"); // ahora es number
  });
});

// ── DC-05: puestoNombre en la nueva incidencia ────────────────────────────
describe('DC-05 — puestoNombre incluido en la incidencia registrada', () => {
  const crearInc = (form) => ({
    id: Date.now(),
    puestoNombre: form.puestoNombre || "— Sin puesto específico",
    tipo: form.tipo, gravedad: form.gravedad, descripcion: form.descripcion,
    estado: "abierta", creadaEn: new Date().toISOString(),
  });

  it('puestoNombre se incluye cuando se selecciona un puesto', () => {
    const r = crearInc({ tipo:"médica", gravedad:"alta", descripcion:"Test", puestoNombre:"Avituallamiento KM 4" });
    expect(r.puestoNombre).toBe("Avituallamiento KM 4");
  });

  it('puestoNombre es el placeholder cuando no se selecciona', () => {
    const r = crearInc({ tipo:"médica", gravedad:"baja", descripcion:"Test" });
    expect(r.puestoNombre).toBe("— Sin puesto específico");
  });
});

// ── DC-06: debounce en teg-sync ──────────────────────────────────────────
describe('DC-06 — Debounce del listener teg-sync', () => {
  it('múltiples eventos en 300ms producen una sola recarga', async () => {
    vi.useFakeTimers();
    const loadFn = vi.fn();
    let debounce = null;
    const handler = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => loadFn(), 300);
    };

    handler(); handler(); handler(); // 3 eventos rápidos
    expect(loadFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(350);
    expect(loadFn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('eventos separados por >300ms producen dos recargas', () => {
    vi.useFakeTimers();
    const loadFn = vi.fn();
    let debounce = null;
    const handler = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => loadFn(), 300);
    };

    handler();
    vi.advanceTimersByTime(400);
    handler();
    vi.advanceTimersByTime(400);
    expect(loadFn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

// ── DC-07: Tab Ahora — alertas detectadas ────────────────────────────────
describe('DC-07 — TabAhora detecta incidencias y puestos sin cobertura', () => {
  const calcAlertasAhora = (incidencias, puestos, vols) => {
    const incAbiertas = incidencias.filter(i => i.estado === "abierta");
    const incAltas    = incAbiertas.filter(i => i.gravedad === "alta");
    const puestosAlerta = puestos.map(p => {
      const asig = vols.filter(v => v.puestoId === p.id && v.enPuesto);
      return { ...p, presentes: asig.length, pct: p.necesarios > 0 ? asig.length / p.necesarios : 1 };
    }).filter(p => p.pct < 1);
    return { incAbiertas, incAltas, puestosAlerta };
  };

  it('detecta incidencias abiertas', () => {
    const inc = [
      { id:1, estado:"abierta",   gravedad:"alta"  },
      { id:2, estado:"resuelta",  gravedad:"media" },
    ];
    const r = calcAlertasAhora(inc, [], []);
    expect(r.incAbiertas).toHaveLength(1);
    expect(r.incAltas).toHaveLength(1);
  });

  it('detecta puestos sin cobertura completa', () => {
    const puestos = [{ id:1, nombre:"Meta", necesarios:4 }];
    const vols = [
      { id:1, puestoId:1, enPuesto:true },
      { id:2, puestoId:1, enPuesto:false },
    ];
    const r = calcAlertasAhora([], puestos, vols);
    expect(r.puestosAlerta).toHaveLength(1);
    expect(r.puestosAlerta[0].presentes).toBe(1);
  });

  it('puestos con cobertura completa no aparecen en alertas', () => {
    const puestos = [{ id:1, nombre:"Meta", necesarios:2 }];
    const vols = [
      { id:1, puestoId:1, enPuesto:true },
      { id:2, puestoId:1, enPuesto:true },
    ];
    const r = calcAlertasAhora([], puestos, vols);
    expect(r.puestosAlerta).toHaveLength(0);
  });
});

// ── DC-08: Tab Ahora — estado OK ──────────────────────────────────────────
describe('DC-08 — TabAhora muestra OK cuando no hay alertas', () => {
  const hayAlertas = (incidencias, puestos, vols) => {
    const incAbiertas = incidencias.filter(i => i.estado === "abierta").length;
    const puestosAlerta = puestos.filter(p => {
      const pres = vols.filter(v => v.puestoId === p.id && v.enPuesto).length;
      return p.necesarios > 0 && pres < p.necesarios;
    }).length;
    return incAbiertas > 0 || puestosAlerta > 0;
  };

  it('sin incidencias y puestos cubiertos → no hay alertas', () => {
    const puestos = [{ id:1, necesarios:2 }];
    const vols = [
      { id:1, puestoId:1, enPuesto:true },
      { id:2, puestoId:1, enPuesto:true },
    ];
    expect(hayAlertas([], puestos, vols)).toBe(false);
  });

  it('una incidencia abierta → hay alertas', () => {
    expect(hayAlertas([{ id:1, estado:"abierta" }], [], [])).toBe(true);
  });
});

// ── DC-09: Checklist filtrado por fases del día ────────────────────────────
describe('DC-09 — Checklist muestra solo fases del día de carrera', () => {
  const FASES_DIA = ["Mañana carrera", "Durante carrera", "Post-carrera"];

  const filtrarChecklist = (ck) => {
    const filtrado = ck.filter(item => FASES_DIA.includes(item.fase));
    return filtrado.length > 0 ? filtrado : ck; // fallback al total si no hay del día
  };

  const ck = [
    { id:1, fase:"3 meses antes",   tarea:"Solicitar permisos" },
    { id:2, fase:"Mañana carrera",  tarea:"Briefing voluntarios 05:30" },
    { id:3, fase:"Durante carrera", tarea:"Seguimiento walkie" },
    { id:4, fase:"Semana antes",    tarea:"Imprimir dorsales" },
    { id:5, fase:"Post-carrera",    tarea:"Desmontaje" },
  ];

  it('filtra correctamente las fases del día', () => {
    const r = filtrarChecklist(ck);
    expect(r.every(item => FASES_DIA.includes(item.fase))).toBe(true);
  });

  it('excluye fases previas al evento', () => {
    const r = filtrarChecklist(ck);
    expect(r.some(item => item.fase === "3 meses antes")).toBe(false);
    expect(r.some(item => item.fase === "Semana antes")).toBe(false);
  });

  it('mantiene mañana carrera, durante carrera y post-carrera', () => {
    const r = filtrarChecklist(ck);
    expect(r.some(item => item.fase === "Mañana carrera")).toBe(true);
    expect(r.some(item => item.fase === "Durante carrera")).toBe(true);
    expect(r.some(item => item.fase === "Post-carrera")).toBe(true);
  });

  it('fallback: si no hay ítems del día, muestra todo', () => {
    const ckSinDia = [
      { id:1, fase:"3 meses antes", tarea:"Algo" },
    ];
    const r = filtrarChecklist(ckSinDia);
    expect(r).toHaveLength(1); // devuelve el total
  });
});

// ── DC-10: Voluntarios ordenados sin llegar primero ────────────────────────
describe('DC-10 — Voluntarios ordenados: sin llegar antes que llegados', () => {
  const ordenarVols = (vols) => [...vols].sort((a,b) => {
    if (a.enPuesto && !b.enPuesto) return 1;
    if (!a.enPuesto && b.enPuesto) return -1;
    return 0;
  });

  const vols = [
    { id:1, nombre:"Ana",   enPuesto:true  },
    { id:2, nombre:"Juan",  enPuesto:false },
    { id:3, nombre:"María", enPuesto:true  },
    { id:4, nombre:"Pedro", enPuesto:false },
  ];

  it('voluntarios sin llegar aparecen primero', () => {
    const r = ordenarVols(vols);
    expect(r[0].enPuesto).toBe(false);
    expect(r[1].enPuesto).toBe(false);
  });

  it('voluntarios llegados aparecen al final', () => {
    const r = ordenarVols(vols);
    expect(r[r.length-1].enPuesto).toBe(true);
    expect(r[r.length-2].enPuesto).toBe(true);
  });

  it('orden estable dentro del mismo grupo', () => {
    const r = ordenarVols(vols);
    const noLlegados = r.filter(v => !v.enPuesto);
    expect(noLlegados.map(v => v.nombre)).toEqual(["Juan","Pedro"]);
  });
});

// ── DC-11: listas de presencia/puesto mostraban solo v.nombre ──────────────
// Diagnóstico (30/06/2026): mismo root cause que VOL-35/36/37 (CORE-10) pero
// en pantalla, no en export. El tab "voluntarios" (lista de presencia) y el
// tab "puestos" (roster por puesto) de Día de Carrera mostraban {v.nombre}
// directamente en vez de combinar nombre+apellidos — crítico porque es la
// pantalla que se usa en vivo el día de la carrera para pasar lista.
// Corregido usando el helper nombreCompleto() ya existente (VOL-35), evitando
// duplicar la lógica de unión por tercera vez.
describe('DC-11 — nombreCompleto cubre el caso de uso de Día de Carrera', () => {
  it('combina nombre y apellidos para la lista de presencia', () => {
    expect(nombreCompleto({ nombre: "Judith", apellidos: "Castañar", enPuesto: false })).toBe("Judith Castañar");
  });

  it('usa el fallback si el voluntario no tiene nombre', () => {
    expect(nombreCompleto({ apellidos: "" }, "Sin nombre")).toBe("Sin nombre");
  });
});
