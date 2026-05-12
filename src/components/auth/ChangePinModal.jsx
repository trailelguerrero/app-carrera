/**
 * ChangePinModal.jsx — T3.1 + Fase 4 (bcrypt)
 * Modal para cambio de PIN del panel de gestión.
 * Usa changePinRemote (bcrypt server-side) con fallback a savePin local.
 */
import { useState, useEffect, useCallback } from "react";
import { verifyPin, savePin, changePinRemote } from "./pinAuth.js";

function PinDots({ count, filled }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: "0.9rem" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          width: 13, height: 13, borderRadius: "50%",
          background: i < filled ? "var(--teg-cyan)" : "transparent",
          border: `2px solid ${i < filled ? "var(--teg-cyan)" : "var(--teg-border)"}`,
          transition: "all 0.15s",
        }} />
      ))}
    </div>
  );
}

function Numpad({ onDigit, onBackspace }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem" }}>
      {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k, i) => (
        <button key={i}
          onClick={() => { if (k === "⌫") onBackspace(); else if (k) onDigit(k); }}
          disabled={k === ""}
          style={{
            padding: "0.9rem 0", borderRadius: 10,
            border: `1px solid ${k === "" ? "transparent" : "var(--teg-border)"}`,
            fontFamily: "var(--font-mono)", fontSize: k === "⌫" ? "1rem" : "1.2rem",
            fontWeight: 700, cursor: k === "" ? "default" : "pointer",
            background: k === "" ? "transparent" : "var(--teg-surface)",
            color: k === "" ? "transparent" : "var(--teg-text-primary)",
            transition: "all 0.15s", WebkitTapHighlightColor: "transparent", minHeight: 52,
          }}
        >{k}</button>
      ))}
    </div>
  );
}

export default function ChangePinModal({ onClose }) {
  const [step, setStep]     = useState("current");
  const [input, setInput]   = useState("");
  const [newPin, setNewPin]   = useState("");
  const [error, setError]     = useState("");
  const currentPinRef           = { current: "" }; // PIN actual validado, para changePinRemote
  const [ok, setOk]         = useState(false);

  const STEP_LABEL = {
    current: "Introduce el PIN actual",
    new:     "Nuevo PIN (mín. 4 dígitos)",
    confirm: "Confirma el nuevo PIN",
  };

  const handleDigit = useCallback((d) => {
    const next = (input + d).slice(0, 6);
    setInput(next);
    setError("");
    if (next.length < 4) return;

    if (step === "current") {
      if (verifyPin(next)) { currentPinRef.current = next; setStep("new"); setInput(""); }
      else { setError("PIN incorrecto"); setTimeout(() => { setError(""); setInput(""); }, 800); }
    } else if (step === "new") {
      setNewPin(next); setStep("confirm"); setInput("");
    } else if (step === "confirm") {
      if (next === newPin) {
        changePinRemote(currentPinRef.current, next)
          .then(({ ok }) => {
            if (ok) {
              savePin(next); // sincronizar hash local
              setOk(true);
              setTimeout(onClose, 1500);
            } else {
              setError("PIN actual incorrecto"); setTimeout(() => { setError(""); setInput(""); setStep("current"); setNewPin(""); }, 800);
            }
          })
          .catch(() => {
            // Fallback: servidor no disponible, guardar solo local
            savePin(next);
            setOk(true);
            setTimeout(onClose, 1500);
          });
      } else {
        setError("No coincide"); setTimeout(() => { setError(""); setInput(""); setStep("new"); setNewPin(""); }, 800);
      }
    }
  }, [input, step, newPin, onClose]);

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
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(10px)", padding: "1rem",
      animation: "teg-fadein-scale 0.18s ease",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "var(--teg-surface)", border: "1px solid var(--teg-border)", borderRadius: 18,
        padding: "2rem 1.75rem", width: "100%", maxWidth: 290, textAlign: "center",
        animation: "teg-fadein 0.2s ease",
      }}>
        {ok ? (
          <div style={{ animation: "teg-fadein-scale 0.25s ease" }}>
            <div style={{ fontSize: "var(--fs-xl)", marginBottom: "0.5rem" }}>✅</div>
            <div style={{ color: "var(--green)", fontWeight: 800, fontSize: "var(--fs-md)" }}>PIN actualizado</div>
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
              fontSize: "var(--fs-xs)", color: "var(--red)", marginBottom: "1rem" }}>{error}</div>
            <Numpad onDigit={handleDigit} onBackspace={handleBackspace} />
            <button onClick={onClose} style={{ marginTop: "1.25rem", background: "none",
              border: "none", color: "var(--teg-text-muted)", cursor: "pointer",
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)" }}>Cancelar</button>
          </>
        )}
      </div>
    </div>
  );
}
