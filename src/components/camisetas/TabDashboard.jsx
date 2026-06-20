/**
 * TabDashboard.jsx — Fase 3, Tarea 3.4
 * Tab "Resumen" del bloque Camisetas.
 */
import { useState } from "react";
import { fmtEur2, fmtNum2 } from "@/lib/utils";
import { blockCls as cls } from "@/lib/blockStyles";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { TALLAS, TALLAS_NINO, TC, EP, EE, FUENTES_DEFAULT } from "./camisetasConstants";

export function TabDashboard({ stats, pedidos, coste, setCoste, setTab, goToTab, abrirFicha, precioCorrExt, setPrecioCorrExt, ventaPublico, setVentaPublico, precioNoCorrExt, setPrecioNoCorrExt, fuentesActivas, setFuentesActivas, ninoExt = {}, corredoresExt = {} }) {
  const [editCoste,setEditCoste] = useState(false);
  const [wizardAbierto2, setWizardAbierto2] = useState(true);
  const [tmpCoste, setTmpCoste]  = useState({...coste});
  const [editPrecioPlat, setEditPrecioPlat] = useState(false);
  const [tmpPrecioPlat, setTmpPrecioPlat] = useState(precioCorrExt ?? 15);
  const [editPrecioNoCorr, setEditPrecioNoCorr] = useState(false);
  const [tmpPrecioNoCorr, setTmpPrecioNoCorr] = useState(precioNoCorrExt ?? 18);
  const [editVentaPublico, setEditVentaPublico] = useState(false);
  const [tmpVentaPublico, setTmpVentaPublico] = useState({ precio: ventaPublico.precio, cantidad: ventaPublico.cantidad });

  const toggleFuente = (f) => setFuentesActivas(p => ({ ...p, [f]: !p[f] }));

  return (
    <>
      {/* ── Panel de estado del flujo / Setup wizard ── */}
      <div style={{ marginBottom:"1.25rem", border:"1px solid rgba(34,211,238,.15)", borderRadius:10, overflow:"hidden" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:".5rem .85rem", background:"rgba(34,211,238,.04)",
          borderBottom: wizardAbierto2 ? "1px solid rgba(34,211,238,.12)" : "none",
          cursor:"pointer" }} onClick={()=>setWizardAbierto2(v=>!v)}>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:800,
            color:"var(--cyan)", letterSpacing:".06em", textTransform:"uppercase" }}>
            🧭 Estado de configuración
            {[coste.corredor !== 8 || coste.voluntario !== 7, stats.uCorExt > 0, stats.totalPedidosExtras > 0].filter(ok=>!ok).length > 0 && (
              <span style={{ marginLeft:".4rem", color:"var(--amber)" }}>
                · {[coste.corredor !== 8 || coste.voluntario !== 7, stats.uCorExt > 0, stats.totalPedidosExtras > 0].filter(ok=>!ok).length} pendiente{[coste.corredor !== 8 || coste.voluntario !== 7, stats.uCorExt > 0, stats.totalPedidosExtras > 0].filter(ok=>!ok).length!==1?"s":""}
              </span>
            )}
          </div>
          <span style={{ fontSize:"var(--fs-sm)", color:"var(--text-dim)" }}>{wizardAbierto2 ? "▲" : "▼"}</span>
        </div>
        {wizardAbierto2 && <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:".6rem", padding:".6rem .85rem" }}>
        {[
          { icon:"💶", label:"Costes configurados", ok: coste.corredor !== 8 || coste.voluntario !== 7,
            val: `${fmtEur2(coste.corredor)}/corr · ${fmtEur2(coste.voluntario)}/vol`,
            action: () => setEditCoste(true), cta:"Editar" },
          { icon:"🏃", label:"Tallas corredores", ok: stats.uCorExt > 0,
            val: stats.uCorExt > 0 ? `${stats.uCorExt} ud configuradas` : "Sin datos — ir a Pedido al proveedor",
            action: () => setTab("tallas"), cta:"Introducir" },
          { icon:"👥", label:"Voluntarios", ok: stats.uVolAuto > 0,
            val: stats.uVolAuto > 0 ? `${stats.uVolAuto} ud (auto)` : "Sin voluntarios confirmados aún",
            noAction: true },
          { icon:"👕", label:"Extras y familiares", ok: stats.totalPedidosExtras > 0,
            val: stats.totalPedidosExtras > 0 ? `${stats.totalPedidosExtras} pedido${stats.totalPedidosExtras===1?"":"s"} registrados` : "Sin pedidos aún",
            action: () => setTab("pedidos"), cta:"Añadir" },
        ].map(item => (
          <div key={item.label} style={{ padding:".75rem .85rem", borderRadius:"var(--r-sm)",
            background: item.ok ? "rgba(52,211,153,.06)" : "var(--surface2)",
            border: `1px solid ${item.ok ? "rgba(52,211,153,.2)" : "var(--border)"}` }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:".3rem" }}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
                color: item.ok ? "var(--green)" : "var(--text-muted)", textTransform:"uppercase", letterSpacing:".08em" }}>
                {item.icon} {item.label}
              </span>
              <span style={{ fontSize:"var(--fs-sm)" }}>{item.ok ? "✅" : "⚠️"}</span>
            </div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-dim)", lineHeight:1.5 }}>{item.val}</div>
            {!item.ok && !item.noAction && item.action && (
              <button onClick={item.action} style={{ marginTop:".4rem", fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
                color:"var(--cyan)", background:"var(--cyan-dim)", border:"1px solid rgba(34,211,238,.2)",
                borderRadius:4, padding:".15rem .4rem", cursor:"pointer" }}>
                {item.cta} →
              </button>
            )}
          </div>
        ))}
        </div>}
      </div>
      {/* ── BALANCE ECONÓMICO CONSOLIDADO (Expert view) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
        
        {/* Card Principal de Beneficio */}
        <div className="card" style={{ background: "linear-gradient(135deg, var(--surface) 0%, var(--surface2) 100%)", borderLeft: "4px solid var(--green)", padding: "1.25rem", position: "relative", overflow: "hidden", cursor:"pointer", transition:"box-shadow .15s" }} onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate",{detail:{block:"presupuesto"}}))} onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(52,211,153,.12)"} onMouseLeave={e=>e.currentTarget.style.boxShadow=""}>
          <div style={{ position: "absolute", top: -10, right: -10, fontSize: "4rem", opacity: 0.05 }}>💰</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".1em" }}>Beneficio Neto Proyectado</div>
              <div style={{ fontSize: "var(--fs-xl)", fontWeight: 800, color: "var(--green)", marginTop: ".25rem" }}>{fmtEur2(stats.beneficioNetoProyectado)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Realizado</div>
              <div style={{ fontSize: "var(--fs-lg)", fontWeight: 700, color: stats.beneficioNetoReal >= 0 ? "var(--text)" : "var(--red)" }}>{fmtEur2(stats.beneficioNetoReal)}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "1.5rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", textTransform: "uppercase" }}>Ingresos Totales</div>
              <div style={{ fontSize: "var(--fs-md)", fontWeight: 700, color: "var(--cyan)" }}>{fmtEur2(stats.totalIngresosProyectado)}</div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", textTransform: "uppercase" }}>Gastos Fabricación</div>
              <div style={{ fontSize: "var(--fs-md)", fontWeight: 700, color: "var(--amber)" }}>{fmtEur2(stats.totalGastos)}</div>
              {stats.gRegalos > 0 && <div style={{ fontSize: "var(--fs-xs)", color: "var(--violet)", fontWeight: 600 }}>inc. {fmtEur2(stats.gRegalos)} en regalos</div>}
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", textTransform: "uppercase" }}>ROI</div>
              <div style={{ fontSize: "var(--fs-md)", fontWeight: 700, color: "var(--violet)" }}>{stats.totalGastos > 0 ? Math.round((stats.beneficioNetoProyectado / stats.totalGastos) * 100) : 0}%</div>
            </div>
          </div>
        </div>

        {/* Panel de Control de Fuentes */}
        <div className="card" style={{ padding: "1rem" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: ".75rem", display: "flex", alignItems: "center", gap: ".5rem" }}>
            ⚙️ Control de Fuentes de Datos
            <Tooltip text="Activa o desactiva fuentes para ver cómo impactan en el balance económico."><TooltipIcon /></Tooltip>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
            {[
              { id: "corredoresPlat",  label: "Inscritos Plataforma", icon: "🏃", sub: `${stats.uCorExt} ud`, color: "var(--cyan)" },
              { id: "extrasCorredor",  label: "Extras Corredor",     icon: "👕", sub: `${stats.uExtrasCor} ud`, color: "var(--cyan)" },
              { id: "noCorredoresPlat", label: "No corredores (plat.)", icon: "🎫", sub: `${stats.uNoCorrPlat} ud`, color: "var(--orange)" },
              { id: "voluntariosAuto", label: "Voluntarios (Gasto)", icon: "👥", sub: `${stats.uVolAuto} ud`, color: "var(--violet)", tab: "tallas" },
              { id: "extrasVoluntario", label: "Extras Voluntario",   icon: "🛍️", tab: "pedidos", sub: `${stats.uExtrasVol} ud`, color: "var(--violet)" },
            ].map(f => (
              <div key={f.id} className="flex-between" style={{ padding: ".4rem .65rem", background: "var(--surface2)", borderRadius: 8, border: `1px solid ${fuentesActivas[f.id] ? f.color + "44" : "transparent"}`, transition: "all .15s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
                  <span style={{ fontSize: "var(--fs-lg)", opacity: fuentesActivas[f.id] ? 1 : 0.3 }}>{f.icon}</span>
                  <div>
                    <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: fuentesActivas[f.id] ? "var(--text)" : "var(--text-dim)" }}>{f.label}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>{f.sub}</div>
                  </div>
                </div>
                <button 
                  onClick={() => toggleFuente(f.id)}
                  style={{ width: 34, height: 18, borderRadius: 20, background: fuentesActivas[f.id] ? f.color : "var(--border)", border: "none", cursor: "pointer", position: "relative", transition: "all .2s" }}>
                  <div style={{ position: "absolute", top: 2, left: fuentesActivas[f.id] ? 18 : 2, width: 14, height: 14, borderRadius: "50%", background: "white", transition: "all .2s" }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPIs operativos — solo lo que no está en la card principal ── */}
      <div className="kpi-grid mb">
        <div className="kpi cyan" style={{cursor:"pointer"}} onClick={() => goToTab ? goToTab("pedidos",{pago:"todos",ent:"todos"}) : setTab("pedidos")}>
          <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>👕 Pedidos extras<Tooltip text={"Cantidad de pedidos ingresados manualmente para solicitantes extra."}><TooltipIcon size={11}/></Tooltip></div>
          <div className="kpi-value">{stats.totalPedidosExtras}</div>
          <div className="kpi-sub">{stats.totalPedidosExtras===0?"sin pedidos manuales":"pedidos manuales"}</div>
        </div>
        <div className={`kpi ${stats.cPendCobro > 0 ? "amber" : "green"}`} style={{cursor:"pointer"}} onClick={() => goToTab ? goToTab("pedidos",{pago:"pendiente",ent:"todos"}) : setTab("pedidos")}>
          <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>⏳ Pendiente cobro<Tooltip text={"Importe total de pedidos manuales que aún no han sido cobrados."}><TooltipIcon size={11}/></Tooltip></div>
          <div className="kpi-value">{fmtEur2(stats.cPendCobro)}</div>
          <div className="kpi-sub">{stats.cPendCobro > 0 ? "por cobrar" : "todo cobrado ✓"}</div>
        </div>
        <div className={`kpi ${stats.pendEnt > 0 ? "cyan" : "green"}`} style={{cursor:"pointer"}} onClick={() => goToTab ? goToTab("checklist") : setTab("checklist")}>
          <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>📦 Por entregar<Tooltip text={"Cantidad de unidades correspondientes a pedidos extra que siguen pendientes de entrega."}><TooltipIcon size={11}/></Tooltip></div>
          <div className="kpi-value">{stats.pendEnt}</div>
          <div className="kpi-sub">{stats.pendEnt > 0 ? "unidades pendientes" : "todo entregado ✓"}</div>
        </div>
        <div className="kpi cyan" style={{cursor:"pointer"}} onClick={() => goToTab ? goToTab("tallas") : setTab("tallas")}>
          <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>🔢 Total unidades<Tooltip text={"Suma total de unidades calculadas de todas las fuentes activas."}><TooltipIcon size={11}/></Tooltip></div>
          <div className="kpi-value">{stats.totalUnidades}</div>
          <div className="kpi-sub">🏃 {stats.uCorExt + stats.uExtrasCor} cor · 👥 {stats.uVolAuto + stats.uExtrasVol} vol</div>
        </div>
      </div>

      {/* ── Configuración ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem", marginBottom: ".85rem" }}>
        <div className="card" style={{ borderLeft: "3px solid var(--primary)", cursor:"pointer", transition:"box-shadow .12s" }} onClick={() => !editCoste && setEditCoste(true)} onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,.12)"} onMouseLeave={e=>e.currentTarget.style.boxShadow=""}>
          <div className="flex-between">
            <div>
              <div style={{ fontWeight: 700, fontSize: "var(--fs-base)", marginBottom: ".15rem" }}>
                <Tooltip text="Coste unitario de fabricación."><span style={{ color: "var(--primary)" }}>⚙️ Coste producción</span><TooltipIcon /></Tooltip>
              </div>
            </div>
            {editCoste ? (
              <div
                style={{ display: "flex", gap: ".5rem", alignItems: "center" }}
                onBlur={e => {
                  // Solo guardar si el foco sale del GRUPO completo (no al tabular entre los 3 inputs)
                  if (!e.currentTarget.contains(e.relatedTarget)) { setCoste(tmpCoste); setEditCoste(false); }
                }}
              >
                {["corredor","voluntario","nino"].map(tipo => (
                  <input key={tipo} type="number" min="0" step="0.5" value={tmpCoste[tipo]}
                    onChange={e => setTmpCoste(p => ({ ...p, [tipo]: parseFloat(e.target.value) || 0 }))}
                    onKeyDown={e => { if (e.key === "Enter") { setCoste(tmpCoste); setEditCoste(false); } }}
                    style={{ width: 50, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 4, padding: ".2rem", fontSize: "var(--fs-sm)" }} />
                ))}
                <button className="btn btn-primary btn-sm" onClick={() => { setCoste(tmpCoste); setEditCoste(false); }}>OK</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: ".6rem" }}>
{["corredor","voluntario","nino"].map(tipo => <span key={tipo} className="mono xs">{TC[tipo].icon} {fmtNum2(coste[tipo])}€</span>)}
                <button className="btn btn-ghost btn-sm" aria-label="Editar coste de camiseta" onClick={() => setEditCoste(true)}>✏️</button>
              </div>
            )}
          </div>
        </div>
        <div className="card" style={{ borderLeft: "3px solid var(--cyan)", cursor:"pointer", transition:"box-shadow .12s" }} onClick={() => !editPrecioPlat && setEditPrecioPlat(true)} onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 12px rgba(34,211,238,.1)"} onMouseLeave={e=>e.currentTarget.style.boxShadow=""}>
          <div className="flex-between">
            <div>
              <div style={{ fontWeight: 700, fontSize: "var(--fs-base)", marginBottom: ".15rem" }}>
                <Tooltip text="Precio de venta de la camiseta para corredores inscritos en plataforma externa."><span style={{ color: "var(--cyan)" }}>🏃 Precio corredores</span><TooltipIcon /></Tooltip>
              </div>
            </div>
            {editPrecioPlat ? (
              <div style={{ display: "flex", gap: ".5rem" }}>
                <input
                  type="number" min="0" step="0.5" value={tmpPrecioPlat} autoFocus
                  onChange={e => setTmpPrecioPlat(parseFloat(e.target.value))}
                  onKeyDown={e => { if (e.key === "Enter") { setPrecioCorrExt(tmpPrecioPlat); setEditPrecioPlat(false); } }}
                  onBlur={() => { setPrecioCorrExt(tmpPrecioPlat); setEditPrecioPlat(false); }}
                  style={{ width: 60, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--cyan)", borderRadius: 4, padding: ".2rem", fontSize: "var(--fs-sm)" }} />
                <button className="btn btn-primary btn-sm" onClick={() => { setPrecioCorrExt(tmpPrecioPlat); setEditPrecioPlat(false); }}>OK</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: ".6rem", alignItems: "center" }}>
                <span className="mono">{fmtNum2(precioCorrExt)}€</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditPrecioPlat(true)} aria-label="Editar">✏️</button>
              </div>
            )}
          </div>
        </div>
        {/* Tarjeta: Precio no corredores (plataforma) */}
        <div className="card" style={{ borderLeft: "3px solid var(--orange)", cursor:"pointer", transition:"box-shadow .12s" }} onClick={() => !editPrecioNoCorr && setEditPrecioNoCorr(true)} onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 12px rgba(251,146,60,.12)"} onMouseLeave={e=>e.currentTarget.style.boxShadow=""}>
          <div className="flex-between">
            <div>
              <div style={{ fontWeight: 700, fontSize: "var(--fs-base)", marginBottom: ".15rem" }}>
                <Tooltip text="Precio de venta de la camiseta modelo corredor para personas que NO se inscriben a la carrera, compradas desde la plataforma de inscripción."><span style={{ color: "var(--orange)" }}>🎫 Precio no corredores</span><TooltipIcon /></Tooltip>
              </div>
            </div>
            {editPrecioNoCorr ? (
              <div style={{ display: "flex", gap: ".5rem" }}>
                <input
                  type="number" min="0" step="0.5" value={tmpPrecioNoCorr} autoFocus
                  onChange={e => setTmpPrecioNoCorr(parseFloat(e.target.value))}
                  onKeyDown={e => { if (e.key === "Enter") { setPrecioNoCorrExt(tmpPrecioNoCorr); setEditPrecioNoCorr(false); } }}
                  onBlur={() => { setPrecioNoCorrExt(tmpPrecioNoCorr); setEditPrecioNoCorr(false); }}
                  style={{ width: 60, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--orange)", borderRadius: 4, padding: ".2rem", fontSize: "var(--fs-sm)" }} />
                <button className="btn btn-primary btn-sm" onClick={() => { setPrecioNoCorrExt(tmpPrecioNoCorr); setEditPrecioNoCorr(false); }}>OK</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: ".6rem", alignItems: "center" }}>
                <span className="mono">{fmtNum2(precioNoCorrExt)}€</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditPrecioNoCorr(true)} aria-label="Editar">✏️</button>
              </div>
            )}
          </div>
        </div>
        {/* Tarjeta: Precio venta pública (no corredores) */}
        <div className="card" style={{ borderLeft: "3px solid var(--violet)", cursor:"pointer", transition:"box-shadow .12s", gridColumn: "1 / -1" }}
          onClick={() => !editVentaPublico && setEditVentaPublico(true)}
          onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 12px rgba(167,139,250,.12)"}
          onMouseLeave={e=>e.currentTarget.style.boxShadow=""}>
          <div className="flex-between" style={{flexWrap:"wrap",gap:".5rem"}}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "var(--fs-base)", marginBottom: ".15rem" }}>
                <Tooltip text="Camisetas que se venden al público general (no corredores). Edita el precio y la cantidad estimada.">
                  <span style={{ color: "var(--violet)" }}>🛍️ Precio venta pública</span><TooltipIcon />
                </Tooltip>
              </div>
              {!editVentaPublico && (
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)", marginTop:".2rem" }}>
                  {ventaPublico.cantidad} ud × {fmtNum2(ventaPublico.precio)}€ = <span style={{color:"var(--violet)",fontWeight:700}}>{fmtNum2(ventaPublico.cantidad * ventaPublico.precio)}€</span>
                  {ventaPublico.cantidad === 0 && <span style={{marginLeft:".5rem",color:"var(--amber)"}}>⚠️ Sin unidades configuradas</span>}
                </div>
              )}
            </div>
            {editVentaPublico ? (
              <div style={{ display:"flex", gap:".5rem", alignItems:"center", flexWrap:"wrap" }}>
                <div>
                  <label className="fl" style={{color:"var(--violet)"}}>Precio venta (€)</label>
                  <input type="number" min="0" step="0.5"
                    value={tmpVentaPublico.precio}
                    onChange={e => setTmpVentaPublico(p => ({...p, precio: parseFloat(e.target.value)||0}))}
                    style={{ width:70, background:"var(--surface2)", border:"1px solid rgba(167,139,250,.4)", color:"var(--violet)", borderRadius:4, padding:".25rem .4rem", fontSize:"var(--fs-sm)" }} />
                </div>
                <div>
                  <label className="fl" style={{color:"var(--violet)"}}>Nº unidades</label>
                  <input type="number" min="0" step="1"
                    value={tmpVentaPublico.cantidad}
                    onChange={e => setTmpVentaPublico(p => ({...p, cantidad: parseInt(e.target.value)||0}))}
                    style={{ width:70, background:"var(--surface2)", border:"1px solid rgba(167,139,250,.4)", color:"var(--violet)", borderRadius:4, padding:".25rem .4rem", fontSize:"var(--fs-sm)" }} />
                </div>
                <div style={{display:"flex",gap:".35rem",alignItems:"flex-end",paddingBottom:1}}>
                  <button className="btn btn-primary btn-sm"
                    onClick={() => { setVentaPublico({ precio: tmpVentaPublico.precio, cantidad: tmpVentaPublico.cantidad }); setEditVentaPublico(false); }}>
                    Guardar
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setTmpVentaPublico({precio:ventaPublico.precio,cantidad:ventaPublico.cantidad}); setEditVentaPublico(false); }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={() => { setTmpVentaPublico({precio:ventaPublico.precio,cantidad:ventaPublico.cantidad}); setEditVentaPublico(true); }} aria-label="Editar venta pública">✏️</button>
            )}
          </div>
        </div>
      </div>

      {/* Pedidos pendientes de cobro o entrega */}
      {(() => {
        const pendientes = pedidos.filter(p =>
          p.lineas?.some(l =>
            l.estadoPago === "pendiente" || l.estadoEntrega === "pendiente"
          )
        );
        if (!pendientes.length) return (
          <div className="card" style={{
            padding: ".65rem 1rem", display:"flex", alignItems:"center",
            gap:".5rem", background:"var(--green-dim)",
            border:"1px solid rgba(52,211,153,.2)"
          }}>
            <span>✅</span>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
              color:"var(--green)" }}>
              Todos los pedidos cobrados y entregados
            </span>
          </div>
        );
        return (
          <div className="card">
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", marginBottom:".6rem" }}>
              <div className="card-title" style={{ marginBottom:0 }}>
                ⚡ Requieren atención
              </div>
              <button className="btn btn-ghost btn-sm"
                style={{ fontSize:"var(--fs-xs)" }}
                onClick={() => setTab("pedidos")}>
                Ver todos →
              </button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:".35rem" }}>
              {pendientes.slice(0, 5).map(p => {
                const pendCobro = p.lineas?.filter(l => l.estadoPago === "pendiente").reduce((s,l) => s + l.cantidad * (l.precioVenta || 0), 0) || 0;
                const pendEnt   = p.lineas?.filter(l => l.estadoEntrega === "pendiente").reduce((s,l) => s + l.cantidad, 0) || 0;
                return (
                  <div key={p.id}
                    onClick={() => abrirFicha(p)}
                    style={{
                      display:"flex", alignItems:"center", gap:".65rem",
                      padding:".45rem .65rem", borderRadius:8,
                      background:"var(--surface2)", border:"1px solid var(--border)",
                      cursor:"pointer", transition:"border-color .12s",
                    }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor="var(--border-light)"}
                    onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:"var(--fs-base)", fontWeight:700,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                        display:"flex", alignItems:"center", gap:".3rem" }}>
                        {[...new Set(p.lineas.map(l=>l.tipo))].map(t=>(
                          <span key={t} title={TC[t]?.label} style={{flexShrink:0}}>{TC[t]?.icon}</span>
                        ))}
                        {p.nombre}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:".35rem", flexShrink:0 }}>
                      {pendCobro > 0 && (
                        <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                          fontWeight:700, color:"var(--amber)",
                          background:"var(--amber-dim)",
                          border:"1px solid rgba(251,191,36,.25)",
                          borderRadius:3, padding:".1rem .4rem" }}>
                          ⏳ {fmtEur2(pendCobro)}
                        </span>
                      )}
                      {pendEnt > 0 && (
                        <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                          fontWeight:700, color:"var(--cyan)",
                          background:"var(--cyan-dim)",
                          border:"1px solid rgba(34,211,238,.25)",
                          borderRadius:3, padding:".1rem .4rem" }}>
                          📦 {pendEnt} ud
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── INTEGRACIÓN CON PRESUPUESTO ── */}
      <div style={{ marginTop: ".85rem", borderRadius: 10, border: "1px solid rgba(52,211,153,.2)",
        background: "rgba(52,211,153,.04)", overflow: "hidden" }}>
        {/* Cabecera */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: ".5rem .85rem", borderBottom: "1px solid rgba(52,211,153,.12)" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
            color: "var(--green)", display: "flex", alignItems: "center", gap: ".35rem" }}>
            💶 Sincronizado con Presupuesto
            <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>· automático</span>
          </span>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block: "presupuesto" } }))}
            style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
              color: "var(--green)", background: "transparent", border: "none",
              cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: ".2rem" }}>
            Ver Presupuesto →
          </button>
        </div>
        {/* Métricas en grid */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${stats.gRegalos > 0 ? 3 : 2}, 1fr)`,
          gap: 0 }}>
          {[
            { label: "Gasto fab.", value: fmtEur2(stats.totalGastos),           color: "var(--amber)" },
            { label: "Ingresos",   value: fmtEur2(stats.totalIngresosProyectado), color: "var(--cyan)"  },
            ...(stats.gRegalos > 0 ? [{ label: "Regalos", value: fmtEur2(stats.gRegalos), color: "var(--violet)" }] : []),
          ].map((m, i, arr) => (
            <div key={m.label} style={{ padding: ".55rem .75rem", textAlign: "center",
              borderRight: i < arr.length - 1 ? "1px solid rgba(52,211,153,.1)" : "none" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-2xs)",
                color: "var(--text-muted)", marginBottom: ".15rem", textTransform: "uppercase",
                letterSpacing: ".05em" }}>{m.label}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)",
                fontWeight: 800, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}


