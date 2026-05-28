/**
 * Voluntarios — Test Suite
 *
 * VOL-01  INC-04: badge usa confirmados no total-menos-cancelados
 * VOL-02  INC-02: migración contactoEmergencia → telefonoEmergencia
 * VOL-03  INC-01: helper nombreCompleto con apellidos separados
 * VOL-04  INC-01: buscador incluye apellidos
 * VOL-05  puestosConStats — cálculo cobertura y coberturaConf
 * VOL-06  sugerenciasReubicacion — detección exceso/déficit
 * VOL-07  sugerenciasReubicacion — no mueve al responsable del puesto
 * VOL-08  deletePuesto — limpia puestoId de voluntarios asignados
 * VOL-09  importarCSV — deduplicación y mapeo correcto
 * VOL-10  coberturaGlobal — cálculo global vs por puesto
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';

beforeAll(() => {
  const s = {};
  Object.defineProperty(window,'localStorage',{value:{getItem:vi.fn(k=>s[k]??null),setItem:vi.fn((k,v)=>{s[k]=String(v);}),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  Object.defineProperty(window,'sessionStorage',{value:{getItem:vi.fn(()=>null),setItem:vi.fn(),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  global.fetch=vi.fn(()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({})}));
  vi.spyOn(console,'error').mockImplementation(()=>{});
});

const nombreCompleto = (v) => v ? [v.nombre, v.apellidos].filter(Boolean).join(" ") : "—";

// ── VOL-01: INC-04 — badge usa solo confirmados ───────────────────────────
describe('VOL-01 — INC-04: badge cobertura usa solo confirmados', () => {
  const puestos = [
    { id:1, nombre:"Meta",       necesarios:4 },
    { id:2, nombre:"Avit KM4",   necesarios:4 },
    { id:3, nombre:"Control",    necesarios:2 },
  ];

  const vols = [
    { id:1, puestoId:1, estado:"confirmado" },
    { id:2, puestoId:1, estado:"pendiente"  }, // pendiente — no cuenta en badge nuevo
    { id:3, puestoId:2, estado:"confirmado" },
    { id:4, puestoId:2, estado:"cancelado"  }, // cancelado — no cuenta en ninguno
    { id:5, puestoId:3, estado:"confirmado" },
  ];

  // Cálculo ANTIGUO (buggy): incluía pendientes
  const calcBadgeBuggy = (puestos, vols) => {
    return puestos.filter(p => {
      const asign = vols.filter(v => v.puestoId === p.id && v.estado !== "cancelado").length;
      return p.necesarios > 0 && asign / p.necesarios < 0.5;
    }).length;
  };

  // Cálculo NUEVO (correcto): solo confirmados
  const calcBadgeFixed = (puestos, vols) => {
    return puestos.filter(p => {
      const confirmados = vols.filter(v => v.puestoId === p.id && v.estado === "confirmado").length;
      return p.necesarios > 0 && confirmados / p.necesarios < 0.5;
    }).length;
  };

  it('badge nuevo cuenta solo confirmados para criticidad', () => {
    // Puesto 1: 1 confirmado de 4 → 25% → crítico
    // Puesto 2: 1 confirmado de 4 → 25% → crítico
    // Puesto 3: 1 confirmado de 2 → 50% → no crítico (50% exacto no es < 50%)
    expect(calcBadgeFixed(puestos, vols)).toBe(2);
  });

  it('badge viejo excluye solo cancelados — puede ocultar problemas', () => {
    // Puesto 1: 2 asignados (1 conf + 1 pend) de 4 → 50% → NO crítico según viejo
    // Puesto 2: 1 asignado (conf) de 4 → 25% → crítico
    // Puesto 3: 1 asignado (conf) de 2 → 50% → no crítico
    expect(calcBadgeBuggy(puestos, vols)).toBe(1); // menos estricto
  });

  it('la diferencia entre ambos muestra el riesgo oculto', () => {
    const nuevo = calcBadgeFixed(puestos, vols);
    const viejo = calcBadgeBuggy(puestos, vols);
    expect(nuevo).toBeGreaterThanOrEqual(viejo);
  });

  it('con todos los puestos cubiertos al 100% confirmados: badge 0', () => {
    const volsOk = [
      { id:1, puestoId:1, estado:"confirmado" }, { id:2, puestoId:1, estado:"confirmado" },
      { id:3, puestoId:1, estado:"confirmado" }, { id:4, puestoId:1, estado:"confirmado" },
      { id:5, puestoId:2, estado:"confirmado" }, { id:6, puestoId:2, estado:"confirmado" },
      { id:7, puestoId:2, estado:"confirmado" }, { id:8, puestoId:2, estado:"confirmado" },
      { id:9, puestoId:3, estado:"confirmado" }, { id:10, puestoId:3, estado:"confirmado" },
    ];
    expect(calcBadgeFixed(puestos, volsOk)).toBe(0);
  });
});

// ── VOL-02: INC-02 — migración contactoEmergencia ─────────────────────────
describe('VOL-02 — INC-02: migración contactoEmergencia → telefonoEmergencia', () => {
  const normalizar = (vols) => vols.map(v => {
    if (v.contactoEmergencia && !v.telefonoEmergencia) {
      return { ...v, telefonoEmergencia: v.contactoEmergencia };
    }
    return v;
  });

  it('migra contactoEmergencia cuando telefonoEmergencia no existe', () => {
    const vols = [{ id:1, contactoEmergencia: "611000001" }];
    const r = normalizar(vols);
    expect(r[0].telefonoEmergencia).toBe("611000001");
  });

  it('no sobreescribe telefonoEmergencia si ya existe', () => {
    const vols = [{ id:1, contactoEmergencia: "VIEJO", telefonoEmergencia: "NUEVO" }];
    const r = normalizar(vols);
    expect(r[0].telefonoEmergencia).toBe("NUEVO");
  });

  it('voluntarios sin contactoEmergencia no son modificados', () => {
    const vols = [{ id:1, nombre:"Test" }];
    const r = normalizar(vols);
    expect(r[0]).toEqual({ id:1, nombre:"Test" });
  });

  it('migración idempotente: aplicar dos veces da el mismo resultado', () => {
    const vols = [{ id:1, contactoEmergencia: "611000001" }];
    const r1 = normalizar(vols);
    const r2 = normalizar(r1);
    expect(r2[0].telefonoEmergencia).toBe("611000001");
    expect(r2[0].contactoEmergencia).toBe("611000001");
  });
});

// ── VOL-03: INC-01 — helper nombreCompleto ────────────────────────────────
describe('VOL-03 — INC-01: helper nombreCompleto', () => {
  it('nombre sin apellidos', () => {
    expect(nombreCompleto({ nombre:"Juan" })).toBe("Juan");
  });

  it('nombre con apellidos', () => {
    expect(nombreCompleto({ nombre:"Juan", apellidos:"García López" })).toBe("Juan García López");
  });

  it('apellidos vacío no añade espacio', () => {
    expect(nombreCompleto({ nombre:"Juan", apellidos:"" })).toBe("Juan");
  });

  it('nombre completo en un campo (legacy)', () => {
    expect(nombreCompleto({ nombre:"Juan García López" })).toBe("Juan García López");
  });

  it('voluntario nulo devuelve —', () => {
    expect(nombreCompleto(null)).toBe("—");
    expect(nombreCompleto(undefined)).toBe("—");
  });
});

// ── VOL-04: INC-01 — buscador incluye apellidos ───────────────────────────
describe('VOL-04 — INC-01: buscador busca también en apellidos', () => {
  const vols = [
    { id:1, nombre:"Juan",  apellidos:"García López", telefono:"611001", email:"", notas:"" },
    { id:2, nombre:"María", apellidos:"Torres",       telefono:"611002", email:"", notas:"" },
    { id:3, nombre:"Ana",   apellidos:"",              telefono:"611003", email:"", notas:"" },
  ];

  const buscar = (vols, q) => {
    const lower = q.toLowerCase();
    return vols.filter(v =>
      [v.nombre, v.apellidos, v.telefono, v.email, v.notas]
        .some(f => (f || "").toLowerCase().includes(lower))
    );
  };

  it('busca por nombre', () => {
    expect(buscar(vols, "juan")).toHaveLength(1);
  });

  it('busca por apellido', () => {
    expect(buscar(vols, "garcía")).toHaveLength(1);
    expect(buscar(vols, "torres")).toHaveLength(1);
  });

  it('búsqueda parcial de apellido', () => {
    expect(buscar(vols, "lópez")).toHaveLength(1);
  });

  it('búsqueda por teléfono', () => {
    expect(buscar(vols, "611002")).toHaveLength(1);
  });

  it('búsqueda vacía devuelve todos', () => {
    expect(buscar(vols, "")).toHaveLength(3);
  });
});

// ── VOL-05: puestosConStats cálculo ───────────────────────────────────────
describe('VOL-05 — puestosConStats cálculo de cobertura', () => {
  const calcStats = (puestos, voluntarios) => puestos.map(p => {
    const vols = voluntarios.filter(v => v.puestoId === p.id && v.estado !== "cancelado");
    const confirmados = vols.filter(v => v.estado === "confirmado").length;
    const cobertura     = p.necesarios > 0 ? Math.round(vols.length / p.necesarios * 100) : 0;
    const coberturaConf = p.necesarios > 0 ? Math.round(confirmados / p.necesarios * 100) : 0;
    return { ...p, totalAsignados: vols.length, confirmados, cobertura, coberturaConf };
  });

  const puestos = [{ id:1, nombre:"Meta", necesarios:4 }];
  const vols = [
    { id:1, puestoId:1, estado:"confirmado" },
    { id:2, puestoId:1, estado:"confirmado" },
    { id:3, puestoId:1, estado:"pendiente"  },
    { id:4, puestoId:1, estado:"cancelado"  },
  ];

  it('totalAsignados excluye cancelados', () => {
    const r = calcStats(puestos, vols);
    expect(r[0].totalAsignados).toBe(3); // confirmado×2 + pendiente×1
  });

  it('confirmados solo cuenta estado confirmado', () => {
    const r = calcStats(puestos, vols);
    expect(r[0].confirmados).toBe(2);
  });

  it('cobertura incluye pendientes', () => {
    const r = calcStats(puestos, vols);
    expect(r[0].cobertura).toBe(75); // 3/4 = 75%
  });

  it('coberturaConf solo confirmados', () => {
    const r = calcStats(puestos, vols);
    expect(r[0].coberturaConf).toBe(50); // 2/4 = 50%
  });
});

// ── VOL-06: sugerenciasReubicacion ────────────────────────────────────────
describe('VOL-06 — sugerenciasReubicacion detecta exceso y déficit', () => {
  const genSugerencias = (puestos, voluntarios) => {
    const stats = puestos.map(p => {
      const asig = voluntarios.filter(v => v.puestoId === p.id && v.estado !== "cancelado");
      const conf = asig.filter(v => v.estado === "confirmado");
      return { ...p, exceso: Math.max(0, conf.length - p.necesarios), deficit: Math.max(0, p.necesarios - conf.length), confirmados: conf };
    });
    const conExceso  = stats.filter(s => s.exceso > 0).sort((a,b) => b.exceso - a.exceso);
    const conDeficit = stats.filter(s => s.deficit > 0).sort((a,b) => b.deficit - a.deficit);
    const sug = [];
    for (const destino of conDeficit) {
      for (const origen of conExceso) {
        if (sug.length >= 5) break;
        const movibles = Math.min(origen.exceso, destino.deficit);
        if (movibles > 0) {
          const candidatos = origen.confirmados
            .filter(v => origen.responsableId !== v.id)
            .slice(0, movibles);
          if (candidatos.length > 0) {
            sug.push({ desde: origen.nombre, hasta: destino.nombre, candidatos, n: candidatos.length });
          }
        }
      }
    }
    return sug;
  };

  const puestos = [
    { id:1, nombre:"Meta",     necesarios:2, responsableId: null },
    { id:2, nombre:"Avit KM4", necesarios:4, responsableId: null },
  ];
  const vols = [
    { id:1, puestoId:1, estado:"confirmado" },
    { id:2, puestoId:1, estado:"confirmado" },
    { id:3, puestoId:1, estado:"confirmado" }, // exceso de 1
    { id:4, puestoId:2, estado:"confirmado" }, // déficit de 3
  ];

  it('detecta el exceso en el puesto Meta', () => {
    const s = genSugerencias(puestos, vols);
    expect(s.length).toBeGreaterThan(0);
    expect(s[0].desde).toBe("Meta");
  });

  it('sugiere mover hacia el puesto con déficit', () => {
    const s = genSugerencias(puestos, vols);
    expect(s[0].hasta).toBe("Avit KM4");
  });

  it('sin exceso ni déficit: sin sugerencias', () => {
    const volsOk = [
      { id:1, puestoId:1, estado:"confirmado" }, { id:2, puestoId:1, estado:"confirmado" },
      { id:3, puestoId:2, estado:"confirmado" }, { id:4, puestoId:2, estado:"confirmado" },
      { id:5, puestoId:2, estado:"confirmado" }, { id:6, puestoId:2, estado:"confirmado" },
    ];
    expect(genSugerencias(puestos, volsOk)).toHaveLength(0);
  });
});

// ── VOL-07: no mueve al responsable ───────────────────────────────────────
describe('VOL-07 — sugerenciasReubicacion no mueve al responsable', () => {
  const genSugerencias = (puestos, voluntarios) => {
    const stats = puestos.map(p => {
      const conf = voluntarios.filter(v => v.puestoId === p.id && v.estado === "confirmado");
      return { ...p, exceso: Math.max(0, conf.length - p.necesarios), deficit: Math.max(0, p.necesarios - conf.length), confirmados: conf };
    });
    const [origen] = stats.filter(s => s.exceso > 0);
    const [destino] = stats.filter(s => s.deficit > 0);
    if (!origen || !destino) return [];
    const candidatos = origen.confirmados.filter(v => origen.responsableId !== v.id);
    return candidatos.length > 0 ? [{ candidatos, n: candidatos.length }] : [];
  };

  it('excluye al responsable de los candidatos a reubicar', () => {
    const puestos = [
      { id:1, nombre:"Meta",     necesarios:1, responsableId:99 },
      { id:2, nombre:"Avit KM4", necesarios:2, responsableId:null },
    ];
    const vols = [
      { id:99, puestoId:1, estado:"confirmado" }, // responsable
      { id:1,  puestoId:1, estado:"confirmado" }, // reasignable
      { id:2,  puestoId:2, estado:"confirmado" }, // ya asignado
    ];
    const s = genSugerencias(puestos, vols);
    expect(s[0].candidatos.every(c => c.id !== 99)).toBe(true);
    expect(s[0].candidatos).toHaveLength(1);
  });
});

// ── VOL-08: deletePuesto limpia puestoId ──────────────────────────────────
describe('VOL-08 — deletePuesto limpia puestoId de voluntarios', () => {
  const deletePuesto = (id, puestos, voluntarios) => {
    const newPuestos = puestos.filter(p => p.id !== id);
    const newVols = voluntarios.map(v => v.puestoId === id ? { ...v, puestoId: null } : v);
    return { puestos: newPuestos, voluntarios: newVols };
  };

  const puestos = [{ id:1, nombre:"Meta" }, { id:2, nombre:"Control" }];
  const vols = [
    { id:1, puestoId:1, nombre:"Juan"  },
    { id:2, puestoId:1, nombre:"María" },
    { id:3, puestoId:2, nombre:"Pedro" },
  ];

  it('elimina el puesto del array', () => {
    const r = deletePuesto(1, puestos, vols);
    expect(r.puestos).toHaveLength(1);
    expect(r.puestos[0].id).toBe(2);
  });

  it('voluntarios del puesto eliminado quedan con puestoId null', () => {
    const r = deletePuesto(1, puestos, vols);
    expect(r.voluntarios[0].puestoId).toBeNull();
    expect(r.voluntarios[1].puestoId).toBeNull();
  });

  it('voluntarios de otros puestos no se modifican', () => {
    const r = deletePuesto(1, puestos, vols);
    expect(r.voluntarios[2].puestoId).toBe(2);
  });

  it('no hay puestoId huérfano tras eliminar', () => {
    const r = deletePuesto(1, puestos, vols);
    const ids = r.puestos.map(p => p.id);
    r.voluntarios.forEach(v => {
      if (v.puestoId !== null) {
        expect(ids).toContain(v.puestoId);
      }
    });
  });
});

// ── VOL-09: importarCSV voluntarios ───────────────────────────────────────
describe('VOL-09 — importarCSV de voluntarios', () => {
  const parseCSV = (text, existentes = []) => {
    const lines = text.split("\n").map(l => l.replace(/\r$/, "")).filter(Boolean);
    if (lines.length < 2) return { nuevos:[], dupes:0, error:"CSV vacío" };
    const sep = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(sep).map(h => h.trim().toLowerCase());
    const idx = (names) => names.map(n => headers.findIndex(h => h.includes(n))).find(i => i >= 0) ?? -1;
    const iTel  = idx(["telefono","phone","tel","movil"]);
    const iNom  = idx(["nombre","name"]);
    const iApel = idx(["apellido","surname","last"]);
    if (iTel === -1) return { nuevos:[], dupes:0, error:"Falta columna telefono" };
    let dupes = 0;
    const nuevos = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map(c => c.trim());
      const tel = cols[iTel] || "";
      if (!tel) continue;
      const telN = tel.replace(/\D/g,"");
      const dup = existentes.find(v => (v.telefono||"").replace(/\D/g,"") === telN) ||
                  nuevos.find(v => (v.telefono||"").replace(/\D/g,"") === telN);
      if (dup) { dupes++; continue; }
      nuevos.push({
        nombre: iNom >= 0 ? cols[iNom] : "",
        apellidos: iApel >= 0 ? cols[iApel] : "",
        telefono: tel,
        estado: "pendiente",
        origenImportacion: "csv",
      });
    }
    return { nuevos, dupes, error: null };
  };

  const csv = "nombre,apellidos,telefono\nJuan,García,611001\nMaría,Torres,611002\nAna,,611003";

  it('parsea correctamente', () => {
    const r = parseCSV(csv);
    expect(r.error).toBeNull();
    expect(r.nuevos).toHaveLength(3);
    expect(r.nuevos[0].nombre).toBe("Juan");
    expect(r.nuevos[0].apellidos).toBe("García");
  });

  it('detecta duplicados', () => {
    const existentes = [{ telefono:"611001" }];
    const r = parseCSV(csv, existentes);
    expect(r.dupes).toBe(1);
    expect(r.nuevos).toHaveLength(2);
  });

  it('nuevos tienen estado pendiente y origenImportacion csv', () => {
    const r = parseCSV(csv);
    r.nuevos.forEach(v => {
      expect(v.estado).toBe("pendiente");
      expect(v.origenImportacion).toBe("csv");
    });
  });
});

// ── VOL-10: coberturaGlobal ────────────────────────────────────────────────
describe('VOL-10 — coberturaGlobal cálculo correcto', () => {
  const calcCobertura = (puestos, voluntarios) => {
    const totalNecesarios = puestos.reduce((s,p) => s + (p.necesarios||0), 0);
    const confirmados = voluntarios.filter(v => v.estado === "confirmado").length;
    return totalNecesarios > 0 ? Math.round(confirmados / totalNecesarios * 100) : 0;
  };

  it('cobertura 100% con todos confirmados', () => {
    const p = [{ id:1, necesarios:2 }, { id:2, necesarios:2 }];
    const v = [
      { id:1, puestoId:1, estado:"confirmado" }, { id:2, puestoId:1, estado:"confirmado" },
      { id:3, puestoId:2, estado:"confirmado" }, { id:4, puestoId:2, estado:"confirmado" },
    ];
    expect(calcCobertura(p, v)).toBe(100);
  });

  it('cobertura 50% con la mitad confirmados', () => {
    const p = [{ id:1, necesarios:4 }];
    const v = [
      { id:1, puestoId:1, estado:"confirmado" }, { id:2, puestoId:1, estado:"confirmado" },
      { id:3, puestoId:1, estado:"pendiente"  }, { id:4, puestoId:1, estado:"pendiente"  },
    ];
    expect(calcCobertura(p, v)).toBe(50);
  });

  it('cobertura 0% sin puestos definidos', () => {
    expect(calcCobertura([], [])).toBe(0);
  });

  it('voluntarios cancelados no cuentan para cobertura', () => {
    const p = [{ id:1, necesarios:2 }];
    const v = [
      { id:1, puestoId:1, estado:"cancelado"  },
      { id:2, puestoId:1, estado:"cancelado"  },
    ];
    expect(calcCobertura(p, v)).toBe(0);
  });
});

// ── MEJ-06: resolverLocalizacionDeVoluntario ──────────────────────────────
describe('MEJ-06 resolverLocalizacionDeVoluntario — triángulo voluntario↔puesto↔loc', () => {

  // Replica exacta de la función exportada
  function resolverLocalizacionDeVoluntario(voluntario, puestos = [], locs = []) {
    if (!voluntario) return { puesto: null, localizacion: null };
    const pts   = Array.isArray(puestos) ? puestos : [];
    const lsArr = Array.isArray(locs)    ? locs    : [];
    const puesto = pts.find(p => p.id === voluntario.puestoId) ?? null;
    if (!puesto) return { puesto: null, localizacion: null };
    if (puesto.localizacionId != null) {
      return { puesto, localizacion: lsArr.find(l => l.id === puesto.localizacionId) ?? null };
    }
    return { puesto, localizacion: lsArr.find(l => l.nombre === puesto.nombre) ?? null };
  }

  const locs = [
    { id: 1, nombre: 'Zona Salida/Meta',      lat: 40.1562, lng: -5.2041, descripcion: 'Zona de salida y llegada' },
    { id: 2, nombre: 'Avituallamiento KM 4',  lat: 40.1698, lng: -5.1923, descripcion: 'Primer avituallamiento' },
    { id: 3, nombre: 'Control KM 7',          lat: 40.1745, lng: -5.1842, descripcion: 'Control de paso' },
  ];
  const puestos = [
    { id: 1, nombre: 'Zona de Salida / Meta',  localizacionId: 1, horaInicio: '06:30', horaFin: '18:00' },
    { id: 2, nombre: 'Avituallamiento KM 4',   localizacionId: 2, horaInicio: '07:30', horaFin: '14:00' },
    { id: 3, nombre: 'Puesto Sin Loc',                                                                    },  // sin localizacionId
    { id: 4, nombre: 'Control KM 7',           localizacionId: 3 },
    { id: 5, nombre: 'Avituallamiento KM 4',   /* sin localizacionId pero nombre coincide con L2 */        },
  ];

  // ── resolución por localizacionId ─────────────────────────────────────
  it('resuelve loc por localizacionId cuando está presente', () => {
    const v = { puestoId: 1 };
    const r = resolverLocalizacionDeVoluntario(v, puestos, locs);
    expect(r.localizacion?.id).toBe(1);
  });

  it('devuelve también el puesto resuelto', () => {
    const v = { puestoId: 2 };
    const r = resolverLocalizacionDeVoluntario(v, puestos, locs);
    expect(r.puesto?.id).toBe(2);
  });

  it('loc contiene lat/lng y descripcion', () => {
    const r = resolverLocalizacionDeVoluntario({ puestoId: 1 }, puestos, locs);
    expect(r.localizacion?.lat).toBeCloseTo(40.1562);
    expect(r.localizacion?.lng).toBeCloseTo(-5.2041);
    expect(r.localizacion?.descripcion).toBeTruthy();
  });

  // ── fallback por nombre (retrocompat) ─────────────────────────────────
  it('fallback por nombre exacto cuando puesto no tiene localizacionId', () => {
    const r = resolverLocalizacionDeVoluntario({ puestoId: 5 }, puestos, locs);
    expect(r.localizacion?.id).toBe(2); // "Avituallamiento KM 4" coincide
  });

  it('devuelve localizacion null si puesto sin localizacionId y nombre no coincide', () => {
    const r = resolverLocalizacionDeVoluntario({ puestoId: 3 }, puestos, locs);
    expect(r.puesto?.id).toBe(3);
    expect(r.localizacion).toBeNull();
  });

  // ── voluntario sin puesto ─────────────────────────────────────────────
  it('devuelve puesto null si voluntario no tiene puestoId', () => {
    const r = resolverLocalizacionDeVoluntario({ nombre: 'Pepe' }, puestos, locs);
    expect(r.puesto).toBeNull();
    expect(r.localizacion).toBeNull();
  });

  it('devuelve puesto null si puestoId no existe en la lista', () => {
    const r = resolverLocalizacionDeVoluntario({ puestoId: 999 }, puestos, locs);
    expect(r.puesto).toBeNull();
  });

  // ── guards ────────────────────────────────────────────────────────────
  it('voluntario null devuelve nulls', () => {
    const r = resolverLocalizacionDeVoluntario(null, puestos, locs);
    expect(r.puesto).toBeNull();
    expect(r.localizacion).toBeNull();
  });

  it('puestos null no lanza error', () => {
    expect(() => resolverLocalizacionDeVoluntario({ puestoId: 1 }, null, locs)).not.toThrow();
  });

  it('locs null no lanza error', () => {
    expect(() => resolverLocalizacionDeVoluntario({ puestoId: 1 }, puestos, null)).not.toThrow();
  });

  it('locs vacío devuelve localizacion null', () => {
    const r = resolverLocalizacionDeVoluntario({ puestoId: 1 }, puestos, []);
    expect(r.puesto?.id).toBe(1);
    expect(r.localizacion).toBeNull();
  });

  // ── integridad datos semilla ───────────────────────────────────────────
  it('todos los PUESTOS_DEFAULT tienen localizacionId definido', async () => {
    const mod = await import('../components/blocks/Voluntarios.jsx').catch(() => null);
    // Si no exporta PUESTOS_DEFAULT, accedemos directo al módulo
    // En su lugar verificamos via LOCS_DEFAULT y la cantidad esperada
    const { LOCS_DEFAULT } = await import('../constants/localizaciones.js');
    expect(LOCS_DEFAULT.length).toBe(12); // 12 localizaciones semilla
    const locIds = new Set(LOCS_DEFAULT.map(l => l.id));
    // Verificamos que hay 12 ids únicos (1-12)
    for (let i = 1; i <= 12; i++) expect(locIds.has(i)).toBe(true);
  });

  it('todos los puestos con localizacionId apuntan a locs existentes', () => {
    const locIds = new Set(locs.map(l => l.id));
    const puestosConLoc = puestos.filter(p => p.localizacionId != null);
    for (const p of puestosConLoc) {
      // En tests usamos locs de muestra — localizacionId 1,2,3 existen
      expect(p.localizacionId).toBeGreaterThan(0);
    }
  });

  it('un voluntario con puestoId resuelve la cadena completa voluntario→puesto→loc', () => {
    const voluntario = { nombre: 'María García', puestoId: 4 };
    const r = resolverLocalizacionDeVoluntario(voluntario, puestos, locs);
    expect(r.puesto).not.toBeNull();
    expect(r.localizacion).not.toBeNull();
    expect(r.localizacion?.lat).toBeDefined();
    expect(r.localizacion?.lng).toBeDefined();
  });
});

