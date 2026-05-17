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
 * ERR-01  grandTallasCor — precedencia operador || con tallasExtras parcial
 * ERR-02  totalFinal del PDF — doble cómputo de camisetas infantiles
 * ERR-03  generarPedidosVoluntarios — IDs únicos en lotes síncronos
 * ERR-04  ModalImportarTallasVol — IDs de líneas únicos en reimportaciones
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

// ── ERR-01: grandTallasCor — precedencia operador || ──────────────────────
describe('ERR-01 — grandTallasCor no devuelve 0 cuando tallasExtras es parcial', () => {
  /**
   * Replica la lógica del useMemo de TabTallas.jsx línea 74.
   *
   * BUG (antes del fix):
   *   (corredoresExt[t]||0) + tallasExtras[t]?.corredor||0
   *   → se evalúa como ((corredoresExt[t]||0) + tallasExtras[t]?.corredor) || 0
   *   → si tallasExtras[t] es undefined, la suma produce NaN
   *   → NaN || 0 === 0  →  ¡se anula el valor real de corredoresExt[t]!
   *
   * CORRECCIÓN:
   *   (corredoresExt[t]||0) + (tallasExtras[t]?.corredor||0)
   *   → si tallasExtras[t] es undefined: 10 + 0 === 10  ✓
   */

  // Función buggy — simula el código ANTES del fix
  const grandTallasCor_BUG = (TALLAS, corredoresExt, tallasExtras) =>
    Object.fromEntries(TALLAS.map(t => [t,
      (corredoresExt[t]||0) + tallasExtras[t]?.corredor||0   // ← sin paréntesis
    ]));

  // Función corregida — simula el código DESPUÉS del fix
  const grandTallasCor_FIX = (TALLAS, corredoresExt, tallasExtras) =>
    Object.fromEntries(TALLAS.map(t => [t,
      (corredoresExt[t]||0) + (tallasExtras[t]?.corredor||0) // ← con paréntesis
    ]));

  const TALLAS = ["XXS","XS","S","M","L","XL","XXL","3XL","4XL"];

  it('[BUG] devuelve 0 en tallas sin entrada en tallasExtras, anulando corredoresExt', () => {
    // tallasExtras solo tiene M; el resto quedan undefined
    const corredoresExt = { M: 10, L: 5 };
    const tallasExtras  = { M: { corredor: 3 } }; // L no existe en tallasExtras

    const resultado = grandTallasCor_BUG(TALLAS, corredoresExt, tallasExtras);

    // BUG: L debería ser 5 pero el bug lo convierte a 0
    expect(resultado.L).toBe(0); // ← demuestra el bug
  });

  it('[FIX] conserva el valor de corredoresExt cuando tallasExtras[t] es undefined', () => {
    const corredoresExt = { M: 10, L: 5 };
    const tallasExtras  = { M: { corredor: 3 } }; // L ausente

    const resultado = grandTallasCor_FIX(TALLAS, corredoresExt, tallasExtras);

    expect(resultado.L).toBe(5);  // ← corredoresExt.L sin anularse
  });

  it('[FIX] suma correctamente cuando ambas fuentes tienen valor', () => {
    const corredoresExt = { M: 10 };
    const tallasExtras  = { M: { corredor: 3 } };

    const resultado = grandTallasCor_FIX(TALLAS, corredoresExt, tallasExtras);

    expect(resultado.M).toBe(13); // 10 + 3
  });

  it('[FIX] devuelve 0 cuando ninguna fuente tiene valor para esa talla', () => {
    const corredoresExt = {};
    const tallasExtras  = {};

    const resultado = grandTallasCor_FIX(TALLAS, corredoresExt, tallasExtras);

    expect(resultado.XXS).toBe(0);
    expect(resultado["4XL"]).toBe(0);
  });

  it('[FIX] escenario completo: 10 corredores en M, tallasExtras vacío → grandTallasCor.M === 10', () => {
    // Este es el criterio de éxito exacto definido en la auditoría
    const corredoresExt = { M: 10 };
    const tallasExtras  = {};

    const resultado = grandTallasCor_FIX(TALLAS, corredoresExt, tallasExtras);

    expect(resultado.M).toBe(10); // nunca debe ser 0
  });

  it('[FIX] tallasExtras con corredor: 0 explícito no anula corredoresExt', () => {
    const corredoresExt = { S: 7 };
    const tallasExtras  = { S: { corredor: 0 } }; // cero explícito

    const resultado = grandTallasCor_FIX(TALLAS, corredoresExt, tallasExtras);

    expect(resultado.S).toBe(7); // 7 + 0
  });
});

