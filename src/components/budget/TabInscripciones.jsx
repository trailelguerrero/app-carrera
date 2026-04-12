import React, { useState, useEffect, useRef } from "react";
import { useData } from "../../lib/dataService";
import { Tooltip, TooltipIcon } from "../common/Tooltip";
import { DISTANCIAS, DISTANCIA_COLORS, DISTANCIA_LABELS } from "../../constants/budgetConstants";
import { NumInput } from "./common/NumInput";
import { cls } from "../../lib/budgetUtils";

const getTramoStatus = (fechaFin) => {
  const now = new Date();
  const end = new Date(fechaFin);
  const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)   return { label: "Cerrado",      color: "#f87171", bg: "rgba(248,113,113,0.12)", glyph: "🔒" };
  if (diffDays <= 7)  return { label: "Último plazo", color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  glyph: "⚡" };
  if (diffDays <= 30) return { label: "Activo",       color: "#34d399", bg: "rgba(52,211,153,0.12)",  glyph: "🟢" };
  return               { label: "Próximo",            color: "#a78bfa", bg: "rgba(167,139,250,0.12)", glyph: "⏳" };
};

const fmt = (n) => n.toLocaleString("es-ES", { maximumFractionDigits: 0 }) + " €";

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
};

// Calcular inscritos e ingresos de un tramo
const tramoStats = (t, inscritos) => {
  const total = DISTANCIAS.reduce((s, d) => s + (inscritos?.tramos?.[t.id]?.[d] || 0), 0);
  const ingresos = DISTANCIAS.reduce((s, d) => s + (inscritos?.tramos?.[t.id]?.[d] || 0) * (t.precios[d] || 0), 0);
  return { total, ingresos };
};

// ─── Modal confirmación de eliminación ───────────────────────────────────────
const ModalConfirmDelete = ({ tramo, stats, onConfirm, onCancel }) => (
  <div
    onClick={e => e.target === e.currentTarget && onCancel()}
    style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
    }}
  >
    <div style={{
      background: "var(--surface)", border: "1px solid rgba(248,113,113,0.3)",
      borderRadius: 16, padding: "2rem 1.75rem", maxWidth: 380, width: "100%",
      textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
      animation: "slideUp 0.2s ease",
    }}>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ fontSize: "2.2rem", marginBottom: "0.75rem" }}>🗑️</div>
      <div style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "0.5rem" }}>
        ¿Eliminar «{tramo.nombre}»?
      </div>

      {stats.total > 0 ? (
        <div style={{
          background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.25)",
          borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "1.25rem",
        }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--red)", fontWeight: 700, marginBottom: "0.3rem" }}>
            ⚠️ Este tramo tiene datos de inscritos
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
            {stats.total} corredor{stats.total !== 1 ? "es" : ""} · {fmt(stats.ingresos)} en ingresos
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-dim)", marginTop: "0.3rem" }}>
            Al eliminar el tramo se perderán estos datos del presupuesto.
          </div>
        </div>
      ) : (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "1.25rem", lineHeight: 1.6 }}>
          El tramo no tiene inscritos asignados.<br />Esta acción no se puede deshacer.
        </div>
      )}

      <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center" }}>
        <button
          onClick={onCancel}
          style={{
            background: "var(--surface2)", color: "var(--text-muted)",
            border: "1px solid var(--border)", borderRadius: 8,
            padding: "0.5rem 1.2rem", fontFamily: "var(--font-display)",
            fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
          }}
        >Cancelar</button>
        <button
          onClick={onConfirm}
          style={{
            background: "rgba(248,113,113,0.15)", color: "var(--red)",
            border: "1px solid rgba(248,113,113,0.35)", borderRadius: 8,
            padding: "0.5rem 1.2rem", fontFamily: "var(--font-display)",
            fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
          }}
        >Sí, eliminar</button>
      </div>
    </div>
  </div>
);

