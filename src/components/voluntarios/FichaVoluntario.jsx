// Auto-extracted from Voluntarios.jsx — Sprint 2 refactor
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { TALLAS, SHIRT_PLACEHOLDER_FRONT, SHIRT_PLACEHOLDER_BACK, GUIA_TALLAS } from "@/constants/camisetasConstants";
import { createPortal } from "react-dom";
import { toast } from "@/lib/toast";
import { genIdNum } from "@/lib/utils";
import { useModalClose } from "@/hooks/useModalClose";
import EmptyState from "@/components/EmptyState";
import { usePaginacion } from "@/hooks/usePaginacion.jsx";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { EVENT_CONFIG_DEFAULT } from "@/constants/eventConfig";
import { blockCls as cls } from "@/lib/blockStyles";

// ─── FICHA VOLUNTARIO ─────────────────────────────────────────────────────────
// ─── HISTORIAL DE CAMBIOS ─────────────────────────────────────────────────────
function HistorialCambios({ historial }) {
  const [expandido, setExpandido] = useState(false);
  const visible = expandido ? historial : historial.slice(0, 3);
  return (
    <div style={{ background:"var(--surface2)", borderRadius:8, padding:"0.6rem 0.75rem",
      borderLeft:"2px solid var(--border)", marginTop:"0.25rem" }}>
      <button
        onClick={() => setExpandido(v => !v)}
        style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          width:"100%", background:"none", border:"none", cursor:"pointer", padding:0 }}>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)",
          textTransform:"uppercase", fontWeight:700 }}>
          🕐 Historial de cambios
        </div>
        <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-dim)",
          transform: expandido ? "rotate(0deg)" : "rotate(-90deg)", transition:"transform .15s" }}>▼</span>
      </button>
      <div style={{ marginTop:"0.4rem", display:"flex", flexDirection:"column", gap:"0.25rem" }}>
        {visible.map((e, i) => (
          <div key={i} style={{ display:"flex", gap:"0.6rem", fontSize:"var(--fs-sm)",
            padding:"0.25rem 0",
            borderBottom: i < visible.length - 1 ? "1px solid var(--border)" : "none" }}>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
              color:"var(--text-dim)", flexShrink:0, minWidth:70 }}>
              {e.fecha}<br/>{e.hora}
            </span>
            <span style={{ color:"var(--text-muted)", lineHeight:1.4 }}>{e.texto}</span>
          </div>
        ))}
        {!expandido && historial.length > 3 && (
          <button onClick={() => setExpandido(true)}
            style={{ background:"none", border:"none", cursor:"pointer",
              fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--cyan)",
              textAlign:"left", padding:"0.15rem 0" }}>
            + {historial.length - 3} entradas más…
          </button>
        )}
      </div>
    </div>
  );
}

// ─── MENSAJE ORGANIZADOR (editable inline) ────────────────────────────────────
function MensajeOrganizadorEdit({ valor, onChange }) {
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState(valor);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(valor); }, [valor]);

  const guardar = async () => {
    setSaving(true);
    onChange(draft.trim());
    setSaving(false);
    setEditando(false);
  };

  return (
    <div style={{ background:"rgba(251,191,36,.05)", borderRadius:8, padding:"0.6rem 0.75rem",
      borderLeft:"2px solid var(--amber)", marginTop:"0.25rem",
      border:"1px solid rgba(251,191,36,.2)", borderLeftWidth:2 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:".3rem" }}>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--amber)",
          fontWeight:700, textTransform:"uppercase" }}>
          📢 Mensaje para el voluntario
        </div>
        <button className="btn btn-ghost btn-sm" style={{ padding:".15rem .45rem", fontSize:"var(--fs-xs)" }}
          onClick={() => { if(editando) { setDraft(valor); setEditando(false); } else setEditando(true); }}>
          {editando ? "✕" : "✏️"}
        </button>
      </div>
      {editando ? (
        <>
          <textarea
            className="inp"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Ej: Recuerda traer ropa de abrigo. El acceso al puesto es por la pista forestal."
            maxLength={300}
            rows={3}
            style={{ fontSize:"var(--fs-sm)", marginBottom:".4rem", resize:"vertical" }}
          />
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-dim)" }}>
              {draft.length}/300 · Visible en el portal del voluntario
            </span>
            <button className="btn btn-ghost btn-sm" onClick={guardar} disabled={saving}>
              {saving ? "…" : "💾 Guardar"}
            </button>
          </div>
        </>
      ) : (
        <div style={{ fontSize:"var(--fs-sm)", lineHeight:1.5, color: valor ? "var(--text)" : "var(--text-dim)",
          fontStyle: valor ? "normal" : "italic" }}>
          {valor || "Sin mensaje — haz click en ✏️ para añadir uno"}
        </div>
      )}
    </div>
  );
}

