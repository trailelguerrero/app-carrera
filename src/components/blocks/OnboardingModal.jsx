/**
 * OnboardingModal — aparece una sola vez en instalaciones nuevas.
 * Se marca como visto en localStorage ("teg_onboarding_done").
 * No toca ningún dato, solo orienta al organizador.
 */

const PASOS = [
  {
    n: 1, id: "dashboard", icon: "📊", color: "#6366f1",
    titulo: "Dashboard",
    desc: "Resumen ejecutivo del evento: inscripciones por distancia y tramo, ingresos vs. costes, cobertura de voluntarios y alertas activas. Acceso rápido a Día D desde aquí.",
  },
  {
    n: 2, id: "proyecto", icon: "🏔️", color: "#a78bfa",
    titulo: "Proyecto",
    desc: "Planificación completa: equipo y roles, cronograma de hitos, tareas por área (secretaría, señalización, avituallamiento…) y contactos clave. Navega directo a Logística o Voluntarios desde las tareas.",
  },
  {
    n: 3, id: "presupuesto", icon: "💰", color: "#34d399",
    titulo: "Presupuesto",
    desc: "Tramos de precio por distancia (TG7/TG13/TG25), inscritos estimados, costes fijos y variables. Ingresos extra (patrocinios, camisetas, subvenciones) sincronizados automáticamente. Calcula el P&L, el punto de equilibrio y permite simular escenarios hipotéticos.",
  },
  {
    n: 4, id: "voluntarios", icon: "👥", color: "#22d3ee",
    titulo: "Voluntarios",
    desc: "Crea los puestos de trabajo antes de abrir el formulario público. Gestiona la lista de voluntarios, asígnales puesto y talla de camiseta, y consulta la cobertura por puesto. En Día de Carrera: control de asistencia y QR de acceso personal.",
  },
  {
    n: 5, id: "logistica", icon: "📦", color: "#fbbf24",
    titulo: "Logística",
    desc: "Inventario de material por categoría, gestión de vehículos y conductores, localizaciones GPS del recorrido (avituallamientos, puntos de control), timeline del día de carrera y checklist por fases. Se conecta con Voluntarios para asignar material por puesto.",
  },
  {
    n: 6, id: "patrocinadores", icon: "🤝", color: "#fb923c",
    titulo: "Patrocinadores",
    desc: "Pipeline comercial completo: prospectos, comprometidos y cobrados. Distingue entre patrocinadores en especie y monetarios. Los importes comprometidos se sincronizan automáticamente con el Presupuesto (patrocinios + subvenciones públicas).",
  },
  {
    n: 7, id: "camisetas", icon: "👕", color: "#f472b6",
    titulo: "Camisetas",
    desc: "Consolida tallas de corredores (por distancia), voluntarios y extras (no-corredores con precio de venta editable). Calcula automáticamente el pedido al proveedor con margen de seguridad. El balance de camisetas técnicas se sincroniza con el Presupuesto.",
  },
  {
    n: 8, id: "documentos", icon: "📁", color: "#94a3b8",
    titulo: "Documentos",
    desc: "Repositorio de archivos del evento: autorizaciones, seguros, reglamentos, planos del recorrido y cualquier documento del equipo. Organiza por categorías y busca por nombre. Soporta subida de PDFs, imágenes y otros formatos.",
  },
  {
    n: 9, id: "configuracion", icon: "⚙️", color: "#64748b",
    titulo: "Configuración",
    desc: "Ajusta los datos del evento (nombre, fecha, distancias disponibles), parámetros globales de la app y opciones de exportación. Desde aquí también puedes resetear los datos de cualquier módulo o exportar un backup completo.",
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
        background: "var(--bg)", border: "1px solid #243460",
        borderRadius: 18, width: "100%", maxWidth: 520,
        maxHeight: "92vh", overflow: "hidden",
        display: "flex", flexDirection: "column",
        boxShadow: "0 32px 80px rgba(0,0,0,0.75)",
        animation: "ob-slide 0.28s ease",
      }}>

        {/* Header */}
        <div style={{
          padding: "1.4rem 1.6rem 1rem",
          borderBottom: "1px solid #1e2d50",
        }}>
          <div style={{ fontSize: "var(--fs-xl)", marginBottom: ".5rem" }}>👋</div>
          <div style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 800,
            fontSize: "var(--fs-lg)", color: "#e8eef8", marginBottom: ".4rem",
          }}>
            Bienvenido a la app de Trail El Guerrero
          </div>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)",
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
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
            color: "#3a4a6a", textTransform: "uppercase", letterSpacing: ".1em",
            marginBottom: ".65rem",
          }}>
            Módulos disponibles — haz clic para ir directamente
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
                fontSize: "var(--fs-md)",
              }}>
                {p.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".2rem" }}>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                    fontWeight: 700, color: p.color,
                    background: `${p.color}15`, border: `1px solid ${p.color}30`,
                    padding: ".05rem .35rem", borderRadius: 3,
                  }}>
                    {p.n}
                  </span>
                  <span style={{
                    fontFamily: "'Syne', sans-serif", fontWeight: 700,
                    fontSize: "var(--fs-base)", color: "#e8eef8",
                  }}>
                    {p.titulo}
                  </span>
                </div>
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)",
                  color: "#5a6a8a", lineHeight: 1.55,
                }}>
                  {p.desc}
                </div>
              </div>
              <span style={{ color: "#3a4a6a", fontSize: "var(--fs-base)", flexShrink: 0, alignSelf: "center" }}>›</span>
            </div>
          ))}

          <div style={{
            marginTop: ".85rem", padding: ".6rem .85rem",
            background: "rgba(34,211,238,0.04)", border: "1px solid rgba(34,211,238,0.15)",
            borderRadius: 8,
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
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
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
            color: "#3a4a6a",
          }}>
            {PASOS.length} módulos · Haz clic en uno para ir directamente
          </span>
          <button
            onClick={onClose}
            style={{
              background: "rgba(99,102,241,0.15)", color: "#a78bfa",
              border: "1px solid rgba(99,102,241,0.3)", borderRadius: 8,
              padding: ".5rem 1.25rem",
              fontFamily: "'Syne', sans-serif", fontWeight: 700,
              fontSize: "var(--fs-base)", cursor: "pointer", transition: "all .15s",
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
