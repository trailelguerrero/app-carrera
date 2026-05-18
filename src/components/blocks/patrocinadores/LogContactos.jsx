import { useState, useEffect } from "react";

// ─── LOG DE CONTACTOS ─────────────────────────────────────────────────────────
// CON-02/MEJ-04: Integrado con pat.historial en lugar de localStorage aislado.
// Los contactos manuales se guardan como entradas tipo:"contacto" en pat.historial,
// garantizando que se exportan al Excel, aparecen en el informe HTML y se eliminan
// al borrar el patrocinador.
//
// Props:
//   patId              — ID del patrocinador (solo se usa para migración de localStorage)
//   cfg                — Configuración de colores del nivel del patrocinador
//   onAddContacto      — Función callback: (patId, entrada) → void (de Patrocinadores.jsx)
//   historialContactos — Array de entradas tipo:"contacto" ya en pat.historial

export default function LogContactos({ patId, cfg, onAddContacto, historialContactos = [] }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ fecha: new Date().toISOString().split("T")[0], tipo: "Llamada", nota: "" });

  const TIPOS_LOG = ["Llamada", "Email", "Reunión", "WhatsApp", "Otro"];
  const TIPO_ICONS = { Llamada:"📞", Email:"✉️", Reunión:"🤝", WhatsApp:"💬", Otro:"📝" };

  // Migración: al montar, leer localStorage antiguo (teg_pat_log_<id>), volcar a pat.historial y borrar la clave.
  // Esto es retrocompatible y no fallará si ya fue migrado o si no hay datos previos.
  useEffect(() => {
    if (!patId || !onAddContacto) return;
    const LS_LOG_LEGACY = `teg_pat_log_${patId}`;
    try {
      const raw = localStorage.getItem(LS_LOG_LEGACY);
      if (!raw) return;
      const logs = JSON.parse(raw);
      if (!Array.isArray(logs) || logs.length === 0) { localStorage.removeItem(LS_LOG_LEGACY); return; }
      // Migrar cada entrada al historial del patrocinador
      logs.forEach(l => {
        onAddContacto(patId, {
          id: String(l.id || Date.now() + Math.random()),
          fecha: l.fecha ? new Date(l.fecha).toISOString() : new Date().toISOString(),
          tipo: "contacto",
          tipoContacto: l.tipo || "Otro",
          texto: l.nota || "(contacto migrado)",
          migrado: true,
        });
      });
      // Borrar del localStorage para no volver a migrar
      localStorage.removeItem(LS_LOG_LEGACY);
    } catch {
      // Si hay datos corruptos, simplemente borrar la clave
      try { localStorage.removeItem(`teg_pat_log_${patId}`); } catch { /* nada */ }
    }
  }, [patId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addLog = () => {
    if (!form.nota.trim() || !onAddContacto) return;
    const entrada = {
      id: String(Date.now()),
      fecha: new Date(form.fecha + "T12:00:00").toISOString(),
      tipo: "contacto",
      tipoContacto: form.tipo,
      texto: form.nota.trim(),
    };
    onAddContacto(patId, entrada);
    setForm({ fecha: new Date().toISOString().split("T")[0], tipo: "Llamada", nota: "" });
    setAdding(false);
  };

  // historialContactos es el array ya filtrado tipo:"contacto" de pat.historial
  // Ordenar de más reciente a más antiguo
  const safeLogs = [...historialContactos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

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
          <span style={{ fontSize:"var(--fs-base)", flexShrink:0, marginTop:".05rem" }}>{TIPO_ICONS[l.tipoContacto]||"📝"}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:"var(--fs-sm)", fontWeight:600, lineHeight:1.4 }}>{l.texto}</div>
            <div className="mono xs muted">{l.tipoContacto || "Contacto"} · {new Date(l.fecha).toLocaleDateString("es-ES")}</div>
          </div>
        </div>
      ))}
      {safeLogs.length > 5 && (
        <div className="mono xs muted" style={{ marginTop:".3rem" }}>+{safeLogs.length - 5} contactos más · ver en pestaña Historial</div>
      )}
    </div>
  );
}
