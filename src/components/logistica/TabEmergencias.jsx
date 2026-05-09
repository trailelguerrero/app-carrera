// Auto-extracted from Logistica.jsx — Sprint 2 refactor
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { toast } from "@/lib/toast";
import { genIdNum } from "@/lib/utils";
import { useModalClose } from "@/hooks/useModalClose";
import EmptyState from "@/components/EmptyState";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { BLOCK_CSS, blockCls as cls } from "@/lib/blockStyles";
import { useData } from "@/hooks/useData";

// ─── EMERGENCIAS — solo urgencias reales: directorio urgente + protocolo + incidencias
function TabEmergencias({cont,inc,setInc,abrirModal,abrirFicha,tiposContacto=[]}) {
  const [sub,setSub]     = useState("urgentes");
  const [proto,setProto] = useState(null);

  const TIPOS_BASE = [
    {id:"emergencia",icono:"🚨",color:"var(--red)"},
    {id:"medico",    icono:"🏥",color:"var(--green)"},
  ];
  const todosLosTipos = [...TIPOS_BASE,...(Array.isArray(tiposContacto)?tiposContacto:[])];
  const getTipo = (id) => todosLosTipos.find(t=>t.id===id)||{icono:"📞",color:"var(--text-muted)"};

  // Contactos urgentes = emergencia + médico
  const contUrgentes = cont.filter(c=>c.tipo==="emergencia"||c.tipo==="medico");
  const incAbiertas  = inc.filter(i=>i.estado==="abierta").length;

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">🚨 Emergencias</div>
          <div className="pd">
            {contUrgentes.length} contactos urgentes · {inc.length} incidencias
            {incAbiertas>0&&<span style={{color:"var(--red)",marginLeft:".4rem"}}>· ⚠ {incAbiertas} abiertas</span>}
          </div>
        </div>
        <div style={{display:"flex",gap:".4rem",flexWrap:"wrap"}}>
          <button className="btn btn-ghost btn-sm" aria-label="Exportar directorio de emergencias a PDF"
            onClick={() => {
              const tiposOrden = ["emergencia","medico",...todosLosTipos.filter(t=>t.id!=="emergencia"&&t.id!=="medico").map(t=>t.id)];
              const grupos = tiposOrden.map(tid => {
                const tipo = getTipo(tid);
                const items = cont.filter(c=>c.tipo===tid);
                if(!items.length) return null;
                return {tipo, items};
              }).filter(Boolean);
              const ahora = new Date();
              const fecha = ahora.toLocaleDateString("es-ES",{day:"2-digit",month:"long",year:"numeric"});
              const hora  = ahora.toTimeString().slice(0,5);

              const gruposHtml = grupos.map(g => {
                const rowsHtml = g.items.map(c => {
                  const telLink = c.telefono ? "<a href=\"tel:" + (c.telefono||"").replace(/\s/g,"") + "\">" + (c.telefono||"—") + "</a>" : "—";
                  const emailHtml = c.email ? "<br><span style=\"font-size:9pt;font-weight:400\">" + c.email + "</span>" : "";
                  return "<tr><td class=\"nombre\">" + (c.nombre||"—") + "</td><td class=\"rol\">" + (c.rol||"") + "</td><td class=\"tel\">" + telLink + emailHtml + "</td></tr>";
                }).join("");
                return "<div class=\"grupo\"><div class=\"grupo-header\">" + (g.tipo.icono||"📞") + " " + (g.tipo.nombre||g.tipo.id) + "</div><table>" + rowsHtml + "</table></div>";
              }).join("");

              const html = "<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"UTF-8\">" +
                "<title>Directorio Emergencias — Trail El Guerrero 2026</title>" +
                "<style>*{margin:0;padding:0;box-sizing:border-box}" +
                "body{font-family:Arial,sans-serif;font-size:11pt;color:#111;padding:20px;max-width:700px;margin:0 auto}" +
                "h1{font-size:16pt;font-weight:900;color:#c00;margin-bottom:4px}" +
                ".meta{font-size:9pt;color:#666;margin-bottom:16px}" +
                ".alert{background:#fff0f0;border:2px solid #c00;border-radius:6px;padding:8px 12px;margin-bottom:16px;font-weight:700;color:#c00;font-size:12pt;text-align:center}" +
                ".grupo{margin-bottom:14px;break-inside:avoid}" +
                ".grupo-header{background:#f5f5f5;border-left:4px solid #c00;padding:5px 10px;font-weight:700;font-size:10pt;margin-bottom:6px}" +
                "table{width:100%;border-collapse:collapse}" +
                "td{padding:5px 8px;border-bottom:1px solid #e5e5e5;font-size:10pt;vertical-align:top}" +
                "td.nombre{font-weight:700;width:35%}td.rol{color:#555;width:30%}td.tel{font-family:monospace;font-weight:700;font-size:11pt;width:35%}" +
                "a{color:#111;text-decoration:none}" +
                ".footer{margin-top:20px;padding-top:10px;border-top:1px solid #ccc;font-size:8pt;color:#888;text-align:center}" +
                "@media print{body{padding:0}.footer{position:fixed;bottom:0;width:100%}}</style></head><body>" +
                "<h1>\uD83D\uDEA8 Directorio de Emergencias</h1>" +
                "<div class=\"meta\">Trail El Guerrero 2026 \u00B7 Candeleda, \u00C1vila \u00B7 Impreso el " + fecha + " a las " + hora + "</div>" +
                "<div class=\"alert\">\u26A0\uFE0F EMERGENCIA GRAVE \u2192 llama al 112 PRIMERO</div>" +
                gruposHtml +
                "<div class=\"footer\">Trail El Guerrero 2026 \u00B7 Club Deportivo Trail Candeleda \u00B7 Documento confidencial para uso interno del equipo organizador</div>" +
                "</body></html>";
              const w = window.open("","_blank","width=750,height=900");
              if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),400);}
            }}
            style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
              color:"var(--cyan)", background:"var(--cyan-dim)", border:"1px solid rgba(34,211,238,.25)",
              borderRadius:6, padding:".35rem .75rem", cursor:"pointer", display:"flex",
              alignItems:"center", gap:".35rem", flexShrink:0 }}>
            🖨️ PDF emergencias
          </button>
          {sub==="incidencias" && (
            <button className="btn btn-sm"
              style={{background:"var(--red-dim)",color:"var(--red)",
                border:"1px solid rgba(248,113,113,.2)"}}
              onClick={()=>abrirModal({tipo:"inc"})}>+ Incidencia</button>
          )}
        </div>
      </div>

      {/* Banner 112 siempre visible */}
      <div style={{padding:".5rem .85rem",borderRadius:8,marginBottom:".75rem",
        background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",
        fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",color:"var(--red)",
        fontWeight:700,display:"flex",alignItems:"center",gap:".6rem"}}>
        🚨 Emergencia grave → llama al <a href="tel:112" style={{color:"var(--red)",fontWeight:900,textDecoration:"underline"}}>112</a> primero
      </div>

      {/* Sub-tabs */}
      <div style={{display:"flex",gap:".3rem",marginBottom:".75rem",
        borderBottom:"1px solid var(--border)",paddingBottom:".4rem"}}>
        {[
          {id:"urgentes",  label:"📞 Contactos urgentes"},
          {id:"protocolo", label:"📘 Protocolos"},
          {id:"incidencias",label:"⚠️ Incidencias",
           badge:incAbiertas>0?incAbiertas:null,badgeColor:"var(--red)"},
        ].map(t=>(
          <button key={t.id} onClick={()=>setSub(t.id)}
            style={{padding:".3rem .7rem",borderRadius:6,border:"none",cursor:"pointer",
              fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)",fontWeight:700,
              background:sub===t.id?"rgba(248,113,113,.12)":"transparent",
              color:sub===t.id?"var(--red)":"var(--text-muted)",
              borderBottom:sub===t.id?"2px solid var(--red)":"2px solid transparent",
              display:"flex",alignItems:"center",gap:".3rem"}}>
            {t.label}
            {t.badge&&<span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
              padding:".05rem .35rem",borderRadius:10,fontWeight:800,
              background:t.badgeColor+"22",color:t.badgeColor}}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* Contactos urgentes */}
      {sub==="urgentes" && (
        <>
          <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
            color:"var(--text-muted)",marginBottom:".5rem"}}>
            Solo contactos de tipo <strong>Emergencia</strong> y <strong>Médico</strong>.
            El resto están en la pestaña Contactos.
          </div>
          {contUrgentes.length===0 ? (
            <div className="card" style={{textAlign:"center",padding:"2rem",
              color:"var(--text-dim)",fontFamily:"var(--font-mono)",fontSize:"var(--fs-sm)"}}>
              Sin contactos de emergencia. Añádelos en Contactos con tipo Emergencia o Médico.
            </div>
          ) : (
            <div className="cgrid">
              {contUrgentes.map(c=>{
                const t=getTipo(c.tipo);
                return (
                  <div key={c.id} className="ccard"
                    style={{borderTopColor:t.color,cursor:"pointer",
                      borderLeft:`3px solid ${t.color}`}}
                    onClick={()=>abrirFicha("cont",c)}>
                    <div className="cch">
                      <div className="ccti">{t.icono}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div className="ccn">{c.nombre}</div>
                        <div className="ccr">{c.rol}</div>
                      </div>
                    </div>
                    <div className="ccd">
                      <a href={`tel:${c.telefono}`} className="ctel"
                        style={{background:t.color+"18",color:t.color,
                          border:`1px solid ${t.color}33`,borderRadius:6,
                          padding:".3rem .7rem",fontWeight:800,fontSize:"var(--fs-base)",
                          textDecoration:"none",display:"inline-flex",
                          alignItems:"center",gap:".35rem"}}>
                        📞 {c.telefono}
                      </a>
                    </div>
                    {c.notas&&<div className="cnota">{c.notas}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Protocolos */}
      {sub==="protocolo" && (
        <div>
          <div className="pgrid">
            {PROTO_PASOS.map(p=>(
              <button key={p.id} className={cls("pbtn",proto===p.id&&"pactive")}
                onClick={()=>setProto(proto===p.id?null:p.id)}>
                <span style={{fontSize:"var(--fs-lg)"}}>{p.icon}</span><span>{p.titulo}</span>
              </button>
            ))}
          </div>
          {proto&&(
            <div className="psteps">
              <div className="pst">{PROTO_PASOS.find(p=>p.id===proto)?.icon} {PROTO_PASOS.find(p=>p.id===proto)?.titulo}</div>
              {PROTO_PASOS.find(p=>p.id===proto)?.pasos.map((ps,i)=>(
                <div key={i} className="ps"><div className="psn">{i+1}</div><div className="pst2">{ps}</div></div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Incidencias */}
      {sub==="incidencias" && (
        <>
          <div className="pd" style={{marginBottom:".65rem"}}>
            {inc.length} incidencia{inc.length!==1?"s":""} · {incAbiertas} abierta{incAbiertas!==1?"s":""}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:".5rem"}}>
            {[...inc].sort((a,b)=>{
                const G={alta:0,media:1,baja:2};
                const byEstado = a.estado==="abierta"&&b.estado!=="abierta" ? -1 : b.estado==="abierta"&&a.estado!=="abierta" ? 1 : 0;
                return byEstado || (G[a.gravedad]??1)-(G[b.gravedad]??1);
              }).map(ic=>{
              const puestoLabel = ic.puestoNombre && ic.puestoNombre !== "— Sin puesto específico" ? ic.puestoNombre : null;
              const SLA_MIN={alta:15,media:30,baja:60};
              const minAbierta = ic.creadaEn && ic.estado==="abierta"
                ? Math.floor((Date.now()-new Date(ic.creadaEn))/60000) : null;
              const slaExcedido = minAbierta !== null && minAbierta > (SLA_MIN[ic.gravedad]||30);
              const tiempoResolucion = ic.creadaEn && ic.resueltaEn
                ? Math.floor((new Date(ic.resueltaEn)-new Date(ic.creadaEn))/60000) : null;
              return (
              <div key={ic.id} className={cls("icard",ic.estado==="resuelta"&&"ires")}
                style={{cursor:"pointer"}} onClick={()=>abrirFicha("inc",ic)}>
                <div className="ich">
                  <div className="fr g1">
                    <span className="mono" style={{fontSize:"var(--fs-sm)",color:"var(--amber)"}}>{ic.hora}</span>
                    {puestoLabel && (
                      <span className="badge" style={{background:"var(--surface3)",color:"var(--text-muted)",
                        maxWidth:110,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        📍 {puestoLabel}
                      </span>
                    )}
                    <span className="badge" style={{
                      background:ic.gravedad==="alta"?"var(--red-dim)":ic.gravedad==="media"?"var(--amber-dim)":"var(--green-dim)",
                      color:ic.gravedad==="alta"?"var(--red)":ic.gravedad==="media"?"var(--amber)":"var(--green)"}}>
                      {ic.gravedad}
                    </span>
                    <span className="badge" style={{background:"var(--cyan-dim)",color:"var(--cyan)"}}>{ic.tipo}</span>
                    {minAbierta !== null && minAbierta >= 1 && (
                      <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",
                        color:slaExcedido?"var(--red)":"var(--text-muted)",
                        background:slaExcedido?"var(--red-dim)":"var(--surface3)",
                        padding:"0.1rem 0.35rem",borderRadius:4}}>
                        ⏱ {minAbierta}min{slaExcedido?" ⚠":""}
                      </span>
                    )}
                  </div>
                  <div className="fr g1" onClick={e=>e.stopPropagation()}>
                    <button className="btn btn-sm"
                      style={{background:"var(--green-dim)",color:"var(--green)",
                        border:"1px solid rgba(52,211,153,.2)"}}
                      onClick={()=>setInc(p=>p.map(x=>x.id===ic.id
                        ?{...x,
                          estado:     x.estado==="resuelta"?"abierta":"resuelta",
                          resueltaEn: x.estado!=="resuelta" ? new Date().toISOString() : null,
                        }:x))}>
                      {ic.estado==="resuelta"?"✓ Resuelta":"Marcar resuelta"}
                    </button>
                  </div>
                </div>
                <div style={{fontWeight:600,fontSize:"var(--fs-base)",margin:".3rem 0"}}>{ic.descripcion}</div>
                {ic.responsable&&<div className="muted xs mono">👤 {ic.responsable}</div>}
                {tiempoResolucion !== null && (
                  <div className="muted xs mono">✓ Resuelto en {tiempoResolucion}min</div>
                )}
                {ic.resolucion&&<div className="ires-txt">✓ {ic.resolucion}</div>}
              </div>
              );
            })}
            {inc.length===0&&<div className="empty">✅ Sin incidencias registradas</div>}
          </div>
        </>
      )}
    </>
  );
}


// Exports
export { TabEmergencias };
