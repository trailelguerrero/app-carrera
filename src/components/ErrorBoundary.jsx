import { Component } from "react";

/**
 * Error Boundary — atrapa errores en cualquier bloque hijo.
 * Si un bloque explota, muestra un mensaje de error útil
 * en lugar de pantalla blanca, y permite reintentarlo.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error("[ErrorBoundary]", error, info?.componentStack);
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
          fontFamily: "'Syne', sans-serif", fontWeight: 800,
          fontSize: "1rem", color: "var(--text)",
        }}>
          {blockName ? `Error en ${blockName}` : "Algo ha fallado"}
        </div>

        {/* Mensaje técnico */}
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: "0.7rem",
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
              padding: "0.5rem 1.2rem", fontFamily: "'Syne', sans-serif",
              fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
            }}>
            🔄 Reintentar
          </button>
          {onNavigate && (
            <button
              onClick={() => { this.reset(); onNavigate("dashboard"); }}
              style={{
                background: "var(--surface2)", color: "var(--text-muted)",
                border: "1px solid var(--border)", borderRadius: 8,
                padding: "0.5rem 1.2rem", fontFamily: "'Syne', sans-serif",
                fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
              }}>
              📊 Ir al Dashboard
            </button>
          )}
        </div>

        {/* Stack colapsable solo en desarrollo */}
        {import.meta.env.DEV && stack && (
          <details style={{ maxWidth: 500, textAlign: "left", marginTop: "0.5rem" }}>
            <summary style={{
              fontFamily: "'DM Mono', monospace", fontSize: "0.62rem",
              color: "var(--text-dim)", cursor: "pointer",
            }}>
              Ver stack trace
            </summary>
            <pre style={{
              fontFamily: "'DM Mono', monospace", fontSize: "0.58rem",
              color: "var(--text-dim)", marginTop: "0.5rem",
              overflow: "auto", maxHeight: 200,
            }}>{stack}</pre>
          </details>
        )}
      </div>
    );
  }
}
