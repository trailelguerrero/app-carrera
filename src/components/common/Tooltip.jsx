import { useState, useRef, useEffect } from "react";

/**
 * Tooltip contextual reutilizable — TEG Design System
 * Uso standalone:  <Tooltip text="..."><TooltipIcon /></Tooltip>
 * Uso con label:   <Tooltip text="..."><span>Etiqueta</span></Tooltip>
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
  const [visible, setVisible] = useState(false);
  const [coords,  setCoords]  = useState({ top:0, left:0 });
  const triggerRef = useRef(null);
  const timer      = useRef(null);

  const show = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setVisible(true), 130); };
  const hide = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setVisible(false), 80); };
  // Toggle táctil: un toque muestra, otro oculta
  const toggle = (e) => {
    e.stopPropagation();
    if (visible) { clearTimeout(timer.current); setVisible(false); }
    else show();
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  // Cerrar al tocar fuera
  useEffect(() => {
    if (!visible) return;
    const close = () => { clearTimeout(timer.current); setVisible(false); };
    document.addEventListener("click", close, { once: true });
    return () => document.removeEventListener("click", close);
  }, [visible]);

  useEffect(() => {
    if (!visible || !triggerRef.current) return;
    const r  = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    let left = r.left + r.width / 2;
    left = Math.max(maxWidth / 2 + 8, Math.min(left, vw - maxWidth / 2 - 8));
    const top = position === "bottom" ? r.bottom + 8 : r.top - 8;
    setCoords({ top, left });
  }, [visible, position, maxWidth]);

  return (
    <>
      <span ref={triggerRef}
        onMouseEnter={show} onMouseLeave={hide}
        onClick={toggle}
        style={{ display:"inline-flex", alignItems:"center", gap:4, cursor:"help" }}>
        {children}
      </span>
      {visible && (
        <div onMouseEnter={show} onMouseLeave={hide} style={{
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
          pointerEvents:"none", whiteSpace:"pre-wrap",
        }}>
          <div style={{
            position:"absolute",
            ...(position==="bottom"?{top:-4}:{bottom:-4}),
            left:"50%",
            width:8,height:8,
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