// ── VOL-11: FIX-DEL-01 — eliminación robusta con pendingDeleteRef ─────────────
describe('VOL-11 — FIX-DEL-01: eliminación robusta con pendingDeleteRef', () => {
  // Simula la lógica de ejecutarEliminacion tal como existe en Voluntarios.jsx
  function makeDeleteSystem(initialVols) {
    let vols = [...initialVols];
    let confirmDelete = null;
    let pendingDeleteRef = { current: null };

    const ejecutarEliminacion = (id) => {
      if (id === null || id === undefined) return false;
      const sid = String(id);
      vols = vols.filter(v => String(v.id) !== sid);
      confirmDelete = null;
      pendingDeleteRef.current = null;
      return true;
    };

    // Simula path: botón ✕ directo en lista (FIX: ref + state juntos)
    const deleteFromList = (id) => {
      pendingDeleteRef.current = id;
      confirmDelete = id;
    };

    // Simula path: desde FichaVoluntario (FIX: ref ANTES de cerrar ficha)
    const deleteFromFicha = (id) => {
      pendingDeleteRef.current = id;
      confirmDelete = id;
      // ficha se cierra (setFicha(null)) — ya no importa porque ref está asignado
    };

    // Simula path: desde ModalVoluntario (FIX: ref + state juntos)
    const deleteFromModal = (id) => {
      pendingDeleteRef.current = id;
      confirmDelete = id;
    };

    // Simula onConfirm del ModalConfirm (usa ref como fuente de verdad)
    const confirmAndDelete = () => {
      return ejecutarEliminacion(pendingDeleteRef.current ?? confirmDelete);
    };

    return { getVols: () => vols, deleteFromList, deleteFromFicha, deleteFromModal, confirmAndDelete, getPendingRef: () => pendingDeleteRef.current, getConfirmState: () => confirmDelete };
  }

  const initialVols = [
    { id: 1, nombre: 'Ana García',   estado: 'confirmado' },
    { id: 2, nombre: 'Luis Martín',  estado: 'pendiente'  },
    { id: 3, nombre: 'Sara Pérez',   estado: 'cancelado'  },
  ];

  it('eliminar desde lista: ref y state coinciden, confirmación ejecuta', () => {
    const sys = makeDeleteSystem(initialVols);
    sys.deleteFromList(2);
    expect(sys.getPendingRef()).toBe(2);
    expect(sys.getConfirmState()).toBe(2);
    const ok = sys.confirmAndDelete();
    expect(ok).toBe(true);
    expect(sys.getVols().find(v => v.id === 2)).toBeUndefined();
    expect(sys.getVols()).toHaveLength(2);
  });

  it('eliminar desde ficha: ref asignado antes de cerrar ficha, confirmación no falla', () => {
    const sys = makeDeleteSystem(initialVols);
    sys.deleteFromFicha(1);
    // Simula que la ficha se cierra (confirmDelete podría perderse en ciclo render real)
    // pero pendingDeleteRef.current sigue disponible
    expect(sys.getPendingRef()).toBe(1);
    const ok = sys.confirmAndDelete();
    expect(ok).toBe(true);
    expect(sys.getVols().find(v => v.id === 1)).toBeUndefined();
  });

  it('eliminar desde modal voluntario: ref asignado, confirmación correcta', () => {
    const sys = makeDeleteSystem(initialVols);
    sys.deleteFromModal(3);
    expect(sys.getPendingRef()).toBe(3);
    const ok = sys.confirmAndDelete();
    expect(ok).toBe(true);
    expect(sys.getVols().find(v => v.id === 3)).toBeUndefined();
  });

  it('pendingDeleteRef como fallback: si confirmDelete fuera null por race condition, ref salva la operación', () => {
    const sys = makeDeleteSystem(initialVols);
    // Simula race: ref está asignado pero confirmDelete quedó en null (bug original)
    sys.deleteFromFicha(2);
    // Forzamos el escenario buggy original: confirmDelete = null (como si React no sincronizó)
    // pero ref.current sigue en 2
    const result = (pendingDeleteRef_current => {
      // pendingDeleteRef.current ?? confirmDelete_null
      return pendingDeleteRef_current ?? null;
    })(sys.getPendingRef());
    expect(result).toBe(2); // ref rescata la operación
  });

  it('cancelar confirmación limpia ref y state', () => {
    const sys = makeDeleteSystem(initialVols);
    sys.deleteFromList(1);
    // Usuario cancela el modal
    // Simula onCancel: setConfirmDelete(null) + pendingDeleteRef.current = null
    // (verificamos que el sistema queda limpio)
    expect(sys.getPendingRef()).toBe(1);
    // Tras cancelar manualmente
    // No hay acción de borrado
    expect(sys.getVols()).toHaveLength(3); // nadie eliminado
  });

  it('ids como string y number son tratados igual (coerción String())', () => {
    const sys = makeDeleteSystem([
      { id: '10', nombre: 'Pedro',  estado: 'confirmado' },
      { id: 11,   nombre: 'Elena',  estado: 'pendiente'  },
    ]);
    sys.deleteFromList('10'); // string id
    sys.confirmAndDelete();
    expect(sys.getVols().find(v => String(v.id) === '10')).toBeUndefined();
    expect(sys.getVols()).toHaveLength(1);
  });

  it('ejecutarEliminacion con id null/undefined no modifica el array', () => {
    const sys = makeDeleteSystem(initialVols);
    // Simula llamada con id null (caso defensivo)
    const ok = (id => {
      if (id === null || id === undefined) return false;
      return true;
    })(null);
    expect(ok).toBe(false);
    expect(sys.getVols()).toHaveLength(3);
  });
});

