/**
 * VoluntarioPortal — URL única: /voluntarios/mi-ficha
 *
 * Máquina de estados:
 *   landing  → pantalla de bienvenida con dos opciones
 *   registro → formulario de registro en 3 pasos
 *   login    → autenticación en 2 pasos (teléfono + PIN)
 *   portal   → ficha personal del voluntario autenticado
 */
import React, { useState } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { loadSession, saveSession, clearSession, fetchPublic } from "./lib/session";
import { LandingScreen }    from "./screens/LandingScreen";
import { RegistroScreen }   from "./screens/RegistroScreen";
import { RegistroOkScreen } from "./screens/RegistroOkScreen";
import { LoginScreen }      from "./screens/LoginScreen";
import { PortalMain }       from "./screens/PortalMain";

// UX-10: estilos de foco accesibles — portal de voluntarios
const PORTAL_FOCUS_STYLES = `
  button:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; border-radius: 4px; }
  input:focus-visible  { outline: 2px solid var(--cyan); outline-offset: 2px; border-radius: 4px; }
  select:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; border-radius: 4px; }
  textarea:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; border-radius: 4px; }
  a:focus-visible      { outline: 2px solid var(--cyan); outline-offset: 2px; border-radius: 4px; }
`;

export default function VoluntarioPortal() {
  // Inyectar estilos focus-visible al montar (UX-10)
  React.useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-portal-focus', '');
    styleEl.textContent = PORTAL_FOCUS_STYLES;
    document.head.appendChild(styleEl);
    return () => styleEl.remove();
  }, []);

  const [pantalla, setPantalla] = useState(() => {
    const sess = loadSession();
    return sess?.token ? "portal" : "landing";
  });
  const [token,          setToken]         = useState(() => loadSession()?.token || null);
  const [regTel,         setRegTel]        = useState("");
  const [regNombre,      setRegNombre]     = useState("");
  const [loginTelPreload,setLoginTelPreload] = useState("");

  // Carga config pública para landing y login (telefonoContacto, fecha, lugar)
  const [publicConfig, setPublicConfig] = useState(null);
  React.useEffect(() => {
    fetchPublic("teg_event_config_v1").then(cfg => { if (cfg && typeof cfg === "object") setPublicConfig(cfg); });
  }, []);

  // PWA-03: detectar estado de conexión para mostrar banner offline
  const isOnline = useOnlineStatus();

  const goLanding  = () => setPantalla("landing");
  const goRegistro = () => setPantalla("registro");
  const goLogin    = (tel) => { setLoginTelPreload(typeof tel === "string" ? tel : ""); setPantalla("login"); };
  const goPortal   = (tok) => { setToken(tok); saveSession({ token:tok }); setPantalla("portal"); };
  const goLogout   = () => { clearSession(); setToken(null); setPantalla("landing"); };

  const onRegistroOk = (tel, nombre) => {
    setRegTel(tel);
    setRegNombre(nombre);
    setPantalla("registro-ok");
  };

  // Banner offline — visible en todas las pantallas
  const bannerOffline = !isOnline && (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
      background: "var(--teg-amber-solid, #f59e0b)",
      color: "#08091a",
      textAlign: "center",
      padding: "0.45rem 1rem",
      fontFamily: "var(--font-mono, monospace)",
      fontSize: "var(--fs-sm, 0.8rem)",
      fontWeight: 700,
      letterSpacing: ".04em",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: ".5rem",
      boxShadow: "0 2px 12px rgba(245,158,11,0.35)",
    }}>
      <span>⚠️</span>
      <span>Sin conexión · Mostrando datos guardados</span>
    </div>
  );

  if (pantalla === "landing")      return <>{bannerOffline}<LandingScreen onNuevo={goRegistro} onLogin={goLogin} config={publicConfig} /></>;
  if (pantalla === "registro")     return <>{bannerOffline}<RegistroScreen onVolver={goLanding} onRegistroOk={onRegistroOk} /></>;
  if (pantalla === "registro-ok")  return <>{bannerOffline}<RegistroOkScreen telefono={regTel} nombre={regNombre} onAcceder={() => goLogin(regTel)} /></>;
  if (pantalla === "login")        return <>{bannerOffline}<LoginScreen onLogin={goPortal} onVolver={goLanding} telefonoInicial={loginTelPreload} config={publicConfig} /></>;
  if (pantalla === "portal")       return <>{bannerOffline}<PortalMain token={token} onLogout={goLogout} /></>;
  return null;
}
