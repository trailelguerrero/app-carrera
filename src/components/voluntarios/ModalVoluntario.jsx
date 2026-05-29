// Auto-extracted from Voluntarios.jsx — Sprint 2 refactor
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { TALLAS, SHIRT_PLACEHOLDER_FRONT, SHIRT_PLACEHOLDER_BACK, GUIA_TALLAS } from "@/constants/camisetasConstants";
import { createPortal } from "react-dom";
import { toast } from "@/lib/toast";
import { genIdNum } from "@/lib/utils";
import { useModalClose } from "@/hooks/useModalClose";
import EmptyState from "@/components/EmptyState";
import { usePaginacion } from "@/hooks/usePaginacion.jsx";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { EVENT_CONFIG_DEFAULT } from "@/constants/eventConfig";
import { blockCls as cls } from "@/lib/blockStyles";
import { ESTADOS, estadoColor, estadoBg } from "@/constants/voluntariosConstants";

// ─── MODAL VOLUNTARIO ─────────────────────────────────────────────────────────
function ModalVoluntario({ voluntario, puestos, onSave, onClose, onEliminar }) {
  const { closing: mvClosing, handleClose: mvHandleClose } = useModalClose(onClose);
  const firstInputRef = useRef(null);
  useEffect(() => { const t = setTimeout(() => firstInputRef.current?.focus(), 60); return () => clearTimeout(t); }, []);
  // CORE-10: nombre y apellidos son campos separados en el modelo
  // El split era un parche para voluntarios registrados antes de CORE-10
  // — la migración en Voluntarios.jsx lo resuelve en datos existentes

  const [form, setForm] = useState({
    nombre:    voluntario?.nombre    || "",
    apellidos: voluntario?.apellidos || "",
    telefono: voluntario?.telefono || "",
    email: voluntario?.email || "",
    talla: voluntario?.talla || "M",
    puestoId: voluntario?.puestoId ?? null,
    rol: voluntario?.rol || "apoyo",
    estado: voluntario?.estado || "pendiente",
    coche: voluntario?.coche ?? false,
    cocheMatricula: voluntario?.cocheMatricula || "",
    cochePlazas: voluntario?.cochePlazas || "",
    notas: voluntario?.notas || "",
    fechaRegistro: voluntario?.fechaRegistro || new Date().toISOString().split("T")[0],
    fechaNacimiento: voluntario?.fechaNacimiento || "",
    telefonoEmergencia: voluntario?.telefonoEmergencia || voluntario?.contactoEmergencia || "",
    alergias: voluntario?.alergias || "",
    medicacion: voluntario?.medicacion || "",
  });
  const [errores, setErrores] = useState({});
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const validar = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = "Requerido";
    if (!form.telefono.trim()) e.telefono = "Requerido";
    if (!form.talla) e.talla = "Requerido";
    if (!form.telefonoEmergencia?.trim()) e.telefonoEmergencia = "Requerido — evento deportivo";
    if (form.fechaNacimiento) {
      const años = Math.floor((new Date() - new Date(form.fechaNacimiento)) / (365.25 * 86400000));
      if (años < 18) e.fechaNacimiento = `Menor de edad (${años} años) — se requiere autorización parental`;
    }
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validar()) return;
    // Guardar en telefonoEmergencia (campo canónico) y limpiar el alias viejo contactoEmergencia
    const { contactoEmergencia: _old, ...rest } = { ...form, puestoId: form.puestoId ? parseInt(form.puestoId) : null };
    onSave({ ...rest, telefonoEmergencia: form.telefonoEmergencia, contactoEmergencia: undefined });
  };

  return (
    <div className={`modal-backdrop${mvClosing ? " modal-backdrop-closing" : ""}`} onClick={e => e.target === e.currentTarget && mvHandleClose()}>
      <div className={`modal modal-ficha${mvClosing ? " modal-closing" : ""}`}>
        <div className="modal-header">
          <span className="modal-title">{voluntario ? "✏️ Editar voluntario" : "➕ Nuevo voluntario"}</span>
          <button className="btn btn-ghost" style={{ padding: "0.2rem 0.5rem" }} onClick={mvHandleClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="modal-body">

          {/* ── SECCIÓN 1: Datos personales ───────────────────────────── */}
          <div className="form-section">
            <div className="form-section-label">👤 Datos personales</div>
            <div style={{display:"flex",flexDirection:"column",gap:".65rem"}}>
              <div>
                <label className="field-label" style={{ color: errores.nombre ? "var(--red)" : undefined }}>Nombre *</label>
                <input ref={firstInputRef} className="inp" value={form.nombre} onChange={e => upd("nombre", e.target.value)} placeholder="Nombre" />
              </div>
              <div>
                <label className="field-label">Apellidos</label>
                <input className="inp" value={form.apellidos || ""} onChange={e => upd("apellidos", e.target.value)} placeholder="Apellidos" />
                {errores.nombre && <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--red)", marginTop: "0.2rem" }}>⚠ {errores.nombre}</div>}
              </div>
              <div className="field-row">
                <div>
                  <label className="field-label" style={{ color: errores.telefono ? "var(--red)" : undefined }}>Teléfono *</label>
                  <input className="inp" value={form.telefono} onChange={e => upd("telefono", e.target.value)} placeholder="612345678" inputMode="tel" />
                  {errores.telefono && <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--red)", marginTop: "0.2rem" }}>⚠ {errores.telefono}</div>}
                </div>
                <div>
                  <label className="field-label">Email</label>
                  <input className="inp" value={form.email} onChange={e => upd("email", e.target.value)} placeholder="correo@email.com" />
                </div>
              </div>
            </div>
          </div>

          {/* ── SECCIÓN 2: Datos operativos ───────────────────────────── */}
          <div className="form-section">
            <div className="form-section-label">🏃 Datos operativos</div>
            <div style={{display:"flex",flexDirection:"column",gap:".65rem"}}>
              <div>
                <label className="field-label" style={{ color: errores.talla ? "var(--red)" : undefined }}>Talla camiseta *</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.3rem" }}>
                  {TALLAS.map(t => (
                    <button key={t} onClick={() => upd("talla", t)}
                      style={{ padding: "0.35rem 0.6rem", borderRadius: 6, border: `1px solid ${form.talla === t ? "var(--cyan)" : "var(--border)"}`, background: form.talla === t ? "var(--cyan-dim)" : "var(--surface2)", color: form.talla === t ? "var(--cyan)" : "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700, cursor: "pointer", transition: "all 0.12s", transform: form.talla === t ? "scale(1.05)" : "scale(1)" }}>
                      {t}
                    </button>
                  ))}
                </div>
                {errores.talla && <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--red)", marginTop: "0.2rem" }}>⚠ {errores.talla}</div>}
              </div>
              <div className="field-row">
                <div>
                  <label className="field-label">Puesto asignado</label>
                  <select className="inp" value={form.puestoId ?? ""} onChange={e => upd("puestoId", e.target.value || null)}>
                    <option value="">Sin asignar</option>
                    {puestos.map(p => {
                      const asig = p.totalAsignados ?? 0;
                      const nec  = p.necesarios ?? 0;
                      const pct  = nec > 0 ? Math.round(asig / nec * 100) : 0;
                      const ico  = pct >= 100 ? "🟢" : pct >= 50 ? "🟡" : "🔴";
                      return (
                        <option key={p.id} value={p.id}>
                          {ico} {p.nombre} · {p.horaInicio}-{p.horaFin} · {asig}/{nec}
                        </option>
                      );
                    })}
                  </select>
                  {form.puestoId && (() => {
                    const p = puestos.find(x => String(x.id) === String(form.puestoId));
                    if (!p) return null;
                    return (
                      <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)",
                        marginTop:".3rem", padding:".3rem .5rem", background:"var(--surface2)", borderRadius:5 }}>
                        🏷 {p.tipo} · {p.distancias?.join(", ")}
                        {p.notas && <> · {p.notas.slice(0, 60)}{p.notas.length > 60 ? "…" : ""}</>}
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <label className="field-label">Rol</label>
                  <select className="inp" value={form.rol} onChange={e => upd("rol", e.target.value)}>
                    <option value="apoyo">Apoyo</option>
                    <option value="responsable">Responsable</option>
                  </select>
                </div>
              </div>
              <div className="field-row">
                <div>
                  <label className="field-label">Estado</label>
                  <select className="inp" value={form.estado} onChange={e => upd("estado", e.target.value)}
                    style={{ color: estadoColor(form.estado), background: estadoBg(form.estado) }}>
                    {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">Fecha de registro</label>
                  <input className="inp" type="date" value={form.fechaRegistro} onChange={e => upd("fechaRegistro", e.target.value)} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "0.65rem 0.85rem" }}>
                <div>
                  <div style={{ fontSize: "var(--fs-base)", fontWeight: 600 }}>Vehículo propio</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>Facilita traslado a puestos</div>
                </div>
                <button className="toggle-pill" style={{ background: form.coche ? "var(--green)" : "var(--surface3)" }} onClick={() => upd("coche", !form.coche)}>
                  <span className="toggle-pill-dot" style={{ left: form.coche ? 23 : 3 }} />
                </button>
              </div>
              {form.coche && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".65rem",
                  padding:".65rem .85rem", background:"rgba(52,211,153,.05)",
                  border:"1px solid rgba(52,211,153,.15)", borderRadius:"var(--r-sm)" }}>
                  <div>
                    <label className="field-label">Matrícula</label>
                    <input className="inp" value={form.cocheMatricula}
                      onChange={e => upd("cocheMatricula", e.target.value.toUpperCase())}
                      placeholder="1234-ABC" maxLength={10} />
                  </div>
                  <div>
                    <label className="field-label">Plazas disponibles</label>
                    <input className="inp" type="number" min={1} max={9} value={form.cochePlazas}
                      onChange={e => upd("cochePlazas", e.target.value)}
                      placeholder="4" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── SECCIÓN 3: Seguridad ───────────────────────────────────── */}
          <div className="form-section">
            <div className="form-section-label">🔒 Seguridad</div>
            <div style={{display:"flex",flexDirection:"column",gap:".65rem"}}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".75rem" }}>
                <div>
                  <label className="field-label">🎂 Fecha de nacimiento</label>
                  <input className="inp" type="date"
                    value={form.fechaNacimiento || ""}
                    onChange={e => upd("fechaNacimiento", e.target.value)} />
                  {form.fechaNacimiento && (() => {
                    const años = Math.floor((new Date() - new Date(form.fechaNacimiento)) / (365.25 * 86400000));
                    const esMenor = años < 18;
                    return <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                      color: esMenor ? "var(--red)" : "var(--text-dim)", marginTop:".2rem",
                      fontWeight: esMenor ? 700 : 400 }}>
                      {esMenor ? `⚠️ ${años} años — menor de edad` : `${años} años`}
                    </div>;
                  })()}
                  {errores.fechaNacimiento && (
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--red)", marginTop:".2rem" }}>
                      ⚠ {errores.fechaNacimiento}
                    </div>
                  )}
                </div>
                <div>
                  <label className="field-label" style={{ color: errores.telefonoEmergencia ? "var(--red)" : undefined }}>
                    🚨 Tel. emergencia *
                  </label>
                  <input className="inp" type="tel"
                    value={form.telefonoEmergencia || ""}
                    onChange={e => upd("telefonoEmergencia", e.target.value)}
                    placeholder="612 345 678"
                    inputMode="tel"
                    style={{ borderColor: errores.telefonoEmergencia ? "var(--red)" : undefined }} />
                  {errores.telefonoEmergencia && (
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)",
                      color:"var(--red)", marginTop:".2rem" }}>⚠ {errores.telefonoEmergencia}</div>
                  )}
                </div>
              </div>
              <div>
                <label className="field-label" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span>📝 Notas / Observaciones</span>
                  {form.notas && <span style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--cyan)",fontWeight:400}}>{form.notas.length} car.</span>}
                </label>
                <textarea className="inp" rows={3} value={form.notas} onChange={e => upd("notas", e.target.value)}
                  placeholder="Experiencia previa, idiomas, titulaciones especiales, restricciones, observaciones del organizador…"
                  style={{ resize: "vertical", fontFamily: "var(--font-display)" }} />
              </div>
              {/* Información médica */}
              <div style={{ background:"rgba(251,191,36,.05)", border:"1px solid rgba(251,191,36,.2)",
                borderRadius:8, padding:".75rem", display:"flex", flexDirection:"column", gap:".6rem" }}>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--amber)",
                  fontWeight:700, textTransform:"uppercase", letterSpacing:".05em" }}>
                  ⚕️ Información médica (seguridad en carrera)
                </div>
                <div>
                  <label className="field-label">⚕️ Alergias conocidas</label>
                  <input className="inp" value={form.alergias||""} onChange={e => upd("alergias", e.target.value)}
                    placeholder="Alimentos, picaduras, medicamentos…" maxLength={200} />
                </div>
                <div>
                  <label className="field-label">💊 Medicación relevante</label>
                  <input className="inp" value={form.medicacion||""} onChange={e => upd("medicacion", e.target.value)}
                    placeholder="Insulina, adrenalina, anticoagulantes…" maxLength={200} />
                </div>
              </div>
            </div>
          </div>

        </div>
        <div className="modal-footer">
          {onEliminar && (
            <button className="btn btn-red" style={{ marginRight:"auto" }} onClick={() => { if(window.confirm("¿Eliminar a "+(form.nombre||"este voluntario")+"?")) onEliminar(); }}>🗑 Eliminar</button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-cyan" onClick={handleSave}>
            {voluntario ? "💾 Guardar cambios" : "➕ Añadir voluntario"}
          </button>
        </div>
      </div>
    </div>
  );
}



// Exports
export { ModalVoluntario };
