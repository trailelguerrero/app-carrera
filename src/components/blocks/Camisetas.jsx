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
    notas: "Familiar del organizador", estadoPago: "pendiente", estadoEntrega: "pendiente",
    lineas: [
      { id: 1, tipo: "corredor",   talla: "M",  cantidad: 1, precioVenta: 15 },
      { id: 2, tipo: "voluntario", talla: "L",  cantidad: 2, precioVenta: 12 },
    ]
  },
];

const COSTE_DEFAULT = { corredor: 8, voluntario: 7 };

// ─── CÁLCULOS ─────────────────────────────────────────────────────────────────
const calcPedido = (p, coste) => {
  const totalVenta  = p.lineas.reduce((s,l) => s + l.cantidad * l.precioVenta, 0);
  const totalCoste  = p.lineas.reduce((s,l) => s + l.cantidad * (coste[l.tipo] || 0), 0);
  const totalUnid   = p.lineas.reduce((s,l) => s + l.cantidad, 0);
  const beneficio   = p.estadoPago === "regalo" ? -totalCoste : totalVenta - totalCoste;
  return { totalVenta, totalCoste, totalUnid, beneficio };
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

  const updatePedido = (id, campo, valor) =>
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, [campo]: valor } : p));

  const TABS = [
    { id:"dashboard", icon:"📊", label:"Dashboard"   },
    { id:"pedidos",   icon:"👕", label:"Pedidos"      },
    { id:"tallas",    icon:"📐", label:"Tallas"       },
    { id:"checklist", icon:"✅", label:"Producción"   },
  ];

  const stats = useMemo(() => {
    const total    = pedidos.length;
    const unidades = pedidos.reduce((s,p) => s + p.lineas.reduce((a,l) => a+l.cantidad, 0), 0);
    const recaudado= pedidos.filter(p=>p.estadoPago==="pagado")
                            .reduce((s,p) => s + calcPedido(p,coste).totalVenta, 0);
    const pendCobro= pedidos.filter(p=>p.estadoPago==="pendiente")
                            .reduce((s,p) => s + calcPedido(p,coste).totalVenta, 0);
    const beneficio= pedidos.reduce((s,p) => s + calcPedido(p,coste).beneficio, 0);
    const regalos  = pedidos.filter(p=>p.estadoPago==="regalo").length;
    const pendEnt  = pedidos.filter(p=>p.estadoEntrega==="pendiente").length;
    return { total, unidades, recaudado, pendCobro, beneficio, regalos, pendEnt };
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
            {stats.pendCobro > 0 && <span className="badge badge-amber">⏳ {fmt(stats.pendCobro)} pendiente</span>}
            {stats.pendEnt  > 0 && <span className="badge badge-cyan">📦 {stats.pendEnt} por entregar</span>}
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
          {tab==="checklist" && <TabChecklist pedidos={pedidos} updatePedido={updatePedido} abrirFicha={abrirFicha} />}
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
          updatePedido={updatePedido}
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
          { l:"📦 Unidades",     v: stats.unidades,         s:"camisetas totales",  color:"violet", tab:"tallas"    },
          { l:"✅ Recaudado",    v: fmt(stats.recaudado),   s:"cobrado",            color:"green",  tab:"pedidos"   },
          { l:"⏳ Por cobrar",   v: fmt(stats.pendCobro),   s:"pendiente de pago",  color:"amber",  tab:"pedidos"   },
          { l:"💰 Beneficio",    v: fmt(stats.beneficio),   s:"venta − coste",      color: stats.beneficio>=0?"green":"red", tab:"pedidos" },
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
function TabPedidos({ pedidos, coste, abrirFicha, abrirModal, updatePedido }) {
  const [vistaKanban, setVistaKanban] = useState(false);
  const [ordenAlfa,   setOrdenAlfa]   = useState(false);
  const [filtroEstado,setFiltroEstado]= useState("todos");
  const [busqueda,    setBusqueda]    = useState("");

  const filtrados = useMemo(() => {
    let list = pedidos.filter(p => {
      const q = busqueda.toLowerCase();
      const matchQ = !q || p.nombre.toLowerCase().includes(q) || (p.telefono||"").includes(q) || (p.email||"").toLowerCase().includes(q);
      const matchE = filtroEstado==="todos" || p.estadoPago===filtroEstado || p.estadoEntrega===filtroEstado;
      return matchQ && matchE;
    });
    if (ordenAlfa) list = [...list].sort((a,b) => a.nombre.localeCompare(b.nombre,"es"));
    return list;
  }, [pedidos, busqueda, filtroEstado, ordenAlfa]);

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">👕 Pedidos de camisetas</div>
          <div className="pd">{pedidos.length} pedidos · {pedidos.reduce((s,p)=>s+p.lineas.reduce((a,l)=>a+l.cantidad,0),0)} unidades</div>
        </div>
        <div className="fr g1" style={{flexWrap:"wrap"}}>
          <div style={{display:"flex",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:"var(--r-sm)",overflow:"hidden"}}>
            {[["lista","☰"],["kanban","⬛"]].map(([v,ic])=>(
              <button key={v} onClick={()=>setVistaKanban(v==="kanban")}
                style={{padding:".3rem .55rem",border:"none",cursor:"pointer",fontFamily:"var(--font-mono)",fontSize:".62rem",fontWeight:700,
                  background:(vistaKanban&&v==="kanban")||(!vistaKanban&&v==="lista")?"rgba(99,102,241,.2)":"transparent",
                  color:(vistaKanban&&v==="kanban")||(!vistaKanban&&v==="lista")?"#c4c6ff":"var(--text-muted)"}}>
                {ic}
              </button>
            ))}
          </div>
          <button className={cls("btn btn-sm",ordenAlfa?"btn-primary":"btn-ghost")} onClick={()=>setOrdenAlfa(v=>!v)}>{ordenAlfa?"A-Z ✓":"A-Z"}</button>
          <button className="btn btn-primary" onClick={()=>abrirModal(null)}>+ Nuevo pedido</button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{marginBottom:".75rem",padding:".65rem .85rem"}}>
        <div style={{display:"flex",gap:".6rem",flexWrap:"wrap",alignItems:"center"}}>
          <input className="inp" placeholder="🔍 Nombre, teléfono o email…" value={busqueda}
            onChange={e=>setBusqueda(e.target.value)} style={{maxWidth:260}} />
          <select className="inp" value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)} style={{width:"auto"}}>
            <option value="todos">Todos</option>
            <optgroup label="— Pago —">
              {ESTADO_PAGO.map(e => <option key={e} value={e}>{ESTADO_PAGO_CFG[e].icon} {ESTADO_PAGO_CFG[e].label}</option>)}
            </optgroup>
            <optgroup label="— Entrega —">
              {ESTADO_ENTREGA.map(e => <option key={e} value={e}>{ESTADO_ENTREGA_CFG[e].icon} {ESTADO_ENTREGA_CFG[e].label}</option>)}
            </optgroup>
          </select>
          {(busqueda||filtroEstado!=="todos") && (
            <button className="btn btn-ghost btn-sm" onClick={()=>{setBusqueda("");setFiltroEstado("todos");}}>✕ Limpiar</button>
          )}
        </div>
      </div>

      {filtrados.length===0 && <div className="empty-state"><div className="empty-state-icon">👕</div>Sin pedidos con estos filtros</div>}

      {/* KANBAN por estado de pago */}
      {vistaKanban ? (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:".65rem"}}>
          {ESTADO_PAGO.map(estado => {
            const items = filtrados.filter(p => p.estadoPago===estado);
            const cfg = ESTADO_PAGO_CFG[estado];
            return (
              <div key={estado} style={{background:"var(--surface)",border:"1px solid var(--border)",borderTop:`2px solid ${cfg.color}`,borderRadius:"var(--r)",overflow:"hidden"}}>
                <div style={{padding:".6rem .75rem",background:"var(--surface2)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:".7rem",fontWeight:700,color:cfg.color}}>{cfg.icon} {cfg.label}</span>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:".6rem",padding:".1rem .35rem",borderRadius:4,background:cfg.bg,color:cfg.color}}>{items.length}</span>
                </div>
                {items.map(p => {
                  const {totalVenta,totalUnid} = calcPedido(p,coste);
                  const ecEnt = ESTADO_ENTREGA_CFG[p.estadoEntrega];
                  return (
                    <div key={p.id} style={{margin:".4rem .4rem 0",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:".6rem .7rem",cursor:"pointer",transition:"all .15s"}}
                      onClick={()=>abrirFicha(p)}
                      onMouseEnter={e=>e.currentTarget.style.borderColor="var(--border-light)"}
                      onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
                      <div style={{fontWeight:700,fontSize:".78rem",marginBottom:".2rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nombre}</div>
                      <div style={{display:"flex",gap:".35rem",flexWrap:"wrap",marginBottom:".3rem"}}>
                        {p.lineas.map((l,i) => (
                          <span key={i} style={{fontFamily:"var(--font-mono)",fontSize:".58rem",padding:".08rem .3rem",borderRadius:3,background:TIPO_CFG[l.tipo]?.dim,color:TIPO_CFG[l.tipo]?.color}}>
                            {TIPO_CFG[l.tipo]?.icon}{l.talla}×{l.cantidad}
                          </span>
                        ))}
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span className="mono xs muted">{totalUnid} ud · {fmt(totalVenta)}</span>
                        <span className="badge" style={{background:ecEnt.bg,color:ecEnt.color,fontSize:".5rem"}}>{ecEnt.icon}</span>
                      </div>
                    </div>
                  );
                })}
                {items.length===0 && <div style={{padding:"1rem",textAlign:"center",fontFamily:"var(--font-mono)",fontSize:".62rem",color:"var(--text-dim)"}}>—</div>}
                <div style={{height:".4rem"}}/>
              </div>
            );
          })}
        </div>
      ) : (
        /* LISTA */
        <div style={{display:"flex",flexDirection:"column",gap:".5rem"}}>
          {filtrados.map(p => {
            const {totalVenta,totalCoste,totalUnid,beneficio} = calcPedido(p,coste);
            const ecPago = ESTADO_PAGO_CFG[p.estadoPago];
            const ecEnt  = ESTADO_ENTREGA_CFG[p.estadoEntrega];
            return (
              <div key={p.id} className="cam-row" onClick={()=>abrirFicha(p)}>
                <div style={{display:"flex",alignItems:"center",gap:".6rem",flex:1,minWidth:0}}>
                  <span style={{fontSize:"1.4rem",flexShrink:0}}>{ecPago.icon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:".88rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nombre}</div>
                    <div style={{display:"flex",gap:".5rem",flexWrap:"wrap",marginTop:".15rem"}}>
                      {p.lineas.map((l,i) => (
                        <span key={i} style={{fontFamily:"var(--font-mono)",fontSize:".6rem",padding:".08rem .35rem",borderRadius:3,background:TIPO_CFG[l.tipo]?.dim,color:TIPO_CFG[l.tipo]?.color}}>
                          {TIPO_CFG[l.tipo]?.icon} {l.talla} × {l.cantidad}
                        </span>
                      ))}
                    </div>
                    {p.notas && <div className="mono xs muted" style={{marginTop:".1rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.notas}</div>}
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:".3rem",flexShrink:0}}>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:".88rem",fontWeight:800,color:p.estadoPago==="regalo"?"var(--violet)":"var(--text)"}}>{fmt(totalVenta)}</div>
                  <div style={{display:"flex",gap:".3rem"}}>
                    <span className="badge" style={{background:ecPago.bg,color:ecPago.color,fontSize:".55rem"}}>{ecPago.label}</span>
                    <span className="badge" style={{background:ecEnt.bg,color:ecEnt.color,fontSize:".55rem"}}>{ecEnt.icon}</span>
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
function TabChecklist({ pedidos, updatePedido, abrirFicha }) {
  const [filtro, setFiltro] = useState("todos"); // "todos"|"pendiente"|"pagado"|"regalo"|"entregado"|"sin-entregar"

  const filtrados = useMemo(() => {
    return pedidos.filter(p => {
      if (filtro==="todos")       return true;
      if (filtro==="sin-entregar")return p.estadoEntrega==="pendiente";
      if (filtro==="entregado")   return p.estadoEntrega==="entregado";
      return p.estadoPago===filtro;
    });
  }, [pedidos, filtro]);

  const pendEnt  = pedidos.filter(p=>p.estadoEntrega==="pendiente").length;
  const pendPago = pedidos.filter(p=>p.estadoPago==="pendiente").length;

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">✅ Producción y entrega</div>
          <div className="pd">{pendEnt} por entregar · {pendPago} sin cobrar</div>
        </div>
      </div>

      {/* Resumen rápido */}
      <div style={{display:"flex",gap:".5rem",flexWrap:"wrap",marginBottom:".85rem"}}>
        {[
          {id:"todos",        label:`Todos (${pedidos.length})`,             color:"var(--text-muted)" },
          {id:"sin-entregar", label:`Por entregar (${pendEnt})`,             color:"var(--amber)" },
          {id:"entregado",    label:`Entregados (${pedidos.length-pendEnt})`,color:"var(--green)" },
          {id:"pendiente",    label:`Sin pagar (${pendPago})`,               color:"var(--amber)" },
          {id:"pagado",       label:`Pagados (${pedidos.filter(p=>p.estadoPago==="pagado").length})`, color:"var(--green)" },
          {id:"regalo",       label:`Regalos (${pedidos.filter(p=>p.estadoPago==="regalo").length})`, color:"var(--violet)" },
        ].map(f => (
          <button key={f.id} onClick={()=>setFiltro(f.id)}
            style={{fontFamily:"var(--font-mono)",fontSize:".62rem",fontWeight:700,padding:".28rem .65rem",
              borderRadius:"var(--r-sm)",border:`1px solid ${filtro===f.id?f.color:"var(--border)"}`,
              background:filtro===f.id?`${f.color}18`:"transparent",
              color:filtro===f.id?f.color:"var(--text-muted)",cursor:"pointer",transition:"all .15s"}}>
            {f.label}
          </button>
        ))}
      </div>

      {filtrados.length===0 && <div className="empty-state"><div className="empty-state-icon">✅</div>Sin pedidos con estos filtros</div>}

      <div style={{display:"flex",flexDirection:"column",gap:".45rem"}}>
        {filtrados.map(p => {
          const {totalVenta,totalUnid} = calcPedido(p, {});
          const ecPago = ESTADO_PAGO_CFG[p.estadoPago];
          const ecEnt  = ESTADO_ENTREGA_CFG[p.estadoEntrega];
          return (
            <div key={p.id} className="card" style={{padding:".75rem 1rem",borderLeft:`3px solid ${ecEnt.color}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:".75rem",flexWrap:"wrap"}}>
                <div style={{cursor:"pointer",flex:1,minWidth:0}} onClick={()=>abrirFicha(p)}>
                  <div style={{fontWeight:700,fontSize:".86rem",marginBottom:".2rem"}}>{p.nombre}</div>
                  <div style={{display:"flex",gap:".35rem",flexWrap:"wrap",marginBottom:".25rem"}}>
                    {p.lineas.map((l,i) => (
                      <span key={i} style={{fontFamily:"var(--font-mono)",fontSize:".62rem",padding:".08rem .35rem",borderRadius:3,background:TIPO_CFG[l.tipo]?.dim,color:TIPO_CFG[l.tipo]?.color}}>
                        {TIPO_CFG[l.tipo]?.icon} {l.talla} × {l.cantidad}
                      </span>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:".5rem",alignItems:"center"}}>
                    <span className="badge" style={{background:ecPago.bg,color:ecPago.color,fontSize:".55rem"}}>{ecPago.icon} {ecPago.label}</span>
                    {p.telefono && <span className="mono xs muted">📞 {p.telefono}</span>}
                  </div>
                </div>
                {/* Controles de estado — stopPropagation */}
                <div style={{display:"flex",flexDirection:"column",gap:".4rem",alignItems:"flex-end"}} onClick={e=>e.stopPropagation()}>
                  {/* Toggle entrega */}
                  <button
                    onClick={()=>updatePedido(p.id,"estadoEntrega",p.estadoEntrega==="entregado"?"pendiente":"entregado")}
                    style={{fontFamily:"var(--font-mono)",fontSize:".65rem",fontWeight:700,padding:".3rem .7rem",
                      borderRadius:"var(--r-sm)",border:`1px solid ${ecEnt.color}44`,
                      background:ecEnt.bg,color:ecEnt.color,cursor:"pointer",transition:"all .15s",whiteSpace:"nowrap"}}>
                    {p.estadoEntrega==="entregado" ? "✔️ Entregado" : "📦 Marcar entregado"}
                  </button>
                  {/* Toggle pago (no aplica a regalos) */}
                  {p.estadoPago !== "regalo" && (
                    <button
                      onClick={()=>updatePedido(p.id,"estadoPago",p.estadoPago==="pagado"?"pendiente":"pagado")}
                      style={{fontFamily:"var(--font-mono)",fontSize:".62rem",padding:".25rem .6rem",
                        borderRadius:"var(--r-sm)",border:`1px solid ${ecPago.color}44`,
                        background:ecPago.bg,color:ecPago.color,cursor:"pointer",transition:"all .15s",whiteSpace:"nowrap"}}>
                      {p.estadoPago==="pagado" ? "✅ Pagado" : "⏳ Marcar pagado"}
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
function FichaPedido({ pedido: p, coste, onClose, onEditar, onEliminar, updatePedido }) {
  const {totalVenta, totalCoste, totalUnid, beneficio} = calcPedido(p, coste);
  const ecPago = ESTADO_PAGO_CFG[p.estadoPago];
  const ecEnt  = ESTADO_ENTREGA_CFG[p.estadoEntrega];

  const Row = ({label, value, color}) => !value && value!==0 ? null : (
    <div style={{display:"flex",justifyContent:"space-between",padding:".4rem 0",borderBottom:"1px solid rgba(30,45,80,.3)"}}>
      <span style={{fontFamily:"var(--font-mono)",fontSize:".6rem",color:"var(--text-muted)",flexShrink:0,marginRight:"1rem"}}>{label}</span>
      <span style={{fontSize:".76rem",fontWeight:600,textAlign:"right",color:color||"var(--text)"}}>{value}</span>
    </div>
  );

  return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:480}}>
        <div style={{borderTop:"3px solid var(--primary)",borderRadius:"16px 16px 0 0"}}>
          <div className="modal-header">
            <div style={{display:"flex",alignItems:"center",gap:".6rem"}}>
              <span style={{fontSize:"1.4rem"}}>👕</span>
              <div>
                <div style={{fontWeight:800,fontSize:".95rem"}}>{p.nombre}</div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:".55rem",color:"var(--text-muted)",marginTop:".1rem",textTransform:"uppercase"}}>
                  {totalUnid} unidades · {p.lineas.length} línea{p.lineas.length!==1?"s":""}
                </div>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="modal-body" style={{gap:".4rem"}}>
          <Row label="Teléfono"  value={p.telefono} />
          <Row label="Email"     value={p.email} />

          {/* Líneas de pedido */}
          <div style={{background:"var(--surface2)",borderRadius:8,padding:".65rem .75rem",margin:".25rem 0"}}>
            <div style={{fontFamily:"var(--font-mono)",fontSize:".55rem",color:"var(--text-muted)",marginBottom:".5rem",textTransform:"uppercase",letterSpacing:".08em"}}>Líneas del pedido</div>
            {p.lineas.map((l,i) => {
              const costeU = coste[l.tipo]||0;
              const cfg = TIPO_CFG[l.tipo];
              return (
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:".3rem 0",borderBottom:i<p.lineas.length-1?"1px solid rgba(30,45,80,.2)":"none"}}>
                  <div style={{display:"flex",alignItems:"center",gap:".5rem"}}>
                    <span style={{fontSize:".9rem"}}>{cfg?.icon}</span>
                    <div>
                      <div style={{fontSize:".75rem",fontWeight:700}}>{cfg?.label} — {l.talla}</div>
                      <div style={{fontFamily:"var(--font-mono)",fontSize:".58rem",color:"var(--text-muted)"}}>{l.cantidad} ud · coste {fmt(costeU)}/ud</div>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:"var(--font-mono)",fontSize:".78rem",fontWeight:700,color:cfg?.color}}>{fmt(l.precioVenta * l.cantidad)}</div>
                    <div style={{fontFamily:"var(--font-mono)",fontSize:".58rem",color:"var(--text-muted)"}}>{fmt(l.precioVenta)}/ud</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Resumen económico */}
          <div style={{background:"var(--surface2)",borderRadius:8,padding:".65rem .75rem"}}>
            <div style={{fontFamily:"var(--font-mono)",fontSize:".55rem",color:"var(--text-muted)",marginBottom:".4rem",textTransform:"uppercase",letterSpacing:".08em"}}>Resumen económico</div>
            <Row label="Total coste"  value={fmt(totalCoste)} color="var(--red)" />
            <Row label="Total venta"  value={p.estadoPago==="regalo"?"Regalo 🎁":fmt(totalVenta)} color={p.estadoPago==="regalo"?"var(--violet)":"var(--green)"} />
            <Row label="Beneficio"    value={fmt(beneficio)} color={beneficio>=0?"var(--green)":"var(--red)"} />
          </div>

          {/* Estados */}
          <div style={{display:"flex",gap:".5rem",marginTop:".25rem"}}>
            <button style={{flex:1,fontFamily:"var(--font-mono)",fontSize:".65rem",fontWeight:700,padding:".4rem",borderRadius:"var(--r-sm)",border:`1px solid ${ecPago.color}44`,background:ecPago.bg,color:ecPago.color,cursor:p.estadoPago==="regalo"?"default":"pointer",transition:"all .15s"}}
              onClick={()=>{ if(p.estadoPago!=="regalo") updatePedido(p.id,"estadoPago",p.estadoPago==="pagado"?"pendiente":"pagado"); }}>
              {ecPago.icon} {ecPago.label}
            </button>
            <button style={{flex:1,fontFamily:"var(--font-mono)",fontSize:".65rem",fontWeight:700,padding:".4rem",borderRadius:"var(--r-sm)",border:`1px solid ${ecEnt.color}44`,background:ecEnt.bg,color:ecEnt.color,cursor:"pointer",transition:"all .15s"}}
              onClick={()=>updatePedido(p.id,"estadoEntrega",p.estadoEntrega==="entregado"?"pendiente":"entregado")}>
              {ecEnt.icon} {ecEnt.label}
            </button>
          </div>

          {p.notas && (
            <div style={{background:"var(--surface2)",borderRadius:8,padding:".6rem .75rem",borderLeft:"2px solid var(--primary)"}}>
              <div style={{fontFamily:"var(--font-mono)",fontSize:".55rem",color:"var(--text-muted)",marginBottom:".25rem",textTransform:"uppercase"}}>Notas</div>
              <div style={{fontSize:".78rem",lineHeight:1.5}}>{p.notas}</div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{justifyContent:"space-between"}}>
          <button className="btn btn-red" onClick={onEliminar}>🗑 Eliminar</button>
          <div style={{display:"flex",gap:".4rem"}}>
            <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
            <button className="btn btn-primary" onClick={onEditar}>✏️ Editar</button>
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
    lineas:[ { id:1, tipo:"corredor", talla:"M", cantidad:1, precioVenta:0 } ]
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

          {/* Estado pago y entrega */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
            <div>
              <label className="fl">Estado de pago</label>
              <select className="inp" value={form.estadoPago} onChange={e=>upd("estadoPago",e.target.value)}>
                {ESTADO_PAGO.map(e=><option key={e} value={e}>{ESTADO_PAGO_CFG[e].icon} {ESTADO_PAGO_CFG[e].label}</option>)}
              </select>
            </div>
            <div>
              <label className="fl">Estado de entrega</label>
              <select className="inp" value={form.estadoEntrega} onChange={e=>upd("estadoEntrega",e.target.value)}>
                {ESTADO_ENTREGA.map(e=><option key={e} value={e}>{ESTADO_ENTREGA_CFG[e].icon} {ESTADO_ENTREGA_CFG[e].label}</option>)}
              </select>
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
                    <div style={{marginTop:".3rem",fontFamily:"var(--font-mono)",fontSize:".58rem",color:"var(--text-muted)",display:"flex",gap:".75rem"}}>
                      <span>Coste: {fmt(costeU * l.cantidad)}</span>
                      <span>Venta: {fmt(subtotal)}</span>
                      <span style={{color: subtotal-costeU*l.cantidad>=0?"var(--green)":"var(--red)"}}>
                        Margen: {fmt(subtotal - costeU*l.cantidad)}
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
