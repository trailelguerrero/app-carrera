/**
 * SkeletonBlock.jsx — Fase 6, Tarea 6.1
 *
 * Skeleton loader genérico para los bloques del panel.
 * Imita la geometría real de cada bloque para evitar CLS.
 * Usa la clase .skel definida en src/styles/blocks.css (shimmer CSS puro).
 *
 * Uso:
 *   import SkeletonBlock from "@/components/common/SkeletonBlock";
 *   if (isLoading) return <SkeletonBlock variant="voluntarios" />;
 *
 * Variantes: "voluntarios" | "presupuesto" | "patrocinadores" | "documentos" | "default"
 */

/** Fila de skeleton para una tabla/lista */
function SkelRow({ widths = ["40%", "25%", "20%"] }) {
  return (
    <div style={{ display: "flex", gap: ".65rem", alignItems: "center", marginBottom: ".5rem" }}>
      {widths.map((w, i) => (
        <div key={i} className="skel" style={{ width: w, height: 11, flexShrink: 0 }} />
      ))}
    </div>
  );
}

/** Header estándar de bloque */
function SkelHeader({ titleWidth = 160, subtitleWidth = 120, badgeCount = 2 }) {
  return (
    <div className="block-header" style={{ marginBottom: "1rem" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
        <div className="skel" style={{ width: titleWidth, height: 22 }} />
        <div className="skel" style={{ width: subtitleWidth, height: 12 }} />
      </div>
      <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
        {Array.from({ length: badgeCount }).map((_, i) => (
          <div key={i} className="skel" style={{ width: 64 + i * 16, height: 22, borderRadius: 99 }} />
        ))}
      </div>
    </div>
  );
}

/** Tarjeta KPI simple */
function SkelKpi() {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", padding: ".85rem", display: "flex",
      flexDirection: "column", gap: ".45rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div className="skel" style={{ width: 70, height: 10 }} />
        <div className="skel" style={{ width: 18, height: 10, borderRadius: 99 }} />
      </div>
      <div className="skel" style={{ width: "55%", height: 26 }} />
      <div className="skel" style={{ width: "80%", height: 9 }} />
      <div className="skel" style={{ width: "100%", height: 3, borderRadius: 99 }} />
    </div>
  );
}

/** Tabs skeleton */
function SkelTabs({ count = 4 }) {
  return (
    <div style={{ display: "flex", gap: ".4rem", marginBottom: "1rem" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skel" style={{ width: 72 + i * 8, height: 32, borderRadius: 8 }} />
      ))}
    </div>
  );
}

// ── Variantes ────────────────────────────────────────────────────────────────

function SkeletonVoluntarios() {
  return (
    <div className="block-container">
      <SkelHeader titleWidth={140} subtitleWidth={200} badgeCount={2} />
      {/* Stats strip */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
        gap: ".65rem", marginBottom: "1rem",
      }}>
        {[1, 2, 3, 4].map(i => <SkelKpi key={i} />)}
      </div>
      {/* Tabs */}
      <SkelTabs count={4} />
      {/* Lista de voluntarios */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: ".85rem 1rem" }}>
        <div className="skel" style={{ width: 110, height: 12, marginBottom: ".85rem" }} />
        {[1, 2, 3, 4, 5].map(i => (
          <SkelRow key={i} widths={["28px", "35%", "20%", "15%", "12%"]} />
        ))}
      </div>
    </div>
  );
}

function SkeletonPresupuesto() {
  return (
    <div className="block-container">
      <SkelHeader titleWidth={150} subtitleWidth={220} badgeCount={1} />
      {/* Barra de resultado */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius)", padding: "1rem", marginBottom: "1rem",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".6rem" }}>
          <div className="skel" style={{ width: 130, height: 13 }} />
          <div className="skel" style={{ width: 80, height: 22, borderRadius: 6 }} />
        </div>
        <div className="skel" style={{ width: "100%", height: 8, borderRadius: 99 }} />
      </div>
      {/* KPI grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: ".65rem", marginBottom: "1rem",
      }}>
        {[1, 2, 3, 4].map(i => <SkelKpi key={i} />)}
      </div>
      {/* Tabs */}
      <SkelTabs count={5} />
      {/* Tabla conceptos */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: ".85rem 1rem" }}>
        {[1, 2, 3, 4].map(i => (
          <SkelRow key={i} widths={["35%", "20%", "20%", "15%"]} />
        ))}
      </div>
    </div>
  );
}

