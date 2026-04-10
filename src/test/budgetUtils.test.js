import { describe, it, expect } from "vitest";
import {
  calculateTotalInscritos,
  calculateIngresosPorDistancia,
  calculatePrecioMedioDistancia,
  calculateCostesFijos,
  calculateCostesVariables,
  calculateCostesVarPorCorredor,
  calculateResultado,
  calculatePEGlobal,
  calculateMerchTotales,
  calculateIngresosDesglosados,
} from "../lib/budgetUtils";

// ─── FIXTURES ──────────────────────────────────────────────────────────────────

const tramos = [
  { id: 1, nombre: "Early Bird", fechaFin: "2025-01-01",
    precios: { TG7: 20, TG13: 30, TG25: 45 } },
  { id: 2, nombre: "General",   fechaFin: "2026-12-31",
    precios: { TG7: 25, TG13: 38, TG25: 55 } },
];

const inscritos = {
  tramos: {
    1: { TG7: 50, TG13: 40, TG25: 30 },   // tramo cerrado
    2: { TG7: 30, TG13: 20, TG25: 10 },   // tramo abierto
  }
};
// totales: TG7=80, TG13=60, TG25=40 → total=180

const totalInscritos = { TG7: 80, TG13: 60, TG25: 40, total: 180 };

const conceptosFijos = [
  {
    id: 1, tipo: "fijo", nombre: "Cronometraje", activo: true,
    costeTotal: 900,
    activoDistancias: { TG7: true, TG13: true, TG25: true },
  },
  {
    id: 2, tipo: "fijo", nombre: "Seguro RC", activo: true,
    costeTotal: 600,
    activoDistancias: { TG7: true, TG13: true, TG25: true },
  },
  {
    id: 3, tipo: "fijo", nombre: "Solo TG25", activo: true,
    costeTotal: 300,
    activoDistancias: { TG7: false, TG13: false, TG25: true },
  },
  {
    id: 4, tipo: "fijo", nombre: "Inactivo", activo: false,
    costeTotal: 1000,
    activoDistancias: { TG7: true, TG13: true, TG25: true },
  },
];

const conceptosVariables = [
  {
    id: 5, tipo: "variable", nombre: "Medallas", activo: true,
    modoUniforme: false,
    costePorDistancia: { TG7: 3, TG13: 5, TG25: 8 },
    activoDistancias: { TG7: true, TG13: true, TG25: true },
  },
  {
    id: 6, tipo: "variable", nombre: "Camiseta (solo TG7/TG13)", activo: true,
    modoUniforme: true,
    costePorDistancia: { TG7: 7, TG13: 7, TG25: 7 },
    activoDistancias: { TG7: true, TG13: true, TG25: false },
  },
  {
    id: 7, tipo: "variable", nombre: "Inactivo", activo: false,
    costePorDistancia: { TG7: 10, TG13: 10, TG25: 10 },
    activoDistancias: { TG7: true, TG13: true, TG25: true },
  },
];

const conceptosTodos = [...conceptosFijos, ...conceptosVariables];

// ─── calculateTotalInscritos ───────────────────────────────────────────────────

describe("calculateTotalInscritos", () => {
  it("suma correctamente inscritos por distancia y total", () => {
    const r = calculateTotalInscritos(tramos, inscritos);
    expect(r.TG7).toBe(80);
    expect(r.TG13).toBe(60);
    expect(r.TG25).toBe(40);
    expect(r.total).toBe(180);
  });

  it("devuelve ceros si no hay inscritos", () => {
    const r = calculateTotalInscritos(tramos, { tramos: {} });
    expect(r.TG7).toBe(0);
    expect(r.TG13).toBe(0);
    expect(r.TG25).toBe(0);
    expect(r.total).toBe(0);
  });
});

// ─── calculateIngresosPorDistancia ────────────────────────────────────────────

describe("calculateIngresosPorDistancia", () => {
  it("calcula ingresos correctamente por distancia", () => {
    const r = calculateIngresosPorDistancia(tramos, inscritos);
    // TG7: 50*20 + 30*25 = 1000 + 750 = 1750
    expect(r.TG7).toBe(1750);
    // TG13: 40*30 + 20*38 = 1200 + 760 = 1960
    expect(r.TG13).toBe(1960);
    // TG25: 30*45 + 10*55 = 1350 + 550 = 1900
    expect(r.TG25).toBe(1900);
    expect(r.total).toBe(1750 + 1960 + 1900);
  });

  it("total es suma de las tres distancias", () => {
    const r = calculateIngresosPorDistancia(tramos, inscritos);
    expect(r.total).toBe(r.TG7 + r.TG13 + r.TG25);
  });
});

// ─── calculateCostesFijos ─────────────────────────────────────────────────────

