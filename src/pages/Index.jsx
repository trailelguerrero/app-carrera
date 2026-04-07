import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReadmeModal from "../components/blocks/ReadmeModal";
import OnboardingModal from "../components/blocks/OnboardingModal";
import { ThemeToggle } from "../components/ui/ThemeToggle";

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
  { id: "proyecto",       icon: "🏔️", label: "Proyecto",       shortLabel: "Proy.",  component: Proyecto },
  { id: "presupuesto",    icon: "💰", label: "Presupuesto",    shortLabel: "Presu.", component: Presupuesto },
  { id: "voluntarios",    icon: "👥", label: "Voluntarios",    shortLabel: "Volun.", component: Voluntarios },
  { id: "logistica",      icon: "📦", label: "Logística",      shortLabel: "Log.",   component: Logistica },
  { id: "patrocinadores", icon: "🤝", label: "Patrocinadores", shortLabel: "Pat.",   component: Patrocinadores },
  { id: "camisetas",      icon: "👕", label: "Camisetas",      shortLabel: "Cam.",   component: Camisetas },
  { id: "documentos",     icon: "📁", label: "Docs",           shortLabel: "Docs",   component: Documentos },
  { id: "configuracion",  icon: "⚙️", label: "Configuración",  shortLabel: "Config", component: Configuracion },
];

// ── PIN CONFIG ────────────────────────────────────────────────────────────────
const PIN_KEY     = "teg_panel_pin_hash";
const AUTH_KEY    = "teg_panel_authed";
const DEFAULT_PIN = "2026";

function hashPin(pin) {
  let h = 0;
  for (let i = 0; i < pin.length; i++) {
    h = (Math.imul(31, h) + pin.charCodeAt(i)) | 0;
  }
  return String(h);
}

// ── SERVICE WORKER ─────────────────────────────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
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
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85 }}
        transition={{ duration: 0.18 }}
        style={{
          display: "inline-flex", alignItems: "center", gap: "0.3rem",
          fontFamily: "var(--font-mono)", fontSize: "0.55rem",
          color: c.color, background: c.bg,
          border: `1px solid ${c.border}`,
          borderRadius: 6, padding: "0.2rem 0.5rem", whiteSpace: "nowrap",
        }}
      >
        <span style={{
          width: 5, height: 5, borderRadius: "50%", background: "currentColor", flexShrink: 0,
          animation: c.pulse ? "teg-pulse 1s ease-in-out infinite" : "none",
        }} />
        {c.text}
      </motion.div>
    </AnimatePresence>
  );
}

// ── PIN NUMPAD (shared) ────────────────────────────────────────────────────────
function Numpad({ onDigit, onBackspace }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem" }}>
      {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k, i) => (
        <button
          key={i}
          onClick={() => k === "⌫" ? onBackspace() : k !== "" ? onDigit(k) : null}
          disabled={k === ""}
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
    <div style={{ display: "flex", justifyContent: "center", gap: "0.9rem" }}>
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
      onUnlock();
    } else {
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
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        style={{ width: "100%", maxWidth: 300, textAlign: "center" }}
      >
        <div style={{ fontSize: "2.2rem", marginBottom: "0.4rem" }}>🏔️</div>
        <div style={{ fontWeight: 800, fontSize: "1.25rem", color: "var(--teg-text-primary)", marginBottom: "0.2rem" }}>
          Trail El Guerrero
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem",
          color: "var(--teg-text-muted)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "2.5rem" }}>
          Panel de gestión · 2026
        </div>

        <motion.div
          animate={shake ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: "0.75rem" }}
        >
          <PinDots count={4} filled={digits.length} />
        </motion.div>

        <div style={{ height: "1.2rem", fontFamily: "var(--font-mono)",
          fontSize: "0.62rem", color: "#dc2626", marginBottom: "1.5rem" }}>{hint}</div>

        <Numpad onDigit={handleDigit} onBackspace={handleBackspace} />

        <div style={{ marginTop: "2rem", fontFamily: "var(--font-mono)",
          fontSize: "0.54rem", color: "var(--teg-text-muted)", lineHeight: 1.7 }}>
          PIN por defecto: <span style={{ color: "var(--teg-text-secondary)" }}>2026</span><br />
          Cámbialo desde el icono 🔐 en el panel
        </div>
      </motion.div>
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
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(10px)", padding: "1rem" }}
    >
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.88, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, y: 20 }}
        transition={{ type: "spring", stiffness: 360, damping: 28 }}
        style={{ background: "var(--teg-surface)", border: "1px solid var(--teg-border)", borderRadius: 18,
          padding: "2rem 1.75rem", width: "100%", maxWidth: 290, textAlign: "center" }}
      >
        {ok ? (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>✅</div>
            <div style={{ color: "#059669", fontWeight: 800, fontSize: "1rem" }}>PIN actualizado</div>
          </motion.div>
        ) : (
          <>
            <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--teg-text-primary)", marginBottom: "0.3rem" }}>
              🔐 Cambiar PIN
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--teg-text-muted)", marginBottom: "1.5rem" }}>
              {STEP_LABEL[step]}
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <PinDots count={4} filled={input.length} />
            </div>
            <div style={{ height: "1rem", fontFamily: "var(--font-mono)",
              fontSize: "0.6rem", color: "#dc2626", marginBottom: "1rem" }}>{error}</div>
            <Numpad onDigit={handleDigit} onBackspace={handleBackspace} />
            <button onClick={onClose} style={{ marginTop: "1.25rem", background: "none",
              border: "none", color: "var(--teg-text-muted)", cursor: "pointer", fontFamily: "var(--font-mono)",
              fontSize: "0.6rem" }}>Cancelar</button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── MAIN EXPORT ────────────────────────────────────────────────────────────────
