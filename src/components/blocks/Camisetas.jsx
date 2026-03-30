import { useState, useMemo } from "react";
import { useData } from "@/lib/dataService";
import { EVENT_CONFIG_DEFAULT, LS_KEY_CONFIG } from "@/constants/eventConfig";
import { BLOCK_CSS, blockCls as cls } from "@/lib/blockStyles";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const LS    = "teg_camisetas_v1";
const genId = (arr) => arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1;
const fmt   = (n) => new Intl.NumberFormat("es-ES", { style:"currency", currency:"EUR", minimumFractionDigits:2, maximumFractionDigits:2 }).format(n||0);
const fmtN  = (n) => new Intl.NumberFormat("es-ES", { minimumFractionDigits:2, maximumFractionDigits:2 }).format(n||0);

const TALLAS = ["XXS","XS","S","M","L","XL","XXL","3XL","4XL"];
const TIPOS  = ["corredor","voluntario"];
const TC = {
  corredor:   { label:"Corredor",   icon:"🏃", color:"var(--cyan)",   dim:"var(--cyan-dim)"   },
  voluntario: { label:"Voluntario", icon:"👥", color:"var(--violet)", dim:"var(--violet-dim)" },
};

// estadoPago y estadoEntrega son POR LINEA (una persona puede tener pago+regalo en el mismo pedido)
const EP = {
  pendiente: { label:"Pendiente", color:"var(--amber)", bg:"var(--amber-dim)",  icon:"⏳" },
  pagado:    { label:"Pagado",    color:"var(--green)", bg:"var(--green-dim)",  icon:"✅" },
  regalo:    { label:"Regalo",    color:"var(--violet)",bg:"var(--violet-dim)", icon:"🎁" },
};
const EE = {
  pendiente: { label:"Pendiente", color:"var(--amber)", bg:"var(--amber-dim)", icon:"📦" },
  entregado: { label:"Entregado", color:"var(--green)", bg:"var(--green-dim)", icon:"✔️" },
};
const ESTADOS_PAGO    = ["pendiente","pagado","regalo"];
const ESTADOS_ENTREGA = ["pendiente","entregado"];

const PEDIDOS_DEFAULT = [
  {
    id:1, nombre:"Ejemplo Persona", telefono:"600000001",
    email:"ejemplo@email.com", notas:"Familiar del organizador",
    lineas:[
      { id:1, tipo:"corredor",   talla:"M", cantidad:1, precioVenta:15, estadoPago:"pagado",    estadoEntrega:"pendiente" },
      { id:2, tipo:"voluntario", talla:"L", cantidad:2, precioVenta:0,  estadoPago:"regalo",    estadoEntrega:"pendiente" },
      { id:3, tipo:"corredor",   talla:"S", cantidad:1, precioVenta:15, estadoPago:"pendiente", estadoEntrega:"pendiente" },
    ]
  },
];
const COSTE_DEFAULT = { corredor:8, voluntario:7 };

const calcPedido = (p, coste) => {
  const totalVenta    = p.lineas.reduce((s,l) => s + (l.estadoPago==="regalo" ? 0 : l.cantidad*(l.precioVenta||0)), 0);
  const totalCoste    = p.lineas.reduce((s,l) => s + l.cantidad*(coste[l.tipo]||0), 0);
  const totalUnid     = p.lineas.reduce((s,l) => s + l.cantidad, 0);
  // Beneficio desglosado por estado de pago
  const benRealizado  = p.lineas.filter(l=>l.estadoPago==="pagado")
    .reduce((s,l) => s + l.cantidad*((l.precioVenta||0)-(coste[l.tipo]||0)), 0);
  const benPotencial  = p.lineas.filter(l=>(l.estadoPago||"pendiente")==="pendiente")
    .reduce((s,l) => s + l.cantidad*((l.precioVenta||0)-(coste[l.tipo]||0)), 0);
  const costeRegalos  = p.lineas.filter(l=>l.estadoPago==="regalo")
    .reduce((s,l) => s + l.cantidad*(coste[l.tipo]||0), 0);
  const beneficio     = benRealizado + benPotencial - costeRegalos;
  return { totalVenta, totalCoste, totalUnid, beneficio, benRealizado, benPotencial, costeRegalos };
};

const badgePago = (p) => {
  const pagos = [...new Set(p.lineas.map(l => l.estadoPago||"pendiente"))];
  if (pagos.length===1) return EP[pagos[0]];
  if (pagos.includes("pendiente")) return { ...EP.pendiente, label:"Mixto" };
  return { ...EP.pagado, label:"Mixto" };
};
const badgeEnt = (p) => p.lineas.some(l => (l.estadoEntrega||"pendiente")==="pendiente") ? EE.pendiente : EE.entregado;

// Default corredor externos: un objeto { XXS:0, XS:0, S:0, M:0, L:0, XL:0, XXL:0, 3XL:0, 4XL:0 }
const CORREDORES_DEFAULT = Object.fromEntries(TALLAS.map(t => [t, 0]));

