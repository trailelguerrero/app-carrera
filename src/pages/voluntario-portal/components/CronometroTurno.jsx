import { useState, useEffect } from "react";

export function CronometroTurno({ voluntario: v, puesto, marcarSalida, marcando }) {
  const [ahora, setAhora] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const calcMin = () => {
    if (!v.horaLlegada) return null;
    const [hh, mm] = v.horaLlegada.split(":").map(Number);
    const hoy = new Date();
    const llegada = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), hh, mm, 0);
    return Math.max(0, Math.floor((ahora - llegada.getTime()) / 60000));
  };

  const mins = calcMin();
  const horas = mins !== null ? Math.floor(mins / 60) : null;
  const minResto = mins !== null ? mins % 60 : null;
  const tieneTurno = puesto?.horaFin;

  let pctTurno = 0;
  if (puesto?.horaInicio && puesto?.horaFin) {
    const toMins = h => { const [hh, mm] = h.split(":").map(Number); return hh * 60 + mm; };
    const fin = toMins(puesto.horaFin);
    const [hh2, mm2] = v.horaLlegada.split(":").map(Number);
    const llegMin = hh2 * 60 + mm2;
    const ahMin = new Date(ahora).getHours() * 60 + new Date(ahora).getMinutes();
    pctTurno = Math.min(100, Math.max(0, Math.round((ahMin - llegMin) / Math.max(1, fin - llegMin) * 100)));
  }

  return (
    <div style={{ marginBottom: ".85rem", padding: ".75rem 1rem",
      background: "rgba(52,211,153,.07)", border: "1px solid var(--green-border)",
      borderRadius: 10, textAlign: "center" }}>
      <div style={{ fontWeight: 700, color: "var(--green)", fontSize: "var(--fs-md)", marginBottom: ".3rem" }}>
        ✅ En tu puesto desde las {v.horaLlegada}
      </div>
      {mins !== null && (
        <div className="vp-mono" style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: tieneTurno ? ".5rem" : 0 }}>
          {horas > 0 ? `${horas}h ${minResto}min` : `${minResto} min`} en el puesto
        </div>
      )}
      {tieneTurno && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between",
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)",
            marginBottom: ".25rem" }}>
            <span>{puesto.horaInicio}</span>
            <span style={{ color: "var(--green)" }}>Tu turno termina a las {puesto.horaFin}</span>
          </div>
          <div style={{ height: 5, background: "var(--surface2)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pctTurno}%`, background: "var(--green)", borderRadius: 3, transition: "width 1s" }} />
          </div>
        </>
      )}
      <button
        onClick={marcarSalida} disabled={marcando}
        style={{ marginTop: ".65rem", width: "100%", padding: ".4rem",
          fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
          background: "rgba(248,113,113,.08)", color: "var(--red)",
          border: "1px solid rgba(248,113,113,.2)", borderRadius: 6, cursor: "pointer" }}>
        {marcando ? "Registrando…" : "✋ Salir del puesto"}
      </button>
    </div>
  );
}
