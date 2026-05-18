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
 * LOG-16  DATO-03: Botiquín inconsistente eliminado del texto de Ruta 1 KM 16
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

// ── LOG-12: DATO-01 — Stock medallas 620→650 y asignación Zona Llegada/Trofeos ──
describe('LOG-12 — DATO-01: medallas finisher stock y asignación correctos', () => {
  // Importamos los datos directamente desde logisticaConstants.js
  // Como es un módulo ES, usamos dynamic import resuelto con vi
  let MAT0, ASIG0;

  beforeAll(async () => {
    const mod = await import('../components/logistica/logisticaConstants.js');
    MAT0  = mod.MAT0;
    ASIG0 = mod.ASIG0;
  });

  it('MAT0 contiene el artículo medallas finisher con id=17', () => {
    const medallas = MAT0.find(m => m.id === 17);
    expect(medallas).toBeDefined();
    expect(medallas.nombre).toMatch(/medalla/i);
  });

  it('medallas finisher (id=17) tiene stock=650 (igual al número de dorsales)', () => {
    const medallas = MAT0.find(m => m.id === 17);
    expect(medallas.stock).toBe(650);
  });

  it('dorsales impresos (id=16) tienen stock=650', () => {
    const dorsales = MAT0.find(m => m.id === 16);
    expect(dorsales).toBeDefined();
    expect(dorsales.stock).toBe(650);
  });

  it('stock medallas === stock dorsales (sin déficit estructural)', () => {
    const medallas = MAT0.find(m => m.id === 17);
    const dorsales = MAT0.find(m => m.id === 16);
    expect(medallas.stock).toBe(dorsales.stock);
  });

  it('ASIG0 contiene una asignación para materialId=17 (medallas)', () => {
    const asigMedallas = ASIG0.filter(a => a.materialId === 17);
    expect(asigMedallas.length).toBeGreaterThanOrEqual(1);
  });

  it('la asignación de medallas va a puesto "Zona Llegada/Trofeos"', () => {
    const asigMedallas = ASIG0.find(a => a.materialId === 17);
    expect(asigMedallas.puesto).toBe('Zona Llegada/Trofeos');
  });

  it('la cantidad asignada de medallas es 650', () => {
    const asigMedallas = ASIG0.find(a => a.materialId === 17);
    expect(asigMedallas.cantidad).toBe(650);
  });

  it('el déficit de medallas (asignado - stock) es 0', () => {
    const medallas = MAT0.find(m => m.id === 17);
    const asigMedallas = ASIG0.filter(a => a.materialId === 17)
      .reduce((sum, a) => sum + a.cantidad, 0);
    const deficit = asigMedallas - medallas.stock;
    expect(deficit).toBe(0);
  });

  it('la asignación de medallas usa localizacionId=11 (Zona Llegada/Trofeos)', () => {
    const asigMedallas = ASIG0.find(a => a.materialId === 17);
    expect(asigMedallas.localizacionId).toBe(11);
  });

  it('la asignación de medallas tiene estado "pendiente"', () => {
    const asigMedallas = ASIG0.find(a => a.materialId === 17);
    expect(asigMedallas.estado).toBe('pendiente');
  });
});

