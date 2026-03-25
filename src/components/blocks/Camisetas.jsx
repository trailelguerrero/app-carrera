import { useState, useMemo } from "react";
import { useData } from "@/lib/dataService";
import { BLOCK_CSS, blockCls as cls } from "@/lib/blockStyles";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const LS = "teg_camisetas_v1";
const genId = (arr) => arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1;
const fmt = (n) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
const fmtN = (n) => new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const TALLAS = ["XXS","XS","S","M","L","XL","XXL","3XL","4XL"];
const TIPOS  = ["corredor","voluntario"];
const TIPO_CFG = {
  corredor:   { label:"Corredor",   icon:"🏃", color:"var(--cyan)",   dim:"var(--cyan-dim)" },
  voluntario: { label:"Voluntario", icon:"👥", color:"var(--violet)", dim:"var(--violet-dim)" },
};

// Estado del pedido: pago + entrega + regalo son independientes
const ESTADO_PAGO = ["pendiente","pagado","regalo"];
const ESTADO_PAGO_CFG = {
  pendiente: { label:"Pendiente",  color:"var(--amber)", bg:"var(--amber-dim)",  icon:"⏳" },
  pagado:    { label:"Pagado",     color:"var(--green)", bg:"var(--green-dim)",  icon:"✅" },
  regalo:    { label:"Regalo",     color:"var(--violet)",bg:"var(--violet-dim)", icon:"🎁" },
};
const ESTADO_ENTREGA = ["pendiente","entregado"];
const ESTADO_ENTREGA_CFG = {
  pendiente: { label:"Pendiente",  color:"var(--amber)", bg:"var(--amber-dim)",  icon:"📦" },
  entregado: { label:"Entregado",  color:"var(--green)", bg:"var(--green-dim)",  icon:"✔️" },
};

// ─── DATOS DEFAULT ────────────────────────────────────────────────────────────
const PEDIDOS_DEFAULT = [
  {
    id: 1, nombre: "Ejemplo Persona", telefono: "600000001", email: "ejemplo@email.com",
    notas: "Familiar del organizador",
    lineas: [
      { id: 1, tipo: "corredor",   talla: "M", cantidad: 1, precioVenta: 15, estadoPago: "pagado",  estadoEntrega: "pendiente" },
      { id: 2, tipo: "voluntario", talla: "L", cantidad: 2, precioVenta: 0,  estadoPago: "regalo",  estadoEntrega: "pendiente" },
    ]
  },
];

const COSTE_DEFAULT = { corredor: 8, voluntario: 7 };

