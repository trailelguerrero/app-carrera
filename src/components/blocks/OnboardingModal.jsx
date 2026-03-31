/**
 * OnboardingModal — aparece una sola vez en instalaciones nuevas.
 * Se marca como visto en localStorage ("teg_onboarding_done").
 * No toca ningún dato, solo orienta al organizador.
 */

const PASOS = [
  {
    n: 1, id: "proyecto", icon: "🏔️", color: "#a78bfa",
    titulo: "Proyecto",
    desc: "Define el equipo, los hitos clave y las tareas por área. Es el punto de control de todo lo demás.",
  },
  {
    n: 2, id: "presupuesto", icon: "💰", color: "#34d399",
    titulo: "Presupuesto",
    desc: "Configura los tramos de precio, los inscritos estimados y todos los costes. El P&L y el punto de equilibrio se calculan solos.",
  },
  {
    n: 3, id: "voluntarios", icon: "👥", color: "#22d3ee",
    titulo: "Voluntarios",
    desc: "Crea los puestos antes de abrir el formulario público. Así los voluntarios ya pueden elegir dónde quieren ayudar.",
  },
  {
    n: 4, id: "logistica", icon: "📦", color: "#fbbf24",
    titulo: "Logística",
    desc: "Inventario de material, vehículos, timeline del día y checklist por fases. Lo último en configurar, lo primero en usar el día de carrera.",
  },
  {
    n: 5, id: "patrocinadores", icon: "🤝", color: "#fb923c",
    titulo: "Patrocinadores",
    desc: "Pipeline comercial. Los importes confirmados se sincronizan automáticamente con el Presupuesto.",
  },
];

export default function OnboardingModal({ onClose, onNavigate }) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
        animation: "ob-fade 0.25s ease",
      }}
    >
      <style>{`
        @keyframes ob-fade    { from{opacity:0} to{opacity:1} }
        @keyframes ob-slide   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        .ob-step { display:flex; align-items:flex-start; gap:.75rem; padding:.65rem .85rem;
          border-radius:10px; cursor:pointer; transition:all .15s; border:1px solid transparent; }
        .ob-step:hover { border-color:var(--border-light); background:rgba(255,255,255,.03); transform:translateX(3px); }
      `}</style>

      <div style={{
        background: "#0f1629", border: "1px solid #243460",
        borderRadius: 18, width: "100%", maxWidth: 500,
        maxHeight: "90vh", overflow: "hidden",
        display: "flex", flexDirection: "column",
        boxShadow: "0 32px 80px rgba(0,0,0,0.75)",
        animation: "ob-slide 0.28s ease",
      }}>

        {/* Header */}
        <div style={{
          padding: "1.4rem 1.6rem 1rem",
          borderBottom: "1px solid #1e2d50",
        }}>
          <div style={{ fontSize: "2rem", marginBottom: ".5rem" }}>👋</div>
          <div style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 800,
            fontSize: "1.15rem", color: "#e8eef8", marginBottom: ".4rem",
          }}>
            Bienvenido a la app de Trail El Guerrero
          </div>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: ".7rem",
            color: "#5a6a8a", lineHeight: 1.6,
          }}>
            Los datos que ves ahora son ejemplos de configuración.
            Edítalos directamente o bórralos desde cada bloque.
            Este mensaje solo aparece una vez.
          </div>
        </div>

        {/* Pasos */}
        <div style={{ padding: "1rem 1.2rem", overflowY: "auto", flex: 1 }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: ".62rem",
            color: "#3a4a6a", textTransform: "uppercase", letterSpacing: ".1em",
            marginBottom: ".65rem",
          }}>
            Orden de configuración recomendado
          </div>

          {PASOS.map((p, i) => (
            <div
              key={p.id}
              className="ob-step"
              onClick={() => onNavigate(p.id)}
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: `${p.color}18`, border: `1px solid ${p.color}33`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1rem",
              }}>
                {p.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".2rem" }}>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: ".55rem",
                    fontWeight: 700, color: p.color,
                    background: `${p.color}15`, border: `1px solid ${p.color}30`,
                    padding: ".05rem .35rem", borderRadius: 3,
                  }}>
                    {p.n}
                  </span>
                  <span style={{
                    fontFamily: "'Syne', sans-serif", fontWeight: 700,
                    fontSize: ".82rem", color: "#e8eef8",
                  }}>
                    {p.titulo}
                  </span>
                </div>
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: ".65rem",
                  color: "#5a6a8a", lineHeight: 1.55,
                }}>
                  {p.desc}
                </div>
              </div>
              <span style={{ color: "#3a4a6a", fontSize: ".8rem", flexShrink: 0, alignSelf: "center" }}>›</span>
            </div>
          ))}

          <div style={{
            marginTop: ".85rem", padding: ".6rem .85rem",
            background: "rgba(34,211,238,0.04)", border: "1px solid rgba(34,211,238,0.15)",
            borderRadius: 8,
            fontFamily: "var(--font-mono)", fontSize: ".63rem",
            color: "#5a6a8a", lineHeight: 1.6,
          }}>
            💡 En cada bloque tienes el botón <span style={{
              color: "#a78bfa", background: "rgba(167,139,250,0.12)",
              padding: ".05rem .3rem", borderRadius: 3, fontWeight: 700,
            }}>📖 README</span> en la barra superior para ver cómo funciona ese bloque.
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: ".9rem 1.6rem",
          borderTop: "1px solid #1e2d50",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          gap: ".75rem",
        }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: ".6rem",
            color: "#3a4a6a",
          }}>
            Haz clic en un paso para ir directamente
          </span>
          <button
            onClick={onClose}
            style={{
              background: "rgba(99,102,241,0.15)", color: "#a78bfa",
              border: "1px solid rgba(99,102,241,0.3)", borderRadius: 8,
              padding: ".5rem 1.25rem",
              fontFamily: "'Syne', sans-serif", fontWeight: 700,
              fontSize: ".78rem", cursor: "pointer", transition: "all .15s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,0.25)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(99,102,241,0.15)"}
          >
            Entendido →
          </button>
        </div>
      </div>
    </div>
  );
}
