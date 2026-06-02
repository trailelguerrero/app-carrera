import { useState } from "react";
import { createPortal } from "react-dom";
import { useModalClose } from "@/hooks/useModalClose";
import { fmtEur } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { blockCls as cls } from "@/lib/blockStyles";
import { CONTRAPRESTACIONES_TIPO, ESTADOS, ESTADO_CFG } from "./constants";
import DocManager from "./DocManager";
import LogContactos from "./LogContactos";

// getCfg helper (local copy to avoid circular deps)
const NIVEL_CFG = {
  Oro:         { color: "#f59e0b", dim: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)", icon: "🥇" },
  Plata:       { color: "#94a3b8", dim: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.3)", icon: "🥈" },
  Bronce:      { color: "#c47b3a", dim: "rgba(196,123,58,0.12)", border: "rgba(196,123,58,0.3)", icon: "🥉" },
  Colaborador: { color: "#34d399", dim: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.25)", icon: "🤝" },
  Especie:     { color: "#a78bfa", dim: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.25)", icon: "📦" },
};
const getCfg = (nivel) => NIVEL_CFG[nivel] || NIVEL_CFG.Colaborador;

function generarInformePDF(pat, config = {}) {
  const evento = config.nombre || "Trail El Guerrero 2026";
  const fecha  = config.fecha  || "2026-08-29";
  const lugar  = config.lugar  || "Candeleda, Ávila";
  const org    = config.organizador || "Organización Trail El Guerrero";

  const contEntregadas = (pat.contraprestaciones || []).filter(c => c.estado === "entregado");
  const contPendientes = (pat.contraprestaciones || []).filter(c => c.estado === "pendiente");

  // CON-02/MEJ-04: Historial unificado — incluir tanto cambios de estado como contactos manuales
  const historial = Array.isArray(pat.historial) ? [...pat.historial].reverse() : [];
  const histEstados   = historial.filter(e => e.tipo === "estado");
  const histContactos = historial.filter(e => e.tipo === "contacto");

  const TIPO_ICONS_CONTACTO = { Llamada:"📞", Email:"✉️", Reunión:"🤝", WhatsApp:"💬", Otro:"📝" };

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Informe patrocinador — ${pat.nombre}</title>
  <style>
    /* CON-03/MEJ-06: Variables CSS resueltas en modo claro para documento standalone */
    :root {
      --doc-bg: #ffffff;
      --doc-surface: #f8faff;
      --doc-text: #1a1a2e;
      --doc-text-muted: #555;
      --doc-border: #e5e7eb;
      --doc-cyan: #22d3ee;
      --doc-cyan-dim: rgba(34,211,238,0.12);
      --doc-cyan-border: rgba(34,211,238,0.35);
      --doc-green: #16a34a;
      --doc-amber: #d97706;
      --doc-violet: #7c3aed;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: var(--doc-text); background: var(--doc-bg); padding: 40px; max-width: 750px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid var(--doc-cyan); }
    .evento-nombre { font-size: 22px; font-weight: 800; color: var(--doc-text); }
    .evento-meta { font-size: 12px; color: #666; margin-top: 4px; font-family: monospace; }
    .pat-block { background: var(--doc-surface); border-radius: 10px; padding: 20px 24px; margin-bottom: 24px; border-left: 4px solid var(--doc-cyan); }
    .pat-nombre { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
    .pat-nivel { display: inline-block; background: var(--doc-cyan-dim); color: var(--doc-cyan); font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 20px; font-family: monospace; border: 1px solid var(--doc-cyan-border); }
    .seccion-titulo { font-size: 13px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 0.08em; margin: 20px 0 10px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .dato { background: #f0f4ff; border-radius: 8px; padding: 10px 14px; }
    .dato-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.06em; font-family: monospace; margin-bottom: 3px; }
    .dato-valor { font-size: 15px; font-weight: 700; color: var(--doc-text); }
    .cont-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 6px; margin-bottom: 6px; font-size: 13px; }
    .cont-done { background: #f0fdf4; border: 1px solid #bbf7d0; }
    .cont-pend { background: #fffbeb; border: 1px solid #fde68a; }
    .ck { display: inline-block; width: 16px; height: 16px; border-radius: 4px; flex-shrink: 0; }
    .ck-done { background: #22c55e; }
    .ck-pend { background: #d1d5db; }
    .hist-row { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--doc-border); font-size: 12px; align-items: flex-start; }
    .hist-fecha { font-family: monospace; color: #888; flex-shrink: 0; min-width: 140px; }
    .hist-texto { color: var(--doc-text-muted); line-height: 1.5; flex: 1; }
    .hist-badge { display: inline-block; font-family: monospace; font-size: 10px; padding: 1px 6px; border-radius: 3px; margin-right: 5px; }
    .hist-estado  { background: rgba(34,211,238,0.12); color: #0891b2; }
    .hist-contacto { background: rgba(124,58,237,0.1); color: #7c3aed; }
    .footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid var(--doc-border); font-size: 11px; color: #9ca3af; font-family: monospace; display: flex; justify-content: space-between; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="evento-nombre">🏔️ ${evento}</div>
      <div class="evento-meta">${fecha} · ${lugar}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:13px;font-weight:700;color:#22d3ee">INFORME DE PATROCINIO</div>
      <div style="font-size:11px;color:#999;font-family:monospace">${new Date().toLocaleDateString("es-ES")}</div>
    </div>
  </div>

  <div class="pat-block">
    <div class="pat-nombre">${pat.nombre}</div>
    <span class="pat-nivel">${pat.nivel || "Patrocinador"}</span>
    ${pat.contacto ? `<div style="margin-top:8px;font-size:12px;color:#555">👤 ${pat.contacto}${pat.email ? ` · ${pat.email}` : ""}${pat.telefono ? ` · ${pat.telefono}` : ""}</div>` : ""}
  </div>

  <div class="seccion-titulo">Acuerdo económico</div>
  <div class="grid-2">
    <div class="dato">
      <div class="dato-label">Importe acordado</div>
      <div class="dato-valor">${(pat.importe || 0).toLocaleString("es-ES")} €</div>
    </div>
    <div class="dato">
      <div class="dato-label">Cobrado</div>
      <div class="dato-valor">${(pat.importeCobrado || 0).toLocaleString("es-ES")} €</div>
    </div>
    ${pat.fechaAcuerdo ? `<div class="dato"><div class="dato-label">Fecha acuerdo</div><div class="dato-valor">${pat.fechaAcuerdo}</div></div>` : ""}
    <div class="dato">
      <div class="dato-label">Estado</div>
      <div class="dato-valor">${pat.estado || "—"}</div>
    </div>
  </div>

  ${(pat.contraprestaciones || []).length > 0 ? `
  <div class="seccion-titulo">Contraprestaciones (${contEntregadas.length}/${(pat.contraprestaciones||[]).length} entregadas)</div>
  ${contEntregadas.map(c => `
    <div class="cont-row cont-done">
      <span class="ck ck-done"></span>
      <span><strong>${c.tipo}</strong>${c.detalle ? ` — ${c.detalle}` : ""}</span>
      <span style="margin-left:auto;font-size:11px;color:#16a34a;font-family:monospace">✓ Entregado</span>
    </div>`).join("")}
  ${contPendientes.map(c => `
    <div class="cont-row cont-pend">
      <span class="ck ck-pend"></span>
      <span><strong>${c.tipo}</strong>${c.detalle ? ` — ${c.detalle}` : ""}${c.fechaEntrega ? ` · límite ${c.fechaEntrega}` : ""}</span>
      <span style="margin-left:auto;font-size:11px;color:#d97706;font-family:monospace">Pendiente</span>
    </div>`).join("")}
  ` : "<p style='font-size:13px;color:#999'>Sin contraprestaciones registradas.</p>"}

  ${pat.notas ? `<div class="seccion-titulo">Notas</div><div style="background:#f8faff;border-radius:8px;padding:12px 16px;font-size:13px;line-height:1.6;color:#555">${pat.notas}</div>` : ""}

  ${histContactos.length > 0 ? `
  <div class="seccion-titulo">Historial de contactos (${histContactos.length})</div>
  ${histContactos.map(e => `
    <div class="hist-row">
      <span class="hist-fecha">${new Date(e.fecha).toLocaleDateString("es-ES")} ${new Date(e.fecha).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}</span>
      <span class="hist-texto">
        <span class="hist-badge hist-contacto">${TIPO_ICONS_CONTACTO[e.tipoContacto]||"📝"} ${e.tipoContacto||"Contacto"}</span>
        ${e.texto}
      </span>
    </div>`).join("")}
  ` : ""}

  ${histEstados.length > 0 ? `
  <div class="seccion-titulo">Historial de estados (${histEstados.length})</div>
  ${histEstados.map(e => `
    <div class="hist-row">
      <span class="hist-fecha">${new Date(e.fecha).toLocaleDateString("es-ES")} ${new Date(e.fecha).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}</span>
      <span class="hist-texto">
        <span class="hist-badge hist-estado">🔄 estado</span>
        ${e.texto}
      </span>
    </div>`).join("")}
  ` : ""}

  <div class="footer">
    <span>${org}</span>
    <span>Generado el ${new Date().toLocaleDateString("es-ES", {day:"2-digit",month:"long",year:"numeric"})}</span>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `informe-${(pat.nombre||"patrocinador").toLowerCase().replace(/\s+/g,"-")}.html`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast.success(`Informe de ${pat.nombre || "patrocinador"} descargado`);
}

function InformePatrocinador({ pat, cfg, config = {} }) {
  const contEntregadas = (pat.contraprestaciones || []).filter(c => c.estado === "entregado");
  const contPendientes = (pat.contraprestaciones || []).filter(c => c.estado === "pendiente");
  const evento = config.nombre || "Trail El Guerrero 2026";
  const fecha  = config.fecha  || "2026-08-29";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
      {/* Cabecera del informe */}
      <div style={{ padding: ".75rem 1rem", background: `${cfg.color}10`,
        borderRadius: 10, border: `1px solid ${cfg.color}30` }}>
        <div style={{ fontWeight: 700, fontSize: "var(--fs-md)" }}>{pat.nombre}</div>
        <div className="mono xs muted">{pat.nivel} · {pat.sector}</div>
      </div>

      {/* Acuerdo económico */}
      <div>
        <div className="ct" style={{ marginBottom: ".5rem" }}>Acuerdo económico</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".5rem" }}>
          {[
            ["Importe", `${(pat.importe||0).toLocaleString("es-ES")} €`],
            ["Cobrado", `${(pat.importeCobrado||0).toLocaleString("es-ES")} €`],
            ["Estado", pat.estado || "—"],
            ["Fecha acuerdo", pat.fechaAcuerdo || "—"],
          ].map(([k,v]) => (
            <div key={k} style={{ background:"var(--surface2)", borderRadius:8, padding:".5rem .75rem" }}>
              <div className="mono xs muted">{k}</div>
              <div style={{ fontSize:"var(--fs-base)", fontWeight:700, marginTop:".15rem" }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Contraprestaciones */}
      {(pat.contraprestaciones||[]).length > 0 && (
        <div>
          <div className="ct" style={{ marginBottom: ".5rem" }}>
            Contraprestaciones · {contEntregadas.length}/{(pat.contraprestaciones||[]).length} entregadas
          </div>
          {[...contEntregadas, ...contPendientes].map(c => (
            <div key={c.id||c.tipo} style={{ display:"flex", alignItems:"center", gap:".5rem",
              padding:".4rem .65rem", borderRadius:6, marginBottom:".3rem",
              background: c.estado==="entregado" ? "rgba(52,211,153,.08)" : "rgba(251,191,36,.07)",
              border: `1px solid ${c.estado==="entregado" ? "rgba(52,211,153,.25)" : "rgba(251,191,36,.25)"}` }}>
              <span style={{ fontSize:"var(--fs-sm)" }}>{c.estado==="entregado" ? "✅" : "⏳"}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:"var(--fs-base)", fontWeight:600 }}>{c.tipo}</div>
                {c.detalle && <div className="mono xs muted">{c.detalle}</div>}
              </div>
              {c.fechaEntrega && c.estado !== "entregado" && (
                <span className="mono" style={{ fontSize:"var(--fs-xs)", color:"var(--amber)", flexShrink:0 }}>
                  📅 {c.fechaEntrega}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Notas */}
      {pat.notas && (
        <div>
          <div className="ct" style={{ marginBottom: ".5rem" }}>Notas internas</div>
          <div style={{ background:"var(--surface2)", borderRadius:8, padding:".65rem .85rem",
            fontSize:"var(--fs-base)", lineHeight:1.6, color:"var(--text-muted)" }}>
            {pat.notas}
          </div>
        </div>
      )}

      {/* Acción de descarga */}
      <div style={{ paddingTop:".5rem", borderTop:"1px solid var(--border)" }}>
        <div className="mono xs muted" style={{ marginBottom:".5rem" }}>
          Descarga el informe en HTML — imprimible desde el navegador como PDF
        </div>
        <button className="btn btn-ghost btn-sm"
          onClick={() => generarInformePDF(pat, config)}>
          ⬇ Descargar informe HTML
        </button>
      </div>
    </div>
  );
}

export default function ModalDetalle({ pat, onClose, onEditar, onDelete, updateContraprestacion, addContraprestacion, deleteContraprestacion, updateEstado, addDoc, deleteDoc, addEspecieItem, updateEspecieItem, deleteEspecieItem, onAddContacto, config = {} }) {
  const { closing: detClosing, handleClose: detHandleClose } = useModalClose(onClose);
  const cfg = getCfg(pat.nivel);
  const ecfg = ESTADO_CFG[pat.estado];
  const [subTab, setSubTab] = useState("info");
  const [addingCont, setAddingCont] = useState(false);
  const [newC, setNewC] = useState({ tipo: CONTRAPRESTACIONES_TIPO[0], detalle: "", fechaEntrega: "" });
  const [addingEspecie, setAddingEspecie] = useState(false);
  const [newEsp, setNewEsp] = useState({ nombre: "", cantidad: 0, unidad: "unidades", valorUnitario: 0 });
  const [editingCont, setEditingCont] = useState(null);
  const [editC, setEditC] = useState({ tipo: CONTRAPRESTACIONES_TIPO[0], detalle: "", fechaEntrega: "" });
  const [editingEspecie, setEditingEspecie] = useState(null);
  const [editEsp, setEditEsp] = useState({ nombre: "", cantidad: 0, unidad: "unidades", valorUnitario: 0 });
  // INC-06/MEJ-03: panel inline de confirmación al marcar como cobrado
  const [confirmandoCobro, setConfirmandoCobro] = useState(false);
  const [importeConfirmado, setImporteConfirmado] = useState("");
  const especieItems = pat.especieItems || [];
  const esPatEspecie = pat.nivel === "Especie" || pat.especie > 0;

  return createPortal(
    <div className={`modal-backdrop${detClosing ? " modal-backdrop-closing" : ""}`} onClick={e => e.target === e.currentTarget && detHandleClose()}>
      <div className={`modal modal-ficha${detClosing ? " modal-closing" : ""}`} style={{ maxWidth: 560 }}>
        <div style={{ borderBottom: `2px solid ${cfg.color}33` }}>
          <div className="modal-header" style={{ borderBottom: "none", paddingBottom: ".5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: cfg.dim, border: `1px solid ${cfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--fs-lg)" }}>{cfg.icon}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "var(--fs-md)" }}>{pat.nombre}</div>
                <div className="mono xs muted">{pat.sector} · {pat.nivel}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: ".4rem" }}>
              {subTab === "info" && <button className="btn btn-sm btn-ghost" onClick={onEditar}>✏️ Editar patrocinador</button>}
              {subTab === "info" && onDelete && <button className="btn btn-sm btn-red" onClick={() => onDelete(pat.id)} style={{marginLeft:".3rem"}}>🗑 Eliminar</button>}
              {subTab === "historial" && (() => {
                const hist = Array.isArray(pat.historial) ? [...pat.historial].reverse() : [];
                const TIPO_ICONS_H = { Llamada:"📞", Email:"✉️", Reunión:"🤝", WhatsApp:"💬", Otro:"📝" };
                return (
                  <div>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)",
                      marginBottom:".75rem" }}>
                      {hist.length} entradas · cambios de estado y contactos manuales
                    </div>
                    {hist.length === 0 ? (
                      <div style={{ color:"var(--text-dim)", fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                        padding:".75rem", background:"var(--surface2)", borderRadius:8 }}>
                        Sin historial todavía. Los cambios de estado y contactos se registran aquí automáticamente.
                      </div>
                    ) : hist.map(e => (
                      <div key={e.id} style={{ display:"flex", gap:".75rem", padding:".45rem .5rem",
                        borderBottom:"1px solid var(--border)", alignItems:"flex-start" }}>
                        <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                          color:"var(--text-dim)", flexShrink:0, minWidth:120 }}>
                          {new Date(e.fecha).toLocaleDateString("es-ES")}{" "}
                          {new Date(e.fecha).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}
                        </span>
                        <span style={{ fontSize:"var(--fs-xs)", color:"var(--text-muted)", lineHeight:1.5, flex:1, minWidth:0 }}>
                          {e.tipo === "estado" ? "🔄 " :
                           e.tipo === "contacto" ? (TIPO_ICONS_H[e.tipoContacto] || "📞") + " " :
                           e.tipo === "nota" ? "📝 " : "ℹ️ "}
                          {e.texto}
                          {e.tipo === "contacto" && e.tipoContacto && (
                            <span style={{ marginLeft:".35rem", fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                              padding:".05rem .35rem", borderRadius:3, background:"rgba(167,139,250,.1)", color:"#a78bfa" }}>
                              {e.tipoContacto}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {subTab === "informe" && <button className="btn btn-sm btn-ghost" onClick={() => generarInformePDF(pat, config)}>
                ⬇ Descargar PDF
              </button>}
              <button className="btn btn-sm btn-ghost" onClick={detHandleClose}><span aria-hidden="true">✕</span></button>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0", padding: "0 1.4rem" }}>
            {[["info","ℹ️ Info"],["cont","🎁 Compromisos"],["especie","📦 En especie"],["docs","📁 Documentos"],["historial","🕐 Historial"],["informe","📄 Informe"]].map(([id,label]) => (
              <button key={id} onClick={() => setSubTab(id)}
                style={{ background:"none", border:"none", borderBottom: subTab===id ? `2px solid ${cfg.color}` : "2px solid transparent", color: subTab===id ? cfg.color : "var(--text-muted)", fontFamily:"var(--font-display)", fontSize:"var(--fs-sm)", fontWeight: subTab===id?700:500, padding:".4rem .75rem .5rem", cursor:"pointer", transition:"all .15s" }}>
                {label}
                {id==="docs" && (() => {
                  const nDocs = (pat.docs||[]).length;
                  return nDocs > 0 ? (
                    <span style={{ marginLeft:".3rem", background:cfg.dim, color:cfg.color, fontSize:"var(--fs-xs)", padding:".05rem .3rem", borderRadius:3, fontFamily:"var(--font-mono)" }}>{nDocs}</span>
                  ) : null;
                })()}
                {id==="cont" && (pat.contraprestaciones || []).filter(c=>c.estado==="pendiente").length > 0 && <span style={{ marginLeft:".3rem", background:"rgba(248,113,113,.12)", color:"#f87171", fontSize:"var(--fs-xs)", padding:".05rem .3rem", borderRadius:3, fontFamily:"var(--font-mono)" }}>{(pat.contraprestaciones || []).filter(c=>c.estado==="pendiente").length}</span>}
                {id==="especie" && especieItems.length > 0 && <span style={{ marginLeft:".3rem", background:cfg.dim, color:cfg.color, fontSize:"var(--fs-xs)", padding:".05rem .3rem", borderRadius:3, fontFamily:"var(--font-mono)" }}>{especieItems.length}</span>}
                {id==="historial" && (Array.isArray(pat.historial) && pat.historial.length > 0) && <span style={{ marginLeft:".3rem", background:"rgba(124,139,250,.12)", color:"#a5b4fc", fontSize:"var(--fs-xs)", padding:".05rem .3rem", borderRadius:3, fontFamily:"var(--font-mono)" }}>{pat.historial.length}</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="modal-body">
          {subTab === "info" && <><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
            {[
              ["Contacto", pat.contacto], ["Teléfono", pat.telefono || "—"],
              ["Email", pat.email || "—"], ["Importe", pat.especie > 0 ? `${fmtEur(pat.especie)} (especie)` : fmtEur(pat.importe)],
              ["Fecha acuerdo", pat.fechaAcuerdo || "—"], ["Vencimiento", pat.fechaVencimiento || "—"],
              ["Próx. seguimiento", pat.proximoContacto ? (() => {
                const dias = Math.ceil((new Date(pat.proximoContacto) - new Date()) / 86400000);
                return `${pat.proximoContacto}${dias < 0 ? " ⚠ vencido" : dias === 0 ? " — HOY" : dias <= 7 ? ` — ${dias}d` : ""}`;
              })() : "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="fl">{k}</div>
                <div style={{ fontSize: "var(--fs-base)", fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Estado */}
          <div>
            <div className="fl">Estado del acuerdo</div>
            <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
              {ESTADOS.map(s => {
                const sc = ESTADO_CFG[s];
                const active = pat.estado === s;
                return (
                  <button key={s} className="btn btn-sm"
                    onClick={() => {
                      // INC-06/MEJ-03: interceptar transición a "cobrado" para mostrar panel de confirmación
                      if (s === "cobrado" && pat.estado !== "cobrado") {
                        setImporteConfirmado(pat.importe > 0 ? String(pat.importe) : "");
                        setConfirmandoCobro(true);
                      } else {
                        updateEstado(pat.id, s);
                      }
                    }}
                    style={{ background: active ? sc.bg : "transparent", color: active ? sc.color : "var(--text-muted)", border: `1px solid ${active ? sc.color + "55" : "var(--border)"}`, fontWeight: active ? 700 : 400 }}>
                    {active && "● "}{sc.label}
                  </button>
                );
              })}
            </div>

            {/* INC-06/MEJ-03: panel inline de confirmación de cobro */}
            {confirmandoCobro && (
              <div style={{ marginTop: ".75rem", background: "rgba(52,211,153,.07)", border: "1px solid rgba(52,211,153,.3)", borderRadius: 10, padding: ".85rem 1rem", display: "flex", flexDirection: "column", gap: ".55rem" }}>
                <div style={{ fontWeight: 700, fontSize: "var(--fs-base)", color: "#34d399" }}>
                  ✅ Confirmar cobro
                </div>
                <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Importe acordado: <strong style={{ color: "var(--text)" }}>{fmtEur(pat.importe || 0)}</strong>.
                  Introduce el importe realmente cobrado:
                </div>
                <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="inp"
                    placeholder="Importe cobrado (€)"
                    value={importeConfirmado}
                    onChange={e => setImporteConfirmado(e.target.value)}
                    style={{ flex: 1 }}
                    autoFocus
                  />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", flexShrink: 0 }}>€</span>
                </div>
                <div style={{ display: "flex", gap: ".4rem", justifyContent: "flex-end" }}>
                  <button className="btn btn-sm btn-ghost" onClick={() => { setConfirmandoCobro(false); setImporteConfirmado(""); }}>
                    Cancelar
                  </button>
                  <button className="btn btn-sm"
                    style={{ background: "rgba(52,211,153,.15)", color: "#34d399", border: "1px solid rgba(52,211,153,.4)", fontWeight: 700 }}
                    onClick={() => {
                      const importe = parseFloat(importeConfirmado) || 0;
                      updateEstado(pat.id, "cobrado", importe);
                      setConfirmandoCobro(false);
                      setImporteConfirmado("");
                    }}>
                    Confirmar cobro
                  </button>
                </div>
              </div>
            )}
          </div>

          {pat.notas && (
            <div>
              <div className="fl">Notas</div>
              <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)", fontStyle: "italic", lineHeight: 1.5 }}>{pat.notas}</div>
            </div>
          )}

          {/* Log de contactos — CON-02/MEJ-04: usa pat.historial en lugar de localStorage aislado */}
          <LogContactos patId={pat.id} cfg={cfg} onAddContacto={onAddContacto}
            historialContactos={(pat.historial || []).filter(e => e.tipo === "contacto")} />
          </>}
          {subTab === "cont" && <><div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".5rem" }}>
              <div className="fl" style={{ margin: 0 }}>Contraprestaciones ({pat.contraprestaciones.length})</div>
              <button className="btn btn-sm" style={{ background: cfg.dim, color: cfg.color, border: `1px solid ${cfg.border}` }}
                onClick={() => setAddingCont(!addingCont)}>+ Añadir</button>
            </div>
            {pat.contraprestaciones.map(c => 
              editingCont === c.id ? (
                <div key={"edit"+c.id} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: ".65rem", marginTop: ".4rem", display: "flex", flexDirection: "column", gap: ".45rem" }}>
                  <input list="cont-options" className="inp" placeholder="Escribe un tipo o elige..." value={editC.tipo} onChange={e => setEditC(x => ({ ...x, tipo: e.target.value }))} />
                  <input className="inp" placeholder="Detalle (tamaño logo, nº posts, etc.)" value={editC.detalle} onChange={e => setEditC(x => ({ ...x, detalle: e.target.value }))} />
                  <div style={{ display: "flex", gap: ".4rem", justifyContent: "flex-end" }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => setEditingCont(null)}>Cancelar</button>
                    <button className="btn btn-sm btn-gold" onClick={() => { updateContraprestacion(pat.id, c.id, editC); setEditingCont(null); }}>Guardar</button>
                  </div>
                </div>
              ) : (
              <div key={c.id} className={cls("cont-row", c.estado === "entregado" && "cont-done")}>
                <button className="ckbox" onClick={() => updateContraprestacion(pat.id, c.id, "estado", c.estado === "entregado" ? "pendiente" : "entregado")}
                  style={{ borderColor: c.estado === "entregado" ? "#34d399" : "var(--border)", background: c.estado === "entregado" ? "#34d399" : "transparent" }}>
                  {c.estado === "entregado" && <span style={{ color: "#000", fontSize: "var(--fs-sm)", fontWeight: 800 }}>✓</span>}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "var(--fs-sm)", fontWeight: 600, textDecoration: c.estado === "entregado" ? "line-through" : "none", color: c.estado === "entregado" ? "var(--text-muted)" : "var(--text)" }}>{c.tipo}</div>
                  {c.detalle && <div className="mono xs muted">{c.detalle}</div>}
                </div>
                <div style={{display:"flex",gap:".3rem",flexShrink:0}}>
                  {c.estado !== "entregado" && (() => {
                    if (!c.fechaEntrega) return null;
                    const dias = Math.ceil((new Date(c.fechaEntrega) - new Date()) / 86400000);
                    if (dias < 0)  return <span key="urg" style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",padding:".1rem .35rem",borderRadius:4,background:"var(--red-dim)",color:"var(--red)",fontWeight:700}}>⚠ {Math.abs(dias)}d</span>;
                    if (dias === 0) return <span key="urg" style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",padding:".1rem .35rem",borderRadius:4,background:"var(--amber-dim)",color:"var(--amber)",fontWeight:700}}>🔔 HOY</span>;
                    if (dias <= 7) return <span key="urg" style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",padding:".1rem .35rem",borderRadius:4,background:"var(--amber-dim)",color:"var(--amber)",fontWeight:700}}>📅 {dias}d</span>;
                    return null;
                  })()}
                  <button className="btn btn-sm btn-ghost" onClick={() => { setEditingCont(c.id); setEditC({ tipo: c.tipo, detalle: c.detalle||"", fechaEntrega: c.fechaEntrega||"" }); }} aria-label="Editar">✏️</button>
                  <button className="btn btn-sm btn-red" onClick={() => deleteContraprestacion(pat.id, c.id)} aria-label="Cerrar">✕</button>
                </div>
              </div>
            ))}
            {pat.contraprestaciones.length === 0 && !addingCont && (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-dim)" }}>Sin compromisos registrados</div>
            )}
            {addingCont && (
              <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: ".65rem", marginTop: ".4rem", display: "flex", flexDirection: "column", gap: ".45rem" }}>
                <input list="cont-options" className="inp" placeholder="Escribe un tipo o elige..." value={newC.tipo} onChange={e => setNewC(x => ({ ...x, tipo: e.target.value }))} />
                <input className="inp" placeholder="Detalle (tamaño logo, nº posts, etc.)" value={newC.detalle} onChange={e => setNewC(x => ({ ...x, detalle: e.target.value }))} />
                <div>
                  <label className="fl">Fecha límite entrega <span className="muted" style={{fontWeight:400}}>(opcional)</span></label>
                  <input className="inp" type="date" value={newC.fechaEntrega} onChange={e => setNewC(x => ({ ...x, fechaEntrega: e.target.value }))} />
                </div>
                <div style={{ display: "flex", gap: ".4rem", justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost" onClick={() => setAddingCont(false)}>Cancelar</button>
                  <button className="btn btn-gold" onClick={() => { addContraprestacion(pat.id, { ...newC, estado: "pendiente" }); setAddingCont(false); }}>Añadir</button>
                </div>
              </div>
            )}
          </div>
          </>}

          {/* ── EN ESPECIE TAB ── */}
          {subTab === "especie" && <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".6rem" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "var(--fs-base)" }}>📦 Productos / servicios en especie</div>
                <div className="mono xs muted">{especieItems.filter(i=>i.recibido).length} recibidos · {especieItems.filter(i=>!i.recibido).length} pendientes</div>
              </div>
              <button className="btn btn-sm" style={{ background: cfg.dim, color: cfg.color, border: `1px solid ${cfg.border}` }}
                onClick={() => setAddingEspecie(!addingEspecie)}>+ Añadir ítem</button>
            </div>
            {especieItems.length === 0 && !addingEspecie && (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-dim)", textAlign: "center", padding: "1rem 0" }}>
                Sin ítems en especie registrados. Usa el botón + Añadir ítem.
              </div>
            )}
            {especieItems.map(item => 
              editingEspecie === item.id ? (
                <div key={"edit"+item.id} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: ".65rem", marginTop: ".4rem", display: "flex", flexDirection: "column", gap: ".45rem" }}>
                  <input className="inp" placeholder="Nombre del producto/servicio" value={editEsp.nombre} onChange={e => setEditEsp(x => ({ ...x, nombre: e.target.value }))} />
                  <div style={{ display: "flex", gap: ".4rem" }}>
                    <input type="number" min="0" className="inp" placeholder="Cantidad" value={editEsp.cantidad} onChange={e => setEditEsp(x => ({ ...x, cantidad: parseInt(e.target.value) || 0 }))} style={{ flex: 1 }} />
                    <input className="inp" placeholder="Unidad (uds, kg, litros…)" value={editEsp.unidad} onChange={e => setEditEsp(x => ({ ...x, unidad: e.target.value }))} style={{ flex: 1 }} />
                  </div>
                  {/* MEJ-02: campo valorUnitario para calcular total en tiempo real */}
                  <div style={{ display: "flex", gap: ".4rem", alignItems: "center" }}>
                    <input type="number" min="0" step="0.01" className="inp" placeholder="Valor unit. (€)" value={editEsp.valorUnitario || ""} onChange={e => setEditEsp(x => ({ ...x, valorUnitario: parseFloat(e.target.value) || 0 }))} style={{ flex: 1 }} />
                    {editEsp.cantidad > 0 && editEsp.valorUnitario > 0 && (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--violet)", flexShrink: 0, padding: ".2rem .5rem", background: "rgba(167,139,250,.1)", borderRadius: 4 }}>
                        = {(editEsp.cantidad * editEsp.valorUnitario).toFixed(2)} €
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: ".4rem", justifyContent: "flex-end" }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => setEditingEspecie(null)}>Cancelar</button>
                    <button className="btn btn-sm btn-gold" onClick={() => { if(editEsp.nombre.trim()){ updateEspecieItem(pat.id, item.id, editEsp); setEditingEspecie(null); } }}>Guardar</button>
                  </div>
                </div>
              ) : (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: ".6rem", padding: ".45rem 0", borderBottom: "1px solid rgba(30,45,80,.25)" }}>
                <button onClick={() => updateEspecieItem(pat.id, item.id, "recibido", !item.recibido)}
                  style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${item.recibido ? "#34d399" : "var(--border)"}`, background: item.recibido ? "#34d399" : "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.recibido && <span style={{ color: "#000", fontSize: "var(--fs-sm)", fontWeight: 800 }}>✓</span>}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "var(--fs-base)", fontWeight: 600, textDecoration: item.recibido ? "line-through" : "none", color: item.recibido ? "var(--text-muted)" : "var(--text)" }}>{item.nombre}</div>
                  <div className="mono xs muted">{item.cantidad} {item.unidad}{item.valorUnitario > 0 ? ` · ${item.valorUnitario.toFixed(2)}€/ud` : ""}</div>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", padding: ".1rem .4rem", borderRadius: 4,
                  background: item.recibido ? "rgba(52,211,153,.12)" : "rgba(251,191,36,.1)",
                  color: item.recibido ? "#34d399" : "#fbbf24" }}>
                  {item.recibido ? "✓ Recibido" : "⏳ Pendiente"}
                </span>
                <div style={{display:"flex",gap:".3rem",flexShrink:0}}>
                  <button className="btn btn-sm btn-ghost" onClick={() => { setEditingEspecie(item.id); setEditEsp({ nombre: item.nombre, cantidad: item.cantidad, unidad: item.unidad, valorUnitario: item.valorUnitario || 0 }); }} aria-label="Editar">✏️</button>
                  <button className="btn btn-sm btn-red" onClick={() => deleteEspecieItem(pat.id, item.id)} aria-label="Cerrar">✕</button>
                </div>
              </div>
            ))}
            {addingEspecie && (
              <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: ".65rem", marginTop: ".4rem", display: "flex", flexDirection: "column", gap: ".45rem" }}>
                <input className="inp" placeholder="Nombre del producto/servicio" value={newEsp.nombre} onChange={e => setNewEsp(x => ({ ...x, nombre: e.target.value }))} />
                <div style={{ display: "flex", gap: ".4rem" }}>
                  <input type="number" min="0" className="inp" placeholder="Cantidad" value={newEsp.cantidad} onChange={e => setNewEsp(x => ({ ...x, cantidad: parseInt(e.target.value) || 0 }))} style={{ flex: 1 }} />
                  <input className="inp" placeholder="Unidad (uds, kg, litros…)" value={newEsp.unidad} onChange={e => setNewEsp(x => ({ ...x, unidad: e.target.value }))} style={{ flex: 1 }} />
                </div>
                {/* MEJ-02: campo valorUnitario para calcular total en tiempo real */}
                <div style={{ display: "flex", gap: ".4rem", alignItems: "center" }}>
                  <input type="number" min="0" step="0.01" className="inp" placeholder="Valor unit. (€)" value={newEsp.valorUnitario || ""} onChange={e => setNewEsp(x => ({ ...x, valorUnitario: parseFloat(e.target.value) || 0 }))} style={{ flex: 1 }} />
                  {newEsp.cantidad > 0 && newEsp.valorUnitario > 0 && (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--violet)", flexShrink: 0, padding: ".2rem .5rem", background: "rgba(167,139,250,.1)", borderRadius: 4 }}>
                      = {(newEsp.cantidad * newEsp.valorUnitario).toFixed(2)} €
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: ".4rem", justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost" onClick={() => setAddingEspecie(false)}>Cancelar</button>
                  <button className="btn btn-gold" onClick={() => {
                    if (newEsp.nombre.trim()) { addEspecieItem(pat.id, { ...newEsp, recibido: false }); setNewEsp({ nombre: "", cantidad: 0, unidad: "unidades", valorUnitario: 0 }); setAddingEspecie(false); }
                  }}>Añadir</button>
                </div>
              </div>
            )}
          </>}

          {/* ── DOCUMENTOS TAB ── */}
          {subTab === "docs" && <DocManager pat={pat} addDoc={addDoc} deleteDoc={deleteDoc} cfg={cfg} />}

          {/* ── INFORME TAB ── */}
          {subTab === "informe" && <InformePatrocinador pat={pat} cfg={cfg} config={config} />}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>,
    document.body
  );
}