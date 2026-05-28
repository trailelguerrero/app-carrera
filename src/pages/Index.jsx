import PinScreen from "@/components/auth/PinScreen";
import ChangePinModal from "@/components/auth/ChangePinModal";
import { useAlertasBadges } from "@/hooks/useAlertasBadges.js";
import { checkSession, createSession } from "@/components/auth/pinAuth.js";
import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from "react";
import ErrorBoundary from "../components/ErrorBoundary";
const DiaCarrera = lazy(() => import("../components/blocks/DiaCarrera"));
import ConflictModal from "../components/blocks/ConflictModal";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT } from "@/constants/eventConfig";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useAppStore, EVENT_TYPES } from "@/store/useAppStore";
import QuickNav from "../components/common/QuickNav";

// Lazy-style imports for blocks
const Dashboard = lazy(() => import("../components/blocks/Dashboard"));
const Presupuesto = lazy(() => import("../components/blocks/Presupuesto"));
const Voluntarios = lazy(() => import("../components/blocks/Voluntarios"));
const Logistica = lazy(() => import("../components/blocks/Logistica"));
const Patrocinadores = lazy(() => import("../components/blocks/Patrocinadores"));
const Proyecto = lazy(() => import("../components/blocks/Proyecto"));
const Documentos = lazy(() => import("../components/blocks/Documentos"));
const Camisetas = lazy(() => import("../components/blocks/Camisetas"));
const Configuracion = lazy(() => import("../components/blocks/Configuracion"));

const BLOCKS = [
  { id: "dashboard", icon: "📊", label: "Dashboard", shortLabel: "Dash", component: Dashboard },
  { id: "proyecto", icon: "🏔️", label: "Proyecto", shortLabel: "Proy", component: Proyecto },
  { id: "presupuesto", icon: "💰", label: "Presupuesto", shortLabel: "Pres", component: Presupuesto },
  { id: "voluntarios", icon: "👥", label: "Voluntarios", shortLabel: "Vols", component: Voluntarios },
  { id: "logistica", icon: "📦", label: "Logística", shortLabel: "Log", component: Logistica },
  { id: "patrocinadores", icon: "🤝", label: "Patrocinadores", shortLabel: "Pat", component: Patrocinadores },
  { id: "camisetas", icon: "👕", label: "Camisetas", shortLabel: "Cam", component: Camisetas },
  { id: "documentos", icon: "📁", label: "Docs", shortLabel: "Docs", component: Documentos },
  { id: "configuracion", icon: "⚙️", label: "Configuración", shortLabel: "Cfg", component: Configuracion },
];

// ── TOAST SYSTEM ──────────────────────────────────────────────────────────────
function useToastSystem() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      const { id, type, message, duration = 3500 } = e.detail;
      setToasts(prev => [...prev, { id, type, message, duration, leaving: false }]);
      setTimeout(() => {
        // Marcar como leaving para animar salida
        setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
        }, 220);
      }, duration);
    };
    window.addEventListener("teg-toast", handler);
    return () => window.removeEventListener("teg-toast", handler);
  }, []);

  const dismiss = (id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 220);
  };

  return { toasts, dismiss };
}

const TOAST_ICONS = { success: "✓", error: "✕", info: "ℹ", warning: "⚠" };

function ToastStack({ toasts, dismiss, navH }) {
  if (!toasts.length) return null;
  return (
    <div
      className="teg-toast-stack"
      style={{ bottom: `calc(${navH}px + 12px)` }}
      role="region"
      aria-label="Notificaciones"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          role="alert"
          aria-live={t.type === "error" ? "assertive" : "polite"}
          className={`teg-toast ${t.type}${t.leaving ? " leaving" : ""}`}
        >
          <span className="teg-toast-icon">{TOAST_ICONS[t.type]}</span>
          <span className="teg-toast-msg">{t.message}</span>
          <button className="teg-toast-close" onClick={() => dismiss(t.id)} aria-label="Cerrar">×</button>
        </div>
      ))}
    </div>
  );
}

