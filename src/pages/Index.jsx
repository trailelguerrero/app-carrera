import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from "react";
import ErrorBoundary from "../components/ErrorBoundary";
const DiaCarrera = lazy(() => import("../components/blocks/DiaCarrera"));
import OnboardingModal from "../components/blocks/OnboardingModal";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT } from "@/constants/eventConfig";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

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
  { id: "dashboard",      icon: "📊", label: "Dashboard",      shortLabel: "Dash",   component: Dashboard },
  { id: "proyecto",       icon: "🏔️", label: "Proyecto",       shortLabel: "Proy",  component: Proyecto },
  { id: "presupuesto",    icon: "💰", label: "Presupuesto",    shortLabel: "Pres", component: Presupuesto },
  { id: "voluntarios",    icon: "👥", label: "Voluntarios",    shortLabel: "Vols", component: Voluntarios },
  { id: "logistica",      icon: "📦", label: "Logística",      shortLabel: "Log",   component: Logistica },
  { id: "patrocinadores", icon: "🤝", label: "Patrocinadores", shortLabel: "Pat",   component: Patrocinadores },
  { id: "camisetas",      icon: "👕", label: "Camisetas",      shortLabel: "Cam",   component: Camisetas },
  { id: "documentos",     icon: "📁", label: "Docs",           shortLabel: "Docs",   component: Documentos },
  // Configuración NO aparece en la nav principal pero sí es navegable via teg-navigate
  { id: "configuracion",  icon: "⚙️", label: "Configuración",  shortLabel: "Cfg",   component: Configuracion, hidden: true },
];

// ── PIN CONFIG ────────────────────────────────────────────────────────────────
const PIN_KEY        = "teg_panel_pin_hash";
const AUTH_KEY       = "teg_panel_authed";
const SESSION_VER    = "teg_panel_session_ver";
const CURRENT_VER    = "2";          // Incrementar para invalidar todas las sesiones
const DEFAULT_PIN    = "1975";

function hashPin(pin) {
  let h = 0;
  for (let i = 0; i < pin.length; i++) {
    h = (Math.imul(31, h) + pin.charCodeAt(i)) | 0;
  }
  return String(h);
}

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
    <div className="teg-toast-stack" style={{ bottom: `calc(${navH}px + 12px)` }}>
      {toasts.map(t => (
        <div key={t.id} className={`teg-toast ${t.type}${t.leaving ? " leaving" : ""}`}>
          <span className="teg-toast-icon">{TOAST_ICONS[t.type]}</span>
          <span className="teg-toast-msg">{t.message}</span>
          <button className="teg-toast-close" onClick={() => dismiss(t.id)} aria-label="Cerrar">×</button>
        </div>
      ))}
    </div>
  );
}

// ── AUTOSAVE STATUS HOOK ───────────────────────────────────────────────────────
function useGlobalSaveStatus() {
  const [status, setStatus] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      const s = e.detail?.status;
      setStatus(s);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (s === "saved") {
        timerRef.current = setTimeout(() => setStatus(null), 3000);
      }
    };
    window.addEventListener("teg-save-status", handler);
    return () => window.removeEventListener("teg-save-status", handler);
  }, []);

  return status;
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
function AutosaveIndicator({ status }) {
  const cfg = {
    saving: { color: "#d97706", border: "rgba(217,119,6,0.25)",  bg: "rgba(217,119,6,0.07)",   text: "Guardando…",      pulse: true },
    saved:  { color: "#059669", border: "rgba(5,150,105,0.25)",  bg: "rgba(5,150,105,0.07)",   text: "✓ Guardado",      pulse: false },
    error:  { color: "#dc2626", border: "rgba(220,38,38,0.25)",  bg: "rgba(220,38,38,0.07)",   text: "Error al guardar", pulse: false },
  };
  const c = cfg[status];
  if (!c) return null;

  return (
    <div
      key={status}
      style={{
        display: "inline-flex", alignItems: "center", gap: "0.3rem",
        fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
        color: c.color, background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 6, padding: "0.2rem 0.5rem", whiteSpace: "nowrap",
        animation: "teg-fadein-scale 0.18s ease",
      }}
    >
      <span style={{
        width: 5, height: 5, borderRadius: "50%", background: "currentColor", flexShrink: 0,
        animation: c.pulse ? "teg-pulse 1s ease-in-out infinite" : "none",
      }} />
      {c.text}
    </div>
  );
}