describe("calculateCostesFijos", () => {
  it("suma solo conceptos activos", () => {
    const r = calculateCostesFijos(conceptosFijos, totalInscritos);
    // Inactivo (1000€) no cuenta → total = 900 + 600 + 300 = 1800
    expect(r.total).toBe(1800);
  });

  it("ignora conceptos inactivos", () => {
    const soloInactivo = [conceptosFijos[3]]; // id=4 activo:false
    const r = calculateCostesFijos(soloInactivo, totalInscritos);
    expect(r.total).toBe(0);
  });

  it("prorratea por inscritos en distancias activas", () => {
    // Cronometraje 900€ → activo en TG7(80), TG13(60), TG25(40) → total 180
    // TG7: 900 * 80/180 = 400
    // TG13: 900 * 60/180 = 300
    // TG25: 900 * 40/180 = 200
    const r = calculateCostesFijos([conceptosFijos[0]], totalInscritos);
    expect(r.total).toBe(900);
    expect(r.TG7).toBeCloseTo(400, 1);
    expect(r.TG13).toBeCloseTo(300, 1);
    expect(r.TG25).toBeCloseTo(200, 1);
  });

  it("asigna solo a distancias activas (solo TG25)", () => {
    // conceptosFijos[2]: solo TG25 activo, 300€ → todo va a TG25
    const r = calculateCostesFijos([conceptosFijos[2]], totalInscritos);
    expect(r.TG7).toBe(0);
    expect(r.TG13).toBe(0);
    expect(r.total).toBe(300);
  });
});

// ─── calculateCostesVariables ─────────────────────────────────────────────────

describe("calculateCostesVariables", () => {
  it("calcula coste total = precio * inscritos por distancia", () => {
    // Medallas: TG7=3*80=240, TG13=5*60=300, TG25=8*40=320 → 860
    // Camiseta (sin TG25): TG7=7*80=560, TG13=7*60=420 → 980
    // Total: 860 + 980 = 1840
    const r = calculateCostesVariables(conceptosVariables, totalInscritos);
    expect(r.total).toBe(1840);
    expect(r.TG7).toBe(240 + 560);  // 800
    expect(r.TG13).toBe(300 + 420); // 720
    expect(r.TG25).toBe(320);       // solo medallas
  });

  it("ignora conceptos inactivos", () => {
    const r = calculateCostesVariables([conceptosVariables[2]], totalInscritos);
    expect(r.total).toBe(0);
  });

  it("respeta activoDistancias=false", () => {
    // Camiseta sin TG25 → TG25 debe ser 0
    const r = calculateCostesVariables([conceptosVariables[1]], totalInscritos);
    expect(r.TG25).toBe(0);
    expect(r.TG7).toBe(560);
    expect(r.TG13).toBe(420);
  });
});

// ─── calculateCostesVarPorCorredor ────────────────────────────────────────────

describe("calculateCostesVarPorCorredor", () => {
  it("suma coste por corredor activo por distancia", () => {
    const r = calculateCostesVarPorCorredor(conceptosVariables);
    // TG7: medallas(3) + camiseta(7) = 10
    expect(r.TG7).toBe(10);
    // TG13: medallas(5) + camiseta(7) = 12
    expect(r.TG13).toBe(12);
    // TG25: medallas(8) — camiseta inactiva en TG25
    expect(r.TG25).toBe(8);
  });
});

// ─── calculateMerchTotales ────────────────────────────────────────────────────

describe("calculateMerchTotales", () => {
  it("calcula ingresos, costes y beneficio correctamente", () => {
    const merch = [
      { activo: true,  unidades: 100, precioVenta: 25, costeUnitario: 10 },
      { activo: true,  unidades: 50,  precioVenta: 15, costeUnitario: 8  },
      { activo: false, unidades: 200, precioVenta: 30, costeUnitario: 5  },
    ];
    const r = calculateMerchTotales(merch);
    expect(r.ingresos).toBe(100 * 25 + 50 * 15);  // 2500 + 750 = 3250
    expect(r.costes).toBe(100 * 10 + 50 * 8);      // 1000 + 400 = 1400
    expect(r.beneficio).toBe(r.ingresos - r.costes); // 1850
  });

  it("ignora items inactivos", () => {
    const merch = [{ activo: false, unidades: 1000, precioVenta: 99, costeUnitario: 1 }];
    const r = calculateMerchTotales(merch);
    expect(r.ingresos).toBe(0);
    expect(r.costes).toBe(0);
    expect(r.beneficio).toBe(0);
  });
});

// ─── calculateResultado ───────────────────────────────────────────────────────

describe("calculateResultado", () => {
  it("resultado total = ingresos - fijos - variables - merch negativo", () => {
    const ing = { TG7: 1750, TG13: 1960, TG25: 1900, total: 5610 };
    const fijos = { TG7: 400, TG13: 300, TG25: 200, total: 900 };
    const vars  = { TG7: 800, TG13: 720, TG25: 320, total: 1840 };
    const extraIngresos = 500; // patrocinios/merch
    const r = calculateResultado(totalInscritos, ing, fijos, vars, extraIngresos);
    // total = 5610 + 500 - 900 - 1840 = 3370
    expect(r.total).toBe(3370);
  });

  it("resultado negativo cuando costes superan ingresos", () => {
    const ing   = { TG7: 100, TG13: 100, TG25: 100, total: 300 };
    const fijos = { TG7: 200, TG13: 200, TG25: 200, total: 600 };
    const vars  = { TG7: 0,   TG13: 0,   TG25: 0,   total: 0 };
    const r = calculateResultado(totalInscritos, ing, fijos, vars, 0);
    expect(r.total).toBeLessThan(0);
  });
});

