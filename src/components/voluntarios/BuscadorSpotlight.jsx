import { useState, useMemo, useEffect, useRef } from "react";

export function BuscadorSpotlight({ busqueda, setBusqueda, voluntarios, puestos, onAbrirFicha, onVerTodos, onFiltroPuesto }) {
  const [abierto, setAbierto] = useState(false);
  const inputRef = useRef(null);
  const wrapRef  = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setAbierto(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") { setAbierto(false); setBusqueda(""); inputRef.current?.blur(); }
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault(); inputRef.current?.focus(); setAbierto(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [setBusqueda]);

  const q = busqueda.trim().toLowerCase();

  const resultadosVols = useMemo(() => {
    if (!q || q.length < 2) return [];
    return voluntarios.filter(v => {
      const nc  = ((v.nombre || "") + " " + (v.apellidos || "")).toLowerCase();
      const an  = ((v.apellidos || "") + " " + (v.nombre || "")).toLowerCase();
      const tel = (v.telefono || "").replace(/\s/g, "");
      const em  = (v.email || "").toLowerCase();
      const pn  = (puestos.find(p => p.id === v.puestoId)?.nombre || "").toLowerCase();
      return nc.includes(q) || an.includes(q) || tel.includes(q.replace(/\s/g, "")) || em.includes(q) || pn.includes(q);
    }).slice(0, 7);
  }, [q, voluntarios, puestos]);

  const resultadosPuestos = useMemo(() => {
    if (!q || q.length < 2) return [];
    return puestos.filter(p => (p.nombre || "").toLowerCase().includes(q) || (p.tipo || "").toLowerCase().includes(q)).slice(0, 3);
  }, [q, puestos]);

  const hayResultados   = resultadosVols.length > 0 || resultadosPuestos.length > 0;
  const mostrarDropdown = abierto && q.length >= 2;

  const eColor = (e) => e === "confirmado" ? "var(--green)" : e === "cancelado" ? "var(--red)" : e === "ausente" ? "var(--orange)" : "var(--amber)";
  const eBg    = (e) => e === "confirmado" ? "var(--green-dim)" : e === "cancelado" ? "var(--red-dim)" : e === "ausente" ? "var(--orange-dim)" : "var(--amber-dim)";

  const seleccionar = (v) => { setAbierto(false); setBusqueda(""); onAbrirFicha(v); };
  const verTodos    = ()  => { setAbierto(false); onVerTodos(); };

  return (
    <div ref={wrapRef} style={{ marginBottom: ".6rem", position: "relative" }}>
      <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 440 }}>
          <span style={{ position: "absolute", left: ".7rem", top: "50%", transform: "translateY(-50%)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-base)", pointerEvents: "none", color: abierto && q ? "var(--cyan)" : "var(--text-dim)", transition: "color .15s" }}>🔍</span>
          <input
            ref={inputRef}
            className="inp"
            value={busqueda}
            onFocus={() => setAbierto(true)}
            onChange={e => { setBusqueda(e.target.value); setAbierto(true); }}
            placeholder="Buscar voluntario por nombre, teléfono o puesto… ( / )"
            style={{ paddingLeft: "2.2rem", paddingRight: busqueda ? "1.8rem" : ".6rem", fontSize: "var(--fs-base)", borderColor: mostrarDropdown ? "var(--cyan)" : undefined, boxShadow: mostrarDropdown ? "0 0 0 2px rgba(34,211,238,.08)" : undefined, borderBottomLeftRadius: mostrarDropdown ? 0 : undefined, borderBottomRightRadius: mostrarDropdown ? 0 : undefined }}
          />
          {busqueda && (
            <button onClick={() => { setBusqueda(""); setAbierto(false); inputRef.current?.focus(); }}
              style={{ position: "absolute", right: ".5rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "var(--fs-base)", padding: "0 .1rem", lineHeight: 1 }}>✕</button>
          )}
        </div>
      </div>

      {mostrarDropdown && (
        <div style={{ position: "absolute", top: "100%", left: 0, maxWidth: 440, right: 0, background: "var(--surface)", border: "1px solid var(--cyan)", borderTop: "none", borderRadius: "0 0 var(--radius-sm) var(--radius-sm)", boxShadow: "0 8px 32px rgba(0,0,0,.5)", zIndex: 300, overflow: "hidden" }}>
          {!hayResultados ? (
            <div style={{ padding: ".75rem 1rem", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", textAlign: "center" }}>Sin resultados para "{q}"</div>
          ) : (
            <>
              {resultadosVols.length > 0 && (
                <>
                  <div style={{ padding: ".28rem .75rem .18rem", fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".08em", borderBottom: "1px solid rgba(30,45,80,.5)" }}>👥 Voluntarios</div>
                  {resultadosVols.map(v => {
                    const puesto = puestos.find(p => p.id === v.puestoId);
                    const ini = [(v.nombre || ""), (v.apellidos || "")].join(" ").trim().split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || "V";
                    return (
                      <div key={v.id} onClick={() => seleccionar(v)}
                        style={{ display: "flex", alignItems: "center", gap: ".6rem", padding: ".42rem .75rem", cursor: "pointer", transition: "background .1s", borderBottom: "1px solid rgba(30,45,80,.25)" }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: "var(--surface2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--cyan)" }}>{ini}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: ".35rem", flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 600, fontSize: "var(--fs-base)", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{[v.nombre, v.apellidos].filter(Boolean).join(" ")}</span>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", padding: ".04rem .28rem", borderRadius: 3, flexShrink: 0, background: eBg(v.estado), color: eColor(v.estado) }}>{v.estado || "pendiente"}</span>
                            {v.coche && <span title="Tiene vehículo" style={{ fontSize: "var(--fs-sm)" }}>🚗</span>}
                          </div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: ".04rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {v.telefono && <span>{v.telefono}</span>}
                            {puesto && <span style={{ marginLeft: ".4rem", color: "var(--text-dim)" }}>· 📍 {puesto.nombre}</span>}
                            {!v.puestoId && <span style={{ marginLeft: ".4rem", color: "var(--amber)" }}>· Sin asignar</span>}
                          </div>
                        </div>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", flexShrink: 0 }}>→</span>
                      </div>
                    );
                  })}
                </>
              )}

              {resultadosPuestos.length > 0 && (
                <>
                  <div style={{ padding: ".28rem .75rem .18rem", fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".08em", borderTop: resultadosVols.length > 0 ? "1px solid rgba(30,45,80,.5)" : undefined, borderBottom: "1px solid rgba(30,45,80,.5)" }}>📍 Puestos</div>
                  {resultadosPuestos.map(p => {
                    const conf = voluntarios.filter(v => v.puestoId === p.id && v.estado === "confirmado").length;
                    const pct  = p.necesarios > 0 ? Math.round(conf / p.necesarios * 100) : 0;
                    const col  = pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)";
                    return (
                      <div key={p.id} onClick={() => { setAbierto(false); setBusqueda(""); onFiltroPuesto(p.id); }}
                        style={{ display: "flex", alignItems: "center", gap: ".6rem", padding: ".42rem .75rem", cursor: "pointer", transition: "background .1s", borderBottom: "1px solid rgba(30,45,80,.25)" }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <span style={{ fontSize: "1rem", flexShrink: 0 }}>📍</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: "var(--fs-base)", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.nombre}</div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: ".04rem" }}>
                            <span style={{ color: col }}>{conf}/{p.necesarios} conf.</span>
                            {p.tipo && <span style={{ marginLeft: ".4rem", color: "var(--text-dim)" }}>· {p.tipo}</span>}
                            {p.horaInicio && <span style={{ marginLeft: ".4rem", color: "var(--text-dim)" }}>· {p.horaInicio}{p.horaFin ? `–${p.horaFin}` : ""}</span>}
                          </div>
                        </div>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", flexShrink: 0 }}>ver lista →</span>
                      </div>
                    );
                  })}
                </>
              )}

              {resultadosVols.length > 0 && (
                <div onClick={verTodos}
                  style={{ padding: ".42rem .75rem", cursor: "pointer", borderTop: "1px solid rgba(30,45,80,.5)", display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem", fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--cyan)", transition: "background .1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--cyan-dim)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  {resultadosVols.length >= 7 ? "Ver todos los resultados en lista completa →" : `Ver ${resultadosVols.length} resultado${resultadosVols.length !== 1 ? "s" : ""} en lista completa →`}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
