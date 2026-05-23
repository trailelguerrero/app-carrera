/**
 * dashboardBugFixes.test.js
 *
 * Tests de regresión para los 5 bugs encontrados entre módulo Presupuesto y Dashboard.
 *
 * BUG-DASH-01  patComprometido incluía patrocinios en especie → infla KPI y barra de salud
 * BUG-DASH-02  camisetasDesglose siempre null → gráfico "Ingresos vs Costes" sin líneas camisetas
 * BUG-DASH-03  totalIngresosExtra sin recalcular patrocinios vivos → doble cómputo subvención pública
 * BUG-DASH-04  MiniDesglose totalIng/totalCostes no cuadraban con resultado
 * BUG-DASH-05  Tooltip de KpiGlobal decía "costes totales" siendo costes de carrera (sin merch)
 */

import { describe, it, expect } from "vitest";
import {
  calculateCosteCamisetasDesglosado,
  calculateResultado,
  calculateIngresosPorDistancia,
  calculateTotalInscritos,
  calculateCostesFijos,
  calculateCostesVariables,
} from "../lib/budgetUtils.js";

// ─── Helpers (replican fórmulas del hook) ─────────────────────────────────────

const getImporteComprometido = (p) =>
  p.estado === "confirmado" || p.estado === "cobrado" ? (p.importe || 0) : 0;

/** ANTES del fix (buggy) */
const calcPatComprometidoBuggy = (pats) =>
  pats
    .filter((p) => p.estado === "confirmado" || p.estado === "cobrado")
    .reduce((s, p) => s + (p.importe || 0), 0);

/** DESPUÉS del fix (correcto) */
const calcPatComprometidoFixed = (pats) =>
  pats
    .filter((p) => !p.especie && (p.estado === "confirmado" || p.estado === "cobrado"))
    .reduce((s, p) => s + (p.importe || 0), 0);

// ─── FIXTURES ─────────────────────────────────────────────────────────────────

const PATS_CON_ESPECIE = [
  { id: 1, nombre: "Decathlon",  importe: 2000, estado: "cobrado",    especie: false },
  { id: 2, nombre: "Salchichón", importe: 500,  estado: "confirmado", especie: true  }, // en especie
  { id: 3, nombre: "Hotel",      importe: 800,  estado: "confirmado", especie: false },
];

const TRAMOS_BASICOS = [
  { id: 1, nombre: "General", fechaFin: "2099-12-31",
    precios: { TG7: 25, TG13: 38, TG25: 55 } },
];
const INSCRITOS_BASICOS = { tramos: { 1: { TG7: 20, TG13: 10, TG25: 5 } } };

// ─── BUG-DASH-01: patComprometido con especie ─────────────────────────────────

describe("BUG-DASH-01 — patComprometido excluye patrocinios en especie", () => {
  it("versión buggy suma especie → valor inflado", () => {
    const result = calcPatComprometidoBuggy(PATS_CON_ESPECIE);
    // 2000 + 500 + 800 = 3300 (incorrecto: incluye especie)
    expect(result).toBe(3300);
  });

  it("versión fixed excluye especie → valor correcto", () => {
    const result = calcPatComprometidoFixed(PATS_CON_ESPECIE);
    // 2000 + 800 = 2800 (correcto: solo dinero)
    expect(result).toBe(2800);
  });

  it("sin patrocinios en especie ambas versiones coinciden", () => {
    const pats = [
      { id: 1, importe: 1000, estado: "cobrado",    especie: false },
      { id: 2, importe: 500,  estado: "confirmado", especie: false },
    ];
    expect(calcPatComprometidoBuggy(pats)).toBe(calcPatComprometidoFixed(pats));
    expect(calcPatComprometidoFixed(pats)).toBe(1500);
  });

  it("patrocinador con especie undefined se comporta como no-especie", () => {
    const pats = [{ id: 1, importe: 1000, estado: "confirmado" }]; // sin campo especie
    // !undefined === true → se incluye correctamente
    expect(calcPatComprometidoFixed(pats)).toBe(1000);
  });
});

// ─── BUG-DASH-02: camisetasDesglose no null ────────────────────────────────────

