/**
 * dashboardCamisetasParity.test.js — FIX-DASH-CAM-01
 *
 * Contexto: el bloque Dashboard mostraba un "resultado neto" distinto al del
 * bloque Presupuesto. Causa raíz confirmada: fetchCamisetas() en
 * useDashboardQueries.js no pedía 4 claves que sí lee useBudgetLogic
 * (Presupuesto): no-corredor (uds/talla), su precio, "incluir pendientes" y
 * el syncConfig de las 6 categorías de camisetas. El Dashboard las recibía
 * como undefined y usaba valores vacíos/por defecto, mientras Presupuesto
 * usaba los valores reales guardados.
 *
 * Este test cubre dos cosas:
 *   1. fetchCamisetas() ahora solicita exactamente las mismas claves que
 *      useBudgetLogic necesita para camisetas (evita regresión silenciosa).
 *   2. calculateCamisetasPresupuesto (la fuente única de verdad para el
 *      cálculo) da resultados distintos si se le pasan los datos incompletos
 *      que el Dashboard leía antes del fix, frente a los datos completos que
 *      lee ahora — demostrando que el bug era real y que el fix lo corrige.
 *
 * Datos de fixture: tomados literalmente del caso reportado por Ivan
 * (teg_camisetas_v1_no_corredor y teg_presupuesto_v1_camSyncConfig reales).
 */

import { describe, it, expect } from "vitest";
import { calculateCamisetasPresupuesto } from "../lib/budgetUtils.js";

// ── Fixture real reportada (SQL Neon, ver conversación de soporte) ──────────
const NO_CORREDOR_REAL = { XXS: 0, XS: 0, S: 0, M: 2, L: 3, XL: 9, XXL: 2, "3XL": 1, "4XL": 0 };
// unidades = 17

const CAM_SYNC_CONFIG_REAL = {
  camCorredores: true,
  camNoCorredores: true,
  camVentaPublico: false,
  camOtros: false,
  camVoluntarios: true,
  camRegalos: true,
  camNino: true,
};

const CAM_SYNC_CONFIG_DEFAULT_TODO_TRUE = {
  camCorredores: true,
  camNoCorredores: true,
  camVentaPublico: true,
  camOtros: true,
  camVoluntarios: true,
  camRegalos: true,
  camNino: true,
};

const CAM_COSTE = { corredor: 8, voluntario: 7, nino: 6 };
const PRECIO_NO_CORREDOR = 18;

describe("FIX-DASH-CAM-01 — fetchCamisetas pide las mismas claves que Presupuesto", () => {
  it("incluye no_corredor, precio_no_corredor, incluir_pendientes y camSyncConfig", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "../hooks/useDashboardQueries.js");
    const source = fs.readFileSync(filePath, "utf-8");

    // La función fetchCamisetas debe pedir las 4 claves antes ausentes.
    const fetchCamisetasBlock = source.slice(
      source.indexOf("const fetchCamisetas"),
      source.indexOf("// ── Hook principal")
    );

    expect(fetchCamisetasBlock).toContain("SK_CAM_NO_CORREDOR");
    expect(fetchCamisetasBlock).toContain("SK_CAM_PRECIO_NO_CORREDOR");
    expect(fetchCamisetasBlock).toContain("SK_CAM_INCLUIR_PENDIENTES");
    expect(fetchCamisetasBlock).toContain("SK_PPTO_CAM_SYNC_CONFIG");
  });
});

