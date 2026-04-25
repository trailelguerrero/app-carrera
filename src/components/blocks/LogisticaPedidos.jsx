import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useModalClose } from "@/hooks/useModalClose";
import { toast } from "@/lib/toast";
import { genIdNum } from "@/lib/utils";
import { usePaginacion } from "@/lib/usePaginacion.jsx";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { BLOCK_CSS, blockCls as cls } from "@/lib/blockStyles";

// fmtEur se redefine localmente en este bloque (está en el bloque de pedidos)

// ─── TAB PEDIDOS A PROVEEDORES ────────────────────────────────────────────────
const ESTADOS_PEDIDO = [
  { id:"borrador",    label:"Borrador",    color:"var(--text-muted)", bg:"var(--surface2)" },
  { id:"confirmado",  label:"Confirmado",  color:"var(--cyan)",       bg:"var(--cyan-dim)" },
  { id:"recibido",    label:"Recibido",    color:"var(--green)",      bg:"var(--green-dim)" },
  { id:"facturado",   label:"Facturado",   color:"var(--violet)",     bg:"var(--violet-dim)" },
];
const ESTADOS_FACTURA = [
  { id:"pendiente", label:"Pendiente", color:"var(--amber)" },
  { id:"pagada",    label:"Pagada",    color:"var(--green)" },
];
const genPedidoId = (arr) => arr.length ? Math.max(...arr.map(x=>x.id||0))+1 : 1;
const fmtEur = (n) => new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",minimumFractionDigits:2}).format(n||0);

