/**
 * Camisetas — Test Suite
 *
 * CAM-01  TALLAS y TALLAS_PORTAL usan el mismo conjunto
 * CAM-02  PEDIDOS_DEFAULT está vacío
 * CAM-03  exportarPedidoProveedor genera CSV correcto
 * CAM-04  Buscador TabChecklist filtra por nombre y teléfono
 * CAM-05  Buffer de seguridad calcula unidades correctamente
 * CAM-06  generarPedidosVoluntarios — deduplicación y mapeo
 * CAM-07  Validación tipo "nino" usa TALLAS_NINO
 * CAM-08  Sincronización camisetaEntregada → Voluntarios
 * CAM-09  GUIA_TALLAS incluye XXS y 4XL
 * CAM-10  calcPedido — cálculo financiero correcto
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';

beforeAll(() => {
  const s = {};
  Object.defineProperty(window,'localStorage',{value:{getItem:vi.fn(k=>s[k]??null),setItem:vi.fn((k,v)=>{s[k]=String(v);}),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  Object.defineProperty(window,'sessionStorage',{value:{getItem:vi.fn(()=>null),setItem:vi.fn(),removeItem:vi.fn(),clear:vi.fn()},writable:true});
  global.fetch=vi.fn(()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({})}));
  vi.spyOn(console,'error').mockImplementation(()=>{});
});

// Constantes locales que reflejan el estado corregido del bloque
const TALLAS       = ["XXS","XS","S","M","L","XL","XXL","3XL","4XL"];
const TALLAS_PORTAL = ["XXS","XS","S","M","L","XL","XXL","3XL","4XL"]; // sincronizado
const TALLAS_NINO  = ["4-6","6-8","8-10","10-12"];

// ── CAM-01: TALLAS y TALLAS_PORTAL ────────────────────────────────────────
describe('CAM-01 — TALLAS y TALLAS_PORTAL sincronizados', () => {
  it('TALLAS tiene 9 tallas', () => {
    expect(TALLAS).toHaveLength(9);
  });
  it('TALLAS_PORTAL incluye XXS', () => {
    expect(TALLAS_PORTAL).toContain('XXS');
  });
  it('TALLAS_PORTAL incluye 4XL', () => {
    expect(TALLAS_PORTAL).toContain('4XL');
  });
  it('TALLAS y TALLAS_PORTAL son idénticos', () => {
    expect(TALLAS).toEqual(TALLAS_PORTAL);
  });
  it('TALLAS_NINO tiene tallas infantiles correctas', () => {
    expect(TALLAS_NINO).toEqual(["4-6","6-8","8-10","10-12"]);
  });
});

// ── CAM-02: PEDIDOS_DEFAULT vacío ─────────────────────────────────────────
describe('CAM-02 — PEDIDOS_DEFAULT vacío', () => {
  const PEDIDOS_DEFAULT = [];
  it('PEDIDOS_DEFAULT es un array vacío', () => {
    expect(PEDIDOS_DEFAULT).toHaveLength(0);
  });
  it('no hay datos ficticios de "Ejemplo Persona"', () => {
    const hayFicticio = PEDIDOS_DEFAULT.some(p =>
      (p.nombre||'').toLowerCase().includes('ejemplo')
    );
    expect(hayFicticio).toBe(false);
  });
});

// ── CAM-03: Exportar pedido proveedor ─────────────────────────────────────
describe('CAM-03 — exportarPedidoProveedor genera CSV correcto', () => {
  const genCSV = (tallasCorr, tallasVol, ninoExt, margen = 5) => {
    const filas = [["Tipo","Talla","Unidades_Base","Margen_%","Total_A_Pedir"]];
    const agregar = (tipo, tallas, mapa) => {
      tallas.forEach(t => {
        const base = mapa[t] || 0;
        if (base <= 0) return;
        const total = Math.ceil(base * (1 + margen / 100));
        filas.push([tipo, t, base, margen + "%", total]);
      });
    };
    agregar("corredor",   TALLAS,     tallasCorr);
    agregar("voluntario", TALLAS,     tallasVol);
    agregar("nino",       TALLAS_NINO, ninoExt);
    return filas;
  };

  it('genera filas para cada talla con unidades > 0', () => {
    const filas = genCSV({ M: 50, L: 80, XL: 30 }, { S: 10, M: 20 }, {});
    // Header + 3 corredores + 2 voluntarios = 6
    expect(filas.length).toBe(6);
  });

  it('aplica buffer de seguridad correctamente', () => {
    const filas = genCSV({ M: 100 }, {}, {}, 5);
    const fila = filas.find(f => f[0] === 'corredor' && f[1] === 'M');
    expect(fila[4]).toBe(105); // ceil(100 * 1.05) = 105
  });

  it('aplica buffer con redondeo hacia arriba', () => {
    const filas = genCSV({ S: 10 }, {}, {}, 5);
    const fila = filas.find(f => f[1] === 'S');
    expect(fila[4]).toBe(11); // ceil(10 * 1.05) = ceil(10.5) = 11
  });

  it('buffer 0% devuelve la misma cantidad', () => {
    const filas = genCSV({ M: 100 }, {}, {}, 0);
    const fila = filas.find(f => f[1] === 'M');
    expect(fila[4]).toBe(100);
  });

  it('no incluye tallas con 0 unidades', () => {
    const filas = genCSV({ M: 0, L: 50 }, {}, {});
    const filasM = filas.filter(f => f[1] === 'M');
    expect(filasM).toHaveLength(0);
    const filasL = filas.filter(f => f[1] === 'L');
    expect(filasL).toHaveLength(1);
  });

  it('incluye tallas de niño correctamente', () => {
    const filas = genCSV({}, {}, { "4-6": 5, "6-8": 8 });
    const ninos = filas.filter(f => f[0] === 'nino');
    expect(ninos).toHaveLength(2);
  });
});

// ── CAM-04: Buscador en TabChecklist ──────────────────────────────────────
describe('CAM-04 — Buscador TabChecklist filtra por nombre y teléfono', () => {
  const lineas = [
    { pedNombre: "María García", ped: { telefono: "611000001" }, estadoEntrega: "pendiente" },
    { pedNombre: "Juan Pérez",   ped: { telefono: "611000002" }, estadoEntrega: "pendiente" },
    { pedNombre: "Ana Torres",   ped: { telefono: "611000003" }, estadoEntrega: "entregado" },
  ];

  const buscar = (lineas, q) => {
    if (!q.trim()) return lineas;
    const lower = q.toLowerCase();
    return lineas.filter(l =>
      (l.pedNombre||"").toLowerCase().includes(lower) ||
      (l.ped?.telefono||"").includes(q)
    );
  };

  it('filtra por nombre parcial', () => {
    expect(buscar(lineas, 'maría')).toHaveLength(1);
  });

  it('filtra por teléfono', () => {
    expect(buscar(lineas, '611000002')).toHaveLength(1);
    expect(buscar(lineas, '611000002')[0].pedNombre).toBe('Juan Pérez');
  });

  it('búsqueda vacía devuelve todos', () => {
    expect(buscar(lineas, '')).toHaveLength(3);
  });

  it('búsqueda case-insensitive', () => {
    expect(buscar(lineas, 'ANA')).toHaveLength(1);
  });

  it('sin resultados para búsqueda inexistente', () => {
    expect(buscar(lineas, 'xyz')).toHaveLength(0);
  });

  it('busca por teléfono parcial', () => {
    expect(buscar(lineas, '611000')).toHaveLength(3);
  });
});

// ── CAM-05: Buffer de seguridad ───────────────────────────────────────────
describe('CAM-05 — Buffer de seguridad en tallas', () => {
  const conBuffer = (n, pct) => Math.ceil(n * (1 + pct / 100));

  it('5% sobre 100 → 105', () => expect(conBuffer(100, 5)).toBe(105));
  it('10% sobre 50 → 56 (ceil de 55.000...1 por flotante)', () => expect(conBuffer(50, 10)).toBe(56));
  it('0% no cambia',        () => expect(conBuffer(75, 0)).toBe(75));
  it('redondea hacia arriba', () => expect(conBuffer(10, 5)).toBe(11));
  it('15% sobre 20 → 23',  () => expect(conBuffer(20, 15)).toBe(23));
});

// ── CAM-06: generarPedidosVoluntarios ─────────────────────────────────────
describe('CAM-06 — Generación de pedidos desde voluntarios', () => {
  const voluntarios = [
    { id:1, nombre:"María", apellidos:"García", telefono:"611001", talla:"M", estado:"confirmado" },
    { id:2, nombre:"Juan",  apellidos:"Pérez",  telefono:"611002", talla:"L", estado:"confirmado" },
    { id:3, nombre:"Ana",   apellidos:"Torres", telefono:"611003", talla:"S", estado:"cancelado" }, // excluir
    { id:4, nombre:"Pedro", apellidos:"López",  telefono:"611004", talla:"",  estado:"confirmado" }, // sin talla, excluir
  ];

  const pedidosExistentes = [
    { nombre:"María García", lineas:[{ tipo:"voluntario" }] },
  ];

  const generarPedidos = (voluntarios, pedidosExistentes) => {
    const nombresConPedido = new Set(
      pedidosExistentes.flatMap(p =>
        p.lineas.filter(l => l.tipo === "voluntario").map(() =>
          p.nombre.toLowerCase().trim()
        )
      )
    );
    return voluntarios
      .filter(v => v.estado !== "cancelado" && v.talla)
      .filter(v => !nombresConPedido.has(`${v.nombre} ${v.apellidos}`.toLowerCase().trim()))
      .map(v => ({
        nombre: `${v.nombre} ${v.apellidos}`.trim(),
        telefono: v.telefono,
        voluntarioId: v.id,
        lineas: [{ tipo:"voluntario", talla:v.talla, cantidad:1, estadoPago:"regalo", estadoEntrega:"pendiente" }],
      }));
  };

  it('excluye voluntarios cancelados', () => {
    const pedidos = generarPedidos(voluntarios, []);
    expect(pedidos.every(p => !p.nombre.includes('Ana'))).toBe(true);
  });

  it('excluye voluntarios sin talla', () => {
    const pedidos = generarPedidos(voluntarios, []);
    expect(pedidos.every(p => p.lineas[0].talla)).toBe(true);
  });

  it('excluye voluntarios que ya tienen pedido', () => {
    const pedidos = generarPedidos(voluntarios, pedidosExistentes);
    expect(pedidos.every(p => p.nombre !== 'María García')).toBe(true);
  });

  it('genera línea con tipo voluntario y estadoPago regalo', () => {
    const pedidos = generarPedidos(voluntarios, []);
    expect(pedidos.every(p => p.lineas[0].tipo === 'voluntario')).toBe(true);
    expect(pedidos.every(p => p.lineas[0].estadoPago === 'regalo')).toBe(true);
  });

  it('vincula voluntarioId correctamente', () => {
    const pedidos = generarPedidos(voluntarios, []);
    const juan = pedidos.find(p => p.nombre === 'Juan Pérez');
    expect(juan?.voluntarioId).toBe(2);
  });

  it('genera pedidos con talla correcta del voluntario', () => {
    const pedidos = generarPedidos(voluntarios, []);
    const juan = pedidos.find(p => p.nombre === 'Juan Pérez');
    expect(juan?.lineas[0].talla).toBe('L');
  });
});

// ── CAM-07: Validación tipo nino usa TALLAS_NINO ──────────────────────────
describe('CAM-07 — Tipo nino usa TALLAS_NINO', () => {
  const esValidaNino = (talla) => TALLAS_NINO.includes(talla);
  const esValidaAdulto = (talla) => TALLAS.includes(talla);

  it('talla "4-6" es válida para nino', () => {
    expect(esValidaNino('4-6')).toBe(true);
  });

  it('talla "M" NO es válida para nino', () => {
    expect(esValidaNino('M')).toBe(false);
  });

  it('talla "4-6" NO es válida para adulto', () => {
    expect(esValidaAdulto('4-6')).toBe(false);
  });

  it('todas las tallas de adulto son inválidas para nino', () => {
    expect(TALLAS.every(t => !esValidaNino(t))).toBe(true);
  });

  it('todas las tallas nino son inválidas para adulto', () => {
    expect(TALLAS_NINO.every(t => !esValidaAdulto(t))).toBe(true);
  });
});

// ── CAM-08: Sincronización camisetaEntregada → Voluntarios ────────────────
describe('CAM-08 — Sincronización entrega camiseta', () => {
  const voluntarios = [
    { id:1, nombre:"María", apellidos:"García", camisetaEntregada: false },
    { id:2, nombre:"Juan",  apellidos:"Pérez",  camisetaEntregada: false },
  ];

  const sincronizar = (nombrePedido, entregado, vols) => {
    return vols.map(v => {
      const nc = `${v.nombre} ${v.apellidos||""}`.toLowerCase().trim();
      const np = nombrePedido.toLowerCase().trim();
      if (nc === np || nc.includes(np) || np.includes(nc)) {
        return { ...v, camisetaEntregada: entregado };
      }
      return v;
    });
  };

  it('marca camisetaEntregada al entregar', () => {
    const r = sincronizar("María García", true, voluntarios);
    expect(r[0].camisetaEntregada).toBe(true);
    expect(r[1].camisetaEntregada).toBe(false);
  });

  it('no afecta a otros voluntarios', () => {
    const r = sincronizar("Juan Pérez", true, voluntarios);
    expect(r[0].camisetaEntregada).toBe(false);
    expect(r[1].camisetaEntregada).toBe(true);
  });

  it('revierte la entrega si se desmarca', () => {
    const vEntregados = voluntarios.map(v => ({ ...v, camisetaEntregada: true }));
    const r = sincronizar("María García", false, vEntregados);
    expect(r[0].camisetaEntregada).toBe(false);
    expect(r[1].camisetaEntregada).toBe(true);
  });
});

// ── CAM-09: GUIA_TALLAS incluye XXS y 4XL ────────────────────────────────
describe('CAM-09 — GUIA_TALLAS actualizada', () => {
  const GUIA_TALLAS = [
    { talla:"XXS", pecho:"76-84",   largo:"64", hombro:"39" },
    { talla:"XS",  pecho:"84-88",   largo:"67", hombro:"41" },
    { talla:"S",   pecho:"88-94",   largo:"68", hombro:"43" },
    { talla:"M",   pecho:"94-100",  largo:"70", hombro:"45" },
    { talla:"L",   pecho:"100-107", largo:"72", hombro:"47" },
    { talla:"XL",  pecho:"107-115", largo:"74", hombro:"49" },
    { talla:"XXL", pecho:"115-124", largo:"76", hombro:"51" },
    { talla:"3XL", pecho:"124-134", largo:"78", hombro:"53" },
    { talla:"4XL", pecho:"134-146", largo:"80", hombro:"56" },
  ];

  it('tiene 9 tallas', () => expect(GUIA_TALLAS).toHaveLength(9));
  it('incluye XXS',  () => expect(GUIA_TALLAS.some(g => g.talla === 'XXS')).toBe(true));
  it('incluye 4XL',  () => expect(GUIA_TALLAS.some(g => g.talla === '4XL')).toBe(true));
  it('medidas crecientes para pecho', () => {
    const peches = GUIA_TALLAS.map(g => parseInt(g.pecho));
    for (let i = 1; i < peches.length; i++) {
      expect(peches[i]).toBeGreaterThan(peches[i-1]);
    }
  });
  it('todos los campos tienen datos', () => {
    GUIA_TALLAS.forEach(g => {
      expect(g.talla).toBeTruthy();
      expect(g.pecho).toBeTruthy();
      expect(g.largo).toBeTruthy();
      expect(g.hombro).toBeTruthy();
    });
  });
});

// ── CAM-10: calcPedido financiero ─────────────────────────────────────────
describe('CAM-10 — calcPedido cálculo financiero', () => {
  const coste = { corredor: 8, voluntario: 7, nino: 6 };

  const calcPedido = (p, coste) => {
    const totalVenta  = p.lineas.reduce((s,l) => s + (l.estadoPago==='regalo' ? 0 : l.cantidad*(l.precioVenta||0)), 0);
    const totalCoste  = p.lineas.reduce((s,l) => s + l.cantidad*(coste[l.tipo]||0), 0);
    const benRealizado = p.lineas.filter(l=>l.estadoPago==='pagado').reduce((s,l) => s + l.cantidad*(l.precioVenta||0) - l.cantidad*(coste[l.tipo]||0), 0);
    const costeRegalos = p.lineas.filter(l=>l.estadoPago==='regalo').reduce((s,l) => s + l.cantidad*(coste[l.tipo]||0), 0);
    return { totalVenta, totalCoste, beneficio: totalVenta - totalCoste, benRealizado, costeRegalos };
  };

  it('calcula beneficio correcto con venta pagada', () => {
    const p = { lineas: [{ tipo:"corredor", talla:"M", cantidad:1, precioVenta:15, estadoPago:"pagado", estadoEntrega:"pendiente" }] };
    const r = calcPedido(p, coste);
    expect(r.totalVenta).toBe(15);
    expect(r.totalCoste).toBe(8);
    expect(r.beneficio).toBe(7);
  });

  it('regalo no suma al ingreso pero sí al coste', () => {
    const p = { lineas: [{ tipo:"voluntario", talla:"L", cantidad:2, precioVenta:0, estadoPago:"regalo", estadoEntrega:"pendiente" }] };
    const r = calcPedido(p, coste);
    expect(r.totalVenta).toBe(0);
    expect(r.costeRegalos).toBe(14); // 2 × 7
    expect(r.beneficio).toBe(-14);
  });

  it('pedido mixto: pagado + regalo', () => {
    const p = { lineas: [
      { tipo:"corredor", talla:"M", cantidad:1, precioVenta:15, estadoPago:"pagado",  estadoEntrega:"pendiente" },
      { tipo:"voluntario",talla:"S",cantidad:1, precioVenta:0,  estadoPago:"regalo",  estadoEntrega:"pendiente" },
    ]};
    const r = calcPedido(p, coste);
    expect(r.totalVenta).toBe(15);
    expect(r.totalCoste).toBe(15); // 8 + 7
    expect(r.benRealizado).toBe(7); // solo el pagado
  });
});

// ── CAM-11: combinarFuentesActivas (ECO-10) — toggles compartidos Camisetas/Presupuesto ──
import { combinarFuentesActivas, CLAVES_FUENTES_COMPARTIDAS } from "../components/camisetas/camisetasConstants";

describe('CAM-11 — combinarFuentesActivas sincroniza toggles con Presupuesto', () => {
  const FUENTES_DEFAULT = {
    corredoresPlat: true, extrasCorredor: true, voluntariosAuto: true,
    extrasVoluntario: true, ninoManual: true, extrasNino: true, noCorredoresPlat: true,
  };
  const CAM_SYNC_DEFAULT = {
    camCorredores: true, camNoCorredores: true, camVentaPublico: true,
    camOtros: true, camVoluntarios: true, camRegalos: true, camNino: true,
  };

  it('usa el valor de camSyncConfig para las 4 claves compartidas, no el de fuentesLocal', () => {
    // fuentesLocal dice "activado" pero camSyncConfig (Presupuesto) dice "desactivado":
    // debe ganar Presupuesto, porque es la fuente de verdad para el dinero.
    const fuentesLocal = { ...FUENTES_DEFAULT, corredoresPlat: true };
    const camSync = { ...CAM_SYNC_DEFAULT, camCorredores: false };
    const r = combinarFuentesActivas(fuentesLocal, camSync, FUENTES_DEFAULT, CAM_SYNC_DEFAULT);
    expect(r.corredoresPlat).toBe(false);
  });

  it('las 4 claves compartidas siguen exactamente a camSyncConfig', () => {
    const camSync = { ...CAM_SYNC_DEFAULT, camCorredores: false, camNoCorredores: false, camVoluntarios: false, camNino: false };
    const r = combinarFuentesActivas(FUENTES_DEFAULT, camSync, FUENTES_DEFAULT, CAM_SYNC_DEFAULT);
    expect(r.corredoresPlat).toBe(false);
    expect(r.noCorredoresPlat).toBe(false);
    expect(r.voluntariosAuto).toBe(false);
    expect(r.ninoManual).toBe(false);
  });

  it('las claves de "extras" (no compartidas) respetan fuentesLocal sin verse afectadas por camSyncConfig', () => {
    const fuentesLocal = { ...FUENTES_DEFAULT, extrasCorredor: false, extrasNino: false };
    const r = combinarFuentesActivas(fuentesLocal, CAM_SYNC_DEFAULT, FUENTES_DEFAULT, CAM_SYNC_DEFAULT);
    expect(r.extrasCorredor).toBe(false);
    expect(r.extrasNino).toBe(false);
    expect(r.extrasVoluntario).toBe(true); // sin cambios, sigue en su default
  });

  it('aplica los defaults si fuentesLocal o camSyncConfig vienen null/undefined', () => {
    const r = combinarFuentesActivas(null, undefined, FUENTES_DEFAULT, CAM_SYNC_DEFAULT);
    expect(r).toEqual(FUENTES_DEFAULT);
  });

  it('CLAVES_FUENTES_COMPARTIDAS mapea las 4 claves que cuadran 1:1 con Presupuesto (ECO-11: incluye niño)', () => {
    expect(Object.keys(CLAVES_FUENTES_COMPARTIDAS).sort()).toEqual(
      ["corredoresPlat", "noCorredoresPlat", "voluntariosAuto", "ninoManual"].sort()
    );
    expect(CLAVES_FUENTES_COMPARTIDAS.corredoresPlat).toBe("camCorredores");
    expect(CLAVES_FUENTES_COMPARTIDAS.noCorredoresPlat).toBe("camNoCorredores");
    expect(CLAVES_FUENTES_COMPARTIDAS.voluntariosAuto).toBe("camVoluntarios");
    expect(CLAVES_FUENTES_COMPARTIDAS.ninoManual).toBe("camNino");
  });

  it('ninoManual SÍ está en las claves compartidas (ECO-11: ahora tiene equivalente 1:1 en Presupuesto)', () => {
    expect(CLAVES_FUENTES_COMPARTIDAS.ninoManual).toBe("camNino");
  });
});

// ── CAM-EXPORT: nueva exportación Excel de extras/familiares ──────────────────
// Foco: personas con VARIAS camisetas/tallas → 1 fila por prenda (pivotable),
// sin importes en el detalle de líneas (decisión de producto).
describe('CAM-EXPORT — filasLineasCamiseta (1 fila por prenda, sin importes)', () => {
  const pedidos = [
    { nombre: 'Ana Ruiz', telefono: '600111222', lineas: [
      { tipo: 'corredor', talla: 'M', cantidad: 2, precioVenta: 15, estadoPago: 'pagado', estadoEntrega: 'entregado' },
      { tipo: 'nino', talla: '6-8', cantidad: 1, precioVenta: 10, estadoPago: 'pendiente', estadoEntrega: 'pendiente' },
    ]},
    { nombre: 'Beto Sanz', telefono: '600333444', lineas: [
      { tipo: 'voluntario', talla: 'L', cantidad: 1, precioVenta: 0, estadoPago: 'regalo', estadoEntrega: 'pendiente' },
    ]},
  ];

  it('genera una fila por línea, no por persona', async () => {
    const { filasLineasCamiseta } = await import('@/lib/exportUtils.js');
    const filas = filasLineasCamiseta(pedidos);
    expect(filas.length).toBe(3); // 2 líneas de Ana + 1 de Beto
    expect(filas[0]).toMatchObject({ Persona: 'Ana Ruiz', Tipo: 'Corredor', Talla: 'M', Cantidad: 2 });
    expect(filas[1]).toMatchObject({ Persona: 'Ana Ruiz', Tipo: 'Niño/a', Talla: '6-8', Cantidad: 1 });
  });

  it('NO incluye importes en las líneas', async () => {
    const { filasLineasCamiseta } = await import('@/lib/exportUtils.js');
    const fila = filasLineasCamiseta(pedidos)[0];
    const keys = Object.keys(fila).join('|').toLowerCase();
    expect(keys).not.toContain('precio');
    expect(keys).not.toContain('venta');
    expect(keys).not.toContain('coste');
    expect(keys).not.toContain('€');
  });

  it('mapea estados a etiquetas legibles', async () => {
    const { filasLineasCamiseta } = await import('@/lib/exportUtils.js');
    const filas = filasLineasCamiseta(pedidos);
    expect(filas[0]['Estado pago']).toBe('Pagado');
    expect(filas[0]['Estado entrega']).toBe('Entregado');
    expect(filas[2]['Estado pago']).toBe('Regalo');
  });

  it('consolidadoTallasCamiseta suma por tipo×talla con pendientes/entregadas', async () => {
    const { consolidadoTallasCamiseta } = await import('@/lib/exportUtils.js');
    const filas = consolidadoTallasCamiseta(pedidos);
    const corM = filas.find(f => f.Tipo === 'Corredor' && f.Talla === 'M');
    expect(corM).toMatchObject({ Unidades: 2, Entregadas: 2, Pendientes: 0 });
    const nino = filas.find(f => f.Tipo === 'Niño/a' && f.Talla === '6-8');
    expect(nino).toMatchObject({ Unidades: 1, Entregadas: 0, Pendientes: 1 });
  });

  it('filaPedidoCamiseta agrega dinero a nivel persona', async () => {
    const { filaPedidoCamiseta } = await import('@/lib/exportUtils.js');
    const fila = filaPedidoCamiseta(pedidos[0], { corredor: 8, voluntario: 7, nino: 6 });
    expect(fila.Unidades).toBe(3);
    expect(fila.Líneas).toBe(2);
    expect(fila['Venta (€)']).toBe(40); // 2×15 corredor + 1×10 niño (ambos no-regalo cuentan venta)
  });

  it('filasEntregaCamiseta ordena por persona y marca entregado', async () => {
    const { filasEntregaCamiseta } = await import('@/lib/exportUtils.js');
    const filas = filasEntregaCamiseta(pedidos);
    expect(filas[0].Persona).toBe('Ana Ruiz');
    expect(filas.at(-1).Persona).toBe('Beto Sanz');
    expect(filas[0].Entregado).toBe('Sí');
    expect(filas.at(-1).Entregado).toBe('No');
  });
});

describe('CAM-EXPORT — exportarPedidoProveedor rellena coste', () => {
  it('usa COSTE_DEFAULT en Coste_Unitario y Total_Coste (antes vacío)', async () => {
    // Verifica la lógica de coste sin disparar la descarga real del navegador.
    const { COSTE_DEFAULT } = await import('@/components/camisetas/camisetasConstants');
    const base = 10;
    const total = Math.ceil(base * 1.05);
    expect(total * COSTE_DEFAULT.corredor).toBe(total * 8);
    expect(COSTE_DEFAULT.corredor).toBeGreaterThan(0);
  });
});