// ─── CÁLCULOS (estadoPago y estadoEntrega son por LÍNEA) ──────────────────────
const calcLinea = (l, coste) => ({
  subVenta: l.estadoPago === "regalo" ? 0 : l.cantidad * l.precioVenta,
  subCoste: l.cantidad * (coste[l.tipo] || 0),
  subBenef: l.estadoPago === "regalo"
    ? -(l.cantidad * (coste[l.tipo] || 0))
    : l.cantidad * (l.precioVenta - (coste[l.tipo] || 0)),
});
const calcPedido = (p, coste) => {
  const rows = p.lineas.map(l => calcLinea(l, coste));
  return {
    totalVenta: rows.reduce((s,r) => s + r.subVenta, 0),
    totalCoste: rows.reduce((s,r) => s + r.subCoste, 0),
    totalBenef: rows.reduce((s,r) => s + r.subBenef, 0),
    totalUnid:  p.lineas.reduce((s,l) => s + l.cantidad, 0),
  };
};
// Badge de resumen del pedido — refleja estado mixto
const badgePago = (p) => {
  const pagos = [...new Set(p.lineas.map(l => l.estadoPago))];
  if (pagos.length === 1) return ESTADO_PAGO_CFG[pagos[0]];
  if (pagos.includes("pendiente")) return { ...ESTADO_PAGO_CFG.pendiente, label: "Mixto" };
  return { ...ESTADO_PAGO_CFG.pagado, label: "Mixto" };
};

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [rawPedidos, setPedidos] = useData(LS + "_pedidos", PEDIDOS_DEFAULT);
  const pedidos = Array.isArray(rawPedidos) ? rawPedidos : [];
  const [coste, setCoste] = useData(LS + "_coste", COSTE_DEFAULT);

  const [modal, setModal]   = useState(null); // {tipo:"pedido", data?}
  const [ficha, setFicha]   = useState(null); // pedido completo
  const [delId, setDelId]   = useState(null);

  const scrollTop = () => { const m = document.querySelector("main"); if (m) m.scrollTo({ top:0, behavior:"instant" }); };
  const abrirFicha  = (p) => { scrollTop(); setFicha(p); };
  const abrirModal  = (data) => { scrollTop(); setModal({ data: data || null }); };
  const abrirEditar = (p) => { scrollTop(); setFicha(null); setModal({ data: p }); };

  const savePedido = (p) => {
    if (p.id) setPedidos(prev => prev.map(x => x.id === p.id ? p : x));
    else      setPedidos(prev => [...prev, { ...p, id: genId(pedidos) }]);
    setModal(null);
  };

  const deletePedido = () => {
    setPedidos(prev => prev.filter(x => x.id !== delId));
    setDelId(null); setFicha(null);
  };
  const updateLinea = (pedidoId, lineaId, campo, valor) =>
    setPedidos(prev => prev.map(p => p.id !== pedidoId ? p : {
      ...p, lineas: p.lineas.map(l => l.id !== lineaId ? l : { ...l, [campo]: valor })
    }));

  const updatePedido = (id, campo, valor) =>
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, [campo]: valor } : p));

  const TABS = [
    { id:"dashboard", icon:"📊", label:"Dashboard"   },
    { id:"pedidos",   icon:"👕", label:"Pedidos"      },
    { id:"tallas",    icon:"📐", label:"Tallas"       },
    { id:"checklist", icon:"✅", label:"Producción"   },
  ];

  const stats = useMemo(() => {
    const total   = pedidos.length;
    const unid    = pedidos.reduce((s,p) => s + p.lineas.reduce((a,l) => a+l.cantidad, 0), 0);
    const recaud  = pedidos.reduce((s,p) => s + p.lineas.filter(l=>l.estadoPago==="pagado")
                      .reduce((a,l) => a + l.cantidad*l.precioVenta, 0), 0);
    const pCobro  = pedidos.reduce((s,p) => s + p.lineas.filter(l=>l.estadoPago==="pendiente")
                      .reduce((a,l) => a + l.cantidad*l.precioVenta, 0), 0);
    const benef   = pedidos.reduce((s,p) => s + calcPedido(p,coste).totalBenef, 0);
    const regalos = pedidos.reduce((s,p) => s + p.lineas.filter(l=>l.estadoPago==="regalo")
                      .reduce((a,l) => a + l.cantidad, 0), 0);
    const pEnt    = pedidos.reduce((s,p) => s + p.lineas.filter(l=>l.estadoEntrega==="pendiente")
                      .reduce((a,l) => a + l.cantidad, 0), 0);
    return { total, unid, recaud, pCobro, benef, regalos, pEnt };
  }, [pedidos, coste]);

  return (
    <>
      <style>{BLOCK_CSS + CSS}</style>
      <div className="block-container">
        <div className="block-header">
          <div>
            <h1 className="block-title">👕 Camisetas Extra</h1>
            <div className="block-title-sub">Pedidos externos · Trail El Guerrero 2026</div>
          </div>
          <div className="block-actions">
            {stats.pCobro > 0 && <span className="badge badge-amber">⏳ {fmt(stats.pCobro)} pendiente</span>}
            {stats.pEnt  > 0 && <span className="badge badge-cyan">📦 {stats.pEnt} por entregar</span>}
            <button className="btn btn-primary" onClick={() => abrirModal(null)}>+ Nuevo pedido</button>
          </div>
        </div>

        <div className="tabs">
          {TABS.map(t => (
            <button key={t.id} className={cls("tab-btn", tab===t.id && "active")} onClick={()=>setTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div key={tab}>
          {tab==="dashboard" && <TabDashboard stats={stats} pedidos={pedidos} coste={coste} setCoste={setCoste} setTab={setTab} abrirFicha={abrirFicha} />}
          {tab==="pedidos"   && <TabPedidos   pedidos={pedidos} coste={coste} abrirFicha={abrirFicha} abrirModal={abrirModal} updatePedido={updatePedido} />}
          {tab==="tallas"    && <TabTallas    pedidos={pedidos} />}
          {tab==="checklist" && <TabChecklist pedidos={pedidos} coste={coste} updateLinea={updateLinea} abrirFicha={abrirFicha} />}
        </div>
      </div>

      {/* FICHA */}
      {ficha && (
        <FichaPedido
          pedido={ficha}
          coste={coste}
          onClose={()=>setFicha(null)}
          onEditar={()=>abrirEditar(pedidos.find(p=>p.id===ficha.id)||ficha)}
          onEliminar={()=>{ setDelId(ficha.id); setFicha(null); }}
          updateLinea={updateLinea}
        />
      )}

      {/* MODAL CREAR/EDITAR */}
      {modal && (
        <ModalPedido
          data={modal.data}
          coste={coste}
          onSave={savePedido}
          onClose={()=>setModal(null)}
        />
      )}

      {/* CONFIRM DELETE */}
      {delId && (
        <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setDelId(null)}>
          <div className="modal" style={{maxWidth:340,textAlign:"center"}}>
            <div className="modal-body" style={{paddingTop:"1.5rem"}}>
              <div style={{fontSize:"2.5rem",marginBottom:".6rem"}}>⚠️</div>
              <div style={{fontWeight:700,marginBottom:".4rem"}}>¿Eliminar pedido?</div>
              <div className="mono xs muted">Esta acción no se puede deshacer.</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setDelId(null)}>Cancelar</button>
              <button className="btn btn-red"   onClick={deletePedido}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── TAB DASHBOARD ────────────────────────────────────────────────────────────
function TabDashboard({ stats, pedidos, coste, setCoste, setTab, abrirFicha }) {
  const [editCoste, setEditCoste] = useState(false);
  const [tmpCoste, setTmpCoste]   = useState({ ...coste });

  // Resumen por tipo y talla
  const porTipo = TIPOS.map(tipo => {
    const lineas = pedidos.flatMap(p => p.lineas.filter(l => l.tipo===tipo));
    const unidades = lineas.reduce((s,l) => s+l.cantidad, 0);
    const costeT = lineas.reduce((s,l) => s+l.cantidad*(coste[tipo]||0), 0);
    const ventaT = lineas.reduce((s,l) => s+l.cantidad*l.precioVenta, 0);
    return { tipo, unidades, costeT, ventaT, cfg: TIPO_CFG[tipo] };
  });

  const recientes = [...pedidos].sort((a,b) => b.id - a.id).slice(0, 5);

  return (
    <>
      <div className="kpi-grid mb">
        {[
          { l:"👕 Pedidos",      v: stats.total,           s:"personas",           color:"cyan",   tab:"pedidos"   },
          { l:"📦 Unidades",     v: stats.unid,         s:"camisetas totales",  color:"violet", tab:"tallas"    },
          { l:"✅ Recaudado",    v: fmt(stats.recaud),   s:"cobrado",            color:"green",  tab:"pedidos"   },
          { l:"⏳ Por cobrar",   v: fmt(stats.pCobro),   s:"pendiente de pago",  color:"amber",  tab:"pedidos"   },
          { l:"💰 Beneficio",    v: fmt(stats.benef),   s:"venta − coste",      color: stats.benef>=0?"green":"red", tab:"pedidos" },
          { l:"🎁 Regalos",      v: stats.regalos,          s:"pedidos regalo",     color:"violet", tab:"pedidos"   },
        ].map(k => (
          <div key={k.l} className={`kpi ${k.color}`} style={{cursor:"pointer"}} onClick={()=>setTab(k.tab)}>
            <div className="kpi-label">{k.l}</div>
            <div className="kpi-value">{k.v}</div>
            <div className="kpi-sub">{k.s}</div>
          </div>
        ))}
      </div>

      {/* Precio de coste global */}
      <div className="card mb" style={{borderLeft:"3px solid var(--primary)"}}>
        <div className="flex-between">
          <div>
            <div style={{fontWeight:700,fontSize:".9rem",marginBottom:".15rem"}}>⚙️ Precio de coste</div>
            <div className="mono xs muted">Coste unitario para la organización — afecta al beneficio</div>
          </div>
          {editCoste ? (
            <div style={{display:"flex",gap:".5rem",alignItems:"center",flexWrap:"wrap"}}>
              {TIPOS.map(tipo => (
                <label key={tipo} style={{display:"flex",alignItems:"center",gap:".35rem",fontFamily:"var(--font-mono)",fontSize:".72rem"}}>
                  <span style={{color:TIPO_CFG[tipo].color}}>{TIPO_CFG[tipo].icon} {TIPO_CFG[tipo].label}</span>
                  <input type="number" min="0" step="0.5" value={tmpCoste[tipo]||0}
                    onChange={e=>setTmpCoste(p=>({...p,[tipo]:parseFloat(e.target.value)||0}))}
                    style={{width:60,background:"var(--surface2)",border:"1px solid var(--border)",color:"var(--text)",borderRadius:"var(--r-sm)",padding:".25rem .4rem",fontFamily:"var(--font-mono)",fontSize:".72rem",textAlign:"right"}} />
                  <span className="mono xs muted">€</span>
                </label>
              ))}
              <button className="btn btn-primary btn-sm" onClick={()=>{setCoste(tmpCoste);setEditCoste(false);}}>OK</button>
              <button className="btn btn-ghost  btn-sm" onClick={()=>setEditCoste(false)}>✕</button>
            </div>
          ) : (
            <div style={{display:"flex",gap:"1rem",alignItems:"center"}}>
              {TIPOS.map(tipo => (
                <span key={tipo} style={{fontFamily:"var(--font-mono)",fontSize:".78rem",color:TIPO_CFG[tipo].color}}>
                  {TIPO_CFG[tipo].icon} {fmtN(coste[tipo]||0)} €
                </span>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={()=>{setTmpCoste({...coste});setEditCoste(true);}}>✏️ Editar</button>
            </div>
          )}
        </div>
      </div>

      <div className="grid-2">
        {/* Por tipo */}
        <div className="card">
          <div className="card-title">🏷️ Resumen por tipo</div>
          {porTipo.map(({tipo,unidades,costeT,ventaT,cfg}) => (
            <div key={tipo} style={{display:"flex",gap:".75rem",alignItems:"center",marginBottom:".75rem"}}>
              <div style={{width:36,height:36,borderRadius:8,background:cfg.dim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.1rem",flexShrink:0}}>{cfg.icon}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:".2rem"}}>
                  <span style={{fontSize:".78rem",fontWeight:700,color:cfg.color}}>{cfg.label}</span>
                  <span className="mono xs muted">{unidades} ud</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span className="mono xs muted">Coste: {fmt(costeT)}</span>
                  <span className="mono xs" style={{color:cfg.color}}>Venta: {fmt(ventaT)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Últimos pedidos */}
        <div className="card">
          <div className="card-title">🕐 Últimos pedidos</div>
          {recientes.length === 0 && <div className="empty-state"><div className="empty-state-icon">👕</div>Sin pedidos aún</div>}
          {recientes.map(p => {
            const {totalUnid} = calcPedido(p, coste);
            const ecpago    = ESTADO_PAGO_CFG[p.estadoPago];
            return (
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:".6rem",padding:".4rem 0",borderBottom:"1px solid rgba(30,45,80,.3)",cursor:"pointer"}}
                onClick={()=>abrirFicha(p)}>
                <span style={{fontSize:"1rem"}}>{ecpago.icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:".78rem",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nombre}</div>
                  <div className="mono xs muted">{totalUnid} ud · {p.lineas.map(l=>`${l.cantidad}×${TIPO_CFG[l.tipo]?.icon}${l.talla}`).join(" ")}</div>
                </div>
                <span className="badge" style={{background:ecpago.bg,color:ecpago.color,fontSize:".55rem"}}>{ecpago.label}</span>
              </div>
            );
          })}
          <button className="btn btn-ghost mt1" style={{width:"100%"}} onClick={()=>setTab("pedidos")}>Ver todos →</button>
        </div>
      </div>
    </>
  );
}

// ─── TAB PEDIDOS ──────────────────────────────────────────────────────────────
function TabPedidos({ pedidos, coste, abrirFicha, abrirModal, updateLinea }) {
  const [vistaKanban,  setVistaKanban]  = useState(false);
  const [ordenAlfa,    setOrdenAlfa]    = useState(false);
  const [filtroPago,   setFiltroPago]   = useState("todos");
  const [filtroEntrega,setFiltroEntrega]= useState("todos");
  const [busqueda,     setBusqueda]     = useState("");

  const filtrados = useMemo(() => {
    let list = pedidos.filter(p => {
      const q  = busqueda.toLowerCase();
      const mQ = !q || p.nombre.toLowerCase().includes(q) || (p.telefono||"").includes(q) || (p.email||"").toLowerCase().includes(q);
      const mP = filtroPago    === "todos" || p.lineas.some(l => l.estadoPago    === filtroPago);
      const mE = filtroEntrega === "todos" || p.lineas.some(l => l.estadoEntrega === filtroEntrega);
      return mQ && mP && mE;
    });
    if (ordenAlfa) list = [...list].sort((a,b) => a.nombre.localeCompare(b.nombre,"es"));
    return list;
  }, [pedidos, busqueda, filtroPago, filtroEntrega, ordenAlfa]);

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">Pedidos</div>
          <div className="pd">{pedidos.length} pedidos {pedidos.reduce((s,p)=>s+p.lineas.reduce((a,l)=>a+l.cantidad,0),0)} unidades</div>
        </div>
        <div className="fr g1" style={{flexWrap:"wrap"}}>
          <div style={{display:"flex",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:"var(--r-sm)",overflow:"hidden"}}>
            {[["lista","lista"],["kanban","kanban"]].map(([v,ic])=>(
              <button key={v} onClick={()=>setVistaKanban(v==="kanban")}
                style={{padding:".3rem .55rem",border:"none",cursor:"pointer",fontFamily:"var(--font-mono)",fontSize:".62rem",fontWeight:700,
                  background:(vistaKanban&&v==="kanban")||(!vistaKanban&&v==="lista")?"rgba(99,102,241,.2)":"transparent",
                  color:(vistaKanban&&v==="kanban")||(!vistaKanban&&v==="lista")?"#c4c6ff":"var(--text-muted)"}}>
                {v==="lista"?"☰":"⬛"}
              </button>
            ))}
          </div>
          <button className={cls("btn btn-sm",ordenAlfa?"btn-primary":"btn-ghost")} onClick={()=>setOrdenAlfa(v=>!v)}>{ordenAlfa?"A-Z ✓":"A-Z"}</button>
          <button className="btn btn-primary" onClick={()=>abrirModal(null)}>+ Nuevo pedido</button>
        </div>
      </div>

      <div className="card" style={{marginBottom:".75rem",padding:".65rem .85rem"}}>
        <div style={{display:"flex",gap:".6rem",flexWrap:"wrap",alignItems:"center"}}>
          <input className="inp" placeholder="Buscar nombre, telefono..." value={busqueda}
            onChange={e=>setBusqueda(e.target.value)} style={{maxWidth:220}} />
          <select className="inp" value={filtroPago} onChange={e=>setFiltroPago(e.target.value)} style={{width:"auto"}}>
            <option value="todos">Pago: todos</option>
            {Object.entries(ESTADO_PAGO_CFG).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
          <select className="inp" value={filtroEntrega} onChange={e=>setFiltroEntrega(e.target.value)} style={{width:"auto"}}>
            <option value="todos">Entrega: todos</option>
            {Object.entries(ESTADO_ENT_CFG).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
          {(busqueda||filtroPago!=="todos"||filtroEntrega!=="todos")&&(
            <button className="btn btn-ghost btn-sm" onClick={()=>{setBusqueda("");setFiltroPago("todos");setFiltroEntrega("todos");}}>X Limpiar</button>
          )}
        </div>
      </div>

      {filtrados.length===0&&<div className="empty-state"><div className="empty-state-icon">👕</div>Sin pedidos con estos filtros</div>}

      {vistaKanban ? (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:".65rem"}}>
          {Object.entries(ESTADO_PAGO_CFG).map(([estado,cfg]) => {
            const items = filtrados.filter(p => {
              const counts = {};
              p.lineas.forEach(l => { counts[l.estadoPago] = (counts[l.estadoPago]||0) + l.cantidad; });
              return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0] === estado;
            });
            return (
              <div key={estado} style={{background:"var(--surface)",border:"1px solid var(--border)",borderTop:`2px solid ${cfg.color}`,borderRadius:"var(--r)",overflow:"hidden"}}>
                <div style={{padding:".6rem .75rem",background:"var(--surface2)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:".7rem",fontWeight:700,color:cfg.color}}>{cfg.icon} {cfg.label}</span>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:".6rem",padding:".1rem .35rem",borderRadius:4,background:cfg.bg,color:cfg.color}}>{items.length}</span>
                </div>
                {items.map(p => {
                  const {totalVenta,totalUnid} = calcPedido(p,coste);
                  const hayPendEnt = p.lineas.some(l=>l.estadoEntrega==="pendiente");
                  const ecEnt = hayPendEnt ? ESTADO_ENT_CFG.pendiente : ESTADO_ENT_CFG.entregado;
                  return (
                    <div key={p.id} style={{margin:".4rem .4rem 0",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:".6rem .7rem",cursor:"pointer",transition:"all .15s"}}
                      onClick={()=>abrirFicha(p)}
                      onMouseEnter={e=>e.currentTarget.style.borderColor="var(--border-light)"}
                      onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
                      <div style={{fontWeight:700,fontSize:".78rem",marginBottom:".25rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nombre}</div>
                      <div style={{display:"flex",gap:".25rem",flexWrap:"wrap",marginBottom:".3rem"}}>
                        {p.lineas.map((l,i) => {
                          const epCfg = ESTADO_PAGO_CFG[l.estadoPago];
                          return (
                            <span key={i} style={{fontFamily:"var(--font-mono)",fontSize:".55rem",padding:".06rem .3rem",borderRadius:3,
                              background:TIPO_CFG[l.tipo]?.dim,color:TIPO_CFG[l.tipo]?.color,
                              border:`1px solid ${TIPO_CFG[l.tipo]?.color}33`}}>
                              {TIPO_CFG[l.tipo]?.icon}{l.talla}x{l.cantidad} {epCfg.icon}
                            </span>
                          );
                        })}
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span className="mono xs muted">{totalUnid} ud {fmt(totalVenta)}</span>
                        <span className="badge" style={{background:ecEnt.bg,color:ecEnt.color,fontSize:".5rem"}}>{ecEnt.icon}</span>
                      </div>
                    </div>
                  );
                })}
                {items.length===0&&<div style={{padding:"1rem",textAlign:"center",fontFamily:"var(--font-mono)",fontSize:".62rem",color:"var(--text-dim)"}}>-</div>}
                <div style={{height:".4rem"}}/>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:".5rem"}}>
          {filtrados.map(p => {
            const {totalVenta,totalUnid} = calcPedido(p,coste);
            const bp         = badgePago(p);
            const hayPendEnt = p.lineas.some(l=>l.estadoEntrega==="pendiente");
            return (
              <div key={p.id} className="cam-row" onClick={()=>abrirFicha(p)}>
                <div style={{display:"flex",alignItems:"center",gap:".6rem",flex:1,minWidth:0}}>
                  <span style={{fontSize:"1.4rem",flexShrink:0}}>{bp.icon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:".88rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nombre}</div>
                    <div style={{display:"flex",gap:".3rem",flexWrap:"wrap",marginTop:".2rem"}}>
                      {p.lineas.map((l,i) => {
                        const epCfg = ESTADO_PAGO_CFG[l.estadoPago];
                        const eeCfg = ESTADO_ENT_CFG[l.estadoEntrega];
                        return (
                          <span key={i} style={{fontFamily:"var(--font-mono)",fontSize:".6rem",padding:".08rem .35rem",
                            borderRadius:3,background:TIPO_CFG[l.tipo]?.dim,color:TIPO_CFG[l.tipo]?.color,
                            display:"flex",alignItems:"center",gap:".25rem"}}>
                            {TIPO_CFG[l.tipo]?.icon} {l.talla}x{l.cantidad} {epCfg.icon}{eeCfg.icon}
                          </span>
                        );
                      })}
                    </div>
                    {p.notas&&<div className="mono xs muted" style={{marginTop:".1rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.notas}</div>}
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:".3rem",flexShrink:0}}>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:".88rem",fontWeight:800}}>{fmt(totalVenta)}</div>
                  <div style={{display:"flex",gap:".3rem"}}>
                    <span className="badge" style={{background:bp.bg,color:bp.color,fontSize:".52rem"}}>{bp.label}</span>
                    <span className="badge" style={{background:hayPendEnt?ESTADO_ENT_CFG.pendiente.bg:ESTADO_ENT_CFG.entregado.bg,color:hayPendEnt?ESTADO_ENT_CFG.pendiente.color:ESTADO_ENT_CFG.entregado.color,fontSize:".52rem"}}>
                      {hayPendEnt?ESTADO_ENT_CFG.pendiente.icon:ESTADO_ENT_CFG.entregado.icon}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}


// ─── TAB TALLAS ──────────────────────────────────────────────────────────────
function TabTallas({ pedidos }) {
  // Tabla agregada: filas=tallas, columnas=tipos
  const tabla = useMemo(() => {
    const map = {};
    TALLAS.forEach(t => { map[t] = {}; TIPOS.forEach(tp => { map[t][tp] = 0; }); });
    pedidos.forEach(p => p.lineas.forEach(l => {
      if (map[l.talla]) map[l.talla][l.tipo] = (map[l.talla][l.tipo]||0) + l.cantidad;
    }));
    return map;
  }, [pedidos]);

  const totalPorTipo = TIPOS.map(tp => ({
    tp, total: TALLAS.reduce((s,t) => s+(tabla[t]?.[tp]||0), 0)
  }));
  const totalGeneral = totalPorTipo.reduce((s,x)=>s+x.total,0);

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">📐 Tabla de tallas para producción</div>
          <div className="pd">{totalGeneral} unidades totales a producir</div>
        </div>
      </div>

      <div className="card p0">
        <div className="overflow-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>Talla</th>
                {TIPOS.map(tp => (
                  <th key={tp} className="text-right" style={{color:TIPO_CFG[tp].color}}>
                    {TIPO_CFG[tp].icon} {TIPO_CFG[tp].label}
                  </th>
                ))}
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {TALLAS.map(t => {
                const totalFila = TIPOS.reduce((s,tp)=>s+(tabla[t]?.[tp]||0),0);
                if (totalFila===0) return null;
                return (
                  <tr key={t}>
                    <td style={{fontWeight:700,fontFamily:"var(--font-mono)"}}>{t}</td>
                    {TIPOS.map(tp => (
                      <td key={tp} className="text-right">
                        {tabla[t]?.[tp] > 0 ? (
                          <span style={{fontFamily:"var(--font-mono)",fontSize:".85rem",fontWeight:700,
                            color:TIPO_CFG[tp].color,background:TIPO_CFG[tp].dim,
                            padding:".1rem .4rem",borderRadius:4}}>
                            {tabla[t][tp]}
                          </span>
                        ) : <span style={{color:"var(--text-dim)"}}>—</span>}
                      </td>
                    ))}
                    <td className="text-right">
                      <span style={{fontFamily:"var(--font-mono)",fontWeight:800}}>{totalFila}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td style={{fontWeight:700,fontFamily:"var(--font-mono)"}}>TOTAL</td>
                {totalPorTipo.map(({tp,total}) => (
                  <td key={tp} className="text-right" style={{fontFamily:"var(--font-mono)",fontWeight:800,color:TIPO_CFG[tp].color}}>
                    {total}
                  </td>
                ))}
                <td className="text-right" style={{fontFamily:"var(--font-mono)",fontWeight:800}}>{totalGeneral}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Desglose visual por tipo */}
      <div className="grid-2" style={{marginTop:".85rem"}}>
        {TIPOS.map(tp => {
          const tallasTipo = TALLAS.map(t => ({ t, n: tabla[t]?.[tp]||0 })).filter(x=>x.n>0);
          const total = tallasTipo.reduce((s,x)=>s+x.n,0);
          const cfg = TIPO_CFG[tp];
          if (total===0) return null;
          return (
            <div key={tp} className="card" style={{borderLeft:`3px solid ${cfg.color}`}}>
              <div className="card-title" style={{color:cfg.color}}>{cfg.icon} Camiseta {cfg.label} — {total} ud</div>
              {tallasTipo.map(({t,n}) => (
                <div key={t} style={{display:"flex",alignItems:"center",gap:".75rem",marginBottom:".5rem"}}>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:".72rem",fontWeight:700,width:36,flexShrink:0}}>{t}</span>
                  <div style={{flex:1,height:8,background:"var(--surface3)",borderRadius:4,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${(n/total)*100}%`,background:cfg.color,borderRadius:4,transition:"width .4s ease"}}/>
                  </div>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:".72rem",fontWeight:700,color:cfg.color,width:20,textAlign:"right"}}>{n}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── TAB CHECKLIST PRODUCCIÓN ─────────────────────────────────────────────────
function TabChecklist({ pedidos, coste, updateLinea, abrirFicha }) {
  const [filtro, setFiltro] = useState("todos");

  const todasLineas = useMemo(() =>
    pedidos.flatMap(p => p.lineas.map(l => ({...l, pedNombre:p.nombre, pedId:p.id, ped:p})))
  , [pedidos]);

  const filtradas = useMemo(() => todasLineas.filter(l => {
    if (filtro==="todos")        return true;
    if (filtro==="sin-entregar") return l.estadoEntrega==="pendiente";
    if (filtro==="entregado")    return l.estadoEntrega==="entregado";
    if (filtro==="sin-pagar")    return l.estadoPago==="pendiente";
    if (filtro==="pagado")       return l.estadoPago==="pagado";
    if (filtro==="regalo")       return l.estadoPago==="regalo";
    return true;
  }), [todasLineas, filtro]);

  const cntPendEnt  = todasLineas.filter(l=>l.estadoEntrega==="pendiente").length;
  const cntPendPago = todasLineas.filter(l=>l.estadoPago==="pendiente").length;
  const cntReg      = todasLineas.filter(l=>l.estadoPago==="regalo").length;
  const cntPagado   = todasLineas.filter(l=>l.estadoPago==="pagado").length;
  const cntEntregado= todasLineas.filter(l=>l.estadoEntrega==="entregado").length;

  const FILTROS = [
    {id:"todos",        label:`Todos (${todasLineas.length})`,    color:"var(--text-muted)"},
    {id:"sin-entregar", label:`Por entregar (${cntPendEnt})`,     color:"var(--amber)"},
    {id:"entregado",    label:`Entregados (${cntEntregado})`,     color:"var(--green)"},
    {id:"sin-pagar",    label:`Sin pagar (${cntPendPago})`,       color:"var(--amber)"},
    {id:"pagado",       label:`Pagados (${cntPagado})`,           color:"var(--green)"},
    {id:"regalo",       label:`Regalos (${cntReg})`,              color:"var(--violet)"},
  ];

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">Produccion y entrega</div>
          <div className="pd">{cntPendEnt} lineas por entregar {cntPendPago} sin cobrar</div>
        </div>
      </div>
      <div style={{display:"flex",gap:".4rem",flexWrap:"wrap",marginBottom:".85rem"}}>
        {FILTROS.map(f=>(
          <button key={f.id} onClick={()=>setFiltro(f.id)}
            style={{fontFamily:"var(--font-mono)",fontSize:".6rem",fontWeight:700,padding:".28rem .6rem",
              borderRadius:"var(--r-sm)",border:`1px solid ${filtro===f.id?f.color:"var(--border)"}`,
              background:filtro===f.id?`${f.color}18`:"transparent",
              color:filtro===f.id?f.color:"var(--text-muted)",cursor:"pointer",transition:"all .15s"}}>
            {f.label}
          </button>
        ))}
      </div>
      {filtradas.length===0&&<div className="empty-state"><div className="empty-state-icon">✅</div>Sin lineas con estos filtros</div>}
      <div style={{display:"flex",flexDirection:"column",gap:".4rem"}}>
        {filtradas.map(l => {
          const tcfg  = TIPO_CFG[l.tipo];
          const epCfg = ESTADO_PAGO_CFG[l.estadoPago];
          const eeCfg = ESTADO_ENT_CFG[l.estadoEntrega];
          return (
            <div key={`${l.pedId}-${l.id}`} className="card" style={{padding:".7rem 1rem",borderLeft:`3px solid ${eeCfg.color}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:".75rem",flexWrap:"wrap"}}>
                <div style={{cursor:"pointer",flex:1,minWidth:0}} onClick={()=>abrirFicha(l.ped)}>
                  <div style={{fontWeight:700,fontSize:".84rem",marginBottom:".15rem"}}>{l.pedNombre}</div>
                  <div style={{display:"flex",alignItems:"center",gap:".5rem",flexWrap:"wrap"}}>
                    <span style={{fontFamily:"var(--font-mono)",fontSize:".65rem",padding:".1rem .4rem",borderRadius:4,background:tcfg?.dim,color:tcfg?.color}}>
                      {tcfg?.icon} {tcfg?.label} - {l.talla} x {l.cantidad} ud
                    </span>
                    <span className="badge" style={{background:epCfg.bg,color:epCfg.color,fontSize:".55rem"}}>{epCfg.icon} {epCfg.label}</span>
                  </div>
                </div>
                <div style={{display:"flex",gap:".35rem",flexShrink:0}} onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>updateLinea(l.pedId,l.id,"estadoEntrega",l.estadoEntrega==="entregado"?"pendiente":"entregado")}
                    style={{fontFamily:"var(--font-mono)",fontSize:".62rem",fontWeight:700,padding:".3rem .65rem",
                      borderRadius:"var(--r-sm)",border:`1px solid ${eeCfg.color}44`,
                      background:eeCfg.bg,color:eeCfg.color,cursor:"pointer",transition:"all .15s",whiteSpace:"nowrap"}}>
                    {l.estadoEntrega==="entregado"?"Entregado":"Entregar"}
                  </button>
                  {l.estadoPago!=="regalo" && (
                    <button onClick={()=>updateLinea(l.pedId,l.id,"estadoPago",l.estadoPago==="pagado"?"pendiente":"pagado")}
                      style={{fontFamily:"var(--font-mono)",fontSize:".62rem",fontWeight:700,padding:".3rem .65rem",
                        borderRadius:"var(--r-sm)",border:`1px solid ${epCfg.color}44`,
                        background:epCfg.bg,color:epCfg.color,cursor:"pointer",transition:"all .15s",whiteSpace:"nowrap"}}>
                      {l.estadoPago==="pagado"?"Pagado":"Cobrar"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}


// ─── FICHA PEDIDO ─────────────────────────────────────────────────────────────
function FichaPedido({ pedido: p, coste, onClose, onEditar, onEliminar, updateLinea }) {
  const {totalVenta, totalCoste, totalBenef, totalUnid} = calcPedido(p, coste);

  const Row = ({label,value,color}) => (!value && value!==0) ? null : (
    <div style={{display:"flex",justifyContent:"space-between",padding:".4rem 0",borderBottom:"1px solid rgba(30,45,80,.3)"}}>
      <span style={{fontFamily:"var(--font-mono)",fontSize:".6rem",color:"var(--text-muted)",flexShrink:0,marginRight:"1rem"}}>{label}</span>
      <span style={{fontSize:".76rem",fontWeight:600,textAlign:"right",color:color||"var(--text)"}}>{value}</span>
    </div>
  );

  return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:500}}>
        <div style={{borderTop:"3px solid var(--primary)",borderRadius:"16px 16px 0 0"}}>
          <div className="modal-header">
            <div style={{display:"flex",alignItems:"center",gap:".6rem"}}>
              <span style={{fontSize:"1.4rem"}}>👕</span>
              <div>
                <div style={{fontWeight:800,fontSize:".95rem"}}>{p.nombre}</div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:".55rem",color:"var(--text-muted)",marginTop:".1rem",textTransform:"uppercase"}}>
                  {totalUnid} ud {p.lineas.length} linea{p.lineas.length!==1?"s":""}
                </div>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>x</button>
          </div>
        </div>
        <div className="modal-body" style={{gap:".4rem"}}>
          <Row label="Telefono" value={p.telefono} />
          <Row label="Email"    value={p.email} />

          <div style={{background:"var(--surface2)",borderRadius:8,padding:".65rem .75rem",margin:".25rem 0"}}>
            <div style={{fontFamily:"var(--font-mono)",fontSize:".55rem",color:"var(--text-muted)",marginBottom:".5rem",textTransform:"uppercase",letterSpacing:".08em"}}>
              Lineas del pedido
            </div>
            {p.lineas.map((l,i) => {
              const costeU  = coste[l.tipo]||0;
              const cfg     = TIPO_CFG[l.tipo];
              const epCfg   = ESTADO_PAGO_CFG[l.estadoPago];
              const eeCfg   = ESTADO_ENT_CFG[l.estadoEntrega];
              const subVenta= l.estadoPago==="regalo" ? 0 : l.cantidad*l.precioVenta;
              return (
                <div key={i} style={{padding:".5rem 0",borderBottom:i<p.lineas.length-1?"1px solid rgba(30,45,80,.2)":"none"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".3rem"}}>
                    <div style={{display:"flex",alignItems:"center",gap:".5rem"}}>
                      <span style={{fontSize:".9rem"}}>{cfg?.icon}</span>
                      <span style={{fontSize:".78rem",fontWeight:700}}>{cfg?.label} - {l.talla} x {l.cantidad} ud</span>
                    </div>
                    <span style={{fontFamily:"var(--font-mono)",fontSize:".78rem",fontWeight:700,color:cfg?.color}}>
                      {l.estadoPago==="regalo"?"REGALO":fmt(subVenta)}
                    </span>
                  </div>
                  <div style={{display:"flex",gap:".35rem",alignItems:"center"}} onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>updateLinea(p.id,l.id,"estadoPago",l.estadoPago==="pagado"?"pendiente":"pagado")}
                      disabled={l.estadoPago==="regalo"}
                      style={{fontFamily:"var(--font-mono)",fontSize:".58rem",fontWeight:700,padding:".2rem .5rem",
                        borderRadius:4,border:`1px solid ${epCfg.color}44`,background:epCfg.bg,color:epCfg.color,
                        cursor:l.estadoPago==="regalo"?"default":"pointer",transition:"all .15s"}}>
                      {epCfg.icon} {epCfg.label}
                    </button>
                    <button onClick={()=>updateLinea(p.id,l.id,"estadoEntrega",l.estadoEntrega==="entregado"?"pendiente":"entregado")}
                      style={{fontFamily:"var(--font-mono)",fontSize:".58rem",fontWeight:700,padding:".2rem .5rem",
                        borderRadius:4,border:`1px solid ${eeCfg.color}44`,background:eeCfg.bg,color:eeCfg.color,
                        cursor:"pointer",transition:"all .15s"}}>
                      {eeCfg.icon} {eeCfg.label}
                    </button>
                    <span className="mono xs muted" style={{marginLeft:"auto"}}>coste {fmt(costeU*l.cantidad)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{background:"var(--surface2)",borderRadius:8,padding:".6rem .75rem",display:"flex",justifyContent:"space-around",gap:".75rem",flexWrap:"wrap"}}>
            {[
              {l:"Coste total", v:fmt(totalCoste), c:"var(--red)"},
              {l:"Venta total", v:fmt(totalVenta), c:"var(--green)"},
              {l:"Beneficio",   v:fmt(totalBenef), c:totalBenef>=0?"var(--green)":"var(--red)"},
            ].map(({l,v,c})=>(
              <div key={l} style={{textAlign:"center"}}>
                <div style={{fontFamily:"var(--font-mono)",fontSize:".52rem",color:"var(--text-muted)",marginBottom:".1rem",textTransform:"uppercase"}}>{l}</div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:".85rem",fontWeight:800,color:c}}>{v}</div>
              </div>
            ))}
          </div>

          {p.notas&&(
            <div style={{background:"var(--surface2)",borderRadius:8,padding:".6rem .75rem",borderLeft:"2px solid var(--primary)"}}>
              <div style={{fontFamily:"var(--font-mono)",fontSize:".55rem",color:"var(--text-muted)",marginBottom:".25rem",textTransform:"uppercase"}}>Notas</div>
              <div style={{fontSize:".78rem",lineHeight:1.5}}>{p.notas}</div>
            </div>
          )}
        </div>
        <div className="modal-footer" style={{justifyContent:"space-between"}}>
          <button className="btn btn-red"   onClick={onEliminar}>Eliminar</button>
          <div style={{display:"flex",gap:".4rem"}}>
            <button className="btn btn-ghost"   onClick={onClose}>Cerrar</button>
            <button className="btn btn-primary" onClick={onEditar}>Editar</button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── MODAL CREAR/EDITAR PEDIDO ────────────────────────────────────────────────
function ModalPedido({ data, coste, onSave, onClose }) {
  const esEdicion = !!data?.id;
  const [form, setForm] = useState(() => data ? { ...data, lineas: data.lineas.map(l=>({...l})) } : {
    nombre:"", telefono:"", email:"", notas:"",
    estadoPago:"pendiente", estadoEntrega:"pendiente",
    lineas:[ { id:1, tipo:"corredor", talla:"M", cantidad:1, precioVenta:0, estadoPago:"pendiente", estadoEntrega:"pendiente" } ]
  });

  const upd = (k,v) => setForm(p => ({...p,[k]:v}));
  const updLinea = (i,k,v) => setForm(p => ({...p, lineas: p.lineas.map((l,j)=>j===i?{...l,[k]:v}:l)}));
  const addLinea = () => setForm(p => ({...p, lineas:[...p.lineas,{id:genId(p.lineas),tipo:"corredor",talla:"M",cantidad:1,precioVenta:0}]}));
  const delLinea = (i) => setForm(p => ({...p, lineas:p.lineas.filter((_,j)=>j!==i)}));

  const {totalVenta,totalCoste,beneficio} = calcPedido(form, coste);
  const valido = form.nombre.trim() && form.lineas.length>0;

  return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:520}}>
        <div className="modal-header">
          <span className="modal-title">{esEdicion?"✏️ Editar pedido":"👕 Nuevo pedido de camiseta"}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{gap:".75rem"}}>

          {/* Datos personales */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
            <div style={{gridColumn:"1/-1"}}>
              <label className="fl">Nombre *</label>
              <input className="inp" value={form.nombre} onChange={e=>upd("nombre",e.target.value)} placeholder="Nombre completo" />
            </div>
            <div>
              <label className="fl">Teléfono</label>
              <input className="inp" value={form.telefono} onChange={e=>upd("telefono",e.target.value)} placeholder="6XX XXX XXX" />
            </div>
            <div>
              <label className="fl">Email</label>
              <input className="inp" value={form.email} onChange={e=>upd("email",e.target.value)} placeholder="email@ejemplo.com" />
            </div>
          </div>



          {/* Líneas de pedido */}
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".5rem"}}>
              <label className="fl" style={{margin:0}}>Líneas del pedido</label>
              <button className="btn btn-ghost btn-sm" onClick={addLinea}>+ Añadir línea</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:".35rem"}}>
              {form.lineas.map((l,i) => {
                const costeU = coste[l.tipo]||0;
                const subtotal = l.cantidad * l.precioVenta;
                return (
                  <div key={i} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:".6rem .75rem"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 60px 80px auto",gap:".4rem",alignItems:"end"}}>
                      <div>
                        <label className="fl">Tipo</label>
                        <select className="inp inp-sm" value={l.tipo} onChange={e=>updLinea(i,"tipo",e.target.value)}>
                          {TIPOS.map(t=><option key={t} value={t}>{TIPO_CFG[t].icon} {TIPO_CFG[t].label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="fl">Talla</label>
                        <select className="inp inp-sm" value={l.talla} onChange={e=>updLinea(i,"talla",e.target.value)}>
                          {TALLAS.map(t=><option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="fl">Cant.</label>
                        <input type="number" min="1" className="inp inp-sm inp-mono" value={l.cantidad}
                          onChange={e=>updLinea(i,"cantidad",Math.max(1,parseInt(e.target.value)||1))} />
                      </div>
                      <div>
                        <label className="fl">P.Venta €</label>
                        <input type="number" min="0" step="0.5" className="inp inp-sm inp-mono" value={l.precioVenta}
                          onChange={e=>updLinea(i,"precioVenta",parseFloat(e.target.value)||0)} />
                      </div>
                      <button className="btn btn-red btn-sm" onClick={()=>delLinea(i)} disabled={form.lineas.length<=1}
                        style={{marginBottom:1}}>✕</button>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".4rem",marginTop:".35rem"}}>
                      <div>
                        <label className="fl">Estado pago</label>
                        <select className="inp inp-sm" value={l.estadoPago||"pendiente"} onChange={e=>updLinea(i,"estadoPago",e.target.value)}>
                          {Object.entries(ESTADO_PAGO_CFG).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="fl">Estado entrega</label>
                        <select className="inp inp-sm" value={l.estadoEntrega||"pendiente"} onChange={e=>updLinea(i,"estadoEntrega",e.target.value)}>
                          {Object.entries(ESTADO_ENT_CFG).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{marginTop:".3rem",fontFamily:"var(--font-mono)",fontSize:".58rem",color:"var(--text-muted)",display:"flex",gap:".75rem"}}>
                      <span>Coste: {fmt(costeU * l.cantidad)}</span>
                      <span>Venta: {l.estadoPago==="regalo"?"Regalo":fmt(subtotal)}</span>
                      <span style={{color: subtotal-costeU*l.cantidad>=0?"var(--green)":"var(--red)"}}>
                        Margen: {fmt(l.estadoPago==="regalo"?-(costeU*l.cantidad):subtotal - costeU*l.cantidad)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resumen total */}
          <div style={{background:"var(--surface2)",borderRadius:8,padding:".65rem .85rem",display:"flex",justifyContent:"space-around",gap:"1rem",flexWrap:"wrap"}}>
            {[
              {l:"Total coste",  v:fmt(totalCoste), c:"var(--red)"   },
              {l:"Total venta",  v:form.estadoPago==="regalo"?"🎁 Regalo":fmt(totalVenta), c:"var(--green)"  },
              {l:"Beneficio",    v:fmt(beneficio),  c:beneficio>=0?"var(--green)":"var(--red)" },
            ].map(({l,v,c})=>(
              <div key={l} style={{textAlign:"center"}}>
                <div style={{fontFamily:"var(--font-mono)",fontSize:".55rem",color:"var(--text-muted)",marginBottom:".15rem",textTransform:"uppercase"}}>{l}</div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:".9rem",fontWeight:800,color:c}}>{v}</div>
              </div>
            ))}
          </div>

          {/* Notas */}
          <div>
            <label className="fl">Notas</label>
            <input className="inp" value={form.notas} onChange={e=>upd("notas",e.target.value)} placeholder="Observaciones opcionales…" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={()=>valido&&onSave(form)} disabled={!valido}
            style={{opacity:valido?1:.5}}>
            {esEdicion?"Guardar cambios":"Crear pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap');

  .ph{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1.25rem;flex-wrap:wrap}
  .pt{font-size:1.3rem;font-weight:800}.pd{font-family:var(--font-mono);font-size:.62rem;color:var(--text-muted);margin-top:.25rem}
  .fr{display:flex;align-items:center;flex-wrap:wrap}.g1{gap:.5rem}
  .twocol{display:grid;grid-template-columns:1fr 1fr;gap:.85rem;margin-bottom:.85rem}
  @media(max-width:700px){.twocol{grid-template-columns:1fr}}
  .mt1{margin-top:.5rem}.mb1{margin-bottom:.75rem}
  .fl{font-size:.72rem;font-weight:600;margin-bottom:.3rem;display:block;color:var(--text-muted)}

  /* Fila de pedido */
  .cam-row{display:flex;align-items:center;justify-content:space-between;gap:.75rem;
    background:var(--surface);border:1px solid var(--border);border-radius:var(--r);
    padding:.75rem 1rem;cursor:pointer;transition:all .15s;margin-bottom:.4rem}
  .cam-row:hover{border-color:var(--border-light);box-shadow:0 2px 8px rgba(0,0,0,.2)}

  @media(max-width:640px){
    .ph{flex-direction:column;gap:.75rem}
    .modal{max-width:100% !important}
  }
`;