export default function App() {
  const [eventCfg] = useData(LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT);
  const config = { ...EVENT_CONFIG_DEFAULT, ...(eventCfg || {}) };
  const [tab,setTab] = useState("dashboard");
  const [rawP,setPedidos] = useData(LS+"_pedidos", PEDIDOS_DEFAULT);
  const pedidos = Array.isArray(rawP) ? rawP : [];
  const [coste,setCoste] = useData(LS+"_coste", COSTE_DEFAULT);
  const [modal,setModal] = useState(null);
  const [ficha,setFicha] = useState(null);
  const [delId,setDelId] = useState(null);

  // ─── Fuentes externas para Tab Tallas ───────────────────────────────────────
  // Tallas de corredores: entrada manual desde plataforma externa (total por talla)
  const [rawCorredores, setCorredores] = useData(LS+"_corredores", CORREDORES_DEFAULT);
  const corredoresExt = (rawCorredores && typeof rawCorredores === 'object' && !Array.isArray(rawCorredores))
    ? { ...CORREDORES_DEFAULT, ...rawCorredores }
    : CORREDORES_DEFAULT;

  // Precio manual de la camiseta corredor en plataforma externa
  const [precioPlatExt, setPrecioPlatExt] = useData(LS+"_precio_plataforma", { precio: 15 });
  const precioCorrExt = (precioPlatExt?.precio ?? 15);

  // Tallas de voluntarios: lectura automática (solo confirmados/pendientes, excluye cancelados)
  const [rawVols] = useData("teg_voluntarios_v1_voluntarios", []);
  const voluntariosActivos = Array.isArray(rawVols)
    ? rawVols.filter(v => v?.estado !== "cancelado" && v?.talla)
    : [];

  const scrollTop   = () => { const m=document.querySelector("main"); if(m) m.scrollTo({top:0,behavior:"instant"}); };
  const abrirFicha  = (p) => { scrollTop(); setFicha(p); };
  const abrirModal  = (d) => { scrollTop(); setModal({data:d||null}); };
  const abrirEditar = (p) => { scrollTop(); setFicha(null); setModal({data:p}); };

  const savePedido = (p) => {
    if (p.id) setPedidos(prev => prev.map(x => x.id===p.id ? p : x));
    else      setPedidos(prev => [...prev, {...p, id:genId(pedidos)}]);
    setModal(null);
  };
  const deletePedido = () => { setPedidos(prev => prev.filter(x => x.id!==delId)); setDelId(null); setFicha(null); };
  const updateLinea  = (pedidoId,lineaId,campo,valor) =>
    setPedidos(prev => prev.map(p => p.id!==pedidoId ? p : {
      ...p, lineas: p.lineas.map(l => l.id!==lineaId ? l : {...l,[campo]:valor})
    }));

  const stats = useMemo(() => {
    // Pedidos extras (manuales)
    const total    = pedidos.length;
    const extrasUnid = pedidos.reduce((s,p) => s+p.lineas.reduce((a,l)=>a+l.cantidad,0), 0);
    // Corredores plataforma externa
    const corExt = TALLAS.reduce((s,t) => s + (corredoresExt[t]||0), 0);
    // Voluntarios activos con talla
    const volUnid = voluntariosActivos.length;
    // Total general real
    const unidades = extrasUnid + corExt + volUnid;
    const recaudado= pedidos.reduce((s,p) => s+p.lineas.filter(l=>l.estadoPago==="pagado").reduce((a,l)=>a+l.cantidad*(l.precioVenta||0),0), 0);
    const pendCobro= pedidos.reduce((s,p) => s+p.lineas.filter(l=>(l.estadoPago||"pendiente")==="pendiente").reduce((a,l)=>a+l.cantidad*(l.precioVenta||0),0), 0);
    const beneficio     = pedidos.reduce((s,p) => s+calcPedido(p,coste).beneficio, 0);
    const benRealizado  = pedidos.reduce((s,p) => s+calcPedido(p,coste).benRealizado, 0);
    const benPotencial  = pedidos.reduce((s,p) => s+calcPedido(p,coste).benPotencial, 0);
    const costeRegalos  = pedidos.reduce((s,p) => s+calcPedido(p,coste).costeRegalos, 0);
    const regalos  = pedidos.reduce((s,p) => s+p.lineas.filter(l=>l.estadoPago==="regalo").reduce((a,l)=>a+l.cantidad,0), 0);
    const pendEnt  = pedidos.reduce((s,p) => s+p.lineas.filter(l=>(l.estadoEntrega||"pendiente")==="pendiente").reduce((a,l)=>a+l.cantidad,0), 0);
    // Ingresos estimados plataforma (corredores externos)
    const ingresosEstimados = corExt * precioCorrExt;
    // Coste estimado total fabricación (todas las fuentes)
    const totalCorrParaFab = TALLAS.reduce((s,t) => s + (corredoresExt[t]||0), 0)
      + pedidos.reduce((s,p) => s+p.lineas.filter(l=>l.tipo==="corredor").reduce((a,l)=>a+l.cantidad,0), 0);
    const totalVolParaFab = voluntariosActivos.length
      + pedidos.reduce((s,p) => s+p.lineas.filter(l=>l.tipo==="voluntario").reduce((a,l)=>a+l.cantidad,0), 0);
    const costeFabricacion = totalCorrParaFab*(coste.corredor||0) + totalVolParaFab*(coste.voluntario||0);
    return { total, unidades, recaudado, pendCobro, beneficio, benRealizado, benPotencial, costeRegalos, regalos, pendEnt,
      corExt, volUnid, extrasUnid, ingresosEstimados, costeFabricacion, totalCorrParaFab, totalVolParaFab };
  }, [pedidos, coste, corredoresExt, voluntariosActivos, precioCorrExt]);

  const TABS = [
    {id:"dashboard",icon:"📊",label:"Dashboard"},
    {id:"pedidos",  icon:"👕",label:"Pedidos"},
    {id:"tallas",   icon:"📐",label:"Tallas"},
    {id:"checklist",icon:"✅",       label:"Producción"},
  ];

  return (
    <>
      <style>{BLOCK_CSS+CSS}</style>
      <div className="block-container">
        <div className="block-header">
          <div>
            <h1 className="block-title">👕 Camisetas Extra</h1>
            <div className="block-title-sub">{config.nombre} {config.edicion} · Pedidos externos</div>
          </div>
          <div className="block-actions">
            {stats.pendCobro>0 && <span className="badge badge-amber">⏳ {fmt(stats.pendCobro)} pendiente</span>}
            {stats.pendEnt  >0 && <span className="badge badge-cyan">📦 {stats.pendEnt} ud por entregar</span>}
            <button className="btn btn-primary" onClick={()=>abrirModal(null)}>+ Nuevo pedido</button>
          </div>
        </div>
        <div className="tabs">
          {TABS.map(t=>(<button key={t.id} className={cls("tab-btn",tab===t.id&&"active")} onClick={()=>setTab(t.id)}>{t.icon} {t.label}</button>))}
        </div>
        <div key={tab}>
          {tab==="dashboard" && <TabDashboard stats={stats} pedidos={pedidos} coste={coste} setCoste={setCoste} setTab={setTab} abrirFicha={abrirFicha}
            precioCorrExt={precioCorrExt} setPrecioCorrExt={(v) => setPrecioPlatExt({ precio: v })}
            corredoresExt={corredoresExt} voluntariosActivos={voluntariosActivos} />}
          {tab==="pedidos"   && <TabPedidos   pedidos={pedidos} coste={coste} abrirFicha={abrirFicha} abrirModal={abrirModal} />}
          {tab==="tallas"    && <TabTallas    pedidos={pedidos} corredoresExt={corredoresExt} setCorredores={setCorredores} voluntariosActivos={voluntariosActivos} />}
          {tab==="checklist" && <TabChecklist pedidos={pedidos} updateLinea={updateLinea} abrirFicha={abrirFicha} />}
        </div>
      </div>

      {ficha && <FichaPedido pedido={pedidos.find(p=>p.id===ficha.id)||ficha} coste={coste} onClose={()=>setFicha(null)} onEditar={()=>abrirEditar(pedidos.find(p=>p.id===ficha.id)||ficha)} onEliminar={()=>{setDelId(ficha.id);setFicha(null);}} updateLinea={updateLinea} />}
      {modal && <ModalPedido data={modal.data} coste={coste} onSave={savePedido} onClose={()=>setModal(null)} />}
      {delId && (
        <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setDelId(null)}>
          <div className="modal" style={{maxWidth:340,textAlign:"center"}}>
            <div className="modal-body" style={{paddingTop:"1.5rem"}}><div style={{fontSize:"2.5rem",marginBottom:".6rem"}}>⚠️</div><div style={{fontWeight:700,marginBottom:".4rem"}}>¿Eliminar pedido?</div><div className="mono xs muted">Esta acción no se puede deshacer.</div></div>
            <div className="modal-footer"><button className="btn btn-ghost" onClick={()=>setDelId(null)}>Cancelar</button><button className="btn btn-red" onClick={deletePedido}>Eliminar</button></div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── TAB DASHBOARD ────────────────────────────────────────────────────────────
function TabDashboard({ stats, pedidos, coste, setCoste, setTab, abrirFicha, precioCorrExt, setPrecioCorrExt }) {
  const [editCoste,setEditCoste] = useState(false);
  const [tmpCoste, setTmpCoste]  = useState({...coste});
  const [editPrecioPlat, setEditPrecioPlat] = useState(false);
  const [tmpPrecioPlat, setTmpPrecioPlat] = useState(precioCorrExt ?? 15);
  const porTipo = TIPOS.map(tipo => {
    const lineas   = pedidos.flatMap(p=>p.lineas.filter(l=>l.tipo===tipo));
    const unidades = lineas.reduce((s,l)=>s+l.cantidad,0);
    const costeT   = lineas.reduce((s,l)=>s+l.cantidad*(coste[tipo]||0),0);
    const ventaT   = lineas.filter(l=>l.estadoPago!=="regalo").reduce((s,l)=>s+l.cantidad*(l.precioVenta||0),0);
    const regaloU  = lineas.filter(l=>l.estadoPago==="regalo").reduce((s,l)=>s+l.cantidad,0);
    return {tipo,unidades,costeT,ventaT,regaloU,cfg:TC[tipo]};
  });
  const extrasCorr = pedidos.reduce((s,p)=>s+p.lineas.filter(l=>l.tipo==="corredor").reduce((a,l)=>a+l.cantidad,0),0);
  const extrasVol  = pedidos.reduce((s,p)=>s+p.lineas.filter(l=>l.tipo==="voluntario").reduce((a,l)=>a+l.cantidad,0),0);
  const recientes = [...pedidos].sort((a,b)=>b.id-a.id).slice(0,5);
  return (
    <>
      {/* ── BLOQUE PRODUCCIÓN: todas las fuentes ── */}
      <div className="card mb" style={{borderLeft:"3px solid var(--primary)",padding:".85rem 1rem"}}>
        <div style={{fontFamily:"var(--font-mono)",fontSize:".6rem",fontWeight:700,color:"var(--primary)",textTransform:"uppercase",letterSpacing:".1em",marginBottom:".65rem"}}>
          📦 Producción total — desglose por fuente
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:".6rem"}}>
          {[
            {l:"🏃 Corredor ext.",   v:stats.corExt,               s:"plataforma externa", c:"var(--cyan)"},
            {l:"👕 Extras corredor", v:extrasCorr,                  s:"pedidos manuales",   c:"var(--cyan)"},
            {l:"👥 Voluntarios",     v:stats.volUnid,              s:"tallas confirmadas",  c:"var(--violet)"},
            {l:"👥 Extras vol.",     v:extrasVol,                   s:"pedidos manuales",   c:"var(--violet)"},
            {l:"🔢 TOTAL",           v:stats.unidades,              s:"camisetas a fabricar",c:"var(--text)"},
            {l:"⚗️ Coste fabr.",     v:fmt(stats.costeFabricacion), s:`${stats.totalCorrParaFab}🏃 + ${stats.totalVolParaFab}👥`, c:"var(--red)"},
          ].map(k=>(
            <div key={k.l} style={{background:"var(--surface2)",borderRadius:"var(--r-sm)",padding:".5rem .65rem",cursor:k.l==="🔢 TOTAL"?"pointer":undefined}} onClick={k.l==="🔢 TOTAL"?()=>setTab("tallas"):undefined}>
              <div style={{fontFamily:"var(--font-mono)",fontSize:".56rem",color:"var(--text-muted)",marginBottom:".2rem"}}>{k.l}</div>
              <div style={{fontFamily:"var(--font-mono)",fontSize:".95rem",fontWeight:800,color:k.c}}>{k.v}</div>
              <div style={{fontFamily:"var(--font-mono)",fontSize:".5rem",color:"var(--text-dim)",marginTop:".1rem"}}>{k.s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── KPIs FINANCIEROS EXTRAS (pedidos manuales) ── */}
      <div className="kpi-grid mb">
        {[
          {l:"👕 Pedidos extras", v:stats.total,          s:"personas",          color:"cyan",   tab:"pedidos"},
          {l:"✅ Recaudado",      v:fmt(stats.recaudado), s:"líneas pagadas",     color:"green",  tab:"pedidos"},
          {l:"⏳ Por cobrar",     v:fmt(stats.pendCobro), s:"líneas pendientes",  color:"amber",  tab:"pedidos"},
          {l:<><span>📈 Ing. estimado plataforma</span><Tooltip text={"Ingreso estimado de camisetas corredor de la plataforma externa.\nFórmula: Nº corredores externos × precio manual.\nNo es dinero real en caja aún."}><TooltipIcon /></Tooltip></>, v:fmt(stats.ingresosEstimados), s:`${stats.corExt} ud × ${fmtN(precioCorrExt??15)} €`, color:"cyan", tab:"tallas"},
          {l:<><span>💰 Ben. realizado</span><Tooltip text={"Beneficio ya generado sobre las líneas cobradas de pedidos extras.\nEs dinero real ya en caja."}><TooltipIcon /></Tooltip></>, v:fmt(stats.benRealizado), s:"extras pagados", color:stats.benRealizado>=0?"green":"red", tab:"pedidos"},
          {l:<><span>🎁 Coste regalos</span><Tooltip text={"Coste total de extras marcados como regalo."}><TooltipIcon /></Tooltip></>, v:fmt(stats.costeRegalos), s:"pérdida asumida", color:"violet", tab:"pedidos"},
        ].map((k,i)=>(
          <div key={i} className={`kpi ${k.color}`} style={{cursor:"pointer"}} onClick={()=>setTab(k.tab)}>
            <div className="kpi-label">{k.l}</div><div className="kpi-value">{k.v}</div><div className="kpi-sub">{k.s}</div>
          </div>
        ))}
      </div>

      {/* ── Configuración: coste fabricación + precio plataforma ── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem",marginBottom:".85rem"}}>
        <div className="card" style={{borderLeft:"3px solid var(--primary)"}}>
          <div className="flex-between">
            <div>
              <div style={{fontWeight:700,fontSize:".85rem",marginBottom:".15rem"}}>
                <Tooltip text={"Coste unitario que paga la organización al proveedor por cada camiseta.\nAfecta al coste total de fabricación."}><span>⚙️ Coste de producción</span><TooltipIcon /></Tooltip>
              </div>
              <div className="mono xs muted">Por modelo de camiseta</div>
            </div>
            {editCoste ? (
              <div style={{display:"flex",gap:".5rem",alignItems:"center",flexWrap:"wrap"}}>
                {TIPOS.map(tipo=>(
                  <label key={tipo} style={{display:"flex",alignItems:"center",gap:".35rem",fontFamily:"var(--font-mono)",fontSize:".72rem"}}>
                    <span style={{color:TC[tipo].color}}>{TC[tipo].icon}</span>
                    <input type="number" min="0" step="0.5" value={tmpCoste[tipo]||0}
                      onChange={e=>setTmpCoste(p=>({...p,[tipo]:parseFloat(e.target.value)||0}))}
                      style={{width:52,background:"var(--surface2)",border:"1px solid var(--border)",color:"var(--text)",borderRadius:"var(--r-sm)",padding:".25rem .4rem",fontFamily:"var(--font-mono)",fontSize:".72rem",textAlign:"right"}} />
                    <span className="mono xs muted">€</span>
                  </label>
                ))}
                <button className="btn btn-primary btn-sm" onClick={()=>{setCoste(tmpCoste);setEditCoste(false);}}>OK</button>
                <button className="btn btn-ghost btn-sm" onClick={()=>setEditCoste(false)}>✕</button>
              </div>
            ) : (
              <div style={{display:"flex",gap:"1rem",alignItems:"center"}}>
                {TIPOS.map(tipo=><span key={tipo} style={{fontFamily:"var(--font-mono)",fontSize:".78rem",color:TC[tipo].color}}>{TC[tipo].icon} {fmtN(coste[tipo]||0)} €</span>)}
                <button className="btn btn-ghost btn-sm" onClick={()=>{setTmpCoste({...coste});setEditCoste(true);}}>✏️ Editar</button>
              </div>
            )}
          </div>
        </div>
        <div className="card" style={{borderLeft:"3px solid var(--cyan)"}}>
          <div className="flex-between">
            <div>
              <div style={{fontWeight:700,fontSize:".85rem",marginBottom:".15rem"}}>
                <Tooltip text={"Precio de la camiseta corredor en la plataforma externa de inscripciones.\nSe usa para calcular los ingresos estimados de plataforma."}><span>🏃 Precio en plataforma</span><TooltipIcon /></Tooltip>
              </div>
              <div className="mono xs muted">Camiseta corredor</div>
            </div>
            {editPrecioPlat ? (
              <div style={{display:"flex",gap:".5rem",alignItems:"center"}}>
                <input type="number" min="0" step="0.5" value={tmpPrecioPlat}
                  onChange={e=>setTmpPrecioPlat(parseFloat(e.target.value)||0)}
                  style={{width:64,background:"var(--surface2)",border:"1px solid var(--border)",color:"var(--cyan)",borderRadius:"var(--r-sm)",padding:".25rem .4rem",fontFamily:"var(--font-mono)",fontSize:".82rem",textAlign:"right"}} />
                <span className="mono xs muted">€</span>
                <button className="btn btn-primary btn-sm" onClick={()=>{setPrecioCorrExt(tmpPrecioPlat);setEditPrecioPlat(false);}}>OK</button>
                <button className="btn btn-ghost btn-sm" onClick={()=>setEditPrecioPlat(false)}>✕</button>
              </div>
            ) : (
              <div style={{display:"flex",gap:".75rem",alignItems:"center"}}>
                <span style={{fontFamily:"var(--font-mono)",fontSize:".92rem",fontWeight:800,color:"var(--cyan)"}}>{fmtN(precioCorrExt??15)} €</span>
                <button className="btn btn-ghost btn-sm" onClick={()=>{setTmpPrecioPlat(precioCorrExt??15);setEditPrecioPlat(true);}}>✏️ Editar</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">🏷️ Resumen por tipo (extras manuales)</div>
          {porTipo.map(({tipo,unidades,costeT,ventaT,regaloU,cfg})=>(
            <div key={tipo} style={{display:"flex",gap:".75rem",alignItems:"center",marginBottom:".75rem"}}>
              <div style={{width:36,height:36,borderRadius:8,background:cfg.dim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.1rem",flexShrink:0}}>{cfg.icon}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:".15rem"}}>
                  <span style={{fontSize:".78rem",fontWeight:700,color:cfg.color}}>{cfg.label}</span>
                  <span className="mono xs muted">{unidades} ud{regaloU>0?` (${regaloU} regalo)`:""}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span className="mono xs muted">Coste: {fmt(costeT)}</span>
                  <span className="mono xs" style={{color:cfg.color}}>Venta: {fmt(ventaT)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-title">🕐 Últimos pedidos</div>
          {recientes.length===0&&<div className="empty-state"><div className="empty-state-icon">👕</div>Sin pedidos aún</div>}
          {recientes.map(p=>{
            const {totalUnid}=calcPedido(p,coste); const bp=badgePago(p);
            return (
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:".6rem",padding:".4rem 0",borderBottom:"1px solid rgba(30,45,80,.3)",cursor:"pointer"}} onClick={()=>abrirFicha(p)}>
                <span style={{fontSize:"1rem"}}>{bp.icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:".78rem",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nombre}</div>
                  <div className="mono xs muted">{totalUnid} ud · {p.lineas.map(l=>`${l.cantidad}×${TC[l.tipo]?.icon}${l.talla} ${EP[l.estadoPago||"pendiente"]?.icon}`).join(" ")}</div>
                </div>
                <span className="badge" style={{background:bp.bg,color:bp.color,fontSize:".52rem"}}>{bp.label}</span>
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
function TabPedidos({ pedidos, coste, abrirFicha, abrirModal }) {
  const [vistaK,setVistaK]   = useState(false);
  const [alfa,  setAlfa]     = useState(false);
  const [fPago, setFPago]    = useState("todos");
  const [fEnt,  setFEnt]     = useState("todos");
  const [bus,   setBus]      = useState("");
  const filtrados = useMemo(()=>{
    let list = pedidos.filter(p=>{
      const q  = bus.toLowerCase();
      const mQ = !q||p.nombre.toLowerCase().includes(q)||(p.telefono||"").includes(q)||(p.email||"").toLowerCase().includes(q);
      const mP = fPago==="todos"||p.lineas.some(l=>(l.estadoPago||"pendiente")===fPago);
      const mE = fEnt==="todos" ||p.lineas.some(l=>(l.estadoEntrega||"pendiente")===fEnt);
      return mQ&&mP&&mE;
    });
    if (alfa) list=[...list].sort((a,b)=>a.nombre.localeCompare(b.nombre,"es"));
    return list;
  },[pedidos,bus,fPago,fEnt,alfa]);
  return (
    <>
      <div className="ph">
        <div><div className="pt">👕 Pedidos de camisetas</div><div className="pd">{pedidos.length} pedidos · {pedidos.reduce((s,p)=>s+p.lineas.reduce((a,l)=>a+l.cantidad,0),0)} unidades</div></div>
        <div className="fr g1" style={{flexWrap:"wrap"}}>
          <div style={{display:"flex",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:"var(--r-sm)",overflow:"hidden"}}>
            {[["lista","☰"],["kanban","⬛"]].map(([v,ic])=>(
              <button key={v} onClick={()=>setVistaK(v==="kanban")} style={{padding:".3rem .55rem",border:"none",cursor:"pointer",fontFamily:"var(--font-mono)",fontSize:".62rem",fontWeight:700,background:(vistaK&&v==="kanban")||(!vistaK&&v==="lista")?"rgba(99,102,241,.2)":"transparent",color:(vistaK&&v==="kanban")||(!vistaK&&v==="lista")?"#c4c6ff":"var(--text-muted)"}}>{ic}</button>
            ))}
          </div>
          <button className={cls("btn btn-sm",alfa?"btn-primary":"btn-ghost")} onClick={()=>setAlfa(v=>!v)}>{alfa?"A-Z ✓":"A-Z"}</button>
          <button className="btn btn-primary" onClick={()=>abrirModal(null)}>+ Nuevo pedido</button>
        </div>
      </div>
      <div className="card" style={{marginBottom:".75rem",padding:".65rem .85rem"}}>
        <div style={{display:"flex",gap:".6rem",flexWrap:"wrap",alignItems:"center"}}>
          <input className="inp" placeholder="🔍 Nombre, teléfono o email…" value={bus} onChange={e=>setBus(e.target.value)} style={{maxWidth:240}} />
          <select className="inp" value={fPago} onChange={e=>setFPago(e.target.value)} style={{width:"auto"}}>
            <option value="todos">Pago: todos</option>
            {ESTADOS_PAGO.map(e=><option key={e} value={e}>{EP[e].icon} {EP[e].label}</option>)}
          </select>
          <select className="inp" value={fEnt} onChange={e=>setFEnt(e.target.value)} style={{width:"auto"}}>
            <option value="todos">Entrega: todos</option>
            {ESTADOS_ENTREGA.map(e=><option key={e} value={e}>{EE[e].icon} {EE[e].label}</option>)}
          </select>
          {(bus||fPago!=="todos"||fEnt!=="todos")&&<button className="btn btn-ghost btn-sm" onClick={()=>{setBus("");setFPago("todos");setFEnt("todos");}}>✕ Limpiar</button>}
        </div>
      </div>
      {filtrados.length===0&&<div className="empty-state"><div className="empty-state-icon">👕</div>Sin pedidos con estos filtros</div>}
      {vistaK ? (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:".65rem"}}>
          {ESTADOS_PAGO.map(estado=>{
            const cfg=EP[estado];
            const items=filtrados.filter(p=>{
              const counts={};
              p.lineas.forEach(l=>{counts[l.estadoPago||"pendiente"]=(counts[l.estadoPago||"pendiente"]||0)+l.cantidad;});
              return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]===estado;
            });
            return (
              <div key={estado} style={{background:"var(--surface)",border:"1px solid var(--border)",borderTop:`2px solid ${cfg.color}`,borderRadius:"var(--r)",overflow:"hidden"}}>
                <div style={{padding:".6rem .75rem",background:"var(--surface2)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:".7rem",fontWeight:700,color:cfg.color}}>{cfg.icon} {cfg.label}</span>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:".6rem",padding:".1rem .35rem",borderRadius:4,background:cfg.bg,color:cfg.color}}>{items.length}</span>
                </div>
                {items.map(p=>{
                  const {totalVenta,totalUnid}=calcPedido(p,coste); const be=badgeEnt(p);
                  return (
                    <div key={p.id} style={{margin:".4rem .4rem 0",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:".6rem .7rem",cursor:"pointer",transition:"all .15s"}}
                      onClick={()=>abrirFicha(p)} onMouseEnter={e=>e.currentTarget.style.borderColor="var(--border-light)"} onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
                      <div style={{fontWeight:700,fontSize:".78rem",marginBottom:".25rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nombre}</div>
                      <div style={{display:"flex",gap:".25rem",flexWrap:"wrap",marginBottom:".3rem"}}>
                        {p.lineas.map((l,i)=>(
                          <span key={i} style={{fontFamily:"var(--font-mono)",fontSize:".55rem",padding:".06rem .3rem",borderRadius:3,background:TC[l.tipo]?.dim,color:TC[l.tipo]?.color,border:`1px solid ${TC[l.tipo]?.color}33`}}>
                            {TC[l.tipo]?.icon}{l.talla}×{l.cantidad} {EP[l.estadoPago||"pendiente"]?.icon}
                          </span>
                        ))}
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span className="mono xs muted">{totalUnid} ud · {fmt(totalVenta)}</span>
                        <span className="badge" style={{background:be.bg,color:be.color,fontSize:".5rem"}}>{be.icon}</span>
                      </div>
                    </div>
                  );
                })}
                {items.length===0&&<div style={{padding:"1rem",textAlign:"center",fontFamily:"var(--font-mono)",fontSize:".62rem",color:"var(--text-dim)"}}>—</div>}
                <div style={{height:".4rem"}}/>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:".5rem"}}>
          {filtrados.map(p=>{
            const {totalVenta}=calcPedido(p,coste); const bp=badgePago(p); const be=badgeEnt(p);
            return (
              <div key={p.id} className="cam-row" onClick={()=>abrirFicha(p)}>
                <div style={{display:"flex",alignItems:"center",gap:".6rem",flex:1,minWidth:0}}>
                  <span style={{fontSize:"1.4rem",flexShrink:0}}>{bp.icon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:".88rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nombre}</div>
                    <div style={{display:"flex",gap:".3rem",flexWrap:"wrap",marginTop:".15rem"}}>
                      {p.lineas.map((l,i)=>(
                        <span key={i} style={{fontFamily:"var(--font-mono)",fontSize:".6rem",padding:".08rem .35rem",borderRadius:3,background:TC[l.tipo]?.dim,color:TC[l.tipo]?.color,display:"flex",alignItems:"center",gap:".2rem"}}>
                          {TC[l.tipo]?.icon} {l.talla}×{l.cantidad} {EP[l.estadoPago||"pendiente"]?.icon}{EE[l.estadoEntrega||"pendiente"]?.icon}
                        </span>
                      ))}
                    </div>
                    {p.notas&&<div className="mono xs muted" style={{marginTop:".1rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.notas}</div>}
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:".3rem",flexShrink:0}}>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:".88rem",fontWeight:800}}>{fmt(totalVenta)}</div>
                  <div style={{display:"flex",gap:".3rem"}}>
                    <span className="badge" style={{background:bp.bg,color:bp.color,fontSize:".52rem"}}>{bp.label}</span>
                    <span className="badge" style={{background:be.bg,color:be.color,fontSize:".52rem"}}>{be.icon}</span>
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

// ─── TAB TALLAS ───────────────────────────────────────────────────────────────
function TabTallas({ pedidos, corredoresExt, setCorredores, voluntariosActivos }) {
  const [editCorredores, setEditCorredores] = useState(false);
  const [tmpCor, setTmpCor] = useState({ ...corredoresExt });

  // Al abrir edición, sincronizar el estado temporal
  const abrirEdicion = () => { setTmpCor({ ...corredoresExt }); setEditCorredores(true); };
  const guardarCorredores = () => { setCorredores({ ...tmpCor }); setEditCorredores(false); };

  // Tallas de EXTRAS (pedidos manuales) agrupadas por tipo/modelo de camiseta
  const tallasExtras = useMemo(() => {
    const map = {};
    TALLAS.forEach(t => { map[t] = {}; TIPOS.forEach(tp => { map[t][tp] = 0; }); });
    pedidos.forEach(p => p.lineas.forEach(l => {
      if (map[l.talla]) map[l.talla][l.tipo] = (map[l.talla][l.tipo] || 0) + l.cantidad;
    }));
    return map;
  }, [pedidos]);

  // Tallas de VOLUNTARIOS agrupadas (modelo voluntario)
  const tallasVol = useMemo(() => {
    const map = {};
    TALLAS.forEach(t => { map[t] = 0; });
    voluntariosActivos.forEach(v => { if (map[v.talla] !== undefined) map[v.talla]++; });
    return map;
  }, [voluntariosActivos]);

  // TOTALES AL PROVEEDOR por modelo y talla
  const totalCorredor = useMemo(() => {
    const tot = {};
    TALLAS.forEach(t => {
      tot[t] = (corredoresExt[t] || 0) + (tallasExtras[t]?.corredor || 0);
    });
    return tot;
  }, [corredoresExt, tallasExtras]);

  const totalVoluntario = useMemo(() => {
    const tot = {};
    TALLAS.forEach(t => {
      tot[t] = (tallasVol[t] || 0) + (tallasExtras[t]?.voluntario || 0);
    });
    return tot;
  }, [tallasVol, tallasExtras]);

  const grandTotalCor = TALLAS.reduce((s, t) => s + (totalCorredor[t] || 0), 0);
  const grandTotalVol = TALLAS.reduce((s, t) => s + (totalVoluntario[t] || 0), 0);
  const grandTotal = grandTotalCor + grandTotalVol;

  const SectionTitle = ({ icon, title, subtitle, color, action }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.6rem', gap: '.5rem', flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '.62rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.08em' }}>{icon} {title}</div>
        {subtitle && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '.58rem', color: 'var(--text-muted)', marginTop: '.1rem' }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );

  const TallaBar = ({ talla, valor, total, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.38rem' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.7rem', fontWeight: 700, width: 34, flexShrink: 0 }}>{talla}</span>
      <div style={{ flex: 1, height: 7, background: 'var(--surface3)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${total > 0 ? (valor / total) * 100 : 0}%`, background: color, borderRadius: 4, transition: 'width .4s ease' }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.7rem', fontWeight: 700, color, width: 22, textAlign: 'right' }}>{valor}</span>
    </div>
  );

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">📐 Tallas para producción</div>
          <div className="pd">{grandTotal} unidades totales · {grandTotalCor} modelo corredor · {grandTotalVol} modelo voluntario</div>
        </div>
      </div>

      {/* ── TABLA CONSOLIDADA: PEDIDO TOTAL AL PROVEEDOR (4 columnas) ── */}
      <div className="card" style={{ marginBottom: '.85rem', borderLeft: '3px solid var(--primary)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '.65rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '.75rem' }}>📦 Pedido Total al Proveedor — desglose por fuente</div>
        <div className="overflow-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>Talla</th>
                <th className="text-right" style={{ color: TC.corredor.color, fontSize: '.58rem' }}>🏃 Corredor<br/><span style={{opacity:.65}}>Plat. ext.</span></th>
                <th className="text-right" style={{ color: TC.corredor.color, fontSize: '.58rem' }}>👕 Extras<br/><span style={{opacity:.65}}>Corredor</span></th>
                <th className="text-right" style={{ color: TC.voluntario.color, fontSize: '.58rem' }}>👥 Voluntarios<br/><span style={{opacity:.65}}>Automático</span></th>
                <th className="text-right" style={{ color: TC.voluntario.color, fontSize: '.58rem' }}>👥 Extras<br/><span style={{opacity:.65}}>Voluntario</span></th>
                <th className="text-right" style={{ fontWeight: 800 }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {TALLAS.map(t => {
                const cExt  = corredoresExt[t] || 0;
                const cXtra = tallasExtras[t]?.corredor || 0;
                const vAuto = tallasVol[t] || 0;
                const vXtra = tallasExtras[t]?.voluntario || 0;
                const tot = cExt + cXtra + vAuto + vXtra;
                if (!tot) return null;
                const cell = (v, color, dim) => v > 0
                  ? <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color, background: dim, padding: '.1rem .4rem', borderRadius: 4 }}>{v}</span>
                  : <span style={{ color: 'var(--text-dim)' }}>—</span>;
                return (
                  <tr key={t}>
                    <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{t}</td>
                    <td className="text-right">{cell(cExt,  TC.corredor.color,   TC.corredor.dim)}</td>
                    <td className="text-right">{cell(cXtra, TC.corredor.color,   TC.corredor.dim)}</td>
                    <td className="text-right">{cell(vAuto, TC.voluntario.color, TC.voluntario.dim)}</td>
                    <td className="text-right">{cell(vXtra, TC.voluntario.color, TC.voluntario.dim)}</td>
                    <td className="text-right"><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '.9rem' }}>{tot}</span></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>TOTAL</td>
                <td className="text-right" style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: TC.corredor.color }}>{TALLAS.reduce((s,t)=>s+(corredoresExt[t]||0),0)}</td>
                <td className="text-right" style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: TC.corredor.color }}>{TALLAS.reduce((s,t)=>s+(tallasExtras[t]?.corredor||0),0)}</td>
                <td className="text-right" style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: TC.voluntario.color }}>{TALLAS.reduce((s,t)=>s+(tallasVol[t]||0),0)}</td>
                <td className="text-right" style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: TC.voluntario.color }}>{TALLAS.reduce((s,t)=>s+(tallasExtras[t]?.voluntario||0),0)}</td>
                <td className="text-right" style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '.95rem' }}>{grandTotal}</td>
              </tr>
              <tr>
                <td colSpan={3} style={{ fontFamily: 'var(--font-mono)', fontSize: '.58rem', color: TC.corredor.color, paddingTop: '.35rem' }}>
                  🏃 Total corredor: <strong>{grandTotalCor}</strong>
                </td>
                <td colSpan={3} style={{ fontFamily: 'var(--font-mono)', fontSize: '.58rem', color: TC.voluntario.color, paddingTop: '.35rem' }}>
                  👥 Total voluntario: <strong>{grandTotalVol}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── DESGLOSE POR FUENTE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '.85rem' }}>

        {/* ── FUENTE 1: Corredores (plataforma externa) ── */}
        <div className="card">
          <SectionTitle
            icon="🏃" title="Corredor — plataforma externa"
            subtitle="Introduce manualmente los totales de la plataforma de inscripción"
            color={TC.corredor.color}
            action={
              !editCorredores
                ? <button className="btn btn-ghost btn-sm" onClick={abrirEdicion}>✏️ Editar</button>
                : <div style={{ display: 'flex', gap: '.35rem' }}>
                    <button className="btn btn-primary btn-sm" onClick={guardarCorredores}>✓ Guardar</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditCorredores(false)}>✕</button>
                  </div>
            }
          />
          {editCorredores ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '.4rem' }}>
              {TALLAS.map(t => (
                <label key={t} style={{ display: 'flex', flexDirection: 'column', gap: '.2rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.65rem', fontWeight: 700, color: TC.corredor.color }}>{t}</span>
                  <input
                    type="number" min="0" value={tmpCor[t] || 0}
                    onChange={e => setTmpCor(p => ({ ...p, [t]: Math.max(0, parseInt(e.target.value) || 0) }))}
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 'var(--r-sm)', padding: '.3rem .4rem', fontFamily: 'var(--font-mono)', fontSize: '.78rem', textAlign: 'right', outline: 'none', width: '100%' }}
                  />
                </label>
              ))}
            </div>
          ) : (
            <>
              {TALLAS.filter(t => (corredoresExt[t] || 0) > 0).length === 0
                ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: '.62rem', color: 'var(--text-dim)', textAlign: 'center', padding: '1rem 0' }}>Sin datos — haz clic en ✏️ Editar para introducir tallas</div>
                : TALLAS.filter(t => (corredoresExt[t] || 0) > 0).map(t => (
                  <TallaBar key={t} talla={t} valor={corredoresExt[t]} total={TALLAS.reduce((s, tt) => s + (corredoresExt[tt] || 0), 0)} color={TC.corredor.color} />
                ))
              }
              {(tallasExtras && TALLAS.some(t => (tallasExtras[t]?.corredor || 0) > 0)) && (
                <div style={{ marginTop: '.75rem', paddingTop: '.6rem', borderTop: '1px dashed var(--border)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '.58rem', color: 'var(--text-muted)', marginBottom: '.4rem' }}>+ Extras modelo corredor (pedidos manuales):</div>
                  {TALLAS.filter(t => (tallasExtras[t]?.corredor || 0) > 0).map(t => (
                    <TallaBar key={t} talla={t} valor={tallasExtras[t].corredor} total={TALLAS.reduce((s, tt) => s + (tallasExtras[tt]?.corredor || 0), 0)} color={TC.corredor.color} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── FUENTE 2: Voluntarios (automático) ── */}
        <div className="card">
          <SectionTitle
            icon="👥" title="Voluntario — automático"
            subtitle={`${voluntariosActivos.length} voluntario(s) activos sincronizados en tiempo real`}
            color={TC.voluntario.color}
          />
          {TALLAS.filter(t => (tallasVol[t] || 0) > 0).length === 0
            ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: '.62rem', color: 'var(--text-dim)', textAlign: 'center', padding: '1rem 0' }}>Sin voluntarios con talla asignada aún</div>
            : TALLAS.filter(t => (tallasVol[t] || 0) > 0).map(t => (
              <TallaBar key={t} talla={t} valor={tallasVol[t]} total={voluntariosActivos.length} color={TC.voluntario.color} />
            ))
          }
          {TALLAS.some(t => (tallasExtras[t]?.voluntario || 0) > 0) && (
            <div style={{ marginTop: '.75rem', paddingTop: '.6rem', borderTop: '1px dashed var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '.58rem', color: 'var(--text-muted)', marginBottom: '.4rem' }}>+ Extras modelo voluntario (pedidos manuales):</div>
              {TALLAS.filter(t => (tallasExtras[t]?.voluntario || 0) > 0).map(t => (
                <TallaBar key={t} talla={t} valor={tallasExtras[t].voluntario} total={TALLAS.reduce((s, tt) => s + (tallasExtras[tt]?.voluntario || 0), 0)} color={TC.voluntario.color} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── TAB CHECKLIST ────────────────────────────────────────────────────────────
function TabChecklist({ pedidos, updateLinea, abrirFicha }) {
  const [filtro,setFiltro] = useState("todos");
  const todas = useMemo(()=>pedidos.flatMap(p=>p.lineas.map(l=>({...l,pedNombre:p.nombre,pedId:p.id,ped:p}))),[pedidos]);
  const filtradas = useMemo(()=>todas.filter(l=>{
    const ep=l.estadoPago||"pendiente"; const ee=l.estadoEntrega||"pendiente";
    if(filtro==="todos")        return true;
    if(filtro==="sin-entregar") return ee==="pendiente";
    if(filtro==="entregado")    return ee==="entregado";
    if(filtro==="sin-pagar")    return ep==="pendiente";
    if(filtro==="pagado")       return ep==="pagado";
    if(filtro==="regalo")       return ep==="regalo";
    return true;
  }),[todas,filtro]);
  const cPE=todas.filter(l=>(l.estadoEntrega||"pendiente")==="pendiente").length;
  const cPP=todas.filter(l=>(l.estadoPago||"pendiente")==="pendiente").length;
  const FILTROS=[
    {id:"todos",        label:`Todos (${todas.length})`,                                                   color:"var(--text-muted)"},
    {id:"sin-entregar", label:`Por entregar (${cPE})`,                                                    color:"var(--amber)"},
    {id:"entregado",    label:`Entregados (${todas.filter(l=>l.estadoEntrega==="entregado").length})`,    color:"var(--green)"},
    {id:"sin-pagar",    label:`Sin pagar (${cPP})`,                                                       color:"var(--amber)"},
    {id:"pagado",       label:`Pagados (${todas.filter(l=>l.estadoPago==="pagado").length})`,             color:"var(--green)"},
    {id:"regalo",       label:`Regalos (${todas.filter(l=>l.estadoPago==="regalo").length})`,             color:"var(--violet)"},
  ];
  return (
    <>
      <div className="ph"><div><div className="pt">✅ Producción y entrega</div><div className="pd">{cPE} líneas por entregar · {cPP} sin cobrar</div></div></div>
      <div style={{display:"flex",gap:".4rem",flexWrap:"wrap",marginBottom:".85rem"}}>
        {FILTROS.map(f=>(
          <button key={f.id} onClick={()=>setFiltro(f.id)} style={{fontFamily:"var(--font-mono)",fontSize:".6rem",fontWeight:700,padding:".28rem .6rem",borderRadius:"var(--r-sm)",border:`1px solid ${filtro===f.id?f.color:"var(--border)"}`,background:filtro===f.id?`${f.color}18`:"transparent",color:filtro===f.id?f.color:"var(--text-muted)",cursor:"pointer",transition:"all .15s"}}>{f.label}</button>
        ))}
      </div>
      {filtradas.length===0&&<div className="empty-state"><div className="empty-state-icon">✅</div>Sin líneas con estos filtros</div>}
      <div style={{display:"flex",flexDirection:"column",gap:".4rem"}}>
        {filtradas.map(l=>{
          const tcfg=TC[l.tipo]; const ep=l.estadoPago||"pendiente"; const ee=l.estadoEntrega||"pendiente";
          const epCfg=EP[ep]; const eeCfg=EE[ee];
          return (
            <div key={`${l.pedId}-${l.id}`} className="card" style={{padding:".7rem 1rem",borderLeft:`3px solid ${eeCfg.color}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:".75rem",flexWrap:"wrap"}}>
                <div style={{cursor:"pointer",flex:1,minWidth:0}} onClick={()=>abrirFicha(l.ped)}>
                  <div style={{fontWeight:700,fontSize:".84rem",marginBottom:".15rem"}}>{l.pedNombre}</div>
                  <div style={{display:"flex",alignItems:"center",gap:".5rem",flexWrap:"wrap"}}>
                    <span style={{fontFamily:"var(--font-mono)",fontSize:".65rem",padding:".1rem .4rem",borderRadius:4,background:tcfg?.dim,color:tcfg?.color}}>{tcfg?.icon} {tcfg?.label} — {l.talla} × {l.cantidad} ud</span>
                    <span className="badge" style={{background:epCfg.bg,color:epCfg.color,fontSize:".55rem"}}>{epCfg.icon} {epCfg.label}</span>
                  </div>
                </div>
                <div style={{display:"flex",gap:".35rem",flexShrink:0}} onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>updateLinea(l.pedId,l.id,"estadoEntrega",ee==="entregado"?"pendiente":"entregado")} style={{fontFamily:"var(--font-mono)",fontSize:".62rem",fontWeight:700,padding:".3rem .65rem",borderRadius:"var(--r-sm)",border:`1px solid ${eeCfg.color}44`,background:eeCfg.bg,color:eeCfg.color,cursor:"pointer",transition:"all .15s",whiteSpace:"nowrap"}}>{ee==="entregado"?"✔️ Entregado":"📦 Entregar"}</button>
                  {ep!=="regalo"&&<button onClick={()=>updateLinea(l.pedId,l.id,"estadoPago",ep==="pagado"?"pendiente":"pagado")} style={{fontFamily:"var(--font-mono)",fontSize:".62rem",fontWeight:700,padding:".3rem .65rem",borderRadius:"var(--r-sm)",border:`1px solid ${epCfg.color}44`,background:epCfg.bg,color:epCfg.color,cursor:"pointer",transition:"all .15s",whiteSpace:"nowrap"}}>{ep==="pagado"?"✅ Pagado":"⏳ Cobrar"}</button>}
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
function FichaPedido({ pedido:p, coste, onClose, onEditar, onEliminar, updateLinea }) {
  const {totalVenta,totalCoste,totalUnid,beneficio,benRealizado,benPotencial,costeRegalos} = calcPedido(p,coste);
  const Row = ({label,value,color}) => (!value&&value!==0)?null:(
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
                <div style={{fontFamily:"var(--font-mono)",fontSize:".55rem",color:"var(--text-muted)",marginTop:".1rem",textTransform:"uppercase"}}>{totalUnid} unidades · {p.lineas.length} línea{p.lineas.length!==1?"s":""}</div>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="modal-body" style={{gap:".4rem"}}>
          <Row label="Teléfono" value={p.telefono} />
          <Row label="Email"    value={p.email} />
          <div style={{background:"var(--surface2)",borderRadius:8,padding:".65rem .75rem",margin:".25rem 0"}}>
            <div style={{fontFamily:"var(--font-mono)",fontSize:".55rem",color:"var(--text-muted)",marginBottom:".5rem",textTransform:"uppercase",letterSpacing:".08em"}}>Líneas del pedido</div>
            {p.lineas.map((l,i)=>{
              const costeU=coste[l.tipo]||0; const cfg=TC[l.tipo];
              const ep=l.estadoPago||"pendiente"; const ee=l.estadoEntrega||"pendiente";
              const epCfg=EP[ep]; const eeCfg=EE[ee];
              const subV=ep==="regalo"?0:l.cantidad*(l.precioVenta||0);
              return (
                <div key={l.id} style={{padding:".5rem 0",borderBottom:i<p.lineas.length-1?"1px solid rgba(30,45,80,.2)":"none"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".3rem"}}>
                    <div style={{display:"flex",alignItems:"center",gap:".5rem"}}>
                      <span style={{fontSize:".9rem"}}>{cfg?.icon}</span>
                      <div>
                        <div style={{fontSize:".75rem",fontWeight:700}}>{cfg?.label} — {l.talla}</div>
                        <div style={{fontFamily:"var(--font-mono)",fontSize:".58rem",color:"var(--text-muted)"}}>{l.cantidad} ud · coste {fmt(costeU)}/ud</div>
                      </div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontFamily:"var(--font-mono)",fontSize:".78rem",fontWeight:700,color:ep==="regalo"?"var(--violet)":cfg?.color}}>{ep==="regalo"?"🎁 Regalo":fmt(subV)}</div>
                      {ep!=="regalo"&&<div style={{fontFamily:"var(--font-mono)",fontSize:".58rem",color:"var(--text-muted)"}}>{fmt(l.precioVenta||0)}/ud</div>}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:".35rem"}} onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>updateLinea(p.id,l.id,"estadoPago",ep==="pagado"?"pendiente":"pagado")} disabled={ep==="regalo"} style={{fontFamily:"var(--font-mono)",fontSize:".58rem",fontWeight:700,padding:".2rem .5rem",borderRadius:4,border:`1px solid ${epCfg.color}44`,background:epCfg.bg,color:epCfg.color,cursor:ep==="regalo"?"default":"pointer",transition:"all .15s"}}>{epCfg.icon} {epCfg.label}</button>
                    <button onClick={()=>updateLinea(p.id,l.id,"estadoEntrega",ee==="entregado"?"pendiente":"entregado")} style={{fontFamily:"var(--font-mono)",fontSize:".58rem",fontWeight:700,padding:".2rem .5rem",borderRadius:4,border:`1px solid ${eeCfg.color}44`,background:eeCfg.bg,color:eeCfg.color,cursor:"pointer",transition:"all .15s"}}>{eeCfg.icon} {eeCfg.label}</button>
                    <span className="mono xs muted" style={{marginLeft:"auto",alignSelf:"center"}}>margen {fmt((ep==="regalo"?-costeU:(l.precioVenta||0)-costeU)*l.cantidad)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{background:"var(--surface2)",borderRadius:8,padding:".6rem .75rem",display:"flex",justifyContent:"space-around",gap:".6rem",flexWrap:"wrap"}}>
            {[
              {l:"Coste total",    v:fmt(totalCoste),   c:"var(--red)"},
              {l:"Venta total",    v:fmt(totalVenta),   c:"var(--green)"},
              {l:"Ben. realizado", v:fmt(benRealizado), c:benRealizado>=0?"var(--green)":"var(--red)"},
              {l:"Ben. potencial", v:fmt(benPotencial), c:benPotencial>=0?"var(--cyan)":"var(--amber)"},
              {l:"Coste regalos",  v:fmt(costeRegalos), c:"var(--violet)"},
            ].map(({l,v,c})=>(
              <div key={l} style={{textAlign:"center"}}><div style={{fontFamily:"var(--font-mono)",fontSize:".5rem",color:"var(--text-muted)",marginBottom:".1rem",textTransform:"uppercase"}}>{l}</div><div style={{fontFamily:"var(--font-mono)",fontSize:".8rem",fontWeight:800,color:c}}>{v}</div></div>
            ))}
          </div>
          {p.notas&&<div style={{background:"var(--surface2)",borderRadius:8,padding:".6rem .75rem",borderLeft:"2px solid var(--primary)"}}><div style={{fontFamily:"var(--font-mono)",fontSize:".55rem",color:"var(--text-muted)",marginBottom:".25rem",textTransform:"uppercase"}}>Notas</div><div style={{fontSize:".78rem",lineHeight:1.5}}>{p.notas}</div></div>}
        </div>
        <div className="modal-footer" style={{justifyContent:"space-between"}}>
          <button className="btn btn-red" onClick={onEliminar}>🗑 Eliminar</button>
          <div style={{display:"flex",gap:".4rem"}}><button className="btn btn-ghost" onClick={onClose}>Cerrar</button><button className="btn btn-primary" onClick={onEditar}>✏️ Editar</button></div>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL CREAR/EDITAR ───────────────────────────────────────────────────────
function ModalPedido({ data, coste, onSave, onClose }) {
  const esEdit = !!data?.id;
  const [form,setForm] = useState(()=>data?{...data,lineas:data.lineas.map(l=>({...l}))}:{
    nombre:"",telefono:"",email:"",notas:"",
    lineas:[{id:1,tipo:"corredor",talla:"M",cantidad:1,precioVenta:0,estadoPago:"pendiente",estadoEntrega:"pendiente"}]
  });
  const upd      = (k,v)   => setForm(p=>({...p,[k]:v}));
  const updL     = (i,k,v) => setForm(p=>({...p,lineas:p.lineas.map((l,j)=>j===i?{...l,[k]:v}:l)}));
  const addL     = ()      => setForm(p=>({...p,lineas:[...p.lineas,{id:genId(p.lineas),tipo:"corredor",talla:"M",cantidad:1,precioVenta:0,estadoPago:"pendiente",estadoEntrega:"pendiente"}]}));
  const delL     = (i)     => setForm(p=>({...p,lineas:p.lineas.filter((_,j)=>j!==i)}));
  const {totalVenta,totalCoste,beneficio,benRealizado,benPotencial,costeRegalos} = calcPedido(form,coste);
  const valido = form.nombre.trim()&&form.lineas.length>0;
  return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:540}}>
        <div className="modal-header"><span className="modal-title">{esEdit?"✏️ Editar pedido":"👕 Nuevo pedido de camiseta"}</span><button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>
        <div className="modal-body" style={{gap:".75rem"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
            <div style={{gridColumn:"1/-1"}}><label className="fl">Nombre *</label><input className="inp" value={form.nombre} onChange={e=>upd("nombre",e.target.value)} placeholder="Nombre completo" /></div>
            <div><label className="fl">Teléfono</label><input className="inp" value={form.telefono} onChange={e=>upd("telefono",e.target.value)} placeholder="6XX XXX XXX" /></div>
            <div><label className="fl">Email</label><input className="inp" value={form.email} onChange={e=>upd("email",e.target.value)} placeholder="email@ejemplo.com" /></div>
          </div>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".5rem"}}><label className="fl" style={{margin:0}}>Líneas del pedido</label><button className="btn btn-ghost btn-sm" onClick={addL}>+ Añadir línea</button></div>
            <div style={{display:"flex",flexDirection:"column",gap:".4rem"}}>
              {form.lineas.map((l,i)=>{
                const costeU=coste[l.tipo]||0; const ep=l.estadoPago||"pendiente"; const esR=ep==="regalo";
                const subV=esR?0:l.cantidad*(l.precioVenta||0); const subC=l.cantidad*costeU;
                const margen=esR?-subC:subV-subC;
                return (
                  <div key={i} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:".65rem .75rem"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 56px 76px 32px",gap:".4rem",alignItems:"end",marginBottom:".4rem"}}>
                      <div><label className="fl">Tipo</label><select className="inp inp-sm" value={l.tipo} onChange={e=>updL(i,"tipo",e.target.value)}>{TIPOS.map(t=><option key={t} value={t}>{TC[t].icon} {TC[t].label}</option>)}</select></div>
                      <div><label className="fl">Talla</label><select className="inp inp-sm" value={l.talla} onChange={e=>updL(i,"talla",e.target.value)}>{TALLAS.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                      <div><label className="fl">Cant.</label><input type="number" min="1" className="inp inp-sm inp-mono" value={l.cantidad} onChange={e=>updL(i,"cantidad",Math.max(1,parseInt(e.target.value)||1))} /></div>
                      <div><label className="fl">€ Venta</label><input type="number" min="0" step="0.5" className="inp inp-sm inp-mono" value={l.precioVenta||0} onChange={e=>updL(i,"precioVenta",parseFloat(e.target.value)||0)} disabled={esR} style={{opacity:esR?.45:1}} /></div>
                      <button className="btn btn-red btn-sm" onClick={()=>delL(i)} disabled={form.lineas.length<=1} style={{marginBottom:1}}>✕</button>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".4rem",marginBottom:".35rem"}}>
                      <div><label className="fl">Estado de pago</label><select className="inp inp-sm" value={ep} onChange={e=>updL(i,"estadoPago",e.target.value)}>{ESTADOS_PAGO.map(s=><option key={s} value={s}>{EP[s].icon} {EP[s].label}</option>)}</select></div>
                      <div><label className="fl">Estado de entrega</label><select className="inp inp-sm" value={l.estadoEntrega||"pendiente"} onChange={e=>updL(i,"estadoEntrega",e.target.value)}>{ESTADOS_ENTREGA.map(s=><option key={s} value={s}>{EE[s].icon} {EE[s].label}</option>)}</select></div>
                    </div>
                    <div style={{fontFamily:"var(--font-mono)",fontSize:".58rem",color:"var(--text-muted)",display:"flex",gap:".75rem",flexWrap:"wrap"}}>
                      <span>Coste: {fmt(subC)}</span><span>Venta: {esR?"🎁 Regalo":fmt(subV)}</span>
                      <span style={{color:margen>=0?"var(--green)":"var(--red)"}}>Margen: {fmt(margen)}</span>
                    </div>
                    {!esR && (l.precioVenta||0)===0 && (
                      <div style={{marginTop:".3rem",fontFamily:"var(--font-mono)",fontSize:".58rem",padding:".2rem .5rem",borderRadius:4,background:"var(--violet-dim)",color:"var(--violet)",display:"inline-flex",alignItems:"center",gap:".3rem"}}>
                        💡 Precio 0 con estado pendiente — ¿es un regalo?
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{background:"var(--surface2)",borderRadius:8,padding:".65rem .85rem",display:"flex",justifyContent:"space-around",gap:".75rem",flexWrap:"wrap"}}>
            {[
              {l:"Total coste",      v:fmt(totalCoste),      c:"var(--red)"},
              {l:"Total venta",      v:fmt(totalVenta),      c:"var(--green)"},
              {l:"Ben. realizado",   v:fmt(benRealizado),    c:benRealizado>=0?"var(--green)":"var(--red)"},
              {l:"Ben. potencial",   v:fmt(benPotencial),    c:benPotencial>=0?"var(--cyan)":"var(--amber)"},
              {l:"Coste regalos",    v:fmt(costeRegalos),    c:"var(--violet)"},
            ].map(({l,v,c})=>(
              <div key={l} style={{textAlign:"center"}}><div style={{fontFamily:"var(--font-mono)",fontSize:".52rem",color:"var(--text-muted)",marginBottom:".15rem",textTransform:"uppercase"}}>{l}</div><div style={{fontFamily:"var(--font-mono)",fontSize:".82rem",fontWeight:800,color:c}}>{v}</div></div>
            ))}
          </div>
          <div><label className="fl">Notas</label><input className="inp" value={form.notas} onChange={e=>upd("notas",e.target.value)} placeholder="Observaciones opcionales…" /></div>
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={()=>valido&&onSave(form)} disabled={!valido} style={{opacity:valido?1:.5}}>{esEdit?"Guardar cambios":"Crear pedido"}</button></div>
      </div>
    </div>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap');
  .ph{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1.25rem;flex-wrap:wrap}
  .pt{font-size:1.3rem;font-weight:800}.pd{font-family:var(--font-mono);font-size:.62rem;color:var(--text-muted);margin-top:.25rem}
  .fr{display:flex;align-items:center;flex-wrap:wrap}.g1{gap:.5rem}.mt1{margin-top:.5rem}
  .fl{font-size:.72rem;font-weight:600;margin-bottom:.3rem;display:block;color:var(--text-muted)}
  .cam-row{display:flex;align-items:center;justify-content:space-between;gap:.75rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:.75rem 1rem;cursor:pointer;transition:all .15s;margin-bottom:.4rem}
  .cam-row:hover{border-color:var(--border-light);box-shadow:0 2px 8px rgba(0,0,0,.2)}
  @media(max-width:640px){.ph{flex-direction:column;gap:.75rem}}
`;