function TabPedidosProv({ pedidos, setPedidos, cont, material=[], conceptosPres=[], totalInscritos, inscritos }) {
  const [modal, setModal]   = useState(null); // null | "nuevo" | {pedido}
  const [delId, setDelId]   = useState(null);
  const [expanded, setExpanded] = useState(null);

  // Precio unitario de medalla: buscar PRIMERO en conceptos variables (€/corredor)
  // Un concepto fijo "Medallas Zamac" es el precio de compra al proveedor — diferente.
  const conceptoMedalla = conceptosPres.find(c =>
    /medalla/i.test(c.nombre) && c.tipo === "variable"
  ) || conceptosPres.find(c => /medalla/i.test(c.nombre));

  const precioMedalla = (() => {
    if (!conceptoMedalla) return 0;
    if (conceptoMedalla.tipo === "variable") {
      // Variable: usar costePorDistancia — ya es €/unidad
      return calcPrecioUnitario(conceptoMedalla, material).precio;
    }
    // Fijo: solo si hay material vinculado con stock > 0
    const { precio } = calcPrecioUnitario(conceptoMedalla, material);
    return precio; // será 0 si no hay vínculo de material
  })();

  // Trofeos: concepto fijo — precio unitario solo si hay material vinculado con stock
  const conceptoTrofeos = conceptosPres.find(c => /trofeo/i.test(c.nombre));
  const costeTrofeoUnit = conceptoTrofeos
    ? calcPrecioUnitario(conceptoTrofeos, material).precio
    : 0;
  // El coste total de trofeos para referencia en el panel
  const costeTrofeoTotal = conceptoTrofeos?.costeTotal || 0;

  // Dorsales: concepto variable (€/corredor)
  const conceptoDorsal = conceptosPres.find(c => /dorsal/i.test(c.nombre) && c.tipo === "variable");
  const precioDorsal = conceptoDorsal ? calcPrecioUnitario(conceptoDorsal, material).precio : 0;

  // Avituallamiento: buscar conceptos variables de avituallamiento (puede haber varios)
  const conceptosAvit = conceptosPres.filter(c =>
    /avituallamiento|avituall|nutrición|agua|gel|isotónico/i.test(c.nombre) && c.tipo === "variable"
  );
  const precioAvitTotal = conceptosAvit.reduce((s, c) => {
    const { precio } = calcPrecioUnitario(c, material);
    return s + precio;
  }, 0); // coste total por corredor sumando todos los avituallamientos

  // Proveedores del directorio de Emergencias
  const proveedores = (Array.isArray(cont) ? cont : []).filter(c => c.tipo === "proveedor");

  const totalPedidos = pedidos.length;
  const pendFactura  = pedidos.filter(p => p.estado === "recibido" && !p.factura?.numero).length;
  const totalComprometido = pedidos
    .filter(p => p.estado !== "borrador")
    .reduce((s,p) => s + (p.importeTotal||0), 0);

  // Detectar pedidos con artículos variables que difieren del precio actual
  const pedidosConPrecioDesactualizado = pedidos.filter(p =>
    (p.articulos||[]).some(a => {
      if (!a.conceptoId) return false;
      const c = conceptosPres.find(cc => cc.id === a.conceptoId);
      if (!c || c.tipo !== "variable") return false;
      const precioActual = calcPrecioUnitario(c, material).precio;
      return Math.abs((a.precioUnit||0) - precioActual) > 0.001;
    })
  );

  const actualizarPreciosVariables = () => {
    setPedidos(prev => prev.map(p => {
      const articulosActualizados = (p.articulos||[]).map(a => {
        if (!a.conceptoId) return a;
        const c = conceptosPres.find(cc => cc.id === a.conceptoId);
        if (!c || c.tipo !== "variable") return a;
        const precioActual = calcPrecioUnitario(c, material).precio;
        const nuevoTotal = a.esFijo ? (a.costeTotal||0) : a.cantidad * precioActual;
        return { ...a, precioUnit: precioActual };
      });
      // Recalcular importeTotal
      const nuevoImporte = articulosActualizados.reduce(
        (s,a) => s + (a.esFijo ? (a.costeTotal||0) : a.cantidad*(a.precioUnit||0)), 0
      );
      return { ...p, articulos: articulosActualizados, importeTotal: nuevoImporte };
    }));
  };

  const abrirNuevo = () => setModal("nuevo");
  const abrirEditar = (p) => setModal(p);
  const guardar = (p) => {
    if (p.id) setPedidos(prev => prev.map(x => x.id===p.id ? p : x));
    else setPedidos(prev => [...prev, { ...p, id: genPedidoId(prev) }]);
    setModal(null);
  };
  const eliminar = () => {
    setPedidos(prev => prev.filter(x => x.id !== delId));
    setDelId(null);
  };

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">🛒 Pedidos a Proveedores</div>
          <div className="pd">
            {totalPedidos} pedido{totalPedidos!==1?"s":""} ·{" "}
            {fmtEur(totalComprometido)} comprometido
            {pendFactura > 0 && <span style={{color:"var(--amber)",marginLeft:".5rem"}}>· ⚠ {pendFactura} sin factura</span>}
          </div>
        </div>
        <button className="btn btn-primary" onClick={abrirNuevo}>+ Nuevo pedido</button>
      </div>

      {/* Banner: precios variables desactualizados */}
      {pedidosConPrecioDesactualizado.length > 0 && (
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",
          gap:".75rem",padding:".6rem .85rem",borderRadius:8,marginBottom:".75rem",
          background:"rgba(251,191,36,.07)",border:"1px solid rgba(251,191,36,.25)",
          flexWrap:"wrap",
        }}>
          <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--amber)"}}>
            ⚡ {pedidosConPrecioDesactualizado.length} pedido{pedidosConPrecioDesactualizado.length>1?"s tienen":"  tiene"} artículos variables con precio desactualizado
            <span style={{color:"var(--text-muted)",marginLeft:".4rem"}}>
              (los inscritos han cambiado desde que se crearon)
            </span>
          </div>
          <button className="btn btn-sm"
            style={{background:"rgba(251,191,36,.15)",color:"var(--amber)",
              border:"1px solid rgba(251,191,36,.35)",fontFamily:"var(--font-mono)",
              fontSize:"var(--fs-xs)",flexShrink:0}}
            onClick={actualizarPreciosVariables}>
            🔄 Actualizar precios
          </button>
        </div>
      )}

      {/* ── Sugerencias automáticas ── */}
      <SugerenciasMedallas
        inscritos={inscritos}
        totalInscritos={totalInscritos}
        precioMedalla={precioMedalla}
        conceptoMedalla={conceptoMedalla}
        pedidos={pedidos}
        onCrear={(sugerido) => setModal(sugerido)}
      />
      {(conceptoDorsal || conceptosAvit.length > 0) && (
        <SugerenciasSimples
          inscritos={inscritos}
          totalInscritos={totalInscritos}
          conceptoDorsal={conceptoDorsal}
          precioDorsal={precioDorsal}
          conceptosAvit={conceptosAvit}
          precioAvitTotal={precioAvitTotal}
          pedidos={pedidos}
          onCrear={(sugerido) => setModal(sugerido)}
        />
      )}

      {/* ── Lista de pedidos ── */}
      {pedidos.length === 0 ? (
        <div className="card" style={{textAlign:"center",padding:"2.5rem 1rem",
          color:"var(--text-dim)",fontFamily:"var(--font-mono)",fontSize:"var(--fs-base)"}}>
          <div style={{fontSize:"var(--fs-xl)",marginBottom:".5rem",opacity:.35}}>🛒</div>
          Sin pedidos aún. Usa las sugerencias de arriba o crea uno manualmente.
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:".5rem"}}>
          {pedidos.map(p => {
            const est = ESTADOS_PEDIDO.find(e=>e.id===p.estado)||ESTADOS_PEDIDO[0];
            const isExp = expanded===p.id;
            const desvPct = p.importeEstimado && p.factura?.importe
              ? ((p.factura.importe - p.importeEstimado) / p.importeEstimado * 100)
              : null;
            return (
              <div key={p.id} className="card" style={{padding:0,overflow:"hidden"}}>
                {/* Cabecera clickable */}
                <div style={{display:"flex",alignItems:"center",gap:".6rem",
                  padding:".7rem .9rem",cursor:"pointer",
                  borderLeft:`3px solid ${est.color}`}}
                  onClick={()=>setExpanded(isExp?null:p.id)}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:"var(--fs-base)"}}>{p.nombre}</div>
                    <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                      color:"var(--text-muted)",marginTop:".1rem"}}>
                      {p.proveedor||"Sin proveedor"} · {p.articulos?.length||0} artículo{p.articulos?.length!==1?"s":""}
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontFamily:"var(--font-mono)",fontWeight:800,
                      fontSize:"var(--fs-base)",color:est.color}}>
                      {fmtEur(p.importeTotal||0)}
                    </div>
                    <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                      padding:".1rem .4rem",borderRadius:4,
                      background:est.bg,color:est.color,fontWeight:700}}>
                      {est.label}
                    </span>
                  </div>
                  <span style={{color:"var(--text-dim)",fontSize:"var(--fs-sm)",flexShrink:0}}>
                    {isExp?"▲":"▼"}
                  </span>
                </div>

                {/* Detalle expandible */}
                {isExp && (
                  <div style={{borderTop:"1px solid var(--border)",
                    padding:".75rem .9rem",display:"flex",flexDirection:"column",gap:".6rem"}}>

                    {/* Artículos */}
                    {(p.articulos||[]).length > 0 && (
                      <div>
                        <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                          color:"var(--text-muted)",textTransform:"uppercase",
                          letterSpacing:".06em",marginBottom:".35rem"}}>
                          Artículos
                        </div>
                        <table style={{width:"100%",borderCollapse:"collapse",
                          fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)"}}>
                          <thead>
                            <tr style={{borderBottom:"1px solid var(--border)"}}>
                              <th style={{textAlign:"left",padding:".2rem .4rem",
                                fontWeight:600,color:"var(--text-muted)"}}>Artículo</th>
                              <th style={{textAlign:"right",padding:".2rem .4rem",
                                fontWeight:600,color:"var(--text-muted)"}}>Cant.</th>
                              <th style={{textAlign:"right",padding:".2rem .4rem",
                                fontWeight:600,color:"var(--text-muted)"}}>€/ud</th>
                              <th style={{textAlign:"right",padding:".2rem .4rem",
                                fontWeight:600,color:"var(--text-muted)"}}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {p.articulos.map((a,i) => (
                              <tr key={i} style={{borderBottom:"1px solid rgba(255,255,255,.04)"}}>
                                <td style={{padding:".3rem .4rem"}}>{a.nombre}</td>
                                <td style={{textAlign:"right",padding:".3rem .4rem",
                                  fontWeight:700}}>{a.cantidad}</td>
                                <td style={{textAlign:"right",padding:".3rem .4rem",
                                  color:"var(--text-muted)"}}>
                                  {fmtEur(a.precioUnit)}
                                  {(() => {
                                    if (!a.conceptoId) return null;
                                    const c = conceptosPres.find(cc=>cc.id===a.conceptoId);
                                    if (!c || c.tipo!=="variable") return null;
                                    const actual = calcPrecioUnitario(c, material).precio;
                                    if (Math.abs((a.precioUnit||0)-actual) < 0.001) return null;
                                    return (
                                      <span style={{fontFamily:"var(--font-mono)",
                                        fontSize:"var(--fs-xs)",color:"var(--amber)",
                                        marginLeft:".3rem",fontWeight:700}}>
                                        → {fmtEur(actual)}
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td style={{textAlign:"right",padding:".3rem .4rem",
                                  fontWeight:700,color:"var(--cyan)"}}>
                                  {fmtEur(a.esFijo?(a.costeTotal||0):a.cantidad*(a.precioUnit||0))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Factura */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
                      <div style={{padding:".55rem .7rem",borderRadius:8,
                        background:"var(--surface2)",border:"1px solid var(--border)"}}>
                        <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                          color:"var(--text-muted)",marginBottom:".25rem"}}>
                          📅 Entrega esperada
                        </div>
                        <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-base)",fontWeight:700}}>
                          {p.fechaEntrega||"—"}
                        </div>
                      </div>
                      <div style={{padding:".55rem .7rem",borderRadius:8,
                        background: p.factura?.numero?"var(--green-dim)":"var(--surface2)",
                        border:`1px solid ${p.factura?.numero?"rgba(52,211,153,.25)":"var(--border)"}`}}>
                        <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                          color:"var(--text-muted)",marginBottom:".25rem"}}>
                          🧾 Factura
                        </div>
                        {p.factura?.numero ? (
                          <div>
                            <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",fontWeight:700}}>
                              {p.factura.numero}
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:".4rem",marginTop:".1rem"}}>
                              <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",
                                color:"var(--text-muted)"}}>
                                {fmtEur(p.factura.importe)}
                              </span>
                              {desvPct!==null && Math.abs(desvPct)>0.5 && (
                                <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                                  color:desvPct>0?"var(--red)":"var(--green)",fontWeight:700}}>
                                  {desvPct>0?"+":""}{desvPct.toFixed(1)}% vs estimado
                                </span>
                              )}
                              {desvPct!==null && Math.abs(desvPct)<=0.5 && (
                                <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                                  color:"var(--green)",fontWeight:700}}>✓ Sin desviación</span>
                              )}
                            </div>
                            <div style={{marginTop:".15rem"}}>
                              {ESTADOS_FACTURA.map(e => (
                                <span key={e.id} style={{
                                  fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                                  padding:".08rem .35rem",borderRadius:3,marginRight:".25rem",
                                  fontWeight:700,cursor:"pointer",
                                  background: p.factura.estado===e.id ? e.color+"22" : "transparent",
                                  color: p.factura.estado===e.id ? e.color : "var(--text-dim)",
                                  border:`1px solid ${p.factura.estado===e.id?e.color+"44":"transparent"}`,
                                }} onClick={()=>{
                                  const upd={...p,factura:{...p.factura,estado:e.id}};
                                  setPedidos(prev=>prev.map(x=>x.id===p.id?upd:x));
                                }}>{e.label}</span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",
                            color:"var(--text-dim)"}}>Sin factura registrada</div>
                        )}
                      </div>
                    </div>

                    {/* Notas */}
                    {p.notas && (
                      <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",
                        color:"var(--text-muted)",padding:".4rem .6rem",
                        background:"var(--surface2)",borderRadius:6,
                        borderLeft:"2px solid var(--border)"}}>
                        {p.notas}
                      </div>
                    )}

                    {/* Acciones — estado a la izquierda, editar/borrar a la derecha */}
                    <div style={{display:"flex",gap:".4rem",
                      paddingTop:".25rem",borderTop:"1px solid var(--border)",
                      flexWrap:"wrap",alignItems:"center"}}>
                      {/* Segmented control de estado */}
                      <div style={{display:"flex",background:"var(--surface2)",
                        border:"1px solid var(--border)",borderRadius:7,overflow:"hidden",
                        flex:"1 1 auto"}}>
                        {ESTADOS_PEDIDO.map(e => (
                          <button key={e.id}
                            style={{flex:1,padding:".28rem .35rem",border:"none",
                              cursor:"pointer",fontFamily:"var(--font-mono)",
                              fontSize:"var(--fs-xs)",fontWeight:700,whiteSpace:"nowrap",
                              background: p.estado===e.id ? e.bg : "transparent",
                              color: p.estado===e.id ? e.color : "var(--text-dim)",
                              transition:"background .12s,color .12s",
                            }}
                            onClick={()=>{ setPedidos(prev=>prev.map(x=>x.id===p.id?{...x,estado:e.id}:x)); if(e.id==="recibido") toast.success("Pedido marcado como recibido"); }}>
                            {e.label}
                          </button>
                        ))}
                      </div>
                      {/* Editar + Eliminar */}
                      <div style={{display:"flex",gap:".3rem",flexShrink:0}}>
                        <button
                          style={{display:"flex",alignItems:"center",justifyContent:"center",
                            width:36,height:36,borderRadius:7,cursor:"pointer",
                            background:"var(--surface3)",border:"1px solid var(--border)",
                            color:"var(--text-muted)",fontSize:"var(--fs-base)"}}
                          title="Editar pedido"
                          onClick={()=>abrirEditar(p)}>✏️</button>
                        <button
                          style={{display:"flex",alignItems:"center",justifyContent:"center",
                            width:36,height:36,borderRadius:7,cursor:"pointer",
                            background:"rgba(248,113,113,.1)",
                            border:"1px solid rgba(248,113,113,.25)",
                            color:"var(--red)",fontSize:"var(--fs-base)",fontWeight:700}}
                          title="Eliminar pedido"
                          onClick={()=>setDelId(p.id)}>✕</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nuevo/editar */}
      {modal && modal !== "nuevo" && typeof modal === "object" && (
        <ModalPedidoProv
          data={modal._sugerido ? null : modal}
          sugerido={modal._sugerido ? modal : null}
          proveedores={proveedores}
          material={material}
          conceptosPres={conceptosPres}
          onSave={guardar}
          onClose={()=>setModal(null)}
        />
      )}
      {modal === "nuevo" && (
        <ModalPedidoProv
          data={null} sugerido={null}
          proveedores={proveedores}
          material={material}
          conceptosPres={conceptosPres}
          onSave={guardar}
          onClose={()=>setModal(null)}
        />
      )}

      {/* Confirmar eliminar */}
      {delId && (
        <div className="modal-backdrop" style={{zIndex:200}}
          onClick={e=>e.target===e.currentTarget&&setDelId(null)}>
          <div className="modal" role="dialog" aria-modal="true" style={{maxWidth:320,textAlign:"center"}}>
            <div className="modal-body" style={{paddingTop:"1.5rem"}}>
              <div style={{fontSize:"var(--fs-xl)",marginBottom:".5rem"}}>⚠️</div>
              <div style={{fontWeight:700}}>¿Eliminar pedido?</div>
              <div className="mono xs muted">Esta acción no se puede deshacer.</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setDelId(null)}>Cancelar</button>
              <button className="btn btn-red" onClick={eliminar}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Panel de sugerencias simples: dorsales + avituallamiento ──────────────────
function SugerenciasSimples({ inscritos, totalInscritos, conceptoDorsal, precioDorsal, conceptosAvit, precioAvitTotal, pedidos, onCrear }) {
  const [colapsado, setColapsado] = useState(true); // colapsado por defecto para no saturar
  const baseTotal = totalInscritos || 0;

  const yaTieneDorsal = pedidos.some(p =>
    p.articulos?.some(a => /dorsal/i.test(a.nombre)) && p.estado !== "borrador"
  );
  const yaTieneAvit = pedidos.some(p =>
    p.articulos?.some(a => /avituall|nutrición|agua/i.test(a.nombre)) && p.estado !== "borrador"
  );

  const sugerencias = [
    conceptoDorsal && {
      key: "dorsal",
      icon: "🔢",
      label: "Dorsales",
      cantidad: baseTotal,
      precio: precioDorsal,
      concepto: conceptoDorsal,
      yaConfirmado: yaTieneDorsal,
    },
    ...conceptosAvit.map(c => ({
      key: c.id,
      icon: "🍎",
      label: c.nombre,
      cantidad: baseTotal,
      precio: calcPrecioUnitario(c, []).precio,
      concepto: c,
      yaConfirmado: yaTieneAvit,
    })),
  ].filter(Boolean);

  if (!sugerencias.length) return null;

  return (
    <div className="card mb" style={{padding:0,overflow:"hidden",
      borderLeft:"3px solid var(--cyan)",marginBottom:".5rem"}}>
      <button
        onClick={() => setColapsado(v => !v)}
        style={{width:"100%",display:"flex",alignItems:"center",gap:".65rem",
          padding:".7rem .9rem",background:"rgba(34,211,238,.04)",
          border:"none",cursor:"pointer",textAlign:"left"}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:"var(--fs-base)"}}>
            📦 Sugerencias — Dorsales y Avituallamiento
          </div>
          <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
            color:"var(--text-muted)",marginTop:".1rem"}}>
            {sugerencias.length} concepto{sugerencias.length!==1?"s":""} · {baseTotal} corredores base
          </div>
        </div>
        <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",
          color:"var(--text-dim)",flexShrink:0,
          transform:colapsado?"rotate(-90deg)":"rotate(0deg)",transition:"transform .18s"}}>▼</span>
      </button>

      {!colapsado && (
        <div style={{borderTop:"1px solid var(--border)",padding:".75rem .9rem",
          display:"flex",flexDirection:"column",gap:".5rem"}}>
          {sugerencias.map(sg => (
            <div key={sg.key} style={{
              display:"flex",alignItems:"center",gap:".75rem",
              padding:".55rem .75rem",borderRadius:8,
              background:"var(--surface2)",border:"1px solid var(--border)",
              flexWrap:"wrap"}}>
              <span style={{fontSize:"var(--fs-lg)",flexShrink:0}}>{sg.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:"var(--fs-base)"}}>{sg.label}</div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                  color:"var(--text-muted)",marginTop:".1rem"}}>
                  {sg.cantidad} ud
                  {sg.precio > 0 && ` · ${fmtEur(sg.precio)}/ud = ${fmtEur(sg.cantidad * sg.precio)}`}
                  {sg.precio === 0 && " · precio no configurado en presupuesto"}
                </div>
              </div>
              {sg.yaConfirmado ? (
                <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                  padding:".1rem .4rem",borderRadius:4,fontWeight:700,
                  background:"var(--green-dim)",color:"var(--green)",
                  border:"1px solid rgba(52,211,153,.2)",flexShrink:0}}>
                  ✓ Pedido confirmado
                </span>
              ) : (
                <button
                  className="btn btn-sm"
                  style={{background:"rgba(34,211,238,.15)",color:"var(--cyan)",
                    border:"1px solid rgba(34,211,238,.3)",fontSize:"var(--fs-xs)",
                    flexShrink:0,whiteSpace:"nowrap"}}
                  onClick={() => onCrear({
                    _sugerido: true,
                    nombre: `Pedido ${sg.label}`,
                    articulos: [{
                      nombre: sg.label,
                      cantidad: sg.cantidad,
                      precioUnit: sg.precio,
                      conceptoId: sg.concepto?.id || null,
                      esFijo: false,
                    }],
                    importeEstimado: sg.cantidad * sg.precio,
                    importeTotal: sg.cantidad * sg.precio,
                    estado: "borrador",
                    fechaEntrega: "", proveedor: "",
                    notas: `Generado automáticamente. Base: ${baseTotal} corredores.`,
                    factura: null,
                  })}>
                  Crear pedido →
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ── Panel de sugerencias automáticas de medallas ──────────────────────────────
function SugerenciasMedallas({ inscritos, totalInscritos, precioMedalla, conceptoMedalla, pedidos, onCrear, onEliminar }) {
  const [margen, setMargen]       = useState(20);
  const [modo,   setModo]         = useState("fijo");
  const [collapsed, setCollapsed] = useState(true); // colapsado por defecto

  const baseTotal       = totalInscritos || 0;
  const extra           = modo === "pct" ? Math.ceil(baseTotal * margen / 100) : margen;
  const cantidadSugerida = baseTotal + extra;
  const costeEstimado    = cantidadSugerida * precioMedalla;

  const pedidoExistente = pedidos.find(p =>
    p.articulos?.some(a => /medalla/i.test(a.nombre)) && p.estado !== "borrador"
  );

  // El pedido sugerido guardado (si existe en la lista)
  const pedidoGuardado = pedidos.find(p => p._esSugerido);

  return (
    <div className="card mb" style={{padding:0,overflow:"hidden",
      borderLeft:"3px solid var(--amber)",marginBottom:".5rem"}}>

      {/* ── Cabecera — mismo patrón que pedidos guardados ── */}
      <div style={{
        display:"flex", alignItems:"center", gap:".65rem",
        padding:".7rem .9rem", cursor:"pointer",
        background:"rgba(251,191,36,.04)",
      }} onClick={()=>setCollapsed(v=>!v)}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:".5rem",flexWrap:"wrap"}}>
            <span style={{fontWeight:700,fontSize:"var(--fs-base)"}}>
              🏅 Sugerencia — Medallas finisher
            </span>
            {pedidoExistente && (
              <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                padding:".1rem .4rem",borderRadius:4,fontWeight:700,
                background:"var(--green-dim)",color:"var(--green)",
                border:"1px solid rgba(52,211,153,.2)"}}>
                ✓ Pedido confirmado
              </span>
            )}
          </div>
          <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
            color:"var(--text-muted)",marginTop:".1rem"}}>
            {baseTotal} inscritos · sugerido: {cantidadSugerida} ud
            {precioMedalla > 0 && ` · ${fmtEur(costeEstimado)} estimado`}
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          {precioMedalla > 0 ? (
            <div style={{fontFamily:"var(--font-mono)",fontWeight:800,
              fontSize:"var(--fs-base)",color:"var(--amber)"}}>
              {fmtEur(costeEstimado)}
            </div>
          ) : (
            <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",
              color:"var(--text-dim)"}}>sin precio</div>
          )}
          <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
            padding:".1rem .4rem",borderRadius:4,
            background:"rgba(251,191,36,.15)",color:"var(--amber)",fontWeight:700}}>
            Sugerido
          </span>
        </div>
        <span style={{color:"var(--text-dim)",fontSize:"var(--fs-base)",flexShrink:0,
          transition:"transform .2s",transform:collapsed?"rotate(-90deg)":"rotate(0)"}}>
          ▼
        </span>
      </div>

      {/* ── Detalle colapsable ── */}
      {!collapsed && (
        <div style={{borderTop:"1px solid var(--border)",
          padding:".75rem .9rem",display:"flex",flexDirection:"column",gap:".65rem"}}>

          {/* Desglose por distancia */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:".4rem"}}>
            {["TG7","TG13","TG25"].map(d => (
              <div key={d} style={{padding:".45rem .6rem",borderRadius:7,
                background:"var(--surface2)",border:"1px solid var(--border)",
                textAlign:"center"}}>
                <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                  color:"var(--text-muted)",marginBottom:".1rem"}}>{d}</div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-md)",
                  fontWeight:800,color:"var(--amber)"}}>{inscritos?.[d]||0}</div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                  color:"var(--text-dim)"}}>inscritos</div>
              </div>
            ))}
          </div>

          {/* Margen */}
          <div style={{display:"flex",alignItems:"center",gap:".5rem",flexWrap:"wrap"}}>
            <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",
              color:"var(--text-muted)",flexShrink:0}}>Margen extra:</span>
            <div style={{display:"flex",background:"var(--surface2)",
              border:"1px solid var(--border)",borderRadius:6,overflow:"hidden"}}>
              {[["fijo","ud"],["pct","%"]].map(([v,l])=>(
                <button key={v} onClick={e=>{e.stopPropagation();setModo(v);}}
                  style={{padding:".22rem .55rem",border:"none",cursor:"pointer",
                    fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
                    background:modo===v?"rgba(251,191,36,.2)":"transparent",
                    color:modo===v?"var(--amber)":"var(--text-muted)"}}>
                  {l}
                </button>
              ))}
            </div>
            <input type="number" min="0" max={modo==="pct"?100:500} value={margen}
              onClick={e=>e.stopPropagation()}
              onChange={e=>setMargen(Math.max(0,parseInt(e.target.value)||0))}
              style={{width:56,background:"var(--surface2)",border:"1px solid var(--border)",
                color:"var(--amber)",borderRadius:6,padding:".22rem .4rem",
                fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",textAlign:"right",outline:"none"}}
            />
            <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",
              color:"var(--text-muted)"}}>
              {modo==="pct" ? `% = +${extra} ud` : "ud extra"}
            </span>
          </div>

          {/* Resumen */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
            gap:"1rem",flexWrap:"wrap",padding:".55rem .75rem",borderRadius:8,
            background:"rgba(251,191,36,.06)",border:"1px solid rgba(251,191,36,.18)"}}>
            <div style={{display:"flex",gap:"1.5rem",flexWrap:"wrap"}}>
              <div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                  color:"var(--text-muted)",textTransform:"uppercase",
                  letterSpacing:".06em",marginBottom:".15rem"}}>
                  BASE INSCRITOS
                </div>
                <div style={{fontFamily:"var(--font-mono)",fontWeight:800,fontSize:"var(--fs-md)"}}>
                  {baseTotal}
                </div>
              </div>
              <div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                  color:"var(--text-muted)",textTransform:"uppercase",
                  letterSpacing:".06em",marginBottom:".15rem"}}>
                  + MARGEN
                </div>
                <div style={{fontFamily:"var(--font-mono)",fontWeight:800,fontSize:"var(--fs-md)",
                  color:"var(--amber)"}}>
                  +{extra}
                </div>
              </div>
              <div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                  color:"var(--text-muted)",textTransform:"uppercase",
                  letterSpacing:".06em",marginBottom:".15rem"}}>
                  = PEDIR AL PROVEEDOR
                </div>
                <div style={{fontFamily:"var(--font-mono)",fontWeight:800,fontSize:"var(--fs-md)",
                  color:"var(--cyan)"}}>
                  {cantidadSugerida}
                </div>
              </div>
              {precioMedalla > 0 && (
                <div>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                    color:"var(--text-muted)",textTransform:"uppercase",
                    letterSpacing:".06em",marginBottom:".15rem"}}>
                    COSTE ESTIMADO ({fmtEur(precioMedalla)}/UD)
                  </div>
                  <div style={{fontFamily:"var(--font-mono)",fontWeight:800,fontSize:"var(--fs-md)",
                    color:"var(--amber)"}}>
                    {fmtEur(costeEstimado)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Acciones — mismo patrón que pedidos guardados */}
          <div style={{display:"flex",gap:".4rem",justifyContent:"flex-end",
            paddingTop:".25rem",borderTop:"1px solid var(--border)",flexWrap:"wrap"}}>
            <button className="btn btn-ghost btn-sm"
              style={{fontSize:"var(--fs-xs)",color:"var(--text-muted)"}}
              onClick={e=>{e.stopPropagation();setCollapsed(true);}}>
              Colapsar
            </button>
            <button className="btn btn-sm"
              style={{fontSize:"var(--fs-xs)",
                background:"rgba(251,191,36,.15)",color:"var(--amber)",
                border:"1px solid rgba(251,191,36,.3)",marginLeft:"auto"}}
              onClick={e=>{
                e.stopPropagation();
                onCrear({
                  _sugerido: true,
                  nombre:"Pedido medallas finisher",
                  articulos:[{
                    nombre:"Medalla finisher",
                    cantidad: cantidadSugerida,
                    precioUnit: precioMedalla,
                    esFijo: false,
                    notas:`Base: ${baseTotal} inscritos + ${extra} margen`
                  }],
                  importeEstimado: costeEstimado,
                  importeTotal: costeEstimado,
                  estado:"borrador",
                  fechaEntrega:"",
                  proveedor:"",
                  notas:`Generado automáticamente. Base: ${baseTotal} inscritos (TG7:${inscritos?.TG7||0} + TG13:${inscritos?.TG13||0} + TG25:${inscritos?.TG25||0}) + ${extra} ud de margen.`,
                  factura:null,
                });
              }}>
              Crear pedido con esta cantidad →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// ── Modal crear/editar pedido ─────────────────────────────────────────────────