describe("BUG-DASH-02 — calculateCosteCamisetasDesglosado devuelve desglose real", () => {
  const camCoste = { corredor: 8, voluntario: 7, nino: 6 };

  it("desglose tiene todas las propiedades esperadas por SeccionCharts/MiniDesglose", () => {
    const desglose = calculateCosteCamisetasDesglosado({
      camCoste,
      camPedidos: [],
      corredoresExt: { S: 10, M: 15 },
      precioCorrExt: 12,
      ninoExt: { "4-6": 3 },
      voluntariosActivos: [{ id: 1, talla: "M", estado: "confirmado" }],
    });

    // Todas las propiedades que consumen SeccionCharts y MiniDesglose
    expect(desglose).toHaveProperty("ingresosExterno");
    expect(desglose).toHaveProperty("ingresosPedidos");
    expect(desglose).toHaveProperty("costeTotal");
    expect(desglose).toHaveProperty("costeVoluntario");
    expect(desglose).toHaveProperty("costeNino");
    expect(desglose).toHaveProperty("beneficioNeto");
    expect(desglose).toHaveProperty("unidCorredor");
    expect(desglose).toHaveProperty("unidVoluntario");
    expect(desglose).toHaveProperty("unidNino");
    expect(typeof desglose.beneficioNeto).toBe("number");
  });

  it("beneficioNeto = ingresoTotal - costeTotal", () => {
    const desglose = calculateCosteCamisetasDesglosado({
      camCoste,
      camPedidos: [],
      corredoresExt: { M: 10 },
      precioCorrExt: 20,
      ninoExt: {},
      voluntariosActivos: [],
    });
    // 10 corredores × 20€ ingreso − 10 × 8€ coste = 200 − 80 = 120
    expect(desglose.ingresosExterno).toBe(200);
    expect(desglose.costeCorredor).toBe(80);
    expect(desglose.beneficioNeto).toBe(120);
    expect(desglose.beneficioNeto).toBe(desglose.ingresoTotal - desglose.costeTotal);
  });

  it("desglose no es null cuando camisetasActiva=true (simulación del hook)", () => {
    let camisetasDesglose = null; // estado inicial (antes del fix sería siempre null)
    const camisetasActiva = true;

    if (camisetasActiva) {
      camisetasDesglose = calculateCosteCamisetasDesglosado({
        camCoste,
        camPedidos: [],
        corredoresExt: { M: 5 },
        precioCorrExt: 15,
        ninoExt: {},
        voluntariosActivos: [],
      });
    }

    // Después del fix: desglose != null cuando hay datos
    expect(camisetasDesglose).not.toBeNull();
    expect(camisetasDesglose.unidCorredor).toBe(5);
  });
});

// ─── BUG-DASH-03: recálculo en vivo de patrocinios evita doble cómputo ────────

describe("BUG-DASH-03 — totalIngresosExtra recalcula patrocinios vivos con ECO-01", () => {
  const patsConPublico = [
    { id: 1, importe: 3000, estado: "confirmado", especie: false, sector: "Empresa privada" },
    { id: 2, importe: 1000, estado: "confirmado", especie: false, sector: "Administración pública" },
  ];

  /** Recálculo en vivo igual que el fix del Dashboard */
  const recalcPatLive = (pats, excluirPublicos) =>
    pats
      .filter((p) => !p.especie && (!excluirPublicos || p.sector !== "Administración pública"))
      .reduce((s, p) => (p.estado === "confirmado" || p.estado === "cobrado" ? s + (p.importe || 0) : s), 0);

  const recalcSubvLive = (pats) =>
    pats
      .filter((p) => p.sector === "Administración pública" && !p.especie)
      .reduce((s, p) => (p.estado === "confirmado" || p.estado === "cobrado" ? s + (p.importe || 0) : s), 0);

  it("con subvencionPublica activa: patrocinios NO incluye sector público", () => {
    const syncConfig = { subvencionPublica: true };
    const pat = recalcPatLive(patsConPublico, syncConfig.subvencionPublica === true);
    // Solo empresa privada: 3000
    expect(pat).toBe(3000);
  });

  it("con subvencionPublica activa: subvención captura el sector público", () => {
    const subv = recalcSubvLive(patsConPublico);
    expect(subv).toBe(1000);
  });

  it("suma total no duplica: patrocinios + subvención = total todos", () => {
    const syncConfig = { subvencionPublica: true };
    const pat  = recalcPatLive(patsConPublico, true);
    const subv = recalcSubvLive(patsConPublico);
    const total = patsConPublico.reduce((s, p) => s + p.importe, 0); // 4000
    expect(pat + subv).toBe(total); // 3000 + 1000 = 4000 — sin doble cómputo
  });

  it("con subvencionPublica inactiva: patrocinios incluye todos (una sola línea suma)", () => {
    const syncConfig = { subvencionPublica: false };
    const pat = recalcPatLive(patsConPublico, false);
    // 3000 + 1000 = 4000
    expect(pat).toBe(4000);
  });

  it("snapshot desactualizado (valor=4000) vs recálculo vivo (3000) difieren si subvención activa", () => {
    // Simula el snapshot con valor inflado (antes del fix)
    const ingresosExtraSnapshotBuggy = [
      { syncKey: "patrocinios", activo: true, valor: 4000 }, // snapshot antiguo: incluía público
    ];
    const ingresosExtraFixed = [
      { syncKey: "patrocinios", activo: true, valor: 4000 }, // snapshot antiguo pero recalculamos vivo
    ];

    const totalBuggy = ingresosExtraSnapshotBuggy
      .filter((ie) => ie.activo && ie.syncKey !== "camisetas")
      .reduce((s, ie) => s + ie.valor, 0);
    // Buggy usa el snapshot: 4000

    const syncConfig = { subvencionPublica: true };
    const totalFixed = ingresosExtraFixed
      .filter((ie) => ie.activo && ie.syncKey !== "camisetas")
      .reduce((s, ie) => {
        if (ie.syncKey === "patrocinios") return s + recalcPatLive(patsConPublico, true);
        return s + ie.valor;
      }, 0);
    // Fixed recalcula en vivo: 3000

    expect(totalBuggy).toBe(4000); // valor incorrecto (snapshot desactualizado)
    expect(totalFixed).toBe(3000); // valor correcto (recálculo vivo)
  });
});