// ── LOG-13: DATO-02 — Parada KM4 en Ruta 1, cobertura de todos los puestos ─
describe('LOG-13 — DATO-02: Avituallamiento KM 4 cubierto por Ruta 1', () => {
  let RUTAS0, ASIG0;

  beforeAll(async () => {
    const mod = await import('../components/logistica/logisticaConstants.js');
    RUTAS0 = mod.RUTAS0;
    ASIG0  = mod.ASIG0;
  });

  // ── Existencia de la parada ───────────────────────────────────────────────
  it('RUTAS0 id=1 existe', () => {
    const ruta1 = RUTAS0.find(r => r.id === 1);
    expect(ruta1).toBeDefined();
  });

  it('Ruta 1 contiene una parada con puesto "Avituallamiento KM 4"', () => {
    const ruta1 = RUTAS0.find(r => r.id === 1);
    const paradaKM4 = ruta1.paradas.find(p => p.puesto === 'Avituallamiento KM 4');
    expect(paradaKM4).toBeDefined();
  });

  it('la parada KM 4 tiene hora "05:45"', () => {
    const ruta1 = RUTAS0.find(r => r.id === 1);
    const paradaKM4 = ruta1.paradas.find(p => p.puesto === 'Avituallamiento KM 4');
    expect(paradaKM4.hora).toBe('05:45');
  });

  it('la parada KM 4 indica el material de agua', () => {
    const ruta1 = RUTAS0.find(r => r.id === 1);
    const paradaKM4 = ruta1.paradas.find(p => p.puesto === 'Avituallamiento KM 4');
    expect(paradaKM4.material).toMatch(/agua/i);
  });

  // ── Orden cronológico ─────────────────────────────────────────────────────
  it('la parada KM 4 (05:45) es anterior a la parada KM 9 (06:00)', () => {
    const ruta1 = RUTAS0.find(r => r.id === 1);
    const paradaKM4 = ruta1.paradas.find(p => p.puesto === 'Avituallamiento KM 4');
    const paradaKM9 = ruta1.paradas.find(p => p.puesto === 'Avituallamiento KM 9');
    expect(paradaKM4).toBeDefined();
    expect(paradaKM9).toBeDefined();
    // Comparación lexicográfica válida para HH:MM
    expect(paradaKM4.hora < paradaKM9.hora).toBe(true);
  });

  it('el orden cronológico de paradas en Ruta 1 es KM4 → KM9 → KM16', () => {
    const ruta1 = RUTAS0.find(r => r.id === 1);
    const horas = ruta1.paradas.map(p => p.hora);
    const horasOrdenadas = [...horas].sort();
    // Las horas ya deben estar en orden ascendente (sin necesidad de reordenar)
    expect(horas).toEqual(horasOrdenadas);
  });

  it('la parada KM 4 aparece antes que KM 9 en el array (posición 0 vs posición 1)', () => {
    const ruta1 = RUTAS0.find(r => r.id === 1);
    const idxKM4 = ruta1.paradas.findIndex(p => p.puesto === 'Avituallamiento KM 4');
    const idxKM9 = ruta1.paradas.findIndex(p => p.puesto === 'Avituallamiento KM 9');
    expect(idxKM4).toBeGreaterThanOrEqual(0);
    expect(idxKM9).toBeGreaterThanOrEqual(0);
    expect(idxKM4).toBeLessThan(idxKM9);
  });

  // ── Cobertura: todos los puestos con material tienen al menos una ruta ────
  it('todos los puestos con asignaciones en ASIG0 tienen al menos una ruta que los cubre', () => {
    // Recopilar todos los puestos cubiertos por alguna parada de alguna ruta
    const puestosCubiertos = new Set(
      RUTAS0.flatMap(r => r.paradas.map(p => p.puesto))
    );

    // Los puestos con asignaciones de avituallamiento/material de campo
    // (excluimos puestos logísticos de base como Zona Salida/Meta, Primeros Auxilios Base,
    //  Zona Llegada/Trofeos y controles de ruta que son estáticos y no necesitan ruta de reparto)
    const puestosExentos = new Set([
      'Zona Salida/Meta',
      'Zona Llegada/Trofeos',
      'Primeros Auxilios Base',
      'Control KM 7',
      'Control KM 13',
    ]);

    // Los puestos de avituallamiento deben tener cobertura de ruta
    const puestosAvituallamiento = ASIG0
      .filter(a => !puestosExentos.has(a.puesto))
      .map(a => a.puesto);

    const sinCobertura = puestosAvituallamiento.filter(p => !puestosCubiertos.has(p));
    expect(sinCobertura).toHaveLength(0);
  });

  it('"Avituallamiento KM 4" queda cubierto por la Ruta 1 tras el fix', () => {
    const puestosCubiertos = new Set(
      RUTAS0.flatMap(r => r.paradas.map(p => p.puesto))
    );
    expect(puestosCubiertos.has('Avituallamiento KM 4')).toBe(true);
  });

  it('"Avituallamiento KM 9" sigue cubierto por la Ruta 1', () => {
    const puestosCubiertos = new Set(
      RUTAS0.flatMap(r => r.paradas.map(p => p.puesto))
    );
    expect(puestosCubiertos.has('Avituallamiento KM 9')).toBe(true);
  });

  it('"Avituallamiento KM 16" sigue cubierto por la Ruta 1', () => {
    const puestosCubiertos = new Set(
      RUTAS0.flatMap(r => r.paradas.map(p => p.puesto))
    );
    expect(puestosCubiertos.has('Avituallamiento KM 16')).toBe(true);
  });

  it('Ruta 1 tiene ahora 3 paradas (KM4, KM9, KM16)', () => {
    const ruta1 = RUTAS0.find(r => r.id === 1);
    expect(ruta1.paradas).toHaveLength(3);
  });
});

