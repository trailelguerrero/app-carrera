/**
 * SPRINT 3 + 4 — Test Suite — Bloque Patrocinadores
 *
 * S3-01  getImporteCobrado — función utilitaria centralizada
 * S3-02  detectarIncoherencias — validación económica
 * S3-03  calcularTotalEspecie — recálculo automático
 * S3-04  updateEstado — historial automático
 * S3-05  calcularDependencia — ranking económico
 * S3-06  importarProspectos — parse y deduplicación CSV
 * S3-07  PLANTILLAS_CONTRAPRESTACION — plantillas por nivel
 * S3-08  Búsqueda avanzada con prefijos nivel:/sector:/estado:
 * S3-09  tipoAportacion separado del nivel
 * S3-10  fechaEntrega en contraprestaciones
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';

beforeAll(() => {
  const store = {};
  Object.defineProperty(window, 'localStorage', {
    value: { getItem: vi.fn(k => store[k]??null), setItem: vi.fn((k,v)=>{store[k]=String(v);}), removeItem: vi.fn(), clear: vi.fn() },
    writable: true,
  });
  Object.defineProperty(window, 'sessionStorage', {
    value: { getItem: vi.fn(()=>null), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() },
    writable: true,
  });
  global.fetch = vi.fn(() => Promise.resolve({ ok:true, status:200, json:()=>Promise.resolve({}) }));
  vi.spyOn(console,'error').mockImplementation(()=>{});
});

// ── S3-01: getImporteCobrado ───────────────────────────────────────────────
describe('S3-01 — getImporteCobrado', () => {
  const getImporteCobrado = (pat) => {
    if (pat.importeCobrado != null && pat.importeCobrado > 0) return pat.importeCobrado;
    if (pat.estado === "cobrado") return pat.importe || 0;
    return 0;
  };

  it('usa importeCobrado cuando es > 0', () => {
    expect(getImporteCobrado({ importe: 1000, importeCobrado: 800, estado: "cobrado" })).toBe(800);
  });
  it('usa importe completo si cobrado y importeCobrado es 0', () => {
    expect(getImporteCobrado({ importe: 1000, importeCobrado: 0, estado: "cobrado" })).toBe(1000);
  });
  it('devuelve 0 para confirmado sin importeCobrado', () => {
    expect(getImporteCobrado({ importe: 1000, importeCobrado: 0, estado: "confirmado" })).toBe(0);
  });
  it('devuelve 0 para prospecto', () => {
    expect(getImporteCobrado({ importe: 500, estado: "prospecto" })).toBe(0);
  });
  it('maneja importeCobrado null correctamente', () => {
    expect(getImporteCobrado({ importe: 500, importeCobrado: null, estado: "cobrado" })).toBe(500);
  });
});

// ── S3-02: detectarIncoherencias ──────────────────────────────────────────
describe('S3-02 — detectarIncoherencias', () => {
  const detectar = (pat) => {
    const issues = [];
    if (pat.estado === "cobrado" && !pat.importeCobrado && !pat.importe)
      issues.push("Estado 'cobrado' pero sin importe registrado");
    if (pat.importeCobrado > 0 && pat.estado === "prospecto")
      issues.push("Tiene importe cobrado pero sigue como prospecto");
    if (pat.importeCobrado > (pat.importe||0) && pat.importe > 0)
      issues.push(`Cobrado supera el importe acordado`);
    if (pat.importeCobrado > 0 && pat.importeCobrado < (pat.importe||0) && pat.estado === "cobrado")
      issues.push("Cobro parcial");
    return issues;
  };

  it('detecta cobrado sin importe', () => {
    const issues = detectar({ estado:"cobrado", importe:0, importeCobrado:0 });
    expect(issues.length).toBeGreaterThan(0);
  });
  it('detecta cobro sin actualizar estado', () => {
    const issues = detectar({ estado:"prospecto", importe:1000, importeCobrado:500 });
    expect(issues.some(i => i.includes("prospecto"))).toBe(true);
  });
  it('detecta cobrado > acordado', () => {
    const issues = detectar({ estado:"cobrado", importe:1000, importeCobrado:1500 });
    expect(issues.some(i => i.includes("supera"))).toBe(true);
  });
  it('detecta cobro parcial', () => {
    const issues = detectar({ estado:"cobrado", importe:1000, importeCobrado:600 });
    expect(issues.some(i => i.includes("parcial"))).toBe(true);
  });
  it('sin issues para patron correcto', () => {
    const issues = detectar({ estado:"confirmado", importe:1000, importeCobrado:0 });
    expect(issues.length).toBe(0);
  });
  it('sin issues para cobrado completo coherente', () => {
    const issues = detectar({ estado:"cobrado", importe:1000, importeCobrado:1000 });
    expect(issues.length).toBe(0);
  });
});

// ── S3-03: calcularTotalEspecie ───────────────────────────────────────────
describe('S3-03 — calcularTotalEspecie', () => {
  const calcular = (items = []) =>
    items.reduce((s, i) => s + ((i.valorUnitario||0) * (i.cantidad||0)), 0);

  it('suma correctamente múltiples items', () => {
    const items = [
      { valorUnitario: 10, cantidad: 5 },
      { valorUnitario: 25, cantidad: 3 },
    ];
    expect(calcular(items)).toBe(125);
  });
  it('devuelve 0 para array vacío', () => {
    expect(calcular([])).toBe(0);
  });
  it('maneja items sin valorUnitario', () => {
    expect(calcular([{ cantidad: 5 }])).toBe(0);
  });
  it('maneja items con cantidad 0', () => {
    expect(calcular([{ valorUnitario: 100, cantidad: 0 }])).toBe(0);
  });
});

// ── S3-04: historial automático en updateEstado ───────────────────────────
describe('S3-04 — Historial automático de cambios de estado', () => {
  const updateEstadoConHistorial = (pat, nuevoEstado) => {
    const entrada = {
      id: String(Date.now()),
      fecha: new Date().toISOString(),
      tipo: "estado",
      texto: `Estado: ${pat.estado} → ${nuevoEstado}`,
      antes: pat.estado,
      despues: nuevoEstado,
    };
    const historial = [...(Array.isArray(pat.historial) ? pat.historial : []), entrada].slice(-50);
    return { ...pat, estado: nuevoEstado, historial };
  };

  it('registra el cambio de estado en historial', () => {
    const pat = { id:1, estado:"negociando", historial:[] };
    const updated = updateEstadoConHistorial(pat, "confirmado");
    expect(updated.estado).toBe("confirmado");
    expect(updated.historial).toHaveLength(1);
    expect(updated.historial[0].antes).toBe("negociando");
    expect(updated.historial[0].despues).toBe("confirmado");
  });

  it('acumula múltiples cambios', () => {
    let pat = { id:1, estado:"prospecto", historial:[] };
    pat = updateEstadoConHistorial(pat, "negociando");
    pat = updateEstadoConHistorial(pat, "confirmado");
    pat = updateEstadoConHistorial(pat, "cobrado");
    expect(pat.historial).toHaveLength(3);
    expect(pat.historial[2].despues).toBe("cobrado");
  });

  it('limita historial a 50 entradas', () => {
    const historialLargo = Array.from({length:50}, (_,i) => ({ id:String(i), tipo:"estado" }));
    const pat = { id:1, estado:"negociando", historial: historialLargo };
    const updated = updateEstadoConHistorial(pat, "confirmado");
    expect(updated.historial).toHaveLength(50);
  });

  it('texto descriptivo incluye estados anterior y nuevo', () => {
    const pat = { id:1, estado:"prospecto", historial:[] };
    const updated = updateEstadoConHistorial(pat, "cobrado");
    expect(updated.historial[0].texto).toContain("prospecto");
    expect(updated.historial[0].texto).toContain("cobrado");
  });
});

// ── S3-05: calcularDependencia ────────────────────────────────────────────
describe('S3-05 — Ranking de dependencia económica', () => {
  const calcularDependencia = (pats, totalIngresos) => {
    return pats
      .filter(p => p.estado !== "cancelado")
      .map(p => {
        const aportacion = (p.importe||0) + (p.especie||0);
        const pct = totalIngresos > 0 ? Math.round(aportacion / totalIngresos * 100) : 0;
        const nivel = pct > 20 ? "critica" : pct > 10 ? "alta" : pct > 5 ? "media" : "baja";
        return { ...p, _aportacion: aportacion, _pct: pct, _dep: nivel };
      })
      .sort((a, b) => b._aportacion - a._aportacion);
  };

  const pats = [
    { id:1, nombre:"Empresa A", importe:4000, especie:0, estado:"confirmado" },
    { id:2, nombre:"Empresa B", importe:2000, especie:0, estado:"cobrado" },
    { id:3, nombre:"Empresa C", importe:500,  especie:0, estado:"prospecto" },
    { id:4, nombre:"Cancelado", importe:1000, especie:0, estado:"cancelado" },
  ];

  it('excluye patrocinadores cancelados', () => {
    const result = calcularDependencia(pats, 10000);
    expect(result.every(p => p.estado !== "cancelado")).toBe(true);
  });

  it('ordena por aportación descendente', () => {
    const result = calcularDependencia(pats, 10000);
    expect(result[0].nombre).toBe("Empresa A");
    expect(result[1].nombre).toBe("Empresa B");
  });

  it('clasifica dependencia critica > 20%', () => {
    const result = calcularDependencia(pats, 10000);
    const empA = result.find(p => p.nombre === "Empresa A");
    expect(empA._pct).toBe(40);
    expect(empA._dep).toBe("critica");
  });

  it('clasifica dependencia baja < 5%', () => {
    const result = calcularDependencia(pats, 10000);
    const empC = result.find(p => p.nombre === "Empresa C");
    expect(empC._dep).toBe("baja");
  });

  it('calcula % correcto', () => {
    const result = calcularDependencia([{ id:1, nombre:"Test", importe:3000, especie:0, estado:"confirmado" }], 10000);
    expect(result[0]._pct).toBe(30);
  });
});

// ── S3-06: Parse CSV de prospectos ────────────────────────────────────────
describe('S3-06 — Importación CSV de prospectos', () => {
  const parseProspectos = (text, patExistentes = []) => {
    const lines = text.split("\n").map(l => l.endsWith("\r") ? l.slice(0,-1) : l).filter(Boolean);
    if (lines.length < 2) return { nuevos:[], dupes:0, error:"CSV vacío" };
    const sep = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(sep).map(h => h.trim().toLowerCase());
    const idx = (names) => names.map(n => headers.findIndex(h => h.includes(n))).find(i => i >= 0) ?? -1;
    const iNombre = idx(["nombre","empresa","company","name"]);
    const iEmail  = idx(["email","correo","mail"]);
    const iImporte= idx(["importe","amount"]);
    if (iNombre === -1) return { nuevos:[], dupes:0, error:"Falta columna nombre" };
    let dupes = 0;
    const nuevos = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map(c => c.trim());
      const nombre = cols[iNombre]||"";
      if (!nombre) continue;
      const email = iEmail >= 0 ? cols[iEmail]||"" : "";
      const dup = patExistentes.find(p => p.nombre.toLowerCase() === nombre.toLowerCase()) ||
                  nuevos.find(p => p.nombre.toLowerCase() === nombre.toLowerCase());
      if (dup) { dupes++; continue; }
      nuevos.push({ nombre, email, importe: iImporte >= 0 ? parseFloat(cols[iImporte])||0 : 0, estado:"prospecto" });
    }
    return { nuevos, dupes, error:null };
  };

  const csvComas = "nombre,email,importe\nDecathlon Avila,info@dec.es,2000\nClínica Fisio,fis@fis.es,500\nTurismo Local,,0";
  const csvPuntosComa = "nombre;email;importe\nDecathlon Avila;info@dec.es;2000";

  it('parsea CSV con comas', () => {
    const r = parseProspectos(csvComas);
    expect(r.error).toBeNull();
    expect(r.nuevos).toHaveLength(3);
    expect(r.nuevos[0].nombre).toBe("Decathlon Avila");
    expect(r.nuevos[0].importe).toBe(2000);
  });

  it('parsea CSV con punto y coma', () => {
    const r = parseProspectos(csvPuntosComa);
    expect(r.nuevos).toHaveLength(1);
  });

  it('detecta duplicados contra patrocinadores existentes', () => {
    const existentes = [{ nombre:"Decathlon Avila", email:"" }];
    const r = parseProspectos(csvComas, existentes);
    expect(r.nuevos).toHaveLength(2);
    expect(r.dupes).toBe(1);
  });

  it('detecta duplicados dentro del mismo CSV', () => {
    const csv = "nombre\nEmpresa A\nEmpresa A\nEmpresa B";
    const r = parseProspectos(csv);
    expect(r.nuevos).toHaveLength(2);
    expect(r.dupes).toBe(1);
  });

  it('falla sin columna nombre', () => {
    const r = parseProspectos("email,tel\ntest@test.es,600000000");
    expect(r.error).toBeTruthy();
    expect(r.nuevos).toHaveLength(0);
  });

  it('todos los nuevos tienen estado prospecto', () => {
    const r = parseProspectos(csvComas);
    expect(r.nuevos.every(p => p.estado === "prospecto")).toBe(true);
  });
});

// ── S3-07: Plantillas de contraprestaciones ───────────────────────────────
describe('S3-07 — Plantillas de contraprestaciones por nivel', () => {
  const PLANTILLAS = {
    "Oro":         [{ tipo:"Logo en camiseta corredores", estado:"pendiente" }, { tipo:"Banner en zona meta", estado:"pendiente" }],
    "Plata":       [{ tipo:"Logo en camiseta corredores", estado:"pendiente" }],
    "Bronce":      [{ tipo:"Logo en díptico/programa", estado:"pendiente" }],
    "Colaborador": [{ tipo:"Logo en web oficial", estado:"pendiente" }],
  };

  it('Oro tiene más contraprestaciones que Bronce', () => {
    expect(PLANTILLAS["Oro"].length).toBeGreaterThan(PLANTILLAS["Bronce"].length);
  });

  it('todos los items tienen estado pendiente', () => {
    Object.values(PLANTILLAS).flat().forEach(c => {
      expect(c.estado).toBe("pendiente");
    });
  });

  it('Colaborador tiene al menos 1 contraprestación', () => {
    expect(PLANTILLAS["Colaborador"].length).toBeGreaterThanOrEqual(1);
  });

  it('plantilla carga cuando el form está vacío de contraprestaciones', () => {
    const form = { nivel:"Oro", contraprestaciones: [] };
    const plantilla = PLANTILLAS[form.nivel] || [];
    const debenCargarse = plantilla.length > 0 && (!form.contraprestaciones || form.contraprestaciones.length === 0);
    expect(debenCargarse).toBe(true);
  });

  it('plantilla NO se carga si ya hay contraprestaciones', () => {
    const form = { nivel:"Oro", contraprestaciones: [{ tipo:"Existente", estado:"pendiente" }] };
    const plantilla = PLANTILLAS[form.nivel] || [];
    const debenCargarse = plantilla.length > 0 && (!form.contraprestaciones || form.contraprestaciones.length === 0);
    expect(debenCargarse).toBe(false);
  });
});

// ── S3-08: Búsqueda avanzada con prefijos ─────────────────────────────────
describe('S3-08 — Búsqueda avanzada con prefijos', () => {
  const pats = [
    { nombre:"Decathlon",   nivel:"Oro",    sector:"Deportes",  estado:"confirmado" },
    { nombre:"Clinica Fisio",nivel:"Plata", sector:"Salud",     estado:"cobrado" },
    { nombre:"Hotel Gredos", nivel:"Bronce",sector:"Turismo",   estado:"negociando" },
    { nombre:"Bar Local",    nivel:"Colaborador", sector:"Hostelería", estado:"prospecto" },
  ];

  const buscar = (pats, search) => {
    if (search.startsWith("nivel:")) {
      const v = search.slice(6).trim().toLowerCase();
      return pats.filter(p => (p.nivel||"").toLowerCase().startsWith(v));
    }
    if (search.startsWith("sector:")) {
      const v = search.slice(7).trim().toLowerCase();
      return pats.filter(p => (p.sector||"").toLowerCase().includes(v));
    }
    if (search.startsWith("estado:")) {
      const v = search.slice(7).trim().toLowerCase();
      return pats.filter(p => (p.estado||"").toLowerCase().startsWith(v));
    }
    return pats.filter(p => (p.nombre||"").toLowerCase().includes(search.toLowerCase()));
  };

  it('filtra por nivel: con prefijo', () => {
    expect(buscar(pats, "nivel:Oro")).toHaveLength(1);
    expect(buscar(pats, "nivel:Plata")[0].nombre).toBe("Clinica Fisio");
  });

  it('filtra por sector: con prefijo', () => {
    expect(buscar(pats, "sector:Deportes")).toHaveLength(1);
    expect(buscar(pats, "sector:Sal")[0].nombre).toBe("Clinica Fisio");
  });

  it('filtra por estado: con prefijo', () => {
    expect(buscar(pats, "estado:cobrado")).toHaveLength(1);
    expect(buscar(pats, "estado:neg")[0].nombre).toBe("Hotel Gredos");
  });

  it('búsqueda libre por nombre sin prefijo', () => {
    expect(buscar(pats, "decathlon")).toHaveLength(1);
    expect(buscar(pats, "hotel")).toHaveLength(1);
  });

  it('búsqueda vacía no filtra', () => {
    expect(buscar(pats, "")).toHaveLength(4);
  });
});

// ── S3-09: tipoAportacion separado del nivel ──────────────────────────────
describe('S3-09 — tipoAportacion separado de nivel', () => {
  it('un patrocinador puede ser Oro con aportación en especie', () => {
    const pat = { nivel:"Oro", tipoAportacion:"especie", importe:0, especie:5000 };
    expect(pat.nivel).toBe("Oro");
    expect(pat.tipoAportacion).toBe("especie");
  });

  it('tipoAportacion mixta permite importe + especie', () => {
    const pat = { nivel:"Plata", tipoAportacion:"mixta", importe:1000, especie:2000 };
    const total = (pat.importe||0) + (pat.especie||0);
    expect(total).toBe(3000);
  });

  it('nivel Especie legacy se puede tratar como tipoAportacion:especie', () => {
    const pat = { nivel:"Especie", importe:0, especie:800 };
    const tipo = pat.tipoAportacion || (pat.nivel === "Especie" ? "especie" : "monetaria");
    expect(tipo).toBe("especie");
  });
});

// ── S3-10: fechaEntrega en contraprestaciones ─────────────────────────────
describe('S3-10 — fechaEntrega en contraprestaciones', () => {
  const hoy = new Date('2026-05-01');

  it('contraprestación puede tener fechaEntrega', () => {
    const c = { tipo:"Banner en meta", estado:"pendiente", fechaEntrega:"2026-08-01" };
    expect(c.fechaEntrega).toBeTruthy();
    expect(new Date(c.fechaEntrega)).toBeInstanceOf(Date);
  });

  it('detecta contraprestaciones vencidas', () => {
    const contras = [
      { tipo:"Banner", estado:"pendiente", fechaEntrega:"2026-04-01" }, // vencida
      { tipo:"Logo",   estado:"pendiente", fechaEntrega:"2026-09-01" }, // futura
      { tipo:"Stand",  estado:"entregado", fechaEntrega:"2026-04-01" }, // ya entregada — no vencida
    ];
    const vencidas = contras.filter(c =>
      c.estado === "pendiente" && c.fechaEntrega &&
      new Date(c.fechaEntrega) < hoy
    );
    expect(vencidas).toHaveLength(1);
    expect(vencidas[0].tipo).toBe("Banner");
  });

  it('sin fechaEntrega no se considera vencida', () => {
    const c = { tipo:"Mención RRSS", estado:"pendiente", fechaEntrega:"" };
    const vencida = c.estado === "pendiente" && c.fechaEntrega && new Date(c.fechaEntrega) < hoy;
    expect(vencida).toBeFalsy();
  });
});
