import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

/**
 * Tooltip contextual reutilizable — TEG Design System
 * Renderiza en document.body via portal para evitar clipping por overflow:auto del main.
 * Desktop: hover. Móvil: tap para mostrar/ocultar.
 */

export function TooltipIcon({ size = 13 }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", justifyContent:"center",
      width:size, height:size, borderRadius:"50%",
      background:"rgba(90,106,138,0.25)", border:"1px solid rgba(90,106,138,0.4)",
      color:"var(--text-muted)", fontSize:size*0.72, fontWeight:700,
      fontFamily:"var(--font-mono)", lineHeight:1, cursor:"help", flexShrink:0,
      userSelect:"none",
    }}>?</span>
  );
}

export function Tooltip({ text, children, position = "top", maxWidth = 260 }) {
  const [visible, setVisible] = useState(false);
  const [coords,  setCoords]  = useState({ top:0, left:0 });
  const triggerRef = useRef(null);
  const hoverTimer = useRef(null);
  const isTouchRef = useRef(false);

  const calcCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const r   = triggerRef.current.getBoundingClientRect();
    const vw  = window.innerWidth;
    const vh  = window.innerHeight;
    let left  = r.left + r.width / 2;
    left = Math.max(maxWidth / 2 + 8, Math.min(left, vw - maxWidth / 2 - 8));
    // position:fixed coords — top del tooltip (se ajustará con transform)
    const top = position === "bottom"
      ? Math.min(r.bottom + 8, vh - 80)
      : r.top - 8;
    setCoords({ top, left, above: position !== "bottom" });
  }, [maxWidth, position]);

  // Desktop hover
  const onMouseEnter = () => {
    if (isTouchRef.current) return;
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => { calcCoords(); setVisible(true); }, 120);
  };
  const onMouseLeave = () => {
    if (isTouchRef.current) return;
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setVisible(false), 100);
  };

  // Móvil tap
  const onTouchStart = (e) => {
    isTouchRef.current = true;
    e.stopPropagation();
    if (visible) {
      setVisible(false);
    } else {
      calcCoords();
      setVisible(true);
    }
  };

  // Click en el trigger: stopPropagation para no disparar el onClick del KPI padre
  const onClick = (e) => e.stopPropagation();

  // Cerrar al tocar/clicar fuera
  useEffect(() => {
    if (!visible) return;
    const close = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      setVisible(false);
    };
    document.addEventListener("mousedown",  close);
    document.addEventListener("touchstart", close, { passive: true });
    window.addEventListener("scroll", () => setVisible(false), { once:true, passive:true });
    return () => {
      document.removeEventListener("mousedown",  close);
      document.removeEventListener("touchstart", close);
    };
  }, [visible]);

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  const tooltip = visible ? createPortal(
    <div
      onMouseEnter={() => { clearTimeout(hoverTimer.current); }}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed",
        // Si está "above", anclamos desde abajo; si está "below", desde arriba
        ...(coords.above
          ? { bottom: `calc(100vh - ${coords.top}px)` }
          : { top: coords.top }),
        left: coords.left,
        transform: "translateX(-50%)",
        zIndex: 99999,
        maxWidth,
        background: "var(--surface3)",
        border: "1px solid var(--border-light)",
        borderRadius: 8,
        padding: "0.55rem 0.75rem",
        boxShadow: "0 8px 24px rgba(0,0,0,0.55)",
        fontFamily: "var(--font-mono)",
        fontSize: "0.68rem",
        color: "var(--text-muted)",
        lineHeight: 1.55,
        whiteSpace: "pre-wrap",
        pointerEvents: "auto",
        userSelect: "none",
      }}>
      {/* flecha */}
      <div style={{
        position: "absolute",
        ...(coords.above ? { bottom: -4 } : { top: -4 }),
        left: "50%",
        width: 8, height: 8,
        background: "var(--surface3)",
        border: "1px solid var(--border-light)",
        borderRight: "none",
        ...(coords.above
          ? { borderTop: "none",    transform: "translateX(-50%) rotate(225deg)" }
          : { borderBottom: "none", transform: "translateX(-50%) rotate(45deg)" }),
      }}/>
      {text}
    </div>,
    document.body
  ) : null;

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onTouchStart={onTouchStart}
        onClick={onClick}
        style={{ display:"inline-flex", alignItems:"center", gap:4, cursor:"help" }}>
        {children}
      </span>
      {tooltip}
    </>
  );
}
