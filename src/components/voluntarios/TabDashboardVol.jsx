// Auto-extracted from Voluntarios.jsx — Sprint 2 refactor
import { useState, useMemo } from "react";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { coverageColor, coverageClass } from "@/constants/thresholds";

// Aliases locales para retrocompatibilidad con el código existente del componente
const colorCobertura = coverageColor;
const badgeCobertura = coverageClass;

// Déficit absoluto: cuántas personas faltan para alcanzar el mínimo necesario
function deficitAbsoluto(p) {
  return Math.max(0, (p.necesarios || 0) - (p.confirmados || 0));
}

// ─── TAB DASHBOARD ────────────────────────────────────────────────────────────
function TabDashboard({ stats, puestosConStats, voluntarios, setTab, onEditarVol, onEditarPuesto, sugerenciasReubicacion = [], onReasignar }) {
  const [alertasColapsadas,  setAlertasColapsadas]  = useState(true);
  const [sinPuestoColapsado, setSinPuestoColapsado] = useState(false);
  const [soloPuestosIncompletos, setSoloPuestosIncompletos] = useState(false);

  // Puestos con cobertura insuficiente, ordenados por DÉFICIT ABSOLUTO descendente
  const alertas = useMemo(() =>
    puestosConStats
      .filter(p => p.coberturaConf < 50)
      .sort((a, b) => deficitAbsoluto(b) - deficitAbsoluto(a)),
    [puestosConStats]
  );

  // Puestos incompletos (<100%) para la card de cobertura
  const puestosIncompletos = useMemo(() =>
    puestosConStats
      .filter(p => p.coberturaConf < 100)
      .sort((a, b) => deficitAbsoluto(b) - deficitAbsoluto(a)),
    [puestosConStats]
  );

  const puestosVista = soloPuestosIncompletos ? puestosIncompletos : puestosConStats;
  const totalDeficit = useMemo(
    () => puestosConStats.reduce((s, p) => s + deficitAbsoluto(p), 0),
    [puestosConStats]
  );

  // Pendientes de confirmar (para acción rápida)
  const pendientesConfirmar = useMemo(
    () => voluntarios.filter(v => v.estado === "pendiente"),
    [voluntarios]
  );

  // Card secundaria: sin puesto o pendientes
  const sinPuestoAll = useMemo(
    () => voluntarios.filter(v => !v.puestoId && v.estado !== "cancelado"),
    [voluntarios]
  );
  const pendConfLista = useMemo(
    () => [...pendientesConfirmar]
      .sort((a, b) => (a.fechaRegistro || "").localeCompare(b.fechaRegistro || ""))
      .slice(0, 10),
    [pendientesConfirmar]
  );

  const listaSecundaria  = sinPuestoAll.length > 0 ? sinPuestoAll : pendConfLista;
  const tituloSecundario = sinPuestoAll.length > 0
    ? `📍 Sin puesto asignado (${sinPuestoAll.length})`
    : `⏳ Pendientes de confirmar (${pendConfLista.length})`;

  return (
    <>
      {/* ── KPI grid ──────────────────────────────────────────────────────── */}
      <div className="kpi-grid">

        {/* Cobertura global */}
        <div
          className={`kpi cursor-ptr ${badgeCobertura(stats.coberturaGlobal)}`}
          onClick={() => setTab("puestos")}
        >
          <div className="kpi-label" style={{ display:"flex", alignItems:"center", gap:4 }}>
            🎯 Cobertura global
            <Tooltip text={"Voluntarios confirmados ÷ plazas necesarias en todos los puestos.\n100% = todos los puestos cubiertos por voluntarios confirmados."}>
              <TooltipIcon size={11}/>
            </Tooltip>
          </div>
          <div className="kpi-value" style={{ color: colorCobertura(stats.coberturaGlobal) }}>
            {stats.coberturaGlobal}%
          </div>
          <div className="kpi-sub">{stats.confirmados}/{stats.totalNecesarios} confirmados</div>
          {/* C1.3: barra de progreso usando el sistema kpi-progress de blocks.css */}
          <div className="kpi-progress">
            <div className="kpi-progress-fill" style={{
              width: `${Math.min(stats.coberturaGlobal, 100)}%`,
              background: colorCobertura(stats.coberturaGlobal),
              boxShadow: `0 0 6px ${colorCobertura(stats.coberturaGlobal)}80`,
            }}/>
          </div>
        </div>

        {/* Total voluntarios */}
        <div className="kpi cyan cursor-ptr" onClick={() => setTab("voluntarios")}>
          <div className="kpi-label" style={{ display:"flex", alignItems:"center", gap:4 }}>
            👥 Total voluntarios
            <Tooltip text={"Total de voluntarios registrados en el sistema, independientemente de su estado.\nIncluye confirmados, pendientes y cancelados."}>
              <TooltipIcon size={11}/>
            </Tooltip>
          </div>
          <div className="kpi-value" style={{ color:"var(--cyan)" }}>{stats.total}</div>
          <div className="kpi-sub">
            <span style={{ color:"var(--green)" }}>{stats.confirmados} ✓</span>
            {" · "}
            <span style={{ color:"var(--amber)" }}>{stats.pendientes} ⏳</span>
            {stats.cancelados > 0 && <>{" · "}<span style={{ color:"var(--red)" }}>{stats.cancelados} ✕</span></>}
          </div>
        </div>

        {/* Pendientes de confirmar — KPI accionable */}
        <div
          className={`kpi cursor-ptr ${pendientesConfirmar.length > 0 ? "amber" : "green"}`}
          onClick={() => setTab("voluntarios")}
          title="Ver pendientes de confirmar"
        >
          <div className="kpi-label" style={{ display:"flex", alignItems:"center", gap:4 }}>
            ⏳ Pendientes de confirmar
            <Tooltip text={"Voluntarios registrados que aún no han sido confirmados.\nConfírmalos para que cuenten en la cobertura de puestos."}>
              <TooltipIcon size={11}/>
            </Tooltip>
          </div>
          <div className="kpi-value" style={{ color: pendientesConfirmar.length > 0 ? "var(--amber)" : "var(--green)" }}>
            {pendientesConfirmar.length}
          </div>
          <div className="kpi-sub">
            {pendientesConfirmar.length > 0
              ? <span style={{ color:"var(--amber)" }}>Requieren confirmación</span>
              : <span style={{ color:"var(--green)" }}>✓ Todos confirmados</span>
            }
          </div>
        </div>

        {/* Puestos */}
        <div
          className={`kpi cursor-ptr ${alertas.length > 0 ? "red" : "violet"}`}
          onClick={() => setTab("puestos")}
        >
          <div className="kpi-label" style={{ display:"flex", alignItems:"center", gap:4 }}>
            📍 Puestos
            <Tooltip text={"Número de puestos operativos definidos para el evento.\nCada puesto tiene un número de voluntarios necesarios y un horario asignado."}>
              <TooltipIcon size={11}/>
            </Tooltip>
          </div>
          <div className="kpi-value" style={{ color: alertas.length > 0 ? "var(--red)" : "var(--violet)" }}>
            {puestosConStats.length}
          </div>
          <div className="kpi-sub">
            {alertas.length > 0
              ? `${alertas.length} con cobertura insuficiente`
              : `${puestosConStats.filter(p => p.coberturaConf >= 100).length} al 100%`
            }
          </div>
        </div>

        {/* Con vehículo */}
        <div
          className="kpi amber cursor-ptr"
          onClick={() => setTab("voluntarios")}
          title="Ver voluntarios con vehículo"
        >
          <div className="kpi-label" style={{ display:"flex", alignItems:"center", gap:4 }}>
            🚗 Con vehículo
            <Tooltip text={"Voluntarios confirmados que han indicado disponer de vehículo propio.\nÚtil para planificar rutas de reparto y acceso a puestos remotos."}>
              <TooltipIcon size={11}/>
            </Tooltip>
          </div>
          <div className="kpi-value" style={{ color:"var(--amber)" }}>{stats.conCoche}</div>
          <div className="kpi-sub">
            {stats.total > 0 ? Math.round(stats.conCoche / stats.total * 100) : 0}% del total
          </div>
        </div>

        {/* En su puesto — solo visible el día D */}
        {stats.enPuesto > 0 && (
          <div className="kpi green cursor-ptr" onClick={() => setTab("dia-d")} title="Ver checklist día de carrera">
            <div className="kpi-label" style={{ display:"flex", alignItems:"center", gap:4 }}>📍 En su puesto</div>
            <div className="kpi-value" style={{ color:"var(--green)" }}>{stats.enPuesto}</div>
            <div className="kpi-sub">
              {stats.confirmados > 0 ? Math.round(stats.enPuesto / stats.confirmados * 100) : 0}% de confirmados
            </div>
          </div>
        )}
      </div>

      {/* ── Alerta puestos con cobertura insuficiente ─────────────────────── */}
      {alertas.length > 0 && (
        <div style={{ borderRadius:10, overflow:"hidden", marginBottom:".85rem",
          border:"1px solid rgba(248,113,113,.25)", background:"var(--red-dim)" }}>
          <button
            onClick={() => setAlertasColapsadas(v => !v)}
            style={{ width:"100%", display:"flex", alignItems:"center", gap:".65rem",
              padding:".6rem .85rem", background:"transparent", border:"none",
              cursor:"pointer", textAlign:"left",
              borderBottom: alertasColapsadas ? "none" : "1px solid rgba(248,113,113,.2)" }}
          >
            <span style={{ width:8, height:8, borderRadius:"50%",
              background:"var(--red)", flexShrink:0, display:"inline-block" }}/>
            <span style={{ fontFamily:"var(--font-mono)", fontWeight:700, fontSize:"var(--fs-sm)",
              color:"var(--red)", flex:1 }}>
              ⚠️ Puestos con cobertura insuficiente — {totalDeficit} persona{totalDeficit !== 1 ? "s" : ""} faltan
            </span>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
              color:"var(--red)", padding:".1rem .4rem", borderRadius:20,
              background:"rgba(248,113,113,.15)" }}>
              {alertas.length}
            </span>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
              color:"rgba(248,113,113,.6)", flexShrink:0,
              transform: alertasColapsadas ? "rotate(-90deg)" : "rotate(0deg)",
              transition:"transform .18s" }}>▼</span>
          </button>
          {!alertasColapsadas && (
            <div style={{ padding:".35rem .85rem .6rem" }}>
              {/* Cabecera columnas */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:".2rem .3rem", marginBottom:".15rem",
                fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-dim)" }}>
                <span>Puesto</span>
                <span>Faltan · conf/nec · %</span>
              </div>
              {alertas.map(p => {
                const deficit = deficitAbsoluto(p);
                return (
                  <div key={p.id}
                    onClick={() => onEditarPuesto(p)}
                    title="Click para abrir ficha del puesto"
                    style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                      padding:".3rem .3rem", borderBottom:"1px solid rgba(248,113,113,0.1)",
                      fontSize:"var(--fs-base)", cursor:"pointer", borderRadius:4, transition:"background .12s" }}
                    onMouseEnter={e => e.currentTarget.style.background="rgba(248,113,113,.08)"}
                    onMouseLeave={e => e.currentTarget.style.background="transparent"}
                  >
                    <span>{p.nombre}</span>
                    <div style={{ display:"flex", alignItems:"center", gap:".5rem" }}>
                      {/* Déficit absoluto destacado */}
                      <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
                        fontWeight:800, color:"var(--red)",
                        background:"rgba(248,113,113,.15)", border:"1px solid rgba(248,113,113,.25)",
                        borderRadius:4, padding:"0 .4rem" }}>
                        -{deficit}
                      </span>
                      <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                        color:"var(--text-muted)" }}>
                        {p.confirmados}/{p.necesarios} · {p.coberturaConf}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Grid principal ────────────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".85rem" }}>

        {/* Card cobertura por puesto */}
        <div className="card">
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:".5rem" }}>
            <div className="card-title" style={{ marginBottom:0 }}>📍 Cobertura por puesto</div>
            <div style={{ display:"flex", gap:".3rem" }}>
              <button
                className={`btn btn-sm ${soloPuestosIncompletos ? "btn-cyan" : "btn-ghost"}`}
                style={{ fontSize:"var(--fs-xs)", padding:".2rem .5rem" }}
                onClick={() => setSoloPuestosIncompletos(v => !v)}
                title={soloPuestosIncompletos ? "Ver todos los puestos" : "Ver solo puestos incompletos"}
              >
                {soloPuestosIncompletos ? "⊡ Todos" : "⚠ Incompletos"}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize:"var(--fs-xs)", padding:".2rem .5rem" }}
                onClick={() => setTab("puestos")}
              >
                Ver todos →
              </button>
            </div>
          </div>

          {puestosVista.length === 0 ? (
            <div style={{ textAlign:"center", padding:"1.2rem 0",
              fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)", color:"var(--green)" }}>
              ✅ Todos los puestos al 100%
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:".55rem" }}>
              {puestosVista.slice(0, 8).map(p => {
                const pct   = Math.min(p.coberturaConf, 100);
                const color = colorCobertura(pct);
                const def   = deficitAbsoluto(p);
                return (
                  <div key={p.id} className="cursor-ptr"
                    onClick={() => onEditarPuesto(p)}
                    title="Click para abrir ficha del puesto"
                  >
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:".2rem", alignItems:"center" }}>
                      <span style={{ fontSize:"var(--fs-sm)", color:"var(--text)", flex:1, minWidth:0,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {p.nombre}
                      </span>
                      <div style={{ display:"flex", alignItems:"center", gap:".4rem", flexShrink:0 }}>
                        {def > 0 && (
                          <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                            fontWeight:800, color:"var(--red)",
                            background:"rgba(248,113,113,.12)", borderRadius:3, padding:"0 .3rem" }}>
                            -{def}
                          </span>
                        )}
                        <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color }}>
                          {p.confirmados}/{p.necesarios}
                          {(p.totalAsignados - p.confirmados) > 0 && (
                            <span style={{ color:"var(--text-muted)", marginLeft:".25rem" }}>
                              · {p.totalAsignados - p.confirmados} pend.
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="prog-bar">
                      <div className="prog-fill" style={{ width:`${pct}%`, background:color }}/>
                    </div>
                  </div>
                );
              })}
              {puestosVista.length > 8 && (
                <button className="btn btn-ghost" style={{ fontSize:"var(--fs-sm)", marginTop:".15rem" }}
                  onClick={() => setTab("puestos")}>
                  Ver {puestosVista.length - 8} más →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Card sin puesto / pendientes + acción rápida confirmar */}
        <div className="card">
          {listaSecundaria.length === 0 ? (
            <div style={{ textAlign:"center", padding:"1.5rem 0",
              fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)", color:"var(--green)" }}>
              ✅ Todos asignados y confirmados
            </div>
          ) : (
            <>
              <button
                onClick={() => setSinPuestoColapsado(v => !v)}
                style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                  width:"100%", background:"none", border:"none", cursor:"pointer", padding:0,
                  marginBottom: sinPuestoColapsado ? 0 : ".4rem" }}
              >
                <div className="card-title" style={{ marginBottom:0 }}>{tituloSecundario}</div>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
                  color:"var(--text-dim)", transition:"transform .18s",
                  transform: sinPuestoColapsado ? "rotate(-90deg)" : "rotate(0deg)" }}>▼</span>
              </button>

              {/* Botón confirmar todos — solo cuando la lista muestra pendientes */}
              {!sinPuestoColapsado && sinPuestoAll.length === 0 && pendConfLista.length > 0 && (
                <div style={{ display:"flex", gap:".4rem", marginBottom:".5rem", flexWrap:"wrap" }}>
                  <button
                    className="btn btn-green btn-sm"
                    style={{ fontSize:"var(--fs-xs)" }}
                    onClick={() => {
                      const ids = pendientesConfirmar.map(v => v.id);
                      if (typeof onReasignar === "function") {
                        // Reutilizamos onReasignar solo para navegar — el confirm masivo se hace desde la tab
                      }
                      setTab("voluntarios");
                    }}
                  >
                    ✓ Ver y confirmar todos ({pendientesConfirmar.length})
                  </button>
                </div>
              )}

              {!sinPuestoColapsado && (
                <div style={{ display:"flex", flexDirection:"column", gap:".35rem" }}>
                  {listaSecundaria.map(v => (
                    <div key={v.id}
                      onClick={() => onEditarVol(v)}
                      title="Click para abrir ficha"
                      style={{ display:"flex", alignItems:"center", gap:".5rem",
                        padding:".3rem .25rem", borderBottom:"1px solid rgba(30,45,80,0.3)",
                        cursor:"pointer", borderRadius:4, transition:"background .12s" }}
                      onMouseEnter={e => e.currentTarget.style.background="var(--surface2)"}
                      onMouseLeave={e => e.currentTarget.style.background="transparent"}
                    >
                      <div style={{ position:"relative", width:26, height:26, flexShrink:0 }}>
                        <div style={{ width:26, height:26, borderRadius:"50%",
                          background:"var(--surface2)", border:"1px solid var(--border)",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:"var(--fs-xs)", fontWeight:700, color:"var(--cyan)" }}>
                          {[v.nombre, v.apellidos].filter(Boolean).map(n => n[0]).slice(0,2).join("") || "V"}
                        </div>
                        <span style={{ position:"absolute", bottom:0, right:0,
                          width:8, height:8, borderRadius:"50%",
                          background: v.estado==="confirmado" ? "var(--green)" : v.estado==="cancelado" ? "var(--red)" : "var(--amber)",
                          border:"1.5px solid var(--surface)", display:"block" }}
                          title={v.estado}
                        />
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:".74rem", fontWeight:600,
                          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {v.nombre||"Sin nombre"}{v.apellidos ? (" "+v.apellidos) : ""}
                        </div>
                        <div style={{ fontFamily:"var(--font-mono)", fontSize:".56rem",
                          color:"var(--text-muted)" }}>{v.telefono||"—"}</div>
                      </div>
                      <span className={`badge badge-${v.estado==="confirmado"?"green":v.estado==="cancelado"?"red":"amber"}`}>
                        {v.estado}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Tallas ────────────────────────────────────────────────────────── */}
      {Object.values(stats.tallasCount || {}).some(n => n > 0) && (
        <div className="card" style={{ marginTop:".85rem" }}>
          <div className="card-title" style={{ marginBottom:".6rem", justifyContent:"space-between" }}>
            <span>
              👕 Tallas de voluntarios
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                color:"var(--text-dim)", fontWeight:400, marginLeft:".5rem" }}>
                (excluye cancelados)
              </span>
            </span>
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize:"var(--fs-xs)", padding:".2rem .5rem" }}
              onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate", { detail: { block:"camisetas" } }))}
            >
              Ver en Camisetas →
            </button>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:".35rem" }}>
            {Object.entries(stats.tallasCount || {})
              .filter(([, n]) => n > 0)
              .map(([talla, n]) => (
                <div key={talla} style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
                  padding:".2rem .6rem", borderRadius:6,
                  background:"var(--surface2)", border:"1px solid var(--border)",
                  display:"flex", gap:".4rem", alignItems:"center" }}>
                  <span style={{ color:"var(--text-muted)" }}>{talla}</span>
                  <span style={{ fontWeight:800, color:"var(--cyan)" }}>{n}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </>
  );
}


// Exports
export { TabDashboard };
