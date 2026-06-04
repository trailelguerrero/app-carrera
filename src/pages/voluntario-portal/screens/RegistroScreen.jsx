import { useState, useEffect } from "react";
import {
  SK_VOL_PUESTOS, SK_VOL_IMG_FRONT, SK_VOL_IMG_BACK, SK_VOL_IMG_GUIA_TALLAS,
  SK_VOL_OPCION_PUESTO, SK_VOL_OPCION_VEHICULO, SK_VOL_OPCION_EMAIL,
  SK_VOL_OPCION_EMERGENCIA, SK_VOL_VOLUNTARIOS,
} from "@/constants/storageKeys";
import { SHIRT_PLACEHOLDER_FRONT, SHIRT_PLACEHOLDER_BACK } from "@/constants/camisetasConstants";
import { fetchPublic, PUBLIC_API } from "../lib/session";
import { StepperForm } from "./StepperForm";

export function RegistroScreen({ onVolver, onRegistroOk }) {
  const [puestos,          setPuestos]          = useState([]);
  const [imgFront,         setImgFront]         = useState(null);
  const [imgBack,          setImgBack]          = useState(null);
  const [imgGuiaTallas,    setImgGuiaTallas]    = useState(null);
  const [opcionPuesto,     setOpcionPuesto]     = useState(true);
  const [opcionVehiculo,   setOpcionVehiculo]   = useState(true);
  const [opcionEmail,      setOpcionEmail]      = useState(false);
  const [opcionEmergencia, setOpcionEmergencia] = useState(false);
  const [loading,          setLoading]          = useState(true);
  const [enviando,         setEnviando]         = useState(false);
  const [errorEnvio,       setErrorEnvio]       = useState(null);

  useEffect(() => {
    Promise.all([
      fetchPublic(SK_VOL_PUESTOS),
      fetchPublic(SK_VOL_IMG_FRONT),
      fetchPublic(SK_VOL_IMG_BACK),
      fetchPublic(SK_VOL_IMG_GUIA_TALLAS),
      fetchPublic(SK_VOL_OPCION_PUESTO),
      fetchPublic(SK_VOL_OPCION_VEHICULO),
      fetchPublic(SK_VOL_OPCION_EMAIL),
      fetchPublic(SK_VOL_OPCION_EMERGENCIA),
    ]).then(([psts, front, back, guia, opP, opV, opE, opEm]) => {
      if (Array.isArray(psts)) setPuestos(psts);
      if (front)               setImgFront(front);
      if (back)                setImgBack(back);
      if (guia)                setImgGuiaTallas(guia);
      if (opP  !== null) setOpcionPuesto(Boolean(opP));
      if (opV  !== null) setOpcionVehiculo(Boolean(opV));
      if (opE  !== null) setOpcionEmail(Boolean(opE));
      if (opEm !== null) setOpcionEmergencia(Boolean(opEm));
      setLoading(false);
    });
  }, []);

  const addVoluntario = async (data) => {
    setEnviando(true); setErrorEnvio(null);
    try {
      const res = await fetch(`${PUBLIC_API}?collection=${SK_VOL_VOLUNTARIOS}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, estado: "pendiente" }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setErrorEnvio("Ya existe un registro con ese teléfono. Si ya eres voluntario, accede con tu ficha personal.");
        } else {
          setErrorEnvio(json.error || "Error al enviar el registro. Inténtalo de nuevo.");
        }
        setEnviando(false); return;
      }
      onRegistroOk(data.telefono || "", data.nombre || "");
    } catch {
      setErrorEnvio("Sin conexión. Comprueba tu red e inténtalo de nuevo.");
    }
    setEnviando(false);
  };

  if (loading) return (
    <div className="vp-page">
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
        flexDirection:"column", gap:"1rem" }}>
        <div style={{ fontSize:"2rem", animation:"spin 1s linear infinite" }}>⟳</div>
        <div className="vp-mono" style={{ fontSize:".78rem", color:"var(--text-muted)" }}>
          Cargando formulario…
        </div>
      </div>
    </div>
  );

  return (
    <div className="vp-page">
      <div className="vp-topbar">
        <button className="vp-btn vp-btn-ghost vp-btn-sm"
          style={{ width:"auto" }} onClick={onVolver}>
          ← Volver
        </button>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:".72rem", color:"var(--cyan)", fontWeight:700 }}>
          Registro de voluntario
        </div>
      </div>

      {errorEnvio && (
        <div style={{ position:"fixed", top:56, left:"50%", transform:"translateX(-50%)",
          background:"rgba(248,113,113,.15)", border:"1px solid rgba(248,113,113,.4)",
          borderRadius:8, padding:".6rem 1.2rem", fontFamily:"var(--font-mono)",
          fontSize:".7rem", color:"var(--red)", zIndex:999, maxWidth:"90vw", textAlign:"center" }}>
          ⚠️ {errorEnvio}
        </div>
      )}

      <div className="vp-wrap" style={{ paddingTop:"1.5rem" }}>
        <StepperForm
          puestos={puestos}
          imgFront={imgFront || SHIRT_PLACEHOLDER_FRONT}
          imgBack={imgBack || SHIRT_PLACEHOLDER_BACK}
          imgGuiaTallas={imgGuiaTallas}
          opcionPuesto={opcionPuesto}
          opcionVehiculo={opcionVehiculo}
          opcionEmail={opcionEmail}
          opcionEmergencia={opcionEmergencia}
          enviando={enviando}
          onRegistrar={addVoluntario}
        />
      </div>
    </div>
  );
}
