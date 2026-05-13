/**
 * PanelCompartir.jsx — extraído de Voluntarios.jsx (CORE-14)
 * Gestiona el dropdown de compartir el portal + panel QR.
 * Props: portalUrl (string)
 */
import { useState, useRef, useEffect } from "react";
import { toast } from "@/lib/toast";

export function PanelCompartir({ portalUrl }) {
  const [urlCopiada, setUrlCopiada]     = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [shareMenuPos, setShareMenuPos]  = useState({ top: 0, left: 0, right: "auto" });
  const [qrDataUrl, setQrDataUrl]        = useState(null);
  const [qrLoading, setQrLoading]        = useState(false);
  const shareMenuRef = useRef(null);
  const shareBtnRef  = useRef(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    if (!shareMenuOpen) return;
    const handler = (e) => {
      if (shareMenuRef.current?.contains(e.target)) return;
      if (shareBtnRef.current?.contains(e.target)) return;
      setShareMenuOpen(false);
    };
    const t = setTimeout(() => document.addEventListener("click", handler), 0);
    return () => { clearTimeout(t); document.removeEventListener("click", handler); };
  }, [shareMenuOpen]);

  const openShareMenu = () => {
    if (shareMenuOpen) { setShareMenuOpen(false); return; }
    if (shareBtnRef.current) {
      const r = shareBtnRef.current.getBoundingClientRect();
      const menuW = 240;
      const vw = window.innerWidth;
      const rightSpace = vw - r.right;
      const leftSpace  = r.left;
      let pos;
      if (rightSpace >= menuW - 20 || rightSpace >= leftSpace) {
        pos = { top: r.bottom + 6, left: Math.min(r.left, vw - menuW - 8), right: "auto" };
      } else {
        pos = { top: r.bottom + 6, right: Math.max(8, vw - r.right), left: "auto" };
      }
      setShareMenuPos(pos);
    }
    setShareMenuOpen(true);
  };

  const copiarEnlace = () => {
    navigator.clipboard.writeText(portalUrl).then(() => {
      setUrlCopiada(true);
      setTimeout(() => setUrlCopiada(false), 2000);
      toast.success("Enlace copiado ✓");
      setShareMenuOpen(false);
    });
  };

  const generarQR = async () => {
    if (qrDataUrl) { setQrDataUrl(null); setShareMenuOpen(false); return; }
    setQrLoading(true);
    try {
      const QRCode = (await import("qrcode")).default;
      const dataUrl = await QRCode.toDataURL(portalUrl, {
        width: 256, margin: 2,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      setQrDataUrl(dataUrl);
    } catch {
      toast.error("Error al generar QR");
    } finally {
      setQrLoading(false);
      setShareMenuOpen(false);
    }
  };

  const menuItemStyle = {
    justifyContent: "flex-start", gap: ".5rem",
    display: "flex", alignItems: "center", width: "100%",
    padding: ".65rem .85rem", background: "transparent", border: "none",
    borderRadius: 8, cursor: "pointer", color: "#e2e8f0",
    fontFamily: "var(--font-mono)", fontSize: ".85rem", fontWeight: 600,
    transition: "background .1s",
  };

  return (
    <>
      {/* ── Botón de compartir ── */}
      <div ref={shareMenuRef} style={{ position: "relative" }}>
        <button
          ref={shareBtnRef}
          className="btn btn-ghost btn-sm"
          onClick={openShareMenu}
          title="Compartir portal de voluntarios">
          🔗 Portal {shareMenuOpen ? "▲" : "▼"}
        </button>

        {shareMenuOpen && (
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: "fixed", top: shareMenuPos.top,
              left:  shareMenuPos.left  !== "auto" ? shareMenuPos.left  : undefined,
              right: shareMenuPos.right !== "auto" ? shareMenuPos.right : undefined,
              zIndex: 9999,
              background: "#1a2540",
              border: "1px solid rgba(148,163,184,.3)",
              borderRadius: 12, padding: ".5rem", minWidth: 240, maxWidth: "calc(100vw - 1rem)",
              boxShadow: "0 16px 48px rgba(0,0,0,.85), 0 0 0 1px rgba(34,211,238,.12)",
              display: "flex", flexDirection: "column", gap: ".3rem",
            }}>
            <button
              style={menuItemStyle}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(34,211,238,.1)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              onClick={copiarEnlace}>
              📋 {urlCopiada ? "¡Copiado!" : "Copiar enlace"}
            </button>
            <button
              style={menuItemStyle}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(34,211,238,.1)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              onClick={generarQR}>
              {qrLoading ? "⏳ Generando…" : "🔲 Ver QR"}
            </button>
            <div style={{ height: 1, background: "rgba(148,163,184,.2)", margin: ".2rem .2rem" }} />
            <a
              href={portalUrl} target="_blank" rel="noreferrer"
              style={{ ...menuItemStyle, color: "#22d3ee", textDecoration: "none" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(34,211,238,.1)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              ↗ Abrir en nueva pestaña
            </a>
          </div>
        )}
      </div>

      {/* ── Panel QR (inline bajo el header) ── */}
      {qrDataUrl && (
        <div className="card mb" style={{
          padding: "1rem", display: "flex", flexDirection: "column",
          alignItems: "center", gap: ".65rem", background: "var(--surface2)",
        }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
            color: "var(--cyan)", textTransform: "uppercase", letterSpacing: ".06em",
          }}>
            🔲 QR — Formulario de voluntarios
          </div>
          <img
            src={qrDataUrl} alt="QR formulario voluntarios"
            style={{ borderRadius: 8, border: "4px solid #fff", width: 200, height: 200 }} />
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)",
            textAlign: "center", wordBreak: "break-all", maxWidth: 280,
          }}>
            {portalUrl}
          </div>
          <div style={{ display: "flex", gap: ".5rem" }}>
            <a href={qrDataUrl} download="qr-voluntarios-teg.png" className="btn btn-ghost btn-sm">
              ⬇ Descargar PNG
            </a>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigator.clipboard.writeText(portalUrl).then(() => toast.success("URL copiada al portapapeles"))}>
              📋 Copiar enlace
            </button>
          </div>
        </div>
      )}
    </>
  );
}
