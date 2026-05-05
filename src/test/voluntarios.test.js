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