// Calcula el precio UNITARIO correcto de un concepto del presupuesto
// - Variable: costePorDistancia (ya es €/corredor)
// - Fijo con material vinculado: costeTotal ÷ stock del artículo
// - Fijo sin vínculo: 0 (el usuario debe introducirlo manualmente)
function calcPrecioUnitario(concepto, material=[]) {
  if (!concepto) return { precio:0, esFijo:false, costeTotal:0 };

  if (concepto.tipo === "variable") {
    // Variable: costePorDistancia ya es precio €/unidad (€/corredor)
    const dists = ["TG7","TG13","TG25"].filter(d =>
      concepto.activoDistancias?.[d] && (concepto.costePorDistancia?.[d]||0) > 0
    );
    if (!dists.length) return { precio: 0, esFijo: false, costeTotal: 0 };
    // Si es uniforme usar TG7, sino media de distancias activas
    const precio = concepto.modoUniforme
      ? (concepto.costePorDistancia?.TG7 || 0)
      : dists.reduce((s,d) => s + (concepto.costePorDistancia[d]||0), 0) / dists.length;
    return { precio, esFijo: false, costeTotal: 0 };
  }

  // Concepto FIJO: costeTotal es el precio del LOTE COMPLETO.
  // El precio unitario solo se puede conocer si hay un artículo de Material vinculado con stock.
  // Si no hay vínculo, precio=0 — el usuario lo introduce manualmente.
  const matVinculado = material.find(m => m.presupuestoConceptoId === concepto.id);
  const unidades = matVinculado?.stock || 0;
  if (unidades > 0) {
    return {
      precio: concepto.costeTotal / unidades,
      esFijo: true,
      costeTotal: concepto.costeTotal,
      unidades,
    };
  }
  // Sin vínculo: precio unitario desconocido → el usuario lo introduce
  return { precio: 0, esFijo: true, costeTotal: concepto.costeTotal, unidades: 0 };
}