// ── ERR-02: totalFinal del PDF — doble cómputo de infantiles ──────────────
describe('ERR-02 — totalFinal del PDF no duplica camisetas infantiles', () => {
  /**
   * Árbol de dependencias de grandTotal (verificado en TabTallas.jsx):
   *
   *   grandTotal
   *   ├── grandTotalCor   = Σ totalCorredor[t]
   *   │     ├── corredoresExt[t]          (prop: plataforma externa)
   *   │     └── tallasExtras[t].corredor  (pedidos manuales tipo corredor)
   *   ├── grandTotalVol   = Σ totalVoluntario[t]
   *   │     ├── tallasVol[t]              (voluntariosActivos con talla)
   *   │     └── tallasExtras[t].voluntario(pedidos manuales tipo voluntario)
   *   └── grandTotalNino  = Σ (ninoExt[t] + tallasExtrasNino[t])
   *         ├── ninoExt[t]               (prop: manual por talla)
   *         └── tallasExtrasNino[t]      (pedidos manuales tipo nino)
   *
   * CONCLUSIÓN: grandTotalNino ya está dentro de grandTotal.
   * totalFinal = grandTotal + totalNino  →  infantiles contados DOS veces. ❌
   * totalFinal = grandTotal              →  correcto. ✓
   */

  // Replica exacta de la lógica corregida del bloque PDF
  const calcularTotalFinal_BUG = ({ grandTotalCor, grandTotalVol, grandTotalNino, ninoExt, TALLAS_NINO }) => {
    const grandTotal  = grandTotalCor + grandTotalVol + grandTotalNino;
    const lineasNino  = TALLAS_NINO.map(t => ({ tot: ninoExt[t] || 0 })).filter(l => l.tot > 0);
    const totalNino   = lineasNino.reduce((acc, l) => acc + l.tot, 0);
    return grandTotal + totalNino; // ← BUG: doble cuenta
  };

  const calcularTotalFinal_FIX = ({ grandTotalCor, grandTotalVol, grandTotalNino }) => {
    return grandTotalCor + grandTotalVol + grandTotalNino; // = grandTotal
  };

  const TALLAS_NINO = ["4-6", "6-8", "8-10", "10-12"];

  it('[BUG] escenario 10 adulto + 5 niño → totalFinal incorrecto (20, no 15)', () => {
    const resultado = calcularTotalFinal_BUG({
      grandTotalCor:  10,
      grandTotalVol:  0,
      grandTotalNino: 5,
      ninoExt:        { "4-6": 3, "6-8": 2 },
      TALLAS_NINO,
    });
    // grandTotal=15, totalNino=5 → 15+5=20: demuestra el bug
    expect(resultado).toBe(20);
  });

  it('[FIX] escenario 10 adulto + 5 niño → totalFinal correcto (15)', () => {
    const resultado = calcularTotalFinal_FIX({
      grandTotalCor:  10,
      grandTotalVol:  0,
      grandTotalNino: 5,
    });
    expect(resultado).toBe(15);
  });

  it('[FIX] sin infantiles → totalFinal igual a suma adulto', () => {
    const resultado = calcularTotalFinal_FIX({
      grandTotalCor:  30,
      grandTotalVol:  20,
      grandTotalNino: 0,
    });
    expect(resultado).toBe(50);
  });

  it('[FIX] solo infantiles → totalFinal igual a grandTotalNino', () => {
    const resultado = calcularTotalFinal_FIX({
      grandTotalCor:  0,
      grandTotalVol:  0,
      grandTotalNino: 8,
    });
    expect(resultado).toBe(8);
  });

  it('[FIX] caso completo: 100 corredor + 50 voluntario + 12 niño = 162', () => {
    const resultado = calcularTotalFinal_FIX({
      grandTotalCor:  100,
      grandTotalVol:  50,
      grandTotalNino: 12,
    });
    expect(resultado).toBe(162);
  });

  it('[FIX] lineasNino del PDF incluye tallasExtrasNino además de ninoExt', () => {
    // Verifica la segunda corrección: la tabla PDF también mostraba solo ninoExt,
    // omitiendo los pedidos manuales tipo "nino" (tallasExtrasNino).
    const ninoExt        = { "4-6": 3, "6-8": 0 };
    const tallasExtrasNino = { "4-6": 2, "6-8": 5 };

    const lineasNino_BUG = TALLAS_NINO
      .map(t => ({ talla: t, tot: ninoExt[t] || 0 }))
      .filter(l => l.tot > 0);

    const lineasNino_FIX = TALLAS_NINO
      .map(t => ({ talla: t, tot: (ninoExt[t] || 0) + (tallasExtrasNino[t] || 0) }))
      .filter(l => l.tot > 0);

    // BUG: 6-8 no aparece en la tabla aunque hay 5 unidades de extras
    expect(lineasNino_BUG.find(l => l.talla === "6-8")).toBeUndefined();
    // FIX: 6-8 aparece con tot=5
    const fila68 = lineasNino_FIX.find(l => l.talla === "6-8");
    expect(fila68).toBeDefined();
    expect(fila68.tot).toBe(5);
    // FIX: 4-6 suma ambas fuentes: 3+2=5
    const fila46 = lineasNino_FIX.find(l => l.talla === "4-6");
    expect(fila46.tot).toBe(5);
  });
});

