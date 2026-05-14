/**
 * DiaCarreraPage.jsx — [LOG-03] F9
 * Ruta /dia-carrera: panel Día de Carrera en pantalla completa, sin sidebar.
 * Pensado para tablets dedicadas en la mesa de control.
 *
 * Autenticación: mismo PIN que el panel (PinScreen + checkSession).
 * Contenido: DiaCarrera.jsx montado directamente, sin overlay.
 */
import { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import PinScreen from "@/components/auth/PinScreen";
import { checkSession } from "@/components/auth/pinAuth.js";

// Carga lazy igual que en Index.jsx para no bloquear el bundle inicial
const DiaCarrera = lazy(() => import("../components/blocks/DiaCarrera"));

export default function DiaCarreraPage() {
  const [authed, setAuthed] = useState(() => checkSession());
  const navigate = useNavigate();

  // ── Pantalla de PIN ───────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight: "100dvh", background: "var(--bg)" }}>
        {/* Cabecera mínima para orientar al usuario */}
        <div style={{
          padding: "1rem 1.25rem .75rem",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: ".75rem",
          background: "var(--surface)",
        }}>
          <span style={{ fontSize: "1.4rem" }}>🏁</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: "var(--fs-base)", color: "var(--text)" }}>
              Día de Carrera
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)" }}>
              Trail El Guerrero 2026 · Panel operativo
            </div>
          </div>
        </div>
        <PinScreen onUnlock={() => setAuthed(true)} />
      </div>
    );
  }

  // ── Panel operativo ───────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Cabecera con botón de salida — útil en tablet */}
      <div style={{
        padding: ".6rem 1rem",
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
          <span style={{ fontSize: "1.2rem" }}>🏁</span>
          <span style={{ fontWeight: 700, fontSize: "var(--fs-base)", color: "var(--text)" }}>
            Día de Carrera
          </span>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
            color: "var(--text-dim)", display: "none",
          }}
            className="dia-carrera-subtitle"
          >
            Trail El Guerrero 2026
          </span>
        </div>
        <button
          onClick={() => navigate("/panel")}
          style={{
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)",
            padding: ".3rem .75rem", borderRadius: "var(--r-sm)",
            border: "1px solid var(--border)", background: "var(--surface2)",
            color: "var(--text-muted)", cursor: "pointer",
          }}
        >
          ← Panel
        </button>
      </div>

      {/* Contenido: DiaCarrera montado directamente, sin overlay */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <Suspense fallback={
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            height: "60dvh", color: "var(--text-dim)",
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)",
          }}>
            <div className="teg-spinner" style={{ marginRight: ".6rem" }} /> Cargando…
          </div>
        }>
          {/* onClose navega al panel principal */}
          <DiaCarrera onClose={() => navigate("/panel")} />
        </Suspense>
      </div>
    </div>
  );
}