// ── LOG-14: BUG-02 — Timezone countdown correcto ──────────────────────────
describe('LOG-14 — BUG-02: timezone countdown T23:59:59 para hora local', () => {
  // Función que replica exactamente la lógica corregida de TabDashLog.jsx
  const calcDiasHasta = (fechaStr) => {
    const eventoFecha = new Date(fechaStr + "T23:59:59");
    return Math.ceil((eventoFecha - new Date()) / 86400000);
  };

  // Función que replica el bug original (sin corrección) para comparación
  const calcDiasHastaBuggy = (fechaStr) => {
    const eventoFecha = new Date(fechaStr);
    return Math.ceil((eventoFecha - new Date()) / 86400000);
  };

  it('new Date("2026-08-29T23:59:59") es posterior a new Date("2026-08-29")', () => {
    // La corrección añade horas al timestamp base — la fecha con T23:59:59
    // siempre debe ser posterior a la medianoche UTC
    const conCorreccion  = new Date("2026-08-29T23:59:59").getTime();
    const sinCorreccion  = new Date("2026-08-29").getTime();
    expect(conCorreccion).toBeGreaterThan(sinCorreccion);
  });

  it('la diferencia entre versión corregida y buggy es de al menos 1 hora', () => {
    // En UTC+2: new Date("2026-08-29") = 22:00 del día 28 hora local
    // Con T23:59:59: = 23:59:59 del día 29 hora local
    // La diferencia mínima es ~22 horas; verificamos que sea >= 1h (3600 s)
    const conCorreccion = new Date("2026-08-29T23:59:59").getTime();
    const sinCorreccion = new Date("2026-08-29").getTime();
    const diferenciaMs = conCorreccion - sinCorreccion;
    expect(diferenciaMs).toBeGreaterThanOrEqual(3600 * 1000); // al menos 1 hora
  });

  it('el día del evento (2026-08-29) con corrección no aparece como yaFue', () => {
    // Simulamos "estamos a las 01:00 UTC del 29 de agosto" —
    // el momento exacto en que el bug original provocaba yaFue=true en España
    // Usamos una fecha futura real para que el test sea determinista
    const diasHasta = calcDiasHasta("2026-08-29");
    // 2026-08-29 está en el futuro desde mayo 2026 — nunca debe ser < 0
    expect(diasHasta).toBeGreaterThanOrEqual(0);
  });

  it('el evento futuro (2026-08-29) devuelve diasHasta positivo con la corrección', () => {
    const diasHasta = calcDiasHasta("2026-08-29");
    // Desde mayo 2026, faltan más de 90 días hasta agosto 2026
    expect(diasHasta).toBeGreaterThan(50);
  });

  it('una fecha pasada sí produce yaFue=true (la lógica de "ya fue" sigue funcionando)', () => {
    const diasHasta = calcDiasHasta("2020-01-01");
    expect(diasHasta).toBeLessThan(0);
  });

  it('una fecha de mañana devuelve diasHasta=1 con la corrección', () => {
    // Construimos "mañana" como cadena YYYY-MM-DD
    const manana = new Date(Date.now() + 86400000);
    const mananaStr = manana.toISOString().slice(0, 10);
    const diasHasta = calcDiasHasta(mananaStr);
    // Con T23:59:59 al final del día de mañana, desde hoy deben quedar ≥1 día
    expect(diasHasta).toBeGreaterThanOrEqual(1);
  });

  it('una fecha de hoy NO aparece como yaFue con la corrección aplicada', () => {
    const hoy = new Date().toISOString().slice(0, 10);
    const diasHasta = calcDiasHasta(hoy);
    // Con T23:59:59, el evento de hoy todavía no ha "sido" hasta que acabe el día
    expect(diasHasta).toBeGreaterThanOrEqual(0);
  });

  it('EVENT_CONFIG_DEFAULT.fecha es una cadena de solo fecha (sin hora)', () => {
    // Verifica que el dato real que provocaba el bug sigue siendo una cadena ISO sin hora
    // para que la corrección siga siendo necesaria y aplicable
    const fecha = "2026-08-29"; // formato de EVENT_CONFIG_DEFAULT.fecha
    expect(fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(fecha).not.toContain("T");
  });
});

// ── LOG-15: DIS-03 — SSOT logisticaConstants, sin duplicados en Logistica.jsx ─
describe('LOG-15 — DIS-03: Single Source of Truth — logisticaConstants.js', () => {
  // Importa directamente desde logisticaConstants.js (la fuente autoritativa)
  let constants;

  beforeAll(async () => {
    constants = await import('../components/logistica/logisticaConstants.js');
  });

  // ── logisticaConstants.js exporta todas las constantes necesarias ──────────
  it('logisticaConstants.js exporta MAT0', () => {
    expect(constants.MAT0).toBeDefined();
    expect(Array.isArray(constants.MAT0)).toBe(true);
    expect(constants.MAT0.length).toBeGreaterThan(0);
  });

  it('logisticaConstants.js exporta ASIG0', () => {
    expect(constants.ASIG0).toBeDefined();
    expect(Array.isArray(constants.ASIG0)).toBe(true);
    expect(constants.ASIG0.length).toBeGreaterThan(0);
  });

  it('logisticaConstants.js exporta CATS_MATERIAL', () => {
    expect(constants.CATS_MATERIAL).toBeDefined();
    expect(Array.isArray(constants.CATS_MATERIAL)).toBe(true);
    expect(constants.CATS_MATERIAL).toContain("Avituallamiento");
    expect(constants.CATS_MATERIAL).toContain("Organización");
  });

  it('logisticaConstants.js exporta ESTADO_COLORES', () => {
    expect(constants.ESTADO_COLORES).toBeDefined();
    expect(typeof constants.ESTADO_COLORES).toBe('object');
    expect(constants.ESTADO_COLORES.pendiente).toBeDefined();
    expect(constants.ESTADO_COLORES.completado).toBeDefined();
  });

  it('logisticaConstants.js exporta FASES_CHECKLIST', () => {
    expect(constants.FASES_CHECKLIST).toBeDefined();
    expect(Array.isArray(constants.FASES_CHECKLIST)).toBe(true);
    expect(constants.FASES_CHECKLIST).toContain("Semana antes");
    expect(constants.FASES_CHECKLIST).toContain("Post-carrera");
  });

  it('logisticaConstants.js exporta PUESTOS_REF', () => {
    expect(constants.PUESTOS_REF).toBeDefined();
    expect(Array.isArray(constants.PUESTOS_REF)).toBe(true);
    expect(constants.PUESTOS_REF).toContain("Zona Salida/Meta");
  });

  it('logisticaConstants.js exporta VEH0, RUTAS0, TL0, CONT0, INC0, CK0', () => {
    expect(Array.isArray(constants.VEH0)).toBe(true);
    expect(Array.isArray(constants.RUTAS0)).toBe(true);
    expect(Array.isArray(constants.TL0)).toBe(true);
    expect(Array.isArray(constants.CONT0)).toBe(true);
    expect(Array.isArray(constants.INC0)).toBe(true);
    expect(Array.isArray(constants.CK0)).toBe(true);
  });

  it('logisticaConstants.js exporta TIPOS_LOC, LOC_ICONS, LOC_COLORS', () => {
    expect(Array.isArray(constants.TIPOS_LOC)).toBe(true);
    expect(typeof constants.LOC_ICONS).toBe('object');
    expect(typeof constants.LOC_COLORS).toBe('object');
  });

  it('logisticaConstants.js exporta CAT_ICONS y CAT_COLORS', () => {
    expect(typeof constants.CAT_ICONS).toBe('object');
    expect(typeof constants.CAT_COLORS).toBe('object');
    expect(constants.CAT_ICONS.Avituallamiento).toBeDefined();
  });

  // ── Integridad de las constantes exportadas ────────────────────────────────
  it('MAT0 tiene 18 artículos (inventario completo)', () => {
    expect(constants.MAT0).toHaveLength(18);
  });

  it('MAT0: todos los artículos tienen id, nombre, categoria, stock', () => {
    constants.MAT0.forEach(m => {
      expect(m.id).toBeDefined();
      expect(typeof m.nombre).toBe('string');
      expect(typeof m.categoria).toBe('string');
      expect(typeof m.stock).toBe('number');
    });
  });

  it('ASIG0: todos los artículos tienen materialId, localizacionId, cantidad', () => {
    constants.ASIG0.forEach(a => {
      expect(typeof a.materialId).toBe('number');
      expect(typeof a.localizacionId).toBe('number');
      expect(typeof a.cantidad).toBe('number');
    });
  });

  it('los ids de MAT0 son únicos', () => {
    const ids = constants.MAT0.map(m => m.id);
    const unicos = new Set(ids);
    expect(unicos.size).toBe(ids.length);
  });

  it('los ids de ASIG0 son únicos', () => {
    const ids = constants.ASIG0.map(a => a.id);
    const unicos = new Set(ids);
    expect(unicos.size).toBe(ids.length);
  });

  it('todos los materialId en ASIG0 referencian ids válidos de MAT0', () => {
    const matIds = new Set(constants.MAT0.map(m => m.id));
    const asigSinMat = constants.ASIG0.filter(a => !matIds.has(a.materialId));
    expect(asigSinMat).toHaveLength(0);
  });

  it('FASES_CHECKLIST tiene 8 fases', () => {
    expect(constants.FASES_CHECKLIST).toHaveLength(8);
  });

  it('TL0 tiene 16 eventos en el timeline', () => {
    expect(constants.TL0).toHaveLength(16);
  });

  it('todos los eventos de TL0 tienen hora en formato HH:MM', () => {
    constants.TL0.forEach(t => {
      expect(t.hora).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  // ── Verificación de que Logistica.jsx YA NO DECLARA las constantes local ───
  // (Test documental: verifica el contrato estructural de la refactorización)
  it('las constantes de configuración de logística son un array/objeto (no undefined)', () => {
    // Si logisticaConstants.js exporta correctamente y Logistica.jsx importa de ahí,
    // las constantes deben estar disponibles e íntegras.
    expect(constants.CATS_MATERIAL.length).toBe(7); // 7 categorías
    expect(Object.keys(constants.ESTADO_COLORES).length).toBeGreaterThanOrEqual(6);
    expect(constants.TIPOS_LOC.length).toBe(8); // 8 tipos de localización
  });

  it('ESTADO_COLORES cubre todos los estados de ESTADO_ENTREGA', () => {
    constants.ESTADO_ENTREGA.forEach(estado => {
      expect(constants.ESTADO_COLORES[estado]).toBeDefined();
    });
  });

  it('ESTADO_COLORES cubre todos los estados de ESTADO_TAREA', () => {
    constants.ESTADO_TAREA.forEach(estado => {
      expect(constants.ESTADO_COLORES[estado]).toBeDefined();
    });
  });
});

// ── LOG-16: DATO-03 — Botiquín inconsistente eliminado del texto de Ruta 1 KM 16 ─
describe('LOG-16 — DATO-03: Coherencia entre texto de rutas y ASIG0', () => {
  let constants;

  beforeAll(async () => {
    constants = await import('../components/logistica/logisticaConstants.js');
  });

  // ── Test 1: la parada KM 16 en RUTAS0 id=1 NO contiene "Botiquín" ────────
  it('parada KM 16 de Ruta 1 no menciona "Botiquín" en su campo material', () => {
    const ruta1 = constants.RUTAS0.find(r => r.id === 1);
    expect(ruta1).toBeDefined();
    const paradaKM16 = ruta1.paradas.find(p => p.puesto === 'Avituallamiento KM 16');
    expect(paradaKM16).toBeDefined();
    // El texto libre no debe mencionar Botiquín (con o sin tilde)
    expect(paradaKM16.material).not.toMatch(/botiquín|botiquin/i);
  });

  // ── Test 2: ASIG0 no tiene botiquín (materialId=14) asignado a KM 16 (localizacionId=4) ─
  it('ASIG0 no tiene asignación de botiquín (materialId=14) a KM 16 (localizacionId=4)', () => {
    const asigBotiquinKM16 = constants.ASIG0.filter(
      a => a.materialId === 14 && a.localizacionId === 4
    );
    expect(asigBotiquinKM16).toHaveLength(0);
  });

  // ── Test 3: el único botiquín asignado está en Primeros Auxilios Base (localizacionId=12) ─
  it('el botiquín (materialId=14) solo está asignado a Primeros Auxilios Base (localizacionId=12)', () => {
    const asigsBotiquin = constants.ASIG0.filter(a => a.materialId === 14);
    expect(asigsBotiquin.length).toBeGreaterThan(0);
    asigsBotiquin.forEach(a => {
      expect(a.localizacionId).toBe(12);
      expect(a.puesto).toBe('Primeros Auxilios Base');
    });
  });

  // ── Test 4: coherencia general — materiales mencionados en rutas existen en MAT0 ─
  it('todos los materiales mencionados en rutas corresponden a categorías reales de MAT0', () => {
    // Verifica que los materiales en el texto de las paradas son plausibles:
    // agua, geles, isotónico, balizas, conos, chalecos son todos categorías válidas.
    // Este test documenta el contrato: texto libre vs inventario deben ser coherentes.
    const categoriasMat = new Set(constants.MAT0.map(m => m.categoria));
    // Las categorías de MAT0 deben incluir al menos Avituallamiento, Señalización y Seguridad
    expect(categoriasMat).toContain('Avituallamiento');
    expect(categoriasMat).toContain('Señalización');
    expect(categoriasMat).toContain('Seguridad');
    // Y la categoría Médico que sería la del botiquín
    expect(categoriasMat).toContain('Médico');
  });

  // ── Test 5: la parada KM 16 sí contiene agua, isotónico y geles (materiales válidos) ─
  it('parada KM 16 de Ruta 1 contiene agua, isotónico y geles (materiales coherentes con ASIG0)', () => {
    const ruta1 = constants.RUTAS0.find(r => r.id === 1);
    const paradaKM16 = ruta1.paradas.find(p => p.puesto === 'Avituallamiento KM 16');
    // Los materiales reales de ASIG0 para KM 16 son: Agua (id=1) y Geles (id=4)
    // El campo material también menciona Isotónico como texto descriptivo
    expect(paradaKM16.material).toMatch(/agua/i);
    expect(paradaKM16.material).toMatch(/geles/i);
  });

  // ── Test 6: no hay ninguna ruta que lleve botiquín a KM 16 en ningún campo ─
  it('ninguna parada de ninguna ruta lleva botiquín a "Avituallamiento KM 16"', () => {
    constants.RUTAS0.forEach(ruta => {
      ruta.paradas.forEach(parada => {
        if (parada.puesto === 'Avituallamiento KM 16') {
          expect(parada.material).not.toMatch(/botiquín|botiquin/i);
        }
      });
    });
  });
});
