import { useState } from "react";
import { API_BASE } from "../lib/session";

export function CancelarAsistencia({ token, nombreVoluntario, onCancelado }) {
  const [open,   setOpen]   = useState(false);
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const cancelar = async () => {
    setSaving(true); setError("");
    try {
      const res = await fetch(`${API_BASE}?action=cancelar`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivo.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) { setOpen(false); onCancelado(); }
      else setError(json.error || "Error al procesar la solicitud.");
    } catch { setError("Error de conexión. Inténtalo de nuevo."); }
    finally { setSaving(false); }
  };

  if (!open) return (
    <button className="vp-btn vp-btn-ghost"
      style={{ fontSize:".78rem", minHeight:40, color:"var(--red)", borderColor:"rgba(248,113,113,.25)",
        marginBottom:".75rem" }}
      onClick={() => setOpen(true)}>
      ⚠️ No puedo asistir al evento
    </button>
  );

  return (
    <div className="vp-card" style={{ borderLeft:"3px solid var(--red)", marginBottom:".75rem" }}>
      <div className="vp-card-header">
        <div className="vp-mono" style={{ fontWeight:700, fontSize:".88rem", color:"var(--red)" }}>
          ⚠️ Cancelar asistencia
        </div>
        <button className="vp-btn vp-btn-ghost vp-btn-sm" onClick={() => setOpen(false)}>✕</button>
      </div>
      <div className="vp-mono" style={{ fontSize:".78rem", color:"var(--text-muted)", lineHeight:1.65, marginBottom:".75rem" }}>
        Hola {nombreVoluntario}, lamentamos que no puedas asistir. El organizador recibirá un aviso
        para reorganizar el puesto.
      </div>
      <div className="vp-label">Motivo (opcional)</div>
      <textarea className="vp-textarea"
        placeholder="Ej: Lesión, compromisos de trabajo, problemas de transporte…"
        value={motivo}
        onChange={e => setMotivo(e.target.value)}
        maxLength={300}
        style={{ marginBottom:".75rem", minHeight:80 }} />
      {error && <div className="vp-error" style={{ marginBottom:".75rem" }}>⚠ {error}</div>}
      <div style={{ display:"flex", gap:".5rem" }}>
        <button className="vp-btn vp-btn-ghost" style={{ minHeight:48 }}
          onClick={() => setOpen(false)}>Volver</button>
        <button className="vp-btn"
          style={{ minHeight:48, background:"var(--red)", color:"#fff", flex:1 }}
          onClick={cancelar} disabled={saving}>
          {saving ? "Procesando…" : "Confirmar — No puedo asistir"}
        </button>
      </div>
    </div>
  );
}
