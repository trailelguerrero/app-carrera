import { createPortal } from "react-dom";
import EmptyState from "@/components/EmptyState";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import SkeletonBlock from "@/components/common/SkeletonBlock";
import TabGestiones from "@/components/documentos/TabGestiones";
import TabSubvenciones from "@/components/documentos/TabSubvenciones";
import { VisorModal } from "@/components/documentos/VisorModal";
import { DeleteConfirmModal } from "@/components/documentos/DeleteConfirmModal";
import { UploadZone } from "@/components/documentos/UploadZone";
import { useDocumentos } from "@/hooks/useDocumentos";
import {
  CATEGORIAS, CAT_GESTIONES, TODAS_CATEGORIAS,
  ESTADOS_DOC, getEstadoCfg, getFileIcon,
  formatSize, formatDate, formatImporte, diasHasta,
  SUBCATEGORIAS,
} from "@/constants/documentosConstants";

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function Documentos() {
  const {
    docs, gestiones, subvenciones,
    tab, setTab,
    dragOver, uploading,
    subcat, setSubcat,
    nota, setNota,
    descripcionDoc, setDescripcionDoc,
    estadoNuevo, setEstadoNuevo,
    vencNuevo, setVencNuevo,
    emisorNuevo, setEmisorNuevo,
    importeNuevo, setImporteNuevo,
    busqueda, setBusqueda,
    busqGlobal, setBusqGlobal,
    uploadOpen, setUploadOpen,
    editId, setEditId,
    gEditId, setGEditId,
    svEditId, setSvEditId,
    nuevoLog, setNuevoLog,
    delConfirm, setDelConfirm,
    uploadError, setUploadError,
    editForm, setEditForm,
    visorDoc, setVisorDoc,
    isLoading, config,
    handleFiles, handleDrop, handleDragOver, handleDragLeave,
    deleteDoc, confirmarDelete, downloadDoc, viewDoc,
    startEdit, saveEdit, updateEstado,
    saveGestiones, saveSubvenciones,
    addLogEntry,
    gestionesProxVencer, gestionesVencidas, gestionesCriticas,
    semaforoRiesgo, proxVencer, vencidos,
    resultadosGlobales, catDocs,
    totalSize, storagePct,
  } = useDocumentos();

  const isGestion    = tab === "gestiones";
  const isSubvencion = tab === "subvenciones";
  const catInfo      = CATEGORIAS.find(c => c.id === tab);
  const catInfoSafe  = catInfo || { id: tab, icon: "📄", label: tab, color: "#94a3b8" };
  const storageColor = storagePct > 80 ? "#f87171" : storagePct > 50 ? "#fbbf24" : "#34d399";

  if (isLoading) return <SkeletonBlock variant="documentos" />;

  return (
    <>
      <div className="block-container">

        {/* ── HEADER ── */}
        <div className="block-header">
          <div>
            <h1 className="block-title">📁 Documentos</h1>
            <div className="block-title-sub">{config.nombre} {config.edicion} · Gestión documental</div>
          </div>
          <div className="block-actions">
            <span title={
              semaforoRiesgo === "verde" ? "✅ Permisos críticos OK (Ayuntamiento, RFEA, Seguro RC)" :
              semaforoRiesgo === "ambar" ? "⚠️ Algún permiso crítico pendiente o próximo a vencer" :
              "🚨 Permiso crítico denegado o vencido — revisar urgente"
            } style={{
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700, cursor: "help",
              color: semaforoRiesgo === "verde" ? "var(--green)" : semaforoRiesgo === "ambar" ? "var(--amber)" : "var(--red)",
              background: semaforoRiesgo === "verde" ? "var(--green-dim)" : semaforoRiesgo === "ambar" ? "rgba(251,191,36,.15)" : "var(--red-dim)",
              border: `1px solid ${semaforoRiesgo === "verde" ? "rgba(52,211,153,.3)" : semaforoRiesgo === "ambar" ? "rgba(251,191,36,.3)" : "rgba(248,113,113,.3)"}`,
              borderRadius: 6, padding: ".2rem .55rem",
            }}>
              {semaforoRiesgo === "verde" ? "✅ Permisos OK" : semaforoRiesgo === "ambar" ? "⚠️ Atención" : "🚨 Riesgo legal"}
            </span>
            {(vencidos.length + gestionesVencidas.length + gestionesCriticas.length) > 0 && (
              <span className="badge badge-red">
                ⚠️ {vencidos.length + gestionesVencidas.length + gestionesCriticas.length} urgente{(vencidos.length + gestionesVencidas.length + gestionesCriticas.length) > 1 ? "s" : ""}
              </span>
            )}
            {proxVencer.length > 0 && (
              <span className="badge badge-amber" title={`Vencen pronto: ${proxVencer.map(d => d.nombre).join(", ")}`}>
                ⏰ {proxVencer.length} próximo{proxVencer.length > 1 ? "s" : ""}
              </span>
            )}
            <span className="badge badge-cyan">{docs.length} doc{docs.length !== 1 ? "s" : ""}</span>

            <div className="doc-search">
              <span style={{ opacity: .5, fontSize: "var(--fs-base)", flexShrink: 0 }}>🔍</span>
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar documentos…"
              />
              <button
                onClick={() => setBusqGlobal(v => !v)}
                title={busqGlobal ? "Buscar solo en esta categoría" : "Buscar en todas las categorías"}
                style={{
                  background: busqGlobal ? "var(--cyan-dim)" : "var(--surface3)",
                  border: busqGlobal ? "1px solid rgba(34,211,238,0.3)" : "1px solid var(--border)",
                  color: busqGlobal ? "var(--cyan)" : "var(--text-muted)",
                  cursor: "pointer", fontSize: "var(--fs-xs)", padding: ".12rem .4rem",
                  borderRadius: 4, fontFamily: "var(--font-mono)",
                  whiteSpace: "nowrap", flexShrink: 0, transition: "all .15s",
                }}>
                {busqGlobal ? "🌐" : "📁"}
              </button>
              {busqueda && (
                <button onClick={() => { setBusqueda(""); setBusqGlobal(false); }}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "var(--fs-sm)", padding: 0 }}>✕</button>
              )}
            </div>
          </div>
        </div>

        {/* ── PANEL DE ALERTAS UNIFICADO ── sticky cuando hay críticos */}
        {(gestionesCriticas.length > 0 || gestionesVencidas.length > 0 ||
          vencidos.length > 0 || gestionesProxVencer.length > 0 || proxVencer.length > 0) && (() => {
          const hayCriticos = gestionesCriticas.length > 0 || gestionesVencidas.length > 0 || vencidos.length > 0;
          const items = [
            ...gestionesCriticas.map(g => ({
              id: "g" + g.id, icon: "🚫", nombre: g.nombre, color: "var(--red)",
              bg: "var(--red-dim)", border: "rgba(248,113,113,.2)",
              etiqueta: "Denegado", accion: () => { setTab("gestiones"); setGEditId(g.id); }, btnLabel: "Actualizar"
            })),
            ...gestionesVencidas.map(g => ({
              id: "gv" + g.id, icon: "⚠️", nombre: g.nombre, color: "var(--red)",
              bg: "var(--red-dim)", border: "rgba(248,113,113,.2)",
              etiqueta: `Venció ${formatDate(g.fechaVencimiento)}`,
              accion: () => { setTab("gestiones"); setGEditId(g.id); }, btnLabel: "Actualizar"
            })),
            ...vencidos.map(d => ({
              id: "d" + d.id, icon: CATEGORIAS.find(c => c.id === d.categoria)?.icon || "📄",
              nombre: d.nombreDisplay || d.nombre, color: "var(--red)",
              bg: "var(--red-dim)", border: "rgba(248,113,113,.2)",
              etiqueta: `Venció ${formatDate(d.fechaVencimiento)}`,
              accion: () => { setTab(d.categoria); startEdit(d); }, btnLabel: "Actualizar"
            })),
            ...gestionesProxVencer.map(g => {
              const dias = diasHasta(g.fechaVencimiento);
              return {
                id: "gp" + g.id, icon: "⏰", nombre: g.nombre, color: "var(--amber)",
                bg: "var(--amber-dim)", border: "rgba(251,191,36,.2)",
                etiqueta: dias === 0 ? "Hoy" : `en ${dias}d`,
                accion: () => { setTab("gestiones"); setGEditId(g.id); }, btnLabel: "Ver"
              };
            }),
            ...proxVencer.map(d => {
              const dias = diasHasta(d.fechaVencimiento);
              return {
                id: "dp" + d.id, icon: CATEGORIAS.find(c => c.id === d.categoria)?.icon || "📄",
                nombre: d.nombreDisplay || d.nombre, color: "var(--amber)",
                bg: "var(--amber-dim)", border: "rgba(251,191,36,.2)",
                etiqueta: dias === 0 ? "Hoy" : `en ${dias}d`,
                accion: () => { setTab(d.categoria); }, btnLabel: "Ver"
              };
            }),
          ];
          return (
            <div className="card mb" style={{
              padding: ".7rem .9rem",
              position: hayCriticos ? "sticky" : "relative",
              top: hayCriticos ? "0" : "auto",
              zIndex: hayCriticos ? 15 : "auto",
              boxShadow: hayCriticos ? "0 4px 16px rgba(248,113,113,.15), 0 2px 4px rgba(0,0,0,.3)" : "none",
              borderColor: hayCriticos ? "rgba(248,113,113,.35)" : "var(--border)",
            }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
                color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: ".45rem" }}>
                ⚠️ Requieren atención · {items.length} elemento{items.length !== 1 ? "s" : ""}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: ".25rem" }}>
                {items.map(item => (
                  <div key={item.id} style={{
                    display: "flex", alignItems: "center", gap: ".5rem",
                    padding: ".28rem .55rem", borderRadius: 6,
                    background: item.bg, border: `1px solid ${item.border}` }}>
                    <span style={{ fontSize: "var(--fs-base)", flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                      fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.nombre}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                      color: item.color, fontWeight: 700, flexShrink: 0 }}>
                      {item.etiqueta}
                    </span>
                    <button
                      style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                        padding: ".1rem .35rem", borderRadius: 4,
                        border: `1px solid ${item.color}44`,
                        background: `${item.color}15`,
                        color: item.color, cursor: "pointer", flexShrink: 0 }}
                      onClick={item.accion}>
                      {item.btnLabel}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── Semáforo documental ── */}
        {(() => {
          const dias30 = (iso) => { const d = diasHasta(iso); return d != null && d >= 0 && d <= 30; };
          const permDocs = docs.filter(d => d.categoria === "permisos");
          const permOk   = permDocs.filter(d => ["aprobado", "vigente"].includes(d.estado)).length;
          const permWarn = permDocs.filter(d => d.fechaVencimiento && dias30(d.fechaVencimiento) && !["aprobado", "vigente"].includes(d.estado)).length;
          const segDocs  = docs.filter(d => d.categoria === "seguros");
          const segOk    = segDocs.filter(d => ["aprobado", "vigente"].includes(d.estado)).length;
          const segWarn  = segDocs.filter(d => d.fechaVencimiento && dias30(d.fechaVencimiento) && !["aprobado", "vigente"].includes(d.estado)).length;
          const gestVenc = gestiones.filter(g => g.estado === "denegado" || (g.fechaVencimiento && diasHasta(g.fechaVencimiento) != null && diasHasta(g.fechaVencimiento) < 0 && !["aprobado", "vigente"].includes(g.estado))).length;
          const gestCrit = gestiones.filter(g => g.fechaVencimiento && dias30(g.fechaVencimiento) && !["aprobado", "vigente"].includes(g.estado)).length;
          const gestOk   = gestiones.filter(g => ["aprobado", "vigente"].includes(g.estado)).length;
          const svConcedidas  = subvenciones.filter(sv => ["concedida", "justificada", "cerrada"].includes(sv.estado));
          const svTotal       = svConcedidas.reduce((s, sv) => s + (parseFloat(String(sv.importeConcedido || "").replace(",", ".")) || 0), 0);
          const gestConActividad = gestiones.filter(g => g.estado !== "pendiente" || g.fechaSubida || g.url || g.responsable).length;
          const hayAlgo = permDocs.length > 0 || segDocs.length > 0 || gestConActividad > 0 || subvenciones.length > 0;
          if (!hayAlgo) return null;
          const semItems = [
            permDocs.length > 0 && { icon: "📋", label: "Permisos", color: permWarn > 0 ? "#fbbf24" : permOk > 0 ? "#34d399" : "#94a3b8", dot: permWarn > 0 ? "🟡" : permOk > 0 ? "🟢" : "⚪", detail: permOk > 0 ? `${permOk}/${permDocs.length} aprobados` : `${permDocs.length} pendiente${permDocs.length > 1 ? "s" : ""}`, warn: permWarn > 0 ? `⏰ ${permWarn} por vencer` : null, onClick: () => setTab("permisos") },
            segDocs.length > 0 && { icon: "🛡️", label: "Seguros", color: segWarn > 0 ? "#fbbf24" : segOk > 0 ? "#34d399" : "#94a3b8", dot: segWarn > 0 ? "🟡" : segOk > 0 ? "🟢" : "⚪", detail: segOk > 0 ? `${segOk}/${segDocs.length} vigentes` : `${segDocs.length} pendiente${segDocs.length > 1 ? "s" : ""}`, warn: segWarn > 0 ? `⏰ ${segWarn} por vencer` : null, onClick: () => setTab("seguros") },
            gestiones.length > 0 && { icon: "🏛️", label: "Gestiones", color: gestVenc > 0 ? "#f87171" : gestCrit > 0 ? "#fbbf24" : gestOk > 0 ? "#34d399" : "#94a3b8", dot: gestVenc > 0 ? "🔴" : gestCrit > 0 ? "🟡" : gestOk > 0 ? "🟢" : "⚪", detail: `${gestOk}/${gestiones.length} aprobadas`, warn: gestVenc > 0 ? `⚠ ${gestVenc} vencida${gestVenc > 1 ? "s" : ""}` : gestCrit > 0 ? `⏰ ${gestCrit} urgente${gestCrit > 1 ? "s" : ""}` : null, onClick: () => setTab("gestiones") },
            subvenciones.length > 0 && { icon: "🏅", label: "Subvenciones", color: svConcedidas.length > 0 ? "#34d399" : "#94a3b8", dot: svConcedidas.length > 0 ? "🟢" : "⚪", detail: svConcedidas.length > 0 ? `${svConcedidas.length} concedida${svConcedidas.length > 1 ? "s" : ""}` : `${subvenciones.length} en seguimiento`, warn: svTotal > 0 ? `💶 ${formatImporte(svTotal)}` : null, onClick: () => setTab("subvenciones") },
          ].filter(Boolean);
          return (
            <div className="card mb" style={{ padding: ".75rem 1rem", borderLeft: "3px solid rgba(148,163,184,0.3)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: ".5rem", fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase" }}>
                Estado documental
              </div>
              <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                {semItems.map(item => (
                  <div key={item.label} onClick={item.onClick} style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: ".15rem", background: "var(--surface2)", border: `1px solid ${item.color}33`, borderLeft: `3px solid ${item.color}`, borderRadius: "var(--r-sm)", padding: ".4rem .65rem", minWidth: 120, flex: "1 1 120px" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: item.color, fontWeight: 700 }}>{item.dot} {item.label}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text)" }}>{item.detail}</div>
                    {item.warn && <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: item.color, fontWeight: 700 }}>{item.warn}</div>}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── KPIs por categoría ── */}
        {(() => {
          const sumaImporte = (catId) => docs.filter(d => d.categoria === catId && d.importe != null).reduce((s, d) => s + (typeof d.importe === "number" ? d.importe : parseFloat(String(d.importe).replace(",", ".")) || 0), 0);
          const cats = CATEGORIAS.map(c => ({ ...c, cnt: docs.filter(d => d.categoria === c.id).length, alert: docs.filter(d => d.categoria === c.id && d.fechaVencimiento && (diasHasta(d.fechaVencimiento) ?? 999) <= 30 && (diasHasta(d.fechaVencimiento) ?? 999) >= 0 && !["aprobado", "vigente", "vencido"].includes(d.estado)).length, totalImporte: ["presupuestos", "facturas"].includes(c.id) ? sumaImporte(c.id) : null }));
          const conArchivos = cats.filter(c => c.cnt > 0);
          if (conArchivos.length === 0) return (
            <div style={{ marginBottom: ".85rem", padding: ".6rem .85rem", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", textAlign: "center" }}>
              📁 Sin archivos subidos todavía — usa la zona de subida para añadir documentos
            </div>
          );
          const totalPpto  = sumaImporte("presupuestos");
          const totalFact  = sumaImporte("facturas");
          const hayEcon    = totalPpto > 0 || totalFact > 0;
          const desviacion = totalPpto > 0 && totalFact > 0 ? ((totalFact - totalPpto) / totalPpto * 100) : null;
          return (
            <>
              <div className="kpi-grid mb">
                {conArchivos.map(c => (
                  <div key={c.id} className="kpi" style={{ cursor: "pointer", borderLeftColor: c.color, borderLeftWidth: 3, borderLeftStyle: "solid" }} onClick={() => { setTab(c.id); setBusqueda(""); }}>
                    <div className="kpi-label" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {c.icon} {c.label}
                      <Tooltip text={`Documentos subidos en la categoría ${c.label}.\nHaz clic para ver y gestionar los archivos de esta categoría.`}><TooltipIcon size={11} /></Tooltip>
                    </div>
                    <div className="kpi-value" style={{ color: c.color }}>{c.cnt}</div>
                    <div className="kpi-sub">{c.totalImporte != null && c.totalImporte > 0 ? <span style={{ color: c.color, fontWeight: 700 }}>{formatImporte(c.totalImporte)}</span> : c.alert > 0 ? <span style={{ color: "var(--amber)" }}>⏰ {c.alert} por vencer</span> : "archivos"}</div>
                  </div>
                ))}
              </div>
              {hayEcon && (
                <div className="card mb" style={{ padding: ".75rem 1rem", borderLeft: "3px solid rgba(52,211,153,0.4)" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: ".5rem", fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase" }}>💰 Totales económicos</div>
                  <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                    {totalPpto > 0 && <div style={{ display: "flex", flexDirection: "column", gap: ".1rem" }}><span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>💰 Presupuestado</span><span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)", fontWeight: 700, color: "#34d399" }}>{formatImporte(totalPpto)}</span></div>}
                    {totalFact > 0 && <div style={{ display: "flex", flexDirection: "column", gap: ".1rem" }}><span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>🧾 Facturado</span><span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)", fontWeight: 700, color: "#22d3ee" }}>{formatImporte(totalFact)}</span></div>}
                    {desviacion !== null && <div style={{ display: "flex", flexDirection: "column", gap: ".1rem" }}><span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}><Tooltip text={`Diferencia entre lo facturado y lo presupuestado.\n${desviacion > 0 ? "El gasto real supera el presupuesto." : desviacion < 0 ? "El gasto real está por debajo del presupuesto." : "Sin desviación."}`}><span>📊 Desviación <TooltipIcon size={10} /></span></Tooltip></span><span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)", fontWeight: 700, color: desviacion > 10 ? "#f87171" : desviacion > 0 ? "#fbbf24" : "#34d399" }}>{desviacion > 0 ? "+" : ""}{desviacion.toFixed(1)}%</span></div>}
                    {totalPpto > 0 && totalFact > 0 && totalPpto > totalFact && <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "#34d399", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: 20, padding: ".15rem .55rem" }}>✅ Dentro de presupuesto</span>}
                    {desviacion !== null && desviacion > 10 && <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "#f87171", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 20, padding: ".15rem .55rem" }}>⚠ Desviación alta</span>}
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {/* ── Storage bar ── */}
        {storagePct > 50 && (
          <div className="card mb" style={{ padding: ".65rem 1rem" }}>
            <div className="flex-between mb-sm">
              <span className="mono xs muted" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: storageColor, display: "inline-block" }} />
                {formatSize(totalSize)} · Neon Storage
              </span>
              <span className="mono xs bold" style={{ color: storageColor }}>{storagePct.toFixed(0)}% de 100 MB</span>
            </div>
            <div className="doc-storage-bar">
              <div className="doc-storage-fill" style={{ width: `${storagePct}%`, background: `linear-gradient(90deg,${storageColor}99,${storageColor})` }} />
            </div>
          </div>
        )}

        {/* ── Category tabs ── */}
        <div className="tabs" style={{ gap: ".4rem", flexWrap: "wrap" }}>
          {CATEGORIAS.map(c => {
            const active = tab === c.id;
            const cnt    = docs.filter(d => d.categoria === c.id).length;
            return (
              <button key={c.id} className={`tab-btn${active ? " active" : ""}`}
                onClick={() => { setTab(c.id); setBusqueda(""); }}
                style={active ? { background: `${c.color}18`, color: c.color, borderColor: `${c.color}55`, boxShadow: `0 0 12px ${c.color}22` } : {}}>
                {c.icon} {c.label}
                {cnt > 0 && <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", background: "rgba(255,255,255,.07)", borderRadius: 10, padding: ".05rem .4rem", marginLeft: ".1rem" }}>{cnt}</span>}
              </button>
            );
          })}
          {/* Subvenciones tab */}
          {(() => {
            const active = tab === "subvenciones";
            const concedidas = subvenciones.filter(sv => ["concedida", "justificada", "cerrada"].includes(sv.estado));
            const totalConcedido = concedidas.reduce((s, sv) => s + (parseFloat(String(sv.importeConcedido || "0").replace(",", ".")) || 0), 0);
            return (
              <button className={`tab-btn${active ? " active" : ""}`}
                onClick={() => { setTab("subvenciones"); setBusqueda(""); }}
                style={active ? { background: "#34d39918", color: "#34d399", borderColor: "#34d39955", boxShadow: "0 0 12px #34d39922" } : {}}>
                🏅 Subvenciones
                {subvenciones.length > 0 && <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", background: "rgba(255,255,255,.07)", borderRadius: 10, padding: ".05rem .4rem", marginLeft: ".1rem" }}>{subvenciones.length}</span>}
                {totalConcedido > 0 && <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "#34d399", marginLeft: ".25rem", fontWeight: 700 }}>{formatImporte(totalConcedido)}</span>}
              </button>
            );
          })()}
        </div>

        {/* ── Upload zone ── */}
        {!isGestion && !isSubvencion && (
          <UploadZone
            tab={tab} catInfoSafe={catInfoSafe}
            uploadOpen={uploadOpen} setUploadOpen={setUploadOpen}
            nota={nota} setNota={setNota}
            descripcionDoc={descripcionDoc} setDescripcionDoc={setDescripcionDoc}
            emisorNuevo={emisorNuevo} setEmisorNuevo={setEmisorNuevo}
            importeNuevo={importeNuevo} setImporteNuevo={setImporteNuevo}
            subcat={subcat} setSubcat={setSubcat}
            estadoNuevo={estadoNuevo} setEstadoNuevo={setEstadoNuevo}
            vencNuevo={vencNuevo} setVencNuevo={setVencNuevo}
            uploading={uploading} dragOver={dragOver}
            handleFiles={handleFiles} handleDrop={handleDrop}
            handleDragOver={handleDragOver} handleDragLeave={handleDragLeave}
          />
        )}

        {/* ── Resultados búsqueda global ── */}
        {resultadosGlobales && (
          <div className="card mb" style={{ padding: ".75rem 1rem" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--cyan)", fontWeight: 700, marginBottom: ".65rem" }}>
              🌐 {resultadosGlobales.length} resultado{resultadosGlobales.length !== 1 ? "s" : ""} en todos los documentos para "{busqueda}"
            </div>
            <div className="doc-list">
              {resultadosGlobales.map(doc => {
                const cat  = TODAS_CATEGORIAS.find(c => c.id === doc.categoria) || CATEGORIAS[0];
                const ecfg = getEstadoCfg(doc.estado);
                const dV   = diasHasta(doc.fechaVencimiento);
                const vc   = dV !== null ? (dV < 0 ? "var(--red)" : dV <= 30 ? "var(--amber)" : "var(--text-muted)") : "var(--text-muted)";
                return (
                  <div key={doc.id} className="doc-card" onClick={() => setTab(doc.categoria)} style={{ cursor: "pointer" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: cat.color, borderRadius: "12px 12px 0 0" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4 }}>
                      <div className="item-icon-pill" style={{ "--pill-color": cat.color, width: 38, height: 38, fontSize: "var(--fs-lg)" }}>{getFileIcon(doc.tipo)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="doc-card-name" style={{ fontSize: "var(--fs-base)" }}>{doc.nombreDisplay || doc.nombre}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: cat.color, marginTop: ".1rem" }}>{cat.icon} {cat.label}{doc.subcategoria ? ` · ${doc.subcategoria}` : ""}</div>
                        {(["presupuestos", "facturas", "contratos", "seguros"].includes(doc.categoria)) && doc.importe != null && <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700, color: "#34d399", marginTop: ".1rem" }}>💶 {formatImporte(doc.importe)}</div>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", padding: ".08rem .35rem", borderRadius: 3, background: ecfg.bg, color: ecfg.color, border: `1px solid ${ecfg.color}33` }}>{ecfg.label}</span>
                      {doc.emisor && <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>🏢 {doc.emisor}</span>}
                      {doc.fechaVencimiento && dV !== null && <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: vc, fontWeight: 700 }}>⏰ {formatDate(doc.fechaVencimiento)}</span>}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)" }}>{formatSize(doc.size)} · {formatDate(doc.fechaSubida)}</div>
                    <div className="doc-card-actions">
                      <button onClick={e => { e.stopPropagation(); viewDoc(doc); }} className="doc-btn doc-btn-view">👁 Ver</button>
                      <button onClick={e => { e.stopPropagation(); downloadDoc(doc); }} aria-label="Descargar documento" className="doc-btn doc-btn-dl">⬇</button>
                    </div>
                  </div>
                );
              })}
            </div>
            {resultadosGlobales.length === 0 && (
              <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)" }}>
                Sin resultados para "{busqueda}"
              </div>
            )}
          </div>
        )}

        {/* ── Document list ── */}
        {(isGestion || isSubvencion) ? null : (!busqGlobal && catDocs.length === 0) ? (
          <EmptyState
            svg={busqueda ? "search" : "docs"}
            color={catInfoSafe.color}
            title={busqueda ? "Sin resultados" : "Sin documentos"}
            sub={busqueda ? `No se encontró "${busqueda}" en ${catInfoSafe.label}` : `Sube el primer documento a ${catInfoSafe.label}`}
            action={!busqueda && (
              <button className="btn btn-ghost btn-sm" style={{ fontSize: "var(--fs-sm)" }} onClick={() => setUploadOpen(true)}>
                + Subir documento
              </button>
            )}
          />
        ) : busqGlobal ? null : (
          <>
            {busqueda && <div className="mono xs muted mb-sm">{catDocs.length} resultado{catDocs.length !== 1 ? "s" : ""} para "{busqueda}"</div>}
            <div className="doc-list">
              {catDocs.map(doc => {
                const estadoCfg = getEstadoCfg(doc.estado);
                const dVenc     = diasHasta(doc.fechaVencimiento);
                const vencColor = dVenc !== null ? (dVenc < 0 ? "#f87171" : dVenc <= 7 ? "#f87171" : dVenc <= 30 ? "#fbbf24" : "var(--text-muted)") : "var(--text-muted)";
                return (
                  <div key={doc.id} className="doc-card">
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: catInfoSafe.color, borderRadius: "12px 12px 0 0" }} />
                    {editId === doc.id ? (
                      <div className="doc-edit-card" style={{ paddingTop: 4 }}>
                        <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: catInfoSafe.color, marginBottom: ".25rem" }}>✏️ Editando documento</div>
                        <input value={editForm.nombreDisplay} onChange={e => setEditForm(p => ({ ...p, nombreDisplay: e.target.value }))} placeholder="Nombre descriptivo *" className="doc-input" style={{ width: "100%", boxSizing: "border-box" }} />
                        <input value={editForm.emisor} onChange={e => setEditForm(p => ({ ...p, emisor: e.target.value }))} placeholder="Emisor / proveedor" className="doc-input" style={{ width: "100%", boxSizing: "border-box" }} />
                        {(["presupuestos", "facturas", "contratos", "seguros"].includes(editForm.categoria ?? doc.categoria)) && (
                          <input value={editForm.importe ?? ""} onChange={e => setEditForm(p => ({ ...p, importe: e.target.value }))} placeholder="Importe (ej: 1250.00)" className="doc-input" type="number" min="0" step="0.01" style={{ width: "100%", boxSizing: "border-box" }} />
                        )}
                        <select value={editForm.categoria ?? doc.categoria} onChange={e => setEditForm(p => ({ ...p, categoria: e.target.value }))} className="doc-select" style={{ width: "100%" }}>
                          {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                        </select>
                        {(SUBCATEGORIAS[editForm.categoria ?? doc.categoria] || []).length > 0 && (
                          <select value={editForm.subcategoria} onChange={e => setEditForm(p => ({ ...p, subcategoria: e.target.value }))} className="doc-select" style={{ width: "100%" }}>
                            <option value="">— Subcategoría —</option>
                            {(SUBCATEGORIAS[editForm.categoria ?? doc.categoria] || []).map(sc => <option key={sc} value={sc}>{sc}</option>)}
                          </select>
                        )}
                        <select value={editForm.estado} onChange={e => setEditForm(p => ({ ...p, estado: e.target.value }))} className="doc-select" style={{ width: "100%", color: getEstadoCfg(editForm.estado).color }}>
                          {ESTADOS_DOC.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                        </select>
                        <input type="date" value={editForm.fechaVencimiento} onChange={e => setEditForm(p => ({ ...p, fechaVencimiento: e.target.value }))} className="doc-select" style={{ width: "100%" }} />
                        <input value={editForm.nota} onChange={e => setEditForm(p => ({ ...p, nota: e.target.value }))} placeholder="Notas adicionales" className="doc-input" style={{ width: "100%", boxSizing: "border-box" }} />
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={saveEdit} className="doc-btn doc-btn-save">✅ Guardar</button>
                          <button onClick={() => setEditId(null)} className="doc-btn doc-btn-cancel">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {(doc.tipo?.startsWith("image/")) && (doc.blobUrl || doc.data) && (
                          <div onClick={() => viewDoc(doc)} style={{ width: "100%", height: 100, borderRadius: 8, overflow: "hidden", cursor: "pointer", background: "var(--surface2)", marginBottom: ".25rem" }}>
                            <img src={doc.blobUrl || doc.data} alt={doc.nombreDisplay || doc.nombre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                        )}
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, paddingTop: doc.tipo?.startsWith("image/") ? "0" : "4px" }}>
                          {!doc.tipo?.startsWith("image/") && (() => {
                            const docCat = TODAS_CATEGORIAS.find(c => c.id === doc.categoria) || CATEGORIAS[0];
                            return <div className="item-icon-pill" style={{ "--pill-color": docCat.color, width: 36, height: 36, fontSize: "1.05rem", flexShrink: 0 }}>{getFileIcon(doc.tipo)}</div>;
                          })()}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="doc-card-name">{doc.nombreDisplay || doc.nombre}</div>
                            {doc.emisor && <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: ".1rem" }}>🏢 {doc.emisor}</div>}
                            {(["presupuestos", "facturas", "contratos", "seguros"].includes(doc.categoria)) && doc.importe != null && <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700, color: "#34d399", marginTop: ".15rem", letterSpacing: "-.01em" }}>💶 {formatImporte(doc.importe)}</div>}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: ".4rem", flexWrap: "wrap" }}>
                          <select className="doc-estado-sel" value={doc.estado || "pendiente"} onChange={e => updateEstado(doc.id, e.target.value)} style={{ color: estadoCfg.color, background: estadoCfg.bg, border: `1px solid ${estadoCfg.color}44` }}>
                            {ESTADOS_DOC.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                          </select>
                          {doc.fechaVencimiento && (
                            <span className="mono" style={{ fontSize: "var(--fs-xs)", color: vencColor, fontWeight: 700 }}>
                              {dVenc === null ? "" : dVenc < 0 ? `⚠ Venció ${formatDate(doc.fechaVencimiento)}` : dVenc === 0 ? "⏰ Vence hoy" : `⏰ ${dVenc}d · ${formatDate(doc.fechaVencimiento)}`}
                            </span>
                          )}
                        </div>
                        <div className="doc-card-meta">
                          <span className="doc-card-meta-item">{formatSize(doc.size)}</span>
                          <span className="doc-card-meta-item" style={{ color: "var(--text-dim)" }}>·</span>
                          <span className="doc-card-meta-item">{formatDate(doc.fechaSubida)}</span>
                          {doc.subcategoria && <span className="doc-badge" style={{ background: `${catInfoSafe.color}18`, color: catInfoSafe.color, border: `1px solid ${catInfoSafe.color}44` }}>{doc.subcategoria}</span>}
                        </div>
                        {doc.nota && <div className="doc-card-note">💬 {doc.nota}</div>}
                        <div className="doc-card-actions">
                          <button onClick={() => viewDoc(doc)} className="doc-btn doc-btn-view">👁 Ver</button>
                          <button onClick={() => downloadDoc(doc)} className="doc-btn doc-btn-dl">⬇ Guardar</button>
                          <button onClick={() => startEdit(doc)} className="doc-btn doc-btn-edit">✏️ Editar</button>
                          <button onClick={() => deleteDoc(doc.id)} aria-label="Eliminar documento" className="doc-btn doc-btn-del">🗑</button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Visor de documentos ── */}
      <VisorModal visorDoc={visorDoc} onClose={() => setVisorDoc(null)} onDownload={downloadDoc} />

      {/* ── Gestiones legales ── */}
      <TabGestiones
        gestiones={gestiones}
        saveGestiones={saveGestiones}
        gestionesVencidas={gestionesVencidas}
        gestionesCriticas={gestionesCriticas}
        setDelConfirm={setDelConfirm}
      />

      {/* ── Toast error de subida ── */}
      {uploadError && (
        <div onClick={() => setUploadError(null)} style={{
          position: "fixed", bottom: "calc(env(safe-area-inset-bottom,0px) + 80px)",
          left: "50%", transform: "translateX(-50%)",
          background: "var(--red-dim)", border: "1px solid rgba(248,113,113,.35)",
          borderRadius: 10, padding: ".65rem 1rem",
          fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 600,
          color: "var(--red)", zIndex: 9998, maxWidth: 340, width: "90%",
          display: "flex", alignItems: "center", gap: ".6rem",
          boxShadow: "0 4px 20px rgba(0,0,0,.3)", cursor: "pointer",
        }}>
          <span style={{ flexShrink: 0 }}>❌</span>
          <span style={{ flex: 1 }}>{uploadError}</span>
          <span style={{ flexShrink: 0, opacity: .6, fontSize: "var(--fs-sm)" }}>Toca para cerrar</span>
        </div>
      )}

      {/* ── Modal confirmación eliminar ── */}
      <DeleteConfirmModal
        delConfirm={delConfirm}
        onCancel={() => setDelConfirm(null)}
        onConfirm={confirmarDelete}
      />

      {/* ── Subvenciones ── */}
      {isSubvencion && (
        <TabSubvenciones
          subvenciones={subvenciones}
          saveSubvenciones={saveSubvenciones}
          setDelConfirm={setDelConfirm}
        />
      )}
    </>
  );
}
