/**
 * PinScreen.jsx — T3.1 + SEC-01 (Fase 0)
 * Pantalla de autenticación por PIN del panel de gestión.
 * Extraído de Index.jsx.
 *
 * Lockout: tras MAX_FAILS intentos fallidos → bloqueo 5 min
 * con cuenta regresiva de 60 s visible y recarga automática al expirar.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import {
  verifyPin,
  createSession,
  getLockoutStatus,
  recordFailedAttempt,
  clearFailedAttempts,
  MAX_FAILS,
} from "./pinAuth.js";

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

function Numpad({ onDigit, onBackspace, disabled }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem" }}>
      {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k, i) => (
        <button
          key={i}
          onClick={() => {
            if (k === "⌫") onBackspace();
            else if (k !== "") onDigit(k);
          }}
          disabled={disabled || k === ""}
          aria-label={k === "⌫" ? "Borrar" : k === "" ? undefined : `Número ${k}`}
          style={{
            padding: "0.9rem 0", borderRadius: 10,
            border: `1px solid ${k === "" ? "transparent" : "var(--teg-border)"}`,
            fontFamily: "var(--font-mono)",
            fontSize: k === "⌫" ? "1rem" : "1.2rem",
            fontWeight: 700, cursor: (disabled || k === "") ? "default" : "pointer",
            background: k === "" ? "transparent" : disabled ? "var(--teg-surface)" : "var(--teg-surface)",
            color: k === "" ? "transparent" : disabled ? "var(--teg-text-muted)" : "var(--teg-text-primary)",
            opacity: disabled ? 0.45 : 1,
            transition: "all 0.15s",
            WebkitTapHighlightColor: "transparent",
            minHeight: 52,
          }}
          onMouseEnter={e => { if (!disabled && k && k !== "") { e.currentTarget.style.background = "var(--teg-cyan-subtle)"; e.currentTarget.style.borderColor = "var(--teg-cyan-border)"; }}}
          onMouseLeave={e => { if (!disabled && k && k !== "") { e.currentTarget.style.background = "var(--teg-surface)"; e.currentTarget.style.borderColor = "var(--teg-border)"; }}}
        >{k}</button>
      ))}
    </div>
  );
}

/** Cuenta regresiva en segundos hasta que el lockout expira */
function useLockoutCountdown(initialSeconds) {
  const [secs, setSecs] = useState(initialSeconds);
  const ref = useRef(null);

  useEffect(() => {
    if (initialSeconds <= 0) return;
    setSecs(initialSeconds);
    ref.current = setInterval(() => {
      setSecs(s => {
        if (s <= 1) { clearInterval(ref.current); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, [initialSeconds]);

  return secs;
}

export default function PinScreen({ onUnlock }) {
  const [digits, setDigits]       = useState("");
  const [shake, setShake]         = useState(false);
  const [hint, setHint]           = useState("");
  const [lockout, setLockout]     = useState(() => getLockoutStatus());
  const countdown                 = useLockoutCountdown(lockout.locked ? lockout.secondsLeft : 0);

  // Cuando la cuenta regresiva llega a 0, refrescar el estado de lockout
  useEffect(() => {
    if (lockout.locked && countdown === 0) {
      setLockout(getLockoutStatus());
    }
  }, [countdown, lockout.locked]);

  const tryPin = useCallback((pin) => {
    // Verificar lockout antes de procesar
    const ls = getLockoutStatus();
    if (ls.locked) {
      setLockout(ls);
      return;
    }

    if (verifyPin(pin)) {
      clearFailedAttempts();
      createSession();
      if (navigator.vibrate) navigator.vibrate(50);
      onUnlock();
    } else {
      if (navigator.vibrate) navigator.vibrate([30, 10, 30]);
      const result = recordFailedAttempt();
      setShake(true);

      if (result.locked) {
        setLockout(result);
        setHint("");
        setDigits("");
        setTimeout(() => setShake(false), 900);
      } else {
        const remaining = MAX_FAILS - result.fails;
        setHint(remaining <= 3
          ? `PIN incorrecto — ${remaining} intento${remaining !== 1 ? "s" : ""} restante${remaining !== 1 ? "s" : ""}`
          : "PIN incorrecto"
        );
        setTimeout(() => { setShake(false); setHint(""); setDigits(""); }, 900);
      }
    }
  }, [onUnlock]);

  const handleDigit = useCallback((d) => {
    if (lockout.locked) return;
    setDigits(prev => {
      const next = (prev + d).slice(0, 6);
      if (next.length >= 4) setTimeout(() => tryPin(next), 80);
      return next;
    });
  }, [tryPin, lockout.locked]);

  const handleBackspace = useCallback(() => {
    if (!lockout.locked) setDigits(p => p.slice(0, -1));
  }, [lockout.locked]);

  useEffect(() => {
    const h = (e) => {
      if (lockout.locked) return;
      if (e.key >= "0" && e.key <= "9") handleDigit(e.key);
      else if (e.key === "Backspace") handleBackspace();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [handleDigit, handleBackspace, lockout.locked]);

  const isLocked = lockout.locked && countdown > 0;
  const mins = String(Math.floor(countdown / 60)).padStart(2, "0");
  const secs  = String(countdown % 60).padStart(2, "0");

  return (
    <div style={{
      minHeight: "100dvh", background: "var(--teg-bg)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "2rem", fontFamily: "'Syne', sans-serif",
      backgroundImage: "radial-gradient(ellipse 60% 40% at 50% 0%, var(--teg-cyan-subtle) 0%, transparent 60%)",
    }}>
      <div style={{ width: "100%", maxWidth: 300, textAlign: "center", animation: "teg-fadein 0.45s ease-out" }}>
        <div style={{ fontSize: "var(--fs-xl)", marginBottom: "0.4rem" }}>🏔️</div>
        <div style={{ fontWeight: 800, fontSize: "var(--fs-lg)", color: "var(--teg-text-primary)", marginBottom: "0.2rem" }}>
          Trail El Guerrero
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
          color: "var(--teg-text-muted)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "2.5rem" }}>
          Panel de gestión · 2026
        </div>

        {/* ── Estado de bloqueo ── */}
        {isLocked ? (
          <div style={{
            padding: "1.25rem 1rem", borderRadius: 14,
            background: "rgba(220,38,38,0.07)",
            border: "1px solid rgba(220,38,38,0.25)",
            marginBottom: "1.5rem",
          }}>
            <div style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>🔒</div>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)",
              color: "var(--red)", fontWeight: 700, marginBottom: "0.35rem",
            }}>
              Panel bloqueado
            </div>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: "2rem",
              color: "var(--red)", fontWeight: 800, letterSpacing: "0.1em",
              marginBottom: "0.35rem",
            }}>
              {mins}:{secs}
            </div>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
              color: "var(--teg-text-muted)", lineHeight: 1.5,
            }}>
              Demasiados intentos fallidos.<br />Espera o contacta con el organizador.
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: "0.75rem", animation: shake ? "teg-shake 0.5s ease" : "none" }}>
              <PinDots count={4} filled={digits.length} />
            </div>
            <div style={{ height: "1.2rem", fontFamily: "var(--font-mono)",
              fontSize: "var(--fs-xs)", color: "var(--red)", marginBottom: "1.5rem" }}>{hint}</div>
          </>
        )}

        <Numpad onDigit={handleDigit} onBackspace={handleBackspace} disabled={isLocked} />

        <div style={{ marginTop: "2rem", fontFamily: "var(--font-mono)",
          fontSize: "0.54rem", color: "var(--teg-text-muted)", lineHeight: 1.7 }}>
          Contacta con el organizador si no tienes el PIN<br />
          Cámbialo desde el icono 🔐 en el panel
        </div>
      </div>
    </div>
  );
}
