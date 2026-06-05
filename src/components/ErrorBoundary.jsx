import { Component } from "react";
import * as Sentry from "@sentry/react";

/**
 * Error Boundary — atrapa errores en cualquier bloque hijo.
 * Si un bloque explota, muestra un mensaje de error útil
 * en lugar de pantalla blanca, y permite reintentarlo.
 *
 * Mejoras Fase 8:
 * - withScope para enriquecer el evento de Sentry con contexto del módulo
 * - Nivel de severidad "error" explícito
 * - No se filtran datos sensibles aquí (el scrubber beforeSend de main.tsx los cubre)
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  // Auto-reset cuando cambia el módulo (blockName) — cubre navegación y HMR
  static getDerivedStateFromProps(nextProps, prevState) {
    if (prevState.error && nextProps.blockName !== prevState.blockName) {
      return { error: null, info: null, blockName: nextProps.blockName };
    }
    if (nextProps.blockName !== prevState.blockName) {
      return { blockName: nextProps.blockName }; 
    }
    return null;
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error("[ErrorBoundary]", error, info?.componentStack);

    // Reportar a Sentry con contexto enriquecido del módulo que falló
    Sentry.withScope((scope) => {
      const blockName = this.props.blockName || "unknown";
      // Tag indexable en Sentry para filtrar por módulo
      scope.setTag("blockName", blockName);
      scope.setTag("errorBoundary", true);
      // Contexto extra con el stack del árbol de React
      scope.setContext("react", {
        componentStack: info?.componentStack ?? "(no stack)",
      });
      // Nivel: siempre "error" (ya que el boundary solo se dispara en throws)
      scope.setLevel("error");
      Sentry.captureException(error);
    });
  }

  reset() {
    this.setState({ error: null, info: null });
  }

  render() {
    const { error, info } = this.state;
    const { blockName, onNavigate } = this.props;

    if (!error) return this.props.children;

    const msg   = error?.message || String(error);
    const stack = info?.componentStack || "";

    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "60vh", padding: "2rem",
        textAlign: "center", gap: "1rem",
      }}>
        {/* Icono */}
        <div style={{ fontSize: "3rem" }}>⚠️</div>

        {/* Título */}
        <div style={{
          fontFamily: "var(--font-display)", fontWeight: 800,
          fontSize: "1rem", color: "var(--text)",
        }}>
          {blockName ? `Error en ${blockName}` : "Algo ha fallado"}
        </div>

        {/* Mensaje técnico */}
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
          color: "var(--text-muted)", maxWidth: 400, lineHeight: 1.6,
          background: "var(--surface2)", borderRadius: 8,
          padding: "0.65rem 1rem", border: "1px solid var(--border)",
          wordBreak: "break-word", textAlign: "left",
        }}>
          {msg}
        </div>

        {/* Acciones */}
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={() => this.reset()}
            style={{
              background: "rgba(34,211,238,0.12)", color: "var(--cyan)",
              border: "1px solid rgba(34,211,238,0.3)", borderRadius: 8,
              padding: "0.5rem 1.2rem", fontFamily: "var(--font-display)",
              fontWeight: 700, fontSize: "var(--fs-sm)", cursor: "pointer",
            }}>
            🔄 Reintentar
          </button>
          {onNavigate && (
            <button
              onClick={() => { this.reset(); onNavigate("dashboard"); }}
              style={{
                background: "var(--surface2)", color: "var(--text-muted)",
                border: "1px solid var(--border)", borderRadius: 8,
                padding: "0.5rem 1.2rem", fontFamily: "var(--font-display)",
                fontWeight: 700, fontSize: "var(--fs-sm)", cursor: "pointer",
              }}>
              📊 Ir al Dashboard
            </button>
          )}
        </div>

        {/* Stack colapsable solo en desarrollo */}
        {import.meta.env.DEV && stack && (
          <details style={{ maxWidth: 500, textAlign: "left", marginTop: "0.5rem" }}>
            <summary style={{
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
              color: "var(--text-dim)", cursor: "pointer",
            }}>
              Ver stack trace
            </summary>
            <pre style={{
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-2xs)",
              color: "var(--text-dim)", marginTop: "0.5rem",
              overflow: "auto", maxHeight: 200,
            }}>{stack}</pre>
          </details>
        )}
      </div>
    );
  }
}