// ── AUTOSAVE STATUS HOOK ───────────────────────────────────────────────────────
// Mejora 6: también expone pendingCount para el badge de pendientes.
function useGlobalSaveStatus() {
  const [status, setStatus] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const timerRef = useRef(null);

  const readPending = () => {
    try {
      return Object.keys(localStorage).filter(k => k.startsWith('__pending_sync_')).length;
    } catch { return 0; }
  };

  useEffect(() => {
    // Leer contador inicial
    setPendingCount(readPending());

    const handler = (e) => {
      const s = e.detail?.status;
      setStatus(s);
      // Si el evento trae count, usarlo; si no, releer localStorage
      if (e.detail?.count !== undefined) {
        setPendingCount(e.detail.count);
      } else if (s === 'saved' || s === 'error') {
        setPendingCount(readPending());
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      if (s === "saved") {
        timerRef.current = setTimeout(() => setStatus(null), 3000);
      }
    };
    window.addEventListener("teg-save-status", handler);
    return () => window.removeEventListener("teg-save-status", handler);
  }, []);

  return { status, pendingCount };
}

// ── GLOBAL MOBILE FOCUS HELPER ────────────────────────────────────────────────
function useMobileKeyboardScroll() {
  useEffect(() => {
    const handleFocus = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        const isModal = e.target.closest('.modal-body') || e.target.closest('.modal');
        if (isModal) {
          // Un pequeño timeout asegura que el teclado virtual ya se haya desplegado
          setTimeout(() => {
            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }
      }
    };
    document.addEventListener("focusin", handleFocus);
    return () => document.removeEventListener("focusin", handleFocus);
  }, []);
}

// ── AUTOSAVE INDICATOR ─────────────────────────────────────────────────────────
// Mejora 6: muestra badge de escrituras pendientes cuando pendingCount > 0
// y el estado de sincronización activo no está visible.
function AutosaveIndicator({ status, pendingCount = 0 }) {
  const cfg = {
    saving:  { color: "var(--amber)", border: "var(--amber-border)",          bg: "var(--amber-dim)",        text: "Guardando…",       pulse: true  },
    saved:   { color: "var(--green)", border: "var(--teg-green-border)",      bg: "var(--teg-green-dim)",    text: "✓ Guardado",        pulse: false },
    error:   { color: "var(--red)",   border: "var(--teg-red-border)",        bg: "var(--teg-red-dim)",      text: "Error al guardar",  pulse: false },
    pending: { color: "var(--amber)", border: "var(--amber-border)",          bg: "var(--amber-dim)",        text: null,                pulse: true  },
  };

  // Determinar qué mostrar: estado activo tiene prioridad sobre badge de pendientes
  const showPending = !status && pendingCount > 0;
  const effectiveStatus = showPending ? "pending" : status;
  const c = cfg[effectiveStatus];
  if (!c) return null;

  const label = effectiveStatus === "pending"
    ? `${pendingCount} pendiente${pendingCount > 1 ? "s" : ""} sin sync`
    : c.text;

  return (
    <div
      key={effectiveStatus + pendingCount}
      title={effectiveStatus === "pending" ? "Cambios guardados localmente, pendientes de sincronizar con el servidor" : undefined}
      style={{
        display: "inline-flex", alignItems: "center", gap: "0.3rem",
        fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
        color: c.color, background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 6, padding: "0.2rem 0.5rem", whiteSpace: "nowrap",
        animation: "teg-fadein-scale 0.18s ease",
        cursor: effectiveStatus === "pending" ? "default" : undefined,
      }}
    >
      <span style={{
        width: 5, height: 5, borderRadius: "50%", background: "currentColor", flexShrink: 0,
        animation: c.pulse ? "teg-pulse 1s ease-in-out infinite" : "none",
      }} />
      {label}
    </div>
  );
}


// ── MAIN EXPORT ────────────────────────────────────────────────────────────────
// ─── ScrollToTop — aparece al hacer scroll hacia abajo ───────────────────────
function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const handler = () => setVisible(main.scrollTop > 350);
    main.addEventListener("scroll", handler, { passive: true });
    return () => main.removeEventListener("scroll", handler);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Volver arriba"
      style={{
        position: "fixed",
        bottom: "calc(72px + env(safe-area-inset-bottom) + 8px)",
        right: 16,
        width: 34, height: 34,
        borderRadius: "50%",
        background: "var(--teg-surface-header)",
        border: "1px solid var(--teg-cyan-border)",
        color: "var(--cyan)",
        cursor: "pointer",
        fontSize: "var(--fs-base)",
        zIndex: 45,
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(8px)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
        transition: "opacity .2s, transform .2s",
      }}
    >▲</button>
  );
}

