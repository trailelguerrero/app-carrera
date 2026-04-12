import { useState, useRef, useEffect, useCallback } from "react";

/**
 * Tooltip contextual reutilizable — TEG Design System
 * Desktop: hover. Móvil: tap para mostrar/ocultar.
 * Funciona correctamente dentro de elementos con onClick.
 */

export function TooltipIcon({ size = 13 }) {
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",justifyContent:"center",
      width:size,height:size,borderRadius:"50%",
      background:"rgba(90,106,138,0.25)",border:"1px solid rgba(90,106,138,0.4)",
      color:"var(--text-muted)",fontSize:size*0.72,fontWeight:700,
      fontFamily:"var(--font-mono)",lineHeight:1,cursor:"help",flexShrink:0,
      userSelect:"none",
    }}>?</span>
  );
}

export function Tooltip({ text, children, position = "top", maxWidth = 260 }) {
  const [visible, setVisible]   = useState(false);
  const [coords,  setCoords]    = useState({ top:0, left:0 });
  const triggerRef  = useRef(null);
  const tooltipRef  = useRef(null);
  const hoverTimer  = useRef(null);
  const isTouchRef  = useRef(false);

  // Calcular posición
  const calcCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const r  = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    let left = r.left + r.width / 2;
    left = Math.max(maxWidth / 2 + 8, Math.min(left, vw - maxWidth / 2 - 8));
    const top = position === "bottom" ? r.bottom + 8 : r.top - 8;
    setCoords({ top, left });
  }, [maxWidth, position]);

  // Desktop: hover
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

  // Móvil: tap toggle — stopPropagation para no disparar el onClick del padre
  const onTouchStart = (e) => {
    isTouchRef.current = true;
    e.stopPropagation();
    calcCoords();
    setVisible(v => !v);
  };

  // Cerrar al hacer scroll o al tocar fuera (solo cuando visible)
  useEffect(() => {
    if (!visible) return;
    const close = (e) => {
      // No cerrar si el click viene del propio trigger o tooltip
      if (triggerRef.current?.contains(e.target)) return;
      if (tooltipRef.current?.contains(e.target)) return;
      setVisible(false);
    };
    // touchstart para móvil, mousedown para desktop (más fiable que click)
    document.addEventListener("touchstart", close, { passive: true });
    document.addEventListener("mousedown",  close);
    window.addEventListener("scroll", () => setVisible(false), { once: true, passive: true });
    return () => {
      document.removeEventListener("touchstart", close);
      document.removeEventListener("mousedown", close);
    };
  }, [visible]);

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onTouchStart={onTouchStart}
        onClick={e => e.stopPropagation()}
        style={{ display:"inline-flex", alignItems:"center", gap:4, cursor:"help" }}>
        {children}
      </span>
      {visible && (
        <div
          ref={tooltipRef}
          onMouseEnter={() => clearTimeout(hoverTimer.current)}
          onMouseLeave={onMouseLeave}
          style={{
            position:"fixed",
            ...(position === "bottom"
              ? { top: coords.top }
              : { bottom: `calc(100vh - ${coords.top}px)` }),
            left:coords.left, transform:"translateX(-50%)",
            zIndex:9999, maxWidth,
            background:"var(--surface3)",
            border:"1px solid var(--border-light)",
            borderRadius:8, padding:"0.55rem 0.75rem",
            boxShadow:"0 8px 24px rgba(0,0,0,0.5)",
            fontFamily:"var(--font-mono)", fontSize:"0.68rem",
            color:"var(--text-muted)", lineHeight:1.55,
            pointerEvents:"auto", whiteSpace:"pre-wrap",
            userSelect:"none",
          }}>
          <div style={{
            position:"absolute",
            ...(position==="bottom"?{top:-4}:{bottom:-4}),
            left:"50%",
            width:8, height:8,
            background:"var(--surface3)",
            border:"1px solid var(--border-light)",
            borderRight:"none",
            ...(position==="bottom"
              ? {borderBottom:"none", transform:"translateX(-50%) rotate(45deg)"}
              : {borderTop:"none",    transform:"translateX(-50%) rotate(225deg)"}),
          }}/>
          {text}
        </div>
      )}
    </>
  );
}
