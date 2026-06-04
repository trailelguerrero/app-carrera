import { createPortal } from "react-dom";
import { getFileIcon } from "@/constants/documentosConstants";

export function VisorModal({ visorDoc, onClose, onDownload }) {
  if (!visorDoc) return null;

  return createPortal(
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)",
      backdropFilter: "blur(8px)", zIndex: 9999,
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: ".75rem 1rem", background: "rgba(0,0,0,0.6)",
        borderBottom: "1px solid rgba(255,255,255,0.1)", flexShrink: 0,
      }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--fs-base)", color: "#fff" }}>
            {getFileIcon(visorDoc.tipo)} {visorDoc.nombreDisplay || visorDoc.nombre}
          </div>
          {visorDoc.emisor && (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "rgba(255,255,255,0.5)", marginTop: ".15rem" }}>
              🏢 {visorDoc.emisor}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
          <button onClick={() => onDownload(visorDoc)} style={{
            background: "rgba(52,211,153,0.15)", color: "#34d399",
            border: "1px solid rgba(52,211,153,0.3)", borderRadius: 8,
            padding: ".35rem .75rem", fontFamily: "var(--font-display)",
            fontWeight: 700, fontSize: "var(--fs-sm)", cursor: "pointer",
          }}>⬇ Descargar</button>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.1)", color: "#fff",
            border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8,
            padding: ".35rem .75rem", fontFamily: "var(--font-display)",
            fontWeight: 700, fontSize: "var(--fs-sm)", cursor: "pointer",
          }}>✕ Cerrar</button>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
        {visorDoc._loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", textAlign: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%",
              border: "3px solid rgba(255,255,255,0.15)", borderTopColor: "#22d3ee",
              animation: "teg-spin 0.7s linear infinite" }} />
            <div style={{ fontFamily: "monospace", fontSize: "var(--fs-sm)", color: "rgba(255,255,255,0.5)" }}>
              Cargando documento…
            </div>
          </div>
        ) : visorDoc._error ? (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.7)" }}>
            <div style={{ fontSize: "3rem", marginBottom: ".75rem" }}>⚠️</div>
            <div style={{ fontFamily: "monospace", fontSize: "var(--fs-base)", marginBottom: "1rem" }}>
              No se pudo cargar el documento
            </div>
            <button onClick={() => onDownload(visorDoc)} style={{
              background: "#34d399", color: "var(--bg)", border: "none", borderRadius: 10,
              padding: ".6rem 1.5rem", fontWeight: 800, fontSize: "var(--fs-base)", cursor: "pointer",
            }}>⬇ Descargar</button>
          </div>
        ) : visorDoc._esPdf ? (
          <iframe
            src={visorDoc._objectUrl || visorDoc.blobUrl || visorDoc.data}
            style={{ width: "100%", height: "100%", border: "none", minHeight: "60vh" }}
            title={visorDoc.nombre}
          />
        ) : (visorDoc.blobUrl || visorDoc.data) ? (
          <img
            src={visorDoc.blobUrl || visorDoc.data}
            alt={visorDoc.nombreDisplay || visorDoc.nombre}
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }}
          />
        ) : null}
      </div>
    </div>,
    document.body
  );
}
