import { useState, useMemo } from "react";
import { NIVELES, NIVEL_CFG, ESTADOS, ESTADO_CFG, getCfg } from "./constants.js";
import { fmtEur } from "@/lib/utils";
import { usePaginacion } from "@/hooks/usePaginacion.jsx";
import { detectarIncoherencias } from "@/lib/budgetUtils";
import EmptyState from "@/components/EmptyState";

// ─── TAB PATROCINADORES ───────────────────────────────────────────────────────
export default function TabPatrocinadores({
  pats, todosLen, todosPats = [], search, setSearch,
  filtroNivel, setFiltroNivel,
  filtroEstado, setFiltroEstado,
  filtroSector = "todos", setFiltroSector,
  sectoresActivos = [],
  onEditar, onDetalle, onDelete, onNuevo,
  updateEstado, ordenAlfa, setOrdenAlfa, onAddContra,
}) {
  const [vistaKanban, setVistaKanban] = useState(false);
  const patsOrdenados = ordenAlfa ? [...pats].sort((a,b) => a.nombre.localeCompare(b.nombre,"es")) : pats;
  const { items: patsPaginados, total: totalPats, PaginadorUI } = usePaginacion(patsOrdenados, 12);

  // Conteos para pills — calculados sobre todos los patrocinadores (sin filtrar)
  const statsEstado = useMemo(() => {
    const counts = {};
    ["prospecto","negociando","confirmado","cobrado","cancelado"].forEach(e => { counts[e] = 0; });
    todosPats.forEach(p => { counts[p.estado] = (counts[p.estado]||0) + 1; });
    return counts;
  }, [todosPats]);

  const statsNivel = useMemo(() => {
    const counts = {};
    todosPats.forEach(p => { counts[p.nivel] = (counts[p.nivel]||0) + 1; });
    return counts;
  }, [todosPats]);

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">🤝 Patrocinadores</div>
          <div className="pd">{pats.length}/{todosLen} mostrados · click para detalle</div>
        </div>
        <div style={{display:"flex",gap:".5rem",alignItems:"center"}}>
          <div className="filter-pill-group">
            <button className={`filter-pill${!vistaKanban ? " active" : ""}`}
              onClick={() => setVistaKanban(false)}>☰ Lista</button>
            <button className={`filter-pill${vistaKanban ? " active" : ""}`}
              onClick={() => setVistaKanban(true)}>⬛ Kanban</button>
          </div>
          <button className={`btn btn-sm ${ordenAlfa?"btn-gold":"btn-ghost"}`} onClick={()=>setOrdenAlfa(v=>!v)}>{ordenAlfa?"A-Z ✓":"A-Z"}</button>
          <button className="btn btn-primary" onClick={onNuevo}>+ Nuevo patrocinador</button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ marginBottom:".75rem", display:"flex", flexDirection:"column", gap:"0.45rem" }}>
        <input className="inp" placeholder="Buscar por nombre, contacto o sector…" value={search}
          onChange={e => setSearch(e.target.value)} style={{ maxWidth:320, fontSize:"var(--fs-base)" }} />
        <div className="filter-pill-group">
          {[
            { id:"todos",      label:"Todos",      count:todosLen,                       color:"var(--text-muted)", bg:"rgba(255,255,255,.08)" },
            { id:"prospecto",  label:"Prospecto",  count:statsEstado.prospecto||0,       color:"var(--text-muted)", bg:"rgba(90,106,138,.15)"  },
            { id:"negociando", label:"Negociando", count:statsEstado.negociando||0,      color:"#fbbf24",           bg:"var(--amber-dim)"       },
            { id:"confirmado", label:"Confirmado", count:statsEstado.confirmado||0,      color:"#22d3ee",           bg:"var(--cyan-dim)"        },
            { id:"cobrado",    label:"Cobrado",    count:statsEstado.cobrado||0,         color:"var(--green)",      bg:"var(--green-dim)"       },
          ].map(({ id, label, count, color, bg }) => (
            <button key={id}
              className={`filter-pill${filtroEstado === id ? " active" : ""}`}
              onClick={() => setFiltroEstado(id)}>
              {label}
              <span style={{
                fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
                color: filtroEstado===id ? color : "var(--text-dim)",
                background: filtroEstado===id ? bg : "transparent",
                borderRadius:10, padding:"0 .3rem", marginLeft:".15rem",
                minWidth:16, display:"inline-block", textAlign:"center", transition:"all .15s",
              }}>{count}</span>
            </button>
          ))}
          <div className="filter-pill-sep" />
          <button className={`filter-pill${filtroNivel === "todos" ? " active" : ""}`}
            onClick={() => setFiltroNivel("todos")}>
            Todos
            <span style={{
              fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
              color: filtroNivel==="todos" ? "var(--text-muted)" : "var(--text-dim)",
              background: filtroNivel==="todos" ? "rgba(255,255,255,.08)" : "transparent",
              borderRadius:10, padding:"0 .3rem", marginLeft:".15rem",
              minWidth:16, display:"inline-block", textAlign:"center", transition:"all .15s",
            }}>{todosLen}</span>
          </button>
          {NIVELES.map(n => {
            const cfg = NIVEL_CFG[n];
            const count = statsNivel[n] || 0;
            const active = filtroNivel === n;
            return (
              <button key={n}
                className={`filter-pill${active ? " active" : ""}`}
                onClick={() => setFiltroNivel(n)}>
                {cfg.icon} {n}
                <span style={{
                  fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
                  color: active ? cfg.color : "var(--text-dim)",
                  background: active ? cfg.dim : "transparent",
                  borderRadius:10, padding:"0 .3rem", marginLeft:".15rem",
                  minWidth:16, display:"inline-block", textAlign:"center", transition:"all .15s",
                }}>{count}</span>
              </button>
            );
          })}
          {(search || filtroNivel !== "todos" || filtroEstado !== "todos" || filtroSector !== "todos") && (
            <>
              <div className="filter-pill-sep" />
              <button className="filter-pill"
                onClick={() => { setSearch(""); setFiltroNivel("todos"); setFiltroEstado("todos"); setFiltroSector?.("todos"); }}
                style={{ color:"var(--red)", borderColor:"rgba(248,113,113,0.3)" }}>
                ✕ Limpiar
              </button>
            </>
          )}
        </div>
        {sectoresActivos.length >= 2 && (
          <div className="filter-pill-group" style={{ flexWrap:"wrap" }}>
            <button
              className={`filter-pill${filtroSector === "todos" ? " active" : ""}`}
              onClick={() => setFiltroSector?.("todos")}>
              Todos los sectores
            </button>
            {sectoresActivos.map(s => (
              <button key={s}
                className={`filter-pill${filtroSector === s ? " active" : ""}`}
                onClick={() => setFiltroSector?.(filtroSector === s ? "todos" : s)}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── KANBAN por nivel ── */}
      {vistaKanban && (
        <div className="k-grid">
          {NIVELES.map(nivel => {
            const items = patsOrdenados.filter(p => p.nivel === nivel);
            if (!items.length) return null;
            const cfg = getCfg(nivel);
            return (
              <div key={nivel} className="k-col">
                <div className="k-col-hdr" style={{"--k-color": cfg.color}}>
                  <span style={{fontWeight:700,fontSize:"var(--fs-sm)",color:cfg.color}}>{cfg.icon} {nivel}</span>
                  <span className="k-col-cnt" style={{background:cfg.dim,color:cfg.color}}>{items.length}</span>
                </div>
                {items.map(p => {
                  const ecfg = ESTADO_CFG[p.estado] || ESTADO_CFG.prospecto;
                  return (
                    <div key={p.id} className="k-card" style={{"--k-color": cfg.color}}
                      onClick={()=>onDetalle(p)}>
                      <div style={{fontWeight:700,fontSize:"var(--fs-base)",marginBottom:".2rem"}}>{p.nombre}</div>
                      <div className="mono xs muted" style={{marginBottom:".3rem"}}>{p.sector}</div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:".2rem"}}>
                        <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-base)",fontWeight:700,color:cfg.color}}>{fmtEur(p.importe)}</span>
                        <span className="badge" style={{background:ecfg.bg,color:ecfg.color,fontSize:"var(--fs-2xs)"}}>{ecfg.label}</span>
                        {(() => {
                          const issues = detectarIncoherencias(p);
                          if (!issues.length) return null;
                          return (
                            <span title={issues.join(" · ")}
                              style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                                background:"rgba(248,113,113,.12)", color:"var(--red)",
                                border:"1px solid var(--red-border)", borderRadius:4,
                                padding:"0 .35rem", cursor:"help" }}>
                              ⚠ {issues[0].split(" ").slice(0,3).join(" ")}…
                            </span>
                          );
                        })()}
                        {p.proximoContacto && p.estado === "negociando" && (() => {
                          const dias = Math.ceil((new Date(p.proximoContacto) - new Date()) / 86400000);
                          if (dias > 3) return null;
                          return (
                            <span style={{ padding:".1rem .4rem", borderRadius:4, fontSize:"var(--fs-xs)",
                              fontFamily:"var(--font-mono)", fontWeight:700,
                              background: dias < 0 ? "var(--red-dim)" : "var(--amber-dim)",
                              color: dias < 0 ? "var(--red)" : "var(--amber)",
                              marginLeft:".2rem" }}>
                              {dias < 0 ? `📞 ${Math.abs(dias)}d sin contacto` : dias === 0 ? "📞 HOY" : `📞 ${dias}d`}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* ── LISTA ── */}
      {!vistaKanban && (
      <div style={{ display: "flex", flexDirection: "column", gap: ".55rem" }}>
        {patsOrdenados.length === 0 && (
          <EmptyState
            svg="handshake" color="var(--amber)"
            title="Sin patrocinadores"
            sub="Añade el primer patrocinador o ajusta los filtros"
            action={<button className="btn btn-primary btn-sm" onClick={onNuevo}>+ Nuevo patrocinador</button>}
          />
        )}
        {patsPaginados.map(p => {
          if (!p) return null;
          const cfg = getCfg(p.nivel) || NIVEL_CFG.Especie;
          const ecfg = ESTADO_CFG[p.estado] || ESTADO_CFG.prospecto;
          const contPend = (p.contraprestaciones || []).filter(c => c && c.estado === "pendiente").length;
          return (
            <div key={p.id}
              className="item-card"
              style={{ "--item-accent": cfg.color }}
              onClick={()=>onDetalle(p)}>
              <div className="item-card-hdr">
                {/* Icono de nivel */}
                <div className="item-card-main" style={{gap:".6rem"}}>
                  <div style={{width:44,flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:".2rem"}}>
                    <div className="item-icon-pill"
                      style={{"--pill-color": cfg.color, width:38, height:38}}>
                      <span style={{fontSize:"var(--fs-lg)"}}>{cfg.icon}</span>
                    </div>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-2xs)",
                      color:cfg.color, fontWeight:700, textAlign:"center",
                      letterSpacing:".04em", textTransform:"uppercase",
                      whiteSpace:"nowrap" }}>
                      {p.nivel}
                    </div>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:".6rem",flexWrap:"wrap"}}>
                      <span style={{fontSize:"var(--fs-md)",fontWeight:800}}>{p.nombre}</span>
                      <span className="badge" style={{background:ecfg.bg,color:ecfg.color,border:`1px solid ${ecfg.color}33`}}>{ecfg.label}</span>
                      {contPend > 0 && <span className="badge" style={{background:"rgba(248,113,113,.1)",color:"#f87171"}}>⚠ {contPend} compromisos pendientes</span>}
                    </div>
                    <div className="item-card-meta">
                      <span className="mono xs muted">🏭 {p.sector}</span>
                      <span className="mono xs muted">👤 {p.contacto}</span>
                      {p.telefono && <span className="mono xs muted">📞 {p.telefono}</span>}
                    </div>
                    {p.notas && <div style={{fontSize:"var(--fs-sm)",color:"var(--text-muted)",fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:480,marginTop:".1rem"}}>{p.notas}</div>}
                  </div>
                </div>
                {/* Columna derecha: importe + acciones */}
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:".35rem",flexShrink:0}}>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-md)",fontWeight:800,color:cfg.color}}>
                    {p.especie > 0 ? fmtEur(p.especie) : fmtEur(p.importe)}
                    {p.especie > 0 && <span className="mono xs muted" style={{marginLeft:".3rem"}}>especie</span>}
                  </div>
                  {p.fechaVencimiento && (
                    <div className="mono xs muted">{p.estado !== "cobrado" ? `Vence: ${p.fechaVencimiento}` : "✓ Cobrado"}</div>
                  )}
                  <div style={{display:"flex",gap:".3rem",flexWrap:"wrap"}}>
                    <button className="btn btn-sm" style={{background:cfg.dim,color:cfg.color,border:`1px solid ${cfg.border}`}} onClick={e=>{e.stopPropagation();onDetalle(p)}}>Ver detalle</button>
                    {onAddContra && (
                      <button className="btn btn-sm btn-ghost"
                        title="Añadir contraprestación"
                        onClick={e=>{e.stopPropagation();onAddContra(p);}}>
                        + Contraprestación
                      </button>
                    )}
                    {onDelete && (
                      <button className="btn btn-sm btn-red"
                        title="Eliminar patrocinador"
                        onClick={e=>{e.stopPropagation();onDelete(p.id);}}>
                        🗑 Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <PaginadorUI />
      </div>
      )}
    </>
  );
}
