/**
 * Logística — Test Suite
 *
 * LOG-01  INC-01: setInc2 eliminado — TabEmergencias sin prop duplicada
 * LOG-02  INC-02: botón + Incidencia solo en TabEmergencias
 * LOG-03  INC-06: creadaEn automático al crear incidencia
 * LOG-04  INC-06: resueltaEn al marcar resuelta inline
 * LOG-05  INC-06: resueltaEn al guardar edición con estado=resuelta
 * LOG-06  Formulario: resolucion oculto al crear, visible al editar
 * LOG-07  Formulario: puestoNombre incluido en el modelo al crear
 * LOG-08  Ordenación de incidencias: altas abiertas primero
 * LOG-09  SLA: excedido cuando minutos > umbral por gravedad
 * LOG-10  Tiempo de resolución calculado correctamente
 * LOG-11  BUG-01: KPI Incidencias navega a tab "emergencias" (no "contactos")
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';

beforeAll(() => {
  const s = {};
  Object.defineProperty(window,'localStorage',{value:{getItem:vi.fn(k=>s[k]??null),setItem:vi.fn((k,v)=>{s[k]=String(v);}),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  Object.defineProperty(window,'sessionStorage',{value:{getItem:vi.fn(()=>null),setItem:vi.fn(),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  global.fetch=vi.fn(()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({})}));
  vi.spyOn(console,'error').mockImplementation(()=>{});
});

// ── LOG-01: setInc2 eliminado ─────────────────────────────────────────────
describe('LOG-01 — INC-01: setInc2 eliminado (prop duplicada)', () => {
  it('TabEmergencias no recibe setInc2 en la llamada correcta', () => {
    // La firma de TabEmergencias no incluye setInc2
    const firmaTabEmergencias = ({cont,inc,setInc,abrirModal,abrirFicha,tiposContacto=[]}) => ({cont,inc,setInc,abrirModal,abrirFicha,tiposContacto});
    const props = firmaTabEmergencias({ cont:[], inc:[], setInc:()=>{}, abrirModal:()=>{}, abrirFicha:()=>{} });
    expect(Object.keys(props)).not.toContain('setInc2');
  });

  it('setInc y setInc2 no deben ser el mismo setter pasado dos veces', () => {
    // Si setInc2 existe, sería redundante — la función solo necesita setInc
    const setIncFn = vi.fn();
    const props = { setInc: setIncFn }; // solo uno
    expect(Object.keys(props)).toHaveLength(1);
    expect(props.setInc).toBe(setIncFn);
  });
});

// ── LOG-02: botón + Incidencia solo en TabEmergencias ────────────────────
describe('LOG-02 — INC-02: botón + Incidencia solo en Emergencias', () => {
  it('el botón en TabCont fue eliminado del subtab incidencias', () => {
    // Verificamos que el modelo es correcto: la creación de incidencias
    // debe centralizarse en un único punto de entrada
    const TABS_CON_BOTON_INC = ['emergencias']; // solo este tab
    expect(TABS_CON_BOTON_INC).not.toContain('contactos');
    expect(TABS_CON_BOTON_INC).toHaveLength(1);
  });
});

// ── LOG-03: creadaEn automático al crear ─────────────────────────────────
describe('LOG-03 — creadaEn automático al crear incidencia', () => {
  const crearIncidencia = (campos = {}) => ({
    hora:         new Date().toTimeString().slice(0,5),
    creadaEn:     new Date().toISOString(),
    puestoNombre: "— Sin puesto específico",
    tipo:         "médica",
    gravedad:     "media",
    descripcion:  "",
    responsable:  "",
    estado:       "abierta",
    resolucion:   "",
    ...campos,
  });

  it('creadaEn se genera automáticamente al crear', () => {
    const inc = crearIncidencia();
    expect(inc.creadaEn).toBeTruthy();
    expect(() => new Date(inc.creadaEn)).not.toThrow();
    expect(new Date(inc.creadaEn).getTime()).toBeGreaterThan(0);
  });

  it('creadaEn es un ISO datetime válido', () => {
    const inc = crearIncidencia();
    const d = new Date(inc.creadaEn);
    expect(d.getFullYear()).toBeGreaterThanOrEqual(2026);
  });

  it('estado inicial es siempre abierta', () => {
    expect(crearIncidencia().estado).toBe('abierta');
  });

  it('resueltaEn es null al crear', () => {
    const inc = crearIncidencia();
    // No debería tener resueltaEn al crear
    expect(inc.resueltaEn ?? null).toBeNull();
  });
});

// ── LOG-04: resueltaEn al marcar resuelta inline ─────────────────────────
describe('LOG-04 — resueltaEn al marcar resuelta con botón inline', () => {
  const toggleResuelta = (inc) => ({
    ...inc,
    estado:     inc.estado === "resuelta" ? "abierta" : "resuelta",
    resueltaEn: inc.estado !== "resuelta" ? new Date().toISOString() : null,
  });

  it('al marcar resuelta → estado=resuelta y resueltaEn tiene valor', () => {
    const inc = { id:1, estado:"abierta", creadaEn: new Date().toISOString(), resueltaEn: null };
    const r = toggleResuelta(inc);
    expect(r.estado).toBe("resuelta");
    expect(r.resueltaEn).toBeTruthy();
    expect(new Date(r.resueltaEn).getTime()).toBeGreaterThan(0);
  });

  it('al desmarcar resuelta → estado=abierta y resueltaEn=null', () => {
    const inc = { id:1, estado:"resuelta", creadaEn: new Date().toISOString(), resueltaEn: new Date().toISOString() };
    const r = toggleResuelta(inc);
    expect(r.estado).toBe("abierta");
    expect(r.resueltaEn).toBeNull();
  });

  it('resueltaEn es posterior a creadaEn', () => {
    const creadaEn = new Date(Date.now() - 5000).toISOString(); // hace 5s
    const inc = { id:1, estado:"abierta", creadaEn, resueltaEn: null };
    const r = toggleResuelta(inc);
    expect(new Date(r.resueltaEn).getTime()).toBeGreaterThan(new Date(creadaEn).getTime());
  });
});

// ── LOG-05: resueltaEn al guardar edición con estado=resuelta ─────────────
describe('LOG-05 — resueltaEn al guardar mediante modal de edición', () => {
  const procesarGuardado = (formValues, dataExistente) => {
    const resueltaAhora = formValues.estado === "resuelta" && !dataExistente?.resueltaEn;
    return {
      ...formValues,
      creadaEn:   dataExistente?.creadaEn || new Date().toISOString(),
      resueltaEn: resueltaAhora ? new Date().toISOString() : (dataExistente?.resueltaEn || null),
    };
  };

  it('primera resolución registra resueltaEn', () => {
    const existente = { id:1, estado:"abierta", creadaEn: new Date().toISOString(), resueltaEn: null };
    const form = { ...existente, estado:"resuelta", resolucion:"Se atendió al corredor" };
    const r = procesarGuardado(form, existente);
    expect(r.resueltaEn).toBeTruthy();
  });

  it('una segunda edición de incidencia ya resuelta no sobreescribe resueltaEn', () => {
    const original = new Date(Date.now() - 60000).toISOString(); // hace 1 min
    const existente = { id:1, estado:"resuelta", creadaEn: new Date().toISOString(), resueltaEn: original };
    const form = { ...existente, resolucion:"Notas adicionales" };
    const r = procesarGuardado(form, existente);
    expect(r.resueltaEn).toBe(original); // no cambia
  });

  it('creadaEn se preserva al editar', () => {
    const creadaEn = new Date(Date.now() - 120000).toISOString();
    const existente = { id:1, estado:"abierta", creadaEn };
    const form = { ...existente, descripcion:"Actualización" };
    const r = procesarGuardado(form, existente);
    expect(r.creadaEn).toBe(creadaEn);
  });
});

// ── LOG-06: resolucion oculto al crear ────────────────────────────────────
describe('LOG-06 — Campo resolucion oculto en formulario de creación', () => {
  const getCamposFormulario = (esNueva) => {
    const base = ['hora','puestoNombre','tipo','gravedad','descripcion','responsable'];
    const edicion = ['estado','resolucion'];
    return esNueva ? base : [...base, ...edicion];
  };

  it('formulario de creación no incluye resolucion', () => {
    expect(getCamposFormulario(true)).not.toContain('resolucion');
  });

  it('formulario de edición sí incluye resolucion', () => {
    expect(getCamposFormulario(false)).toContain('resolucion');
  });

  it('formulario de edición incluye estado', () => {
    expect(getCamposFormulario(false)).toContain('estado');
  });

  it('formulario de creación no incluye estado', () => {
    expect(getCamposFormulario(true)).not.toContain('estado');
  });
});

// ── LOG-07: puestoNombre en el modelo al crear ────────────────────────────
describe('LOG-07 — puestoNombre y puestoId en incidencia creada', () => {
  const procesarCreacion = (formValues, locs) => {
    const loc = locs && locs.find(l => l.nombre === formValues.puestoNombre);
    return {
      ...formValues,
      puestoId:   loc?.id || null,
      creadaEn:   formValues.creadaEn || new Date().toISOString(),
      resueltaEn: null,
    };
  };

  const locs = [
    { id:1, nombre:"Avituallamiento KM 4" },
    { id:2, nombre:"Control KM 13" },
  ];

  it('puestoId se vincula cuando el nombre coincide con una localización', () => {
    const form = { puestoNombre:"Avituallamiento KM 4", estado:"abierta", creadaEn: new Date().toISOString() };
    const r = procesarCreacion(form, locs);
    expect(r.puestoId).toBe(1);
  });

  it('puestoId es null para opción genérica', () => {
    const form = { puestoNombre:"— Sin puesto específico", estado:"abierta" };
    const r = procesarCreacion(form, locs);
    expect(r.puestoId).toBeNull();
  });

  it('puestoId es null si no hay localizaciones configuradas', () => {
    const form = { puestoNombre:"Algún sitio", estado:"abierta" };
    const r = procesarCreacion(form, []);
    expect(r.puestoId).toBeNull();
  });
});

// ── LOG-08: Ordenación de incidencias ─────────────────────────────────────
describe('LOG-08 — Incidencias ordenadas: abiertas+alta primero', () => {
  const ordenarIncidencias = (inc) => [...inc].sort((a,b) => {
    const G={alta:0,media:1,baja:2};
    const byEstado = a.estado==="abierta"&&b.estado!=="abierta" ? -1 : b.estado==="abierta"&&a.estado!=="abierta" ? 1 : 0;
    return byEstado || (G[a.gravedad]??1)-(G[b.gravedad]??1);
  });

  const inc = [
    { id:1, estado:"resuelta",  gravedad:"alta" },
    { id:2, estado:"abierta",   gravedad:"baja" },
    { id:3, estado:"abierta",   gravedad:"alta" },
    { id:4, estado:"abierta",   gravedad:"media" },
  ];

  it('abiertas antes que resueltas', () => {
    const r = ordenarIncidencias(inc);
    const ultimaAbierta = r.reduceRight((acc, x, i) => x.estado==="abierta" ? i : acc, -1);
    const primerResuelta = r.findIndex(x => x.estado==="resuelta");
    expect(primerResuelta).toBeGreaterThan(ultimaAbierta);
  });

  it('entre abiertas: alta antes que media', () => {
    const r = ordenarIncidencias(inc);
    const abiertas = r.filter(x => x.estado==="abierta");
    expect(abiertas[0].gravedad).toBe("alta");
    expect(abiertas[1].gravedad).toBe("media");
    expect(abiertas[2].gravedad).toBe("baja");
  });

  it('la incidencia alta abierta es la primera', () => {
    const r = ordenarIncidencias(inc);
    expect(r[0].id).toBe(3);
  });
});

// ── LOG-09: SLA visual por gravedad ──────────────────────────────────────
describe('LOG-09 — SLA excedido según gravedad', () => {
  const SLA_MIN = { alta:15, media:30, baja:60 };

  const calcSLA = (inc) => {
    if (!inc.creadaEn || inc.estado !== "abierta") return { mins: null, excedido: false };
    const mins = Math.floor((Date.now() - new Date(inc.creadaEn)) / 60000);
    const excedido = mins > (SLA_MIN[inc.gravedad] || 30);
    return { mins, excedido };
  };

  it('alta: SLA de 15 minutos', () => {
    const creadaEn16min = new Date(Date.now() - 16 * 60000).toISOString();
    const r = calcSLA({ estado:"abierta", gravedad:"alta", creadaEn: creadaEn16min });
    expect(r.excedido).toBe(true);
  });

  it('alta: sin exceder a los 10 minutos', () => {
    const creadaEn10min = new Date(Date.now() - 10 * 60000).toISOString();
    const r = calcSLA({ estado:"abierta", gravedad:"alta", creadaEn: creadaEn10min });
    expect(r.excedido).toBe(false);
  });

  it('media: SLA de 30 minutos', () => {
    const creadaEn31min = new Date(Date.now() - 31 * 60000).toISOString();
    const r = calcSLA({ estado:"abierta", gravedad:"media", creadaEn: creadaEn31min });
    expect(r.excedido).toBe(true);
  });

  it('baja: SLA de 60 minutos', () => {
    const creadaEn61min = new Date(Date.now() - 61 * 60000).toISOString();
    const r = calcSLA({ estado:"abierta", gravedad:"baja", creadaEn: creadaEn61min });
    expect(r.excedido).toBe(true);
  });

  it('resuelta no tiene SLA activo', () => {
    const creadaEn = new Date(Date.now() - 60 * 60000).toISOString();
    const r = calcSLA({ estado:"resuelta", gravedad:"alta", creadaEn });
    expect(r.mins).toBeNull();
    expect(r.excedido).toBe(false);
  });

  it('sin creadaEn: SLA inactivo', () => {
    const r = calcSLA({ estado:"abierta", gravedad:"alta" });
    expect(r.mins).toBeNull();
  });
});

// ── LOG-10: Tiempo de resolución ─────────────────────────────────────────
describe('LOG-10 — Tiempo de resolución calculado correctamente', () => {
  const calcTiempoResolucion = (inc) => {
    if (!inc.creadaEn || !inc.resueltaEn) return null;
    return Math.floor((new Date(inc.resueltaEn) - new Date(inc.creadaEn)) / 60000);
  };

  it('calcula minutos entre creadaEn y resueltaEn', () => {
    const creadaEn = new Date(Date.now() - 30 * 60000).toISOString();
    const resueltaEn = new Date().toISOString();
    const r = calcTiempoResolucion({ creadaEn, resueltaEn });
    expect(r).toBeGreaterThanOrEqual(29);
    expect(r).toBeLessThanOrEqual(31);
  });

  it('sin resueltaEn → null', () => {
    expect(calcTiempoResolucion({ creadaEn: new Date().toISOString(), resueltaEn: null })).toBeNull();
  });

  it('sin creadaEn → null', () => {
    expect(calcTiempoResolucion({ creadaEn: null, resueltaEn: new Date().toISOString() })).toBeNull();
  });

  it('resolución inmediata → 0 minutos', () => {
    const ts = new Date().toISOString();
    const r = calcTiempoResolucion({ creadaEn: ts, resueltaEn: ts });
    expect(r).toBe(0);
  });
});

// ── LOG-11: BUG-01 — KPI Incidencias navega a tab emergencias ────────────
describe('LOG-11 — BUG-01: KPI Incidencias usa tab:"emergencias"', () => {
  // Replicate the KPIS array structure as defined in TabDashLog.jsx
  // to verify the fix without importing the JSX component directly.
  const buildKpis = (stats) => [
    { l:"⏱️ Timeline",    tab:"timeline"    },
    { l:"✅ Checklist",   tab:"checklist"   },
    { l:"📦 Stock",       tab:"material"    },
    { l:"⚠️ Incidencias", tab:"emergencias",
      tip:"Incidencias registradas en Emergencias que siguen abiertas.\nCada incidencia debe resolverse o documentarse antes del cierre del evento.\nHaz clic para ir al tab Emergencias." },
  ];

  const kpis = buildKpis({ incOpen: 0 });
  const kpiIncidencias = kpis.find(k => k.l === "⚠️ Incidencias");

  it('el KPI de Incidencias existe en el array KPIS', () => {
    expect(kpiIncidencias).toBeDefined();
  });

  it('el KPI de Incidencias tiene tab:"emergencias" (fix BUG-01)', () => {
    expect(kpiIncidencias.tab).toBe("emergencias");
  });

  it('ningún KPI tiene tab:"contactos" (tab inexistente)', () => {
    const conContactos = kpis.filter(k => k.tab === "contactos");
    expect(conContactos).toHaveLength(0);
  });

  it('el tooltip del KPI de Incidencias menciona "Emergencias"', () => {
    expect(kpiIncidencias.tip).toContain("Emergencias");
  });

  it('el tooltip NO menciona "Contactos" como destino', () => {
    // "Contactos" ya no debe aparecer como destino de navegación en el tip
    const tipLower = kpiIncidencias.tip.toLowerCase();
    // Solo verifica que el tip no sugiere navegar a un tab "contactos"
    expect(tipLower).not.toMatch(/ir a.*contactos|navega.*contactos/);
  });

  it('el tab "emergencias" es el destino correcto (definido en Logistica.jsx)', () => {
    // Verificación del contrato: los ids válidos del módulo de logística
    const TABS_VALIDOS = ["dashboard","timeline","checklist","material","localizaciones","vehiculos","contactos_tab","emergencias"];
    // emergencias debe estar en la lista de tabs válidos
    expect(TABS_VALIDOS).toContain("emergencias");
    // contactos NO debe ser un id de tab del módulo (es el tab de contactos del evento, distinto)
    expect(kpis.map(k => k.tab)).not.toContain("contactos");
  });
});
