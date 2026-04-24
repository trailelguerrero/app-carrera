import { useState, useMemo } from "react";
import { useModalClose } from "@/hooks/useModalClose";
import { useData } from "@/lib/dataService";
import { genIdNum, fmtEur2, fmtNum2, scrollMainToTop } from "@/lib/utils";
import { EVENT_CONFIG_DEFAULT, LS_KEY_CONFIG } from "@/constants/eventConfig";
import { BLOCK_CSS, blockCls as cls } from "@/lib/blockStyles";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const LS    = "teg_camisetas_v1";

const TALLAS       = ["XXS","XS","S","M","L","XL","XXL","3XL","4XL"];
const TALLAS_NINO  = ["4-6","6-8","8-10","10-12"];
const TIPOS  = ["corredor","voluntario","nino"];
const TC = {
  corredor:   { label:"Corredor",   icon:"🏃",  color:"var(--cyan)",   dim:"var(--cyan-dim)"   },
  voluntario: { label:"Voluntario", icon:"👥",  color:"var(--violet)", dim:"var(--violet-dim)" },
  nino:       { label:"Niño/a",     icon:"👶",  color:"var(--green)",  dim:"var(--green-dim)"  },
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
const COSTE_DEFAULT = { corredor:8, voluntario:7, nino:6 };

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

// Default tallas niño: entrada manual por talla
const NINO_DEFAULT = Object.fromEntries(TALLAS_NINO.map(t => [t, 0]));

const FUENTES_DEFAULT = {
  corredoresPlat: true,
  extrasCorredor: true,
  voluntariosAuto: true,
  extrasVoluntario: true,
  ninoManual: true,
  extrasNino: true,
};

export default function App() {
  const [eventCfg] = useData(LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT);
  const config = { ...EVENT_CONFIG_DEFAULT, ...(eventCfg || {}) };
  const [tab,setTab] = useState("dashboard");
  const [rawP,setPedidos] = useData(LS+"_pedidos", PEDIDOS_DEFAULT);
  const pedidos = Array.isArray(rawP) ? rawP : [];
  const [coste,setCoste] = useData(LS+"_coste", COSTE_DEFAULT);
  const [fechaPedido, setFechaPedido] = useData(LS+"_fecha_pedido", "");
  const [estadoPedido, setEstadoPedido] = useData(LS+"_estado_pedido", "pendiente");
  const [modal,setModal] = useState(null);
  const [ficha,setFicha] = useState(null);
  const [delId,setDelId] = useState(null);

  // ─── Fuentes externas para Tab Tallas ───────────────────────────────────────
  // Tallas de corredores: entrada manual desde plataforma externa (total por talla)
  const [rawCorredores, setCorredores] = useData(LS+"_corredores", CORREDORES_DEFAULT);
  const corredoresExt = (rawCorredores && typeof rawCorredores === 'object' && !Array.isArray(rawCorredores))
    ? { ...CORREDORES_DEFAULT, ...rawCorredores }
    : CORREDORES_DEFAULT;

  // Tallas de niño: entrada manual por talla
  const [rawNino, setNino] = useData(LS+"_nino", NINO_DEFAULT);
  const ninoExt = (rawNino && typeof rawNino === 'object' && !Array.isArray(rawNino))
    ? { ...NINO_DEFAULT, ...rawNino }
    : NINO_DEFAULT;

  // Precio manual de la camiseta corredor en plataforma externa
  const [precioPlatExt, setPrecioPlatExt] = useData(LS+"_precio_plataforma", { precio: 15 });
  const precioCorrExt = (precioPlatExt?.precio ?? 15);

  // Tallas de voluntarios: lectura automática (solo confirmados/pendientes, excluye cancelados)
  const [rawVols] = useData("teg_voluntarios_v1_voluntarios", []);
  const voluntariosConfirmados = Array.isArray(rawVols)
    ? rawVols.filter(vol => vol?.estado === "confirmado" && vol?.talla)
    : [];
  const voluntariosPendientes = Array.isArray(rawVols)
    ? rawVols.filter(vol => vol?.estado === "pendiente" && vol?.talla)
    : [];
  // Para el pedido al proveedor usamos confirmados + pendientes (excluye cancelados)
  const [inclPendientes, setInclPendientes] = useData(LS+"_incluir_pendientes", false);
  const [margenSeguridad, setMargenSeguridad] = useData(LS+"_margen_seguridad", 5);
  // voluntariosActivos respeta el toggle del organizador
  const voluntariosActivos = inclPendientes
    ? [...voluntariosConfirmados, ...voluntariosPendientes]
    : [...voluntariosConfirmados];

  const [fuentesActivas, setFuentesActivas] = useData(LS + "_fuentes", FUENTES_DEFAULT);

  const scrollTop   = () => { scrollMainToTop(); };
  const abrirFicha  = (p) => { scrollMainToTop(); setFicha(p); };
  const abrirModal  = (pd) => { scrollMainToTop(); setModal({data:pd||null}); };
  const abrirEditar = (p) => { scrollMainToTop(); setFicha(null); setModal({data:p}); };

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
    // 1. Unidades por fuente
    const uCorExt  = fuentesActivas.corredoresPlat  ? TALLAS.reduce((s,t)      => s + (corredoresExt[t]||0), 0) : 0;
    const uNinoExt = fuentesActivas.ninoManual       ? TALLAS_NINO.reduce((s,t) => s + (ninoExt[t]||0),      0) : 0;
    const uVolAuto = fuentesActivas.voluntariosAuto ? voluntariosActivos.length : 0;
    
    const extrasLineas = pedidos.flatMap(p => p.lineas);
    const uExtrasCor  = fuentesActivas.extrasCorredor   ? extrasLineas.filter(l => l.tipo === "corredor").reduce((s,l)   => s + l.cantidad, 0) : 0;
    const uExtrasVol  = fuentesActivas.extrasVoluntario  ? extrasLineas.filter(l => l.tipo === "voluntario").reduce((s,l) => s + l.cantidad, 0) : 0;
    const uExtrasNino = fuentesActivas.extrasNino        ? extrasLineas.filter(l => l.tipo === "nino").reduce((s,l)       => s + l.cantidad, 0) : 0;

    const totalUnidades = uCorExt + uVolAuto + uExtrasCor + uExtrasVol + uNinoExt + uExtrasNino;

    // 2. Ingresos por fuente
    const iCorExt = uCorExt * precioCorrExt; // Ingreso proyectado plataforma
    
    // Ingresos de extras (solo pagados para "Ingreso Real", todos para "Proyectado")
    const extrasPagados = extrasLineas.filter(l => l.estadoPago === "pagado" && (
      (l.tipo === "corredor" && fuentesActivas.extrasCorredor) || 
      (l.tipo === "voluntario" && fuentesActivas.extrasVoluntario)
    ));
    const iExtrasReal = extrasPagados.reduce((s,l) => s + l.cantidad * (l.precioVenta || 0), 0);
    
    const extrasProyectados = extrasLineas.filter(l => (l.estadoPago === "pagado" || l.estadoPago === "pendiente") && (
      (l.tipo === "corredor" && fuentesActivas.extrasCorredor) || 
      (l.tipo === "voluntario" && fuentesActivas.extrasVoluntario)
    ));
    const iExtrasProyectado = extrasProyectados.reduce((s,l) => s + l.cantidad * (l.precioVenta || 0), 0);

    const totalIngresosReal = (fuentesActivas.corredoresPlat ? iCorExt : 0) + iExtrasReal;
    const totalIngresosProyectado = (fuentesActivas.corredoresPlat ? iCorExt : 0) + iExtrasProyectado;

    // 3. Gastos por fuente
    const gCorExt  = uCorExt  * (coste.corredor   || 0);
    const gNinoExt = uNinoExt * (coste.nino       || 0);
    const gVolAuto = uVolAuto * (coste.voluntario || 0);
    const gExtrasCor  = uExtrasCor  * (coste.corredor   || 0);
    const gExtrasVol  = uExtrasVol  * (coste.voluntario  || 0);
    const gExtrasNino = uExtrasNino * (coste.nino         || 0);

    const totalGastos = gCorExt + gVolAuto + gExtrasCor + gExtrasVol + gNinoExt + gExtrasNino;

    const beneficioNetoReal = totalIngresosReal - totalGastos;
    const beneficioNetoProyectado = totalIngresosProyectado - totalGastos;

    // 5. Coste de regalos (específico para transparencia)
    const gRegalos = extrasLineas.filter(l => l.estadoPago === "regalo" && (
      (l.tipo === "corredor" && fuentesActivas.extrasCorredor) || 
      (l.tipo === "voluntario" && fuentesActivas.extrasVoluntario)
    )).reduce((s,l) => s + l.cantidad * (coste[l.tipo] || 0), 0);

    // Métricas auxiliares para KPIs antiguos
    const cPendCobro = extrasLineas.filter(l => l.estadoPago === "pendiente" && (
      (l.tipo === "corredor" && fuentesActivas.extrasCorredor) || 
      (l.tipo === "voluntario" && fuentesActivas.extrasVoluntario)
    )).reduce((s,l) => s + l.cantidad * (l.precioVenta || 0), 0);

    return {
      totalUnidades,
      totalIngresosReal,
      totalIngresosProyectado,
      totalGastos,
      beneficioNetoReal,
      beneficioNetoProyectado,
      uCorExt, uVolAuto, uExtrasCor, uExtrasVol, uNinoExt, uExtrasNino,
      iCorExt, iExtrasReal, iExtrasProyectado,
      gRegalos,
      cPendCobro,
      totalPedidosExtras: pedidos.length,
      pendEnt: extrasLineas.filter(l => l.estadoEntrega === "pendiente").reduce((s,l) => s + l.cantidad, 0)
    };
  }, [pedidos, coste, corredoresExt, voluntariosActivos, precioCorrExt, fuentesActivas]);

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
            <div className="block-title-sub" style={{display:"flex",alignItems:"center",gap:".6rem",flexWrap:"wrap"}}>
              <span>{config.nombre} {config.edicion} · Pedidos externos</span>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block: "presupuesto" } }))}
                style={{ fontFamily:"var(--font-mono)", fontSize:".55rem", padding:".12rem .4rem",
                  borderRadius:4, border:"1px solid rgba(251,191,36,.3)",
                  background:"rgba(251,191,36,.1)", color:"var(--amber)", cursor:"pointer" }}>
                💰 Ver en presupuesto →
              </button>
            </div>
          </div>
          <div className="block-actions">
            {stats.cPendCobro>0 && <span className="badge badge-amber">⏳ {fmtEur2(stats.cPendCobro)} pendiente</span>}
            {stats.pendEnt  >0 && <span className="badge badge-cyan">📦 {stats.pendEnt} ud por entregar</span>}
            <button className="btn btn-primary" onClick={()=>abrirModal(null)}>+ Nuevo pedido</button>
          </div>
        </div>
        <div className="tabs">
          {TABS.map(t=>(<button key={t.id} className={cls("tab-btn",tab===t.id&&"active")} onClick={()=>setTab(t.id)}>{t.icon} {t.label}</button>))}
        </div>
        <div key={tab}>
          {tab==="dashboard" && <TabDashboard stats={stats} pedidos={pedidos} coste={coste} setCoste={setCoste} setTab={setTab} abrirFicha={abrirFicha}
            fechaPedido={fechaPedido} setFechaPedido={setFechaPedido}
            estadoPedido={estadoPedido} setEstadoPedido={setEstadoPedido}
            precioCorrExt={precioCorrExt} setPrecioCorrExt={(v) => setPrecioPlatExt({ precio: v })}
            fuentesActivas={fuentesActivas} setFuentesActivas={setFuentesActivas}
            corredoresExt={corredoresExt} voluntariosActivos={voluntariosActivos}
            voluntariosConfirmados={voluntariosConfirmados} voluntariosPendientes={voluntariosPendientes}
            ninoExt={ninoExt} />}
          {tab==="pedidos"   && <TabPedidos   pedidos={pedidos} coste={coste} abrirFicha={abrirFicha} abrirModal={abrirModal} />}
          {tab==="tallas"    && <TabTallas    pedidos={pedidos} corredoresExt={corredoresExt} setCorredores={setCorredores} voluntariosActivos={voluntariosActivos} fuentesActivas={fuentesActivas}
            voluntariosConfirmados={voluntariosConfirmados} voluntariosPendientes={voluntariosPendientes}
            inclPendientes={inclPendientes} setInclPendientes={setInclPendientes}
            ninoExt={ninoExt} setNino={setNino} />}
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
function TabDashboard({ stats, pedidos, coste, setCoste, setTab, abrirFicha, precioCorrExt, setPrecioCorrExt, fuentesActivas, setFuentesActivas, ninoExt = {} }) {
  const [editCoste,setEditCoste] = useState(false);
  const [tmpCoste, setTmpCoste]  = useState({...coste});
  const [editPrecioPlat, setEditPrecioPlat] = useState(false);
  const [tmpPrecioPlat, setTmpPrecioPlat] = useState(precioCorrExt ?? 15);

  const toggleFuente = (f) => setFuentesActivas(p => ({ ...p, [f]: !p[f] }));

  return (
    <>
      {/* ── BALANCE ECONÓMICO CONSOLIDADO (Expert view) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
        
        {/* Card Principal de Beneficio */}
        <div className="card" style={{ background: "linear-gradient(135deg, var(--surface) 0%, var(--surface2) 100%)", borderLeft: "4px solid var(--green)", padding: "1.25rem", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -10, right: -10, fontSize: "4rem", opacity: 0.05 }}>💰</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: ".65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".1em" }}>Beneficio Neto Proyectado</div>
              <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--green)", marginTop: ".25rem" }}>{fmtEur2(stats.beneficioNetoProyectado)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: ".65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Realizado</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: stats.beneficioNetoReal >= 0 ? "var(--text)" : "var(--red)" }}>{fmtEur2(stats.beneficioNetoReal)}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "1.5rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: ".55rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Ingresos Totales</div>
              <div style={{ fontSize: ".9rem", fontWeight: 700, color: "var(--cyan)" }}>{fmtEur2(stats.totalIngresosProyectado)}</div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: ".55rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Gastos Fabricación</div>
              <div style={{ fontSize: ".9rem", fontWeight: 700, color: "var(--amber)" }}>{fmtEur2(stats.totalGastos)}</div>
              {stats.gRegalos > 0 && <div style={{ fontSize: ".55rem", color: "var(--violet)", fontWeight: 600 }}>inc. {fmtEur2(stats.gRegalos)} en regalos</div>}
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: ".55rem", color: "var(--text-dim)", textTransform: "uppercase" }}>ROI</div>
              <div style={{ fontSize: ".9rem", fontWeight: 700, color: "var(--violet)" }}>{stats.totalGastos > 0 ? Math.round((stats.beneficioNetoProyectado / stats.totalGastos) * 100) : 0}%</div>
            </div>
          </div>
        </div>

        {/* Panel de Control de Fuentes */}
        <div className="card" style={{ padding: "1rem" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: ".65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: ".75rem", display: "flex", alignItems: "center", gap: ".5rem" }}>
            ⚙️ Control de Fuentes de Datos
            <Tooltip text="Activa o desactiva fuentes para ver cómo impactan en el balance económico."><TooltipIcon /></Tooltip>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
            {[
              { id: "corredoresPlat",  label: "Inscritos Plataforma", icon: "🏃", sub: `${stats.uCorExt} ud`, color: "var(--cyan)" },
              { id: "extrasCorredor",  label: "Extras Corredor",     icon: "👕", sub: `${stats.uExtrasCor} ud`, color: "var(--cyan)" },
              { id: "voluntariosAuto", label: "Voluntarios (Gasto)", icon: "👥", sub: `${stats.uVolAuto} ud`, color: "var(--violet)" },
              { id: "extrasVoluntario", label: "Extras Voluntario",   icon: "🛍️", sub: `${stats.uExtrasVol} ud`, color: "var(--violet)" },
            ].map(f => (
              <div key={f.id} className="flex-between" style={{ padding: ".4rem .65rem", background: "var(--surface2)", borderRadius: 8, border: `1px solid ${fuentesActivas[f.id] ? f.color + "44" : "transparent"}`, transition: "all .15s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
                  <span style={{ fontSize: "1.1rem", opacity: fuentesActivas[f.id] ? 1 : 0.3 }}>{f.icon}</span>
                  <div>
                    <div style={{ fontSize: ".72rem", fontWeight: 700, color: fuentesActivas[f.id] ? "var(--text)" : "var(--text-dim)" }}>{f.label}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: ".55rem", color: "var(--text-muted)" }}>{f.sub}</div>
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
        <div className="kpi cyan" style={{cursor:"pointer"}} onClick={() => setTab("pedidos")}>
          <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>👕 Pedidos extras<Tooltip text={"Cantidad de pedidos ingresados manualmente para solicitantes extra."}><TooltipIcon size={11}/></Tooltip></div>
          <div className="kpi-value">{stats.totalPedidosExtras}</div>
          <div className="kpi-sub">{stats.totalPedidosExtras===0?"sin pedidos manuales":"pedidos manuales"}</div>
        </div>
        <div className={`kpi ${stats.cPendCobro > 0 ? "amber" : "green"}`} style={{cursor:"pointer"}} onClick={() => setTab("pedidos")}>
          <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>⏳ Pendiente cobro<Tooltip text={"Importe total de pedidos manuales que aún no han sido cobrados."}><TooltipIcon size={11}/></Tooltip></div>
          <div className="kpi-value">{fmtEur2(stats.cPendCobro)}</div>
          <div className="kpi-sub">{stats.cPendCobro > 0 ? "por cobrar" : "todo cobrado ✓"}</div>
        </div>
        <div className={`kpi ${stats.pendEnt > 0 ? "cyan" : "green"}`} style={{cursor:"pointer"}} onClick={() => setTab("checklist")}>
          <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>📦 Por entregar<Tooltip text={"Cantidad de unidades correspondientes a pedidos extra que siguen pendientes de entrega."}><TooltipIcon size={11}/></Tooltip></div>
          <div className="kpi-value">{stats.pendEnt}</div>
          <div className="kpi-sub">{stats.pendEnt > 0 ? "unidades pendientes" : "todo entregado ✓"}</div>
        </div>
        <div className="kpi cyan" style={{cursor:"pointer"}} onClick={() => setTab("tallas")}>
          <div className="kpi-label" style={{display:"flex",alignItems:"center",gap:4}}>🔢 Total unidades<Tooltip text={"Suma total de unidades calculadas de todas las fuentes activas."}><TooltipIcon size={11}/></Tooltip></div>
          <div className="kpi-value">{stats.totalUnidades}</div>
          <div className="kpi-sub">🏃 {stats.uCorExt + stats.uExtrasCor} cor · 👥 {stats.uVolAuto + stats.uExtrasVol} vol</div>
        </div>
      </div>

      {/* ── Configuración ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem", marginBottom: ".85rem" }}>
        <div className="card" style={{ borderLeft: "3px solid var(--primary)" }}>
          <div className="flex-between">
            <div>
              <div style={{ fontWeight: 700, fontSize: ".85rem", marginBottom: ".15rem" }}>
                <Tooltip text="Coste unitario de fabricación."><span style={{ color: "var(--primary)" }}>⚙️ Coste producción</span><TooltipIcon /></Tooltip>
              </div>
            </div>
            {editCoste ? (
              <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
                {["corredor","voluntario","nino"].map(tipo => (
                  <input key={tipo} type="number" min="0" step="0.5" value={tmpCoste[tipo]} onChange={e => setTmpCoste(p => ({ ...p, [tipo]: parseFloat(e.target.value) || 0 }))} style={{ width: 50, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 4, padding: ".2rem", fontSize: ".7rem" }} />
                ))}
                <button className="btn btn-primary btn-sm" onClick={() => { setCoste(tmpCoste); setEditCoste(false); }}>OK</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: ".6rem" }}>
{["corredor","voluntario","nino"].map(tipo => <span key={tipo} className="mono xs">{TC[tipo].icon} {fmtNum2(coste[tipo])}€</span>)}
                <button className="btn btn-ghost btn-sm" onClick={() => setEditCoste(true)}>✏️</button>
              </div>
            )}
          </div>
        </div>
        <div className="card" style={{ borderLeft: "3px solid var(--cyan)" }}>
          <div className="flex-between">
            <div>
              <div style={{ fontWeight: 700, fontSize: ".85rem", marginBottom: ".15rem" }}>
                <Tooltip text="Precio de venta en plataforma externa."><span style={{ color: "var(--cyan)" }}>🏃 Precio plataforma</span><TooltipIcon /></Tooltip>
              </div>
            </div>
            {editPrecioPlat ? (
              <div style={{ display: "flex", gap: ".5rem" }}>
                <input type="number" min="0" step="0.5" value={tmpPrecioPlat} onChange={e => setTmpPrecioPlat(parseFloat(e.target.value))} style={{ width: 60, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--cyan)", borderRadius: 4, padding: ".2rem", fontSize: ".7rem" }} />
                <button className="btn btn-primary btn-sm" onClick={() => { setPrecioCorrExt(tmpPrecioPlat); setEditPrecioPlat(false); }}>OK</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: ".6rem", alignItems: "center" }}>
                <span className="mono">{fmtNum2(precioCorrExt)}€</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditPrecioPlat(true)}>✏️</button>
              </div>
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
            <span style={{ fontFamily:"var(--font-mono)", fontSize:".72rem",
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
                style={{ fontSize:".6rem" }}
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
                      <div style={{ fontSize:".78rem", fontWeight:700,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {p.nombre}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:".35rem", flexShrink:0 }}>
                      {pendCobro > 0 && (
                        <span style={{ fontFamily:"var(--font-mono)", fontSize:".6rem",
                          fontWeight:700, color:"var(--amber)",
                          background:"var(--amber-dim)",
                          border:"1px solid rgba(251,191,36,.25)",
                          borderRadius:3, padding:".1rem .4rem" }}>
                          ⏳ {fmtEur2(pendCobro)}
                        </span>
                      )}
                      {pendEnt > 0 && (
                        <span style={{ fontFamily:"var(--font-mono)", fontSize:".6rem",
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
  const [pedGrupos, setPedGrupos] = useState({ pendiente:true, preparado:true, entregado:true, cancelado:true }); // todos colapsados por defecto
  const filtrados = useMemo(()=>{
    let list = pedidos.filter(p=>{
      const q  = bus.toLowerCase();
      const mQ = !q||p.nombre.toLowerCase().includes(q)||(p.telefono||"").includes(q)||(p.email||"").toLowerCase().includes(q);
      const mP = fPago==="todos"||p.lineas.some(l=>(l.estadoPago||"pendiente")===fPago);
      const mE = fEnt==="todos" ||p.lineas.some(l=>(l.estadoEntrega||"pendiente")===fEnt);
      return mQ&&mP&&mE;
    });
    if (alfa) list=[...list].sort((sa,sb)=>sa.nombre.localeCompare(sb.nombre,"es"));
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
            {ESTADOS_PAGO.map(ep=><option key={ep} value={ep}>{EP[ep].icon} {EP[ep].label}</option>)}
          </select>
          <select className="inp" value={fEnt} onChange={e=>setFEnt(e.target.value)} style={{width:"auto"}}>
            <option value="todos">Entrega: todos</option>
            {ESTADOS_ENTREGA.map(ee=><option key={ee} value={ee}>{EE[ee].icon} {EE[ee].label}</option>)}
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
              return Object.entries(counts).sort((sa,sb)=>sb[1]-sa[1])[0]?.[0]===estado;
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
                        <span className="mono xs muted">{totalUnid} ud · {fmtEur2(totalVenta)}</span>
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
        /* Vista lista agrupada por estado de pago */
        <div style={{display:"flex",flexDirection:"column",gap:".6rem"}}>
          {ESTADOS_PAGO.map(estado => {
            const cfg = EP[estado];
            const items = filtrados.filter(p => {
              const counts = {};
              p.lineas.forEach(l=>{counts[l.estadoPago||"pendiente"]=(counts[l.estadoPago||"pendiente"]||0)+l.cantidad;});
              return Object.entries(counts).sort((sa,sb)=>sb[1]-sa[1])[0]?.[0]===estado;
            });
            if (!items.length) return null;
            const collapsed = pedGrupos[estado];
            return (
              <div key={estado} style={{borderRadius:10,overflow:"hidden",
                border:`1px solid ${cfg.color}33`}}>
                <button
                  onClick={()=>setPedGrupos(p=>({...p,[estado]:!p[estado]}))}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:".65rem",
                    padding:".55rem .85rem",background:`${cfg.color}08`,
                    border:"none",cursor:"pointer",textAlign:"left",
                    borderBottom:collapsed?"none":`1px solid ${cfg.color}1a`}}>
                  <span style={{fontSize:".85rem"}}>{cfg.icon}</span>
                  <span style={{fontFamily:"var(--font-mono)",fontWeight:700,fontSize:".72rem",
                    color:cfg.color,flex:1}}>{cfg.label}</span>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:".62rem",
                    color:"var(--text-dim)",padding:".1rem .4rem",borderRadius:20,
                    background:"rgba(255,255,255,.05)"}}>{items.length}</span>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:".65rem",color:"var(--text-dim)",
                    transform:collapsed?"rotate(-90deg)":"rotate(0deg)",transition:"transform .18s"}}>▼</span>
                </button>
                {!collapsed && (
                  <div style={{display:"flex",flexDirection:"column",
                    background:"var(--surface)"}}>
                    {items.map((p,idx)=>{
                      const {totalVenta}=calcPedido(p,coste); const bp=badgePago(p); const be=badgeEnt(p);
                      return (
                        <div key={p.id} className="cam-row"
                          style={{borderBottom:idx<items.length-1?"1px solid var(--border)":"none",
                            borderRadius:0}}
                          onClick={()=>abrirFicha(p)}>
                          <div style={{display:"flex",alignItems:"center",gap:".6rem",flex:1,minWidth:0}}>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontWeight:700,fontSize:".88rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nombre}</div>
                              <div style={{display:"flex",gap:".3rem",flexWrap:"wrap",marginTop:".15rem"}}>
                                {p.lineas.map((l,i)=>(
                                  <span key={i} style={{fontFamily:"var(--font-mono)",fontSize:".6rem",padding:".08rem .35rem",borderRadius:3,background:TC[l.tipo]?.dim,color:TC[l.tipo]?.color,display:"flex",alignItems:"center",gap:".2rem"}}>
                                    {TC[l.tipo]?.icon} {l.talla}×{l.cantidad} {EE[l.estadoEntrega||"pendiente"]?.icon}
                                  </span>
                                ))}
                              </div>
                              {p.notas&&<div className="mono xs muted" style={{marginTop:".1rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.notas}</div>}
                            </div>
                          </div>
                          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:".3rem",flexShrink:0}}>
                            <div style={{fontFamily:"var(--font-mono)",fontSize:".88rem",fontWeight:800}}>{fmtEur2(totalVenta)}</div>
                            <span className="badge" style={{background:be.bg,color:be.color,fontSize:".52rem"}}>{be.icon}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── TAB TALLAS ───────────────────────────────────────────────────────────────
function TabTallas({ pedidos, corredoresExt, setCorredores, voluntariosActivos, fuentesActivas, voluntariosConfirmados, voluntariosPendientes, ninoExt = {}, setNino }) {
  const [editCorredores, setEditCorredores] = useState(false);
  const [tmpCor, setTmpCor] = useState({ ...corredoresExt });
  const [editNino, setEditNino] = useState(false);
  const [secColapsadas, setSecCol] = useState({ corredor:true, voluntario:true, nino:true, tabla:true, fuentes:true }); // todas colapsadas por defecto
  const toggleSec = (k) => setSecCol(p => ({...p,[k]:!p[k]}));
  const [tmpNino, setTmpNino] = useState({ ...ninoExt });

  // Al abrir edición, sincronizar el estado temporal
  const abrirEdicion     = () => { setTmpCor({ ...corredoresExt }); setEditCorredores(true); };
  const guardarCorredores = () => { setCorredores({ ...tmpCor }); setEditCorredores(false); };
  const abrirEdicionNino  = () => { setTmpNino({ ...ninoExt }); setEditNino(true); };
  const guardarNino       = () => { setNino && setNino({ ...tmpNino }); setEditNino(false); };

  // Tallas de EXTRAS (pedidos manuales) agrupadas por tipo/modelo de camiseta
  const tallasExtras = useMemo(() => {
    const map = {};
    TALLAS.forEach(t => { map[t] = {}; TIPOS.forEach(tp => { map[t][tp] = 0; }); });
    pedidos.forEach(p => p.lineas.forEach(l => {
      if (map[l.talla]) map[l.talla][l.tipo] = (map[l.talla][l.tipo] || 0) + l.cantidad;
    }));
    return map;
  }, [pedidos]);

  // Tallas de EXTRAS niño (pedidos manuales tipo "nino")
  const tallasExtrasNino = useMemo(() => {
    const map = {};
    TALLAS_NINO.forEach(t => { map[t] = 0; });
    pedidos.forEach(p => p.lineas.forEach(l => {
      if (l.tipo === "nino" && map[l.talla] !== undefined) map[l.talla] += l.cantidad;
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

  const grandTotalCor  = TALLAS.reduce((s, t)      => s + (totalCorredor[t]  || 0), 0);
  const grandTotalVol  = TALLAS.reduce((s, t)      => s + (totalVoluntario[t] || 0), 0);
  const grandTotalNino = TALLAS_NINO.reduce((s, t) => s + (ninoExt[t] || 0) + (tallasExtrasNino[t] || 0), 0);
  const grandTotal     = grandTotalCor + grandTotalVol + grandTotalNino;

  // Helper: cabecera de sección colapsable
  const ColSec = ({ id, icon, title, total, color, children, action }) => {
    const col = secColapsadas[id];
    return (
      <div style={{borderRadius:10,overflow:"hidden",border:`1px solid ${color}2a`,marginBottom:".85rem"}}>
        <button onClick={()=>toggleSec(id)}
          style={{width:"100%",display:"flex",alignItems:"center",gap:".65rem",
            padding:".6rem .9rem",background:`${color}09`,
            border:"none",cursor:"pointer",textAlign:"left",
            borderBottom:col?"none":`1px solid ${color}18`}}>
          <span style={{fontFamily:"var(--font-mono)",fontWeight:700,fontSize:".72rem",color,flex:1}}>
            {icon} {title}
          </span>
          {action && <span onClick={e=>e.stopPropagation()}>{action}</span>}
          <span style={{fontFamily:"var(--font-mono)",fontSize:".65rem",
            color:"var(--text-dim)",padding:".1rem .4rem",borderRadius:20,
            background:"rgba(255,255,255,.05)",flexShrink:0}}>{total} ud</span>
          <span style={{fontFamily:"var(--font-mono)",fontSize:".65rem",color:"var(--text-dim)",
            transform:col?"rotate(-90deg)":"rotate(0deg)",transition:"transform .18s",flexShrink:0}}>▼</span>
        </button>
        {!col && <div style={{padding:".75rem .9rem",background:"var(--surface)"}}>{children}</div>}
      </div>
    );
  };

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
          <div className="pd">{grandTotal} unidades totales · {grandTotalCor} corredor · {grandTotalVol} voluntario{grandTotalNino > 0 ? ` · ${grandTotalNino} niño/a` : ""}</div>
        </div>
      </div>

      {/* ── PANEL DE FUENTES — orientación antes de la tabla ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",
        gap:".5rem", marginBottom:".85rem" }}>
        {[
          { key:"corredoresPlat", icon:"🏃", label:"Corredores", sub:"Datos de corredores importados desde la plataforma de inscripción",
            color:TC.corredor.color, dim:TC.corredor.dim,
            total: fuentesActivas.corredoresPlat ? TALLAS.reduce((s,t)=>s+(corredoresExt[t]||0),0) : 0 },
          { key:"extrasCorredor", icon:"👕", label:"Extras corredor", sub:"Pedidos creados manualmente en esta app",
            color:TC.corredor.color, dim:TC.corredor.dim,
            total: fuentesActivas.extrasCorredor
              ? pedidos.filter(p=>p.lineas?.some(l=>l.tipo==="corredor")).reduce((s,p)=>s+p.lineas.filter(l=>l.tipo==="corredor").reduce((ss,l)=>ss+l.cantidad,0),0)
              : 0 },
          { key:"voluntariosAuto", icon:"👥", label:"Voluntarios", sub:"Voluntarios con talla asignada en el módulo de Voluntarios",
            color:TC.voluntario.color, dim:TC.voluntario.dim,
            total: fuentesActivas.voluntariosAuto ? voluntariosActivos.length : 0 },
          { key:"extrasVoluntario", icon:"👥+", label:"Extras voluntario", sub:"Pedidos manuales",
            color:TC.voluntario.color, dim:TC.voluntario.dim,
            total: fuentesActivas.extrasVoluntario
              ? pedidos.filter(p=>p.lineas?.some(l=>l.tipo==="voluntario")).reduce((s,p)=>s+p.lineas.filter(l=>l.tipo==="voluntario").reduce((ss,l)=>ss+l.cantidad,0),0)
              : 0 },
          { key:"ninoManual", icon:"👶", label:"Niño/a", sub:"Tallas introducidas manualmente por categoría",
            color:TC.nino.color, dim:TC.nino.dim,
            total: fuentesActivas.ninoManual ? TALLAS_NINO.reduce((s,t)=>s+(ninoExt[t]||0),0) : 0 },
          { key:"extrasNino", icon:"👶+", label:"Extras niño/a", sub:"Pedidos manuales",
            color:TC.nino.color, dim:TC.nino.dim,
            total: fuentesActivas.extrasNino
              ? pedidos.filter(p=>p.lineas?.some(l=>l.tipo==="nino")).reduce((s,p)=>s+p.lineas.filter(l=>l.tipo==="nino").reduce((ss,l)=>ss+l.cantidad,0),0)
              : 0 },
        ].map(f => (
          <div key={f.key} style={{
            padding:".55rem .75rem", borderRadius:8,
            background: fuentesActivas[f.key] ? f.dim : "var(--surface2)",
            border: `1px solid ${fuentesActivas[f.key] ? f.color+"33" : "var(--border)"}`,
            opacity: fuentesActivas[f.key] ? 1 : 0.5,
          }}>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:".58rem",
              color:"var(--text-muted)", marginBottom:".2rem" }}>
              {f.icon} {f.label}
              {!fuentesActivas[f.key] && <span style={{marginLeft:".35rem",color:"var(--red)"}}>🚫</span>}
            </div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:".6rem",
              color:"var(--text-dim)", marginBottom:".3rem" }}>{f.sub}</div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:"1rem",
              fontWeight:800, color: fuentesActivas[f.key] ? f.color : "var(--text-dim)" }}>
              {f.total}
            </div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:".58rem",
              color:"var(--text-muted)" }}>unidades</div>
          </div>
        ))}
      </div>

      {/* ── TABLA CONSOLIDADA: colapsable ── */}
      <div style={{borderRadius:10,overflow:"hidden",marginBottom:".85rem",
        border:"1px solid rgba(99,102,241,.25)"}}>
        <button onClick={()=>toggleSec("tabla")}
          style={{width:"100%",display:"flex",alignItems:"center",gap:".65rem",
            padding:".65rem .9rem",background:"rgba(99,102,241,.06)",
            border:"none",cursor:"pointer",textAlign:"left",
            borderBottom:secColapsadas.tabla?"none":"1px solid rgba(99,102,241,.15)"}}>
          <span style={{fontFamily:"var(--font-mono)",fontWeight:700,fontSize:".72rem",
            color:"var(--primary)",flex:1}}>📦 Pedido Total al Proveedor — desglose por fuente</span>
          <span style={{fontFamily:"var(--font-mono)",fontSize:".65rem",
            color:"var(--text-dim)",padding:".1rem .4rem",borderRadius:20,
            background:"rgba(255,255,255,.05)",flexShrink:0}}>{grandTotal} ud</span>
          <span style={{fontFamily:"var(--font-mono)",fontSize:".65rem",color:"var(--text-dim)",
            transform:secColapsadas.tabla?"rotate(-90deg)":"rotate(0deg)",
            transition:"transform .18s",flexShrink:0}}>▼</span>
        </button>
        {!secColapsadas.tabla && <div style={{padding:".75rem .9rem",background:"var(--surface)"}}>
        <div className="overflow-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>Talla</th>
                <th className="text-right" style={{ color: TC.corredor.color, fontSize: '.58rem', opacity: fuentesActivas.corredoresPlat ? 1 : 0.4 }}>🏃 Corredor<br/><span style={{opacity:.65}}>Plat. ext.</span> {!fuentesActivas.corredoresPlat && "🚫"}</th>
                <th className="text-right" style={{ color: TC.corredor.color, fontSize: '.58rem', opacity: fuentesActivas.extrasCorredor ? 1 : 0.4 }}>👕 Extras<br/><span style={{opacity:.65}}>Corredor</span> {!fuentesActivas.extrasCorredor && "🚫"}</th>
                <th className="text-right" style={{ color: TC.voluntario.color, fontSize: '.58rem', opacity: fuentesActivas.voluntariosAuto ? 1 : 0.4 }}>👥 Voluntarios<br/><span style={{opacity:.65}}>Automático</span> {!fuentesActivas.voluntariosAuto && "🚫"}</th>
                <th className="text-right" style={{ color: TC.voluntario.color, fontSize: '.58rem', opacity: fuentesActivas.extrasVoluntario ? 1 : 0.4 }}>👥 Extras<br/><span style={{opacity:.65}}>Voluntario</span> {!fuentesActivas.extrasVoluntario && "🚫"}</th>
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

        {/* ── SECCIÓN NIÑO/A — tallas propias ── */}
        {grandTotalNino > 0 || fuentesActivas.ninoManual || fuentesActivas.extrasNino ? (
          <div style={{ marginTop: '.85rem', borderTop: `2px solid ${TC.nino.color}33`,
            paddingTop: '.75rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '.62rem', fontWeight: 700,
              color: TC.nino.color, textTransform: 'uppercase', letterSpacing: '.08em',
              marginBottom: '.6rem' }}>
              👶 Niño/a — tallas especiales
            </div>
            <div className="overflow-x">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Talla</th>
                    <th className="text-right" style={{ color: TC.nino.color, fontSize: '.58rem', opacity: fuentesActivas.ninoManual ? 1 : 0.4 }}>
                      👶 Manual {!fuentesActivas.ninoManual && "🚫"}
                    </th>
                    <th className="text-right" style={{ color: TC.nino.color, fontSize: '.58rem', opacity: fuentesActivas.extrasNino ? 1 : 0.4 }}>
                      👶+ Extras {!fuentesActivas.extrasNino && "🚫"}
                    </th>
                    <th className="text-right" style={{ fontWeight: 800 }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {TALLAS_NINO.map(t => {
                    const manual = ninoExt[t] || 0;
                    const extras = tallasExtrasNino[t] || 0;
                    const tot    = manual + extras;
                    if (!tot) return null;
                    const cell = (v) => v > 0
                      ? <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700,
                          color: TC.nino.color, background: TC.nino.dim,
                          padding: '.1rem .4rem', borderRadius: 4 }}>{v}</span>
                      : <span style={{ color: 'var(--text-dim)' }}>—</span>;
                    return (
                      <tr key={t}>
                        <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{t}</td>
                        <td className="text-right">{cell(manual)}</td>
                        <td className="text-right">{cell(extras)}</td>
                        <td className="text-right">
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{tot}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>TOTAL</td>
                    <td className="text-right" style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: TC.nino.color }}>
                      {TALLAS_NINO.reduce((s,t)=>s+(ninoExt[t]||0),0)}
                    </td>
                    <td className="text-right" style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: TC.nino.color }}>
                      {TALLAS_NINO.reduce((s,t)=>s+(tallasExtrasNino[t]||0),0)}
                    </td>
                    <td className="text-right" style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '.95rem', color: TC.nino.color }}>
                      {grandTotalNino}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : null}
        </div>}
      </div>

      {/* ── DESGLOSE POR FUENTE — colapsable ── */}
      <div style={{borderRadius:10,overflow:"hidden",marginBottom:".85rem",
        border:"1px solid var(--border)"}}>
        <button onClick={()=>toggleSec("fuentes")}
          style={{width:"100%",display:"flex",alignItems:"center",gap:".65rem",
            padding:".6rem .9rem",background:"var(--surface2)",
            border:"none",cursor:"pointer",textAlign:"left",
            borderBottom:secColapsadas.fuentes?"none":"1px solid var(--border)"}}>
          <span style={{fontFamily:"var(--font-mono)",fontWeight:700,fontSize:".72rem",flex:1,
            display:"flex",alignItems:"center",gap:".5rem"}}>
            📋 Desglose por fuente
            <span style={{fontSize:".58rem",fontWeight:500,
              color:Object.values(fuentesActivas).filter(Boolean).length===6?"var(--green)":"var(--amber)",
              padding:".06rem .35rem",borderRadius:10,
              background:Object.values(fuentesActivas).filter(Boolean).length===6?"var(--green-dim)":"var(--amber-dim)"}}>
              {Object.values(fuentesActivas).filter(Boolean).length}/6 activas
            </span>
          </span>
          <span style={{fontFamily:"var(--font-mono)",fontSize:".65rem",color:"var(--text-dim)",
            transform:secColapsadas.fuentes?"rotate(-90deg)":"rotate(0deg)",
            transition:"transform .18s",flexShrink:0}}>▼</span>
        </button>
        {!secColapsadas.fuentes && <div style={{padding:".75rem .9rem",background:"var(--surface)"}}>
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
            subtitle={`${voluntariosConfirmados?.length || 0} confirmados · ${voluntariosPendientes?.length || 0} pendientes · sincronizado en tiempo real`}
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
        {/* ── FUENTE 3: Niño/a (manual por talla) ── */}
        <div className="card" style={{ borderLeft: `3px solid ${TC.nino.color}` }}>
          <SectionTitle
            icon="👶" title="Niño/a — manual"
            subtitle="Tallas 4-6, 6-8, 8-10, 10-12 — introduce los totales manualmente"
            color={TC.nino.color}
            action={
              !editNino
                ? <button className="btn btn-ghost btn-sm" onClick={abrirEdicionNino}>✏️ Editar</button>
                : <div style={{ display: 'flex', gap: '.35rem' }}>
                    <button className="btn btn-primary btn-sm" onClick={guardarNino}>✓ Guardar</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditNino(false)}>✕</button>
                  </div>
            }
          />
          {editNino ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '.4rem' }}>
              {TALLAS_NINO.map(t => (
                <label key={t} style={{ display: 'flex', flexDirection: 'column', gap: '.2rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.65rem', fontWeight: 700, color: TC.nino.color }}>{t}</span>
                  <input
                    type="number" min="0" value={tmpNino[t] || 0}
                    onChange={e => setTmpNino(p => ({ ...p, [t]: Math.max(0, parseInt(e.target.value) || 0) }))}
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)',
                      borderRadius: 'var(--r-sm)', padding: '.3rem .4rem', fontFamily: 'var(--font-mono)',
                      fontSize: '.78rem', textAlign: 'right', outline: 'none', width: '100%' }}
                  />
                </label>
              ))}
            </div>
          ) : (
            <>
              {TALLAS_NINO.filter(t => (ninoExt[t] || 0) > 0).length === 0
                ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: '.62rem', color: 'var(--text-dim)',
                    textAlign: 'center', padding: '1rem 0' }}>
                    Sin datos — haz clic en ✏️ Editar para introducir tallas
                  </div>
                : TALLAS_NINO.filter(t => (ninoExt[t] || 0) > 0).map(t => (
                  <TallaBar key={t} talla={t} valor={ninoExt[t]}
                    total={TALLAS_NINO.reduce((s, tt) => s + (ninoExt[tt] || 0), 0)}
                    color={TC.nino.color} />
                ))
              }
              {TALLAS_NINO.some(t => (tallasExtrasNino[t] || 0) > 0) && (
                <div style={{ marginTop: '.75rem', paddingTop: '.6rem', borderTop: '1px dashed var(--border)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '.58rem',
                    color: 'var(--text-muted)', marginBottom: '.4rem' }}>
                    + Extras niño/a (pedidos manuales):
                  </div>
                  {TALLAS_NINO.filter(t => (tallasExtrasNino[t] || 0) > 0).map(t => (
                    <TallaBar key={t} talla={t} valor={tallasExtrasNino[t]}
                      total={TALLAS_NINO.reduce((s, tt) => s + (tallasExtrasNino[tt] || 0), 0)}
                      color={TC.nino.color} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
        </div>}
      </div>
    </>
  );
}

// ─── TAB CHECKLIST ────────────────────────────────────────────────────────────
function TabChecklist({ pedidos, updateLinea, abrirFicha }) {
  const [filtro,setFiltro]   = useState("todos");
  const [pedColaps, setPedCo] = useState({}); // {} = todos colapsados (collapsed = !pedColaps[id])
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

      {/* Agrupado por pedido — cada pedido colapsable */}
      {filtradas.length > 0 && (() => {
        // Agrupar líneas filtradas por pedido
        const porPedido = [];
        const pedIdsSeen = new Set();
        filtradas.forEach(l => {
          if (!pedIdsSeen.has(l.pedId)) {
            pedIdsSeen.add(l.pedId);
            porPedido.push({
              ped: l.ped,
              lineas: filtradas.filter(x => x.pedId === l.pedId),
            });
          }
        });

        return (
          <div style={{display:"flex",flexDirection:"column",gap:".5rem"}}>
            {porPedido.map(({ ped, lineas }) => {
              const pendEnt = lineas.filter(l=>(l.estadoEntrega||"pendiente")==="pendiente").length;
              const pendPago = lineas.filter(l=>(l.estadoPago||"pendiente")==="pendiente" && l.estadoPago!=="regalo").length;
              const collapsed = !pedColaps[ped.id]; // por defecto colapsado (undefined=false→!false=true)
              const allEntregado = pendEnt === 0;

              return (
                <div key={ped.id} style={{borderRadius:10,overflow:"hidden",
                  border:`1px solid ${allEntregado?"var(--border)":"rgba(251,191,36,.2)"}`,
                  opacity: allEntregado ? .7 : 1}}>

                  {/* Cabecera del pedido */}
                  <button
                    onClick={()=>setPedCo(p=>({...p,[ped.id]:!p[ped.id]}))}
                    style={{width:"100%",display:"flex",alignItems:"center",gap:".6rem",
                      padding:".6rem .85rem",background:allEntregado?"var(--surface2)":"rgba(251,191,36,.05)",
                      border:"none",cursor:"pointer",textAlign:"left",
                      borderBottom:collapsed?"none":"1px solid var(--border)"}}>
                    <span style={{fontWeight:700,fontSize:".8rem",flex:1,minWidth:0,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                      textAlign:"left"}}>
                      {allEntregado ? "✅ " : "📦 "}{ped.nombre}
                    </span>
                    <div style={{display:"flex",gap:".3rem",flexShrink:0}}>
                      {pendEnt > 0 && (
                        <span style={{fontFamily:"var(--font-mono)",fontSize:".6rem",fontWeight:700,
                          padding:".1rem .4rem",borderRadius:20,
                          background:"rgba(251,191,36,.15)",color:"var(--amber)",
                          border:"1px solid rgba(251,191,36,.3)"}}>
                          {pendEnt} por entregar
                        </span>
                      )}
                      {pendPago > 0 && (
                        <span style={{fontFamily:"var(--font-mono)",fontSize:".6rem",fontWeight:700,
                          padding:".1rem .4rem",borderRadius:20,
                          background:"rgba(248,113,113,.12)",color:"var(--red)",
                          border:"1px solid rgba(248,113,113,.25)"}}>
                          {pendPago} sin cobrar
                        </span>
                      )}
                      <span style={{fontFamily:"var(--font-mono)",fontSize:".65rem",
                        color:"var(--text-dim)",
                        transform:collapsed?"rotate(-90deg)":"rotate(0deg)",
                        transition:"transform .18s"}}>▼</span>
                    </div>
                  </button>

                  {/* Líneas del pedido */}
                  {!collapsed && (
                    <div style={{background:"var(--surface)"}}>
                      {lineas.map((l,idx) => {
                        const tcfg=TC[l.tipo]; const ep=l.estadoPago||"pendiente";
                        const ee=l.estadoEntrega||"pendiente";
                        const epCfg=EP[ep]; const eeCfg=EE[ee];
                        return (
                          <div key={`${l.pedId}-${l.id}`}
                            style={{padding:".6rem .85rem",
                              borderBottom:idx<lineas.length-1?"1px solid var(--border)":"none",
                              borderLeft:`3px solid ${eeCfg.color}`,
                              display:"flex",justifyContent:"space-between",
                              alignItems:"center",gap:".75rem",flexWrap:"wrap"}}>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:"flex",alignItems:"center",gap:".5rem",flexWrap:"wrap"}}>
                                <span style={{fontFamily:"var(--font-mono)",fontSize:".7rem",
                                  padding:".1rem .4rem",borderRadius:4,
                                  background:tcfg?.dim,color:tcfg?.color,fontWeight:700}}>
                                  {tcfg?.icon} {tcfg?.label} — {l.talla} × {l.cantidad} ud
                                </span>
                                <span className="badge" style={{background:epCfg.bg,color:epCfg.color,fontSize:".55rem"}}>
                                  {epCfg.icon} {epCfg.label}
                                </span>
                              </div>
                            </div>
                            <div style={{display:"flex",gap:".35rem",flexShrink:0}}>
                              <button
                                onClick={()=>updateLinea(l.pedId,l.id,"estadoEntrega",ee==="entregado"?"pendiente":"entregado")}
                                style={{fontFamily:"var(--font-mono)",fontSize:".62rem",fontWeight:700,
                                  padding:".3rem .65rem",borderRadius:"var(--r-sm)",
                                  border:`1px solid ${eeCfg.color}44`,background:eeCfg.bg,
                                  color:eeCfg.color,cursor:"pointer",whiteSpace:"nowrap"}}>
                                {ee==="entregado"?"✔️ Entregado":"📦 Entregar"}
                              </button>
                              {ep!=="regalo" && (
                                <button
                                  onClick={()=>updateLinea(l.pedId,l.id,"estadoPago",ep==="pagado"?"pendiente":"pagado")}
                                  style={{fontFamily:"var(--font-mono)",fontSize:".62rem",fontWeight:700,
                                    padding:".3rem .65rem",borderRadius:"var(--r-sm)",
                                    border:`1px solid ${epCfg.color}44`,background:epCfg.bg,
                                    color:epCfg.color,cursor:"pointer",whiteSpace:"nowrap"}}>
                                  {ep==="pagado"?"✅ Pagado":"⏳ Cobrar"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}
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
      <div className="modal modal-ficha" style={{maxWidth:500}}>
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
                        <div style={{fontFamily:"var(--font-mono)",fontSize:".58rem",color:"var(--text-muted)"}}>{l.cantidad} ud · coste {fmtEur2(costeU)}/ud</div>
                      </div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontFamily:"var(--font-mono)",fontSize:".78rem",fontWeight:700,color:ep==="regalo"?"var(--violet)":cfg?.color}}>{ep==="regalo"?"🎁 Regalo":fmtEur2(subV)}</div>
                      {ep!=="regalo"&&<div style={{fontFamily:"var(--font-mono)",fontSize:".58rem",color:"var(--text-muted)"}}>{fmtEur2(l.precioVenta||0)}/ud</div>}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:".35rem"}} onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>updateLinea(p.id,l.id,"estadoPago",ep==="pagado"?"pendiente":"pagado")} disabled={ep==="regalo"} style={{fontFamily:"var(--font-mono)",fontSize:".58rem",fontWeight:700,padding:".2rem .5rem",borderRadius:4,border:`1px solid ${epCfg.color}44`,background:epCfg.bg,color:epCfg.color,cursor:ep==="regalo"?"default":"pointer",transition:"all .15s"}}>{epCfg.icon} {epCfg.label}</button>
                    <button onClick={()=>updateLinea(p.id,l.id,"estadoEntrega",ee==="entregado"?"pendiente":"entregado")} style={{fontFamily:"var(--font-mono)",fontSize:".58rem",fontWeight:700,padding:".2rem .5rem",borderRadius:4,border:`1px solid ${eeCfg.color}44`,background:eeCfg.bg,color:eeCfg.color,cursor:"pointer",transition:"all .15s"}}>{eeCfg.icon} {eeCfg.label}</button>
                    <span className="mono xs muted" style={{marginLeft:"auto",alignSelf:"center"}}>margen {fmtEur2((ep==="regalo"?-costeU:(l.precioVenta||0)-costeU)*l.cantidad)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{background:"var(--surface2)",borderRadius:8,padding:".6rem .75rem",display:"flex",justifyContent:"space-around",gap:".6rem",flexWrap:"wrap"}}>
            {[
              {l:"Coste total",    v:fmtEur2(totalCoste),   c:"var(--red)"},
              {l:"Venta total",    v:fmtEur2(totalVenta),   c:"var(--green)"},
              {l:"Ben. realizado", v:fmtEur2(benRealizado), c:benRealizado>=0?"var(--green)":"var(--red)"},
              {l:"Ben. potencial", v:fmtEur2(benPotencial), c:benPotencial>=0?"var(--cyan)":"var(--amber)"},
              {l:"Coste regalos",  v:fmtEur2(costeRegalos), c:"var(--violet)"},
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
  const { closing: mpedClosing, handleClose: mpedHandleClose } = useModalClose(onClose);
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
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  const valido = form.nombre.trim()&&form.lineas.length>0;
  return (
    <div className={`modal-backdrop${mpedClosing ? " modal-backdrop-closing" : ""}`} onClick={e=>e.target===e.currentTarget&&mpedHandleClose()}>
      <div className={`modal modal-ficha${mpedClosing ? " modal-closing" : ""}`} style={{maxWidth:540}}>
        <div className="modal-header"><span className="modal-title">{esEdit?"✏️ Editar pedido":"👕 Nuevo pedido de camiseta"}</span><button className="btn btn-ghost btn-sm" onClick={mpedHandleClose}>✕</button></div>
        <div className="modal-body" style={{gap:".75rem"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
            <div style={{gridColumn:"1/-1"}}>
              <label className="fl" style={{color:intentoGuardar&&!form.nombre.trim()?"var(--red)":undefined}}>Nombre *</label>
              <input className="inp" value={form.nombre}
                onChange={e=>{upd("nombre",e.target.value);setIntentoGuardar(false);}}
                placeholder="Nombre completo"
                style={{borderColor:intentoGuardar&&!form.nombre.trim()?"var(--red)":undefined}}/>
              {intentoGuardar&&!form.nombre.trim()&&(
                <div className="xs mono" style={{color:"var(--red)",marginTop:".2rem"}}>⚠ El nombre es obligatorio</div>
              )}
            </div>
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
                      <div><label className="fl">Tipo</label><select className="inp inp-sm" value={l.tipo} onChange={e=>{const newTipo=e.target.value;const defaultTalla=newTipo==="nino"?"4-6":"M";updL(i,"tipo",newTipo);updL(i,"talla",defaultTalla);}}>{TIPOS.map(t=><option key={t} value={t}>{TC[t].icon} {TC[t].label}</option>)}</select></div>
                      <div><label className="fl">Talla</label><select className="inp inp-sm" value={l.talla} onChange={e=>updL(i,"talla",e.target.value)}>{(l.tipo==="nino"?TALLAS_NINO:TALLAS).map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                      <div><label className="fl">Cant.</label><input type="number" min="1" className="inp inp-sm inp-mono" value={l.cantidad} onChange={e=>updL(i,"cantidad",Math.max(1,parseInt(e.target.value)||1))} /></div>
                      <div><label className="fl">€ Venta</label><input type="number" min="0" step="0.5" className="inp inp-sm inp-mono" value={l.precioVenta||0} onChange={e=>updL(i,"precioVenta",parseFloat(e.target.value)||0)} disabled={esR} style={{opacity:esR?.45:1}} /></div>
                      <button className="btn btn-red btn-sm" onClick={()=>delL(i)} disabled={form.lineas.length<=1} style={{marginBottom:1}}>✕</button>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".4rem",marginBottom:".35rem"}}>
                      <div><label className="fl">Estado de pago</label><select className="inp inp-sm" value={ep} onChange={e=>updL(i,"estadoPago",e.target.value)}>{ESTADOS_PAGO.map(s=><option key={s} value={s}>{EP[s].icon} {EP[s].label}</option>)}</select></div>
                      <div><label className="fl">Estado de entrega</label><select className="inp inp-sm" value={l.estadoEntrega||"pendiente"} onChange={e=>updL(i,"estadoEntrega",e.target.value)}>{ESTADOS_ENTREGA.map(s=><option key={s} value={s}>{EE[s].icon} {EE[s].label}</option>)}</select></div>
                    </div>
                    <div style={{fontFamily:"var(--font-mono)",fontSize:".58rem",color:"var(--text-muted)",display:"flex",gap:".75rem",flexWrap:"wrap"}}>
                      <span>Coste: {fmtEur2(subC)}</span><span>Venta: {esR?"🎁 Regalo":fmtEur2(subV)}</span>
                      <span style={{color:margen>=0?"var(--green)":"var(--red)"}}>Margen: {fmtEur2(margen)}</span>
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
              {l:"Total coste",      v:fmtEur2(totalCoste),      c:"var(--red)"},
              {l:"Total venta",      v:fmtEur2(totalVenta),      c:"var(--green)"},
              {l:"Ben. realizado",   v:fmtEur2(benRealizado),    c:benRealizado>=0?"var(--green)":"var(--red)"},
              {l:"Ben. potencial",   v:fmtEur2(benPotencial),    c:benPotencial>=0?"var(--cyan)":"var(--amber)"},
              {l:"Coste regalos",    v:fmtEur2(costeRegalos),    c:"var(--violet)"},
            ].map(({l,v,c})=>(
              <div key={l} style={{textAlign:"center"}}><div style={{fontFamily:"var(--font-mono)",fontSize:".52rem",color:"var(--text-muted)",marginBottom:".15rem",textTransform:"uppercase"}}>{l}</div><div style={{fontFamily:"var(--font-mono)",fontSize:".82rem",fontWeight:800,color:c}}>{v}</div></div>
            ))}
          </div>
          <div><label className="fl">Notas</label><input className="inp" value={form.notas} onChange={e=>upd("notas",e.target.value)} placeholder="Observaciones opcionales…" /></div>
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={mpedHandleClose}>Cancelar</button><button className="btn btn-primary" onClick={()=>{ if(valido) onSave(form); else setIntentoGuardar(true); }} style={{opacity:valido?1:.65}}>{esEdit?"Guardar cambios":"Crear pedido"}</button></div>
      </div>
    </div>
  );
}

const CSS = `
  .ph{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1.25rem;flex-wrap:wrap}
  .pt{font-size:1.5rem;font-weight:900;letter-spacing:-0.02em}.pd{font-family:var(--font-mono);font-size:.62rem;color:var(--text-muted);margin-top:.25rem}
  .fr{display:flex;align-items:center;flex-wrap:wrap}.g1{gap:.5rem}.mt1{margin-top:.5rem}
  .fl{font-size:.72rem;font-weight:600;margin-bottom:.3rem;display:block;color:var(--text-muted)}
  .cam-row{display:flex;align-items:center;justify-content:space-between;gap:.75rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:.75rem 1rem;cursor:pointer;transition:all .15s;margin-bottom:.4rem}
  .cam-row:hover{border-color:var(--border-light);box-shadow:0 2px 8px rgba(0,0,0,.2)}
  @media(max-width:640px){.ph{flex-direction:column;gap:.75rem}}
`;
