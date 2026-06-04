export function LandingScreen({ onNuevo, onLogin, loadingConfig, config }) {
  return (
    <div className="vp-page" style={{ background:"var(--bg2)" }}>
      
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", padding:"2rem 1.5rem",
        background:"radial-gradient(ellipse 80% 50% at 50% 0%, rgba(34,211,238,0.08) 0%, transparent 65%)" }}>

        {/* Hero */}
        <div style={{ textAlign:"center", marginBottom:"2.5rem", animation:"fadeUp .5s ease both" }}>
          <img src="/logo.webp" alt="Trail El Guerrero" width={96} height={96}
            style={{ marginBottom:".85rem", borderRadius:"50%",
              boxShadow:"0 0 0 3px rgba(34,211,238,.25), 0 8px 32px rgba(0,0,0,.4)" }} />
          <div style={{ fontWeight:800, fontSize:"1.9rem", color:"var(--cyan)",
            fontFamily:"var(--font-display)", marginBottom:".4rem", lineHeight:1.15 }}>
            Trail El Guerrero 2026
          </div>
          <div style={{ fontFamily:"var(--font-display)", fontSize:"1.05rem", fontWeight:700,
            color:"var(--text-muted)", marginBottom:".3rem", letterSpacing:".04em" }}>
            Portal del Voluntario
          </div>
          {config?.fecha && (
            <div style={{ fontFamily:"var(--font-mono)", fontSize:".85rem", color:"var(--text-muted)" }}>
              {config.fecha} · {config.lugar || "Candeleda, Ávila"}
            </div>
          )}
        </div>

        {/* Opciones */}
        <div style={{ width:"100%", maxWidth:400, display:"flex", flexDirection:"column",
          gap:"1rem", animation:"fadeUp .55s .1s ease both", opacity:0,
          animationFillMode:"forwards" }}>

          <button className="vp-btn vp-btn-primary"
            style={{ fontSize:"1.15rem", minHeight:72, flexDirection:"column",
              gap:".3rem", lineHeight:1.35, padding:"1.1rem" }}
            onClick={onNuevo}>
            <span style={{ fontSize:"1.6rem" }}>✋</span>
            <span>Quiero ser voluntario</span>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:".82rem",
              fontWeight:400, opacity:.85 }}>
              Registrarme por primera vez
            </span>
          </button>

          <button className="vp-btn vp-btn-outline"
            style={{ fontSize:"1.15rem", minHeight:72, flexDirection:"column",
              gap:".3rem", lineHeight:1.35, padding:"1.1rem" }}
            onClick={() => onLogin("")}>
            <span style={{ fontSize:"1.6rem" }}>👤</span>
            <span>Ya soy voluntario</span>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:".82rem",
              fontWeight:400, opacity:.85 }}>
              Acceder a mi ficha personal
            </span>
          </button>
        </div>

        {/* Footer */}
        <div style={{ marginTop:"2.5rem", fontFamily:"var(--font-mono)",
          fontSize:".8rem", color:"var(--text-muted)", textAlign:"center", lineHeight:2,
          animation:"fadeUp .6s .2s ease both", opacity:0, animationFillMode:"forwards" }}>
          Club Deportivo Trail Candeleda<br/>
          10ª Edición · Candeleda, Ávila · 29 Agosto 2026
        </div>
      </div>
    </div>
  );
}