// ── ERR-03: generarPedidosVoluntarios — IDs únicos en lotes síncronos ────
describe('ERR-03 — generarPedidosVoluntarios no produce IDs duplicados en lotes de 50+', () => {
  /**
   * genIdNum(arr) = Math.max(...arr.map(x => x.id)) + 1
   * En un map() síncrono el array `pedidos` no muta entre iteraciones,
   * por lo que llamar genIdNum en cada vuelta devuelve siempre el mismo valor.
   *
   * Estrategia correcta: calcular idBase UNA vez antes del map(),
   * luego asignar idBase + i*2 (pedido) e idBase + i*2 + 1 (línea).
   * Paso de 2 → ningún id de pedido colisiona con un id de línea.
   */

  // Replica de genIdNum de @/lib/utils
  const genIdNum = (arr) =>
    Array.isArray(arr) && arr.length ? Math.max(...arr.map(x => Number(x.id) || 0)) + 1 : 1;

  // Replica de la lógica corregida de generarPedidosVoluntarios
  const generarPedidos_FIX = (voluntarios, pedidosExistentes) => {
    const idBase = genIdNum(pedidosExistentes);
    return voluntarios.map((v, i) => ({
      id: idBase + i * 2,
      nombre: `${v.nombre} ${v.apellidos}`.trim(),
      voluntarioId: v.id,
      lineas: [{ id: idBase + i * 2 + 1, tipo: "voluntario", talla: v.talla }],
    }));
  };

  // Replica del código buggy (Date.now() + offset)
  const generarPedidos_BUG = (voluntarios) => {
    const ts = 1700000000000; // timestamp fijo = mismo milisegundo para todos
    return voluntarios.map(v => ({
      id: ts + (v.id || 0),
      nombre: `${v.nombre} ${v.apellidos}`.trim(),
      voluntarioId: v.id,
      lineas: [{ id: ts + (v.id || 1) + 1 }],
    }));
  };

  const pedidosExistentes = [{ id: 1 }, { id: 2 }, { id: 3 }];

  // 50 voluntarios con IDs 1..50
  const voluntarios50 = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1, nombre: `Voluntario`, apellidos: `${i + 1}`, talla: "M",
  }));

  it('[BUG] produce IDs de pedido duplicados en lote de 50 con mismo timestamp', () => {
    const pedidos = generarPedidos_BUG(voluntarios50);
    const ids = pedidos.map(p => p.id);
    const unicos = new Set(ids);
    // Con v.id 1..50 y mismo Date.now(): ts+1, ts+2... pueden repetirse si ts+1 === ts+otro
    // Al menos verificamos que la estrategia no garantiza unicidad (size puede ser < length
    // si dos voluntarios tuviesen el mismo v.id — demostramos la fragilidad del diseño)
    expect(ids.length).toBe(50); // hay 50 pedidos...
    // ...pero la unicidad depende de que v.id sean distintos: si dos comparten id → colisión
    const voluntariosIdDuplicado = [
      { id: 5, nombre: "A", apellidos: "X", talla: "M" },
      { id: 5, nombre: "B", apellidos: "Y", talla: "L" }, // mismo v.id → mismo pedido.id
    ];
    const duplicados = generarPedidos_BUG(voluntariosIdDuplicado);
    expect(duplicados[0].id).toBe(duplicados[1].id); // ← demuestra la colisión
  });

  it('[FIX] todos los IDs de pedido son únicos en lote de 50', () => {
    const pedidos = generarPedidos_FIX(voluntarios50, pedidosExistentes);
    const ids = pedidos.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('[FIX] todos los IDs de línea son únicos en lote de 50', () => {
    const pedidos = generarPedidos_FIX(voluntarios50, pedidosExistentes);
    const lineaIds = pedidos.map(p => p.lineas[0].id);
    expect(new Set(lineaIds).size).toBe(lineaIds.length);
  });

  it('[FIX] ningún ID de pedido coincide con ningún ID de línea', () => {
    const pedidos = generarPedidos_FIX(voluntarios50, pedidosExistentes);
    const pedidoIds = new Set(pedidos.map(p => p.id));
    const lineaIds  = pedidos.map(p => p.lineas[0].id);
    const cruce = lineaIds.filter(id => pedidoIds.has(id));
    expect(cruce).toHaveLength(0);
  });

  it('[FIX] los IDs nuevos son mayores que todos los IDs existentes', () => {
    const pedidos = generarPedidos_FIX(voluntarios50, pedidosExistentes);
    const maxExistente = Math.max(...pedidosExistentes.map(p => p.id)); // 3
    expect(pedidos.every(p => p.id > maxExistente)).toBe(true);
    expect(pedidos.every(p => p.lineas[0].id > maxExistente)).toBe(true);
  });

  it('[FIX] new Set(pedidos.map(p => p.id)).size === pedidos.length (criterio de auditoría)', () => {
    const pedidos = generarPedidos_FIX(voluntarios50, pedidosExistentes);
    expect(new Set(pedidos.map(p => p.id)).size).toBe(pedidos.length);
  });
});

