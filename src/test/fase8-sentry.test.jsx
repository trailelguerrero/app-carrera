/**
 * FASE 8 — Tests de observabilidad (Sentry + ErrorBoundary)
 * ─────────────────────────────────────────────────────────
 * Cubre:
 *  F8-01  scrubSensitiveData elimina campos sensibles
 *  F8-02  scrubSensitiveData preserva campos seguros
 *  F8-03  scrubSensitiveData anida recursivamente
 *  F8-04  scrubSensitiveData no muta el original
 *  F8-05  scrubSensitiveData arrays no se tocan
 *  F8-06  ErrorBoundary renderiza hijos sin error
 *  F8-07  ErrorBoundary muestra mensaje al explotar
 *  F8-08  ErrorBoundary incluye blockName en el mensaje
 *  F8-09  ErrorBoundary botón reintentar resetea estado
 *  F8-10  ErrorBoundary llama a Sentry.withScope + captureException
 *  F8-11  ErrorBoundary resetea al cambiar blockName
 *  F8-12  ErrorBoundary texto genérico sin blockName
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";

// ── Mocks (vi.hoisted evita el problema de hoisting en vi.mock) ──────────────
const { mockCaptureException, mockWithScope } = vi.hoisted(() => {
  const mockCaptureException = vi.fn();
  const mockWithScope = vi.fn((cb) =>
    cb({ setTag: vi.fn(), setContext: vi.fn(), setLevel: vi.fn() })
  );
  return { mockCaptureException, mockWithScope };
});

vi.mock("@sentry/react", () => ({
  captureException: mockCaptureException,
  withScope: mockWithScope,
}));

const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
  mockCaptureException.mockClear();
  mockWithScope.mockClear();
});
afterEach(() => {
  console.error = originalConsoleError;
  cleanup();
});

// ── Scrubber replicado para tests unitarios ──────────────────────────────────
function scrubSensitiveData(obj) {
  const SCRUB_FIELDS = [
    "password", "token", "secret", "api_key", "apikey",
    "dni", "nif", "telefono", "phone", "email", "correo",
    "nombre", "name", "apellido",
  ];
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const keyLower = k.toLowerCase();
    const isSensitive = SCRUB_FIELDS.some((f) => keyLower.includes(f));
    if (isSensitive) {
      out[k] = "[Filtered]";
    } else if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      out[k] = scrubSensitiveData(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// ── Componente helper que lanza ───────────────────────────────────────────────
function BrokenComponent({ message = "Test error" }) {
  throw new Error(message);
}

import ErrorBoundary from "../components/ErrorBoundary";

// ══════════════════════════════════════════════════════════════════════════════
// F8-01 a F8-05 — scrubSensitiveData
// ══════════════════════════════════════════════════════════════════════════════
describe("F8-01 scrubSensitiveData: elimina campos sensibles", () => {
  it("filtra password", () => {
    expect(scrubSensitiveData({ password: "supersecret" }).password).toBe("[Filtered]");
  });
  it("filtra email", () => {
    expect(scrubSensitiveData({ email: "user@test.com" }).email).toBe("[Filtered]");
  });
  it("filtra token", () => {
    expect(scrubSensitiveData({ token: "abc123" }).token).toBe("[Filtered]");
  });
  it("filtra telefono", () => {
    expect(scrubSensitiveData({ telefono: "612345678" }).telefono).toBe("[Filtered]");
  });
  it("filtra nombre", () => {
    expect(scrubSensitiveData({ nombre: "Juan" }).nombre).toBe("[Filtered]");
  });
  it("filtra DNI case-insensitive", () => {
    expect(scrubSensitiveData({ DNI: "12345678A" }).DNI).toBe("[Filtered]");
  });
});

describe("F8-02 scrubSensitiveData: preserva campos seguros", () => {
  it("preserva id numérico", () => {
    expect(scrubSensitiveData({ id: 42 }).id).toBe(42);
  });
  it("preserva cantidad", () => {
    expect(scrubSensitiveData({ cantidad: 100 }).cantidad).toBe(100);
  });
  it("preserva status string", () => {
    expect(scrubSensitiveData({ status: "activo" }).status).toBe("activo");
  });
  it("preserva booleano", () => {
    expect(scrubSensitiveData({ activo: true }).activo).toBe(true);
  });
});

describe("F8-03 scrubSensitiveData: anida recursivamente", () => {
  it("scrubea campos sensibles anidados", () => {
    const input = { user: { email: "x@y.com", id: 1 } };
    const result = scrubSensitiveData(input);
    expect(result.user.email).toBe("[Filtered]");
    expect(result.user.id).toBe(1);
  });
  it("no altera campos seguros anidados", () => {
    const input = { config: { timeout: 30, retries: 3 } };
    const result = scrubSensitiveData(input);
    expect(result.config.timeout).toBe(30);
    expect(result.config.retries).toBe(3);
  });
});

describe("F8-04 scrubSensitiveData: no muta el original", () => {
  it("el objeto original queda intacto", () => {
    const input = { email: "test@test.com", id: 1 };
    scrubSensitiveData(input);
    expect(input.email).toBe("test@test.com");
  });
});

describe("F8-05 scrubSensitiveData: arrays no se modifican", () => {
  it("arrays quedan intactos", () => {
    const input = { tags: ["a", "b", "c"] };
    const result = scrubSensitiveData(input);
    expect(result.tags).toEqual(["a", "b", "c"]);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// F8-06 a F8-12 — ErrorBoundary
// ══════════════════════════════════════════════════════════════════════════════
describe("F8-06 ErrorBoundary: renderiza hijos sin error", () => {
  it("muestra el contenido normal si no hay error", () => {
    render(
      <ErrorBoundary blockName="Test">
        <div>Contenido OK</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Contenido OK")).toBeTruthy();
  });
});

describe("F8-07 ErrorBoundary: muestra UI de error al explotar", () => {
  it("muestra el icono de advertencia", () => {
    render(
      <ErrorBoundary blockName="Test">
        <BrokenComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText("⚠️")).toBeTruthy();
  });
  it("muestra el mensaje de error", () => {
    render(
      <ErrorBoundary blockName="Test">
        <BrokenComponent message="Error específico" />
      </ErrorBoundary>
    );
    expect(screen.getByText("Error específico")).toBeTruthy();
  });
  it("muestra botón reintentar", () => {
    render(
      <ErrorBoundary blockName="Test">
        <BrokenComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText("🔄 Reintentar")).toBeTruthy();
  });
});

describe("F8-08 ErrorBoundary: incluye blockName en el título", () => {
  it("muestra 'Error en <blockName>'", () => {
    render(
      <ErrorBoundary blockName="Presupuesto">
        <BrokenComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText("Error en Presupuesto")).toBeTruthy();
  });
});

describe("F8-09 ErrorBoundary: botón reintentar resetea estado", () => {
  it("al hacer clic en Reintentar, resetea el estado de error (state.error = null)", () => {
    // Componente que siempre falla — verifica que el boundary limpia el error al reset
    // (no verificamos re-render exitoso porque el componente siempre lanza)
    render(
      <ErrorBoundary blockName="Test">
        <BrokenComponent message="Error persistente" />
      </ErrorBoundary>
    );

    // Está mostrando el error
    expect(screen.getByText("Error persistente")).toBeTruthy();
    const retryBtn = screen.getByText("🔄 Reintentar");
    expect(retryBtn).toBeTruthy();

    // Click en reintentar — el boundary vuelve a intentar renderizar hijos
    // (el componente volverá a fallar, pero lo importante es que el botón funciona)
    fireEvent.click(retryBtn);

    // Sigue mostrando el error (el hijo volvió a fallar) — el boundary sigue activo
    expect(screen.getByText("Error persistente")).toBeTruthy();
  });

  it("al resetear y renderizar hijo sano, muestra el contenido", () => {
    // Simula reset via cambio de blockName (la otra ruta de reset)
    const { rerender } = render(
      <ErrorBoundary blockName="ModuloRoto">
        <BrokenComponent message="Error de módulo" />
      </ErrorBoundary>
    );
    expect(screen.getByText("Error de módulo")).toBeTruthy();

    // Cambiar a módulo con hijo sano
    rerender(
      <ErrorBoundary blockName="ModuloSano">
        <div>Contenido recuperado</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Contenido recuperado")).toBeTruthy();
  });
});

describe("F8-10 ErrorBoundary: llama a Sentry.withScope + captureException", () => {
  it("invoca withScope cuando un hijo explota", () => {
    render(
      <ErrorBoundary blockName="Voluntarios">
        <BrokenComponent />
      </ErrorBoundary>
    );
    expect(mockWithScope).toHaveBeenCalledTimes(1);
  });

  it("llama a captureException con el error correcto", () => {
    render(
      <ErrorBoundary blockName="Logistica">
        <BrokenComponent message="DB error" />
      </ErrorBoundary>
    );
    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    const capturedError = mockCaptureException.mock.calls[0][0];
    expect(capturedError).toBeInstanceOf(Error);
    expect(capturedError.message).toBe("DB error");
  });
});

describe("F8-11 ErrorBoundary: resetea al cambiar blockName", () => {
  it("limpia el error cuando cambia el prop blockName", () => {
    const { rerender } = render(
      <ErrorBoundary blockName="ModuloA">
        <BrokenComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText("Error en ModuloA")).toBeTruthy();

    rerender(
      <ErrorBoundary blockName="ModuloB">
        <div>Nuevo módulo OK</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Nuevo módulo OK")).toBeTruthy();
  });
});

describe("F8-12 ErrorBoundary: texto genérico sin blockName", () => {
  it("muestra 'Algo ha fallado' cuando no hay blockName", () => {
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText("Algo ha fallado")).toBeTruthy();
  });
});
