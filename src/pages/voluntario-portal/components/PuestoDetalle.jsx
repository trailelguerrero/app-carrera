import { useState } from "react";
import { MiniMapaPuesto } from "@/components/voluntarios/MiniMapaPuesto";

export function PuestoDetalle({ puesto, recorridos = [] }) {
  const [expandido, setExpandido] = useState(true);

  if (!puesto) return (
    <div id="sec-puesto" className="vp-card" style={{ borderLeft:"3px solid var(--border)", textAlign:"center", padding:"1.5rem 1rem", marginBottom:".75rem" }}>
      <div style={{ fontSize:"2rem", marginBottom:".5rem" }}>📋</div>
      <div style={{ fontWeight:700, fontSize:".92rem", color:"var(--text)", marginBottom:".3rem" }}>
        Tu puesto estará visible aquí
      </div>
      <div className="vp-mono" style={{ fontSize:".72rem", color:"var(--text-muted)", lineHeight:1.8 }}>
        La organización asignará tu puesto en esta sección.<br />
        Vuelve a consultar esta página cuando se acerque el evento.
      </div>
    </div>
  );

  return (
    <div id="sec-puesto" className="vp-card" style={{ borderLeft:"3px solid var(--cyan)", padding:0, overflow:"hidden" }}>
      <button
        onClick={() => setExpandido(v => !v)}
        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"1rem 1.1rem", background:"transparent", border:"none", cursor:"pointer",
          textAlign:"left", gap:".75rem", minHeight:70, WebkitTapHighlightColor:"transparent" }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div className="vp-label" style={{ marginBottom:".2rem" }}>📍 Tu puesto</div>
          <div style={{ fontWeight:700, fontSize:"1.05rem", color:"var(--text)" }}>{puesto.nombre}</div>
          <div className="vp-mono" style={{ fontSize:".75rem", color:"var(--text-muted)", marginTop:".2rem" }}>
            🕗 {puesto.horaInicio}{puesto.horaFin ? ` – ${puesto.horaFin}` : ""}
            {puesto.tipo ? ` · ${puesto.tipo}` : ""}
          </div>
          {!expandido && (
            <div className="vp-mono" style={{ fontSize:".65rem", color:"var(--cyan)", marginTop:".2rem" }}>
              👆 Toca para ver más detalles
            </div>
          )}
        </div>
        <span style={{ fontFamily:"var(--font-mono)", fontSize:".75rem", color:"var(--cyan)",
          flexShrink:0, transition:"transform .18s",
          transform: expandido ? "rotate(0deg)" : "rotate(-90deg)" }}>▼</span>
      </button>

      {expandido && (
        <div style={{ padding:"0 1.1rem 1rem", borderTop:"1px solid var(--border)" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:".55rem", paddingTop:".75rem" }}>
            {puesto.tipo && (
              <div className="vp-row">
                <span className="vp-row-label">🏷 Tipo</span>
                <span className="vp-value">{puesto.tipo}</span>
              </div>
            )}
            {puesto.horaInicio && (
              <div className="vp-row">
                <span className="vp-row-label">🕗 Horario</span>
                <span className="vp-value">{puesto.horaInicio}{puesto.horaFin ? ` – ${puesto.horaFin}` : ""}</span>
              </div>
            )}
            {puesto.distancias?.length > 0 && (
              <div className="vp-row">
                <span className="vp-row-label">📏 Distancias</span>
                <div style={{ display:"flex", gap:".3rem", flexWrap:"wrap", justifyContent:"flex-end" }}>
                  {puesto.distancias.map(d => (
                    <span key={d} style={{ fontFamily:"var(--font-mono)", fontSize:".65rem",
                      padding:".15rem .45rem", borderRadius:4,
                      background:"rgba(34,211,238,.1)", color:"var(--cyan)",
                      border:"1px solid rgba(34,211,238,.25)", fontWeight:700 }}>{d}</span>
                  ))}
                </div>
              </div>
            )}
            {puesto.necesarios && (
              <div className="vp-row">
                <span className="vp-row-label">👥 Voluntarios</span>
                <span className="vp-value">{puesto.necesarios} necesarios</span>
              </div>
            )}
            {puesto.tiempoLimite && (
              <div className="vp-row">
                <span className="vp-row-label">⏱ Tiempo límite</span>
                <span className="vp-value" style={{color:"var(--amber)"}}>{puesto.tiempoLimite}</span>
              </div>
            )}
            {puesto.notas && (
              <div style={{ marginTop:".2rem", padding:".55rem .75rem",
                background:"var(--surface2)", borderRadius:8,
                borderLeft:"2px solid var(--cyan-border)" }}>
                <div className="vp-label" style={{ marginBottom:".25rem", color:"var(--cyan)" }}>📋 Instrucciones</div>
                <div className="vp-mono" style={{ fontSize:".78rem", color:"var(--text-muted)", lineHeight:1.7 }}>
                  {puesto.notas}
                </div>
              </div>
            )}
          </div>
          {puesto.lat && puesto.lng && (
            <MiniMapaPuesto puesto={puesto} recorridos={recorridos} />
          )}
          <div className="vp-mono" style={{ fontSize:"var(--fs-xs)", color:"var(--text-muted)",
            marginTop:".75rem", textAlign:"center",
            padding:".35rem",background:"rgba(148,163,184,.05)",borderRadius:6 }}>
            📋 Vista de consulta · Para cambios, contacta con el organizador
          </div>
        </div>
      )}
    </div>
  );
}
