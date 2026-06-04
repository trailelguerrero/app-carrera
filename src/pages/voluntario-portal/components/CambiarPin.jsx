import { useState } from "react";
import { PinNumpad } from "./PinNumpad";
import { API_BASE } from "../lib/session";

export function CambiarPin({ token, onDone, onCancel, hideCancel = false }) {
  const [step, setStep]   = useState(1);
  const [pin1, setPin1]   = useState(""); const [pin2, setPin2] = useState("");
  const [shake, setShake] = useState(false);
  const [error, setError] = useState(""); const [saving, setSaving] = useState(false);

  const cur = step===1?pin1:pin2;
  const setCur = step===1?setPin1:setPin2;

  const handleChange = async (val) => {
    setCur(val); if (val.length < 4) return;
    if (step===1) { setTimeout(()=>setStep(2),120); return; }
    if (val!==pin1) {
      setShake(true); setPin1(""); setPin2(""); setStep(1);
      setError("Los PINs no coinciden."); setTimeout(()=>setShake(false),500); return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}?action=cambiar-pin`, {
        method:"POST", headers:{"Authorization":`Bearer ${token}`,"Content-Type":"application/json"},
        body:JSON.stringify({pinNuevo:val}),
      });
      if (res.ok) {
        setStep(99);
        setTimeout(() => onDone(), 1800);
      } else { const d=await res.json(); setError(d.error||"Error"); }
    } catch { setError("Error de conexión"); }
    finally { setSaving(false); }
  };

  return (
    <div className="vp-card" style={{marginBottom:".75rem"}}>
      <div className="vp-card-header">
        <div style={{fontFamily:"var(--font-display)", fontWeight:800, fontSize:"var(--fs-md)", color:"var(--text)"}}>
          🔐 {step===1?"Nuevo PIN":"Confirma el PIN"}
        </div>
        {!hideCancel && (
          <button className="vp-btn vp-btn-ghost vp-btn-sm"
            style={{minHeight:38, minWidth:38, borderRadius:"50%", padding:".3rem", fontSize:"1.1rem"}}
            onClick={onCancel}>✕</button>
        )}
      </div>
      {step === 99 ? (
        <div style={{ textAlign:"center", padding:"1.5rem 0" }}>
          <div style={{ fontSize:"3rem", marginBottom:".6rem" }}>✅</div>
          <div style={{ fontFamily:"var(--font-display)", fontSize:"var(--fs-lg)", fontWeight:800, color:"var(--green)" }}>
            ¡PIN cambiado!
          </div>
          <div className="vp-mono" style={{ fontSize:"var(--fs-sm)", color:"var(--text-muted)", marginTop:".4rem" }}>
            Tu nuevo PIN está activo
          </div>
        </div>
      ) : (
        <>
          {error && <div className="vp-error" style={{marginBottom:".75rem"}}>⚠ {error}</div>}
          <PinNumpad value={cur} onChange={handleChange} shake={shake} disabled={saving} />
        </>
      )}
    </div>
  );
}
