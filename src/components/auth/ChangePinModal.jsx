/**
 * ChangePinModal.jsx — T3.1 + Fase 4 (bcrypt) + SEC-01 (PIN 6 dígitos)
 * Modal para cambio de PIN del panel de gestión.
 * Usa changePinRemote (bcrypt server-side) con fallback a savePin local.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { verifyPin, savePin, changePinRemote, getPinLength, savePinLength } from "./pinAuth.js";

// MAX_DOTS reserva espacio visual para 6 puntos siempre — evita layout shift al cambiar longitud.
const MAX_DOTS = 6;

function PinDots({ count, filled }) {
  return (
    <div style={{
      display: "flex", justifyContent: "center",
      width: `${MAX_DOTS * 13 + (MAX_DOTS - 1) * 14.4}px`,
      margin: "0 auto", gap: "0.9rem",
    }}>
      {Array.from({ length: MAX_DOTS }).map((_, i) => {
        const active   = i < count;
        const isFilled = i < filled;
        return (
          <div key={i} style={{
            width: 13, height: 13, borderRadius: "50%",
            background: isFilled ? "var(--cyan)" : "transparent",
            border: `2px solid ${isFilled ? "var(--cyan)" : active ? "var(--border)" : "transparent"}`,
            opacity: active ? 1 : 0,
            transform: active ? "scale(1)" : "scale(0.4)",
            transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
            flexShrink: 0,
          }} />
        );
      })}
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
            border: `1px solid ${k === "" ? "transparent" : "var(--border)"}`,
            fontFamily: "var(--font-mono)", fontSize: k === "⌫" ? "1rem" : "1.2rem",
            fontWeight: 700, cursor: k === "" ? "default" : "pointer",
            background: k === "" ? "transparent" : "var(--surface)",
            color: k === "" ? "transparent" : "var(--text)",
            transition: "all 0.15s", WebkitTapHighlightColor: "transparent", minHeight: 52,
          }}
        >{k}</button>
      ))}
    </div>
  );
}

export default function ChangePinModal({ onClose }) {
  const [step, setStep]           = useState("current");
  const [input, setInput]         = useState("");
  const [newPin, setNewPin]       = useState("");
  const [error, setError]         = useState("");
  const [ok, setOk]               = useState(false);
  // Longitud arranca con la configurada; se puede cambiar en step "new"
  const [pinLength, setPinLength] = useState(() => getPinLength());
  // useRef correcto — no se reinicia en cada render (fix de bug previo)
  const currentPinRef             = useRef("");

  const STEP_LABEL = {
    current: "Introduce el PIN actual",
    new:     `Nuevo PIN (${pinLength} dígitos)`,
    confirm: "Confirma el nuevo PIN",
  };

  const handleDigit = useCallback((d) => {
    const next = (input + d).slice(0, pinLength);
    setInput(next);
    setError("");
    if (next.length < pinLength) return;

    if (step === "current") {
      if (verifyPin(next)) {
        currentPinRef.current = next;
        setStep("new");
        setInput("");
      } else {
        setError("PIN incorrecto");
        setTimeout(() => { setError(""); setInput(""); }, 800);
      }
    } else if (step === "new") {
      setNewPin(next);
      setStep("confirm");
      setInput("");
    } else if (step === "confirm") {
      if (next === newPin) {
        changePinRemote(currentPinRef.current, next)
          .then(({ ok: serverOk }) => {
            if (serverOk) {
              savePin(next);
              savePinLength(pinLength);
              setOk(true);
              setTimeout(onClose, 1500);
            } else {
              setError("PIN actual incorrecto");
              setTimeout(() => { setError(""); setInput(""); setStep("current"); setNewPin(""); }, 800);
            }
          })
          .catch(() => {
            // Fallback: servidor no disponible, guardar solo local
            savePin(next);
            savePinLength(pinLength);
            setOk(true);
            setTimeout(onClose, 1500);
          });
      } else {
        setError("No coincide");
        setTimeout(() => { setError(""); setInput(""); setStep("new"); setNewPin(""); }, 800);
      }
    }
  }, [input, step, newPin, pinLength, onClose]);

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

  // Al cambiar la longitud se limpia el input para evitar estado inconsistente
  const togglePinLength = () => {
    setPinLength(l => (l === 4 ? 6 : 4));
    setInput("");
    setError("");
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(10px)", padding: "1rem",
      animation: "teg-fadein-scale 0.18s ease",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18,
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
            <div style={{ fontWeight: 800, fontSize: "var(--fs-md)", color: "var(--text)", marginBottom: "0.3rem" }}>
              🔐 Cambiar PIN
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", marginBottom: "1.5rem" }}>
              {STEP_LABEL[step]}
            </div>

            {/* Toggle longitud — solo en step "new" para no confundir al verificar el PIN actual */}
            {step === "new" && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".6rem", marginBottom: "1rem" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
                  Longitud:
                </span>
                <button
                  onClick={togglePinLength}
                  style={{
                    display: "flex", alignItems: "center", gap: ".35rem",
                    padding: ".2rem .65rem", borderRadius: 20,
                    border: "1px solid var(--border)", background: "var(--surface2)",
                    fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700,
                    cursor: "pointer", transition: "all .15s",
                  }}
                  title="Cambiar entre PIN de 4 y 6 dígitos"
                >
                  <span style={{ color: pinLength === 4 ? "var(--cyan)" : "var(--text-dim)" }}>4</span>
                  <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>/</span>
                  <span style={{ color: pinLength === 6 ? "var(--cyan)" : "var(--text-dim)" }}>6</span>
                  <span style={{ fontSize: "var(--fs-2xs)", color: "var(--text-dim)", marginLeft: ".15rem" }}>díg.</span>
                </button>
              </div>
            )}

            <div style={{ marginBottom: "0.5rem" }}>
              <PinDots count={pinLength} filled={input.length} />
            </div>
            <div style={{ height: "1rem", fontFamily: "var(--font-mono)",
              fontSize: "var(--fs-xs)", color: "var(--red)", marginBottom: "1rem" }}>{error}</div>
            <Numpad onDigit={handleDigit} onBackspace={handleBackspace} />
            <button onClick={onClose} style={{ marginTop: "1.25rem", background: "none",
              border: "none", color: "var(--text-dim)", cursor: "pointer",
              fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)" }}>Cancelar</button>
          </>
        )}
      </div>
    </div>
  );
}