function SkeletonPatrocinadores() {
  return (
    <div className="block-container">
      <SkelHeader titleWidth={160} subtitleWidth={190} badgeCount={3} />
      {/* Tabs */}
      <SkelTabs count={5} />
      {/* KPI strip */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
        gap: ".65rem", marginBottom: "1rem",
      }}>
        {[1, 2, 3].map(i => <SkelKpi key={i} />)}
      </div>
      {/* Barra de progreso objetivo */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius)", padding: "1rem", marginBottom: "1rem",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".5rem" }}>
          <div className="skel" style={{ width: 120, height: 12 }} />
          <div className="skel" style={{ width: 60, height: 20, borderRadius: 6 }} />
        </div>
        <div className="skel" style={{ width: "100%", height: 8, borderRadius: 99 }} />
      </div>
      {/* Lista patrocinadores */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: ".85rem 1rem" }}>
        {[1, 2, 3, 4].map(i => (
          <SkelRow key={i} widths={["30%", "18%", "18%", "14%", "10%"]} />
        ))}
      </div>
    </div>
  );
}

function SkeletonDocumentos() {
  return (
    <div className="block-container">
      <SkelHeader titleWidth={130} subtitleWidth={200} badgeCount={2} />
      {/* Tabs */}
      <SkelTabs count={3} />
      {/* Filtros */}
      <div style={{ display: "flex", gap: ".5rem", marginBottom: "1rem" }}>
        <div className="skel" style={{ flex: 1, height: 34, borderRadius: 8 }} />
        <div className="skel" style={{ width: 100, height: 34, borderRadius: 8 }} />
        <div className="skel" style={{ width: 80, height: 34, borderRadius: 8 }} />
      </div>
      {/* Lista documentos */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: ".85rem 1rem" }}>
        <div className="skel" style={{ width: 90, height: 12, marginBottom: ".85rem" }} />
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{
            display: "flex", gap: ".75rem", alignItems: "center",
            padding: ".5rem 0", borderBottom: "1px solid var(--border)",
          }}>
            <div className="skel" style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: ".3rem" }}>
              <div className="skel" style={{ width: "50%", height: 11 }} />
              <div className="skel" style={{ width: "30%", height: 9 }} />
            </div>
            <div className="skel" style={{ width: 60, height: 20, borderRadius: 99, flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonDashboard() {
  return (
    <div className="block-container">
      <SkelHeader titleWidth={160} subtitleWidth={120} badgeCount={0} />
      {/* Barra de salud */}
      <div className="card mb">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".65rem" }}>
          <div className="skel" style={{ width: 140, height: 14 }} />
          <div className="skel" style={{ width: 48, height: 20, borderRadius: 6 }} />
        </div>
        <div className="skel" style={{ width: "100%", height: 8, borderRadius: 99 }} />
      </div>
      {/* KPI grid — 6 tarjetas */}
      <div className="kpi-grid mb">
        {[1, 2, 3, 4, 5, 6].map(i => <SkelKpi key={i} />)}
      </div>
      {/* Timeline */}
      <div className="card mb" style={{ padding: ".85rem 1rem" }}>
        <div className="skel" style={{ width: 120, height: 13, marginBottom: ".75rem" }} />
        {[1, 2, 3].map(i => (
          <div key={i} style={{ display: "flex", gap: ".65rem", alignItems: "center", marginBottom: ".5rem" }}>
            <div className="skel" style={{ width: 42, height: 11, flexShrink: 0 }} />
            <div className="skel" style={{ flex: 1, height: 11 }} />
            <div className="skel" style={{ width: 60, height: 11, flexShrink: 0 }} />
          </div>
        ))}
      </div>
      {/* Alertas */}
      <div className="card" style={{ padding: ".75rem 1rem" }}>
        <div className="skel" style={{ width: 100, height: 13, marginBottom: ".65rem" }} />
        {[1, 2].map(i => (
          <div key={i} style={{ display: "flex", gap: ".5rem", alignItems: "center", marginBottom: ".4rem" }}>
            <div className="skel" style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0 }} />
            <div className="skel" style={{ flex: 1, height: 11 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonDefault() {
  return (
    <div className="block-container">
      <SkelHeader />
      <SkelTabs count={3} />
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1rem" }}>
        {[1, 2, 3, 4].map(i => <SkelRow key={i} />)}
      </div>
    </div>
  );
}

// ── Export principal ─────────────────────────────────────────────────────────

const VARIANTS = {
  dashboard:      SkeletonDashboard,
  voluntarios:    SkeletonVoluntarios,
  presupuesto:    SkeletonPresupuesto,
  patrocinadores: SkeletonPatrocinadores,
  documentos:     SkeletonDocumentos,
};

/**
 * @param {{ variant?: "dashboard"|"voluntarios"|"presupuesto"|"patrocinadores"|"documentos"|"default" }} props
 */
export default function SkeletonBlock({ variant = "default" }) {
  const Component = VARIANTS[variant] ?? SkeletonDefault;
  return <Component />;
}