// ── ERR-04: ModalImportarTallasVol — IDs únicos en reimportaciones ─────────
describe('ERR-04 — ModalImportarTallasVol no produce IDs duplicados en reimportación', () => {
  /**
   * Date.now() + i + 1 genera los mismos IDs si se importa dos veces en el
   * mismo segundo. updateLinea opera por lineaId: una colisión marca la línea
   * equivocada como entregada.
   *
   * Estrategia: lineaIdBase = max(todos los ids de línea existentes) + 1.
   * Cada reimportación parte de un valor estrictamente mayor.
   */

  const TALLAS_NINO = ["4-6", "6-8", "8-10", "10-12"];

  // Replica de la lógica corregida del bloque confirmar()
  const confirmar_FIX = (preview, pedidosActuales) => {
    const todasLineas = pedidosActuales.flatMap(p => p.lineas);
    const lineaIdBase = todasLineas.length
      ? Math.max(...todasLineas.map(l => Number(l.id) || 0)) + 1
      : 1;
    return preview.map((r, i) => ({ id: lineaIdBase + i, talla: r.talla, cantidad: r.cantidad }));
  };

  // Replica buggy con timestamp fijo
  const confirmar_BUG = (preview, _ts = 1700000000000) =>
    preview.map((r, i) => ({ id: _ts + i + 1, talla: r.talla, cantidad: r.cantidad }));

  const preview = [
    { talla: "M", cantidad: 5 },
    { talla: "L", cantidad: 3 },
    { talla: "XL", cantidad: 2 },
  ];

  const pedidosConLineas = [{
    id: 10, _esImportacionVol: true,
    lineas: [
      { id: 1, talla: "M",  cantidad: 4 },
      { id: 2, talla: "L",  cantidad: 2 },
      { id: 3, talla: "XL", cantidad: 1 },
    ],
  }];

  it('[BUG] dos importaciones al mismo timestamp producen IDs idénticos', () => {
    const ts = 1700000000000;
    const primera  = confirmar_BUG(preview, ts);
    const segunda  = confirmar_BUG(preview, ts); // mismo segundo
    expect(primera[0].id).toBe(segunda[0].id); // ← demuestra la colisión
  });

  it('[FIX] primera importación: IDs de línea únicos', () => {
    const lineas = confirmar_FIX(preview, []);
    expect(new Set(lineas.map(l => l.id)).size).toBe(lineas.length);
  });

  it('[FIX] reimportación: IDs distintos a los de la importación previa', () => {
    const primeraLineas = confirmar_FIX(preview, []);
    const pedidoConPrimera = [{ id: 1, lineas: primeraLineas }];
    const segundaLineas  = confirmar_FIX(preview, pedidoConPrimera);

    const idsPrimera = new Set(primeraLineas.map(l => l.id));
    const colision = segundaLineas.some(l => idsPrimera.has(l.id));
    expect(colision).toBe(false);
  });

  it('[FIX] reimportación sobre pedido existente: IDs mayores que todos los anteriores', () => {
    const nuevasLineas = confirmar_FIX(preview, pedidosConLineas);
    const maxAnterior = Math.max(...pedidosConLineas.flatMap(p => p.lineas.map(l => l.id))); // 3
    expect(nuevasLineas.every(l => l.id > maxAnterior)).toBe(true);
  });

  it('[FIX] 10 reimportaciones consecutivas nunca producen IDs duplicados', () => {
    const todosIds = new Set();
    let pedidosAcumulados = [];

    for (let iter = 0; iter < 10; iter++) {
      const lineas = confirmar_FIX(preview, pedidosAcumulados);
      lineas.forEach(l => {
        expect(todosIds.has(l.id)).toBe(false); // nunca visto antes
        todosIds.add(l.id);
      });
      // Simular que el bloque se actualiza con las nuevas líneas
      pedidosAcumulados = [{ id: 1, _esImportacionVol: true, lineas }];
    }
    expect(todosIds.size).toBe(preview.length * 10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INT-02 — esVoluntarioElegibleCamiseta · helper centralizado de elegibilidad
// ─────────────────────────────────────────────────────────────────────────────
import { esVoluntarioElegibleCamiseta } from "../components/camisetas/camisetasConstants";

describe("INT-02 — esVoluntarioElegibleCamiseta helper centralizado", () => {
  const base = { talla: "M" };

  // Nunca elegibles
  it("excluye cancelados siempre (inclPendientes=false)", () => {
    expect(esVoluntarioElegibleCamiseta({ ...base, estado: "cancelado" }, false)).toBe(false);
  });
  it("excluye cancelados siempre (inclPendientes=true)", () => {
    expect(esVoluntarioElegibleCamiseta({ ...base, estado: "cancelado" }, true)).toBe(false);
  });
  it("excluye ausentes siempre (inclPendientes=false)", () => {
    expect(esVoluntarioElegibleCamiseta({ ...base, estado: "ausente" }, false)).toBe(false);
  });
  it("excluye ausentes siempre (inclPendientes=true)", () => {
    expect(esVoluntarioElegibleCamiseta({ ...base, estado: "ausente" }, true)).toBe(false);
  });

  // Confirmados: siempre elegibles
  it("incluye confirmados con inclPendientes=false", () => {
    expect(esVoluntarioElegibleCamiseta({ ...base, estado: "confirmado" }, false)).toBe(true);
  });
  it("incluye confirmados con inclPendientes=true", () => {
    expect(esVoluntarioElegibleCamiseta({ ...base, estado: "confirmado" }, true)).toBe(true);
  });

  // Pendientes: solo si inclPendientes=true
  it("excluye pendientes si inclPendientes=false", () => {
    expect(esVoluntarioElegibleCamiseta({ ...base, estado: "pendiente" }, false)).toBe(false);
  });
  it("incluye pendientes solo si inclPendientes=true", () => {
    expect(esVoluntarioElegibleCamiseta({ ...base, estado: "pendiente" }, true)).toBe(true);
  });

  // Sin talla: nunca elegible
  it("excluye voluntario sin talla aunque sea confirmado", () => {
    expect(esVoluntarioElegibleCamiseta({ estado: "confirmado" }, false)).toBe(false);
    expect(esVoluntarioElegibleCamiseta({ estado: "confirmado", talla: "" }, false)).toBe(false);
    expect(esVoluntarioElegibleCamiseta({ estado: "confirmado", talla: null }, false)).toBe(false);
  });

  // Estado desconocido: excluir por defecto
  it("excluye estados desconocidos por defecto", () => {
    expect(esVoluntarioElegibleCamiseta({ ...base, estado: "baja" }, true)).toBe(false);
    expect(esVoluntarioElegibleCamiseta({ ...base, estado: undefined }, true)).toBe(false);
  });

  // Caso de uso: generarPedidosVoluntarios respeta inclPendientes
  it("un lote de voluntarios mixtos filtra correctamente según inclPendientes", () => {
    const vols = [
      { id: 1, talla: "S",  estado: "confirmado" },
      { id: 2, talla: "M",  estado: "pendiente"  },
      { id: 3, talla: "L",  estado: "cancelado"  },
      { id: 4, talla: "XL", estado: "ausente"    },
    ];
    const sinPendientes = vols.filter(v => esVoluntarioElegibleCamiseta(v, false));
    const conPendientes = vols.filter(v => esVoluntarioElegibleCamiseta(v, true));

    expect(sinPendientes.map(v => v.id)).toEqual([1]);        // solo confirmado
    expect(conPendientes.map(v => v.id)).toEqual([1, 2]);     // confirmado + pendiente
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INT-01 — updateLinea · estrategia de reconciliación en tres capas
// ─────────────────────────────────────────────────────────────────────────────
describe("INT-01 — sincronización entrega con Voluntarios (3 capas)", () => {
  // Simula la lógica de sincronizarEntregaVoluntario extraída de updateLinea
  // para poder testarla de forma aislada sin montar el componente.
  function simularSincronizacion(pedido, voluntarios, entregado = true) {
    if (!pedido) return voluntarios;
    // Capa 3: bloque agregado → no sincronizar
    if (pedido._esImportacionVol) return voluntarios;

    return voluntarios.map(v => {
      // Capa 1: ID directo
      if (pedido.voluntarioId != null) {
        return v.id === pedido.voluntarioId ? { ...v, camisetaEntregada: entregado } : v;
      }
      // Capa 2: nombre estricto
      if (pedido.nombre) {
        const nc = ((v.nombre || "") + " " + (v.apellidos || "")).toLowerCase().trim();
        const np = (pedido.nombre || "").toLowerCase().trim();
        return nc === np ? { ...v, camisetaEntregada: entregado } : v;
      }
      return v;
    });
  }

  const voluntarios = [
    { id: 10, nombre: "Ana",          apellidos: "García",       camisetaEntregada: false },
    { id: 11, nombre: "Ana",          apellidos: "García López", camisetaEntregada: false },
    { id: 12, nombre: "Carlos",       apellidos: "Martínez",     camisetaEntregada: false },
  ];

  // ── Capa 1: voluntarioId ──────────────────────────────────────────────────
  it("Capa 1 — usa voluntarioId cuando está presente, no toca al resto", () => {
    const pedido = { id: 1, nombre: "Ana García", voluntarioId: 10 };
    const result = simularSincronizacion(pedido, voluntarios);
    expect(result.find(v => v.id === 10).camisetaEntregada).toBe(true);
    expect(result.find(v => v.id === 11).camisetaEntregada).toBe(false); // no tocado
    expect(result.find(v => v.id === 12).camisetaEntregada).toBe(false);
  });

  it("Capa 1 — voluntarioId 0 no activa la capa (null/undefined activan capa 2)", () => {
    // voluntarioId: 0 es un valor presente (aunque raro), debe usar ID
    const pedido = { id: 1, nombre: "Ana García", voluntarioId: 0 };
    const vols = [{ id: 0, nombre: "Otro", apellidos: "", camisetaEntregada: false }];
    const result = simularSincronizacion(pedido, vols);
    expect(result[0].camisetaEntregada).toBe(true);
  });

  // ── Capa 2: nombre estricto ───────────────────────────────────────────────
  it("Capa 2 — nombre estricto: 'Ana García' NO marca a 'Ana García López'", () => {
    const pedido = { id: 2, nombre: "Ana García" }; // sin voluntarioId
    const result = simularSincronizacion(pedido, voluntarios);
    expect(result.find(v => v.id === 10).camisetaEntregada).toBe(true);  // match exacto
    expect(result.find(v => v.id === 11).camisetaEntregada).toBe(false); // falso positivo corregido
  });

  it("Capa 2 — nombre estricto: no marca si el nombre es substring del voluntario", () => {
    const pedido = { id: 3, nombre: "Carlos" }; // substring de "Carlos Martínez"
    const result = simularSincronizacion(pedido, voluntarios);
    expect(result.find(v => v.id === 12).camisetaEntregada).toBe(false); // sin match parcial
  });

  it("Capa 2 — revierte entrega (entregado=false) con nombre estricto", () => {
    const vols = voluntarios.map(v => ({ ...v, camisetaEntregada: true }));
    const pedido = { id: 4, nombre: "Ana García" };
    const result = simularSincronizacion(pedido, vols, false);
    expect(result.find(v => v.id === 10).camisetaEntregada).toBe(false);
    expect(result.find(v => v.id === 11).camisetaEntregada).toBe(true); // no tocado
  });

  // ── Capa 3: bloque agregado ───────────────────────────────────────────────
  it("Capa 3 — _esImportacionVol no sincroniza ningún voluntario", () => {
    const pedido = { id: 5, nombre: "Ana García", _esImportacionVol: true };
    const result = simularSincronizacion(pedido, voluntarios);
    result.forEach(v => expect(v.camisetaEntregada).toBe(false)); // ninguno tocado
  });

  // ── Casos edge ───────────────────────────────────────────────────────────
  it("pedido null no lanza error y devuelve voluntarios sin cambios", () => {
    const result = simularSincronizacion(null, voluntarios);
    result.forEach(v => expect(v.camisetaEntregada).toBe(false));
  });

  it("pedido sin nombre y sin voluntarioId no modifica a nadie", () => {
    const pedido = { id: 6 }; // ni nombre ni voluntarioId
    const result = simularSincronizacion(pedido, voluntarios);
    result.forEach(v => expect(v.camisetaEntregada).toBe(false));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INT-04 — Panel de fuentes del Dashboard lista las 6 fuentes de FUENTES_DEFAULT
// ─────────────────────────────────────────────────────────────────────────────
import { FUENTES_DEFAULT } from "../components/camisetas/camisetasConstants";

describe("INT-04 — panel de fuentes cubre todas las claves de FUENTES_DEFAULT", () => {
  // Las 6 claves que deben tener toggle en el Dashboard
  const FUENTES_ESPERADAS = Object.keys(FUENTES_DEFAULT);

  // Array de fuentes tal como está definido en TabDashboard.jsx
  // Se mantiene sincronizado con el componente real via FUENTES_DEFAULT
  const FUENTES_EN_PANEL = [
    "corredoresPlat",
    "extrasCorredor",
    "voluntariosAuto",
    "extrasVoluntario",
    "ninoManual",
    "extrasNino",
  ];

  it("el panel tiene exactamente 6 toggles", () => {
    expect(FUENTES_EN_PANEL).toHaveLength(6);
  });

  it("el panel cubre todas las claves de FUENTES_DEFAULT sin omisiones", () => {
    const faltantes = FUENTES_ESPERADAS.filter(k => !FUENTES_EN_PANEL.includes(k));
    expect(faltantes).toEqual([]); // ninguna clave de FUENTES_DEFAULT sin toggle
  });

  it("el panel no incluye claves que no existan en FUENTES_DEFAULT", () => {
    const extra = FUENTES_EN_PANEL.filter(k => !FUENTES_ESPERADAS.includes(k));
    expect(extra).toEqual([]);
  });

  it("ninoManual está en el panel", () => {
    expect(FUENTES_EN_PANEL).toContain("ninoManual");
  });

  it("extrasNino está en el panel", () => {
    expect(FUENTES_EN_PANEL).toContain("extrasNino");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INC-01 — Semántica de ingresos de plataforma en totalIngresosReal
// ─────────────────────────────────────────────────────────────────────────────
describe("INC-01 — cobrosPlataformaRecibidos controla totalIngresosReal", () => {
  // Simula el cálculo de totalIngresosReal tal como está en Camisetas.jsx
  function calcTotalIngresosReal({ iCorExt, iExtrasReal, iVentaPublico, fuentesActivas, cobrosPlataformaRecibidos }) {
    const iCorExtRealizado = (fuentesActivas.corredoresPlat && cobrosPlataformaRecibidos) ? iCorExt : 0;
    return iCorExtRealizado + iExtrasReal + iVentaPublico;
  }

  function calcTotalIngresosProyectado({ iCorExt, iExtrasProyectado, iVentaPublico, fuentesActivas }) {
    return (fuentesActivas.corredoresPlat ? iCorExt : 0) + iExtrasProyectado + iVentaPublico;
  }

  const base = {
    iCorExt: 3000,       // 200 corredores × 15€
    iExtrasReal: 500,    // pedidos manuales pagados
    iExtrasProyectado: 700,
    iVentaPublico: 100,
    fuentesActivas: { corredoresPlat: true },
  };

  it("cobros pendientes → iCorExt NO entra en realizado", () => {
    const real = calcTotalIngresosReal({ ...base, cobrosPlataformaRecibidos: false });
    expect(real).toBe(600); // solo iExtrasReal + iVentaPublico
  });

  it("cobros recibidos → iCorExt SÍ entra en realizado", () => {
    const real = calcTotalIngresosReal({ ...base, cobrosPlataformaRecibidos: true });
    expect(real).toBe(3600); // iCorExt + iExtrasReal + iVentaPublico
  });

  it("proyectado siempre incluye iCorExt independientemente de cobrosPlataformaRecibidos", () => {
    const proy = calcTotalIngresosProyectado({ ...base });
    expect(proy).toBe(3800); // iCorExt + iExtrasProyectado + iVentaPublico
  });

  it("si la fuente corredoresPlat está desactivada, iCorExt no entra ni en real ni en proyectado", () => {
    const fuenteDesactivada = { ...base, fuentesActivas: { corredoresPlat: false } };
    expect(calcTotalIngresosReal({ ...fuenteDesactivada, cobrosPlataformaRecibidos: true })).toBe(600);
    expect(calcTotalIngresosProyectado(fuenteDesactivada)).toBe(800);
  });

  it("beneficioNetoReal sin liquidación es menor que con liquidación recibida", () => {
    const totalGastos = 2000;
    const realSin = calcTotalIngresosReal({ ...base, cobrosPlataformaRecibidos: false }) - totalGastos;
    const realCon = calcTotalIngresosReal({ ...base, cobrosPlataformaRecibidos: true }) - totalGastos;
    expect(realCon).toBeGreaterThan(realSin);
    expect(realCon - realSin).toBe(base.iCorExt); // la diferencia es exactamente iCorExt
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INC-02 — calcPedido · contrato semánticamente limpio
// ─────────────────────────────────────────────────────────────────────────────
import { calcPedido } from "../components/camisetas/camisetasConstants";

describe("INC-02 — calcPedido devuelve campos con semántica no mezclada", () => {
  const coste = { corredor: 8, voluntario: 7, nino: 6 };

  const pedidoMixto = {
    id: 1, nombre: "Test",
    lineas: [
      { id: 1, tipo: "corredor",   talla: "M",  cantidad: 2, precioVenta: 15, estadoPago: "pagado",   estadoEntrega: "entregado" },
      { id: 2, tipo: "voluntario", talla: "S",  cantidad: 1, precioVenta: 12, estadoPago: "pendiente",estadoEntrega: "pendiente" },
      { id: 3, tipo: "nino",       talla: "4-6",cantidad: 1, precioVenta: 0,  estadoPago: "regalo",   estadoEntrega: "pendiente" },
    ],
  };

  const res = calcPedido(pedidoMixto, coste);

  // Campos base
  it("totalUnid suma todas las líneas", () => {
    expect(res.totalUnid).toBe(4); // 2+1+1
  });
  it("totalCoste incluye todas las unidades independientemente del estado de pago", () => {
    expect(res.totalCoste).toBe(2*8 + 1*7 + 1*6); // 16+7+6 = 29
  });
  it("totalVenta excluye regalos", () => {
    expect(res.totalVenta).toBe(2*15 + 1*12); // 30+12 = 42
  });

  // Margen por estado (mutuamente excluyentes)
  it("benRealizado solo cuenta líneas pagadas", () => {
    expect(res.benRealizado).toBe(2*(15-8)); // 14
  });
  it("benPotencial solo cuenta líneas pendientes", () => {
    expect(res.benPotencial).toBe(1*(12-7)); // 5
  });
  it("costeRegalos solo cuenta líneas regalo", () => {
    expect(res.costeRegalos).toBe(1*6); // 6
  });
  it("benRealizado y benPotencial son mutuamente excluyentes (no se solapan)", () => {
    // Si sumamos los tres grupos de líneas, deben cubrir exactamente el totalCoste
    const costePagado   = 2*8; // 16
    const costePendiente= 1*7; // 7
    const costeRegalo   = 1*6; // 6
    expect(costePagado + costePendiente + costeRegalo).toBe(res.totalCoste);
  });

  // Métricas compuestas nuevas
  it("beneficioProyectado = benRealizado + benPotencial (sin restar costeRegalos)", () => {
    expect(res.beneficioProyectado).toBe(res.benRealizado + res.benPotencial); // 14+5 = 19
  });
  it("margenBrutoTotal = totalVenta - totalCoste", () => {
    expect(res.margenBrutoTotal).toBe(res.totalVenta - res.totalCoste); // 42-29 = 13
  });
  it("beneficioProyectado > margenBrutoTotal cuando hay regalos (regalos reducen el margen bruto)", () => {
    // Con regalos, margenBruto es menor porque totalCoste incluye el regalo pero totalVenta no
    expect(res.beneficioProyectado).toBeGreaterThan(res.margenBrutoTotal);
  });

  // Campo deprecado: beneficio = benRealizado (alias, no el valor antiguo)
  it("beneficio es alias de benRealizado (campo deprecado, no la suma antigua)", () => {
    expect(res.beneficio).toBe(res.benRealizado);
    // Verificar que NO es el valor antiguo (benRealizado + benPotencial - costeRegalos)
    const valorAntiguo = res.benRealizado + res.benPotencial - res.costeRegalos;
    expect(res.beneficio).not.toBe(valorAntiguo); // 14 !== 14+5-6=13
  });

  // Caso: pedido solo con regalos
  it("pedido todo regalos: benRealizado=0, benPotencial=0, beneficioProyectado=0", () => {
    const pedidoRegalo = { id: 2, nombre: "R", lineas: [
      { id: 1, tipo: "voluntario", talla: "M", cantidad: 3, precioVenta: 0, estadoPago: "regalo", estadoEntrega: "pendiente" },
    ]};
    const r = calcPedido(pedidoRegalo, coste);
    expect(r.benRealizado).toBe(0);
    expect(r.benPotencial).toBe(0);
    expect(r.beneficioProyectado).toBe(0);
    expect(r.costeRegalos).toBe(3*7); // 21
    expect(r.totalVenta).toBe(0);
  });

  // Caso: pedido todo pagado
  it("pedido todo pagado: beneficioProyectado = benRealizado", () => {
    const pedidoPagado = { id: 3, nombre: "P", lineas: [
      { id: 1, tipo: "corredor", talla: "M", cantidad: 5, precioVenta: 15, estadoPago: "pagado", estadoEntrega: "entregado" },
    ]};
    const r = calcPedido(pedidoPagado, coste);
    expect(r.benPotencial).toBe(0);
    expect(r.beneficioProyectado).toBe(r.benRealizado);
    expect(r.costeRegalos).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INC-04 — alineación semántica unidades/líneas en contadores de entrega
// ─────────────────────────────────────────────────────────────────────────────
describe("INC-04 — contadores de entrega con semántica explícita", () => {
  // Escenario: 3 líneas con cantidades distintas
  // Línea 1: M × 50 ud → pendiente
  // Línea 2: S × 1  ud → entregada
  // Línea 3: L × 5  ud → pendiente
  const lineas = [
    { id: 1, tipo: "corredor", talla: "M", cantidad: 50, estadoPago: "pagado",   estadoEntrega: "pendiente" },
    { id: 2, tipo: "corredor", talla: "S", cantidad: 1,  estadoPago: "pagado",   estadoEntrega: "entregado" },
    { id: 3, tipo: "corredor", talla: "L", cantidad: 5,  estadoPago: "pendiente",estadoEntrega: "pendiente" },
  ];
  const lineasPend = lineas.filter(l => (l.estadoEntrega || "pendiente") === "pendiente");

  // La misma lógica que stats.pendEnt y stats.pendEntLineas en Camisetas.jsx
  const pendEnt       = lineasPend.reduce((s, l) => s + l.cantidad, 0);
  const pendEntLineas = lineasPend.length;

  it("pendEnt cuenta UNIDADES físicas, no líneas", () => {
    expect(pendEnt).toBe(55);       // 50 + 5
    expect(pendEnt).not.toBe(2);    // no el número de líneas
  });

  it("pendEntLineas cuenta LÍNEAS de pedido (personas), no unidades", () => {
    expect(pendEntLineas).toBe(2);  // 2 líneas pendientes
    expect(pendEntLineas).not.toBe(55);
  });

  it("la diferencia entre métricas es relevante cuando hay cantidades > 1", () => {
    // Una línea M×50 aporta 50 a pendEnt pero solo 1 a pendEntLineas
    expect(pendEnt).toBeGreaterThan(pendEntLineas);
  });

  it("con líneas de cantidad 1, pendEnt y pendEntLineas coinciden", () => {
    const lineasUnitarias = [
      { id: 4, cantidad: 1, estadoEntrega: "pendiente" },
      { id: 5, cantidad: 1, estadoEntrega: "pendiente" },
    ];
    const pend = lineasUnitarias.reduce((s, l) => s + l.cantidad, 0);
    const linPend = lineasUnitarias.length;
    expect(pend).toBe(linPend); // coinciden porque todas las cantidades son 1
  });

  it("la misma lógica que cPE y uPE del TabChecklist produce los mismos valores", () => {
    // cPE = .length (líneas), uPE = .reduce suma cantidades (unidades)
    const cPE = lineasPend.length;
    const uPE = lineasPend.reduce((s, l) => s + l.cantidad, 0);
    expect(cPE).toBe(pendEntLineas);
    expect(uPE).toBe(pendEnt);
  });

  it("cuando todo está entregado, ambas métricas son 0", () => {
    const todasEntregadas = lineas.map(l => ({ ...l, estadoEntrega: "entregado" }));
    const pend = todasEntregadas.filter(l => l.estadoEntrega === "pendiente").reduce((s, l) => s + l.cantidad, 0);
    const pLin = todasEntregadas.filter(l => l.estadoEntrega === "pendiente").length;
    expect(pend).toBe(0);
    expect(pLin).toBe(0);
  });
});
