const getTramoStatus = (fechaFin, fechaInicio) => {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  if (fechaInicio) {
    const start = new Date(fechaInicio);
    if (start > now) return { label: "Próximo", color: "#a78bfa", bg: "rgba(167,139,250,0.12)", glyph: "⏳" };
  }
  const end = new Date(fechaFin);
  const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)   return { label: "Cerrado",      color: "#f87171", bg: "rgba(248,113,113,0.12)", glyph: "🔒" };
  if (diffDays <= 7)  return { label: "Último plazo", color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  glyph: "⚡" };
  if (diffDays <= 30) return { label: "Activo",       color: "#34d399", bg: "rgba(52,211,153,0.12)",  glyph: "🟢" };
  return                     { label: "Abierto",      color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  glyph: "📅" };
};

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
};

export const TimelineTramos = ({ tramos }) => {
  if (!tramos.length) return null;
  return (
    <div className="card" style={{ padding: "1rem 1.25rem", marginBottom: "1rem" }}>
      <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)", fontWeight: 700, marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Línea temporal de tramos
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {tramos.map((t) => {
          const status = getTramoStatus(t.fechaFin, t.fechaInicio);
          return (
            <div key={t.id} style={{ flex: 1, minWidth: 0 }}>
              <div style={{ height: 8, borderRadius: 4, background: status.color, opacity: status.label === "Cerrado" ? 0.3 : 1, boxShadow: status.label !== "Cerrado" ? `0 0 8px ${status.color}80` : "none" }} />
              <div style={{ fontSize: "var(--fs-xs)", color: status.color, fontFamily: "var(--font-mono)", marginTop: 4, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.nombre}</div>
              <div style={{ fontSize: "var(--fs-2xs)", color: "var(--text-muted)" }}>{t.fechaInicio ? `${formatDate(t.fechaInicio)} → ` : ""}{formatDate(t.fechaFin)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export { getTramoStatus };