// ── PIN NUMPAD (shared) ────────────────────────────────────────────────────────
function Numpad({ onDigit, onBackspace }) {
  const haptic = (type = 'light') => {
    if (!navigator.vibrate) return;
    if (type === 'light')  navigator.vibrate(8);
    if (type === 'error')  navigator.vibrate([30, 10, 30]);
    if (type === 'success')navigator.vibrate(50);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem" }}>
      {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k, i) => (
        <button
          key={i}
          onClick={() => {
            if (k === "⌫") { haptic('light'); onBackspace(); }
            else if (k !== "") { haptic('light'); onDigit(k); }
          }}
          disabled={k === ""}
          aria-label={k === "⌫" ? "Borrar" : k === "" ? undefined : `Número ${k}`}
          style={{
            padding: "0.9rem 0", borderRadius: 10,
            border: `1px solid ${k === "" ? "transparent" : "var(--teg-border)"}`,
            fontFamily: "var(--font-mono)",
            fontSize: k === "⌫" ? "1rem" : "1.2rem",
            fontWeight: 700, cursor: k === "" ? "default" : "pointer",
            background: k === "" ? "transparent" : "var(--teg-surface)",
            color: k === "" ? "transparent" : "var(--teg-text-primary)",
            transition: "all 0.15s",
            WebkitTapHighlightColor: "transparent",
            minHeight: 52,
          }}
          onMouseEnter={e => { if (k && k !== "") { e.currentTarget.style.background = "var(--teg-cyan-subtle)"; e.currentTarget.style.borderColor = "var(--teg-cyan-border)"; }}}
          onMouseLeave={e => { if (k && k !== "") { e.currentTarget.style.background = "var(--teg-surface)"; e.currentTarget.style.borderColor = "var(--teg-border)"; }}}
        >{k}</button>
      ))}
    </div>
  );
}

function PinDots({ count, filled }) {
  return (
    <div
      style={{ display: "flex", justifyContent: "center", gap: "0.9rem" }}
      role="status"
      aria-label={`PIN: ${filled} de ${count} dígitos introducidos`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          width: 13, height: 13, borderRadius: "50%",
          background: i < filled ? "var(--teg-cyan)" : "transparent",
          border: `2px solid ${i < filled ? "var(--teg-cyan)" : "var(--teg-border)"}`,
          transition: "all 0.15s",
          boxShadow: i < filled ? "0 0 8px var(--teg-cyan-subtle)" : "none",
        }} />
      ))}
    </div>
  );
}

