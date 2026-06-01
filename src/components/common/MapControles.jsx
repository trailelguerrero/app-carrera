/**
 * MapControles.jsx — Barra de controles reutilizable para todos los mapas Leaflet.
 *
 * Muestra dos botones flotantes sobre el mapa (esquina superior derecha):
 *   • Ampliar / Reducir  — pantalla completa (Fullscreen API + fallback CSS iOS)
 *   • Mapa / Satélite    — alterna entre capa OSM estándar y satélite Esri
 *
 * Uso:
 *   <MapControles
 *     isFullscreen={isFullscreen}
 *     onToggleFullscreen={toggleFullscreen}
 *     tileMode={tileMode}           // "map" | "satellite"
 *     onToggleTile={toggleTile}
 *   />
 *
 * El componente se posiciona con position:absolute — el contenedor padre
 * debe tener position:relative.
 */

export function MapControles({ isFullscreen, onToggleFullscreen, tileMode, onToggleTile }) {
  const isSat = tileMode === "satellite";

  const btnStyle = {
    display:        "flex",
    alignItems:     "center",
    gap:            ".35rem",
    padding:        ".4rem .65rem",
    borderRadius:   "8px",
    cursor:         "pointer",
    fontFamily:     "var(--font-mono, monospace)",
    fontSize:       ".72rem",
    fontWeight:     700,
    whiteSpace:     "nowrap",
    border:         "1px solid rgba(255,255,255,.22)",
    background:     "rgba(10,20,40,.72)",
    color:          "#e2e8f0",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    boxShadow:      "0 2px 8px rgba(0,0,0,.35)",
    transition:     "background .15s, transform .1s",
    userSelect:     "none",
  };

  return (
    <div
      style={{
        position:      "absolute",
        top:           "10px",
        right:         "10px",
        zIndex:        1000,           // por encima de los tiles de Leaflet
        display:       "flex",
        flexDirection: "column",
        gap:           ".4rem",
        pointerEvents: "all",
      }}
    >
      {/* Ampliar / Reducir */}
      <button
        onClick={onToggleFullscreen}
        title={isFullscreen ? "Reducir mapa" : "Ampliar mapa a pantalla completa"}
        style={btnStyle}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(34,211,238,.22)"; e.currentTarget.style.borderColor = "rgba(34,211,238,.5)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(10,20,40,.72)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.22)"; }}
        onMouseDown={e => { e.currentTarget.style.transform = "scale(.96)"; }}
        onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        {isFullscreen ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
              <path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
            </svg>
            Reducir
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8V5a2 2 0 0 1 2-2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/>
              <path d="M21 16v3a2 2 0 0 1-2 2h-3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/>
            </svg>
            Ampliar
          </>
        )}
      </button>

      {/* Mapa / Satélite */}
      <button
        onClick={onToggleTile}
        title={isSat ? "Cambiar a mapa estándar" : "Cambiar a vista satélite"}
        style={{
          ...btnStyle,
          ...(isSat ? {
            background:   "rgba(34,197,94,.18)",
            borderColor:  "rgba(34,197,94,.45)",
            color:        "#86efac",
          } : {}),
        }}
        onMouseEnter={e => { e.currentTarget.style.background = isSat ? "rgba(34,197,94,.32)" : "rgba(34,211,238,.22)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = isSat ? "rgba(34,197,94,.18)" : "rgba(10,20,40,.72)"; }}
        onMouseDown={e => { e.currentTarget.style.transform = "scale(.96)"; }}
        onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        {isSat ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="2"/><path d="M2 12h20"/><path d="M12 2v20"/>
            </svg>
            Mapa
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
              <path d="M2 12h20"/>
            </svg>
            Satélite
          </>
        )}
      </button>
    </div>
  );
}