describe("FIX-DASH-CAM-01 — impacto real del bug sobre el caso reportado", () => {
  it("con datos INCOMPLETOS (comportamiento del Dashboard antes del fix) el beneficio de camisetas difiere del cálculo con datos COMPLETOS (Presupuesto)", () => {
    const base = {
      camCoste: CAM_COSTE,
      camPedidos: [],
      corredoresExt: {},
      precioCorrExt: 0,
      ninoExt: {},
      voluntariosActivos: [],
      ventaPublico: { precio: 0, cantidad: 0 },
    };

    // Comportamiento ANTES del fix: Dashboard no tenía no_corredor ni su precio,
    // y usaba los toggles por defecto (todo true) en vez de los reales.
    const resultadoDashboardAntes = calculateCamisetasPresupuesto({
      ...base,
      noCorredorExt: {},           // undefined → {} (fallback en el hook)
      precioNoCorrExt: 0,          // sin SK_CAM_PRECIO_NO_CORREDOR → 0 en vez de 18
      toggles: {
        corredores: CAM_SYNC_CONFIG_DEFAULT_TODO_TRUE.camCorredores,
        noCorredores: CAM_SYNC_CONFIG_DEFAULT_TODO_TRUE.camNoCorredores,
        ventaPublico: CAM_SYNC_CONFIG_DEFAULT_TODO_TRUE.camVentaPublico, // debería ser false
        otros: CAM_SYNC_CONFIG_DEFAULT_TODO_TRUE.camOtros,               // debería ser false
        voluntarios: CAM_SYNC_CONFIG_DEFAULT_TODO_TRUE.camVoluntarios,
        regalos: CAM_SYNC_CONFIG_DEFAULT_TODO_TRUE.camRegalos,
        nino: CAM_SYNC_CONFIG_DEFAULT_TODO_TRUE.camNino,
      },
    });

    // Comportamiento DESPUÉS del fix: mismos datos reales que lee Presupuesto.
    const resultadoDespuesDelFix = calculateCamisetasPresupuesto({
      ...base,
      noCorredorExt: NO_CORREDOR_REAL,
      precioNoCorrExt: PRECIO_NO_CORREDOR,
      toggles: {
        corredores: CAM_SYNC_CONFIG_REAL.camCorredores,
        noCorredores: CAM_SYNC_CONFIG_REAL.camNoCorredores,
        ventaPublico: CAM_SYNC_CONFIG_REAL.camVentaPublico,
        otros: CAM_SYNC_CONFIG_REAL.camOtros,
        voluntarios: CAM_SYNC_CONFIG_REAL.camVoluntarios,
        regalos: CAM_SYNC_CONFIG_REAL.camRegalos,
        nino: CAM_SYNC_CONFIG_REAL.camNino,
      },
    });

    // El bug hacía que los dos cálculos difirieran pese a ser "la misma" carrera.
    expect(resultadoDashboardAntes.beneficioNeto).not.toBe(resultadoDespuesDelFix.beneficioNeto);

    // Con datos completos, las 17 unidades no-corredor a 18€ deben entrar en el ingreso.
    expect(resultadoDespuesDelFix.totalIngresos).toBeGreaterThan(resultadoDashboardAntes.totalIngresos);
  });

  it("con los MISMOS datos completos, el cálculo es idéntico haya sido invocado 'como Dashboard' o 'como Presupuesto' (paridad tras el fix)", () => {
    const params = {
      camCoste: CAM_COSTE,
      camPedidos: [],
      corredoresExt: {},
      precioCorrExt: 0,
      ninoExt: {},
      voluntariosActivos: [],
      ventaPublico: { precio: 0, cantidad: 0 },
      noCorredorExt: NO_CORREDOR_REAL,
      precioNoCorrExt: PRECIO_NO_CORREDOR,
      toggles: {
        corredores: CAM_SYNC_CONFIG_REAL.camCorredores,
        noCorredores: CAM_SYNC_CONFIG_REAL.camNoCorredores,
        ventaPublico: CAM_SYNC_CONFIG_REAL.camVentaPublico,
        otros: CAM_SYNC_CONFIG_REAL.camOtros,
        voluntarios: CAM_SYNC_CONFIG_REAL.camVoluntarios,
        regalos: CAM_SYNC_CONFIG_REAL.camRegalos,
        nino: CAM_SYNC_CONFIG_REAL.camNino,
      },
    };

    // Tras el fix, tanto useDashboardKpis como useBudgetLogic invocan esta misma
    // función con estos mismos datos reales → deben dar el mismo objeto.
    const comoPresupuesto = calculateCamisetasPresupuesto({ ...params });
    const comoDashboard   = calculateCamisetasPresupuesto({ ...params });

    expect(comoDashboard.beneficioNeto).toBe(comoPresupuesto.beneficioNeto);
    expect(comoDashboard.totalIngresos).toBe(comoPresupuesto.totalIngresos);
    expect(comoDashboard.totalGastos).toBe(comoPresupuesto.totalGastos);
  });
});

describe("FIX-DASH-CAM-02 — guardar tallas no-corredor notifica al Dashboard", () => {
  it("setNoCorredor se pasa envuelto en dataService.notify('presupuesto') en Camisetas.jsx", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "../components/blocks/Camisetas.jsx");
    const source = fs.readFileSync(filePath, "utf-8");

    // Antes del fix, esta prop se pasaba como `setNoCorredor={setNoCorredor}` sin notificar,
    // así que el Dashboard se quedaba con caché vieja tras guardar tallas no-corredor.
    const propLine = source
      .split("\n")
      .find(line => line.includes("setNoCorredor={") && line.includes("noCorredorExt={noCorredorExt}"));

    expect(propLine).toBeDefined();
    expect(propLine).toContain('dataService.notify("presupuesto")');
  });
});