function FichaVoluntario({ voluntario: v, puestos, locs=[], matPorLoc={}, onClose, onEditar, onEliminar, onEliminarConfirmado, onUpdate, config }) {
  const { closing: fvClosing, handleClose: fvHandleClose } = useModalClose(onClose);
  const [confirmando, setConfirmando] = useState(false);
  const puesto = puestos.find(p => p.id === v.puestoId);
  const estadoColor = v.estado === "confirmado" ? "var(--green)" : v.estado === "cancelado" ? "var(--red)" : "var(--amber)";

  // [VOL-05] Certificado de participación — solo si confirmado y evento ya pasado
  const cfgEvento = config || {};
  const fechaEvento = cfgEvento.fecha ? new Date(cfgEvento.fecha) : null;
  const eventoYaPaso = fechaEvento && fechaEvento < new Date();
  const nombreCompleto = [v.nombre, v.apellidos].filter(Boolean).join(" ") || "Voluntario/a";
  const puestoNombre = puestos?.find(p => p.id === v.puestoId)?.nombre || "voluntario/a general";

  function generarCertificadoPDF() {
    const nombreEvento = cfgEvento.nombre || "Trail El Guerrero";
    const edicion = cfgEvento.edicion || "";
    const fechaStr = fechaEvento
      ? fechaEvento.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
      : "";
    const win = window.open("", "_blank", "width=900,height=650");
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Certificado — ${nombreCompleto}</title>
  <style>
    @page { size: A4 landscape; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      background: #fff;
      width: 297mm; height: 210mm;
      display: flex; align-items: center; justify-content: center;
    }
    .cert {
      width: 270mm; height: 190mm;
      border: 8px solid #1a1a2e;
      border-radius: 12px;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 20mm 24mm;
      text-align: center;
      position: relative;
      background: #fafafa;
    }
    .cert::before {
      content: "";
      position: absolute; inset: 10px;
      border: 2px solid #e8c84a;
      border-radius: 6px;
      pointer-events: none;
    }
    .logo { width: 64px; height: 64px; object-fit: contain; margin-bottom: 12px; }
    .titulo { font-size: 13pt; letter-spacing: 4px; text-transform: uppercase; color: #555; margin-bottom: 8px; }
    .certifica { font-size: 10pt; color: #888; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 14px; }
    .nombre { font-size: 28pt; color: #1a1a2e; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #e8c84a; padding-bottom: 8px; }
    .desc { font-size: 12pt; color: #444; line-height: 1.7; max-width: 480px; margin: 0 auto 18px; }
    .meta { font-size: 9pt; color: #999; letter-spacing: 1px; }
    .firma { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 9pt; color: #888; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="cert">
    <img class="logo" src="${window.location.origin}/logo.webp" alt="Logo ${nombreEvento}" onerror="this.style.display='none'">
    <div class="titulo">Certificado de participación</div>
    <div class="certifica">La organización certifica que</div>
    <div class="nombre">${nombreCompleto}</div>
    <div class="desc">
      ha participado como voluntario/a en el puesto de<br>
      <strong>${puestoNombre}</strong><br>
      durante la celebración de
    </div>
    <div class="titulo">${nombreEvento}${edicion ? " · " + edicion : ""}</div>
    <div class="meta">${fechaStr}</div>
    <div class="firma">Firma de la organización ___________________________</div>
  </div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`);
    win.document.close();
  }
  const iniciales = (n) => (n||"V").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
  // Material asignado en Logística para la localización del puesto del voluntario
  const loc = puesto ? locs.find(l => l.id === puesto.localizacionId) : null;
  const materialEnLoc = loc ? (matPorLoc[loc.nombre] || []) : [];

  return (
    <div className={`modal-backdrop${fvClosing ? " modal-backdrop-closing" : ""}`} onClick={e => e.target===e.currentTarget && fvHandleClose()}>
      <div className={`modal modal-ficha${fvClosing ? " modal-closing" : ""}`} style={{ maxWidth: 460 }}>
        <div style={{ borderTop: "3px solid var(--cyan)", borderRadius: "16px 16px 0 0" }}>
          <div className="modal-header">
            <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
              <div style={{ width:44, height:44, borderRadius:"50%", background:"var(--cyan-dim)",
                border:"2px solid rgba(34,211,238,0.3)", display:"flex", alignItems:"center",
                justifyContent:"center", fontWeight:800, fontSize:"var(--fs-md)", color:"var(--cyan)", flexShrink:0 }}>
                {iniciales(v.nombre)}
              </div>
              <div>
                <div style={{ fontWeight:800, fontSize:"var(--fs-md)" }}>{v.nombre || "Sin nombre"}</div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)", marginTop:"0.1rem" }}>
                  <span style={{ color:estadoColor, fontWeight:700 }}>{v.estado}</span>
                  {v.rol && <> · {v.rol}</>}
                </div>
                {/* Badges inline de enPuesto y camiseta */}
                <div style={{ display:"flex", gap:".3rem", marginTop:".2rem", flexWrap:"wrap" }}>
                  {v.enPuesto && (
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-2xs)", fontWeight:700,
                      color:"var(--green)", background:"rgba(52,211,153,.1)",
                      border:"1px solid rgba(52,211,153,.25)", borderRadius:4, padding:".05rem .3rem" }}>
                      📍{v.horaLlegada ? " "+v.horaLlegada : " En puesto"}
                    </span>
                  )}
                  {v.camisetaEntregada && (
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-2xs)", fontWeight:700,
                      color:"var(--green)", background:"rgba(52,211,153,.1)",
                      border:"1px solid rgba(52,211,153,.25)", borderRadius:4, padding:".05rem .3rem" }}>
                      🎽 Camiseta ✓
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display:"flex", gap:".35rem", alignItems:"center" }}>
              {onEliminar && (
                <button className="btn btn-ghost" aria-label="Eliminar voluntario"
                  style={{ padding:"0.2rem 0.5rem", fontSize:"var(--fs-sm)", color:"var(--red)", borderColor:"rgba(248,113,113,.25)" }}
                  onClick={() => setConfirmando(true)}>🗑</button>
              )}
              <button className="btn btn-ghost" style={{ padding:"0.2rem 0.5rem", fontSize:"var(--fs-md)" }} onClick={fvHandleClose} aria-label="Cerrar">✕</button>
            </div>
          </div>
        </div>
        <div className="modal-body">
          {/* ── Indicador de acceso al portal ── */}
          {(() => {
            const estadoAcceso = v.sessionToken
              ? (v.pinPersonalizado ? "🔐 PIN personalizado · Sesión activa" : "🔓 Sesión activa · PIN inicial")
              : (v.pinHash ? (v.pinPersonalizado ? "🔐 PIN personalizado · Sin sesión" : "⚪ Registrado · Sin sesión") : "⚠️ Sin acceso configurado");
            const colorAcceso = v.sessionToken ? "var(--green)" : v.pinHash ? "var(--cyan)" : "var(--text-dim)";
            return (
              <div style={{ display:"flex", justifyContent:"space-between",
                padding:".35rem .5rem", marginBottom:".3rem",
                background:"var(--surface2)", borderRadius:6, alignItems:"center" }}>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)" }}>🌐 Portal</span>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:colorAcceso, fontWeight:700 }}>
                  {estadoAcceso}
                </span>
              </div>
            );
          })()}
          {[
            ["📞 Teléfono",   v.telefono],
            ["✉️ Email",      v.email],
            ["👕 Talla",      v.talla],
            ["🏷️ Rol",        v.rol ? (v.rol === "responsable" ? "Responsable de puesto" : "Voluntario de apoyo") : null],
            ["📍 Puesto",     puesto?.nombre || "Sin asignar"],
            ["🗓 Registrado", v.fechaRegistro],
            ["🚗 Vehículo",   v.coche ? "Sí, tiene coche" : "No"],
            ["🎂 Nacimiento", v.fechaNacimiento ? (() => {
              const años = Math.floor((new Date() - new Date(v.fechaNacimiento)) / (365.25 * 86400000));
              return `${v.fechaNacimiento} (${años} años)`;
            })() : null],
            ["🚨 Emergencia", v.telefonoEmergencia || v.contactoEmergencia],
            ["⚕️ Alergias",  v.alergias || null],
            ["💊 Medicación", v.medicacion || null],
          ].filter(([,val]) => val).map(([label, val]) => {
            const isMedical = label.includes("Alergias") || label.includes("Medicación");
            return (
            <div key={label} style={{ display:"flex", justifyContent:"space-between",
              alignItems:"flex-start",
              padding:"0.4rem 0.4rem", borderBottom:"1px solid rgba(30,45,80,0.3)",
              background: isMedical ? "rgba(251,191,36,.05)" : undefined,
              borderLeft: isMedical ? "2px solid var(--amber)" : undefined,
              borderRadius: isMedical ? 4 : undefined,
            }}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color: isMedical ? "var(--amber)" : "var(--text-muted)", flexShrink:0 }}>{label}</span>
              <span style={{ fontSize:"var(--fs-base)", fontWeight:600, color: isMedical ? "var(--amber)" : undefined, textAlign:"right", marginLeft:".5rem" }}>{val}</span>
            </div>
          )})}
          {v.notas && (
            <div style={{ background:"var(--surface2)", borderRadius:8, padding:"0.6rem 0.75rem",
              borderLeft:"2px solid var(--border)", marginTop:"0.25rem" }}>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)",
                marginBottom:"0.25rem", textTransform:"uppercase" }}>Notas del organizador</div>
              <div style={{ fontSize:"var(--fs-base)", lineHeight:1.5 }}>{v.notas}</div>
            </div>
          )}

          {/* Mensaje del voluntario a la organización */}
          {v.mensajeParaOrganizador && (
            <div style={{ background:"rgba(34,211,238,.08)", borderRadius:8, padding:"0.75rem 0.85rem",
              borderLeft:"3px solid var(--cyan)", marginTop:"0.5rem",
              border:"1px solid rgba(34,211,238,.2)", borderLeftWidth:3 }}>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--cyan)",
                marginBottom:"0.35rem", textTransform:"uppercase", fontWeight:700, letterSpacing:".06em" }}>
                💬 Mensaje del voluntario
              </div>
              <div style={{ fontSize:"var(--fs-base)", lineHeight:1.6, color:"var(--text)" }}>{v.mensajeParaOrganizador}</div>
            </div>
          )}

          {/* Mensaje del organizador visible por el voluntario en su portal */}
          {onUpdate && (
            <MensajeOrganizadorEdit
              valor={v.mensajeOrganizador || ""}
              onChange={(msg) => onUpdate({ mensajeOrganizador: msg })}
            />
          )}

          {v.notaVoluntario && (
            <div style={{ background:"rgba(34,211,238,.08)", borderRadius:8, padding:"0.75rem 0.85rem",
              borderLeft:"3px solid var(--cyan)", marginTop:"0.5rem",
              border:"1px solid rgba(34,211,238,.2)", borderLeftWidth:3 }}>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--cyan)",
                marginBottom:"0.35rem", textTransform:"uppercase", fontWeight:700, letterSpacing:".06em" }}>
                📝 Nota del voluntario
              </div>
              <div style={{ fontSize:"var(--fs-base)", lineHeight:1.6, color:"var(--text)" }}>{v.notaVoluntario}</div>
            </div>
          )}

          {/* Historial de cambios */}
          {Array.isArray(v.historial) && v.historial.length > 0 && (
            <HistorialCambios historial={v.historial} />
          )}

          {/* Material del puesto asignado (desde Logística) */}
          {puesto && loc && (
            <div style={{ background:"var(--surface2)", borderRadius:8, padding:"0.6rem 0.75rem",
              borderLeft:"2px solid var(--cyan)", marginTop:"0.25rem" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                marginBottom:"0.3rem" }}>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                  color:"var(--cyan)", textTransform:"uppercase", fontWeight:700 }}>
                  📦 Material en tu puesto
                </div>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("teg-navigate",
                    {detail:{block:"logistica",subtab:"material"}}))}
                  style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-2xs)", padding:".08rem .3rem",
                    borderRadius:3, border:"1px solid rgba(34,211,238,.3)",
                    background:"rgba(34,211,238,.1)", color:"var(--cyan)", cursor:"pointer" }}>
                  Ver →
                </button>
              </div>
              {materialEnLoc.length === 0 ? (
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                  color:"var(--text-dim)" }}>Sin material asignado a {loc.nombre}</div>
              ) : materialEnLoc.slice(0, 5).map((item, i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between",
                  fontSize:"var(--fs-sm)", padding:"0.18rem 0",
                  borderBottom: i < Math.min(materialEnLoc.length,5)-1 ? "1px solid var(--border)" : "none" }}>
                  <span className="fw-600">{item.nombre}</span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                    color:"var(--cyan)" }}>{item.cantidad} {item.unidad}</span>
                </div>
              ))}
              {materialEnLoc.length > 5 && (
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                  color:"var(--text-dim)", marginTop:"0.2rem" }}>
                  +{materialEnLoc.length - 5} ítems más
                </div>
              )}
            </div>
          )}
        </div>
        {/* Acciones rápidas de estado */}
        {onUpdate && v.estado !== "confirmado" && v.estado !== "cancelado" && (
          <div style={{ padding:"0.6rem 1.25rem", borderTop:"1px solid var(--border)",
            display:"flex", gap:"0.5rem" }}>
            <button
              className="btn btn-green"
              style={{ flex:1, fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)" }}
              onClick={() => onUpdate({ estado:"confirmado" })}>
              ✓ Confirmar voluntario
            </button>
            <button
              className="btn btn-ghost"
              style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
                color:"var(--red)", border:"1px solid rgba(248,113,113,.3)" }}
              onClick={() => onUpdate({ estado:"cancelado" })}>
              ✕ Cancelar
            </button>
          </div>
        )}
        {onUpdate && v.estado === "confirmado" && (
          <div style={{ padding:"0.5rem 1.25rem", borderTop:"1px solid var(--border)", display:"flex", gap:".5rem", flexWrap:"wrap" }}>
            <button
              className="btn btn-ghost"
              style={{ flex:1, fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
                color:"var(--text-muted)" }}
              onClick={() => onUpdate({ estado:"pendiente" })}>
              ↩ Mover a pendiente
            </button>
            {eventoYaPaso && (
              <button
                className="btn btn-ghost"
                style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-sm)",
                  color:"var(--amber)", borderColor:"rgba(232,200,74,.4)" }}
                onClick={generarCertificadoPDF}
                title="Generar certificado de participación (PDF)">
                🎖️ Certificado
              </button>
            )}
          </div>
        )}
        <div className="modal-footer" style={{ justifyContent:"space-between" }}>
          {onUpdate && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:".65rem .85rem", borderTop:"1px solid var(--border)",
              background: v.coche ? "rgba(34,211,238,.06)" : "var(--surface2)",
              transition:"background .2s" }}>
              <div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
                  color: v.coche ? "var(--cyan)" : "var(--text-muted)" }}>
                  🚗 Vehículo propio
                </div>
                {v.coche && (
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-2xs)", color:"var(--cyan)", marginTop:"0.1rem" }}>
                    Tiene coche disponible
                  </div>
                )}
              </div>
              <button
                className={`btn btn-sm ${v.coche ? "btn-cyan" : "btn-ghost"}`}
                onClick={() => onUpdate({ coche: !v.coche })}
                style={{ minWidth:100, fontWeight:700 }}>
                {v.coche ? "✓ Con coche" : "Sin coche"}
              </button>
            </div>
          )}
          {/* ── Entrega de camiseta (toggle organizador) ── */}
          {onUpdate && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:".65rem .85rem", borderTop:"1px solid var(--border)",
              background: v.camisetaEntregada ? "rgba(52,211,153,.06)" : "var(--surface2)",
              transition:"background .2s" }}>
              <div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", fontWeight:700,
                  color: v.camisetaEntregada ? "var(--green)" : "var(--text-muted)" }}>
                  🎽 Camiseta {v.talla ? `(${v.talla})` : ""}
                </div>
                {v.camisetaEntregada && (
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-2xs)", color:"var(--green)", marginTop:"0.1rem" }}>
                    Entregada al voluntario
                  </div>
                )}
              </div>
              <button
                className={`btn btn-sm ${v.camisetaEntregada ? "btn-green" : "btn-ghost"}`}
                onClick={() => onUpdate({ camisetaEntregada: !v.camisetaEntregada })}
                style={{ minWidth:100, fontWeight:700 }}>
                {v.camisetaEntregada ? "✓ Entregada" : "Marcar entregada"}
              </button>
            </div>
          )}
          {!confirmando ? (
            <>
              <button className="btn btn-red" onClick={() => setConfirmando(true)}>🗑 Eliminar</button>
              <div style={{ display:"flex", gap:"0.4rem", flexWrap:"wrap" }}>
                {/* Botones del portal del voluntario */}
                {v.telefono && (
                  <button className="btn btn-ghost btn-sm"
                    title="Copiar enlace al portal del voluntario"
                    onClick={() => {
                      const url = window.location.origin + "/voluntarios/mi-ficha";
                      navigator.clipboard?.writeText(url).then(() => toast.success("Enlace al portal copiado"));
                    }}>
                    📱 Portal
                  </button>
                )}
                {v.telefono && onUpdate && (
                  <button className="btn btn-ghost btn-sm"
                    title="Resetear PIN al valor inicial (últimos 4 del teléfono)"
                    onClick={async () => {
                      try {
                        // SEC-01: el proxy BFF inyecta la x-api-key server-side
                        const res = await fetch("/api/proxy/voluntarios?action=reset-pin", {
                          method: "POST",
                          headers: { "Content-Type":"application/json" },
                          body: JSON.stringify({ voluntarioId: v.id }),
                        });
                        const d = await res.json();
                        if(res.ok) {
                          // Actualizar estado local para reflejar el reset inmediatamente
                          if (onUpdate) onUpdate({ pinPersonalizado: false, sessionToken: null });
                          toast.success("PIN reseteado. El voluntario debe usar los últimos 4 dígitos de su teléfono.");
                        } else toast.error(d.error || "Error al resetear PIN");
                      } catch { toast.error("Error de conexión"); }
                    }}>
                    🔑 Reset PIN
                  </button>
                )}
                <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
                <button className="btn btn-cyan" onClick={onEditar}>✏️ Editar</button>
              </div>
            </>
          ) : (
            <>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--red)", flex:1 }}>¿Eliminar a {v.nombre}?</span>
              <button className="btn btn-ghost" onClick={() => setConfirmando(false)}>Cancelar</button>
              <button className="btn btn-red" onClick={() => { if(onEliminarConfirmado) onEliminarConfirmado(); else onEliminar(); }}>Sí, eliminar</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


// Exports
export { HistorialCambios };
export { MensajeOrganizadorEdit };
export { FichaVoluntario };
