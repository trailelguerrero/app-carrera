/**
 * PinScreen.jsx — T3.1
 * Pantalla de autenticación por PIN del panel de gestión.
 * Extraído de Index.jsx.
 */
import { useState, useEffect, useCallback } from "react";
import { verifyPin, createSession } from "./pinAuth.js";

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

function Numpad({ onDigit, onBackspace }) {
  const haptic = (type = 'light') => {
    if (!navigator.vibrate) return;
    if (type === 'light')   navigator.vibrate(8);
    if (type === 'error')   navigator.vibrate([30, 10, 30]);
    if (type === 'success') navigator.vibrate(50);
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

export default function PinScreen({ onUnlock }) {
  const [digits, setDigits] = useState("");
  const [shake, setShake]   = useState(false);
  const [hint, setHint]     = useState("");

  const tryPin = useCallback((pin) => {
    if (verifyPin(pin)) {
      createSession();
      if (navigator.vibrate) navigator.vibrate(50);
      onUnlock();
    } else {
      if (navigator.vibrate) navigator.vibrate([30, 10, 30]);
      setShake(true);
      setHint("PIN incorrecto");
      setTimeout(() => { setShake(false); setHint(""); setDigits(""); }, 900);
    }
  }, [onUnlock]);

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
      <div style={{ width: "100%", maxWidth: 300, textAlign: "center", animation: "teg-fadein 0.45s ease-out" }}>
        <div style={{ fontSize: "var(--fs-xl)", marginBottom: "0.4rem" }}>🏔️</div>
        <div style={{ fontWeight: 800, fontSize: "var(--fs-lg)", color: "var(--teg-text-primary)", marginBottom: "0.2rem" }}>
          Trail El Guerrero
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)",
          color: "var(--teg-text-muted)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "2.5rem" }}>
          Panel de gestión · 2026
        </div>
        <div style={{ marginBottom: "0.75rem", animation: shake ? "teg-shake 0.5s ease" : "none" }}>
          <PinDots count={4} filled={digits.length} />
        </div>
        <div style={{ height: "1.2rem", fontFamily: "var(--font-mono)",
          fontSize: "var(--fs-xs)", color: "var(--red)", marginBottom: "1.5rem" }}>{hint}</div>
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
