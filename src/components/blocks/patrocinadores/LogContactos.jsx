import { useState } from "react";
import { useData } from "@/hooks/useData";

// ─── LOG DE CONTACTOS ─────────────────────────────────────────────────────────
export default function LogContactos({ patId, cfg }) {
  const LS_LOG = `teg_pat_log_${patId}`;
  const [logs, setLogs] = useData(LS_LOG, []);
  const safeLogs = Array.isArray(logs) ? logs : [];
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ fecha: new Date().toISOString().split("T")[0], tipo: "Llamada", nota: "" });

  const TIPOS_LOG = ["Llamada", "Email", "Reunión", "WhatsApp", "Otro"];

  const addLog = () => {
    if (!form.nota.trim()) return;
    const nuevo = { id: Date.now(), ...form };
    setLogs([nuevo, ...safeLogs]);
    setForm({ fecha: new Date().toISOString().split("T")[0], tipo: "Llamada", nota: "" });
    setAdding(false);
  };

  const deleteLog = (id) => setLogs(safeLogs.filter(l => l.id !== id));

  const TIPO_ICONS = { Llamada:"📞", Email:"✉️", Reunión:"🤝", WhatsApp:"💬", Otro:"📝" };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:".4rem" }}>
        <div className="fl" style={{ margin:0 }}>📋 Log de contactos ({safeLogs.length})</div>
        <button className="btn btn-sm" style={{ background:cfg.dim, color:cfg.color, border:`1px solid ${cfg.border}` }}
          onClick={() => setAdding(v => !v)}>
          {adding ? "✕ Cancelar" : "+ Registrar"}
        </button>
      </div>

      {adding && (
        <div style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:8, padding:".65rem", marginBottom:".5rem", display:"flex", flexDirection:"column", gap:".45rem" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".5rem" }}>
            <input className="inp" type="date" value={form.fecha} onChange={e => setForm(p=>({...p,fecha:e.target.value}))} />
            <select className="inp" value={form.tipo} onChange={e => setForm(p=>({...p,tipo:e.target.value}))}>
              {TIPOS_LOG.map(t => <option key={t} value={t}>{TIPO_ICONS[t]} {t}</option>)}
            </select>
          </div>
          <input className="inp" placeholder="Resultado del contacto, próximo paso..." value={form.nota}
            onChange={e => setForm(p=>({...p,nota:e.target.value}))}
            onKeyDown={e => e.key === "Enter" && addLog()} />
          <div style={{ display:"flex", justifyContent:"flex-end", gap:".4rem" }}>
            <button className="btn btn-ghost" onClick={() => setAdding(false)}>Cancelar</button>
            <button className="btn" style={{ background:cfg.dim, color:cfg.color, border:`1px solid ${cfg.border}` }}
              onClick={addLog}>Guardar</button>
          </div>
        </div>
      )}

      {safeLogs.length === 0 && !adding && (
        <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)", color:"var(--text-dim)", padding:".4rem 0" }}>
          Sin contactos registrados
        </div>
      )}

      {safeLogs.slice(0, 5).map(l => (
        <div key={l.id} style={{ display:"flex", gap:".5rem", alignItems:"flex-start", padding:".35rem 0", borderBottom:"1px solid rgba(30,45,80,.2)" }}>
          <span style={{ fontSize:"var(--fs-base)", flexShrink:0, marginTop:".05rem" }}>{TIPO_ICONS[l.tipo]||"📝"}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:"var(--fs-sm)", fontWeight:600, lineHeight:1.4 }}>{l.nota}</div>
            <div className="mono xs muted">{l.tipo} · {l.fecha}</div>
          </div>
          <button className="btn btn-sm btn-red" style={{ flexShrink:0, opacity:.6 }}
            onClick={() => deleteLog(l.id)}>✕</button>
        </div>
      ))}
      {safeLogs.length > 5 && (
        <div className="mono xs muted" style={{ marginTop:".3rem" }}>+{safeLogs.length - 5} contactos más</div>
      )}
    </div>
  );
}
