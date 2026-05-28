import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import dataService from "@/lib/dataService";
import { useData } from "@/hooks/useData";
import { toast } from "@/lib/toast";
import EmptyState from "@/components/EmptyState";
import { EVENT_CONFIG_DEFAULT, LS_KEY_CONFIG } from "@/constants/eventConfig";
import { getEventDate } from "@/lib/eventUtils";
import { LOCS_KEY, LOCS_DEFAULT } from "@/constants/localizaciones"; // CONN-01: mapa de puestos

import { SK_LOG_ROOT, SK_VOL_ROOT } from "@/constants/storageKeys";

const LS_LOG = SK_LOG_ROOT;
const LS_VOL = SK_VOL_ROOT;

const CAT_ICON  = { logistica:"🚚", organizacion:"📋", voluntarios:"👥", carrera:"🏃", comunicacion:"📡" };
const CAT_COLOR = { logistica:"#fbbf24", organizacion:"#a78bfa", voluntarios:"#34d399", carrera:"#22d3ee", comunicacion:"#fb923c" };
const TIPO_COLOR = { emergencia:"#f87171", institucional:"#a78bfa", proveedor:"#22d3ee", staff:"#34d399" };

export default function DiaCarrera({ onClose }) {
  const [tab, setTab] = useState("ahora"); // Iniciar en Mission Control
  const [ahora, setAhora] = useState(new Date());
  const [showInc, setShowInc] = useState(false);
  const [busPresencia, setBusPresencia] = useState("");
  const [incForm, setIncForm] = useState({ tipo: "médica", gravedad: "media", descripcion: "", puestoNombre: "— Sin puesto específico" });
  const [incGuardado, setIncGuardado] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 1000); // cada segundo para el reloj
    return () => clearInterval(t);
  }, []);

  // INC-03: escuchar teg-sync para actualizar datos en tiempo real (colaboración multi-dispositivo)
  useEffect(() => {
    let debounce = null;
    const handler = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        if (typeof loadVols  === "function") loadVols();
        if (typeof loadInc   === "function") loadInc();
        if (typeof loadTl    === "function") loadTl();
        if (typeof loadCk    === "function") loadCk();
      }, 300);
    };
    window.addEventListener("teg-sync", handler);
    return () => {
      if (debounce) clearTimeout(debounce);
      window.removeEventListener("teg-sync", handler);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [eventCfg, , loadCfg] = useData(LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT);
  const config     = { ...EVENT_CONFIG_DEFAULT, ...(eventCfg || {}) };
  const [rawTl,  setTl, loadTl]   = useData(LS_LOG + "_tl",  []);
  const [rawCont, , loadCont]         = useData(LS_LOG + "_cont", []);
  const [rawCk,  setCk, loadCk]   = useData(LS_LOG + "_ck",  []);
  const [rawPuestos, , loadPuestos]      = useData(LS_VOL + "_puestos", []);
  const [locs,    ,]             = useData(LOCS_KEY, LOCS_DEFAULT); // CONN-01: localizaciones GPS
  const [rawVols, setVols, loadVols]= useData(LS_VOL + "_voluntarios", []);
  const [rawInc,  setInc, loadInc] = useData(LS_LOG + "_inc", []);

  const isLoading = loadCfg || loadTl || loadCont || loadCk || loadPuestos || loadVols || loadInc;

  // Derivaciones de arrays — siempre antes de cualquier retorno anticipado
  const tl       = useMemo(() =>
    Array.isArray(rawTl) ? [...rawTl].sort((a,b) => a.hora.localeCompare(b.hora)) : []
  , [rawTl]);
  const contactos= Array.isArray(rawCont)    ? rawCont : [];
  const ck       = Array.isArray(rawCk)      ? rawCk  : [];
  const incidencias = Array.isArray(rawInc) ? rawInc : [];
  const puestos  = Array.isArray(rawPuestos) ? rawPuestos : [];
  const vols     = Array.isArray(rawVols)    ? rawVols : [];

  const hora = ahora.toLocaleTimeString("es-ES", { hour:"2-digit", minute:"2-digit" });
  const confirmados = vols.filter(v => v.estado === "confirmado");
  const presentes   = vols.filter(v => v.enPuesto).length; // INC-01: campo canónico enPuesto

  // useMemo DEBE estar antes del retorno condicional (reglas de Hooks)
  const proxima = useMemo(() =>
    tl.find(t => !tlDone(t) && t.hora >= hora) || null
  , [tl, hora]);

  if (isLoading) {
    return (
      <div className="dc">
        
        <div className="dc-hdr">
          <div>
            <div className="dc-title">🏔️ Día de Carrera</div>
            <div className="dc-sub">Cargando datos del evento...</div>
          </div>
          <button onClick={onClose} aria-label="Cerrar vista Día de la Carrera" style={{
            background:"var(--surface2)", border:"1px solid var(--border)",
            borderRadius:8, color:"var(--text-muted)", cursor:"pointer",
            padding:".35rem .7rem", fontFamily:"'DM Mono',monospace",
            fontSize:"var(--fs-sm)", fontWeight:700,
          }}>✕ Salir</button>
        </div>
        <div className="dc-body" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
          <div className="teg-spinner"></div>
        </div>
      </div>
    );
  }

  const toggleTl  = id => { const now = new Date().toTimeString().slice(0,5); setTl(prev => prev.map(t => t.id===id ? {...t, estado:(t.estado==="completado"||t.done)?"pendiente":"completado", done:false, completadoEn:(t.estado==="completado"||t.done)?undefined:now} : t)); dataService.notify('diacarrera'); };
  // INC-01 fix: usar enPuesto+horaLlegada (campo canónico del VoluntarioPortal) en lugar de v.enPuesto
  const toggleVol = id => {
    setVols(prev => prev.map(v => {
      if (v.id !== id) return v;
      const llegando = !v.enPuesto;
      return { ...v, enPuesto: llegando, horaLlegada: llegando ? new Date().toTimeString().slice(0,5) : null };
    }));
    dataService.notify('diacarrera');
  };
  const toggleCk  = id => { const now = new Date().toTimeString().slice(0,5); setCk(prev => prev.map(t => t.id===id ? {...t, estado: t.estado==="completado" ? "pendiente" : "completado", completadoEn: t.estado==="completado" ? undefined : now} : t)); dataService.notify('diacarrera'); };

  const guardarIncidencia = () => {
    if (!incForm.descripcion.trim()) return;
    const nueva = {
      id: Date.now(),                              // INC-06: id numérico coherente con Logística
      hora:        new Date().toTimeString().slice(0, 5),
      creadaEn:    new Date().toISOString(),        // INC-02: para SLA visual en Logística
      puestoNombre: incForm.puestoNombre || "— Sin puesto específico",
      tipo:        incForm.tipo,
      gravedad:    incForm.gravedad,
      descripcion: incForm.descripcion.trim(),
      responsable: "Día de Carrera",
      estado:      "abierta",
      resolucion:  "",
      resueltaEn:  null,
    };
    setInc(prev => [...(Array.isArray(prev) ? prev : []), nueva]);
    dataService.notify('diacarrera');
    toast.success("Incidencia registrada correctamente");
    setIncGuardado(true);
    setTimeout(() => {
      setShowInc(false);
      setIncGuardado(false);
      setIncForm({ tipo: "médica", gravedad: "media", descripcion: "", puestoNombre: "— Sin puesto específico" });
    }, 1000);
  };

  const tlDone = t => t.estado==="completado" || t.done;
  const tlCompletadas = tl.filter(tlDone).length;
  const progresoDia   = tl.length > 0 ? Math.round(tlCompletadas / tl.length * 100) : 0;
  const proximaSig    = tl.find(t => !tlDone(t));

  const TABS = [
    {id:"ahora",       label:"🎯 Ahora"},
    {id:"timeline",    label:"⏱ Runbook"},
    {id:"voluntarios", label:"👥 Voluntarios"},
    {id:"puestos",     label:"📍 Puestos"},
    {id:"contactos",   label:"🚨 Contactos"},
    {id:"checklist",   label:"✅ Pre-operativo"},
  ];

  const modal = (
    <div className="dc">
      

      {/* Header */}
      <div className="dc-hdr">
        <div>
          <div className="dc-title">🏔️ Día de Carrera</div>
          <div className="dc-sub">
            {config.nombre} ·{" "}
            <span style={{color:"var(--cyan)"}}>
              {(() => {
                const ev = getEventDate(config);
                const dias = Math.ceil((ev - new Date()) / 86400000);
                return dias === 0 ? "¡HOY!" : dias > 0 ? `${dias}d para el evento` : ev.toLocaleDateString("es-ES",{day:"numeric",month:"long"});
              })()}
            </span>
            {" "}· {hora} · <span style={{color:"var(--green)"}}>{presentes}/{confirmados.length} presentes</span>
          </div>
        </div>
        <button onClick={onClose} aria-label="Cerrar vista Día de la Carrera" style={{
          background:"var(--surface2)", border:"1px solid var(--border)",
          borderRadius:8, color:"var(--text-muted)", cursor:"pointer",
          padding:".35rem .7rem", fontFamily:"'DM Mono',monospace",
          fontSize:"var(--fs-sm)", fontWeight:700,
        }}>✕ Salir</button>
      </div>

      {/* Próxima tarea */}
      {proxima && (
        <div className="dc-next">
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-xs)",color:"#22d3ee",fontWeight:700}}>PRÓXIMO</span>
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-sm)",fontWeight:800,color:"#22d3ee"}}>{proxima.hora}</span>
          <span style={{fontSize:"var(--fs-base)",fontWeight:600,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {proxima.titulo}
          </span>
          <span>{CAT_ICON[proxima.categoria] || "📌"}</span>
        </div>
      )}

      {/* Barra de progreso del día */}
      {tl.length > 0 && (
        <div className="dc-prog">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span className="mono-xs text-muted">
              {tlCompletadas}/{tl.length} tareas
            </span>
            {proximaSig ? (
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-xs)",
                color:"var(--cyan)",overflow:"hidden",textOverflow:"ellipsis",
                whiteSpace:"nowrap",maxWidth:"60%",textAlign:"right"}}>
                ▶ {proximaSig.hora} {proximaSig.titulo}
              </span>
            ) : (
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-xs)",color:"var(--green)",fontWeight:700}}>
                ✓ Completado
              </span>
            )}
          </div>
          <div className="dc-prog-bar">
            <div className="dc-prog-fill" style={{width:`${progresoDia}%`}} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="dc-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`dc-tab${tab===t.id?" on":""}`}
            onClick={() => setTab(t.id)}>{t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="dc-body">

        {tab === "ahora" && (() => {
          const incAbiertas = incidencias.filter(i => i.estado === "abierta");
          const incAltas    = incAbiertas.filter(i => i.gravedad === "alta");
          const puestosAlerta = puestos.map(p => {
            const asig = vols.filter(v => v.puestoId === p.id && v.enPuesto);
            return { ...p, presentes: asig.length, pct: p.necesarios > 0 ? asig.length / p.necesarios : 1 };
          }).filter(p => p.pct < 1).sort((a,b) => a.pct - b.pct);
          const tareaActual = tl.find(t => !tlDone(t) && t.hora >= hora) || tl.find(t => !tlDone(t));
          return (
            <div style={{ display:"flex", flexDirection:"column", gap:".75rem" }}>
              {/* Tarea actual del runbook */}
              {tareaActual ? (
                <div style={{
                  background:"linear-gradient(135deg,rgba(52,211,153,.12),rgba(34,211,238,.08))",
                  border:"2px solid rgba(52,211,153,.35)", borderRadius:12, padding:"1rem",
                }}>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:".6rem", color:"var(--green)",
                    fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", marginBottom:".35rem" }}>
                    ⏱ AHORA — {tareaActual.hora}
                  </div>
                  <div style={{ fontWeight:800, fontSize:"var(--fs-md)", lineHeight:1.3 }}>{tareaActual.titulo}</div>
                  {tareaActual.responsable && (
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)", marginTop:".3rem" }}>
                      👤 {tareaActual.responsable}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ background:"var(--green-dim)", border:"1px solid rgba(52,211,153,.3)",
                  borderRadius:10, padding:".75rem", textAlign:"center" }}>
                  <div style={{ color:"var(--green)", fontWeight:700 }}>✅ Runbook completado</div>
                </div>
              )}

              {/* Incidencias activas */}
              {incAbiertas.length > 0 && (
                <div style={{ background:"var(--red-dim)", border:"1px solid rgba(248,113,113,.3)",
                  borderRadius:10, padding:".75rem", cursor:"pointer" }}
                  onClick={() => setShowInc(true)}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:".35rem" }}>
                    <span style={{ fontWeight:700, color:"var(--red)", fontSize:"var(--fs-sm)" }}>
                      🚨 {incAbiertas.length} incidencia{incAbiertas.length!==1?"s":""} abierta{incAbiertas.length!==1?"s":""}
                    </span>
                    {incAltas.length > 0 && (
                      <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                        background:"var(--red)", color:"white", borderRadius:4, padding:".1rem .4rem" }}>
                        {incAltas.length} ALTA{incAltas.length!==1?"S":""}
                      </span>
                    )}
                  </div>
                  {incAbiertas.slice(0,2).map(i => (
                    <div key={i.id} style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                      color:"var(--text-muted)" }}>
                      · {i.descripcion.slice(0,70)}{i.descripcion.length>70?"...":""}
                    </div>
                  ))}
                </div>
              )}

              {/* Puestos sin cobertura */}
              {puestosAlerta.length > 0 && (
                <div style={{ background:"rgba(251,191,36,.08)", border:"1px solid rgba(251,191,36,.3)",
                  borderRadius:10, padding:".75rem", cursor:"pointer" }}
                  onClick={() => setTab("puestos")}>
                  <div style={{ fontWeight:700, color:"var(--amber)", marginBottom:".35rem", fontSize:"var(--fs-sm)" }}>
                    ⚠️ {puestosAlerta.length} puesto{puestosAlerta.length!==1?"s":""} sin cobertura completa
                  </div>
                  {puestosAlerta.slice(0,3).map(p => (
                    <div key={p.id} style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                      color:"var(--text-muted)" }}>
                      📍 {p.nombre} — {p.presentes}/{p.necesarios||"?"} presentes
                    </div>
                  ))}
                </div>
              )}

              {/* Todo OK */}
              {incAbiertas.length === 0 && puestosAlerta.length === 0 && (
                <div style={{ textAlign:"center", color:"var(--green)", fontFamily:"var(--font-mono)",
                  fontSize:"var(--fs-sm)", padding:"1rem 0" }}>
                  ✅ Sin alertas activas — todo operativo
                </div>
              )}

              {/* Resumen de presencia */}
              <div style={{ background:"var(--surface2)", border:"1px solid var(--border)",
                borderRadius:10, padding:".75rem", display:"flex", justifyContent:"space-around",
                cursor:"pointer" }}
                onClick={() => setTab("voluntarios")}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontWeight:800, fontSize:"var(--fs-xl)", color:"var(--green)" }}>{presentes}</div>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)" }}>En puesto</div>
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontWeight:800, fontSize:"var(--fs-xl)", color:"var(--amber)" }}>{confirmados.length - presentes}</div>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)" }}>Pendientes</div>
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontWeight:800, fontSize:"var(--fs-xl)", color:"var(--cyan)" }}>{confirmados.length}</div>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)" }}>Confirmados</div>
                </div>
              </div>
            </div>
          );
        })()}

        {tab === "timeline" && (
          <>
            {tl.length === 0 ? (
              <EmptyState icon="⏱" title="Sin entradas en el Runbook" sub="El Runbook es el guión hora a hora del día del evento. Añade entradas en Logística → Runbook." />
            ) : (
            <>
            {/* ── Reloj prominente en el Runbook ── */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              marginBottom:".75rem" }}>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"var(--fs-xs)",
                color:"var(--text-muted)" }}>
                {tl.filter(tlDone).length}/{tl.length} completados
              </div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontWeight:800,
                fontSize:"var(--fs-lg)", color:"var(--cyan)",
                letterSpacing:".08em",
                background:"rgba(34,211,238,.07)", border:"1px solid rgba(34,211,238,.2)",
                borderRadius:8, padding:".2rem .75rem", lineHeight:1.2 }}>
                {hora}
              </div>
            </div>
            {/* ── Próxima acción pendiente ── */}
            {proxima && !tlDone(proxima) && (
              <div style={{ marginBottom:".65rem", padding:".5rem .75rem", borderRadius:8,
                background:"rgba(251,191,36,.08)", border:"1px solid rgba(251,191,36,.25)",
                display:"flex", alignItems:"center", gap:".6rem" }}>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"var(--fs-xs)",
                  color:"var(--amber)", fontWeight:700, flexShrink:0 }}>
                  ⏭ {proxima.hora}
                </span>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"var(--fs-xs)",
                  color:"var(--text)", flex:1, overflow:"hidden",
                  textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {proxima.accion || proxima.titulo || proxima.label || "Próxima acción"}
                </span>
              </div>
            )}
            {tl.map(item => (
              <div key={item.id} className={`dc-row${tlDone(item)?" done":""}`}>
                <button className={`dc-chk${tlDone(item)?" on":""}`} onClick={() => toggleTl(item.id)}>
                  {tlDone(item) && <span style={{color:"#000",fontSize:"var(--fs-sm)",fontWeight:700}}>✓</span>}
                </button>
                <div className="flex-1">
                  <div style={{display:"flex",alignItems:"center",gap:".4rem",marginBottom:".15rem"}}>
                    <span className="dc-hora">
                      {item.hora}
                      {tlDone(item) && item.completadoEn && (
                        <span style={{ fontSize:"var(--fs-xs)", color:"var(--green)", display:"block", lineHeight:1.2, fontWeight:400 }}>✓{item.completadoEn}</span>
                      )}
                    </span>
                    <span style={{fontSize:"var(--fs-sm)"}}>{CAT_ICON[item.categoria]||"📌"}</span>
                  </div>
                  <div style={{fontWeight:700,fontSize:"var(--fs-base)",textDecoration:tlDone(item)?"line-through":"none",
                    color:tlDone(item)?"var(--text-dim)":"var(--text)"}}>{item.titulo}</div>
                  {item.descripcion && (
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-xs)",color:"var(--text-muted)",marginTop:".15rem",lineHeight:1.5}}>
                      {item.descripcion}
                    </div>
                  )}
                  {item.responsable && (
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-xs)",color:"var(--text-dim)",marginTop:".15rem"}}>
                      👤 {item.responsable}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </>
            )}
          </>
        )}

        {tab === "voluntarios" && (
          <>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-xs)",color:"var(--text-muted)",marginBottom:".5rem"}}>
              {presentes} presentes · {confirmados.length - presentes} pendientes
            </div>
            {/* ── Búsqueda rápida de voluntario ── */}
            <input
              type="search"
              className="inp inp-sm"
              placeholder="🔍 Buscar voluntario…"
              value={busPresencia}
              onChange={e => setBusPresencia(e.target.value)}
              style={{ marginBottom:".5rem", fontFamily:"'DM Mono',monospace",
                fontSize:"var(--fs-sm)", width:"100%" }}
            />
            {confirmados
              .filter(v => !busPresencia.trim() ||
                (v.nombre||"").toLowerCase().includes(busPresencia.toLowerCase()) ||
                (v.apellidos||"").toLowerCase().includes(busPresencia.toLowerCase()) ||
                (v.telefono||"").includes(busPresencia))
              .map(v => {
              const puesto = puestos.find(p => p.id === v.puestoId);
              return (
                <div key={v.id} className="dc-row">
                  <button className={`dc-chk${v.enPuesto?" on":""}`} onClick={() => toggleVol(v.id)}>
                    {v.enPuesto && <span style={{color:"#000",fontSize:"var(--fs-sm)",fontWeight:700}}>✓</span>}
                  </button>
                  <div className="flex-1">
                    <div style={{fontWeight:700,fontSize:"var(--fs-base)",color:v.enPuesto?"var(--green)":"var(--text)"}}>
                      {v.nombre}
                    </div>
                    <div className="mono-xs text-muted">
                      {puesto?.nombre || "Sin puesto"} · {v.telefono || "—"}
                    </div>
                  </div>
                  {v.talla && <span style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-xs)",
                    background:"var(--surface2)",border:"1px solid var(--border)",
                    borderRadius:4,padding:".1rem .35rem",color:"var(--text-muted)"}}>{v.talla}</span>}
                  {v.coche && <span title="Tiene coche">🚗</span>}
                </div>
              );
            })}
            {confirmados.length === 0 && <Empty msg="Sin voluntarios confirmados." />}
          </>
        )}

        {tab === "puestos" && (
          <>
            {puestos.map(p => {
              const asig = vols.filter(v => v.puestoId===p.id && v.estado==="confirmado");
              const pres = asig.filter(v => v.enPuesto).length;
              const color = pres >= (p.necesarios||1) ? "var(--green)" : pres > 0 ? "var(--amber)" : "var(--red)";
              // CONN-01: buscar localización maestra para mostrar icono y descripción
              const locMatch = locs.find(l => l.id === p.locId || l.nombre === p.nombre);
              const locIcons = {meta:"🎏",avituallamiento:"🍎",control:"📍",seguridad:"🦸",señalización:"⚠️",parking:"🅿️",sanidad:"🚑"};
              return (
                <div key={p.id} style={{padding:".7rem .85rem",borderRadius:10,
                  background:"var(--surface)",border:"1px solid var(--border)",
                  borderLeft:`3px solid ${color}`,marginBottom:".5rem"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:".3rem"}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:"var(--fs-base)"}}>{p.nombre}</div>
                      <div className="mono-xs text-muted">
                        {p.horaInicio}–{p.horaFin} · necesarios: {p.necesarios||1}
                      </div>
                      {/* CONN-01: descripción de la localización maestra si existe */}
                      {locMatch && (
                        <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--cyan)",marginTop:".15rem"}}>
                          {locIcons[locMatch.tipo]||"📌"} {locMatch.tipo} · {locMatch.descripcion}
                        </div>
                      )}
                    </div>
                    <span style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-base)",fontWeight:800,color,flexShrink:0}}>
                      {pres}/{asig.length}
                    </span>
                  </div>
                  {asig.map(v => (
                    <div key={v.id} style={{display:"flex",alignItems:"center",gap:".4rem",
                      padding:".2rem 0",borderTop:"1px solid var(--border)"}}>
                      <span style={{width:7,height:7,borderRadius:"50%",flexShrink:0,
                        background:v.enPuesto?"var(--green)":"var(--border)"}} />
                      <span style={{fontSize:"var(--fs-base)",flex:1,color:v.enPuesto?"var(--text)":"var(--text-muted)"}}>
                        {v.nombre}
                      </span>
                      {v.telefono && (
                        <a href={`tel:${v.telefono}`} style={{color:"var(--cyan)",fontSize:"var(--fs-base)",textDecoration:"none"}}>
                          📞
                        </a>
                      )}
                    </div>
                  ))}
                  {asig.length===0 && (
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-xs)",color:"var(--red)",marginTop:".25rem"}}>
                      ⚠ Sin voluntarios asignados
                    </div>
                  )}
                </div>
              );
            })}
            {puestos.length===0 && <Empty msg="Sin puestos. Añade en Voluntarios → Puestos." />}
          </>
        )}

        {tab === "contactos" && (
          <>
            <div style={{padding:".5rem .75rem",borderRadius:8,marginBottom:".65rem",
              background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",
              fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-sm)",color:"var(--red)",fontWeight:700}}>
              🚨 Emergencia grave → llama al 112 primero
            </div>
            {[...contactos]
              .sort((a,b) => ({emergencia:0,institucional:1,staff:2,proveedor:3}[a.tipo]??4)
                           - ({emergencia:0,institucional:1,staff:2,proveedor:3}[b.tipo]??4))
              .map(c => {
                const color = TIPO_COLOR[c.tipo] || "var(--text-muted)";
                return (
                  <div key={c.id} style={{display:"flex",alignItems:"center",gap:".65rem",
                    padding:".6rem .75rem",borderRadius:10,background:"var(--surface)",
                    border:"1px solid var(--border)",borderLeft:`3px solid ${color}`,marginBottom:".4rem"}}>
                    <div className="flex-1">
                      <div style={{fontWeight:700,fontSize:"var(--fs-base)"}}>{c.nombre}</div>
                      <div className="mono-xs text-muted">
                        {c.rol}{c.notas ? ` · ${c.notas}` : ""}
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:".2rem",flexShrink:0}}>
                      {c.telefono && (
                        <a href={`tel:${c.telefono}`} className="dc-tel"
                          style={{background:`${color}15`,border:`1px solid ${color}44`,color}}>
                          📞 {c.telefono}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            {contactos.length===0 && <Empty msg="Sin contactos. Añade en Logística → Emergencias." />}
          </>
        )}

        {tab === "checklist" && (
          <>
            {/* Solo mostrar fases relevantes para el día de carrera */}
            {(() => {
              const FASES_ORDEN = ["3 meses antes","2 meses antes","1 mes antes","Semana antes","Día antes","Mañana carrera","Post-carrera"];
              const dias = Math.ceil((getEventDate(config) - new Date()) / 86400000);
              const faseActiva = dias < 0 ? "Post-carrera" : dias <= 1 ? "Mañana carrera" : dias <= 2 ? "Día antes" : dias <= 7 ? "Semana antes" : null;
              // Mostrar solo fases a partir de "Semana antes" en DiaCarrera
              const FASES_DIA_D = ["Semana antes","Día antes","Mañana carrera","Post-carrera"];
              const fasesPresentes = [...new Set(ck.map(t=>t.fase))];
              const fasesAMostrar = fasesPresentes.filter(f => FASES_DIA_D.includes(f));
              const fasesOrdenadas = FASES_ORDEN.filter(f => fasesAMostrar.includes(f));
              if (fasesOrdenadas.length === 0) return (
                <Empty msg="Sin ítems para esta fase. Añade en Logística → Pre-operativo." />
              );
              return fasesOrdenadas.map(fase => {
              const items = ck.filter(t=>t.fase===fase);
              const comp  = items.filter(t=>t.estado==="completado").length;
              const esActiva = fase === faseActiva;
              return (
                <div key={fase}>
                  <div className="dc-sect" style={{color: esActiva ? "#22d3ee" : undefined}}>
                    {esActiva ? "● " : ""}{fase} · {comp}/{items.length}
                  </div>
                  {items.map(item => {
                    const hecho = item.estado === "completado";
                    return (
                      <div key={item.id} style={{display:"flex",alignItems:"flex-start",gap:".55rem",
                        padding:".5rem .65rem",borderRadius:8,marginBottom:".3rem",
                        background:hecho?"var(--surface2)":"var(--surface)",
                        border:`1px solid ${hecho?"rgba(52,211,153,.2)":"var(--border)"}`,
                        opacity:hecho?.6:1}}>
                        <button className={`dc-chk${hecho?" on":""}`}
                          onClick={() => toggleCk(item.id)}
                          style={{marginTop:".1rem"}}>
                          {hecho && <span style={{color:"#000",fontSize:"var(--fs-sm)",fontWeight:700}}>✓</span>}
                        </button>
                        <div style={{flex:1}}>
                          <div style={{fontSize:"var(--fs-base)",fontWeight:600,
                            textDecoration:hecho?"line-through":"none",
                            color:hecho?"var(--text-dim)":"var(--text)"}}>
                            {item.tarea}
                          </div>
                          {item.responsable && (
                            <div style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-xs)",
                              color:"var(--text-dim)",marginTop:".1rem"}}>
                              👤 {item.responsable}
                            </div>
                          )}
                        </div>
                        {item.prioridad==="alta" && !hecho && (
                          <span style={{fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-xs)",
                            color:"var(--red)",fontWeight:700,flexShrink:0}}>ALTA</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            }); // fin map fases
            })()}
            {ck.length===0 && <Empty msg="Sin ítems pre-operativos. Añade en Logística → Pre-operativo." />}
          </>
        )}

      </div>

      {/* ── FAB: botón flotante de incidencia rápida ─────────────────────── */}
      <button
        className="dc-fab"
        onClick={() => setShowInc(true)}
        title="Registrar incidencia urgente"
        aria-label="Registrar incidencia"
      >
        🚨
      </button>

      {/* ── Modal de incidencia rápida ───────────────────────────────────── */}
      {showInc && (
        <div className="dc-inc-backdrop" onClick={e => e.target===e.currentTarget && setShowInc(false)}>
          <div className="dc-inc-modal">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:".85rem" }}>
              <span style={{ fontWeight:800, fontSize:"var(--fs-md)" }}>🚨 Incidencia urgente</span>
              <button onClick={() => setShowInc(false)} style={{
                background:"none", border:"none", color:"var(--text-muted)",
                cursor:"pointer", fontSize:"var(--fs-md)", padding:".2rem",
              }}>✕</button>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".65rem", marginBottom:".65rem" }}>
              <div>
                <label style={{ display:"block", fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                  fontWeight:700, color:"var(--text-muted)", marginBottom:".3rem",
                  textTransform:"uppercase", letterSpacing:".04em" }}>Tipo</label>
                <select
                  value={incForm.tipo}
                  onChange={e => setIncForm(p => ({...p, tipo: e.target.value}))}
                  style={{ width:"100%", background:"var(--surface2)", border:"1px solid var(--border)",
                    borderRadius:8, color:"var(--text)", padding:".45rem .6rem",
                    fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)", outline:"none" }}
                >
                  {["médica","señalización","avituallamiento","corredor perdido","meteorológica","otra"]
                    .map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:"block", fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                  fontWeight:700, color:"var(--text-muted)", marginBottom:".3rem",
                  textTransform:"uppercase", letterSpacing:".04em" }}>Gravedad</label>
                <select
                  value={incForm.gravedad}
                  onChange={e => setIncForm(p => ({...p, gravedad: e.target.value}))}
                  style={{ width:"100%", background:"var(--surface2)", border:"1px solid var(--border)",
                    borderRadius:8, color:"var(--text)", padding:".45rem .6rem",
                    fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)", outline:"none" }}
                >
                  {[["baja","🟢"],["media","🟡"],["alta","🔴"]]
                    .map(([g, ic]) => <option key={g} value={g}>{ic} {g}</option>)}
                </select>
              </div>
            </div>

            {/* Selector de puesto */}
            <div style={{ marginBottom:".85rem" }}>
              <label style={{ display:"block", fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                fontWeight:700, color:"var(--text-muted)", marginBottom:".3rem",
                textTransform:"uppercase", letterSpacing:".04em" }}>Puesto (opcional)</label>
              <select
                value={incForm.puestoNombre}
                onChange={e => setIncForm(p => ({...p, puestoNombre: e.target.value}))}
                style={{ width:"100%", background:"var(--surface2)", border:"1px solid var(--border)",
                  borderRadius:8, color:"var(--text)", padding:".45rem .6rem",
                  fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)", outline:"none" }}
              >
                <option value="— Sin puesto específico">— Sin puesto específico</option>
                {puestos.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
              </select>
            </div>

            <div style={{ marginBottom:".85rem" }}>
              <label style={{ display:"block", fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                fontWeight:700, color:"var(--text-muted)", marginBottom:".3rem",
                textTransform:"uppercase", letterSpacing:".04em" }}>Descripción *</label>
              <textarea
                value={incForm.descripcion}
                onChange={e => setIncForm(p => ({...p, descripcion: e.target.value}))}
                placeholder="Qué ha pasado, dónde, quién está implicado…"
                rows={3}
                style={{ width:"100%", background:"var(--surface2)", border:"1px solid var(--border)",
                  borderRadius:8, color:"var(--text)", padding:".55rem .7rem",
                  fontFamily:"var(--font-mono)", fontSize:"var(--fs-base)", outline:"none",
                  resize:"vertical", boxSizing:"border-box",
                  borderColor: !incForm.descripcion.trim() && incGuardado ? "var(--red)" : undefined }}
              />
            </div>

            <button
              onClick={guardarIncidencia}
              disabled={incGuardado}
              style={{
                width:"100%", padding:".7rem", borderRadius:10,
                background: incGuardado ? "var(--green)" : "rgba(248,113,113,0.9)",
                border:"none", color:"#fff", fontFamily:"var(--font-mono)",
                fontSize:"var(--fs-base)", fontWeight:800, cursor: incGuardado ? "default" : "pointer",
                transition:"background .2s",
              }}
            >
              {incGuardado ? "✓ Incidencia registrada" : "🚨 Registrar incidencia"}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modal, document.body);
}

function Empty({ msg }) {
  return (
    <div style={{textAlign:"center",padding:"3rem 1rem",color:"var(--text-muted)",
      fontFamily:"'DM Mono',monospace",fontSize:"var(--fs-base)"}}>
      {msg}
    </div>
  );
}
