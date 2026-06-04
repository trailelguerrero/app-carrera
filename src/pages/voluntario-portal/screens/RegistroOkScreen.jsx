export function RegistroOkScreen({ telefono, nombre, onAcceder }) {
  const pin = telefono.replace(/\D/g,"").slice(-4) || "????";

  return (
    <div className="vp-page">
      
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
        padding:"2rem 1.25rem",
        background:"radial-gradient(ellipse 60% 40% at 50% 0%, rgba(52,211,153,0.1) 0%, transparent 60%)" }}>
        <div style={{ maxWidth:420, width:"100%", animation:"fadeUp .5s ease both" }}>

          <div style={{ textAlign:"center", marginBottom:"1.75rem" }}>
            <div style={{ fontSize:"3.5rem", marginBottom:".75rem" }}>🎉</div>
            <div style={{ fontWeight:800, fontSize:"1.5rem", color:"var(--green)",
              fontFamily:"var(--font-display)", marginBottom:".5rem" }}>
              ¡Registro completado!
            </div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:".82rem",
              color:"var(--text-muted)", lineHeight:1.7 }}>
              {nombre ? `Hola ${nombre.split(" ")[0]}, ` : ""}hemos recibido tu solicitud.<br/>
              El equipo organizador se pondrá en contacto contigo próximamente.
            </div>
          </div>

          <div className="vp-card" style={{ borderLeft:"3px solid var(--cyan)", marginBottom:"1rem" }}>
            <div className="vp-label" style={{ color:"var(--cyan)" }}>📱 Cómo acceder a tu ficha</div>
            <div style={{ display:"flex", flexDirection:"column", gap:".6rem" }}>
              {[
                ["1. Esta misma página", "Vuelve aquí cuando quieras"],
                ["2. Tu teléfono",  telefono],
                ["3. PIN inicial",  pin + " (últimos 4 dígitos de tu tel.)"],
              ].map(([k,v]) => (
                <div key={k} className="vp-row" style={{ padding:".3rem 0" }}>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:".72rem", color:"var(--text-muted)" }}>{k}</span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:".8rem",
                    fontWeight:700, color: k.includes("PIN") ? "var(--cyan)" : "var(--text)" }}>{v}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => { navigator.clipboard?.writeText(window.location.href); }}
              style={{ marginTop:".85rem", width:"100%", padding:".5rem",
                background:"var(--cyan-dim)", color:"var(--cyan)",
                border:"1px solid var(--cyan-border)", borderRadius:8,
                fontFamily:"var(--font-mono)", fontSize:".75rem", fontWeight:700,
                cursor:"pointer" }}>
              📋 Guardar enlace de esta página
            </button>
          </div>

          <button className="vp-btn vp-btn-success" onClick={onAcceder}
            style={{ marginBottom:".75rem" }}>
            👤 Acceder ahora a mi ficha
          </button>
          <button className="vp-btn vp-btn-ghost"
            style={{ fontSize:".82rem", minHeight:44 }}
            onClick={() => { try { window.close(); } catch(e) { /* window.close() puede bloquearse sin opener */ } }}>
            ✕ Cerrar ventana
          </button>
        </div>
      </div>
    </div>
  );
}