// ─── Main component ──────────────────────────────────────────────────────────
export const TabInscripciones = ({ 
  tramos, 
  setTramos, 
  updateTramoPrecio, 
  addTramo, 
  inscritos, 
  updateInscritos, 
  totalInscritos, 
  ingresosPorDistancia, 
  maximos, 
  setMaximos 
}) => {
  const [pendingDelete, setPendingDelete] = useState(null);

  // ── Códigos promocionales ──────────────────────────────────────────────────
  const LS_CODIGOS = "teg_codigos_promo_v1";
  const [rawCodigos, setCodigos] = useData(LS_CODIGOS, []);
  const codigos = Array.isArray(rawCodigos) ? rawCodigos : [];
  const [codigosTab, setCodigosTab]   = useState("todos");
  const [busquedaCod, setBusquedaCod] = useState("");
  const [importText, setImportText]   = useState("");
  const [importDist, setImportDist]   = useState("TG7");
  const [importMsg,  setImportMsg]    = useState(null);

  // Cargar códigos iniciales si está vacío
  const codigosRef = useRef(codigos);
  useEffect(() => {
    if (codigosRef.current.length === 0) {
      setCodigos([
        {id:"7G7-1",     codigo:"7G7",      distancia:"TG7",  estado:"disponible",usadoPor:null,fechaUso:null},
        {id:"KDZ145OX",  codigo:"KDZ145OX", distancia:"TG7",  estado:"disponible",usadoPor:null,fechaUso:null},
        {id:"LHNHNP8O",  codigo:"LHNHNP8O", distancia:"TG7",  estado:"disponible",usadoPor:null,fechaUso:null},
        {id:"Y24SA1TO",  codigo:"Y24SA1TO", distancia:"TG7",  estado:"disponible",usadoPor:null,fechaUso:null},
        {id:"H4D95XXK",  codigo:"H4D95XXK", distancia:"TG7",  estado:"disponible",usadoPor:null,fechaUso:null},
        {id:"INWPP2FZ",  codigo:"INWPP2FZ", distancia:"TG7",  estado:"disponible",usadoPor:null,fechaUso:null},
        {id:"UBUQ4P9H",  codigo:"UBUQ4P9H", distancia:"TG13", estado:"disponible",usadoPor:null,fechaUso:null},
        {id:"E4AXY9BB",  codigo:"E4AXY9BB", distancia:"TG13", estado:"disponible",usadoPor:null,fechaUso:null},
        {id:"CFW8V4YX",  codigo:"CFW8V4YX", distancia:"TG13", estado:"disponible",usadoPor:null,fechaUso:null},
        {id:"OSEQZJW8",  codigo:"OSEQZJW8", distancia:"TG13", estado:"disponible",usadoPor:null,fechaUso:null},
        {id:"AAWKNOY8",  codigo:"AAWKNOY8", distancia:"TG13", estado:"disponible",usadoPor:null,fechaUso:null},
        {id:"L3BBI448",  codigo:"L3BBI448", distancia:"TG25", estado:"disponible",usadoPor:null,fechaUso:null},
        {id:"E3Z05H0D",  codigo:"E3Z05H0D", distancia:"TG25", estado:"disponible",usadoPor:null,fechaUso:null},
        {id:"40ACCVZF",  codigo:"40ACCVZF", distancia:"TG25", estado:"disponible",usadoPor:null,fechaUso:null},
        {id:"K5RBRVHK",  codigo:"K5RBRVHK", distancia:"TG25", estado:"disponible",usadoPor:null,fechaUso:null},
        {id:"UUCTJWSV",  codigo:"UUCTJWSV", distancia:"TG25", estado:"disponible",usadoPor:null,fechaUso:null},
      ]);
    }
  }, []);

  const fmtDate = (iso) => iso ? iso.split("T")[0] : "—";

  const handleRequestDelete = (t) => {
    const stats = tramoStats(t, inscritos);
    setPendingDelete({ tramo: t, stats });
  };

  const handleConfirmDelete = () => {
    setTramos(prev => prev.filter(x => x.id !== pendingDelete.tramo.id));
    setPendingDelete(null);
  };

  return (
    <>
      <style>{`
        .input-inline {
          background: transparent; border: 1px solid transparent; color: var(--text);
          padding: 0.15rem 0.3rem; border-radius: 4px; font-family: var(--font-display);
          font-weight: 700; width: 100%; min-width: 90px;
          outline: none; transition: background 0.15s;
        }
        .input-inline:focus {
          background: var(--surface2); border-color: var(--border);
        }
        .date-inline {
          background: transparent; color: var(--text-muted); border: none; outline: none;
          font-family: var(--font-mono); font-size: 0.72rem; cursor: pointer; padding: 0.1rem;
        }
        .date-inline::-webkit-calendar-picker-indicator { cursor: pointer; filter: invert(0.6); }
        .cell-group {
          display: flex; flex-direction: column; gap: 0.35rem; align-items: flex-end; justify-content: center;
        }
      `}</style>
      


      {/* ── CÓDIGOS PROMOCIONALES ── */}
      <div style={{marginBottom:"1.5rem"}}>
        <div style={{fontFamily:"var(--font-mono)",fontSize:".6rem",fontWeight:700,
          color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".1em",
          borderBottom:"1px solid var(--border)",paddingBottom:".4rem",marginBottom:"1rem",
          display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:".5rem"}}>
          <span>🎟️ Códigos promocionales — inscripciones gratuitas</span>
          <div style={{display:"flex",gap:".35rem"}}>
            {["TG7","TG13","TG25"].map(d=>{
              const disp=codigos.filter(c=>c.distancia===d&&c.estado==="disponible").length;
              const tot=codigos.filter(c=>c.distancia===d).length;
              const color=DISTANCIA_COLORS[d]||"var(--cyan)";
              return (
                <span key={d} style={{fontFamily:"var(--font-mono)",fontSize:".6rem",
                  padding:".1rem .4rem",borderRadius:20,fontWeight:700,
                  background:color+"18",color,border:`1px solid ${color}33`}}>
                  {d}: {disp}/{tot}
                </span>
              );
            })}
          </div>
        </div>

        <div style={{display:"flex",gap:".35rem",flexWrap:"wrap",alignItems:"center",marginBottom:".65rem"}}>
          {["todos","TG7","TG13","TG25","disponible","usado"].map(f=>(
            <button key={f} onClick={()=>setCodigosTab(f)}
              style={{padding:".18rem .5rem",borderRadius:20,cursor:"pointer",
                fontFamily:"var(--font-mono)",fontSize:".6rem",fontWeight:700,
                border:`1px solid ${codigosTab===f?"var(--cyan)":"var(--border)"}`,
                background:codigosTab===f?"var(--cyan-dim)":"transparent",
                color:codigosTab===f?"var(--cyan)":"var(--text-muted)"}}>
              {f==="todos"?"Todos":f==="disponible"?"✅ Disponibles":f==="usado"?"✓ Usados":f}
            </button>
          ))}
          <input placeholder="Buscar código o nombre..."
            value={busquedaCod} onChange={e=>setBusquedaCod(e.target.value)}
            style={{flex:1,minWidth:140,background:"var(--surface2)",
              border:"1px solid var(--border)",borderRadius:8,color:"var(--text)",
              padding:".3rem .55rem",fontFamily:"var(--font-mono)",fontSize:".7rem",outline:"none"}} />
        </div>

        {(() => {
          const filtrados = codigos
            .filter(c=>{
              if(codigosTab==="disponible") return c.estado==="disponible";
              if(codigosTab==="usado") return c.estado==="usado";
              if(["TG7","TG13","TG25"].includes(codigosTab)) return c.distancia===codigosTab;
              return true;
            })
            .filter(c=>!busquedaCod||
              c.codigo.toLowerCase().includes(busquedaCod.toLowerCase())||
              (c.usadoPor||"").toLowerCase().includes(busquedaCod.toLowerCase()));
          if(!filtrados.length) return (
            <div style={{textAlign:"center",padding:"1.25rem",fontFamily:"var(--font-mono)",
              fontSize:".7rem",color:"var(--text-dim)"}}>Sin códigos con ese filtro</div>
          );
          return (
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",
                fontFamily:"var(--font-mono)",fontSize:".72rem"}}>
                <thead>
                  <tr style={{borderBottom:"1px solid var(--border)"}}>
                    {["Código","Dist.","Estado","Inscrito","Fecha",""].map((h,i)=>(
                      <th key={i} style={{textAlign:"left",padding:".3rem .5rem",
                        color:"var(--text-muted)",fontWeight:600,width:i===5?32:undefined}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(c=>{
                    const usado=c.estado==="usado";
                    const dColor=DISTANCIA_COLORS[c.distancia]||"var(--cyan)";
                    return (
                      <tr key={c.id} style={{borderBottom:"1px solid rgba(255,255,255,.04)",
                        opacity:usado?.65:1}}>
                        <td style={{padding:".3rem .5rem",fontWeight:700,letterSpacing:".04em",
                          color:usado?"var(--text-muted)":"var(--text)",
                          textDecoration:usado?"line-through":"none"}}>{c.codigo}</td>
                        <td style={{padding:".3rem .5rem"}}>
                          <span style={{padding:".08rem .35rem",borderRadius:20,
                            background:dColor+"18",color:dColor,fontWeight:700,fontSize:".6rem"}}>
                            {c.distancia}
                          </span>
                        </td>
                        <td style={{padding:".3rem .5rem",fontWeight:700,
                          color:usado?"var(--text-dim)":"var(--green)"}}>
                          {usado?"✓ Usado":"✅ Libre"}
                        </td>
                        <td style={{padding:".3rem .5rem",minWidth:160}}>
                          {usado ? (
                            <span>{c.usadoPor||"—"}</span>
                          ) : (
                            <input placeholder="Nombre + Enter"
                              style={{background:"transparent",border:"none",
                                borderBottom:"1px dashed var(--border)",color:"var(--text)",
                                fontFamily:"var(--font-mono)",fontSize:".68rem",
                                outline:"none",width:"100%",padding:".1rem 0"}}
                              onKeyDown={e=>{
                                if(e.key==="Enter"&&e.target.value.trim()){
                                  const nombre=e.target.value.trim();
                                  setCodigos(prev=>prev.map(x=>x.id===c.id
                                    ?{...x,estado:"usado",usadoPor:nombre,
                                       fechaUso:new Date().toISOString().split("T")[0]}:x));
                                  e.target.value="";
                                }
                              }}
                            />
                          )}
                        </td>
                        <td style={{padding:".3rem .5rem",color:"var(--text-dim)",fontSize:".65rem"}}>
                          {c.fechaUso||"—"}
                        </td>
                        <td style={{padding:".2rem"}}>
                          {usado&&(
                            <button title="Liberar código"
                              onClick={()=>setCodigos(prev=>prev.map(x=>x.id===c.id
                                ?{...x,estado:"disponible",usadoPor:null,fechaUso:null}:x))}
                              style={{background:"none",border:"1px solid var(--border)",
                                borderRadius:4,cursor:"pointer",padding:".12rem .3rem",
                                color:"var(--text-dim)",fontSize:".6rem",fontWeight:700}}>
                              ↩
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}

        <div style={{marginTop:"1rem",padding:".75rem",borderRadius:8,
          background:"var(--surface2)",border:"1px solid var(--border)"}}>
          <div style={{fontFamily:"var(--font-mono)",fontSize:".6rem",fontWeight:700,
            color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".06em",
            marginBottom:".5rem"}}>📥 Añadir nuevos códigos en lote</div>
          <div style={{display:"flex",gap:".5rem",alignItems:"flex-start",flexWrap:"wrap"}}>
            <textarea value={importText} onChange={e=>setImportText(e.target.value)}
              placeholder="CODIGO1 CODIGO2 CODIGO3" rows={3}
              style={{flex:1,minWidth:200,background:"var(--surface)",border:"1px solid var(--border)",
                borderRadius:6,color:"var(--text)",padding:".4rem .55rem",
                fontFamily:"var(--font-mono)",fontSize:".72rem",outline:"none",resize:"vertical"}} />
            <div style={{display:"flex",flexDirection:"column",gap:".3rem"}}>
              {["TG7","TG13","TG25"].map(d=>(
                <button key={d} onClick={()=>setImportDist(d)}
                  style={{padding:".25rem .55rem",borderRadius:6,cursor:"pointer",
                    fontFamily:"var(--font-mono)",fontSize:".65rem",fontWeight:700,
                    border:`1px solid ${importDist===d?"var(--cyan)":"var(--border)"}`,
                    background:importDist===d?"var(--cyan-dim)":"transparent",
                    color:importDist===d?"var(--cyan)":"var(--text-muted)"}}>
                  {d}
                </button>
              ))}
              <button disabled={!importText.trim()}
                style={{padding:".3rem .55rem",borderRadius:6,cursor:"pointer",
                  fontFamily:"var(--font-mono)",fontSize:".65rem",fontWeight:700,
                  background:"var(--primary)",color:"#fff",border:"none",
                  opacity:importText.trim()?1:.45,marginTop:".15rem"}}
                onClick={()=>{
                  const nuevos=importText.split(/[,\s\n\r]+/)
                    .map(l=>l.trim().toUpperCase()).filter(l=>l.length>0)
                    .filter(cod=>!codigos.find(c=>c.codigo===cod))
                    .map(cod=>({id:cod+"-"+Date.now().toString(36),codigo:cod,
                      distancia:importDist,estado:"disponible",usadoPor:null,fechaUso:null}));
                  if(!nuevos.length){setImportMsg("Todos los códigos ya existen.");return;}
                  setCodigos(prev=>[...prev,...nuevos]);
                  setImportText("");
                  setImportMsg("✓ "+nuevos.length+" importados para "+importDist);
                  setTimeout(()=>setImportMsg(null),3000);
                }}>
                Importar
              </button>
            </div>
          </div>
          {importMsg&&<div style={{fontFamily:"var(--font-mono)",fontSize:".62rem",
            color:importMsg.startsWith("✓")?"var(--green)":"var(--red)",marginTop:".4rem"}}>
            {importMsg}
          </div>}
        </div>
      </div>

      {/* ── SECCIÓN 1: PLAZAS MÁXIMAS ── */}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: ".5rem" }}>
          <div className="card-title" style={{ color: "var(--cyan)", margin: 0 }}>🎯 Panel de Plazas y Volúmenes de Inscripción</div>
        </div>
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
          {DISTANCIAS.map(d => {
            const pct = maximos[d] > 0 ? Math.min((totalInscritos[d] / maximos[d]) * 100, 100) : 0;
            const color = pct >= 90 ? "var(--red)" : pct >= 70 ? "var(--amber)" : "var(--green)";
            const libre = Math.max(maximos[d] - totalInscritos[d], 0);
            return (
              <div key={d} style={{ minWidth: 200, flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ color: DISTANCIA_COLORS[d], fontWeight: 700, fontSize: "0.85rem" }}>{DISTANCIA_LABELS[d]}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-muted)" }}>Máx. plazas:</span>
                  <NumInput value={maximos[d]} onChange={v => setMaximos(prev => ({ ...prev, [d]: Math.max(1, Math.round(v)) }))} step={10} small />
                </div>
                <div className="progress-bar" style={{ height: 8 }}>
                  <div className="progress-fill" style={{ width: `${pct}%`, background: color, transition: "width 0.4s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.3rem" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color }}>{totalInscritos[d]} inscritos · {pct.toFixed(0)}%</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: libre <= 10 ? "var(--red)" : "var(--text-muted)" }}>{libre} libres</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Aviso si alguna distancia supera el máximo configurado */}
        {DISTANCIAS.some(d => maximos[d] > 0 && totalInscritos[d] > maximos[d]) && (
          <div style={{
            display:"flex", alignItems:"flex-start", gap:".6rem",
            padding:".65rem .9rem", borderRadius:8, marginTop:"1rem",
            background:"rgba(251,191,36,0.06)", border:"1px solid rgba(251,191,36,0.25)"
          }}>
            <span style={{ fontSize:"1rem", flexShrink:0 }}>⚠️</span>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:".68rem", lineHeight:1.6 }}>
              <span style={{ color:"var(--amber)", fontWeight:700 }}>
                {DISTANCIAS.filter(d => maximos[d] > 0 && totalInscritos[d] > maximos[d])
                  .map(d => `${DISTANCIA_LABELS[d]}: ${totalInscritos[d]}/${maximos[d]} (+${totalInscritos[d]-maximos[d]})`)
                  .join(" · ")}
              </span>
              <span style={{ color:"var(--text-muted)", marginLeft:".5rem" }}>
                superan el aforo máximo. El P&L y el punto de equilibrio usan estos valores.
                Si es intencional, actualiza el máximo arriba.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Timeline bar ── */}
      {tramos.length > 0 && (
        <div className="card" style={{ padding: "1rem 1.25rem", marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700, marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Línea temporal de tramos
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {tramos.map((t) => {
              const status = getTramoStatus(t.fechaFin);
              return (
                <div key={t.id} style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    height: 8, borderRadius: 4,
                    background: status.color,
                    opacity: status.label === "Cerrado" ? 0.3 : 1,
                    boxShadow: status.label !== "Cerrado" ? `0 0 8px ${status.color}80` : "none",
                  }} />
                  <div style={{
                    fontSize: "0.58rem", color: status.color, fontFamily: "var(--font-mono)",
                    marginTop: 4, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {t.nombre}
                  </div>
                  <div style={{ fontSize: "0.52rem", color: "var(--text-muted)" }}>{formatDate(t.fechaFin)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SECCIÓN 2: MATRIZ DE PRECIOS Y VOLÚMENES ── */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{
            fontFamily: "var(--font-display)", fontWeight: 800,
            fontSize: "1rem", color: "var(--amber)", display: "flex", alignItems: "center", gap: 8
          }}>
            <span>💰</span> Gestión de Precios y Volúmenes por Tramo
          </div>
          <button className="btn btn-amber" onClick={addTramo} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 400 }}>+</span> Añadir Tramo
          </button>
        </div>
        
        <div className="overflow-x" style={{ paddingBottom: "1.5rem" }}>
          <table className="tbl" style={{ minWidth: 700 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 160, paddingLeft: 8 }}>Información del Tramo</th>
                {DISTANCIAS.map(d => (
                  <th key={d} className="text-right" style={{ width: 140, paddingRight: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: DISTANCIA_COLORS[d], display: "inline-block" }} />
                      <span style={{ color: DISTANCIA_COLORS[d], fontSize: "0.85rem", fontWeight: 700 }}>{DISTANCIA_LABELS[d]}</span>
                    </div>
                  </th>
                ))}
                <th className="text-right" style={{ width: 100, paddingRight: 8 }}>Ingresos Brutos</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {tramos.map((t, idx) => {
                const status = getTramoStatus(t.fechaFin);
                const stats = tramoStats(t, inscritos);
                const prev = idx > 0 ? tramos[idx - 1] : null;

                return (
                  <tr key={t.id} style={{
                    background: "rgba(255,255,255,0.015)",
                    borderBottom: "1px dashed var(--border)"
                  }}>
                    <td style={{ verticalAlign: "top", paddingTop: "0.9rem", paddingLeft: 8 }}>
                      <input
                        className="input-inline"
                        value={t.nombre}
                        onChange={e => setTramos(prev => prev.map(x => x.id === t.id ? { ...x, nombre: e.target.value } : x))}
                        placeholder="Nombre tramo"
                        style={{ fontSize: "1rem", marginBottom: 2 }}
                      />
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "0.4rem" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          background: status.bg, color: status.color,
                          border: `1px solid ${status.color}44`,
                          borderRadius: 20, padding: "0.15rem 0.5rem",
                          fontSize: "0.6rem", fontWeight: 700, fontFamily: "var(--font-mono)", whiteSpace: "nowrap",
                        }}>
                          {status.glyph} {status.label}
                        </span>
                        <input
                          type="date"
                          className="date-inline"
                          value={t.fechaFin}
                          onChange={e => setTramos(prev => prev.map(x => x.id === t.id ? { ...x, fechaFin: e.target.value } : x))}
                          title="Fecha de cierre del tramo"
                        />
                      </div>
                    </td>
                    
                    {DISTANCIAS.map(d => {
                      const delta = prev && t.precios[d] !== undefined ? t.precios[d] - prev.precios[d] : null;
                      return (
                        <td key={d} className="text-right" style={{ verticalAlign: "middle", padding: "0.9rem 0.5rem" }}>
                          <div className="cell-group">
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <span style={{ fontSize: "0.65rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>Precio:</span>
                              <NumInput
                                value={t.precios[d]}
                                onChange={v => updateTramoPrecio(t.id, d, v)}
                                small step={1}
                              />
                            </div>
                            {delta !== null && delta !== 0 && (
                              <div style={{ 
                                fontFamily: "var(--font-mono)", fontSize: "0.55rem", fontWeight: 700,
                                color: delta > 0 ? "var(--amber)" : "var(--red)", marginTop: "-4px" 
                              }}>
                                {delta > 0 ? `(+${Math.round(delta)}€)` : `(${Math.round(delta)}€)`}
                              </div>
                            )}
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.3rem" }}>
                              <span style={{ fontSize: "0.65rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>Volumen:</span>
                              <NumInput
                                value={inscritos.tramos[t.id]?.[d] || 0}
                                onChange={v => updateInscritos(t.id, d, Math.round(v))}
                                step={1} small
                                style={{ background: "rgba(0,0,0,0.2)" }}
                              />
                            </div>
                          </div>
                        </td>
                      );
                    })}

                    <td className="text-right" style={{ verticalAlign: "middle", paddingRight: 8 }}>
                      <div className="mono" style={{ color: "var(--violet)", fontWeight: 700, fontSize: "0.95rem" }}>
                        {fmt(stats.ingresos)}
                      </div>
                      <div className="mono" style={{ color: "var(--text-muted)", fontSize: "0.65rem", marginTop: 4 }}>
                        {stats.total} ctes
                      </div>
                    </td>

                    <td style={{ verticalAlign: "middle", textAlign: "center" }}>
                      <button
                        onClick={() => handleRequestDelete(t)}
                        title="Eliminar tramo"
                        style={{
                          background: "transparent", color: "var(--red-dim)", border: "none",
                          cursor: "pointer", fontSize: "1rem", padding: "0.3rem",
                          transition: "color 0.2s"
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = "var(--red)"}
                        onMouseLeave={e => e.currentTarget.style.color = "var(--red-dim)"}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}

              <tr className="total-row">
                <td style={{ fontSize: "0.9rem", color: "var(--text)", paddingLeft: 8 }}>
                  TOTALES ACUMULADOS
                </td>
                {DISTANCIAS.map(d => {
                  const supera = maximos[d] > 0 && totalInscritos[d] > maximos[d];
                  const justo  = maximos[d] > 0 && totalInscritos[d] === maximos[d];
                  return (
                    <td key={d} className="text-right" style={{ padding: "0.9rem 0.5rem" }}>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"0.15rem" }}>
                        <span className="mono" style={{ color: supera ? "var(--red)" : DISTANCIA_COLORS[d], fontWeight: supera ? 800 : 700, fontSize: "0.95rem" }}>
                          {totalInscritos[d]}
                          {supera && <span style={{ fontSize:"0.65rem", marginLeft:"0.3rem" }}>⚠️</span>}
                          {justo  && <span style={{ fontSize:"0.65rem", marginLeft:"0.3rem" }}>✅</span>}
                        </span>
                        {supera && (
                          <span style={{ fontFamily:"var(--font-mono)", fontSize:"0.58rem", color:"var(--red)", fontWeight:700 }}>
                            +{totalInscritos[d] - maximos[d]} max
                          </span>
                        )}
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--violet)", marginTop: 2 }}>
                          {fmt((ingresosPorDistancia[d] || 0))}
                        </span>
                      </div>
                    </td>
                  );
                })}
                <td className="text-right mono" style={{ paddingRight: 8 }}>
                  <div style={{ color: "var(--violet)", fontWeight: 800, fontSize: "1.1rem" }}>
                    {fmt(ingresosPorDistancia.total)}
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: 2 }}>
                    {totalInscritos.total} ctes totales
                  </div>
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

            {pendingDelete && (
        <ModalConfirmDelete
          tramo={pendingDelete.tramo}
          stats={pendingDelete.stats}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </>
  );
};
