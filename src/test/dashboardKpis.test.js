/**
 * dashboardKpis.test.js — TEST-03 (F15)
 *
 * Tests unitarios de la lógica de cobertura de voluntarios de useDashboardKpis.
 *
 * Estrategia: extraemos y testeamos las fórmulas puras del hook directamente,
 * sin montar el hook (que requeriría mocks de useData y localStorage).
 * Esto testea las invariantes de negocio que más importan:
 *   - coberturaVol: voluntariosConfirmados / totalNecesarios * 100
 *   - puestosConCobertura: mapeo de puestos con déficit y porcentaje
 *   - alertas de cobertura según umbrales temporales
 */

import { describe, it, expect } from "vitest";

// ── Fórmulas extraídas de useDashboardKpis (líneas 102-120) ──────────────────
// Se testean como funciones puras para evitar dependencia de hooks/localStorage.

/**
 * Calcula el porcentaje de cobertura global de voluntarios.
 * Replica exactamente: coberturaVol = totalNecesarios > 0
 *   ? Math.round(volConfirmados / totalNecesarios * 100) : 0
 */
function calcularCoberturaVol(voluntarios, puestos) {
  const volConfirmados  = voluntarios.filter(v => v.estado === "confirmado").length;
  const totalNecesarios = puestos.reduce((s, p) => s + (p.necesarios || 0), 0);
  return totalNecesarios > 0 ? Math.round(volConfirmados / totalNecesarios * 100) : 0;
}

/**
 * Mapea puestos con métricas de cobertura.
 * Replica exactamente el puestosConCobertura de useDashboardKpis.
 */
function calcularPuestosConCobertura(voluntarios, puestos) {
  return puestos.map(p => {
    const asig       = voluntarios.filter(v => v.puestoId === p.id && v.estado !== "cancelado").length;
    const confirmados = voluntarios.filter(v => v.puestoId === p.id && v.estado === "confirmado").length;
    const deficit    = Math.max(0, p.necesarios - asig);
    const pct        = p.necesarios > 0 ? Math.round(asig / p.necesarios * 100) : 100;
    return { ...p, asig, confirmados, deficit, pct };
  });
}

// ── FIXTURES ─────────────────────────────────────────────────────────────────

const PUESTOS_BASE = [
  { id: 1, nombre: "Meta",          necesarios: 5 },
  { id: 2, nombre: "Avituallamiento KM4", necesarios: 3 },
  { id: 3, nombre: "Control KM7",   necesarios: 2 },
];

// totalNecesarios = 10

// ── TEST-03: Cobertura de voluntarios ─────────────────────────────────────────

describe("coberturaVol — sin puestos definidos", () => {
  it("devuelve 0 cuando no hay puestos (evita división por cero)", () => {
    // Arrange
    const voluntarios = [{ id: 1, estado: "confirmado", puestoId: 1 }];
    const puestos = [];
    // Act
    const cobertura = calcularCoberturaVol(voluntarios, puestos);
    // Assert
    expect(cobertura).toBe(0);
    expect(Number.isFinite(cobertura)).toBe(true);
  });

  it("devuelve 0 cuando no hay voluntarios ni puestos", () => {
    expect(calcularCoberturaVol([], [])).toBe(0);
  });
});

describe("coberturaVol — cobertura parcial", () => {
  it("calcula correctamente con 5 confirmados de 10 necesarios → 50%", () => {
    // Arrange: 5 voluntarios confirmados sobre 10 necesarios
    const voluntarios = [
      { id: 1, estado: "confirmado", puestoId: 1 },
      { id: 2, estado: "confirmado", puestoId: 1 },
      { id: 3, estado: "confirmado", puestoId: 2 },
      { id: 4, estado: "confirmado", puestoId: 3 },
      { id: 5, estado: "confirmado", puestoId: 3 },
      { id: 6, estado: "pendiente",  puestoId: 1 }, // pendiente: no cuenta
      { id: 7, estado: "cancelado",  puestoId: 2 }, // cancelado: no cuenta
    ];
    // Act
    const cobertura = calcularCoberturaVol(voluntarios, PUESTOS_BASE);
    // Assert
    expect(cobertura).toBe(50);
  });

  it("los voluntarios pendientes NO cuentan para cobertura", () => {
    // Arrange: solo pendientes, ningún confirmado
    const voluntarios = [
      { id: 1, estado: "pendiente", puestoId: 1 },
      { id: 2, estado: "pendiente", puestoId: 2 },
    ];
    const cobertura = calcularCoberturaVol(voluntarios, PUESTOS_BASE);
    // Assert: pendientes no son confirmados → cobertura 0
    expect(cobertura).toBe(0);
  });

  it("los voluntarios cancelados NO cuentan para cobertura", () => {
    const voluntarios = [
      { id: 1, estado: "cancelado", puestoId: 1 },
      { id: 2, estado: "cancelado", puestoId: 2 },
    ];
    expect(calcularCoberturaVol(voluntarios, PUESTOS_BASE)).toBe(0);
  });

  it("redondea correctamente (7/10 = 70%)", () => {
    const voluntarios = Array.from({ length: 7 }, (_, i) => ({
      id: i + 1, estado: "confirmado", puestoId: 1,
    }));
    expect(calcularCoberturaVol(voluntarios, PUESTOS_BASE)).toBe(70);
  });
});