function ModalPedidoProv({ data, sugerido, proveedores, onSave, onClose, material=[], conceptosPres=[] }) {
  const esEdit = !!data?.id;
  const [form, setForm] = useState(() => {
    if (data) return { ...data, articulos: (data.articulos||[]).map(a=>({...a})) };
    if (sugerido) return {
      nombre: sugerido.nombre||"",
      proveedor: sugerido.proveedor||"",
      articulos: (sugerido.articulos||[]).map(a=>({...a})),
      importeEstimado: sugerido.importeEstimado||0,
      importeTotal: sugerido.importeTotal||0,
      estado: "borrador",
      fechaEntrega: sugerido.fechaEntrega||"",
      notas: sugerido.notas||"",
      factura: null,
    };
    return {
      nombre:"", proveedor:"", articulos:[{nombre:"",cantidad:1,precioUnit:0}],
      importeEstimado:0, importeTotal:0, estado:"borrador",
      fechaEntrega:"", notas:"", factura:null,
    };
  });

  const upd = (k,v) => setForm(p=>({...p,[k]:v}));
  const updArt = (i,k,v) => setForm(p=>({
    ...p,
    articulos: p.articulos.map((a,j) => j===i ? {...a,[k]:v} : a)
  }));
  const addArt    = () => setForm(p=>({...p,articulos:[...p.articulos,{nombre:"",cantidad:1,precioUnit:0,fuente:"manual"}]}));
  const addArtDef = (def) => setForm(p=>({...p,articulos:[...p.articulos,def]}));
  const delArt = (i) => setForm(p=>({...p,articulos:p.articulos.filter((_,j)=>j!==i)}));

  // Recalcular importe total cuando cambian los artículos
  const importeCalc = form.articulos.reduce((s,a)=>s+(a.esFijo?(a.costeTotal||0):a.cantidad*(a.precioUnit||0)),0);

  const guardar = () => {
    if (!form.nombre.trim()) return;
    onSave({...form, importeTotal: importeCalc, importeEstimado: form.importeEstimado||importeCalc });
  };

  const updFactura = (k,v) => upd("factura", {...(form.factura||{}), [k]:v });

  return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-ficha" style={{maxWidth:520}}>
        <div className="modal-header">
          <span className="modal-title">{esEdit?"✏️ Editar pedido":"🛒 Nuevo pedido"}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><span aria-hidden="true">✕</span></button>
        </div>
        <div className="modal-body" style={{gap:".65rem"}}>

          {/* Datos básicos */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
            <div style={{gridColumn:"1/-1"}}>
              <label className="fl">Nombre del pedido *</label>
              <input className="inp" value={form.nombre}
                onChange={e=>upd("nombre",e.target.value)}
                placeholder="ej. Medallas finisher 2026" />
            </div>
            <div>
              <label className="fl">Proveedor</label>
              <select className="inp" value={form.proveedor}
                onChange={e=>upd("proveedor",e.target.value)}>
                <option value="">Sin asignar</option>
                {proveedores.map(p=>(
                  <option key={p.id} value={p.nombre}>{p.nombre}</option>
                ))}
                <option value="__otro__">Otro (escribir abajo)</option>
              </select>
            </div>
            <div>
              <label className="fl">Fecha entrega esperada</label>
              <input className="inp" type="date" value={form.fechaEntrega}
                onChange={e=>upd("fechaEntrega",e.target.value)} />
            </div>
          </div>

          {/* Artículos — selector dual material / presupuesto */}
          <div>
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",marginBottom:".4rem"}}>
              <label className="fl" style={{margin:0}}>Artículos</label>
              <div style={{display:"flex",gap:".3rem"}}>
                <button className="btn btn-ghost btn-sm"
                  style={{fontSize:"var(--fs-xs)",color:"var(--cyan)"}}
                  onClick={()=>{
                    // Añadir desde inventario de Material
                    const mat=material&&material.length>0?material[0]:null;
                    const concepto=mat?.presupuestoConceptoId
                      ? conceptosPres.find(c=>c.id===mat.presupuestoConceptoId) : null;
                    const { precio, esTotal } = concepto
                      ? calcPrecioUnitario(concepto, material)
                      : { precio: 0, esTotal: false };
                    addArtDef({nombre:mat?.nombre||"",materialId:mat?.id||null,
                      cantidad:1,precioUnit:precio,esTotal,fuente:"material"});
                  }}>
                  + de Inventario
                </button>
                <button className="btn btn-ghost btn-sm"
                  style={{fontSize:"var(--fs-xs)",color:"var(--violet)"}}
                  onClick={()=>{
                    const c=conceptosPres&&conceptosPres.length>0?conceptosPres[0]:null;
                    const { precio:precioC, esFijo:esFijoC, costeTotal:ct } = c
                      ? calcPrecioUnitario(c, material)
                      : { precio:0, esFijo:false };
                    addArtDef({nombre:c?.nombre||"",conceptoId:c?.id||null,
                      cantidad:1,precioUnit:precioC,esFijo:esFijoC,
                      costeTotal:ct,fuente:"presupuesto"});
                  }}>
                  + de Presupuesto
                </button>
                <button className="btn btn-ghost btn-sm"
                  style={{fontSize:"var(--fs-xs)"}}
                  onClick={()=>addArtDef({nombre:"",cantidad:1,precioUnit:0,fuente:"manual"})}>
                  + Manual
                </button>
              </div>
            </div>
            {form.articulos.map((a,i)=>(
              <div key={i} style={{background:"var(--surface2)",borderRadius:7,
                padding:".5rem .65rem",marginBottom:".4rem",
                borderLeft:`3px solid ${a.fuente==="material"?"var(--cyan)":a.fuente==="presupuesto"?"var(--violet)":"var(--border)"}`}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 70px 80px 28px",
                  gap:".35rem",alignItems:"end",marginBottom:".3rem"}}>
                  <div>
                    <label className="fl" style={{display:"flex",alignItems:"center",gap:".3rem"}}>
                      Artículo
                      {a.fuente==="material" && <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-2xs)",padding:".06rem .3rem",borderRadius:10,background:"var(--cyan-dim)",color:"var(--cyan)"}}>📦 Inventario</span>}
                      {a.fuente==="presupuesto" && <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-2xs)",padding:".06rem .3rem",borderRadius:10,background:"var(--violet-dim)",color:"var(--violet)"}}>💰 Presupuesto</span>}
                    </label>
                    {a.fuente==="material" && material.length>0 ? (
                      <select className="inp inp-sm" value={a.materialId||""}
                        onChange={e=>{
                          const mat=material.find(m=>m.id===parseInt(e.target.value));
                          const concepto=mat?.presupuestoConceptoId
                            ? conceptosPres.find(c=>c.id===mat.presupuestoConceptoId) : null;
                          const { precio:precioM, esFijo:esFijoM } = concepto
                            ? calcPrecioUnitario(concepto, material)
                            : { precio: a.precioUnit, esFijo: false };
                          updArt(i,"materialId",parseInt(e.target.value));
                          updArt(i,"nombre",mat?.nombre||"");
                          updArt(i,"esFijo",esFijoM);
                          if(precioM>0) updArt(i,"precioUnit",precioM);
                        }}>
                        {material.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}
                      </select>
                    ) : a.fuente==="presupuesto" && conceptosPres.length>0 ? (
                      <select className="inp inp-sm" value={a.conceptoId||""}
                        onChange={e=>{
                          const c=conceptosPres.find(cc=>cc.id===parseInt(e.target.value));
                          const { precio:precioP, esFijo:esFijoP, costeTotal:ctP } = c
                            ? calcPrecioUnitario(c, material)
                            : { precio:0, esFijo:false };
                          updArt(i,"conceptoId",parseInt(e.target.value));
                          updArt(i,"nombre",c?.nombre||"");
                          updArt(i,"esFijo",esFijoP);
                          updArt(i,"costeTotal",ctP);
                          updArt(i,"precioUnit",precioP);
                        }}>
                        {conceptosPres.map(c=><option key={c.id} value={c.id}>[{c.tipo==="variable"?"var":"fijo"}] {c.nombre}</option>)}
                      </select>
                    ) : (
                      <input className="inp inp-sm" value={a.nombre}
                        onChange={e=>updArt(i,"nombre",e.target.value)}
                        placeholder="Nombre del artículo" />
                    )}
                  </div>
                  <div>
                    <label className="fl">Cant.</label>
                    <input className="inp inp-sm inp-mono" type="number" min="1"
                      value={a.cantidad}
                      onChange={e=>{
                        const qty = Math.max(1,parseInt(e.target.value)||1);
                        updArt(i,"cantidad", qty);
                        // Para conceptos fijos: precio unitario = costeTotal / cantidad
                        if (a.esFijo && (a.costeTotal||0) > 0) {
                          updArt(i,"precioUnit", (a.costeTotal||0) / qty);
                        }
                      }} />
                  </div>
                  <div>
                    <label className="fl" style={{color:a.esFijo?"var(--amber)":undefined}}>
                      {a.esFijo ? "Total lote (€)" : "€/ud"}
                    </label>
                    <input className="inp inp-sm inp-mono" type="number" min="0" step="0.01"
                      value={a.esFijo ? (a.costeTotal||0) : a.precioUnit}
                      style={{borderColor: a.esFijo?"rgba(251,191,36,.4)":undefined}}
                      onChange={e => {
                        const v = parseFloat(e.target.value)||0;
                        if (a.esFijo) {
                          // Para fijos: guardar el total y recalcular precio unitario
                          updArt(i,"costeTotal", v);
                          updArt(i,"precioUnit", a.cantidad > 0 ? v / a.cantidad : 0);
                        } else {
                          updArt(i,"precioUnit", v);
                        }
                      }} />
                  </div>
                  <button className="btn btn-red btn-sm"
                    style={{marginBottom:1,padding:".25rem .4rem"}}
                    disabled={form.articulos.length<=1}
                    onClick={()=>delArt(i)}>✕</button>
                </div>

                <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                  color:"var(--text-muted)",display:"flex",justifyContent:"space-between",
                  alignItems:"center",marginTop:".1rem"}}>
                  {a.esFijo && (
                    <span style={{color:"var(--amber)",fontSize:"var(--fs-xs)"}}>
                      💡 Coste total fijo — €/ud se calcula automáticamente
                      ({a.cantidad>0?fmtEur((a.costeTotal||0)/a.cantidad):"—"}/ud × {a.cantidad} ud)
                    </span>
                  )}
                  <span style={{marginLeft:"auto"}}>
                    Subtotal: {fmtEur(a.esFijo ? (a.costeTotal||0) : a.cantidad*(a.precioUnit||0))}
                  </span>
                </div>
              </div>
            ))}
            <div style={{textAlign:"right",fontFamily:"var(--font-mono)",
              fontSize:"var(--fs-sm)",fontWeight:800,color:"var(--cyan)",marginTop:".35rem"}}>
              Total pedido: {fmtEur(importeCalc)}
            </div>
          </div>

          {/* Factura */}
          <div style={{borderTop:"1px solid var(--border)",paddingTop:".6rem"}}>
            <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",fontWeight:700,
              color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".06em",
              marginBottom:".4rem"}}>🧾 Factura (opcional)</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".4rem"}}>
              <div>
                <label className="fl">Nº factura</label>
                <input className="inp inp-sm inp-mono"
                  value={form.factura?.numero||""}
                  onChange={e=>updFactura("numero",e.target.value)}
                  placeholder="FAC-2026-001" />
              </div>
              <div>
                <label className="fl">Importe real (€)</label>
                <input className="inp inp-sm inp-mono" type="number" min="0" step="0.01"
                  value={form.factura?.importe||""}
                  onChange={e=>updFactura("importe",parseFloat(e.target.value)||0)}
                  placeholder={fmtEur(importeCalc)} />
              </div>
              <div>
                <label className="fl">Estado de pago</label>
                <select className="inp inp-sm"
                  value={form.factura?.estado||"pendiente"}
                  onChange={e=>updFactura("estado",e.target.value)}>
                  {ESTADOS_FACTURA.map(e=>(
                    <option key={e.id} value={e.id}>{e.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="fl">Fecha factura</label>
                <input className="inp inp-sm" type="date"
                  value={form.factura?.fecha||""}
                  onChange={e=>updFactura("fecha",e.target.value)} />
              </div>
            </div>
            {form.factura?.importe > 0 && importeCalc > 0 && (
              <div style={{marginTop:".4rem",fontFamily:"var(--font-mono)",
                fontSize:"var(--fs-xs)",color:"var(--text-muted)"}}>
                Desviación vs estimado:{" "}
                <span style={{fontWeight:700,
                  color: Math.abs(form.factura.importe-importeCalc)<0.01
                    ? "var(--green)"
                    : form.factura.importe > importeCalc ? "var(--red)" : "var(--green)"}}>
                  {form.factura.importe > importeCalc ? "+" : ""}
                  {fmtEur(form.factura.importe - importeCalc)}
                  {" "}({((form.factura.importe-importeCalc)/importeCalc*100).toFixed(1)}%)
                </span>
              </div>
            )}
          </div>

          {/* Notas */}
          <div>
            <label className="fl">Notas</label>
            <textarea className="inp" rows={2} value={form.notas}
              onChange={e=>upd("notas",e.target.value)}
              placeholder="Condiciones, contacto del proveedor, observaciones…" />
          </div>

        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary"
            disabled={!form.nombre.trim()}
            style={{opacity:form.nombre.trim()?1:.5}}
            onClick={guardar}>
            {esEdit?"Guardar cambios":"Crear pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}

export { TabPedidosProv };