export default function Index() {
  const [authed, setAuthed] = useState(() => {
    const exp = Number(localStorage.getItem(AUTH_KEY) || 0);
    return exp > Date.now();
  });
  const [showChangePin, setShowChangePin] = useState(false);
  const [activeBlock, setActiveBlock]     = useState("dashboard");
  const [readmeBlock, setReadmeBlock]     = useState(null);
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

  const saveStatus = useGlobalSaveStatus();

  const handleBlockChange = useCallback((id) => {
    window.dispatchEvent(new Event("teg-sync"));
    setActiveBlock(id);
  }, []);

  // Navegación desde cualquier bloque via evento custom (ej. alertas del Dashboard)
  useEffect(() => {
    const h = (e) => { if (e.detail?.block) handleBlockChange(e.detail.block); };
    window.addEventListener("teg-navigate", h);
    return () => window.removeEventListener("teg-navigate", h);
  }, [handleBlockChange]);

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
      if (e.key === "Escape") { setReadmeBlock(null); setShowChangePin(false); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [authed, handleBlockChange]);

  if (!authed) return <PinScreen onUnlock={() => setAuthed(true)} />;

  const NAV_H = isMobile ? 62 : 66;

  return (
    <>
      <style>{`
        @keyframes teg-pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.35; transform:scale(0.6); }
        }
      `}</style>

      <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:"var(--teg-bg)" }}>

        {/* TOP BAR */}
        <header style={{
          background:"var(--teg-surface)", backdropFilter:"blur(12px)",
          WebkitBackdropFilter:"blur(12px)", borderBottom:"1px solid var(--teg-border)",
          padding:"0.4rem 0.9rem", display:"flex", alignItems:"center",
          justifyContent:"space-between", position:"sticky", top:0, zIndex:50, minHeight:44,
        }}>
          {/* Brand */}
          <div style={{ display:"flex", alignItems:"center", gap:"0.45rem" }}>
            <span style={{ fontSize:"1rem" }}>🏔️</span>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800,
                fontSize: isMobile ? "0.76rem" : "0.86rem", color:"var(--teg-text-primary)", lineHeight:1.1 }}>
                Trail El Guerrero
              </div>
              {!isMobile && (
                <div style={{ fontFamily:"'DM Mono', 'Space Mono', monospace,monospace", fontSize:"0.5rem", color:"var(--teg-text-muted)" }}>
                  Panel de gestión · 2026
                </div>
              )}
            </div>
          </div>

          {/* Autosave indicator — centro */}
          <div style={{ flex:1, display:"flex", justifyContent:"center" }}>
            <AutosaveIndicator status={saveStatus} />
          </div>

          {/* Actions */}
          <div style={{ display:"flex", gap:"0.35rem", alignItems:"center" }}>
            <ThemeToggle size={30} />

            <button
              onClick={() => setShowChangePin(true)}
              title="Cambiar PIN de acceso"
              style={{ background:"transparent", border:"none", color:"var(--teg-text-muted)",
                cursor:"pointer", fontSize:"0.8rem", padding:"0.3rem",
                borderRadius:6, lineHeight:1, transition:"color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.color="var(--teg-text-secondary)"}
              onMouseLeave={e => e.currentTarget.style.color="var(--teg-text-muted)"}
            >🔐</button>

            {activeBlock !== "dashboard" && (
              <>
                <button onClick={() => setReadmeBlock(activeBlock)} style={{
                  background:"rgba(167,139,250,0.1)", color:"var(--teg-accent)",
                  border:"1px solid rgba(167,139,250,0.22)", borderRadius:6,
                  padding: isMobile ? "0.22rem 0.38rem" : "0.26rem 0.55rem",
                  fontFamily:"'DM Mono', 'Space Mono', monospace,monospace",
                  fontSize: isMobile ? "0.5rem" : "0.58rem", fontWeight:700, cursor:"pointer",
                }}>📖{!isMobile && " README"}</button>
                <button onClick={async () => { const { exportBlockToPdf } = await import("../components/blocks/PdfExport"); exportBlockToPdf(activeBlock); }} style={{
                  background:"rgba(52,211,153,0.1)", color:"#059669",
                  border:"1px solid rgba(52,211,153,0.22)", borderRadius:6,
                  padding: isMobile ? "0.22rem 0.38rem" : "0.26rem 0.55rem",
                  fontFamily:"'DM Mono', 'Space Mono', monospace,monospace",
                  fontSize: isMobile ? "0.5rem" : "0.58rem", fontWeight:700, cursor:"pointer",
                }}>📄{!isMobile && " PDF"}</button>
              </>
            )}
          </div>
        </header>

        {/* CONTENT */}
        <main style={{ flex:1, overflow:"auto", paddingBottom: NAV_H + 8 }}>
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
                fontFamily:"'DM Mono', 'Space Mono', monospace,monospace", fontSize:"0.6rem",
                color:"var(--teg-text-muted)", letterSpacing:"0.1em",
              }}>Cargando módulo…</div>
              <style>{`@keyframes teg-spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          }>
            {ActiveComponent && <ActiveComponent key={activeBlock} />}
          </Suspense>
        </main>

        {/* BOTTOM NAV */}
        <nav style={{
          position:"fixed", bottom:0, left:0, right:0,
          background:"var(--teg-surface)", backdropFilter:"blur(14px)",
          WebkitBackdropFilter:"blur(14px)", borderTop:"1px solid var(--teg-border)",
          display:"flex", justifyContent:"space-around", alignItems:"center",
          height: NAV_H,
          paddingBottom:"env(safe-area-inset-bottom,0px)",
          zIndex:50, overflowX:"auto",
        }}>
          {BLOCKS.map((b, idx) => {
            const isActive = activeBlock === b.id;
            return (
              <button
                key={b.id}
                onClick={() => handleBlockChange(b.id)}
                aria-label={b.label}
                title={`${b.label} (${idx + 1})`}
                style={{
                  background:"none", border:"none", cursor:"pointer",
                  display:"flex", flexDirection:"column", alignItems:"center",
                  justifyContent:"center", gap:"0.18rem",
                  padding: isMobile ? "0.3rem 0.45rem" : "0.35rem 0.6rem",
                  borderRadius:10,
                  transition:"opacity 0.2s",
                  opacity: isActive ? 1 : 0.42,
                  flex: isMobile ? "0 0 auto" : 1,
                  minWidth: isMobile ? 44 : 0,
                  maxWidth: isMobile ? 68 : "none",
                  position:"relative", outline:"none",
                  WebkitTapHighlightColor:"transparent",
                }}
              >
                {/* Active pill background */}
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    style={{
                      position:"absolute", inset:0, borderRadius:10,
                      background:"rgba(34,211,238,0.07)",
                      border:"1px solid rgba(34,211,238,0.18)",
                    }}
                    transition={{ type:"spring", stiffness:400, damping:34 }}
                  />
                )}

                {/* Icon */}
                <span style={{
                  fontSize: isMobile ? "1.1rem" : "1.18rem",
                  filter: isActive ? "none" : "grayscale(0.55)",
                  transform: isActive ? "scale(1.1)" : "scale(1)",
                  transition:"all 0.2s",
                  pointerEvents:"none", position:"relative", zIndex:1,
                }}>{b.icon}</span>

                {/* Label — SIEMPRE VISIBLE */}
                <span style={{
                  fontFamily:"'DM Mono', 'Space Mono', monospace,monospace",
                  fontSize: isMobile ? "0.41rem" : "0.49rem",
                  fontWeight:700, letterSpacing:"0.01em",
                  color: isActive ? "var(--teg-cyan)" : "var(--teg-text-muted)",
                  transition:"color 0.2s",
                  pointerEvents:"none", whiteSpace:"nowrap",
                  position:"relative", zIndex:1,
                }}>
                  {isMobile ? b.shortLabel : b.label}
                </span>

                {/* Active dot */}
                {isActive && (
                  <motion.div
                    layoutId="nav-dot"
                    style={{
                      width:3, height:3, borderRadius:"50%",
                      background:"var(--teg-cyan)",
                      boxShadow:"0 0 5px var(--teg-cyan-subtle)",
                      position:"relative", zIndex:1,
                    }}
                    transition={{ type:"spring", stiffness:400, damping:34 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* MODALS */}
        {readmeBlock && <ReadmeModal block={readmeBlock} onClose={() => setReadmeBlock(null)} />}
        {showOnboarding && <OnboardingModal onClose={cerrarOnboarding} onNavigate={(id) => { handleBlockChange(id); cerrarOnboarding(); }} />}
        <AnimatePresence>
          {showChangePin && <ChangePinModal onClose={() => setShowChangePin(false)} />}
        </AnimatePresence>
      </div>
    </>
  );
}