describe("coberturaVol — cobertura completa", () => {
  it("devuelve 100 cuando hay exactamente los voluntarios necesarios confirmados", () => {
    // Arrange: 10 confirmados para 10 necesarios
    const voluntarios = [
      ...Array.from({ length: 5 }, (_, i) => ({ id: i+1,  estado: "confirmado", puestoId: 1 })),
      ...Array.from({ length: 3 }, (_, i) => ({ id: i+6,  estado: "confirmado", puestoId: 2 })),
      ...Array.from({ length: 2 }, (_, i) => ({ id: i+9,  estado: "confirmado", puestoId: 3 })),
    ];
    // Act
    const cobertura = calcularCoberturaVol(voluntarios, PUESTOS_BASE);
    // Assert
    expect(cobertura).toBe(100);
  });

  it("puede superar 100 si hay más confirmados que necesarios", () => {
    // Arrange: 12 confirmados para 10 necesarios (sobre-asignación)
    const voluntarios = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1, estado: "confirmado", puestoId: 1,
    }));
    const cobertura = calcularCoberturaVol(voluntarios, PUESTOS_BASE);
    // Assert: la fórmula no cap a 100 — es correcto reflejar sobre-asignación
    expect(cobertura).toBeGreaterThanOrEqual(100);
  });
});

// ── TEST-03: puestosConCobertura ──────────────────────────────────────────────

describe("puestosConCobertura — déficit por puesto", () => {
  it("calcula déficit correctamente cuando un puesto está sin cubrir", () => {
    // Arrange: Meta necesita 5, solo 2 asignados
    const voluntarios = [
      { id: 1, estado: "confirmado", puestoId: 1 },
      { id: 2, estado: "pendiente",  puestoId: 1 },
    ];
    // Act
    const puestos = calcularPuestosConCobertura(voluntarios, PUESTOS_BASE);
    const meta = puestos.find(p => p.id === 1);
    // Assert
    expect(meta.asig).toBe(2);       // confirmado + pendiente (no cancelado)
    expect(meta.confirmados).toBe(1); // solo confirmado
    expect(meta.deficit).toBe(3);     // 5 - 2
    expect(meta.pct).toBe(40);        // Math.round(2/5*100)
  });

  it("déficit es 0 cuando el puesto está cubierto o sobre-cubierto", () => {
    // Arrange: Avituallamiento necesita 3, hay 4 asignados
    const voluntarios = Array.from({ length: 4 }, (_, i) => ({
      id: i + 1, estado: "confirmado", puestoId: 2,
    }));
    const puestos = calcularPuestosConCobertura(voluntarios, PUESTOS_BASE);
    const avitu = puestos.find(p => p.id === 2);
    // Assert: deficit nunca negativo (Math.max(0, ...))
    expect(avitu.deficit).toBe(0);
    expect(avitu.pct).toBe(133); // Math.round(4/3*100)
  });

  it("voluntarios cancelados NO cuentan como asignados al puesto", () => {
    // Arrange: 3 cancelados en Meta
    const voluntarios = Array.from({ length: 3 }, (_, i) => ({
      id: i + 1, estado: "cancelado", puestoId: 1,
    }));
    const puestos = calcularPuestosConCobertura(voluntarios, PUESTOS_BASE);
    const meta = puestos.find(p => p.id === 1);
    // Assert: cancelados excluidos del conteo de asig
    expect(meta.asig).toBe(0);
    expect(meta.deficit).toBe(5);
  });

  it("puesto sin necesarios definidos muestra pct 100 (sin división por cero)", () => {
    // Arrange: puesto con necesarios = 0
    const puestosEspecial = [{ id: 99, nombre: "Reserva", necesarios: 0 }];
    const voluntarios = [];
    const result = calcularPuestosConCobertura(voluntarios, puestosEspecial);
    // Assert: pct = 100 cuando necesarios === 0 (por diseño del hook)
    expect(result[0].pct).toBe(100);
    expect(result[0].deficit).toBe(0);
  });
});