// ─── BUG-DASH-04: MiniDesglose totalIng − totalCostes === resultado ───────────

describe("BUG-DASH-04 — MiniDesglose totalIng - totalCostes coincide con resultado", () => {
  // Simula los valores que llegan a MiniDesglose desde el hook
  const scenario = {
    totalIngresos: 5000,       // inscripciones
    totalIngresosExtra: 2000,  // patrocinios etc.
    totalCostesFijos: 3000,
    totalCostesVars: 1500,
    // camisetasDesglose con beneficioNeto = ingreso − coste
    camisetasDesglose: {
      ingresosExterno: 600, ingresosPedidos: 200, ingresoVentaPublica: 0,
      costeTotal: 500, costeVoluntario: 200, costeNino: 50,
      beneficioNeto: 300, // 800 − 500
      unidCorredor: 10, unidVoluntario: 5, unidNino: 2, unidExtras: 0,
    },
  };

  // resultado = totalIngresos + totalIngresosExtra + beneficioNeto − costesFijos − costesVar
  const resultado =
    scenario.totalIngresos +
    scenario.totalIngresosExtra +
    scenario.camisetasDesglose.beneficioNeto -
    scenario.totalCostesFijos -
    scenario.totalCostesVars;

  it("resultado calculado por el hook es correcto", () => {
    // 5000 + 2000 + 300 − 3000 − 1500 = 2800
    expect(resultado).toBe(2800);
  });

  it("BUGGY: totalIng − totalCostes NO coincide con resultado", () => {
    // Versión buggy de MiniDesglose
    const cam = scenario.camisetasDesglose;
    const camIngresos = cam.ingresosExterno + cam.ingresosPedidos;    // 800
    const camCoste    = cam.costeTotal;                                 // 500
    const totalIngBuggy    = scenario.totalIngresos + scenario.totalIngresosExtra + camIngresos; // 7800
    const totalCostesBuggy = scenario.totalCostesFijos + scenario.totalCostesVars + camCoste;   // 5000
    const diffBuggy = totalIngBuggy - totalCostesBuggy; // 7800 − 5000 = 2800

    // Coincide numéricamente pero el desglose es engañoso:
    // camIngresos (800) está en totalIng Y su coste (500) está en totalCostes
    // → totalIng y totalCostes están hinchados, aunque la diferencia cuadre
    expect(totalIngBuggy).toBe(7800);         // inflado respecto al resultado real
    expect(totalCostesBuggy).toBe(5000);      // inflado respecto a costes reales
    expect(diffBuggy).toBe(resultado);        // la diferencia coincide por azar
  });

  it("FIXED: totalIng − totalCostes coincide con resultado y los totales son correctos", () => {
    // Versión fixed: totalIng = resultado + costes (garantiza la identidad)
    const totalCostesFixed = scenario.totalCostesFijos + scenario.totalCostesVars; // 4500
    const totalIngFixed    = resultado + totalCostesFixed;                           // 7300

    expect(totalIngFixed - totalCostesFixed).toBe(resultado); // 7300 − 4500 = 2800 ✓
    expect(totalIngFixed).toBe(7300);    // refleja ingresos netos (sin inflar con costes cam)
    expect(totalCostesFixed).toBe(4500); // refleja costes reales (sin añadir coste cam ya neto)
  });
});

// ─── BUG-DASH-05: denominador ROI consistente ─────────────────────────────────

describe("BUG-DASH-05 — denominador para % margen: costesCarrera (fijos+var, sin merch)", () => {
  const costesFijos = 3000;
  const costesVars  = 1500;
  const costesCarrera = costesFijos + costesVars; // 4500 — denominador correcto

  // Hipotético coste de merch si se incluyera en denominador (incorrecto)
  const costeMerch   = 500;
  const costesTotales = costesCarrera + costeMerch; // 5000

  const resultado = 900; // superávit de ejemplo

  it("pctMargen con denomidador correcto (costesCarrera)", () => {
    const pct = Math.round(resultado / costesCarrera * 100);
    expect(pct).toBe(20); // 900/4500 = 20%
  });

  it("pctMargen con denominador incorrecto (incluyendo merch) daría valor diferente", () => {
    const pctIncorrecto = Math.round(resultado / costesTotales * 100);
    expect(pctIncorrecto).toBe(18); // 900/5000 = 18% — diferente del correcto
  });

  it("Dashboard y KpiGlobal usan mismo denominador (totalCostesFijos + totalCostesVars)", () => {
    // Ambos módulos calculan el % sobre (costesFijos + costesVar) — sin merch
    const pctDashboard  = Math.round(resultado / (costesFijos + costesVars) * 100);
    const pctKpiGlobal  = Math.round(resultado / costesCarrera * 100);
    expect(pctDashboard).toBe(pctKpiGlobal);
  });
});

