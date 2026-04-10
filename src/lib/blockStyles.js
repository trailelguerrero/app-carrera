/**
 * TEG DESIGN SYSTEM — CSS compartido para todos los bloques
 * Importar con: import { BLOCK_CSS, blockCls } from "@/lib/blockStyles";
 * Usar con:     <style>{BLOCK_CSS}</style>
 */

export const BLOCK_CSS = `
  /* ── Design tokens ─────────────────────────────────────────────────────── */
  :root {
    --bg:           #080c18;
    --surface:      #0f1629;
    --surface2:     #151e35;
    --surface3:     #1a2540;
    --border:       #263754;
    --border-light: #344d7a;
    --text:         #e8eef8;
    --text-muted:   #8a9dba;
    --text-dim:     #7080a0;
    --cyan:         #22d3ee;  --cyan-dim:   rgba(34,211,238,0.10);
    --violet:       #a78bfa;  --violet-dim: rgba(167,139,250,0.10);
    --green:        #34d399;  --green-dim:  rgba(52,211,153,0.10);
    --amber:        #fbbf24;  --amber-dim:  rgba(251,191,36,0.10);
    --red:          #f87171;  --red-dim:    rgba(248,113,113,0.10);
    --orange:       #fb923c;  --orange-dim: rgba(251,146,60,0.10);
    --primary:      #6366f1;  --primary-dim:rgba(99,102,241,0.15);
    --font-display: 'Syne', sans-serif;
    --font-mono:    'DM Mono', 'Space Mono', monospace;
    --r:            12px;
    --r-sm:         8px;
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
    --text:         #0f1e36;
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
    font-size: 1.4rem;
    font-weight: 800;
    font-family: var(--font-display);
    color: var(--text);
    line-height: 1.1;
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

  /* ── KPI grid ───────────────────────────────────────────────────────────── */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }
  .kpi {
    padding: 1rem 1.1rem;
    border-radius: var(--r);
    background: var(--surface);
    border: 1px solid var(--border);
    border-left-width: 4px;
    transition: transform 0.15s;
  }
  .kpi:hover { transform: translateY(-1px); }
  .kpi-label {
    font-size: 0.62rem;
    font-family: var(--font-mono);
    color: var(--text-muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 0.3rem;
  }
  .kpi-value {
    font-size: 1.55rem;
    font-weight: 800;
    font-family: var(--font-mono);
    line-height: 1;
    margin-bottom: 0.25rem;
  }
  .kpi-sub {
    font-size: 0.62rem;
    font-family: var(--font-mono);
    color: var(--text-muted);
    line-height: 1.4;
  }
  .kpi.cyan   { border-left-color: var(--cyan);   }
  .kpi.violet { border-left-color: var(--violet); }
  .kpi.green  { border-left-color: var(--green);  }
  .kpi.amber  { border-left-color: var(--amber);  }
  .kpi.red    { border-left-color: var(--red);    }
  .kpi.orange { border-left-color: var(--orange); }
  .kpi.primary{ border-left-color: var(--primary);}

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
    width: 40px;
    background: linear-gradient(to right, transparent, var(--surface));
    pointer-events: none;
    z-index: 1;
  }
  .tab-btn {
    padding: 0.55rem 1.1rem;
    border-radius: var(--r-sm);
    background: var(--surface2);
    color: var(--text-muted);
    border: 1px solid var(--border);
    cursor: pointer;
    white-space: nowrap;
    font-weight: 700;
    font-size: 0.78rem;
    font-family: var(--font-display);
    transition: all 0.18s;
    flex-shrink: 0;
  }
  .tab-btn:hover { color: var(--text); border-color: var(--border-light); }
  .tab-btn.active {
    background: var(--primary-dim);
    color: #c4c6ff;
    border-color: rgba(99,102,241,0.45);
    box-shadow: 0 0 0 1px rgba(99,102,241,0.2) inset;
  }

  /* ── Cards ──────────────────────────────────────────────────────────────── */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r);
    padding: 1.1rem 1.25rem;
    margin-bottom: 1rem;
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
  .tbl { width: 100%; border-collapse: collapse; font-size: 0.83rem; }
  .tbl th {
    text-align: left; padding: 0.65rem 0.75rem;
    border-bottom: 2px solid var(--border);
    color: var(--text-muted); font-weight: 600;
    font-family: var(--font-mono); font-size: 0.68rem;
    text-transform: uppercase; letter-spacing: 0.05em;
    white-space: nowrap; background: var(--surface);
  }
  .tbl td {
    padding: 0.6rem 0.75rem;
    border-bottom: 1px solid rgba(30,45,80,0.6);
    vertical-align: middle;
  }
  .tbl tr:last-child td { border-bottom: none; }
  .tbl tbody tr:hover td { background: rgba(255,255,255,0.015); }
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
    gap: 0.3rem;
    white-space: nowrap;
  }
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
  .btn-sm { padding: 0.4rem 0.65rem; font-size: 0.7rem; }
  .btn-icon { padding: 0.35rem 0.45rem; }

  /* ── Badges ─────────────────────────────────────────────────────────────── */
  .badge {
    display: inline-flex; align-items: center;
    padding: 0.12rem 0.45rem; border-radius: 4px;
    font-size: 0.62rem; font-weight: 700;
    font-family: var(--font-mono);
    text-transform: uppercase; letter-spacing: 0.04em;
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
    padding: 0.4rem 0.65rem;
    font-family: var(--font-display);
    font-size: 0.82rem;
    transition: border-color 0.15s;
    outline: none;
    width: 100%;
  }
  .inp:focus { border-color: var(--cyan); }
  .inp::placeholder { color: var(--text-dim); }
  .inp-mono {
    font-family: var(--font-mono);
    text-align: right;
  }
  .inp-sm { padding: 0.28rem 0.5rem; font-size: 0.72rem; }
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
    display: flex; align-items: center; justify-content: center;
    padding: 1rem;
    animation: fadeIn 0.15s ease;
  }
  .modal {
    background: var(--surface);
    border: 1px solid var(--border-light);
    border-radius: 16px;
    max-height: 90vh; overflow-y: auto;
    width: 100%; max-width: 560px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.5);
    animation: slideUp 0.2s ease;
  }
  .modal-header {
    padding: 1.1rem 1.25rem 0.85rem;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; background: var(--surface); z-index: 1;
  }
  .modal-title { font-weight: 800; font-size: 0.95rem; color: var(--text); }
  .modal-body  { padding: 1.1rem 1.25rem; }
  .modal-footer {
    padding: 0.85rem 1.25rem;
    border-top: 1px solid var(--border);
    display: flex; justify-content: flex-end; gap: 0.5rem;
  }

  /* ── Animations ─────────────────────────────────────────────────────────── */
  @keyframes fadeIn  { from { opacity:0 }  to { opacity:1 } }
  @keyframes slideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }

  /* ── Responsive ─────────────────────────────────────────────────────────── */
  @media (max-width: 640px) {
    .block-container { padding: 0.6rem; }
    .block-title { font-size: 1.1rem; }
    .kpi-grid { grid-template-columns: 1fr 1fr; gap: 0.5rem; }
    .kpi { padding: 0.75rem 0.85rem; }
    .kpi-value { font-size: 1.2rem; }
    .card { padding: 0.85rem; }
    .tabs { gap: 0.3rem; position: relative; }
    .tab-btn { padding: 0.5rem 0.9rem; font-size: 0.74rem; min-height: 36px; }
  }

`;

/** Combina clases condicionalmente */
export const blockCls = (...args) => args.filter(Boolean).join(" ");