export default function Index() {
  const [authed, setAuthed] = useState(() => checkSession());

  // Leer config completo para header Kinetik Ops
  const headerCfg = (() => {
    try {
      const raw = localStorage.getItem(LS_KEY_CONFIG);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();
  const eventFecha = (() => {
    try {
      return headerCfg?.fecha ? new Date(headerCfg.fecha) : new Date(EVENT_CONFIG_DEFAULT.fecha);
    } catch { return new Date(EVENT_CONFIG_DEFAULT.fecha); }
  })();
  // Iniciales del organizador para el avatar
  const orgNombre = headerCfg?.organizador || EVENT_CONFIG_DEFAULT.organizador || "Trail El Guerrero";
  const [showChangePin, setShowChangePin] = useState(false);
  const [showMoreNav, setShowMoreNav] = useState(false);
  const [showQuickNav, setShowQuickNav] = useState(false);
  const [activeBlock, setActiveBlock] = useState("dashboard");
  const [showDiaCarrera, setShowDiaCarrera] = useState(false);
  const [pendingSubtab, setPendingSubtab] = useState(null);
  const [readmeBlock, setReadmeBlock] = useState(null);
  const ActiveComponent = BLOCKS.find(b => b.id === activeBlock)?.component;

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const { status: saveStatus, pendingCount } = useGlobalSaveStatus();
  const { toasts, dismiss } = useToastSystem();
  const isOnline = useOnlineStatus();
  useMobileKeyboardScroll();

  // Mejora 3: syncTick via Zustand store (lastEvent.id incrementa en cada evento)
  const lastEventId = useAppStore((s) => s.lastEvent?.id ?? 0);
  const syncTick = lastEventId; // mismo rol que antes, pero source = store
  const emitEvent = useAppStore((s) => s.emitEvent);

  const handleBlockChange = useCallback((id) => {
    emitEvent(EVENT_TYPES.DATA_SYNC, 'navigation');
    // INC-03: limpiar subtab pendiente si el destino cambia de bloque
    // (el subtab sólo es válido para el bloque al que iba destinado;
    //  si el usuario navega a otro lugar, lo descartamos para evitar
    //  que se propague en visitas futuras al bloque incorrecto)
    setPendingSubtab(prev => {
      if (prev !== null) return null;
      return prev;
    });
    setActiveBlock(id);
  }, [emitEvent]);

  // Navegación desde cualquier bloque via evento custom (ej. alertas del Dashboard)
  useEffect(() => {
    const h = (e) => {
      if (e.detail?.block) {
        handleBlockChange(e.detail.block);
        if (e.detail.subtab) setPendingSubtab(e.detail.subtab);
      }
    };
    window.addEventListener("teg-navigate", h);
    return () => window.removeEventListener("teg-navigate", h);
  }, [handleBlockChange]);

  // Abrir modal de cambio de PIN desde Configuración
  useEffect(() => {
    const h = () => setShowChangePin(true);
    window.addEventListener("teg-open-changepin", h);
    return () => window.removeEventListener("teg-open-changepin", h);
  }, []);

  useEffect(() => {
    const h = () => setShowDiaCarrera(true);
    window.addEventListener("teg-open-diacarrera", h);
    return () => window.removeEventListener("teg-open-diacarrera", h);
  }, []);

  // Keyboard shortcuts: 1-7 cambian de bloque, Esc cierra modales
  useEffect(() => {
    if (!authed) return;
    const h = (e) => {
      // Cmd/Ctrl+K — abrir QuickNav (solo desktop)
      if ((e.metaKey || e.ctrlKey) && e.key === "k" && window.innerWidth > 768) {
        e.preventDefault();
        setShowQuickNav(v => !v);
        return;
      }
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const n = parseInt(e.key);
      if (!e.ctrlKey && !e.metaKey && !e.altKey && n >= 1 && n <= BLOCKS.length) {
        handleBlockChange(BLOCKS[n - 1].id);
      }
      if (e.key === "Escape") { setReadmeBlock(null); setShowChangePin(false); setShowMoreNav(false); setShowQuickNav(false); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [authed, handleBlockChange]);

  // ── Badges de alertas en nav — calculados desde localStorage ────────────
  // T3.2: alertasBadges ahora usa dataService en lugar de localStorage directo
  const alertasBadges = useAlertasBadges({ activeBlock, syncTick });
  const NAV_H = isMobile ? 68 : 66;
  const diasCarrera = Math.ceil((eventFecha - new Date()) / 86400000);
  const mostrarBtnDiaDProminente = diasCarrera >= 0 && diasCarrera <= 7;
  const mostrarBtnDiaD = diasCarrera >= -1 && diasCarrera <= 30; // accesible 30 días antes

  // Nav: en mobile todos los bloques van al bottom bar en el orden de BLOCKS
  const NAV_MAIN_IDS = ["dashboard", "proyecto", "presupuesto", "voluntarios", "logistica", "patrocinadores", "camisetas", "documentos", "configuracion"];
  const NAV_MORE_IDS = [];
  const navBlocks = BLOCKS;
  const navMain = isMobile ? navBlocks.filter(b => NAV_MAIN_IDS.includes(b.id)) : navBlocks;
  const navMore = isMobile ? navBlocks.filter(b => NAV_MORE_IDS.includes(b.id)) : [];
  const moreIsActive = navMore.some(b => b.id === activeBlock);

  // MISSING-02: teg-conflict — gestionado por <ConflictModal /> (modal bloqueante, Fase 0)
  if (!authed) return <PinScreen onUnlock={() => {
    setAuthed(true);
    try { const r=localStorage.getItem(LS_KEY_CONFIG); const c=r?JSON.parse(r):{}; if(c.autoOpenDia)setTimeout(()=>setShowDiaCarrera(true),350); } catch { /* ignorar si localStorage no disponible */ }
  }} />;
  return (
    <>
      <style>{`
        @keyframes teg-pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.35; transform:scale(0.6); }
        }
      `}</style>

      {/* ── BANNER OFFLINE ───────────────────────────────────────────────── */}
      {!isOnline && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
          background: "var(--teg-amber-solid)",
          color: "var(--text)",
          textAlign: "center",
          padding: "0.45rem 1rem",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--fs-sm)",
          fontWeight: 700,
          letterSpacing: ".04em",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: ".5rem",
          boxShadow: "0 2px 12px var(--teg-amber-glow)",
        }}>
          <span>⚠️</span>
          <span>SIN CONEXIÓN — Los cambios se guardan localmente y se sincronizarán al recuperar la conexión</span>
        </div>
      )}

      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)",
        backgroundImage: "radial-gradient(ellipse 90% 45% at 15% -5%, var(--teg-cyan-glow-sm) 0%, transparent 50%), radial-gradient(ellipse 60% 30% at 85% 105%, var(--teg-violet-glow-sm) 0%, transparent 48%), radial-gradient(ellipse 30% 20% at 50% 50%, var(--teg-cyan-glow-xs) 0%, transparent 55%)"
      }}>

        {/* TOP BAR — Kinetik Ops style */}
        <header style={{
          background: "var(--teg-surface-header)", backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderBottom: "1px solid var(--teg-cyan-border-xs)",
          padding: "0 0.75rem", display: "flex", alignItems: "center",
          justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50,
          height: 48, gap: "0.5rem",
        }}>

          {/* LEFT — Brand */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0,
            cursor: "pointer", overflow: "visible"
          }}
            onClick={() => handleBlockChange("configuracion")}
            title="Configuración del evento">
            {/* Icono de montaña */}
            <div style={{
              width: 30, height: 30, borderRadius: 9, flexShrink: 0,
              background: "linear-gradient(135deg, var(--teg-cyan-dim-md) 0%, var(--teg-violet-dim-md) 100%)",
              border: "1px solid var(--teg-cyan-border-md)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1rem", lineHeight: 1,
              boxShadow: "0 0 10px var(--teg-cyan-glow)",
              transition: "all 0.18s",
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 16px var(--teg-cyan-glow)"; e.currentTarget.style.borderColor = "var(--teg-cyan-border-strong)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 10px var(--teg-cyan-glow)"; e.currentTarget.style.borderColor = "var(--teg-cyan-border-md)"; }}>
              🏔️
            </div>
            {/* Nombre del evento — siempre visible, colores directos para evitar dependencia de tokens */}
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2, overflow: "visible" }}>
              <span style={{
                fontFamily: "'Syne', 'Inter', system-ui, sans-serif",
                fontWeight: 800,
                fontSize: isMobile ? "0.85rem" : "0.95rem",
                color: "var(--text)",
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
                display: "block",
              }}>
                Trail El Guerrero
              </span>
              <span style={{
                fontFamily: "'DM Mono', 'Courier New', monospace",
                fontSize: "0.55rem",
                color: "var(--teg-text-secondary-alpha)",
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                display: "block",
              }}>
                2026 · Candeleda
              </span>
            </div>
          </div>

          {/* CENTER — Autosave + buscador */}
          <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
            <AutosaveIndicator status={saveStatus} pendingCount={pendingCount} />
          </div>

          {/* RIGHT — Actions */}
          <div style={{ display: "flex", gap: "0.25rem", alignItems: "center", flexShrink: 0 }}>

            <ThemeToggle size={28} />

            {(mostrarBtnDiaD || mostrarBtnDiaDProminente) && (
              <button onClick={() => setShowDiaCarrera(true)} style={{
                background: "var(--teg-red-dim)", color: "var(--red)",
                border: "1px solid var(--teg-red-border)", borderRadius: 8,
                padding: "0.2rem 0.45rem",
                fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
                fontWeight: 700, cursor: "pointer", height: 28,
                display: "flex", alignItems: "center", gap: "0.25rem",
              }}>🏁{!isMobile && <span style={{ letterSpacing: ".04em" }}>DÍA D</span>}</button>
            )}



            {/* Settings pill */}
            <button
              onClick={() => handleBlockChange("configuracion")}
              title="Configuración"
              aria-label="Configuración"
              style={{
                background: activeBlock === "configuracion" ? "var(--teg-violet-dim)" : "transparent",
                border: `1px solid ${activeBlock === "configuracion" ? "var(--teg-violet-border-md)" : "var(--border)"}`,
                color: activeBlock === "configuracion" ? "var(--violet)" : "var(--text-dim)",
                cursor: "pointer", width: 30, height: 30, borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "var(--fs-base)", transition: "all 0.15s",
                boxShadow: activeBlock === "configuracion" ? "0 0 10px var(--teg-violet-glow)" : "none",
              }}
              onMouseEnter={e => { if (activeBlock !== "configuracion") { e.currentTarget.style.borderColor = "var(--teg-violet-border)"; e.currentTarget.style.color = "var(--violet)"; } }}
              onMouseLeave={e => { if (activeBlock !== "configuracion") { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-dim)"; } }}
            >⚙️</button>
          </div>
        </header>

        {/* CONTENT */}
        <main style={{
          flex: 1, overflow: "auto",
          paddingBottom: `calc(${NAV_H}px + 8px + env(safe-area-inset-bottom, 0px))`,
        }}>
          <style>{`
            @keyframes module-enter {
              from { opacity:0; transform:translateY(10px); }
              to   { opacity:1; transform:translateY(0); }
            }
            .module-enter { animation: module-enter 0.22s cubic-bezier(0.34,1.1,0.64,1) both; }
          `}</style>

          {/* NAV-02 — Micro-barra de contexto: módulo activo, solo móvil */}
          {isMobile && (() => {
            const activeBlockData = BLOCKS.find(b => b.id === activeBlock);
            return (
              <div style={{
                position: "sticky", top: 0, zIndex: 40,
                height: 28,
                display: "flex", alignItems: "center", gap: "0.4rem",
                padding: "0 0.85rem",
                background: "var(--teg-surface-header)",
                borderBottom: "1px solid var(--border)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}>
                <span style={{ fontSize: "0.8rem", lineHeight: 1 }}>{activeBlockData?.icon}</span>
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--fs-xs)",
                  fontWeight: 700,
                  color: "var(--text-dim)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}>{activeBlockData?.label}</span>
              </div>
            );
          })()}

          <div key={activeBlock} className="module-enter">
            <ErrorBoundary
              blockName={BLOCKS.find(b => b.id === activeBlock)?.label}
              onNavigate={handleBlockChange}
            >
              <Suspense fallback={
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", minHeight: "60vh", gap: "1rem",
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    border: "3px solid var(--border)",
                    borderTopColor: "var(--cyan)",
                    animation: "teg-spin 0.7s linear infinite",
                  }} />
                  <div style={{
                    fontFamily: "'DM Mono', 'Space Mono', monospace,monospace", fontSize: "var(--fs-xs)",
                    color: "var(--text-dim)", letterSpacing: "0.1em",
                  }}>Cargando módulo…</div>
                  <style>{`@keyframes teg-spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              }>
                {ActiveComponent && <ActiveComponent
                  key={activeBlock}
                  initialSubtab={pendingSubtab}
                  onSubtabConsumed={() => setPendingSubtab(null)}
                />}
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>

        {/* SCROLL TO TOP */}
        <ScrollToTop />

        {/* BOTTOM NAV */}
        <nav
          aria-label="Navegación principal"
          style={{
            position: "fixed", bottom: 0, left: 0, right: 0,
            background: "var(--teg-surface-header)", backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            borderTop: "1px solid var(--teg-cyan-border-xs)",
            display: "flex", justifyContent: "space-around", alignItems: "center",
            height: NAV_H,
            paddingBottom: "env(safe-area-inset-bottom,0px)",
            zIndex: 50,
          }}
        >
          {/* Ítems principales */}
          {navMain.map((b, idx) => {
            const isActive = activeBlock === b.id;
            return (
              <React.Fragment key={b.id}>
                {/* Divisor antes de Configuración — zona de sistema */}
                {b.id === "configuracion" && (
                  <div style={{
                    width: 1, height: 28, borderLeft: "1px solid var(--border)",
                    alignSelf: "center", flexShrink: 0, margin: "0 0.15rem",
                  }} />
                )}
              <button
                key={b.id}
                onClick={() => { handleBlockChange(b.id); setShowMoreNav(false); }}
                aria-label={b.label}
                aria-current={isActive ? "page" : undefined}
                title={`${b.label} (${idx + 1})`}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", gap: "0.18rem",
                  padding: isMobile ? "0.35rem 0.4rem" : "0.35rem 0.6rem",
                  borderRadius: 10,
                  transition: "opacity 0.2s",
                  opacity: isActive ? 1 : 0.38,
                  flex: 1,
                  position: "relative", outline: "none",
                  WebkitTapHighlightColor: "transparent",
                  minHeight: NAV_H - 4,
                }}
              >
                {/* Blob activo estilo iOS/Figma con spring */}
                <div style={{
                  position: "absolute",
                  top: "50%", left: "50%",
                  transform: `translate(-50%, -50%) scale(${isActive ? 1 : 0})`,
                  width: 44, height: 36, borderRadius: 12,
                  background: "var(--teg-cyan-dim)",
                  boxShadow: isActive ? "0 0 18px var(--teg-cyan-glow)" : "none",
                  transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease",
                  pointerEvents: "none",
                }} />
                {/* Franja inferior indicador activo */}
                <div style={{
                  position: "absolute", bottom: 2, left: "50%",
                  transform: `translateX(-50%) scaleX(${isActive ? 1 : 0})`,
                  width: 22, height: 3, borderRadius: 2,
                  background: "var(--cyan)",
                  transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                  pointerEvents: "none",
                }} />
                <span style={{
                  fontSize: isMobile ? "1.35rem" : "1.15rem",
                  filter: isActive ? "none" : "grayscale(0.6) opacity(0.6)",
                  transform: isActive ? "scale(1.05)" : "scale(1)",
                  transition: "all 0.2s",
                  pointerEvents: "none", position: "relative", zIndex: 1,
                }}>
                  {b.icon}
                  {alertasBadges[b.id] && (
                    <span style={{
                      position: "absolute", top: -3, right: -5,
                      minWidth: 13, height: 13, borderRadius: 7,
                      background: "var(--red)", color: "#fff",
                      fontSize: "var(--fs-2xs)", fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "0 3px", lineHeight: 1,
                      fontFamily: "var(--font-mono)", border: "1.5px solid var(--bg)",
                      zIndex: 10,
                    }}>
                      {typeof alertasBadges[b.id] === "number" ? alertasBadges[b.id] : "!"}
                    </span>
                  )}
                </span>
                <span style={{
                  fontFamily: "'DM Mono', 'Space Mono', monospace,monospace",
                  fontSize: "0.48rem",
                  fontWeight: isActive ? 800 : 600, letterSpacing: "0.07em", textTransform: "uppercase",
                  color: isActive ? "var(--cyan)" : "var(--text-dim)",
                  textShadow: isActive ? "0 0 10px var(--teg-cyan-glow-md)" : "none",
                  transition: "color 0.2s, text-shadow 0.2s",
                  pointerEvents: "none", whiteSpace: "nowrap",
                  position: "relative", zIndex: 1,
                }}>
                  {isMobile ? b.shortLabel : b.shortLabel}
                </span>

              </button>
              </React.Fragment>
            );
          })}

          {/* Botón DÍA D directo en la nav inferior cuando es inminente */}
          {isMobile && mostrarBtnDiaD && (
            <button
              onClick={() => setShowDiaCarrera(true)}
              aria-label="Abrir DíaCarrera"
              style={{
                position: "relative", outline: "none", background: "none", border: "none",
                WebkitTapHighlightColor: "transparent",
                minHeight: NAV_H - 4, cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 2, padding: "0 .5rem", flexShrink: 0,
              }}
            >
              <span style={{
                fontSize: "1.35rem",
                filter: mostrarBtnDiaDProminente
                  ? `drop-shadow(0 0 6px var(--teg-cyan-glow-lg))`
                  : "grayscale(0.3) opacity(0.75)",
                transition: "all 0.25s", position: "relative", zIndex: 1,
              }}>🏔️</span>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "0.48rem",
                fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase",
                color: mostrarBtnDiaDProminente ? "var(--cyan)" : "var(--text-muted)",
                textShadow: mostrarBtnDiaDProminente ? "0 0 10px var(--teg-cyan-glow-md)" : "none",
                transition: "color 0.2s", position: "relative", zIndex: 1,
              }}>DÍA D</span>
            </button>
          )}

          {/* Botón "Más" — solo en mobile */}
          {isMobile && navMore.length > 0 && (
            <button
              onClick={() => setShowMoreNav(v => !v)}
              aria-label="Más secciones"
              aria-expanded={showMoreNav}
              aria-haspopup="true"
              style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: "0.18rem",
                padding: "0.35rem 0.4rem",
                borderRadius: 10,
                transition: "opacity 0.2s",
                opacity: (showMoreNav || moreIsActive) ? 1 : 0.42,
                flex: 1, position: "relative", outline: "none",
                WebkitTapHighlightColor: "transparent",
                minHeight: NAV_H - 4,
              }}
            >
              {(showMoreNav || moreIsActive) && (
                <div style={{
                  position: "absolute", inset: 0, borderRadius: 10,
                  background: "var(--teg-cyan-subtle)",
                  border: "1px solid var(--teg-cyan-border-xs)",
                }} />
              )}
              <span style={{
                fontSize: "var(--fs-lg)",
                filter: (showMoreNav || moreIsActive) ? "none" : "grayscale(0.55)",
                transform: (showMoreNav || moreIsActive) ? "scale(1.1)" : "scale(1)",
                transition: "all 0.2s", position: "relative", zIndex: 1,
              }}>{"•••"}</span>
              <span style={{
                fontFamily: "'DM Mono', 'Space Mono', monospace,monospace",
                fontSize: "0.52rem", fontWeight: 700,
                color: (showMoreNav || moreIsActive) ? "var(--cyan)" : "var(--text-dim)",
                transition: "color 0.2s",
                pointerEvents: "none", whiteSpace: "nowrap",
                position: "relative", zIndex: 1,
              }}>Más</span>
            </button>
          )}
        </nav>

        {/* DRAWER “MÁS” — solo visible en mobile cuando showMoreNav=true */}
        {isMobile && showMoreNav && (
          <>
            {/* Backdrop del drawer */}
            <div
              onClick={() => setShowMoreNav(false)}
              style={{
                position: "fixed", inset: 0, zIndex: 48,
                background: "rgba(0,0,0,0.35)",
                backdropFilter: "blur(4px)",
                animation: "teg-fadein 0.15s ease",
              }}
            />
            {/* Drawer en sí */}
            <div style={{
              position: "fixed", bottom: NAV_H, left: 0, right: 0, zIndex: 49,
              background: "var(--surface)",
              borderTop: "1px solid var(--border)",
              borderRadius: "16px 16px 0 0",
              padding: "0.75rem 1rem",
              paddingBottom: "0.5rem",
              boxShadow: "0 -8px 32px rgba(0,0,0,0.3)",
              animation: "slideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)",
            }}>
              {/* Handle visual */}
              <div style={{ width: 36, height: 4, background: "var(--border)", borderRadius: 2, margin: "0 auto 0.75rem" }} />
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)",
                textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem", paddingLeft: "0.25rem"
              }}>
                Más secciones
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {navMore.map(b => {
                  if (b.id === 'configuracion') return null; // SP6-01: configuracion se renderiza por separado abajo
                  const isActive = activeBlock === b.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => { handleBlockChange(b.id); setShowMoreNav(false); }}
                      aria-label={b.label}
                      aria-current={isActive ? "page" : undefined}
                      style={{
                        flex: 1, background: isActive ? "rgba(34,211,238,0.08)" : "var(--surface2)",
                        border: isActive ? "1px solid rgba(34,211,238,0.25)" : "1px solid var(--border)",
                        borderRadius: 12, padding: "0.75rem 0.5rem",
                        cursor: "pointer", display: "flex", flexDirection: "column",
                        alignItems: "center", gap: "0.3rem",
                        WebkitTapHighlightColor: "transparent",
                        transition: "all 0.15s",
                      }}
                    >
                      <span style={{ position: "relative", fontSize: "1.6rem" }}>
                        {b.icon}
                        {alertasBadges[b.id] && (
                          <span style={{
                            position: "absolute", top: -2, right: -4,
                            minWidth: 13, height: 13, borderRadius: 7,
                            background: "var(--red)", color: "#fff",
                            fontSize: "var(--fs-2xs)", fontWeight: 800,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            padding: "0 3px", lineHeight: 1,
                            fontFamily: "var(--font-mono)", border: "1.5px solid var(--bg)",
                          }}>
                            {typeof alertasBadges[b.id] === "number" ? alertasBadges[b.id] : "!"}
                          </span>
                        )}
                      </span>
                      <span style={{
                        fontFamily: "'DM Mono','Space Mono',monospace",
                        fontSize: "var(--fs-xs)", fontWeight: 700,
                        color: isActive ? "var(--cyan)" : "var(--text-dim)",
                        whiteSpace: "nowrap",
                      }}>{b.label}</span>
                    </button>
                  );
                })}
              </div>
              {/* Divisor zona de sistema */}
              <div style={{ height: 1, background: "var(--border)", margin: "0.5rem 0 0.4rem" }} />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {navMore.filter(b => b.id === "configuracion").map(b => {
                  const isActive = activeBlock === b.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => { handleBlockChange(b.id); setShowMoreNav(false); }}
                      aria-label={b.label}
                      aria-current={isActive ? "page" : undefined}
                      style={{
                        flex: 1, background: isActive ? "rgba(139,92,246,0.08)" : "var(--surface2)",
                        border: isActive ? "1px solid rgba(139,92,246,0.25)" : "1px solid var(--border)",
                        borderRadius: 12, padding: "0.6rem 0.5rem",
                        cursor: "pointer", display: "flex", flexDirection: "row",
                        alignItems: "center", justifyContent: "center", gap: "0.4rem",
                        WebkitTapHighlightColor: "transparent",
                        transition: "all 0.15s",
                      }}
                    >
                      <span style={{ fontSize: "1.1rem" }}>{b.icon}</span>
                      <span style={{
                        fontFamily: "'DM Mono','Space Mono',monospace",
                        fontSize: "var(--fs-xs)", fontWeight: 700,
                        color: isActive ? "var(--violet)" : "var(--text-dim)",
                        whiteSpace: "nowrap",
                      }}>{b.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* MODALS */}
        {showDiaCarrera && <DiaCarrera onClose={() => setShowDiaCarrera(false)} />}
        {showChangePin && <ChangePinModal onClose={() => setShowChangePin(false)} />}
        {/* Modal de conflictos de sync — autónomo, escucha teg-conflict globalmente */}
        <ConflictModal />

        {/* NAV-04 — QuickNav spotlight (solo desktop) */}
        {showQuickNav && !isMobile && (
          <QuickNav
            blocks={BLOCKS}
            badges={alertasBadges}
            onNavigate={(id) => { handleBlockChange(id); setShowQuickNav(false); }}
            onClose={() => setShowQuickNav(false)}
          />
        )}

        {/* TOAST STACK — renderizado encima de todo */}
        <ToastStack toasts={toasts} dismiss={dismiss} navH={NAV_H} />
      </div>
    </>
  );
}