// ─── calculatePEGlobal ────────────────────────────────────────────────────────

describe("calculatePEGlobal", () => {
  const precioMedio = { TG7: 22, TG13: 34, TG25: 50 };
  const costesVar   = { TG7: 10, TG13: 12, TG25: 8  };
  // márgenes: TG7=12, TG13=22, TG25=42
  const costesFijosObj = { TG7: 0, TG13: 0, TG25: 0, total: 1800 };
  const maximos = { TG7: 200, TG13: 150, TG25: 100 };

  it("PE es 0 si ya hay suficientes inscritos para cubrir fijos", () => {
    const muchos = { TG7: 500, TG13: 500, TG25: 500, total: 1500 };
    const r = calculatePEGlobal(muchos, precioMedio, costesVar, costesFijosObj, 0, maximos);
    expect(r.viable).toBe(true);
    expect(r.diferencia).toBeGreaterThanOrEqual(0);
  });

  it("PE es viable si hay plazas suficientes", () => {
    const pocos = { TG7: 0, TG13: 0, TG25: 0, total: 0 };
    const r = calculatePEGlobal(pocos, precioMedio, costesVar, costesFijosObj, 0, maximos);
    expect(r.peGlobal).toBeGreaterThan(0);
    expect(r.fijosNetos).toBe(1800);
  });

  it("PE prioriza distancias con mayor margen", () => {
    const pocos = { TG7: 0, TG13: 0, TG25: 0, total: 0 };
    const r = calculatePEGlobal(pocos, precioMedio, costesVar, costesFijosObj, 0, maximos);
    // TG25 tiene margen 42 — debería ser la primera en usarse
    expect(r.inscritosNecesarios.TG25).toBeGreaterThan(0);
  });

  it("ingresos extra (patrocinios) reducen el PE", () => {
    const pocos = { TG7: 0, TG13: 0, TG25: 0, total: 0 };
    const sinExtra  = calculatePEGlobal(pocos, precioMedio, costesVar, costesFijosObj, 0,    maximos);
    const conExtra  = calculatePEGlobal(pocos, precioMedio, costesVar, costesFijosObj, 1000, maximos);
    expect(conExtra.fijosNetos).toBe(800); // 1800 - 1000
    expect(conExtra.peGlobal).toBeLessThan(sinExtra.peGlobal);
  });

  it("PE no viable si aforo máximo insuficiente para cubrir costes", () => {
    // Costes muy altos que no se pueden cubrir con el aforo
    const costosMuyAltos = { TG7: 0, TG13: 0, TG25: 0, total: 999999 };
    const r = calculatePEGlobal(
      { TG7: 0, TG13: 0, TG25: 0, total: 0 },
      precioMedio, costesVar, costosMuyAltos, 0, maximos
    );
    expect(r.viable).toBe(false);
    expect(r.superaAforo).toBe(true);
  });

  it("fijosNetos nunca es negativo aunque haya más ingresos extra que costes", () => {
    const r = calculatePEGlobal(
      { TG7: 0, TG13: 0, TG25: 0, total: 0 },
      precioMedio, costesVar, costesFijosObj, 9999, maximos
    );
    expect(r.fijosNetos).toBe(0);
    expect(r.viable).toBe(true);
  });

  it("devuelve inscritos actuales como PE si ya está en equilibrio", () => {
    const yaEnEquilibrio = { TG7: 100, TG13: 100, TG25: 100, total: 300 };
    const r = calculatePEGlobal(yaEnEquilibrio, precioMedio, costesVar, costesFijosObj, 0, maximos);
    expect(r.viable).toBe(true);
    expect(r.peGlobal).toBeLessThanOrEqual(yaEnEquilibrio.total);
  });
});

// ─── calculateIngresosDesglosados ─────────────────────────────────────────────

describe("calculateIngresosDesglosados", () => {
  it("separa ingresos reales (tramos cerrados) de estimados (abiertos)", () => {
    const r = calculateIngresosDesglosados(tramos, inscritos);
    // Tramo 1 (fechaFin 2025-01-01) → cerrado → real
    // TG7: 50*20=1000, TG13: 40*30=1200, TG25: 30*45=1350
    expect(r.ingresosReales.TG7).toBe(1000);
    expect(r.ingresosReales.TG13).toBe(1200);
    expect(r.ingresosReales.TG25).toBe(1350);
    // Tramo 2 (fechaFin 2026-12-31) → abierto → estimado
    expect(r.ingresosEstimados.TG7).toBe(750);
    expect(r.ingresosEstimados.TG13).toBe(760);
    expect(r.ingresosEstimados.TG25).toBe(550);
  });

  it("inscritosReales refleja solo los de tramos cerrados", () => {
    const r = calculateIngresosDesglosados(tramos, inscritos);
    expect(r.inscritosReales.TG7).toBe(50);
    expect(r.inscritosEstimados.TG7).toBe(30);
  });
});
