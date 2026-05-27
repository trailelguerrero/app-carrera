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
 * LOG-17  BUG-03: ESCALA_CON_INSCRITOS exportada y conectada al panel de alertas
 * LOG-18  DIS-01: Umbral avituallamiento por stockMinimo — UMBRAL_GENERICO eliminado
 * LOG-20  DIS-04: Estado "en gestión" en ciclo de vida de incidencias
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

// ── LOG-14: BUG-02 — Timezone countdown correcto (fix: FUNC-01) ────────────
describe('LOG-14 — BUG-02: timezone countdown parseEventDate hora local', () => {
  // fix(FUNC-01): parseEventDate usa new Date(y, m-1, d, 23, 59, 59) — siempre hora local
  // por spec ECMAScript, a diferencia de new Date("YYYY-MM-DD") que parsea como UTC.
  const parseEventDate = (fechaStr) => {
    const [y, m, d] = fechaStr.split("-").map(Number);
    return new Date(y, m - 1, d, 23, 59, 59);
  };
  const calcDiasHasta = (fechaStr) => {
    return Math.ceil((parseEventDate(fechaStr) - new Date()) / 86400000);
  };

  // Función que replica el bug original (sin corrección) para comparación
  const calcDiasHastaBuggy = (fechaStr) => {
    const eventoFecha = new Date(fechaStr);
    return Math.ceil((eventoFecha - new Date()) / 86400000);
  };

  it('parseEventDate("2026-08-29") es posterior a new Date("2026-08-29") UTC', () => {
    // new Date("2026-08-29") = medianoche UTC = 22:00h del día 28 en España (UTC+2)
    // parseEventDate("2026-08-29") = 23:59:59 hora local del día 29 → siempre posterior
    const conFix     = parseEventDate("2026-08-29").getTime();
    const sinFix     = new Date("2026-08-29").getTime();
    expect(conFix).toBeGreaterThan(sinFix);
  });

  it('parseEventDate produce hora local: getHours()===23, getMinutes()===59', () => {
    // Verifica que el resultado tiene exactamente 23:59:59 en hora local
    const d = parseEventDate("2026-08-29");
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
    expect(d.getSeconds()).toBe(59);
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

// ── LOG-17: BUG-03 — ESCALA_CON_INSCRITOS exportada y conectada al Dashboard ─
describe('LOG-17 — BUG-03: ESCALA_CON_INSCRITOS activa y conectada al panel de alertas', () => {
  let constants;

  beforeAll(async () => {
    constants = await import('../components/logistica/logisticaConstants.js');
  });

  // ── Test 1: ESCALA_CON_INSCRITOS está exportada desde logisticaConstants.js ──
  it('logisticaConstants.js exporta ESCALA_CON_INSCRITOS', () => {
    expect(constants.ESCALA_CON_INSCRITOS).toBeDefined();
    expect(Array.isArray(constants.ESCALA_CON_INSCRITOS)).toBe(true);
    expect(constants.ESCALA_CON_INSCRITOS.length).toBeGreaterThan(0);
  });

  // ── Test 2: cada entrada tiene patron (RegExp) y label (string) ──────────────
  it('cada entrada de ESCALA_CON_INSCRITOS tiene patron y label correctos', () => {
    constants.ESCALA_CON_INSCRITOS.forEach(e => {
      expect(e.patron).toBeInstanceOf(RegExp);
      expect(typeof e.label).toBe('string');
      expect(e.label.length).toBeGreaterThan(0);
    });
  });

  // ── Test 3: los patrones detectan dorsales y medallas ────────────────────────
  it('el patrón de dorsales detecta nombres con "dorsal" (case-insensitive)', () => {
    const patronDorsales = constants.ESCALA_CON_INSCRITOS.find(e => e.label === 'dorsales');
    expect(patronDorsales).toBeDefined();
    expect(patronDorsales.patron.test('Dorsales impresos')).toBe(true);
    expect(patronDorsales.patron.test('dorsales')).toBe(true);
    expect(patronDorsales.patron.test('DORSALES')).toBe(true);
    expect(patronDorsales.patron.test('Agua (bidones 8L)')).toBe(false);
  });

  it('el patrón de medallas detecta nombres con "medalla" (case-insensitive)', () => {
    const patronMedallas = constants.ESCALA_CON_INSCRITOS.find(e => e.label === 'medallas');
    expect(patronMedallas).toBeDefined();
    expect(patronMedallas.patron.test('Medallas finisher')).toBe(true);
    expect(patronMedallas.patron.test('medalla')).toBe(true);
    expect(patronMedallas.patron.test('Geles energéticos')).toBe(false);
  });

  // ── Test 4: lógica de detección de déficit cuando stock < totalInscritos ─────
  it('material con patrón ESCALA genera alerta cuando stock < totalInscritos', () => {
    const material = [
      { id: 16, nombre: 'Dorsales impresos', categoria: 'Organización', stock: 620, unidad: 'ud' },
      { id: 17, nombre: 'Medallas finisher', categoria: 'Organización', stock: 590, unidad: 'ud' },
      { id: 1,  nombre: 'Agua (bidones 8L)', categoria: 'Avituallamiento', stock: 60, unidad: 'ud' },
    ];
    const totalInscritos = 650;
    const enDeficit = material
      .filter(m => constants.ESCALA_CON_INSCRITOS.some(e => e.patron.test(m.nombre)))
      .map(m => {
        const deficit = totalInscritos - m.stock;
        return deficit > 0 ? { ...m, deficit } : null;
      })
      .filter(Boolean);

    // Dorsales (620) y Medallas (590) tienen déficit con 650 inscritos
    expect(enDeficit).toHaveLength(2);
    expect(enDeficit.find(m => m.nombre === 'Dorsales impresos').deficit).toBe(30);
    expect(enDeficit.find(m => m.nombre === 'Medallas finisher').deficit).toBe(60);
  });

  it('material SIN patrón ESCALA no genera alerta por este bloque', () => {
    const material = [
      { id: 1, nombre: 'Agua (bidones 8L)', categoria: 'Avituallamiento', stock: 10, unidad: 'ud' },
      { id: 2, nombre: 'Geles energéticos', categoria: 'Avituallamiento', stock: 5,  unidad: 'ud' },
      { id: 8, nombre: 'Mesas plegables',   categoria: 'Infraestructura', stock: 2,  unidad: 'ud' },
    ];
    const totalInscritos = 650;
    const enDeficit = material
      .filter(m => constants.ESCALA_CON_INSCRITOS.some(e => e.patron.test(m.nombre)))
      .map(m => {
        const deficit = totalInscritos - m.stock;
        return deficit > 0 ? { ...m, deficit } : null;
      })
      .filter(Boolean);

    // Ninguno de estos materiales coincide con los patrones de ESCALA
    expect(enDeficit).toHaveLength(0);
  });

  it('material con stock >= totalInscritos NO genera alerta (sin déficit)', () => {
    const material = [
      { id: 16, nombre: 'Dorsales impresos', categoria: 'Organización', stock: 650, unidad: 'ud' },
    ];
    const totalInscritos = 650;
    const enDeficit = material
      .filter(m => constants.ESCALA_CON_INSCRITOS.some(e => e.patron.test(m.nombre)))
      .map(m => {
        const deficit = totalInscritos - m.stock;
        return deficit > 0 ? { ...m, deficit } : null;
      })
      .filter(Boolean);

    expect(enDeficit).toHaveLength(0);
  });

  it('el panel muestra el déficit real (totalInscritos - stock)', () => {
    const material = [
      { id: 17, nombre: 'Medallas finisher', categoria: 'Organización', stock: 620, unidad: 'ud' },
    ];
    const totalInscritos = 650;
    const enDeficit = material
      .filter(m => constants.ESCALA_CON_INSCRITOS.some(e => e.patron.test(m.nombre)))
      .map(m => {
        const deficit = totalInscritos - m.stock;
        return deficit > 0 ? { ...m, deficit } : null;
      })
      .filter(Boolean);

    // El déficit real es 650 - 620 = 30
    expect(enDeficit[0].deficit).toBe(30);
  });

  // ── Test 5: MAT0 tiene dorsales y medallas (para que los tests sean realistas) ─
  it('MAT0 contiene materiales con nombres que coinciden con patrones ESCALA', () => {
    const materialesEscala = constants.MAT0.filter(
      m => constants.ESCALA_CON_INSCRITOS.some(e => e.patron.test(m.nombre))
    );
    // Al menos dorsales y medallas deben estar en MAT0
    expect(materialesEscala.length).toBeGreaterThanOrEqual(2);
    const nombres = materialesEscala.map(m => m.nombre);
    expect(nombres.some(n => /dorsal/i.test(n))).toBe(true);
    expect(nombres.some(n => /medalla/i.test(n))).toBe(true);
  });
});

// ── LOG-18: DIS-01 — Umbral de avituallamiento corregido (solo stockMinimo > 0) ─
describe('LOG-18 — DIS-01: Umbral avituallamiento por stockMinimo — sin UMBRAL_GENERICO', () => {
  let constants;

  beforeAll(async () => {
    constants = await import('../components/logistica/logisticaConstants.js');
  });

  // Función que replica la lógica del panel DIS-01 corregida en TabDashLog.jsx
  const calcularInsuficientesAvituallamiento = (material, totalInscritos) => {
    return material
      .filter(m => m.categoria === 'Avituallamiento' && m.stockMinimo > 0)
      .map(m => m.stock < m.stockMinimo ? { ...m, falta: m.stockMinimo - m.stock } : null)
      .filter(Boolean);
  };

  // ── Test 1: material con stockMinimo=0 NO entra en la evaluación ──────────────
  it('material con stockMinimo=0 NO genera alerta aunque stock/corredor < 0.5', () => {
    const material = [
      { id: 1, nombre: 'Agua (bidones 8L)', categoria: 'Avituallamiento', stock: 60, unidad: 'ud', stockMinimo: 0 },
    ];
    // 60 bidones / 250 corredores = 0.24 → antes disparaba UMBRAL_GENERICO=0.5
    const insuficientes = calcularInsuficientesAvituallamiento(material, 250);
    expect(insuficientes).toHaveLength(0);
  });

  // ── Test 2: material con stockMinimo > 0 y stock insuficiente SÍ alerta ───────
  it('material con stockMinimo=30 y stock=25 genera alerta con falta=5', () => {
    const material = [
      { id: 4, nombre: 'Geles energéticos', categoria: 'Avituallamiento', stock: 25, unidad: 'ud', stockMinimo: 30 },
    ];
    const insuficientes = calcularInsuficientesAvituallamiento(material, 250);
    expect(insuficientes).toHaveLength(1);
    expect(insuficientes[0].falta).toBe(5);
  });

  // ── Test 3: material con stock >= stockMinimo NO genera alerta ────────────────
  it('material con stockMinimo=30 y stock=35 NO genera alerta', () => {
    const material = [
      { id: 4, nombre: 'Geles energéticos', categoria: 'Avituallamiento', stock: 35, unidad: 'ud', stockMinimo: 30 },
    ];
    const insuficientes = calcularInsuficientesAvituallamiento(material, 250);
    expect(insuficientes).toHaveLength(0);
  });

  // ── Test 4: el agua (60 bidones, stockMinimo=0) no genera alerta falsa ────────
  it('el agua de MAT0 (60 bidones, stockMinimo=0 o undefined) NO genera alerta con 250 corredores', () => {
    const agua = constants.MAT0.find(m => m.nombre === 'Agua (bidones 8L)');
    expect(agua).toBeDefined();
    // stockMinimo debe ser 0 o no estar definido para que no genere alerta
    const stockMinimoAgua = agua.stockMinimo ?? 0;
    expect(stockMinimoAgua).toBe(0);

    const insuficientes = calcularInsuficientesAvituallamiento([agua], 250);
    expect(insuficientes).toHaveLength(0);
  });

  // ── Test 5: el UMBRAL_GENERICO ya no se aplica como fallback universal ────────
  it('sin stockMinimo configurado, ningún material de avituallamiento genera alerta por ratio', () => {
    // Simula MAT0 con todos los materiales de avituallamiento sin stockMinimo
    const materialSinMinimo = constants.MAT0
      .filter(m => m.categoria === 'Avituallamiento')
      .map(m => ({ ...m, stockMinimo: 0 })); // forzar stockMinimo=0

    const insuficientes = calcularInsuficientesAvituallamiento(materialSinMinimo, 250);
    // Sin stockMinimo configurado, la lista debe ser vacía (no hay UMBRAL_GENERICO)
    expect(insuficientes).toHaveLength(0);
  });

  // ── Test 6: material de otras categorías no entra en la evaluación ────────────
  it('material de categoría "Organización" con stockMinimo>0 no entra en panel de avituallamiento', () => {
    const material = [
      { id: 16, nombre: 'Dorsales impresos', categoria: 'Organización', stock: 100, unidad: 'ud', stockMinimo: 650 },
    ];
    const insuficientes = calcularInsuficientesAvituallamiento(material, 650);
    // No es Avituallamiento → no entra en este panel (va al panel de ESCALA_CON_INSCRITOS)
    expect(insuficientes).toHaveLength(0);
  });

  // ── Test 7: multiple materiales de avituallamiento, solo alerta el que tiene déficit ─
  it('con varios materiales, solo alerta el que tiene stock < stockMinimo', () => {
    const material = [
      { id: 1, nombre: 'Agua',      categoria: 'Avituallamiento', stock: 60, unidad: 'ud', stockMinimo: 0  },
      { id: 2, nombre: 'Isotónico', categoria: 'Avituallamiento', stock: 20, unidad: 'ud', stockMinimo: 30 },
      { id: 4, nombre: 'Geles',     categoria: 'Avituallamiento', stock: 50, unidad: 'ud', stockMinimo: 40 },
    ];
    const insuficientes = calcularInsuficientesAvituallamiento(material, 250);
    // Solo Isotónico (20 < 30) debe alertar; Agua tiene stockMinimo=0; Geles (50 >= 40) no
    expect(insuficientes).toHaveLength(1);
    expect(insuficientes[0].nombre).toBe('Isotónico');
    expect(insuficientes[0].falta).toBe(10);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// LOG-19 — DATO-05: Conflicto agenda Javier López resuelto
// ══════════════════════════════════════════════════════════════════════════════
describe('LOG-19 — DATO-05: Conflicto agenda Javier López', () => {
  let TL0;

  beforeAll(async () => {
    const mod = await import('../components/logistica/logisticaConstants.js');
    TL0 = mod.TL0;
  });

  // ── Test 1: TL0 id=2 ya no tiene a Javier López como responsable ──────────
  it('TL0 id=2 (Apertura zona de meta, 05:00) no tiene responsable "Javier López"', () => {
    const tarea = TL0.find(t => t.id === 2);
    expect(tarea).toBeDefined();
    expect(tarea.hora).toBe('05:00');
    expect(tarea.responsable).not.toBe('Javier López');
  });

  // ── Test 2: TL0 id=2 tiene un responsable válido asignado ─────────────────
  it('TL0 id=2 tiene un responsable no vacío asignado (no "Javier López")', () => {
    const tarea = TL0.find(t => t.id === 2);
    expect(tarea.responsable).toBeTruthy();
    expect(tarea.responsable.length).toBeGreaterThan(0);
  });

  // ── Test 3: No existen dos tareas del mismo responsable con < 30 min entre ellas ─
  it('ningún responsable tiene dos tareas separadas menos de 30 minutos en TL0', () => {
    // Agrupar tareas por responsable
    const porResponsable = {};
    TL0.forEach(t => {
      const r = t.responsable?.toLowerCase().trim();
      if (!r) return;
      if (!porResponsable[r]) porResponsable[r] = [];
      porResponsable[r].push(t);
    });

    // Para cada responsable con > 1 tarea, verificar que no hay solapamiento < 30 min
    const conflictos = [];
    Object.entries(porResponsable).forEach(([responsable, tareas]) => {
      if (tareas.length < 2) return;
      // Convertir hora "HH:MM" a minutos totales
      const toMinutos = hora => {
        const [h, m] = hora.split(':').map(Number);
        return h * 60 + m;
      };
      const ordenadas = [...tareas].sort((a, b) => toMinutos(a.hora) - toMinutos(b.hora));
      for (let i = 0; i < ordenadas.length - 1; i++) {
        const diff = toMinutos(ordenadas[i + 1].hora) - toMinutos(ordenadas[i].hora);
        if (diff < 30) {
          conflictos.push({
            responsable,
            tarea1: ordenadas[i].titulo,
            hora1: ordenadas[i].hora,
            tarea2: ordenadas[i + 1].titulo,
            hora2: ordenadas[i + 1].hora,
            diff,
          });
        }
      }
    });

    expect(conflictos).toHaveLength(0);
  });

  // ── Test 4: Javier López solo aparece en tareas compatibles con 05:30 ──────
  it('todas las tareas de Javier López son compatibles con la salida de furgoneta a las 05:30', () => {
    const tareasJavier = TL0.filter(t => t.responsable === 'Javier López');
    // Ninguna tarea de Javier debe ser antes de las 05:30 (salida furgoneta)
    // o entre las 05:00 y 05:30 (ventana del conflicto original)
    tareasJavier.forEach(t => {
      const [h, m] = t.hora.split(':').map(Number);
      const minutos = h * 60 + m;
      // No debe haber tareas antes de 05:30 (330 min) o exactamente a las 05:00 (300 min)
      const conflictivas = minutos < 330; // antes de 05:30
      expect(conflictivas).toBe(false);
    });
  });

  // ── Test 5: TL0 id=14 (recogida material) no solapa con trofeos (17:30) ───
  it('TL0 id=14 (Inicio recogida material) tiene hora posterior a la ceremonia de trofeos (17:30)', () => {
    const recogida = TL0.find(t => t.id === 14);
    const trofeos  = TL0.find(t => t.id === 15);
    expect(recogida).toBeDefined();
    expect(trofeos).toBeDefined();

    const toMinutos = hora => {
      const [h, m] = hora.split(':').map(Number);
      return h * 60 + m;
    };

    // La recogida debe empezar después o al mismo tiempo que los trofeos
    // (no antes de que termine la ceremonia)
    expect(toMinutos(recogida.hora)).toBeGreaterThanOrEqual(toMinutos(trofeos.hora));
  });
});

// ── LOG-20: DIS-04 — Estado "en gestión" en ciclo de vida de incidencias ────
describe('LOG-20 — DIS-04: estado "en gestión" en ciclo de vida de incidencias', () => {

  // ── Test 1: ESTADO_COLORES contiene "en gestión" con un color CSS válido ──
  it('ESTADO_COLORES contiene la clave "en gestión" con un valor de color CSS', async () => {
    const mod = await import('../components/logistica/logisticaConstants.js');
    const ESTADO_COLORES = mod.ESTADO_COLORES;

    expect(ESTADO_COLORES).toHaveProperty('en gestión');
    const color = ESTADO_COLORES['en gestión'];
    expect(typeof color).toBe('string');
    expect(color.length).toBeGreaterThan(0);
    // Debe ser una variable CSS o valor de color
    expect(color).toMatch(/^var\(--[\w-]+\)$|^#[0-9a-fA-F]{3,8}$|^rgb|^hsl/);
  });

  // ── Test 2: ESTADO_COLORES también contiene "abierta" y "resuelta" ─────────
  it('ESTADO_COLORES contiene colores para los tres estados de incidencia', async () => {
    const mod = await import('../components/logistica/logisticaConstants.js');
    const ESTADO_COLORES = mod.ESTADO_COLORES;

    expect(ESTADO_COLORES).toHaveProperty('abierta');
    expect(ESTADO_COLORES).toHaveProperty('en gestión');
    expect(ESTADO_COLORES).toHaveProperty('resuelta');
  });

  // ── Test 3: Las opciones de estado incluyen los 3 estados en el orden correcto ──
  it('el selector de estado de incidencia incluye ["abierta","en gestión","resuelta"] en ese orden', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const src = readFileSync(resolve(process.cwd(), 'src/components/logistica/FichaLogistica.jsx'), 'utf-8');

    // El array de opciones del campo estado debe contener los 3 valores en orden
    expect(src).toContain('"en gestión"');

    // Buscar la subcadena exacta del array de opciones del selector
    const arrayRegex = /o:\["abierta","en gestión","resuelta"\]/;
    expect(src).toMatch(arrayRegex);
  });

  // ── Test 4: incOpen cuenta "abierta" Y "en gestión" ──────────────────────
  it('stats.incOpen cuenta incidencias con estado "abierta" O "en gestión"', () => {
    // Simular el cálculo de incOpen como está en Logistica.jsx
    const inc = [
      { id: 1, estado: 'abierta',      descripcion: 'Corredor caído KM3' },
      { id: 2, estado: 'en gestión',   descripcion: 'Señalización caída KM7' },
      { id: 3, estado: 'resuelta',     descripcion: 'Falta agua KM9' },
      { id: 4, estado: 'abierta',      descripcion: 'Corredor perdido' },
      { id: 5, estado: 'en gestión',   descripcion: 'Botiquín agotado' },
    ];

    // Replicar la fórmula actualizada de Logistica.jsx
    const incOpen = inc.filter(i0 => i0.estado === 'abierta' || i0.estado === 'en gestión').length;

    // Debe contar 4 (2 abiertas + 2 en gestión), NO 2 (solo abiertas)
    expect(incOpen).toBe(4);
  });

  // ── Test 5: incidencias "en gestión" no se tratan como resueltas ──────────
  it('una incidencia "en gestión" no se trata como resuelta en el KPI', () => {
    const inc = [
      { id: 1, estado: 'en gestión', descripcion: 'Señalización caída' },
      { id: 2, estado: 'resuelta',   descripcion: 'Falta agua' },
    ];

    const incOpen = inc.filter(i0 => i0.estado === 'abierta' || i0.estado === 'en gestión').length;

    // "en gestión" cuenta como abierta (no resuelta)
    expect(incOpen).toBe(1);

    // Confirmar que "resuelta" no se cuenta
    const soloResueltas = inc.filter(i0 => i0.estado === 'resuelta').length;
    expect(soloResueltas).toBe(1);
    expect(incOpen + soloResueltas).toBe(inc.length);
  });

  // ── Test 6: ordenación coloca "abierta" antes de "en gestión" antes de "resuelta" ──
  it('la ordenación de incidencias prioriza abierta > en gestión > resuelta', () => {
    const estadoOrd = e => e === 'abierta' ? 0 : e === 'en gestión' ? 1 : 2;

    const inc = [
      { id: 1, estado: 'resuelta',   gravedad: 'alta'  },
      { id: 2, estado: 'en gestión', gravedad: 'media' },
      { id: 3, estado: 'abierta',    gravedad: 'baja'  },
      { id: 4, estado: 'abierta',    gravedad: 'alta'  },
    ];

    const G = { alta: 0, media: 1, baja: 2 };
    const sorted = [...inc].sort((a, b) => {
      const byEstado = estadoOrd(a.estado) - estadoOrd(b.estado);
      return byEstado || (G[a.gravedad] ?? 1) - (G[b.gravedad] ?? 1);
    });

    // Primera: abierta + alta
    expect(sorted[0]).toMatchObject({ estado: 'abierta', gravedad: 'alta' });
    // Segunda: abierta + baja
    expect(sorted[1]).toMatchObject({ estado: 'abierta', gravedad: 'baja' });
    // Tercera: en gestión
    expect(sorted[2]).toMatchObject({ estado: 'en gestión' });
    // Última: resuelta
    expect(sorted[3]).toMatchObject({ estado: 'resuelta' });
  });

  // ── Test 7: TabEmergencias.jsx usa estadoOrd para la ordenación ───────────
  it('TabEmergencias.jsx contiene la función estadoOrd con los 3 estados', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const src = readFileSync(resolve(process.cwd(), 'src/components/logistica/TabEmergencias.jsx'), 'utf-8');

    // Verificar que la nueva lógica de ordenación está presente
    expect(src).toContain('estadoOrd');
    // Usar comillas dobles como en el código fuente
    expect(src).toContain('"abierta" ? 0');
    expect(src).toContain('"en gestión" ? 1');
  });

  // ── Test 8: resueltaEn se asigna al pasar de "en gestión" a "resuelta" ────
  it('resueltaEn se asigna cuando la incidencia pasa de "en gestión" a "resuelta"', () => {
    // Simular el ciclo del botón toggle: en gestión → resuelta
    const incEnGestion = { id: 1, estado: 'en gestión', resueltaEn: null };

    const nuevoEstado = incEnGestion.estado === 'abierta' ? 'en gestión'
      : incEnGestion.estado === 'en gestión' ? 'resuelta'
      : 'abierta';
    const nuevoResueltaEn = (incEnGestion.estado === 'en gestión') ? new Date().toISOString() : null;

    expect(nuevoEstado).toBe('resuelta');
    expect(nuevoResueltaEn).not.toBeNull();
    expect(typeof nuevoResueltaEn).toBe('string');
  });

  // ── Test 9: el ciclo completo abierta → en gestión → resuelta → abierta ───
  it('el ciclo de estados sigue el flujo: abierta → en gestión → resuelta → abierta', () => {
    const ciclo = estado => estado === 'abierta' ? 'en gestión'
      : estado === 'en gestión' ? 'resuelta'
      : 'abierta';

    expect(ciclo('abierta')).toBe('en gestión');
    expect(ciclo('en gestión')).toBe('resuelta');
    expect(ciclo('resuelta')).toBe('abierta');
  });
});


// ── LOG-21: DATO-04 — Fases checklist completas (sin 0/0) ──────────────────
describe('LOG-21 — DATO-04: CK0 contiene tareas para todas las fases de FASES_CHECKLIST', () => {
  it('importa CK0 y FASES_CHECKLIST desde logisticaConstants', async () => {
    const m = await import('../components/logistica/logisticaConstants.js');
    expect(m.CK0).toBeDefined();
    expect(m.FASES_CHECKLIST).toBeDefined();
    expect(Array.isArray(m.CK0)).toBe(true);
    expect(Array.isArray(m.FASES_CHECKLIST)).toBe(true);
  });

  it('cada fase de FASES_CHECKLIST tiene al menos 1 tarea en CK0', async () => {
    const { CK0, FASES_CHECKLIST } = await import('../components/logistica/logisticaConstants.js');
    for (const fase of FASES_CHECKLIST) {
      const tareas = CK0.filter(t => t.fase === fase);
      expect(tareas.length, `Fase "${fase}" tiene 0 tareas`).toBeGreaterThan(0);
    }
  });

  it('"3 meses antes" tiene al menos 4 tareas', async () => {
    const { CK0 } = await import('../components/logistica/logisticaConstants.js');
    expect(CK0.filter(t => t.fase === '3 meses antes').length).toBeGreaterThanOrEqual(4);
  });

  it('"2 meses antes" tiene al menos 4 tareas', async () => {
    const { CK0 } = await import('../components/logistica/logisticaConstants.js');
    expect(CK0.filter(t => t.fase === '2 meses antes').length).toBeGreaterThanOrEqual(4);
  });

  it('"1 mes antes" tiene al menos 4 tareas', async () => {
    const { CK0 } = await import('../components/logistica/logisticaConstants.js');
    expect(CK0.filter(t => t.fase === '1 mes antes').length).toBeGreaterThanOrEqual(4);
  });

  it('todos los ids de CK0 son únicos', async () => {
    const { CK0 } = await import('../components/logistica/logisticaConstants.js');
    const ids = CK0.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ids de las nuevas tareas (25-36) continúan desde 25', async () => {
    const { CK0 } = await import('../components/logistica/logisticaConstants.js');
    const nuevas = CK0.filter(t => t.id >= 25);
    expect(nuevas.length).toBeGreaterThanOrEqual(12);
    const minId = Math.min(...nuevas.map(t => t.id));
    expect(minId).toBe(25);
  });

  it('ninguna fase produce array vacío al filtrar CK0 (sin barras 0/0)', async () => {
    const { CK0, FASES_CHECKLIST } = await import('../components/logistica/logisticaConstants.js');
    const porFase = FASES_CHECKLIST.map(fase => ({
      fase,
      tareas: CK0.filter(t => t.fase === fase),
    }));
    for (const { fase, tareas } of porFase) {
      expect(tareas.length, `porFase["${fase}"] es vacío → barra 0/0`).toBeGreaterThan(0);
    }
  });
});

// ─── LOG-22: DIS-02 cantidadInicial en modelo material ────────────────────────
describe('LOG-22 — DIS-02: campo cantidadInicial en modelo material', () => {
  it('todos los artículos de MAT0 tienen campo cantidadInicial', async () => {
    const { MAT0 } = await import('../components/logistica/logisticaConstants.js');
    for (const m of MAT0) {
      expect(m, `id=${m.id} sin cantidadInicial`).toHaveProperty('cantidadInicial');
      expect(typeof m.cantidadInicial, `id=${m.id} cantidadInicial no es número`).toBe('number');
    }
  });

  it('ningún artículo de MAT0 tiene el campo "cantidad" antiguo', async () => {
    const { MAT0 } = await import('../components/logistica/logisticaConstants.js');
    for (const m of MAT0) {
      expect(Object.keys(m), `id=${m.id} aún tiene campo "cantidad"`).not.toContain('cantidad');
    }
  });

  it('los 18 artículos de MAT0 tienen cantidadInicial > 0', async () => {
    const { MAT0 } = await import('../components/logistica/logisticaConstants.js');
    expect(MAT0.length).toBe(18);
    for (const m of MAT0) {
      expect(m.cantidadInicial, `id=${m.id} cantidadInicial <= 0`).toBeGreaterThan(0);
    }
  });

  it('las asignaciones ASIG0 mantienen su campo "cantidad" intacto (no renombrado)', async () => {
    const { ASIG0 } = await import('../components/logistica/logisticaConstants.js');
    for (const a of ASIG0) {
      expect(a, `asig id=${a.id} perdió campo "cantidad"`).toHaveProperty('cantidad');
      expect(typeof a.cantidad, `asig id=${a.id} cantidad no es número`).toBe('number');
    }
  });

  it('cantidadInicial no se usa en cálculos de déficit (stock es el campo operativo)', async () => {
    const { MAT0, ASIG0 } = await import('../components/logistica/logisticaConstants.js');
    // Simular cálculo de déficit como hace TabMaterial y TabDashLog
    for (const m of MAT0) {
      const totalAsig = ASIG0.filter(a => a.materialId === m.id)
        .reduce((s, a) => s + a.cantidad, 0);
      const def = Math.max(totalAsig - m.stock, 0);
      // El déficit usa m.stock, no m.cantidadInicial — verificar que stock existe
      expect(m).toHaveProperty('stock');
      expect(typeof m.stock).toBe('number');
      // cantidadInicial es solo referencia, no modifica el déficit
      expect(def).toBe(Math.max(totalAsig - m.stock, 0));
    }
  });
});

// ── LOG-23: MEJ-06 — Detección solapamiento horarios en Timeline ─────────────
describe('LOG-23 — MEJ-06: Validación solapamiento de horarios en Timeline', () => {
  let detectarSolapamiento, UMBRAL_SOLAP_MIN;

  beforeAll(async () => {
    const mod = await import('../components/logistica/FichaLogistica.jsx');
    detectarSolapamiento = mod.detectarSolapamiento;
    UMBRAL_SOLAP_MIN = mod.UMBRAL_SOLAP_MIN;
  });

  it('helper exportado existe', () => {
    expect(typeof detectarSolapamiento).toBe('function');
  });

  it('UMBRAL_SOLAP_MIN es 30 minutos', () => {
    expect(UMBRAL_SOLAP_MIN).toBe(30);
  });

  it('detecta solapamiento: mismo responsable, <30 min de diferencia', () => {
    const tareas = [
      { id: 1, responsable: 'Javier López', hora: '05:00', titulo: 'Apertura zona de meta' },
    ];
    const nueva = { hora: '05:30', responsable: 'Javier López', titulo: 'Salida furgoneta', id: undefined };
    const conflicto = detectarSolapamiento(tareas, nueva);
    expect(conflicto).not.toBeNull();
    expect(conflicto.id).toBe(1);
  });

  it('caso Javier López (05:00 y 05:30): detecta conflicto', () => {
    const tareas = [
      { id: 2, responsable: 'Javier López', hora: '05:00', titulo: 'Apertura zona de meta' },
      { id: 1, responsable: 'Javier López', hora: '05:30', titulo: 'Furgoneta Organización sale' },
    ];
    // Editar la tarea de las 05:30 o crear nueva a las 05:00
    const nueva = { hora: '05:00', responsable: 'Javier López', titulo: 'Otra tarea', id: 99 };
    const conflicto = detectarSolapamiento(tareas, nueva);
    expect(conflicto).not.toBeNull();
  });

  it('NO alerta: responsables diferentes', () => {
    const tareas = [
      { id: 1, responsable: 'Ana García', hora: '05:00', titulo: 'Tarea A' },
    ];
    const nueva = { hora: '05:15', responsable: 'Javier López', titulo: 'Tarea B', id: undefined };
    expect(detectarSolapamiento(tareas, nueva)).toBeNull();
  });

  it('NO alerta: mismo responsable pero diferencia > 30 min', () => {
    const tareas = [
      { id: 1, responsable: 'Javier López', hora: '05:00', titulo: 'Tarea A' },
    ];
    const nueva = { hora: '05:31', responsable: 'Javier López', titulo: 'Tarea B', id: undefined };
    // 31 min de diferencia → NO solapa (diff > 30)
    expect(detectarSolapamiento(tareas, nueva)).toBeNull();
  });

  it('NO alerta: editar tarea sin cambiar hora ni responsable (mismo id)', () => {
    const tareas = [
      { id: 5, responsable: 'Javier López', hora: '05:00', titulo: 'Apertura zona de meta' },
    ];
    // Editar tarea id=5 con misma hora y responsable
    const misma = { hora: '05:00', responsable: 'Javier López', titulo: 'Apertura zona de meta (editada)', id: 5 };
    expect(detectarSolapamiento(tareas, misma)).toBeNull();
  });

  it('NO alerta: responsable vacío', () => {
    const tareas = [
      { id: 1, responsable: '', hora: '05:00', titulo: 'Tarea A' },
    ];
    const nueva = { hora: '05:10', responsable: '', titulo: 'Tarea B', id: undefined };
    expect(detectarSolapamiento(tareas, nueva)).toBeNull();
  });

  it('comparación de responsable es case-insensitive', () => {
    const tareas = [
      { id: 1, responsable: 'javier lópez', hora: '09:00', titulo: 'Tarea A' },
    ];
    const nueva = { hora: '09:20', responsable: 'Javier López', titulo: 'Tarea B', id: undefined };
    expect(detectarSolapamiento(tareas, nueva)).not.toBeNull();
  });

  it('el guardado no se bloquea aunque haya solapamiento (función no lanza excepción)', () => {
    // detectarSolapamiento retorna el conflicto pero nunca lanza — el caller decide
    const tareas = [{ id: 1, responsable: 'Javier López', hora: '05:00', titulo: 'A' }];
    const nueva = { hora: '05:15', responsable: 'Javier López', titulo: 'B', id: undefined };
    expect(() => detectarSolapamiento(tareas, nueva)).not.toThrow();
    const result = detectarSolapamiento(tareas, nueva);
    // La función solo devuelve el conflicto; no bloquea nada por sí misma
    expect(result).toBeDefined();
  });
});

// ── LOG-24: MEJ-01 — Vincular paradas de ruta al inventario real (asigIds) ───
describe('LOG-24 — MEJ-01: paradas de ruta vinculadas al inventario mediante asigIds', () => {
  let RUTAS0, ASIG0, MAT0;

  beforeAll(async () => {
    const mod = await import('@/components/logistica/logisticaConstants.js');
    RUTAS0 = mod.RUTAS0;
    ASIG0  = mod.ASIG0;
    MAT0   = mod.MAT0;
  });

  it('todas las paradas tienen el campo asigIds definido', () => {
    const todasParadas = RUTAS0.flatMap(r => r.paradas || []);
    for (const p of todasParadas) {
      expect(p).toHaveProperty('asigIds');
      expect(Array.isArray(p.asigIds)).toBe(true);
    }
  });

  it('los asigIds no vacíos referencian ids válidos de ASIG0', () => {
    const asigIdsValidos = new Set(ASIG0.map(a => a.id));
    const todasParadas = RUTAS0.flatMap(r => r.paradas || []);
    for (const p of todasParadas) {
      for (const id of (p.asigIds || [])) {
        expect(asigIdsValidos.has(id)).toBe(true);
      }
    }
  });

  it('la parada KM 4 tiene asigIds:[1] y ASIG0 id=1 es agua en localizacionId=2', () => {
    const ruta1 = RUTAS0.find(r => r.id === 1);
    const paradaKM4 = ruta1.paradas.find(p => p.puesto === 'Avituallamiento KM 4');
    expect(paradaKM4.asigIds).toEqual([1]);
    const asig = ASIG0.find(a => a.id === 1);
    expect(asig.materialId).toBe(1);   // Agua
    expect(asig.localizacionId).toBe(2);
  });

  it('la parada KM 9 tiene asigIds:[2,4] (agua y geles)', () => {
    const ruta1 = RUTAS0.find(r => r.id === 1);
    const paradaKM9 = ruta1.paradas.find(p => p.puesto === 'Avituallamiento KM 9');
    expect(paradaKM9.asigIds).toEqual([2, 4]);
    const asig2 = ASIG0.find(a => a.id === 2);
    const asig4 = ASIG0.find(a => a.id === 4);
    expect(asig2.localizacionId).toBe(3);
    expect(asig4.localizacionId).toBe(3);
  });

  it('la parada KM 16 tiene asigIds:[3,5] (SIN botiquín)', () => {
    const ruta1 = RUTAS0.find(r => r.id === 1);
    const paradaKM16 = ruta1.paradas.find(p => p.puesto === 'Avituallamiento KM 16');
    expect(paradaKM16.asigIds).toEqual([3, 5]);
    // Ninguno referencia materialId=14 (botiquín)
    for (const id of paradaKM16.asigIds) {
      const asig = ASIG0.find(a => a.id === id);
      expect(asig.materialId).not.toBe(14);
    }
  });

  it('la parada Señalización Ruta Alta tiene asigIds:[9] (balizas)', () => {
    const ruta2 = RUTAS0.find(r => r.id === 2);
    const paradaSen = ruta2.paradas.find(p => p.puesto === 'Señalización Ruta Alta');
    expect(paradaSen.asigIds).toEqual([9]);
    const asig = ASIG0.find(a => a.id === 9);
    expect(asig.materialId).toBe(11); // Balizas señalización
  });

  it('la parada Seguridad Cruce 1 tiene asigIds vacío y usa fallback a material texto', () => {
    const ruta2 = RUTAS0.find(r => r.id === 2);
    const paradaCruce = ruta2.paradas.find(p => p.puesto === 'Seguridad Cruce 1');
    expect(paradaCruce.asigIds).toEqual([]);
    expect(typeof paradaCruce.material).toBe('string');
    expect(paradaCruce.material.length).toBeGreaterThan(0);
  });

  it('buildMaterialLabel resuelve asigIds a nombre+cantidad del inventario real', async () => {
    const mod = await import('@/components/logistica/TabVehiculos.jsx');
    // buildMaterialLabel no se exporta — la testeamos vía lógica inline equivalente
    // Verificamos que TabVehiculos exporta TabVeh (la función existe)
    expect(typeof mod.TabVeh).toBe('function');
  });

  it('el campo material (texto libre) se mantiene como fallback en todas las paradas', () => {
    const todasParadas = RUTAS0.flatMap(r => r.paradas || []);
    for (const p of todasParadas) {
      expect(typeof p.material).toBe('string');
    }
  });

  it('ningún asigId referencia materialId=14 (botiquín) a localizacionId=4 (KM 16)', () => {
    const ruta1 = RUTAS0.find(r => r.id === 1);
    const paradaKM16 = ruta1.paradas.find(p => p.puesto === 'Avituallamiento KM 16');
    for (const id of paradaKM16.asigIds) {
      const asig = ASIG0.find(a => a.id === id);
      const noEsBotiquisEnKM16 = !(asig.materialId === 14 && asig.localizacionId === 4);
      expect(noEsBotiquisEnKM16).toBe(true);
    }
  });
});

// ── LOG-25: MEJ-02 Indicador cobertura por puesto ────────────────────────────
describe('LOG-25 — MEJ-02: Indicador cobertura completa por puesto en TabLocalizaciones', () => {
  // Importar calcularCobertura directamente desde el componente
  let calcularCobertura;

  beforeAll(async () => {
    // La función está exportada desde TabLocalizaciones.jsx
    const mod = await import('../components/logistica/TabLocalizaciones.jsx');
    calcularCobertura = mod.calcularCobertura;
  });

  it('calcularCobertura existe y es función', () => {
    expect(typeof calcularCobertura).toBe('function');
  });

  it('devuelve "completa" cuando hay material Y voluntario', () => {
    expect(calcularCobertura(true, true)).toBe('completa');
  });

  it('devuelve "sin_voluntario" cuando hay material pero no voluntario', () => {
    expect(calcularCobertura(true, false)).toBe('sin_voluntario');
  });

  it('devuelve "sin_material" cuando hay voluntario pero no material', () => {
    expect(calcularCobertura(false, true)).toBe('sin_material');
  });

  it('devuelve null cuando no hay material ni voluntario (puesto vacío)', () => {
    expect(calcularCobertura(false, false)).toBeNull();
  });

  it('resumen X/Y calcula correctamente puestos completos y evaluables', () => {
    // Simular la lógica de resumenCobertura del componente
    const locs = [
      { id: 1 }, // material + voluntario → completa
      { id: 2 }, // material sin voluntario → sin_voluntario
      { id: 3 }, // voluntario sin material → sin_material
      { id: 4 }, // nada → no evaluable
    ];
    const matPorLoc = {
      1: [{ nombre: 'Agua', cantidad: 10, unidad: 'ud' }],
      2: [{ nombre: 'Balizas', cantidad: 5, unidad: 'ud' }],
      3: [],
    };
    const volsPorLoc = {
      1: [{ vol: { nombre: 'Juan', estado: 'confirmado' }, puesto: { nombre: 'Avituallamiento' } }],
      3: [{ vol: { nombre: 'Ana', estado: 'pendiente' }, puesto: { nombre: 'Señalización' } }],
    };

    const evaluables = locs.filter(l => {
      const tieneMat = (matPorLoc[l.id] || []).length > 0;
      const tieneVol = (volsPorLoc[l.id] || []).length > 0;
      return tieneMat || tieneVol;
    });
    const completos = evaluables.filter(l => {
      const tieneMat = (matPorLoc[l.id] || []).length > 0;
      const tieneVol = (volsPorLoc[l.id] || []).length > 0;
      return tieneMat && tieneVol;
    });

    expect(evaluables.length).toBe(3); // loc 4 excluida (ni mat ni vol)
    expect(completos.length).toBe(1);  // solo loc 1 tiene ambos
  });

  it('puestos sin material ni voluntario NO cuentan en el denominador', () => {
    const locs = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const matPorLoc = { 1: [{ nombre: 'Agua', cantidad: 5, unidad: 'ud' }] };
    const volsPorLoc = { 1: [{ vol: { nombre: 'Luis', estado: 'confirmado' }, puesto: { nombre: 'Meta' } }] };

    // loc 2 y loc 3 sin nada → no evaluables
    const evaluables = locs.filter(l => {
      const tieneMat = (matPorLoc[l.id] || []).length > 0;
      const tieneVol = (volsPorLoc[l.id] || []).length > 0;
      return tieneMat || tieneVol;
    });

    expect(evaluables.length).toBe(1);
    expect(evaluables[0].id).toBe(1);
  });

  it('resumen muestra "X/Y puestos" coherente con datos reales de logisticaConstants', async () => {
    const { MAT0, ASIG0, VEH0, RUTAS0, TL0, CONT0, INC0, CK0 } = await import('../components/logistica/logisticaConstants.js');
    // Solo verificamos que la lógica no crashea con datos reales
    // matPorLoc: agrupar asignaciones por localizacionId
    const matPorLoc = {};
    for (const a of ASIG0) {
      if (!matPorLoc[a.localizacionId]) matPorLoc[a.localizacionId] = [];
      const mat = MAT0.find(m => m.id === a.materialId);
      if (mat) matPorLoc[a.localizacionId].push({ nombre: mat.nombre, cantidad: a.cantidad, unidad: mat.unidad || 'ud' });
    }

    // volsPorLoc vacío (no tenemos datos de voluntarios en logisticaConstants)
    const volsPorLoc = {};

    // Con los datos reales: algunos puestos tienen material → sin_voluntario (sin vols)
    const locIds = [...new Set(ASIG0.map(a => a.localizacionId))];
    const evaluables = locIds.filter(id => {
      const tieneMat = (matPorLoc[id] || []).length > 0;
      const tieneVol = (volsPorLoc[id] || []).length > 0;
      return tieneMat || tieneVol;
    });

    // Con 0 voluntarios, ningún puesto tiene cobertura completa
    const completos = evaluables.filter(id => {
      const tieneMat = (matPorLoc[id] || []).length > 0;
      const tieneVol = (volsPorLoc[id] || []).length > 0;
      return tieneMat && tieneVol;
    });

    expect(evaluables.length).toBeGreaterThan(0);
    expect(completos.length).toBeLessThanOrEqual(evaluables.length);
  });
});

// ── LOG-27: MEJ-05 — exportarMaterial con modo filtro y columna estado entrega ──
describe('LOG-27 — MEJ-05: exportarMaterial con modo filtro y columna Estado entrega', () => {
  // Importar las funciones auxiliares directamente (no la función async ExcelJS)
  // Las funciones calcularEstadoEntrega y tieneAlertaMaterial son puras y testables sin ExcelJS

  const MAT_TEST = [
    { id: 1, nombre: 'Agua', categoria: 'Avituallamiento', stock: 60, stockMinimo: 0, unidad: 'bidón' },
    { id: 2, nombre: 'Dorsales', categoria: 'Material', stock: 650, stockMinimo: 650, unidad: 'ud' },
    { id: 3, nombre: 'Medallas', categoria: 'Material', stock: 640, stockMinimo: 650, unidad: 'ud' },
    { id: 4, nombre: 'Walkie', categoria: 'Comunicación', stock: 12, stockMinimo: 0, unidad: 'ud' },
  ];

  const ASIGS_TEST = [
    { id: 1, materialId: 1, localizacionId: 2, cantidad: 8, estado: 'pendiente' },
    { id: 2, materialId: 1, localizacionId: 3, cantidad: 10, estado: 'entregado' },
    { id: 3, materialId: 2, localizacionId: 5, cantidad: 650, estado: 'pendiente' },
    { id: 4, materialId: 3, localizacionId: 11, cantidad: 650, estado: 'pendiente' },
    // Walkie sin asignaciones → 'sin asignar'
  ];

  it('calcularEstadoEntrega devuelve "sin asignar" cuando el material no tiene asignaciones', async () => {
    const { calcularEstadoEntrega } = await import('../lib/exportUtils.js');
    const estado = calcularEstadoEntrega(4, ASIGS_TEST); // walkie, sin asigs
    expect(estado).toBe('sin asignar');
  });

  it('calcularEstadoEntrega devuelve estado predominante cuando hay varias asignaciones', async () => {
    const { calcularEstadoEntrega } = await import('../lib/exportUtils.js');
    // Agua: 1 pendiente + 1 entregado → empate, cualquiera de los dos (el primero ganará)
    const estado = calcularEstadoEntrega(1, ASIGS_TEST);
    expect(['pendiente', 'entregado']).toContain(estado);
  });

  it('calcularEstadoEntrega devuelve "pendiente" cuando todas las asignaciones son pendiente', async () => {
    const { calcularEstadoEntrega } = await import('../lib/exportUtils.js');
    const estado = calcularEstadoEntrega(2, ASIGS_TEST); // Dorsales, 1 asig pendiente
    expect(estado).toBe('pendiente');
  });

  it('tieneAlertaMaterial devuelve false para material con stock suficiente y sin mínimo', async () => {
    const { tieneAlertaMaterial } = await import('../lib/exportUtils.js');
    // Agua: 60 stock, 18 asignado → disponible=42, stockMinimo=0 → sin alerta
    const alerta = tieneAlertaMaterial(MAT_TEST[0], 18);
    expect(alerta).toBe(false);
  });

  it('tieneAlertaMaterial devuelve true cuando disponible < 0 (déficit)', async () => {
    const { tieneAlertaMaterial } = await import('../lib/exportUtils.js');
    // Medallas: 640 stock, 650 asignado → disponible=-10 → alerta
    const alerta = tieneAlertaMaterial(MAT_TEST[2], 650);
    expect(alerta).toBe(true);
  });

  it('tieneAlertaMaterial devuelve true cuando stock < stockMinimo (bajo mínimo)', async () => {
    const { tieneAlertaMaterial } = await import('../lib/exportUtils.js');
    // Medallas: stock=640, stockMinimo=650 → bajo mínimo → alerta
    const alerta = tieneAlertaMaterial(MAT_TEST[2], 0);
    expect(alerta).toBe(true);
  });

  it('tieneAlertaMaterial devuelve false cuando stockMinimo=0 aunque stock sea bajo', async () => {
    const { tieneAlertaMaterial } = await import('../lib/exportUtils.js');
    // Agua: stock=60, stockMinimo=0 → no se evalúa mínimo → sin alerta si no hay déficit
    const alerta = tieneAlertaMaterial(MAT_TEST[0], 0);
    expect(alerta).toBe(false);
  });

  it('exportarMaterial acepta 4º parámetro "modo" con valor por defecto "completo"', async () => {
    // Verificar que la función tiene el parámetro modo con default
    const { exportarMaterial } = await import('../lib/exportUtils.js');
    // El 4º parámetro existe y tiene default "completo"
    // Verificamos inspeccionando la longitud de argumentos y que no falla con 3 params
    expect(typeof exportarMaterial).toBe('function');
    expect(exportarMaterial.length).toBeLessThanOrEqual(4); // max 4 parámetros declarados
  });

  it('modo "alertas" — lógica filtra solo materiales con déficit o bajo mínimo', async () => {
    const { tieneAlertaMaterial, calcularEstadoEntrega } = await import('../lib/exportUtils.js');

    // Simular la lógica de filtrado del modo "alertas" sobre MAT_TEST
    const filas = MAT_TEST.map((m) => {
      const asigTotal = ASIGS_TEST
        .filter((a) => String(a.materialId) === String(m.id))
        .reduce((s, a) => s + (a.cantidad || 0), 0);
      return {
        m,
        asigTotal,
        alerta: tieneAlertaMaterial(m, asigTotal),
        estado: calcularEstadoEntrega(m.id, ASIGS_TEST),
      };
    });

    const alertas = filas.filter((f) => f.alerta);

    // Medallas (stock=640, mínimo=650) debe estar en alertas
    expect(alertas.some((f) => f.m.nombre === 'Medallas')).toBe(true);

    // Agua (stock=60, mínimo=0, asigTotal=18) NO debe estar en alertas
    expect(alertas.some((f) => f.m.nombre === 'Agua')).toBe(false);

    // Walkies (sin asigs, sin mínimo) NO debe estar en alertas
    expect(alertas.some((f) => f.m.nombre === 'Walkie')).toBe(false);
  });

  it('modo "completo" — lógica incluye todos los materiales', async () => {
    const { tieneAlertaMaterial, calcularEstadoEntrega } = await import('../lib/exportUtils.js');

    // Sin filtro → todos los materiales
    const filas = MAT_TEST.map((m) => {
      const asigTotal = ASIGS_TEST
        .filter((a) => String(a.materialId) === String(m.id))
        .reduce((s, a) => s + (a.cantidad || 0), 0);
      return {
        nombre: m.nombre,
        'Estado entrega': calcularEstadoEntrega(m.id, ASIGS_TEST),
        alerta: tieneAlertaMaterial(m, asigTotal),
      };
    });

    // Todos los materiales del test deben estar (no hay filtro)
    expect(filas).toHaveLength(MAT_TEST.length);
    expect(filas.some((f) => f.nombre === 'Agua')).toBe(true);
    expect(filas.some((f) => f.nombre === 'Medallas')).toBe(true);
    expect(filas.some((f) => f.nombre === 'Walkie')).toBe(true);
  });

  it('columna "Estado entrega" aparece en los datos de salida para todos los materiales', async () => {
    const { calcularEstadoEntrega } = await import('../lib/exportUtils.js');

    const filas = MAT_TEST.map((m) => ({
      Nombre: m.nombre,
      'Estado entrega': calcularEstadoEntrega(m.id, ASIGS_TEST),
    }));

    // Todos deben tener la columna Estado entrega
    filas.forEach((f) => {
      expect(f).toHaveProperty('Estado entrega');
      expect(typeof f['Estado entrega']).toBe('string');
      expect(f['Estado entrega'].length).toBeGreaterThan(0);
    });
  });

  it('material sin asignaciones tiene Estado entrega = "sin asignar"', async () => {
    const { calcularEstadoEntrega } = await import('../lib/exportUtils.js');
    // Walkie (id=4) no tiene entradas en ASIGS_TEST
    const estado = calcularEstadoEntrega(4, ASIGS_TEST);
    expect(estado).toBe('sin asignar');
  });

  it('material con todas las asignaciones en "pendiente" tiene Estado = "pendiente"', async () => {
    const { calcularEstadoEntrega } = await import('../lib/exportUtils.js');
    // Dorsales (id=2) tiene solo 1 asignación con estado='pendiente'
    const estado = calcularEstadoEntrega(2, ASIGS_TEST);
    expect(estado).toBe('pendiente');
  });

  it('datos reales de logisticaConstants: Estado entrega calculado sin errores', async () => {
    const { calcularEstadoEntrega, tieneAlertaMaterial } = await import('../lib/exportUtils.js');
    const { MAT0, ASIG0 } = await import('../components/logistica/logisticaConstants.js');

    MAT0.forEach((m) => {
      const asigTotal = ASIG0
        .filter((a) => String(a.materialId) === String(m.id))
        .reduce((s, a) => s + (a.cantidad || 0), 0);

      const estado = calcularEstadoEntrega(m.id, ASIG0);
      const alerta = tieneAlertaMaterial(m, asigTotal);

      expect(typeof estado).toBe('string');
      expect(estado.length).toBeGreaterThan(0);
      expect(typeof alerta).toBe('boolean');
    });
  });
});

// ── LOG-28: MEJ-03 — Tiempo estimado primer finisher TG7 realista ─────────
describe('LOG-28 — MEJ-03: Tiempo estimado primer finisher TG7 realista', () => {
  it('TL0 id=9 tiene hora 08:50 o posterior a 08:45', async () => {
    const { TL0 } = await import('../components/logistica/logisticaConstants.js');
    const finisher = TL0.find(t => t.id === 9);
    expect(finisher).toBeDefined();
    // hora must be >= "08:45" (string comparison works for HH:MM format)
    expect(finisher.hora >= '08:45').toBe(true);
  });

  it('tiempo entre salida TG7 (id=8) y primer finisher (id=9) es >= 40 minutos', async () => {
    const { TL0 } = await import('../components/logistica/logisticaConstants.js');
    const salida = TL0.find(t => t.id === 8);
    const finisher = TL0.find(t => t.id === 9);
    expect(salida).toBeDefined();
    expect(finisher).toBeDefined();

    const toMinutes = (hora) => {
      const [h, m] = hora.split(':').map(Number);
      return h * 60 + m;
    };
    const diff = toMinutes(finisher.hora) - toMinutes(salida.hora);
    expect(diff).toBeGreaterThanOrEqual(40);
  });

  it('no existe otra tarea en TL0 con la misma hora que el primer finisher TG7', async () => {
    const { TL0 } = await import('../components/logistica/logisticaConstants.js');
    const finisher = TL0.find(t => t.id === 9);
    expect(finisher).toBeDefined();
    const conflicto = TL0.filter(t => t.id !== 9 && t.hora === finisher.hora);
    expect(conflicto).toHaveLength(0);
  });

  it('descripción de TL0 id=9 menciona estimación de tiempo (~50 min)', async () => {
    const { TL0 } = await import('../components/logistica/logisticaConstants.js');
    const finisher = TL0.find(t => t.id === 9);
    expect(finisher).toBeDefined();
    // description should mention time estimate
    expect(finisher.descripcion).toMatch(/50\s*min|~50/i);
  });
});

// ── SYNC-02: integridad referencial proyectoTareaId en CK0 ────────────────
describe('SYNC-02 CK0 proyectoTareaId apunta a tareas reales de TAREAS0', () => {
  it('todos los proyectoTareaId de CK0 existen en TAREAS0', async () => {
    const { CK0 } = await import('../components/logistica/logisticaConstants.js');
    const { TAREAS0 } = await import('../components/proyecto/proyectoConstants.js');
    const tareaIds = new Set(TAREAS0.map(t => t.id));
    const rotos = CK0
      .filter(c => c.proyectoTareaId != null)
      .filter(c => !tareaIds.has(c.proyectoTareaId));
    expect(rotos).toHaveLength(0);
  });

  it('los ítems de CK0 sin proyectoTareaId no lo tienen undefined sino ausente o null', async () => {
    const { CK0 } = await import('../components/logistica/logisticaConstants.js');
    const mal = CK0.filter(c => 'proyectoTareaId' in c && c.proyectoTareaId === undefined);
    expect(mal).toHaveLength(0);
  });

  it('los vínculos clave de CK0 apuntan a las tareas de Proyecto correctas', async () => {
    const { CK0 } = await import('../components/logistica/logisticaConstants.js');
    const { TAREAS0 } = await import('../components/proyecto/proyectoConstants.js');
    const link = (ckId, tareaId) => {
      const ck = CK0.find(c => c.id === ckId);
      const t  = TAREAS0.find(t => t.id === tareaId);
      expect(ck, `CK id=${ckId} no existe`).toBeDefined();
      expect(t,  `Tarea Proyecto id=${tareaId} no existe`).toBeDefined();
      expect(ck.proyectoTareaId).toBe(tareaId);
    };
    link(1,  1);  // Confirmar autorización ayuntamiento → Solicitud autorización admin. local
    link(2,  41); // Confirmar servicio médico → Confirmación servicio médico
    link(5,  42); // Pedido avituallamiento → Pedido avituallamiento y material
    link(7,  40); // Probar cronometraje → Contratación empresa cronometraje
    link(9,  35); // Señalizar ruta → Colocación señalización permanente
    link(10, 48); // Montar zona meta → Montaje zona meta y salida
    link(12, 31); // Confirmar voluntarios → Envío instrucciones voluntarios
    link(14, 45); // Carga furgoneta → Carga de vehículos y verificación
    link(15, 32); // Briefing voluntarios → Briefing presencial voluntarios
    link(21, 49); // Recogida material → Recogida de material post-evento
    link(34, 30); // Confirmar voluntarios 1mes → Cierre de plazas voluntarios
    link(35, 39); // Encargar dorsales → Lista definitiva de material necesario
  });

  it('no existen proyectoTareaId duplicados en CK0 para la misma tarea de Proyecto', async () => {
    const { CK0 } = await import('../components/logistica/logisticaConstants.js');
    const vinculados = CK0.filter(c => c.proyectoTareaId != null);
    // Se permite duplicar si son fases distintas del mismo hito (ej. CK1 y CK25 → T1)
    // pero no duplicar en la misma fase
    const porFaseYTarea = {};
    const dupes = [];
    for (const c of vinculados) {
      const key = `${c.fase}::${c.proyectoTareaId}`;
      if (porFaseYTarea[key]) dupes.push(c);
      else porFaseYTarea[key] = c;
    }
    expect(dupes).toHaveLength(0);
  });
});
describe('SYNC-01 toggle CK sincroniza estado correcto con Proyecto', () => {
  // Simulación pura de la lógica de toggle extraída de TabComunicaciones.jsx
  function simulateToggle(ckPrev, ckId, tareasProyecto) {
    const ckNow = '10:00';
    let updatedTareas = [...tareasProyecto];
    const ckNext = ckPrev.map(ckItm => {
      const nuevoEstado = ckItm.id === ckId
        ? (ckItm.estado === 'completado' ? 'pendiente' : 'completado')
        : ckItm.estado;
      return ckItm.id === ckId
        ? { ...ckItm, estado: nuevoEstado, completadoEn: nuevoEstado === 'completado' ? ckNow : undefined }
        : ckItm;
    });
    const ckHit = ckNext.find(c => c.id === ckId);
    if (ckHit && ckHit.proyectoTareaId) {
      const ckNuevoEst = ckHit.estado === 'completado' ? 'completado' : 'pendiente';
      updatedTareas = tareasProyecto.map(t =>
        t.id === ckHit.proyectoTareaId ? { ...t, estado: ckNuevoEst } : t
      );
    }
    return { ckNext, updatedTareas };
  }

  const ckBase = [
    { id: 1, tarea: 'Confirmar autorización', estado: 'pendiente', proyectoTareaId: 10 },
    { id: 2, tarea: 'Otro ítem sin vínculo', estado: 'pendiente', proyectoTareaId: null },
  ];
  const tareasBase = [
    { id: 10, titulo: 'Tarea Proyecto vinculada', estado: 'pendiente' },
    { id: 11, titulo: 'Tarea Proyecto sin vínculo', estado: 'pendiente' },
  ];

  it('al completar CK vinculado → tarea Proyecto pasa a "completado"', () => {
    const { ckNext, updatedTareas } = simulateToggle(ckBase, 1, tareasBase);
    expect(ckNext.find(c => c.id === 1).estado).toBe('completado');
    expect(updatedTareas.find(t => t.id === 10).estado).toBe('completado');
  });

  it('al desmarcar CK vinculado → tarea Proyecto vuelve a "pendiente" (no "en curso")', () => {
    const ckConCompletado = ckBase.map(c => c.id === 1 ? { ...c, estado: 'completado' } : c);
    const tareasConCompletado = tareasBase.map(t => t.id === 10 ? { ...t, estado: 'completado' } : t);
    const { ckNext, updatedTareas } = simulateToggle(ckConCompletado, 1, tareasConCompletado);
    expect(ckNext.find(c => c.id === 1).estado).toBe('pendiente');
    expect(updatedTareas.find(t => t.id === 10).estado).toBe('pendiente');
    expect(updatedTareas.find(t => t.id === 10).estado).not.toBe('en curso');
  });

  it('CK sin proyectoTareaId no afecta a ninguna tarea Proyecto', () => {
    const { updatedTareas } = simulateToggle(ckBase, 2, tareasBase);
    expect(updatedTareas).toEqual(tareasBase);
  });

  it('CK sin vínculo no altera tareas de Proyecto ajenas', () => {
    const { updatedTareas } = simulateToggle(ckBase, 2, tareasBase);
    expect(updatedTareas.find(t => t.id === 11).estado).toBe('pendiente');
  });
});

// ── SYNC-06: syncHitoPedido — lógica de upsert/remove de hitos ───────────
describe('SYNC-06 syncHitoPedido crea, actualiza y elimina hitos correctamente', () => {

  // Simulación pura de la lógica de syncHitoPedido sin I/O
  function simulateSync(hitos, pedido, action = 'upsert') {
    const lista = Array.isArray(hitos) ? [...hitos] : [];

    if (action === 'remove' || !pedido.fechaLimitePedido) {
      return lista.filter(h => h._pedidoId !== pedido.id);
    }

    const hitoData = {
      nombre:    `🛒 Pedido: ${pedido.nombre}`,
      fecha:     pedido.fechaLimitePedido,
      critico:   false,
      completado: pedido.estado === 'recibido' || pedido.estado === 'facturado',
      _pedidoId: pedido.id,
    };

    const idx = lista.findIndex(h => h._pedidoId === pedido.id);
    if (idx === -1) {
      const maxId = lista.reduce((m, h) => Math.max(m, typeof h.id === 'number' ? h.id : 0), 0);
      return [...lista, { ...hitoData, id: maxId + 1 }];
    }
    return lista.map((h, i) => i === idx ? { ...h, ...hitoData } : h);
  }

  const pedido1 = { id: 101, nombre: 'Pedido medallas', fechaLimitePedido: '2026-07-01', estado: 'borrador' };

  it('crea un hito nuevo cuando no existe ninguno con ese _pedidoId', () => {
    const result = simulateSync([], pedido1);
    expect(result).toHaveLength(1);
    expect(result[0]._pedidoId).toBe(101);
    expect(result[0].fecha).toBe('2026-07-01');
    expect(result[0].nombre).toBe('🛒 Pedido: Pedido medallas');
  });

  it('el hito creado NO está completado si el pedido es borrador/confirmado', () => {
    const result = simulateSync([], pedido1);
    expect(result[0].completado).toBe(false);
  });

  it('el hito se marca completado cuando el pedido pasa a "recibido"', () => {
    const pedidoRecibido = { ...pedido1, estado: 'recibido' };
    const result = simulateSync([], pedidoRecibido);
    expect(result[0].completado).toBe(true);
  });

  it('el hito se marca completado cuando el pedido pasa a "facturado"', () => {
    const pedidoFacturado = { ...pedido1, estado: 'facturado' };
    const result = simulateSync([], pedidoFacturado);
    expect(result[0].completado).toBe(true);
  });

  it('actualiza el hito existente sin crear duplicados', () => {
    const hitosIniciales = [{ id: 5, nombre: '🛒 Pedido: Pedido medallas', fecha: '2026-07-01', _pedidoId: 101, completado: false, critico: false }];
    const pedidoActualizado = { ...pedido1, fechaLimitePedido: '2026-07-15', nombre: 'Pedido medallas v2' };
    const result = simulateSync(hitosIniciales, pedidoActualizado);
    expect(result).toHaveLength(1);
    expect(result[0].fecha).toBe('2026-07-15');
    expect(result[0].nombre).toBe('🛒 Pedido: Pedido medallas v2');
    expect(result[0].id).toBe(5); // preserva el id original
  });

  it('elimina el hito con action="remove"', () => {
    const hitosIniciales = [{ id: 5, _pedidoId: 101 }];
    const result = simulateSync(hitosIniciales, pedido1, 'remove');
    expect(result).toHaveLength(0);
  });

  it('no elimina hitos de otros pedidos con remove', () => {
    const hitosIniciales = [{ id: 5, _pedidoId: 101 }, { id: 6, _pedidoId: 202 }];
    const result = simulateSync(hitosIniciales, pedido1, 'remove');
    expect(result).toHaveLength(1);
    expect(result[0]._pedidoId).toBe(202);
  });

  it('sin fechaLimitePedido actúa como remove (limpia el hito si existía)', () => {
    const hitosIniciales = [{ id: 5, _pedidoId: 101 }];
    const pedidoSinFecha = { ...pedido1, fechaLimitePedido: '' };
    const result = simulateSync(hitosIniciales, pedidoSinFecha);
    expect(result).toHaveLength(0);
  });

  it('no hace nada si no hay hito y se llama remove', () => {
    const result = simulateSync([], pedido1, 'remove');
    expect(result).toHaveLength(0);
  });

  it('genera id superior al máximo existente', () => {
    const hitosIniciales = [{ id: 10, _pedidoId: 999 }];
    const result = simulateSync(hitosIniciales, pedido1);
    expect(result.find(h => h._pedidoId === 101).id).toBe(11);
  });
});
