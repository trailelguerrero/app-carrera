import { ESTADOS, ESTADO_CFG, getCfg } from "./constants.js";
import { fmtEur } from "@/lib/utils";

// ─── TAB PIPELINE ─────────────────────────────────────────────────────────────
export default function TabPipeline({ pats, onEditar, onDetalle, updateEstado, ordenAlfa, onNuevo }) {
  const patsOrdenados = ordenAlfa ? [...pats].sort((a,b) => a.nombre.localeCompare(b.nombre,"es")) : pats;
  const porEstado = ESTADOS.map(e => ({
    e, cfg: ESTADO_CFG[e],
    pats: patsOrdenados.filter(p => p.estado === e),
    total: patsOrdenados.filter(p => p.estado === e).reduce((s, p) => s + p.importe + (p.especie || 0), 0),
  }));

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">🔀 Pipeline Comercial</div>
          <div className="pd">Vista kanban del estado · {ordenAlfa?"orden A-Z":"orden por defecto"}</div>
        </div>
        <div style={{ display:"flex", gap:".5rem", alignItems:"center" }}>
          {ordenAlfa && <span className="badge badge-amber">A-Z ✓</span>}
          <button className="btn btn-primary btn-sm" onClick={onNuevo}>+ Nuevo patrocinador</button>
        </div>
      </div>

      <div className="kanban">
        {porEstado.map(col => (
          <div key={col.e} className="kancol">
            <div className="kancol-header" style={{ borderTopColor: col.cfg.color }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: "var(--fs-base)", color: col.cfg.color }}>{col.cfg.label}</span>
                <span className="badge" style={{ background: col.cfg.bg, color: col.cfg.color }}>{col.pats.length}</span>
              </div>
              {col.total > 0 && <div className="mono xs" style={{ color: col.cfg.color, marginTop: ".2rem" }}>{fmtEur(col.total)}</div>}
            </div>
            <div className="kancol-body">
              {col.pats.length === 0 && (
                <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)" }}>—</div>
              )}
              {col.pats.map(p => {
                const ncfg = getCfg(p.nivel);
                return (
                  <div key={p.id} className="kancard" style={{ borderTopColor: ncfg.color, cursor:"pointer" }} onClick={()=>onDetalle(p)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: ".35rem" }}>
                      <span style={{ fontWeight: 700, fontSize: "var(--fs-base)", flex: 1, paddingRight: ".5rem" }}>{p.nombre}</span>
                      <span style={{ fontSize: "var(--fs-base)" }}>{ncfg.icon}</span>
                    </div>
                    <div className="mono xs muted" style={{ marginBottom: ".5rem" }}>{p.sector}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)", fontWeight: 700, color: ncfg.color }}>
                        {p.especie > 0 ? fmtEur(p.especie) : fmtEur(p.importe)}
                      </span>
                    </div>
                    {/* Mover de estado */}
                    <div style={{ marginTop: ".5rem", display: "flex", gap: ".25rem", flexWrap: "wrap" }}>
                      {ESTADOS.filter(s => s !== p.estado && s !== "cancelado").slice(0, 2).map(s => (
                        <button key={s} className="btn btn-sm btn-ghost" style={{ fontSize: "var(--fs-xs)", padding: ".1rem .35rem" }}
                          onClick={e=>{e.stopPropagation();updateEstado(p.id, s)}}>
                          → {ESTADO_CFG[s].label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