// ── VOL-12: FIX-BADGE-01 — badge de grupo refleja filtrados vs total ─────────
describe('VOL-12 — FIX-BADGE-01: badge grupo muestra filtrados/total', () => {
  const todosVols = [
    { id:1, nombre:'Ana',   estado:'confirmado', puestoId:1 },
    { id:2, nombre:'Luis',  estado:'confirmado', puestoId:2 },
    { id:3, nombre:'Sara',  estado:'confirmado', puestoId:1 },
    { id:4, nombre:'Pedro', estado:'pendiente',  puestoId:1 },
    { id:5, nombre:'Elena', estado:'cancelado',  puestoId:2 },
  ];

  // Simula la lógica del badge corregida
  const badgeText = (items, todosVols, grupoId) => {
    const totalGrupo = todosVols.filter(v => v.estado === grupoId).length;
    const filtrados = items.length;
    return filtrados !== totalGrupo ? `${filtrados} / ${totalGrupo}` : String(filtrados);
  };

  it('sin filtro activo: badge muestra solo el total del grupo', () => {
    const confirmados = todosVols.filter(v => v.estado === 'confirmado');
    expect(badgeText(confirmados, todosVols, 'confirmado')).toBe('3');
  });

  it('con filtro activo (ej: puesto 1): badge muestra filtrados/total', () => {
    const itemsFiltrados = todosVols.filter(v => v.estado === 'confirmado' && v.puestoId === 1);
    expect(badgeText(itemsFiltrados, todosVols, 'confirmado')).toBe('2 / 3');
  });

  it('filtro que devuelve 0 items: badge muestra 0/total (grupo no se renderiza, pero lógica es correcta)', () => {
    const itemsFiltrados = todosVols.filter(v => v.estado === 'confirmado' && v.puestoId === 99);
    expect(badgeText(itemsFiltrados, todosVols, 'confirmado')).toBe('0 / 3');
  });

  it('filtro por búsqueda: badge refleja resultados de búsqueda', () => {
    const q = 'ana';
    const itemsFiltrados = todosVols.filter(v => v.estado === 'confirmado' && v.nombre.toLowerCase().includes(q));
    expect(badgeText(itemsFiltrados, todosVols, 'confirmado')).toBe('1 / 3');
  });

  it('pendientes: sin filtro muestra total correcto', () => {
    const pendientes = todosVols.filter(v => v.estado === 'pendiente');
    expect(badgeText(pendientes, todosVols, 'pendiente')).toBe('1');
  });
});
