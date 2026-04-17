/**
 * TEG DESIGN SYSTEM — CSS compartido para todos los bloques
 * Importar con: import { BLOCK_CSS, blockCls } from "@/lib/blockStyles";
 * Usar con:     <style>{BLOCK_CSS}</style>
 */

export const BLOCK_CSS = `
  /* ── Design tokens — Kinetik Ops identity ──────────────────────────────── */
  :root {
    --bg:           #08091a;
    --surface:      #0d1121;
    --surface2:     #121829;
    --surface3:     #18203a;
    --border:       #1e2d50;
    --border-light: #2a4070;
    --text:         #f0f4ff;
    --text-muted:   #7a8fb0;
    --text-dim:     #4a5e80;
    --cyan:         #22d3ee;  --cyan-dim:   rgba(34,211,238,0.10);
    --violet:       #a78bfa;  --violet-dim: rgba(167,139,250,0.10);
    --green:        #34d399;  --green-dim:  rgba(52,211,153,0.10);
    --amber:        #fbbf24;  --amber-dim:  rgba(251,191,36,0.10);
    --red:          #f87171;  --red-dim:    rgba(248,113,113,0.10);
    --orange:       #fb923c;  --orange-dim: rgba(251,146,60,0.10);
    --primary:      #6366f1;  --primary-dim:rgba(99,102,241,0.15);
    --font-display: 'Syne', sans-serif;
    --font-mono:    'DM Mono', 'Space Mono', monospace;
    --r:            14px;
    --r-sm:         9px;
    /* Kinetik: acento de línea en cards */
    --card-accent-width: 3px;
  }


  /* ── Modo claro (cuando ThemeProvider no añade .dark al html) ─────────── */
  html:not(.dark) :root,
  html.light :root {
    --bg:           #f0f4f8;
    --surface:      #ffffff;
    --surface2:     #e8eef6;
    --surface3:     #dde5f0;
    --border:       #c0cfdf;
    --border-light: #a8bdd4;
    --text:         #0a0e1a;
    --text-muted:   #4a6080;
    --text-dim:     #6a80a0;
    --cyan:         #0891b2;  --cyan-dim:   rgba(8,145,178,0.10);
    --violet:       #7c3aed;  --violet-dim: rgba(124,58,237,0.10);
    --green:        #059669;  --green-dim:  rgba(5,150,105,0.10);
    --amber:        #d97706;  --amber-dim:  rgba(217,119,6,0.10);
    --red:          #dc2626;  --red-dim:    rgba(220,38,38,0.10);
    --orange:       #ea580c;  --orange-dim: rgba(234,88,12,0.10);
    --primary:      #4f46e5;  --primary-dim:rgba(79,70,229,0.12);
  }

  /* ── Scrollbar Kinetik Ops — global 4px ───────────────────────────────── */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: var(--border-light);
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover { background: var(--text-dim); }
  ::-webkit-scrollbar-corner { background: transparent; }

  /* ── Empty states — SVG ilustrado ──────────────────────────────────────── */
  .empty {
    text-align: center;
    padding: 2.5rem 1.5rem;
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-size: .72rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .5rem;
  }
  .empty-icon-wrap {
    width: 56px; height: 56px;
    border-radius: 16px;
    background: var(--surface2);
    border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: .25rem;
    box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  }
  .empty-title {
    font-family: var(--font-display);
    font-size: .82rem;
    font-weight: 700;
    color: var(--text-muted);
    margin: 0;
  }
  .empty-sub {
    font-family: var(--font-mono);
    font-size: .62rem;
    color: var(--text-dim);
    max-width: 220px;
    line-height: 1.5;
    text-align: center;
  }

  /* ── Block shell ────────────────────────────────────────────────────────── */
  .block-container {
    padding: 1rem;
    max-width: 1400px;
    margin: 0 auto;
    color: var(--text);
    font-family: var(--font-display);
  }

  /* ── Block header ───────────────────────────────────────────────────────── */
  .block-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
  }
  .block-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 900;
    font-family: var(--font-display);
    color: var(--text);
    line-height: 1.1;
    letter-spacing: -0.02em;
  }
  .block-title-sub {
    font-family: var(--font-mono);
    font-size: 0.55rem;
    color: var(--text-muted);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-top: 0.2rem;
  }
  .block-actions {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    flex-wrap: wrap;
  }
  /* ── Aliases .ph/.pt — compatibilidad con módulos Logística/Patrocinadores ── */
  .ph {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
  }
  .pt {
    font-size: 1.5rem;
    font-weight: 900;
    font-family: var(--font-display);
    color: var(--text);
    line-height: 1.1;
    letter-spacing: -0.02em;
  }
  .pd {
    font-family: var(--font-mono);
    font-size: 0.55rem;
    color: var(--text-muted);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-top: 0.2rem;
  }
  .fr { display: flex; align-items: center; }
  .g1 { gap: 0.4rem; }

  /* ── KPI grid ───────────────────────────────────────────────────────────── */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(175px, 1fr));
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }
  /* Kinetik: animación de entrada escalonada para las cards */
  @keyframes kpi-fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .kpi-grid .kpi:nth-child(1) { animation: kpi-fade-in 0.35s ease both 0.00s; }
  .kpi-grid .kpi:nth-child(2) { animation: kpi-fade-in 0.35s ease both 0.06s; }
  .kpi-grid .kpi:nth-child(3) { animation: kpi-fade-in 0.35s ease both 0.12s; }
  .kpi-grid .kpi:nth-child(4) { animation: kpi-fade-in 0.35s ease both 0.18s; }
  .kpi-grid .kpi:nth-child(5) { animation: kpi-fade-in 0.35s ease both 0.24s; }
  .kpi-grid .kpi:nth-child(6) { animation: kpi-fade-in 0.35s ease both 0.30s; }
  /* Kinetik Ops KPI cards — Fase B */
  .kpi {
    padding: 1rem 1.15rem 1rem;
    border-radius: var(--r);
    background: var(--surface);
    border: 1px solid var(--border);
    border-left-width: var(--card-accent-width);
    transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  /* Kinetik: línea decorativa en la esquina superior derecha */
  .kpi::before {
    content: "";
    position: absolute;
    top: 0; right: 0;
    width: 40px; height: 40px;
    background: radial-gradient(circle at top right, rgba(255,255,255,0.03) 0%, transparent 70%);
    pointer-events: none;
  }
  .kpi:hover { transform: translateY(-3px); }
  .kpi:active { transform: translateY(-1px); }
  .kpi-label {
    font-size: 0.6rem;
    font-family: var(--font-mono);
    color: var(--text-dim);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 0.5rem;
  }
  /* Kinetik: número ultra-bold display */
  .kpi-value {
    font-size: 2rem;
    font-weight: 900;
    font-family: var(--font-display);
    line-height: 1;
    margin-bottom: 0.25rem;
    letter-spacing: -0.02em;
  }
  .kpi-sub {
    font-size: 0.62rem;
    font-family: var(--font-mono);
    color: var(--text-muted);
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
    margin-top: auto;
  }
  /* Kinetik: progress bar pegada a la base */
  .kpi-progress {
    height: 2px;
    background: rgba(255,255,255,0.05);
    position: absolute;
    bottom: 0; left: 0; right: 0;
    overflow: hidden;
  }
  .kpi-progress-fill {
    height: 100%;
    transition: width 0.7s cubic-bezier(0.4,0,0.2,1);
  }
  /* Color del borde izquierdo */
  .kpi.cyan   { border-left-color: var(--cyan);   }
  .kpi.violet { border-left-color: var(--violet); }
  .kpi.green  { border-left-color: var(--green);  }
  .kpi.amber  { border-left-color: var(--amber);  }
  .kpi.red    { border-left-color: var(--red);    }
  .kpi.orange { border-left-color: var(--orange); }
  .kpi.primary{ border-left-color: var(--primary);}
  .kpi.muted  { border-left-color: var(--border); opacity: 0.65; }
  /* Glassmorphism sutil por categoría */
  .kpi.cyan   { background: linear-gradient(135deg, rgba(34,211,238,0.05) 0%, var(--surface) 55%); }
  .kpi.green  { background: linear-gradient(135deg, rgba(52,211,153,0.05) 0%, var(--surface) 55%); }
  .kpi.amber  { background: linear-gradient(135deg, rgba(251,191,36,0.05) 0%, var(--surface) 55%); }
  .kpi.violet { background: linear-gradient(135deg, rgba(167,139,250,0.05) 0%, var(--surface) 55%); }
  .kpi.red    { background: linear-gradient(135deg, rgba(248,113,113,0.05) 0%, var(--surface) 55%); }
  /* Glow en hover por color */
  .kpi.cyan:hover   { box-shadow: 0 8px 28px rgba(34,211,238,0.13),  0 0 0 1px rgba(34,211,238,0.18); }
  .kpi.green:hover  { box-shadow: 0 8px 28px rgba(52,211,153,0.13),  0 0 0 1px rgba(52,211,153,0.18); }
  .kpi.amber:hover  { box-shadow: 0 8px 28px rgba(251,191,36,0.13),  0 0 0 1px rgba(251,191,36,0.18); }
  .kpi.violet:hover { box-shadow: 0 8px 28px rgba(167,139,250,0.13), 0 0 0 1px rgba(167,139,250,0.18); }
  .kpi.red:hover    { box-shadow: 0 8px 28px rgba(248,113,113,0.13), 0 0 0 1px rgba(248,113,113,0.18); }

  /* ── Tabs ───────────────────────────────────────────────────────────────── */
  .tabs {
    display: flex;
    gap: 0.4rem;
    margin-bottom: 1.25rem;
    overflow-x: auto;
    padding-bottom: 0.4rem;
    -ms-overflow-style: none;
    scrollbar-width: none;
    position: relative;
  }
  .tabs::-webkit-scrollbar { display: none; }
  .tabs-wrap {
    position: relative;
  }
  .tabs-wrap::after {
    content: "";
    position: absolute;
    right: 0; top: 0; bottom: 4px;
    width: 48px;
    background: linear-gradient(to right, transparent, var(--bg));
    pointer-events: none;
    z-index: 1;
  }
  /* Fade izquierdo cuando hay scroll previo */
  .tabs-wrap::before {
    content: "";
    position: absolute;
    left: 0; top: 0; bottom: 4px;
    width: 24px;
    background: linear-gradient(to left, transparent, var(--bg));
    pointer-events: none;
    z-index: 1;
    opacity: 0;
    transition: opacity .15s;
  }
  .tabs-wrap.scrolled::before { opacity: 1; }
  /* ── Quick Filters — Kinetik Ops pill-outline style ─────────────────────── */
  /* Uso: <div class="filter-pill-group"> <button class="filter-pill [active]"> */
  .filter-pill-group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    align-items: center;
  }
  .filter-pill {
    padding: 0.3rem 0.75rem;
    border-radius: 20px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;
    min-height: 30px;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    -webkit-tap-highlight-color: transparent;
  }
  .filter-pill:hover {
    border-color: var(--border-light);
    color: var(--text);
  }
  .filter-pill.active {
    background: rgba(34,211,238,0.1);
    border-color: rgba(34,211,238,0.45);
    color: var(--cyan);
    box-shadow: 0 0 10px rgba(34,211,238,0.12);
  }
  /* Variantes de color activo */
  .filter-pill.active-amber  { background: rgba(251,191,36,0.1);  border-color: rgba(251,191,36,0.45);  color: var(--amber);  box-shadow: 0 0 10px rgba(251,191,36,0.12); }
  .filter-pill.active-green  { background: rgba(52,211,153,0.1);  border-color: rgba(52,211,153,0.45);  color: var(--green);  box-shadow: 0 0 10px rgba(52,211,153,0.12); }
  .filter-pill.active-red    { background: rgba(248,113,113,0.1); border-color: rgba(248,113,113,0.45); color: var(--red);    box-shadow: 0 0 10px rgba(248,113,113,0.12); }
  .filter-pill.active-violet { background: rgba(167,139,250,0.1); border-color: rgba(167,139,250,0.45); color: var(--violet); box-shadow: 0 0 10px rgba(167,139,250,0.12); }
  /* Separador visual entre grupos de pills */
  .filter-pill-sep {
    width: 1px; height: 18px;
    background: var(--border);
    flex-shrink: 0;
    margin: 0 0.15rem;
  }


  /* ── Iconografía por categoría — Kinetik Ops item-icon-pill ─────────────── */
  /* Pill circular con icono de color temático. Uso:
     <div class="item-icon-pill" style="--pill-color: #22d3ee">🍎</div> */
  .item-icon-pill {
    width: 36px; height: 36px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--pill-color, var(--cyan)) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--pill-color, var(--cyan)) 30%, transparent);
    display: flex; align-items: center; justify-content: center;
    font-size: 1rem; flex-shrink: 0;
    transition: transform .15s;
  }
  .item-icon-pill-sm {
    width: 28px; height: 28px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--pill-color, var(--cyan)) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--pill-color, var(--cyan)) 28%, transparent);
    display: flex; align-items: center; justify-content: center;
    font-size: .78rem; flex-shrink: 0;
  }
  /* Fallback para navegadores sin color-mix */
  @supports not (background: color-mix(in srgb, red 10%, blue)) {
    .item-icon-pill    { background: rgba(34,211,238,0.1); border-color: rgba(34,211,238,0.25); }
    .item-icon-pill-sm { background: rgba(34,211,238,0.1); border-color: rgba(34,211,238,0.25); }
  }


  .tab-btn {
    padding: 0.4rem 0.9rem;
    border-radius: 20px;
    background: transparent;
    color: var(--text-muted);
    border: 1px solid var(--border);
    cursor: pointer;
    white-space: nowrap;
    font-weight: 700;
    font-size: 0.75rem;
    font-family: var(--font-mono);
    letter-spacing: 0.04em;
    transition: all 0.18s;
    flex-shrink: 0;
    min-height: 34px;
  }
  .tab-btn:hover { color: var(--text); border-color: var(--border-light); }
  .tab-btn:active { transform: scale(0.97); }
  .tab-btn.active {
    background: rgba(34,211,238,0.12);
    color: var(--cyan);
    border-color: rgba(34,211,238,0.5);
    box-shadow: 0 0 14px rgba(34,211,238,0.15);
  }

  /* ── Cards ──────────────────────────────────────────────────────────────── */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r);
    padding: 1.1rem 1.25rem;
    margin-bottom: 1rem;
    box-shadow: 0 2px 12px rgba(0,0,0,0.18);
  }
  .card-title {
    font-size: 0.88rem;
    font-weight: 700;
    font-family: var(--font-display);
    margin-bottom: 0.85rem;
    display: flex;
    align-items: center;
    gap: 0.45rem;
    color: var(--text);
  }
  .card-title.cyan   { color: var(--cyan);   }
  .card-title.violet { color: var(--violet); }
  .card-title.green  { color: var(--green);  }
  .card-title.amber  { color: var(--amber);  }
  .card-title.red    { color: var(--red);    }
  .card-title.orange { color: var(--orange); }

  /* ── Section header — unifica .ph/.pt con .card-title ──────────────────── */
  /* Uso: <div class="section-header"> <div class="section-title">...</div> */
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.65rem 1rem;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .section-title {
    font-size: 0.82rem;
    font-weight: 800;
    font-family: var(--font-display);
    color: var(--text);
    letter-spacing: -0.01em;
  }
  .section-sub {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    color: var(--text-muted);
    margin-top: 0.1rem;
  }

  /* ── Grid helpers ───────────────────────────────────────────────────────── */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
  @media (max-width: 700px) {
    .grid-2, .grid-3 { grid-template-columns: 1fr; }
  }
  @media (min-width: 701px) and (max-width: 900px) {
    .grid-3 { grid-template-columns: 1fr 1fr; }
  }

  /* ── Tables ─────────────────────────────────────────────────────────────── */
  .overflow-x { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  /* Contenedor con fade lateral para indicar scroll en mobile */
  .tbl-scroll-wrap {
    position: relative;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .tbl-scroll-wrap::after {
    content: '';
    position: absolute;
    right: 0; top: 0; bottom: 0; width: 40px;
    background: linear-gradient(to right, transparent, var(--surface));
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s;
  }
  .tbl-scroll-wrap.has-overflow::after { opacity: 1; }
  .tbl { width: 100%; border-collapse: collapse; font-size: 0.83rem; }
  .tbl th {
    text-align: left; padding: 0.65rem 0.75rem;
    border-bottom: 2px solid var(--border);
    color: var(--text-muted); font-weight: 600;
    font-family: var(--font-mono); font-size: 0.68rem;
    text-transform: uppercase; letter-spacing: 0.05em;
    white-space: nowrap; background: var(--surface);
    position: sticky; top: 0; z-index: 1;
  }
  .tbl td {
    padding: 0.65rem 0.75rem;
    border-bottom: 1px solid rgba(30,45,80,0.6);
    vertical-align: middle;
  }
  .tbl tr:last-child td { border-bottom: none; }
  .tbl tbody tr { transition: background 0.12s; position: relative; }
  .tbl tbody tr td:first-child { position: relative; }
  .tbl tbody tr td:first-child::before {
    content: "";
    position: absolute; left: 0; top: 0; bottom: 0;
    width: 2px;
    background: var(--cyan);
    transform: scaleY(0);
    transform-origin: center;
    transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1);
    border-radius: 0 2px 2px 0;
  }
  .tbl tbody tr:hover td { background: rgba(34,211,238,0.025); }
  .tbl tbody tr:hover td:first-child::before { transform: scaleY(1); }
  .tbl tbody tr:active td { background: rgba(34,211,238,0.05); }
  .total-row td {
    background: var(--surface2) !important;
    font-weight: 700;
    border-top: 2px solid var(--border);
  }
  .text-right { text-align: right; }
  .text-center { text-align: center; }

  /* ── Typography helpers ─────────────────────────────────────────────────── */
  .mono  { font-family: var(--font-mono); }
  .xs    { font-size: 0.68rem; }
  .sm    { font-size: 0.78rem; }
  .muted { color: var(--text-muted); }
  .dim   { color: var(--text-dim); }
  .bold  { font-weight: 700; }

  /* ── Buttons ────────────────────────────────────────────────────────────── */
  .btn {
    padding: 0.55rem 0.9rem;
    border-radius: var(--r-sm);
    font-weight: 700;
    font-size: 0.78rem;
    font-family: var(--font-display);
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.18s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    white-space: nowrap;
    min-height: 36px;
    position: relative;
    -webkit-tap-highlight-color: transparent;
  }
  .btn:active:not(:disabled) { transform: scale(0.96); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-ghost  { background: var(--surface2); color: var(--text-muted); border-color: var(--border); }
  .btn-ghost:hover { color: var(--text); border-color: var(--border-light); }
  .btn-cyan   { background: var(--cyan-dim);   color: var(--cyan);   border-color: rgba(34,211,238,0.3); }
  .btn-cyan:hover   { background: var(--cyan);   color: #080c18; }
  .btn-green  { background: var(--green-dim);  color: var(--green);  border-color: rgba(52,211,153,0.3); }
  .btn-green:hover  { background: var(--green);  color: #080c18; }
  .btn-violet { background: var(--violet-dim); color: var(--violet); border-color: rgba(167,139,250,0.3); }
  .btn-violet:hover { background: var(--violet); color: #080c18; }
  .btn-amber  { background: var(--amber-dim);  color: var(--amber);  border-color: rgba(251,191,36,0.3); }
  .btn-amber:hover  { background: var(--amber);  color: #080c18; }
  .btn-red    { background: var(--red-dim);    color: var(--red);    border-color: rgba(248,113,113,0.3); }
  .btn-red:hover    { background: var(--red);    color: #fff; }
  .btn-primary{ background: var(--primary-dim);color: #c4c6ff;      border-color: rgba(99,102,241,0.4); }
  .btn-primary:hover{ background: var(--primary); color: #fff; }
  /* min-height garantiza área táctil suficiente en mobile (≥ 36px) */
  .btn-sm { padding: 0.4rem 0.65rem; font-size: 0.7rem; min-height: 34px; }
  .btn-icon { padding: 0.4rem 0.5rem; min-width: 36px; min-height: 36px; }

  /* ── Badges ─────────────────────────────────────────────────────────────── */
  .badge {
    display: inline-flex; align-items: center;
    padding: 0.12rem 0.55rem; border-radius: 20px;
    font-size: 0.6rem; font-weight: 700;
    font-family: var(--font-mono);
    text-transform: uppercase; letter-spacing: 0.08em;
    white-space: nowrap;
  }
  .badge-cyan   { background: var(--cyan-dim);   color: var(--cyan);   border: 1px solid rgba(34,211,238,0.2); }
  .badge-violet { background: var(--violet-dim); color: var(--violet); border: 1px solid rgba(167,139,250,0.2); }
  .badge-green  { background: var(--green-dim);  color: var(--green);  border: 1px solid rgba(52,211,153,0.2); }
  .badge-amber  { background: var(--amber-dim);  color: var(--amber);  border: 1px solid rgba(251,191,36,0.2); }
  .badge-red    { background: var(--red-dim);    color: var(--red);    border: 1px solid rgba(248,113,113,0.2); }
  .badge-muted  { background: rgba(90,106,138,0.1); color: var(--text-muted); border: 1px solid rgba(90,106,138,0.2); }

  /* ── Toggle switch ──────────────────────────────────────────────────────── */
  .toggle-btn {
    width: 34px; height: 18px; border-radius: 9px;
    background: var(--surface3); border: 1px solid var(--border);
    cursor: pointer; position: relative;
    transition: background 0.2s, border-color 0.2s;
    padding: 0; flex-shrink: 0;
  }
  .toggle-btn.active {
    background: var(--green-dim);
    border-color: rgba(52,211,153,0.5);
  }
  .toggle-thumb {
    width: 12px; height: 12px; border-radius: 50%;
    background: var(--text-muted);
    position: absolute; top: 2px; left: 2px;
    transition: transform 0.2s, background 0.2s;
  }
  .toggle-btn.active .toggle-thumb {
    transform: translateX(16px);
    background: var(--green);
  }

  /* ── Inputs ─────────────────────────────────────────────────────────────── */
  .inp {
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: var(--r-sm);
    padding: 0.5rem 0.75rem;
    font-family: var(--font-display);
    font-size: 0.88rem;
    transition: border-color 0.15s, box-shadow 0.15s;
    outline: none;
    width: 100%;
    min-height: 40px;
    -webkit-appearance: none;
  }
  .inp:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px var(--cyan-dim); }
  .inp::placeholder { color: var(--text-dim); }
  .inp-mono {
    font-family: var(--font-mono);
    text-align: right;
  }
  .inp-sm { padding: 0.35rem 0.6rem; font-size: 0.78rem; min-height: 34px; }
  select.inp { cursor: pointer; }

  /* ── Progress bar ───────────────────────────────────────────────────────── */
  .progress-bar {
    height: 6px; border-radius: 3px;
    background: var(--surface3);
    overflow: hidden;
  }
  .progress-fill {
    height: 100%; border-radius: 3px;
    transition: width 0.4s ease;
  }

  /* ── Empty state ────────────────────────────────────────────────────────── */
  .empty-state {
    text-align: center; padding: 3rem 1rem;
    color: var(--text-dim);
    font-family: var(--font-mono); font-size: 0.7rem;
  }
  .empty-state-icon { font-size: 2.5rem; margin-bottom: 0.75rem; opacity: 0.5; }

  /* ── Flex helpers ───────────────────────────────────────────────────────── */
  .flex { display: flex; }
  .flex-between { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
  .flex-center  { display: flex; align-items: center; gap: 0.5rem; }
  .gap-sm { gap: 0.4rem; }
  .gap    { gap: 0.75rem; }
  .gap-lg { gap: 1.25rem; }
  .mb-sm  { margin-bottom: 0.5rem; }
  .mb     { margin-bottom: 1rem; }
  .mb-lg  { margin-bottom: 1.5rem; }

  /* ── Search bar ─────────────────────────────────────────────────────────── */
  .search-bar {
    display: flex; align-items: center; gap: 0.5rem;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    padding: 0.35rem 0.65rem;
    transition: border-color 0.15s;
  }
  .search-bar:focus-within { border-color: var(--cyan); }
  .search-bar input {
    background: none; border: none; color: var(--text);
    font-family: var(--font-display); font-size: 0.82rem;
    outline: none; width: 100%;
  }
  .search-bar input::placeholder { color: var(--text-dim); }
  .search-icon { color: var(--text-muted); font-size: 0.85rem; flex-shrink: 0; }

  /* ── Status dot ─────────────────────────────────────────────────────────── */
  .dot {
    width: 8px; height: 8px; border-radius: 50%;
    display: inline-block; flex-shrink: 0;
  }
  .dot-green  { background: var(--green); box-shadow: 0 0 5px rgba(52,211,153,0.5); }
  .dot-amber  { background: var(--amber); box-shadow: 0 0 5px rgba(251,191,36,0.5); }
  .dot-red    { background: var(--red);   box-shadow: 0 0 5px rgba(248,113,113,0.5); }
  .dot-muted  { background: var(--text-muted); }

  /* ── Drag handle ────────────────────────────────────────────────────────── */
  .drag-handle {
    color: var(--text-muted); opacity: 0.25;
    transition: opacity 0.15s; user-select: none; cursor: grab;
  }
  tr:hover .drag-handle, .draggable:hover .drag-handle { opacity: 0.8; }
  .dragging { opacity: 0.4; }

  /* ── Modal backdrop ─────────────────────────────────────────────────────── */
  .modal-backdrop {
    position: fixed; inset: 0; z-index: 100;
    background: rgba(0,0,0,0.75);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex; align-items: flex-end; justify-content: center;
    padding: 0;
    animation: fadeIn 0.15s ease;
  }
  /* En pantallas mayores de 640px — centrado clásico */
  @media (min-width: 641px) {
    .modal-backdrop {
      align-items: center;
      padding: 1rem;
    }
    .modal {
      border-radius: 16px;
    }
  }
  .modal {
    background: var(--surface);
    border: 1px solid var(--border-light);
    /* En mobile: sheet desde abajo. En desktop: modal centrado */
    border-radius: 20px 20px 0 0;
    /* dvh descuenta el teclado virtual en iOS Safari */
    max-height: 92dvh; overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    width: 100%; max-width: 560px;
    box-shadow: 0 -8px 40px rgba(0,0,0,0.4);
    animation: slideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    /* Franja de agarre visual en mobile */
    padding-top: 0;
  }
  .modal::before {
    content: '';
    display: block;
    width: 36px; height: 4px;
    background: var(--border-light);
    border-radius: 2px;
    margin: 10px auto 2px;
    opacity: 0.6;
  }
  .modal-header {
    padding: 0.85rem 1.25rem 0.85rem;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; background: var(--surface); z-index: 1;
  }
  .modal-title { font-weight: 800; font-size: 0.95rem; color: var(--text); }
  .modal-body  { padding: 1.1rem 1.25rem; }
  .modal-footer {
    padding: 0.85rem 1.25rem;
    /* Respeta el área segura inferior en iPhone con home indicator */
    padding-bottom: calc(0.85rem + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid var(--border);
    display: flex; justify-content: flex-end; gap: 0.5rem;
  }

  /* ── Animations ─────────────────────────────────────────────────────────── */
  @keyframes fadeIn  { from { opacity:0 }  to { opacity:1 } }
  @keyframes slideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }

  /* ── Responsive ─────────────────────────────────────────────────────────── */
  @media (max-width: 640px) {
    .block-container { padding: 0.6rem; }
    .block-title { font-size: 0.95rem; }
    .block-title-sub { display: none; }
    .block-header { margin-bottom: 0.75rem; gap: 0.5rem; }
    /* KPI grid 2 columnas en mobile */
    .kpi-grid { grid-template-columns: 1fr 1fr; gap: 0.5rem; }
    .kpi { padding: 0.7rem 0.8rem; }
    .kpi-value { font-size: 1.65rem; letter-spacing: -0.01em; }
    .kpi-label { font-size: 0.58rem; }
    /* En mobile el sub va en multilínea para que no se corte feo */
    .kpi-sub {
      white-space: normal;
      font-size: 0.70rem;
      line-height: 1.45;
    }
    .kpi-value { font-size: 1.2rem; }
    .card { padding: 0.85rem; }
    .tabs { gap: 0.3rem; position: relative; }
    .tab-btn { padding: 0.5rem 0.9rem; font-size: 0.74rem; min-height: 40px; }
    /* Badge levemente más grande para ser legible */
    .badge { font-size: 0.7rem; padding: 0.16rem 0.5rem; }
    /* Inputs más grandes en mobile (≥ 44px para evitar zoom-in automático iOS) */
    .inp { font-size: 16px; min-height: 44px; padding: 0.55rem 0.75rem; }
    .inp-sm { font-size: 14px; min-height: 38px; }
    /* Botones más accesibles en touch */
    .btn { min-height: 40px; }
    .btn-sm { min-height: 38px; }
    /* Grids colapsan antes */
    .grid-2, .grid-3 { grid-template-columns: 1fr; }
  }

`;

/** Combina clases condicionalmente */
export const blockCls = (...args) => args.filter(Boolean).join(" ");