// ── PIN SCREEN ─────────────────────────────────────────────────────────────────
function PinScreen({ onUnlock }) {
  const [digits, setDigits] = useState("");
  const [shake, setShake]   = useState(false);
  const [hint, setHint]     = useState("");

  const storedHash = localStorage.getItem(PIN_KEY) || hashPin(DEFAULT_PIN);

  const tryPin = useCallback((pin) => {
    if (hashPin(pin) === storedHash) {
      localStorage.setItem(AUTH_KEY, String(Date.now() + 8 * 3600 * 1000));
      localStorage.setItem(SESSION_VER, CURRENT_VER);
      if (navigator.vibrate) navigator.vibrate(50); // haptic éxito
      onUnlock();
    } else {
      if (navigator.vibrate) navigator.vibrate([30, 10, 30]); // haptic error
      setShake(true);
      setHint("PIN incorrecto");
      setTimeout(() => { setShake(false); setHint(""); setDigits(""); }, 900);
    }
  }, [storedHash, onUnlock]);

  const handleDigit = useCallback((d) => {
    setDigits(prev => {
      const next = (prev + d).slice(0, 6);
      if (next.length >= 4) setTimeout(() => tryPin(next), 80);
      return next;
    });
  }, [tryPin]);

  const handleBackspace = useCallback(() => setDigits(p => p.slice(0, -1)), []);

  useEffect(() => {
    const h = (e) => {
      if (e.key >= "0" && e.key <= "9") handleDigit(e.key);
      else if (e.key === "Backspace") handleBackspace();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [handleDigit, handleBackspace]);

  return (
    <div style={{
      minHeight: "100dvh", background: "var(--teg-bg)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "2rem", fontFamily: "'Syne', sans-serif",
      backgroundImage: "radial-gradient(ellipse 60% 40% at 50% 0%, var(--teg-cyan-subtle) 0%, transparent 60%)",
    }}>
      <div style={{
        width: "100%", maxWidth: 300, textAlign: "center",
        animation: "teg-fadein 0.45s ease-out",
      }}>
        <div style={{ fontSize: "var(--fs-xl)", marginBottom: "0.4rem" }}>🏔️</div>
        <div style={{ fontWeight: 800, fontSize: "var(--fs-lg)", color: "var(--teg-text-primary)", marginBottom: "0.2rem" }}>
          Trail El Guerrero
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
          color: "var(--teg-text-muted)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "2.5rem" }}>
          Panel de gestión · 2026
        </div>

        <div style={{
          marginBottom: "0.75rem",
          animation: shake ? "teg-shake 0.5s ease" : "none",
        }}>
          <PinDots count={4} filled={digits.length} />
        </div>

        <div style={{ height: "1.2rem", fontFamily: "var(--font-mono)",
          fontSize: "var(--fs-xs)", color: "#dc2626", marginBottom: "1.5rem" }}>{hint}</div>

        <Numpad onDigit={handleDigit} onBackspace={handleBackspace} />

        <div style={{ marginTop: "2rem", fontFamily: "var(--font-mono)",
          fontSize: "0.54rem", color: "var(--teg-text-muted)", lineHeight: 1.7 }}>
          Contacta con el organizador si no tienes el PIN<br />
          Cámbialo desde el icono 🔐 en el panel
        </div>
      </div>
    </div>
  );
}

// ── CHANGE PIN MODAL ───────────────────────────────────────────────────────────
function ChangePinModal({ onClose }) {
  const [step, setStep]     = useState("current");
  const [input, setInput]   = useState("");
  const [newPin, setNewPin] = useState("");
  const [error, setError]   = useState("");
  const [ok, setOk]         = useState(false);

  const storedHash = localStorage.getItem(PIN_KEY) || hashPin(DEFAULT_PIN);
  const STEP_LABEL = { current: "Introduce el PIN actual", new: "Nuevo PIN (mín. 4 dígitos)", confirm: "Confirma el nuevo PIN" };

  const handleDigit = useCallback((d) => {
    const next = (input + d).slice(0, 6);
    setInput(next);
    setError("");
    if (next.length < 4) return;

    if (step === "current") {
      if (hashPin(next) === storedHash) { setStep("new"); setInput(""); }
      else { setError("PIN incorrecto"); setTimeout(() => { setError(""); setInput(""); }, 800); }
    } else if (step === "new") {
      setNewPin(next); setStep("confirm"); setInput("");
    } else if (step === "confirm") {
      if (next === newPin) {
        localStorage.setItem(PIN_KEY, hashPin(next));
        setOk(true);
        setTimeout(onClose, 1500);
      } else {
        setError("No coincide"); setTimeout(() => { setError(""); setInput(""); setStep("new"); setNewPin(""); }, 800);
      }
    }
  }, [input, step, newPin, storedHash, onClose]);

  const handleBackspace = useCallback(() => setInput(p => p.slice(0, -1)), []);

  useEffect(() => {
    const h = (e) => {
      if (e.key >= "0" && e.key <= "9") handleDigit(e.key);
      else if (e.key === "Backspace") handleBackspace();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [handleDigit, handleBackspace, onClose]);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(10px)", padding: "1rem",
        animation: "teg-fadein-scale 0.18s ease" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "var(--teg-surface)", border: "1px solid var(--teg-border)", borderRadius: 18,
          padding: "2rem 1.75rem", width: "100%", maxWidth: 290, textAlign: "center",
          animation: "teg-fadein 0.2s ease" }}
      >
        {ok ? (
          <div style={{ animation: "teg-fadein-scale 0.25s ease" }}>
            <div style={{ fontSize: "var(--fs-xl)", marginBottom: "0.5rem" }}>✅</div>
            <div style={{ color: "#059669", fontWeight: 800, fontSize: "var(--fs-md)" }}>PIN actualizado</div>
          </div>
        ) : (
          <>
            <div style={{ fontWeight: 800, fontSize: "var(--fs-md)", color: "var(--teg-text-primary)", marginBottom: "0.3rem" }}>
              🔐 Cambiar PIN
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--teg-text-muted)", marginBottom: "1.5rem" }}>
              {STEP_LABEL[step]}
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <PinDots count={4} filled={input.length} />
            </div>
            <div style={{ height: "1rem", fontFamily: "var(--font-mono)",
              fontSize: "var(--fs-xs)", color: "#dc2626", marginBottom: "1rem" }}>{error}</div>
            <Numpad onDigit={handleDigit} onBackspace={handleBackspace} />
            <button onClick={onClose} style={{ marginTop: "1.25rem", background: "none",
              border: "none", color: "var(--teg-text-muted)", cursor: "pointer", fontFamily: "var(--font-mono)",
              fontSize: "var(--fs-xs)" }}>Cancelar</button>
          </>
        )}
      </div>
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
        background: "var(--teg-surface-header, rgba(13,17,33,0.85))",
        border: "1px solid rgba(34,211,238,0.25)",
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
  const [authed, setAuthed] = useState(() => {
    const exp = Number(localStorage.getItem(AUTH_KEY) || 0);
    const ver = localStorage.getItem(SESSION_VER);
    // Sesión válida solo si no ha expirado Y tiene la versión actual
    if (exp > Date.now() && ver === CURRENT_VER) return true;
    // Limpiar sesión inválida o de versión anterior
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(SESSION_VER);
    return false;
  });

  // Leer config completo para header Kinetik Ops
  const headerCfg = (() => {
    try {
      const raw = localStorage.getItem("teg_event_config_v1");
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
  const orgIniciales = orgNombre.split(" ").filter(Boolean).slice(0,2).map(w => w[0].toUpperCase()).join("");
  const [showChangePin, setShowChangePin]   = useState(false);
  const [showMoreNav, setShowMoreNav]       = useState(false);
  const [activeBlock, setActiveBlock]       = useState("dashboard");
  const [showDiaCarrera, setShowDiaCarrera] = useState(false);
  const [pendingSubtab, setPendingSubtab] = useState(null);
  const [readmeBlock, setReadmeBlock] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem("teg_onboarding_done")
  );
  const cerrarOnboarding = () => {
    localStorage.setItem("teg_onboarding_done", "1");
    setShowOnboarding(false);
  };
  const ActiveComponent = BLOCKS.find(b => b.id === activeBlock)?.component;

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const saveStatus  = useGlobalSaveStatus();
  const { toasts, dismiss } = useToastSystem();
  const isOnline    = useOnlineStatus();
  useMobileKeyboardScroll();

  // Sync counter — increments on every teg-sync so badges recalculate
  const [syncTick, setSyncTick] = useState(0);
  useEffect(() => {
    const h = () => setSyncTick(t => t + 1);
    window.addEventListener("teg-sync", h);
    return () => window.removeEventListener("teg-sync", h);
  }, []);

  const handleBlockChange = useCallback((id) => {
    window.dispatchEvent(new Event("teg-sync"));
    setActiveBlock(id);
  }, []);

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
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const n = parseInt(e.key);
      if (!e.ctrlKey && !e.metaKey && !e.altKey && n >= 1 && n <= BLOCKS.length) {
        handleBlockChange(BLOCKS[n - 1].id);
      }
      if (e.key === "Escape") { setReadmeBlock(null); setShowChangePin(false); setShowMoreNav(false); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [authed, handleBlockChange]);

  // ── Badges de alertas en nav — calculados desde localStorage ────────────
  const alertasBadges = useMemo(() => {
    try {
      const badges = {};
      const get = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
      
      // Proyecto: tareas vencidas
      const tareas = get("teg_proyecto_v1_tareas", []);
      const vencidas = Array.isArray(tareas) ? tareas.filter(t =>
        t.estado !== "completado" && t.fechaLimite &&
        Math.ceil((new Date(t.fechaLimite) - new Date()) / 86400000) < 0
      ).length : 0;
      if (vencidas > 0) badges["proyecto"] = vencidas;

      // Voluntarios: cobertura crítica
      const vols    = get("teg_voluntarios_v1_voluntarios", []);
      const puestos = get("teg_voluntarios_v1_puestos", []);
      if (Array.isArray(puestos) && Array.isArray(vols)) {
        const criticos = puestos.filter(p => {
          const asign = vols.filter(v => v.puestoId === p.id && v.estado !== "cancelado").length;
          return p.necesarios > 0 && asign / p.necesarios < 0.5;
        }).length;
        if (criticos > 0) badges["voluntarios"] = criticos;
      }

      // Documentos: vencidos o denegados
      const docs  = get("teg_documentos_v1", []);
      const gests = get("teg_documentos_v1_gestiones", []);
      const docsV = Array.isArray(docs) ? docs.filter(d =>
        d.fechaVencimiento && d.estado !== "vigente" &&
        Math.ceil((new Date(d.fechaVencimiento) - new Date()) / 86400000) < 0
      ).length : 0;
      const gestV = Array.isArray(gests) ? gests.filter(g =>
        g.estado !== "aprobado" && g.estado !== "denegado" && g.fechaVencimiento &&
        Math.ceil((new Date(g.fechaVencimiento) - new Date()) / 86400000) < 0
      ).length : 0;
      if (docsV + gestV > 0) badges["documentos"] = docsV + gestV;

      // Presupuesto: resultado negativo
      const conceptos = get("teg_presupuesto_v1_conceptos", []);
      const tramos    = get("teg_presupuesto_v1_tramos", []);
      const inscritos = get("teg_presupuesto_v1_inscritos", { tramos: {} });
      const maximos   = get("teg_presupuesto_v1_maximos", {});
      if (Array.isArray(conceptos) && Array.isArray(tramos)) {
        const totalIns = ["TG7","TG13","TG25"].reduce((s,d) =>
          s + tramos.reduce((ss,t) => ss + (inscritos?.tramos?.[t.id]?.[d]||0), 0), 0
        );
        const ingresos = tramos.reduce((s,t) =>
          s + ["TG7","TG13","TG25"].reduce((ss,d) =>
            ss + (inscritos?.tramos?.[t.id]?.[d]||0) * (t.precios?.[d]||0), 0
          ), 0);
        const costes = conceptos.filter(c => c.activo).reduce((s,c) => {
          if (c.tipo === "fijo") return s + (c.costeTotal || 0);
          return s + ["TG7","TG13","TG25"].reduce((ss,d) =>
            ss + (c.activoDistancias?.[d] ? (c.costePorDistancia?.[d]||0) * (tramos.reduce((st,t) => st + (inscritos?.tramos?.[t.id]?.[d]||0), 0)) : 0), 0
          );
        }, 0);
        if (ingresos - costes < 0 && totalIns > 0) badges["presupuesto"] = "!";
      }

      // Logística: incidencias abiertas
      const incidencias = get("teg_logistica_v1_inc", []);
      const incAbiertas = Array.isArray(incidencias) ? incidencias.filter(i => i.estado === "abierta").length : 0;
      if (incAbiertas > 0) badges["logistica"] = incAbiertas;

      return badges;
    } catch { return {}; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBlock, syncTick]); // recalcular al cambiar de bloque o al sincronizar datos

  if (!authed) return <PinScreen onUnlock={() => {
    setAuthed(true);
    // Modo arranque directo — abrir DíaCarrera si está configurado
    try {
      const raw = localStorage.getItem("teg_event_config_v1");
      const cfg = raw ? JSON.parse(raw) : {};
      if (cfg.autoOpenDia) setTimeout(() => setShowDiaCarrera(true), 350);
    } catch {}
  }} />;

  const NAV_H = isMobile ? 68 : 66;
  const diasCarrera = Math.ceil((eventFecha - new Date()) / 86400000);
  const mostrarBtnDiaDProminente = diasCarrera >= 0 && diasCarrera <= 7;
  const mostrarBtnDiaD = diasCarrera >= -1 && diasCarrera <= 30; // accesible 30 días antes

  // Nav: en mobile mostramos 5 principales + "Más" para los extra
  const NAV_MAIN_IDS = ["dashboard", "proyecto", "presupuesto", "voluntarios", "logistica"];
  const NAV_MORE_IDS = ["patrocinadores", "camisetas", "documentos"];
  const navBlocks    = BLOCKS.filter(b => b.id !== "configuracion");
  const navMain      = isMobile ? navBlocks.filter(b => NAV_MAIN_IDS.includes(b.id)) : navBlocks;
  const navMore      = isMobile ? navBlocks.filter(b => NAV_MORE_IDS.includes(b.id)) : [];
  const moreIsActive = navMore.some(b => b.id === activeBlock);

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
          background: "rgba(251,191,36,0.97)",
          color: "var(--teg-text-primary)",
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
          boxShadow: "0 2px 12px rgba(251,191,36,0.35)",
        }}>
          <span>⚠️</span>
          <span>SIN CONEXIÓN — Los cambios se guardan localmente y se sincronizarán al recuperar la conexión</span>
        </div>
      )}

      <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:"var(--teg-bg)",
          backgroundImage:"radial-gradient(ellipse 90% 45% at 15% -5%, rgba(34,211,238,0.065) 0%, transparent 50%), radial-gradient(ellipse 60% 30% at 85% 105%, rgba(167,139,250,0.045) 0%, transparent 48%), radial-gradient(ellipse 30% 20% at 50% 50%, rgba(34,211,238,0.02) 0%, transparent 55%)" }}>

        {/* TOP BAR — Kinetik Ops style */}
        <header style={{
          background:"var(--teg-surface-header, rgba(13,17,33,0.88))", backdropFilter:"blur(20px) saturate(180%)",
          WebkitBackdropFilter:"blur(20px) saturate(180%)",
          borderBottom:"1px solid rgba(34,211,238,0.08)",
          padding:"0 0.75rem", display:"flex", alignItems:"center",
          justifyContent:"space-between", position:"sticky", top:0, zIndex:50,
          height:48, gap:"0.5rem",
        }}>

          {/* LEFT — Avatar + Brand */}
          <div style={{ display:"flex", alignItems:"center", gap:"0.55rem", flexShrink:0 }}>
            {/* Avatar con iniciales del organizador */}
            <div
              title={orgNombre}
              onClick={() => handleBlockChange("configuracion")}
              style={{
                width:30, height:30, borderRadius:9,
                background:"linear-gradient(135deg, rgba(34,211,238,0.2) 0%, rgba(167,139,250,0.15) 100%)",
                border:"1px solid rgba(34,211,238,0.3)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:"var(--fs-xs)",
                color:"var(--cyan)", cursor:"pointer", flexShrink:0,
                transition:"all 0.18s", userSelect:"none",
                boxShadow:"0 0 10px rgba(34,211,238,0.1)",
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow="0 0 16px rgba(34,211,238,0.2)"; e.currentTarget.style.borderColor="rgba(34,211,238,0.5)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow="0 0 10px rgba(34,211,238,0.1)"; e.currentTarget.style.borderColor="rgba(34,211,238,0.3)"; }}
            >
              {orgIniciales}
            </div>

            {/* Brand text */}
            {!isMobile && (
              <div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800,
                  fontSize:"var(--fs-base)", color:"var(--teg-text-primary)", lineHeight:1.1,
                  letterSpacing:"-0.01em" }}>
                  Kinetik Ops
                </div>
                <div style={{ fontFamily:"'DM Mono', 'Space Mono', monospace,monospace",
                  fontSize:"0.46rem", color:"var(--teg-text-muted)",
                  letterSpacing:"0.08em", textTransform:"uppercase" }}>
                  Trail El Guerrero 2026
                </div>
              </div>
            )}
          </div>

          {/* CENTER — Autosave + buscador */}
          <div style={{ flex:1, display:"flex", justifyContent:"center", alignItems:"center", gap:"0.5rem", minWidth:0 }}>
            <AutosaveIndicator status={saveStatus} />
          </div>

          {/* RIGHT — Actions */}
          <div style={{ display:"flex", gap:"0.25rem", alignItems:"center", flexShrink:0 }}>

            <ThemeToggle size={28} />

            {(mostrarBtnDiaD || mostrarBtnDiaDProminente) && (
              <button onClick={() => setShowDiaCarrera(true)} style={{
                background:"rgba(248,113,113,0.12)", color:"#f87171",
                border:"1px solid rgba(248,113,113,0.3)", borderRadius:8,
                padding:"0.2rem 0.45rem",
                fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                fontWeight:700, cursor:"pointer", height:28,
                display:"flex", alignItems:"center", gap:"0.25rem",
              }}>🏁{!isMobile && <span style={{letterSpacing:".04em"}}>DÍA D</span>}</button>
            )}



            {/* Settings pill */}
            <button
              onClick={() => handleBlockChange("configuracion")}
              title="Configuración"
              aria-label="Configuración"
              style={{
                background: activeBlock==="configuracion" ? "rgba(167,139,250,0.12)" : "transparent",
                border: `1px solid ${activeBlock==="configuracion" ? "rgba(167,139,250,0.4)" : "var(--teg-border)"}`,
                color: activeBlock==="configuracion" ? "var(--violet)" : "var(--teg-text-muted)",
                cursor:"pointer", width:30, height:30, borderRadius:8,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"var(--fs-base)", transition:"all 0.15s",
                boxShadow: activeBlock==="configuracion" ? "0 0 10px rgba(167,139,250,0.15)" : "none",
              }}
              onMouseEnter={e => { if(activeBlock!=="configuracion") { e.currentTarget.style.borderColor="rgba(167,139,250,0.35)"; e.currentTarget.style.color="var(--violet)"; }}}
              onMouseLeave={e => { if(activeBlock!=="configuracion") { e.currentTarget.style.borderColor="var(--teg-border)"; e.currentTarget.style.color="var(--teg-text-muted)"; }}}
            >⚙️</button>
          </div>
        </header>

        {/* CONTENT */}
        <main style={{
          flex:1, overflow:"auto",
          paddingBottom: `calc(${NAV_H}px + 8px + env(safe-area-inset-bottom, 0px))`,
        }}>
          <style>{`
            @keyframes module-enter {
              from { opacity:0; transform:translateY(10px); }
              to   { opacity:1; transform:translateY(0); }
            }
            .module-enter { animation: module-enter 0.22s cubic-bezier(0.34,1.1,0.64,1) both; }
          `}</style>
          <div className="module-enter">
          <ErrorBoundary
            key={activeBlock}
            blockName={BLOCKS.find(b => b.id === activeBlock)?.label}
            onNavigate={handleBlockChange}
          >
            <Suspense fallback={
              <div style={{
                display:"flex", flexDirection:"column", alignItems:"center",
                justifyContent:"center", minHeight:"60vh", gap:"1rem",
              }}>
                <div style={{
                  width:36, height:36, borderRadius:"50%",
                  border:"3px solid var(--teg-border)",
                  borderTopColor:"var(--teg-cyan)",
                  animation:"teg-spin 0.7s linear infinite",
                }} />
                <div style={{
                  fontFamily:"'DM Mono', 'Space Mono', monospace,monospace", fontSize:"var(--fs-xs)",
                  color:"var(--teg-text-muted)", letterSpacing:"0.1em",
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
            position:"fixed", bottom:0, left:0, right:0,
            background:"var(--teg-surface-header, rgba(13,17,33,0.88))", backdropFilter:"blur(20px) saturate(180%)",
            WebkitBackdropFilter:"blur(20px) saturate(180%)",
            borderTop:"1px solid rgba(34,211,238,0.07)",
            display:"flex", justifyContent:"space-around", alignItems:"center",
            height: NAV_H,
            paddingBottom:"env(safe-area-inset-bottom,0px)",
            zIndex:50,
          }}
        >
          {/* Ítems principales */}
          {navMain.map((b, idx) => {
            const isActive = activeBlock === b.id;
            return (
              <button
                key={b.id}
                onClick={() => { handleBlockChange(b.id); setShowMoreNav(false); }}
                aria-label={b.label}
                aria-current={isActive ? "page" : undefined}
                title={`${b.label} (${idx + 1})`}
                style={{
                  background:"none", border:"none", cursor:"pointer",
                  display:"flex", flexDirection:"column", alignItems:"center",
                  justifyContent:"center", gap:"0.18rem",
                  padding: isMobile ? "0.35rem 0.4rem" : "0.35rem 0.6rem",
                  borderRadius:10,
                  transition:"opacity 0.2s",
                  opacity: isActive ? 1 : 0.38,
                  flex: 1,
                  position:"relative", outline:"none",
                  WebkitTapHighlightColor:"transparent",
                  minHeight: NAV_H - 4,
                }}
              >
                {/* Blob activo estilo iOS/Figma con spring */}
                <div style={{
                  position:"absolute",
                  top:"50%", left:"50%",
                  transform:`translate(-50%, -50%) scale(${isActive ? 1 : 0})`,
                  width:44, height:36, borderRadius:12,
                  background:"rgba(34,211,238,0.12)",
                  boxShadow: isActive ? "0 0 18px rgba(34,211,238,0.22)" : "none",
                  transition:"transform 0.35s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease",
                  pointerEvents:"none",
                }} />
                {/* Franja inferior indicador activo */}
                <div style={{
                  position:"absolute", bottom:2, left:"50%",
                  transform:`translateX(-50%) scaleX(${isActive ? 1 : 0})`,
                  width:22, height:3, borderRadius:2,
                  background:"var(--cyan)",
                  transition:"transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                  pointerEvents:"none",
                }} />
                <span style={{
                  fontSize: isMobile ? "1.35rem" : "1.15rem",
                  filter: isActive ? "none" : "grayscale(0.6) opacity(0.6)",
                  transform: isActive ? "scale(1.05)" : "scale(1)",
                  transition:"all 0.2s",
                  pointerEvents:"none", position:"relative", zIndex:1,
                }}>
                  {b.icon}
                  {alertasBadges[b.id] && (
                    <span style={{
                      position:"absolute", top:-3, right:-5,
                      minWidth:13, height:13, borderRadius:7,
                      background:"#f87171", color:"#fff",
                      fontSize:"var(--fs-2xs)", fontWeight:800,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      padding:"0 3px", lineHeight:1,
                      fontFamily:"monospace", border:"1.5px solid var(--bg)",
                      zIndex:10,
                    }}>
                      {typeof alertasBadges[b.id] === "number" ? alertasBadges[b.id] : "!"}
                    </span>
                  )}
                </span>
                <span style={{
                  fontFamily:"'DM Mono', 'Space Mono', monospace,monospace",
                  fontSize:"0.48rem",
                  fontWeight: isActive ? 800 : 600, letterSpacing:"0.07em", textTransform:"uppercase",
                  color: isActive ? "var(--cyan)" : "var(--teg-text-muted)",
                  textShadow: isActive ? "0 0 10px rgba(34,211,238,0.45)" : "none",
                  transition:"color 0.2s, text-shadow 0.2s",
                  pointerEvents:"none", whiteSpace:"nowrap",
                  position:"relative", zIndex:1,
                }}>
                  {isMobile ? b.shortLabel : b.shortLabel}
                </span>

              </button>
            );
          })}

          {/* Botón "Más" — solo en mobile */}
          {isMobile && navMore.length > 0 && (
            <button
              onClick={() => setShowMoreNav(v => !v)}
              aria-label="Más secciones"
              aria-expanded={showMoreNav}
              aria-haspopup="true"
              style={{
                background:"none", border:"none", cursor:"pointer",
                display:"flex", flexDirection:"column", alignItems:"center",
                justifyContent:"center", gap:"0.18rem",
                padding:"0.35rem 0.4rem",
                borderRadius:10,
                transition:"opacity 0.2s",
                opacity: (showMoreNav || moreIsActive) ? 1 : 0.42,
                flex:1, position:"relative", outline:"none",
                WebkitTapHighlightColor:"transparent",
                minHeight: NAV_H - 4,
              }}
            >
              {(showMoreNav || moreIsActive) && (
                <div style={{
                    position:"absolute", inset:0, borderRadius:10,
                    background:"rgba(34,211,238,0.07)",
                    border:"1px solid rgba(34,211,238,0.18)",
                  }} />
              )}
              <span style={{
                fontSize:"var(--fs-lg)",
                filter: (showMoreNav || moreIsActive) ? "none" : "grayscale(0.55)",
                transform:(showMoreNav || moreIsActive) ? "scale(1.1)" : "scale(1)",
                transition:"all 0.2s", position:"relative", zIndex:1,
              }}>{"•••"}</span>
              <span style={{
                fontFamily:"'DM Mono', 'Space Mono', monospace,monospace",
                fontSize:"0.52rem", fontWeight:700,
                color:(showMoreNav || moreIsActive) ? "var(--teg-cyan)" : "var(--teg-text-muted)",
                transition:"color 0.2s",
                pointerEvents:"none", whiteSpace:"nowrap",
                position:"relative", zIndex:1,
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
                position:"fixed", inset:0, zIndex:48,
                background:"rgba(0,0,0,0.35)",
                backdropFilter:"blur(4px)",
                animation:"teg-fadein 0.15s ease",
              }}
            />
            {/* Drawer en sí */}
            <div style={{
              position:"fixed", bottom: NAV_H, left:0, right:0, zIndex:49,
              background:"var(--teg-surface)",
              borderTop:"1px solid var(--teg-border)",
              borderRadius:"16px 16px 0 0",
              padding:"0.75rem 1rem",
              paddingBottom:"0.5rem",
              boxShadow:"0 -8px 32px rgba(0,0,0,0.3)",
              animation:"slideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)",
            }}>
              {/* Handle visual */}
              <div style={{ width:36, height:4, background:"var(--teg-border)", borderRadius:2, margin:"0 auto 0.75rem" }} />
              <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--teg-text-muted)",
                textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"0.5rem", paddingLeft:"0.25rem" }}>
                Más secciones
              </div>
              <div style={{ display:"flex", gap:"0.5rem" }}>
                {navMore.map(b => {
                  const isActive = activeBlock === b.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => { handleBlockChange(b.id); setShowMoreNav(false); }}
                      aria-label={b.label}
                      aria-current={isActive ? "page" : undefined}
                      style={{
                        flex:1, background: isActive ? "rgba(34,211,238,0.08)" : "var(--teg-surface2)",
                        border: isActive ? "1px solid rgba(34,211,238,0.25)" : "1px solid var(--teg-border)",
                        borderRadius:12, padding:"0.75rem 0.5rem",
                        cursor:"pointer", display:"flex", flexDirection:"column",
                        alignItems:"center", gap:"0.3rem",
                        WebkitTapHighlightColor:"transparent",
                        transition:"all 0.15s",
                      }}
                    >
                       <span style={{ position:"relative", fontSize:"1.6rem" }}>
                         {b.icon}
                         {alertasBadges[b.id] && (
                           <span style={{
                             position:"absolute", top:-2, right:-4,
                             minWidth:13, height:13, borderRadius:7,
                             background:"#f87171", color:"#fff",
                             fontSize:"var(--fs-2xs)", fontWeight:800,
                             display:"flex", alignItems:"center", justifyContent:"center",
                             padding:"0 3px", lineHeight:1,
                             fontFamily:"monospace", border:"1.5px solid var(--bg)",
                           }}>
                             {typeof alertasBadges[b.id] === "number" ? alertasBadges[b.id] : "!"}
                           </span>
                         )}
                       </span>
                       <span style={{
                         fontFamily:"'DM Mono','Space Mono',monospace",
                         fontSize:"var(--fs-xs)", fontWeight:700,
                         color: isActive ? "var(--teg-cyan)" : "var(--teg-text-muted)",
                         whiteSpace:"nowrap",
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
        {showOnboarding && <OnboardingModal onClose={cerrarOnboarding} onNavigate={(id) => { handleBlockChange(id); cerrarOnboarding(); }} />}
        {showChangePin && <ChangePinModal onClose={() => setShowChangePin(false)} />}

        {/* TOAST STACK — renderizado encima de todo */}
        <ToastStack toasts={toasts} dismiss={dismiss} navH={NAV_H} />
      </div>
    </>
  );
}
