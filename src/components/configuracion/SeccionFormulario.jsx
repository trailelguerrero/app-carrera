export function SeccionFormulario({
  form, upd,
  urlFormulario, qrDataUrl, setQrDataUrl, qrGenerando, generarQR,
  opcionPuesto,     setOpcionPuesto,
  opcionVehiculo,   setOpcionVehiculo,
  opcionEmail,      setOpcionEmail,
  opcionEmergencia, setOpcionEmergencia,
}) {
  return (
    <div id="cfg-formulario" className="card cfg-section">
      <div className="cfg-section-title">👥 Formulario de voluntarios</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", marginBottom: ".75rem", lineHeight: 1.6 }}>
        Comparte este enlace o QR con los voluntarios para que puedan registrarse.
      </div>
      <div style={{ display: "flex", gap: ".5rem", alignItems: "stretch", marginBottom: ".75rem" }}>
        <input className="cfg-input" readOnly value={urlFormulario} style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--cyan)", cursor: "text" }} />
        <button className="backup-btn export" style={{ flexShrink: 0, padding: ".45rem .85rem" }}
          onClick={() => { navigator.clipboard?.writeText(urlFormulario).then(() => { const btn = document.activeElement; const prev = btn.textContent; btn.textContent = "✓ Copiado"; setTimeout(() => { btn.textContent = prev; }, 1500); }); }}>
          📋 Copiar enlace
        </button>
        <button className="backup-btn export" style={{ flexShrink: 0, padding: ".45rem .85rem" }} onClick={generarQR} disabled={qrGenerando}>
          {qrGenerando ? "⏳" : "🔲 QR"}
        </button>
      </div>

      {qrDataUrl && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: ".65rem", padding: ".85rem", background: "var(--surface2)", borderRadius: 10, border: "1px solid var(--border)", marginBottom: ".75rem" }}>
          <img src={qrDataUrl} alt="QR formulario voluntarios" style={{ width: 200, height: 200, borderRadius: 8, border: "4px solid #fff", display: "block" }} />
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", textAlign: "center" }}>Escanea para acceder al formulario de registro</div>
          <div style={{ display: "flex", gap: ".5rem" }}>
            <a href={qrDataUrl} download="qr-voluntarios-trail-guerrero.png" className="backup-btn export" style={{ textDecoration: "none", padding: ".38rem .75rem", fontSize: "var(--fs-sm)" }}>⬇ Descargar imagen</a>
            <button className="backup-btn" style={{ padding: ".38rem .75rem", fontSize: "var(--fs-sm)", background: "var(--surface3)", color: "var(--text-muted)", border: "1px solid var(--border)" }} onClick={() => setQrDataUrl(null)}>✕ Cerrar QR</button>
          </div>
        </div>
      )}

      {/* Campos opcionales */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: ".85rem", marginTop: ".25rem" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: ".65rem" }}>Campos opcionales</div>
        <div style={{ display: "flex", flexDirection: "column", gap: ".45rem" }}>
          {[
            { label: "Puesto preferido",    desc: "El voluntario puede indicar en qué puesto quiere trabajar",      val: opcionPuesto,     set: setOpcionPuesto     },
            { label: "Vehículo propio",      desc: "Pregunta si dispone de coche para llegar a puestos remotos",    val: opcionVehiculo,   set: setOpcionVehiculo   },
            { label: "Email",                desc: "Campo opcional de correo para comunicaciones previas",           val: opcionEmail,      set: setOpcionEmail      },
            { label: "Teléfono emergencia",  desc: "Contacto a avisar en caso de incidente el día del evento",      val: opcionEmergencia, set: setOpcionEmergencia },
          ].map(({ label, desc, val, set }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: ".55rem .75rem", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", gap: ".75rem" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--text)" }}>{label}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", marginTop: ".1rem" }}>{desc}</div>
              </div>
              <button className={`btn btn-sm ${val ? "btn-cyan" : "btn-ghost"}`} style={{ minWidth: 72, flexShrink: 0 }} onClick={() => set(!val)}>
                {val ? "Activo" : "Inactivo"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Textos del formulario */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: ".85rem", marginTop: ".75rem" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: ".65rem" }}>Textos del formulario</div>
        <div style={{ display: "flex", flexDirection: "column", gap: ".65rem" }}>
          <div className="cfg-field">
            <label className="cfg-label">Subtítulo del formulario</label>
            <input className="cfg-input" value={form.formSubtitulo ?? "Formulario de inscripción de voluntarios"} onChange={e => upd("formSubtitulo", e.target.value)} placeholder="Formulario de inscripción de voluntarios" />
            <div className="cfg-hint">Aparece bajo el nombre del evento en la cabecera del formulario.</div>
          </div>
          <div className="cfg-field">
            <label className="cfg-label">Texto del botón de envío</label>
            <input className="cfg-input" value={form.formBoton ?? "✓ Registrarme como voluntario"} onChange={e => upd("formBoton", e.target.value)} placeholder="✓ Registrarme como voluntario" />
          </div>
          <div className="cfg-field">
            <label className="cfg-label">Mensaje de confirmación (tras el registro)</label>
            <textarea className="cfg-input" rows={3} value={form.formConfirmacion ?? "Gracias por apuntarte como voluntario. El equipo organizador se pondrá en contacto contigo próximamente."} onChange={e => upd("formConfirmacion", e.target.value)} placeholder="Mensaje que verá el voluntario tras completar el registro…" style={{ resize: "vertical", lineHeight: 1.6 }} />
            <div className="cfg-hint">Visible en la pantalla de confirmación tras el envío del formulario.</div>
          </div>
        </div>
      </div>

      {/* Día de la carrera (PORTAL-03) */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: ".85rem", marginTop: ".75rem" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: ".35rem" }}>🏁 Día de la carrera</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", marginBottom: ".65rem", lineHeight: 1.6 }}>Estos datos aparecen automáticamente en el portal del voluntario 7 días antes del evento.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: ".65rem" }}>
          <div className="cfg-field">
            <label className="cfg-label">Hora de concentración</label>
            <input className="cfg-input" type="time" value={form.concentracionHora ?? ""} onChange={e => upd("concentracionHora", e.target.value)} placeholder="07:00" />
            <div className="cfg-hint">Hora a la que los voluntarios deben estar en el punto de encuentro.</div>
          </div>
          <div className="cfg-field">
            <label className="cfg-label">Punto de encuentro</label>
            <input className="cfg-input" value={form.concentracionLugar ?? ""} onChange={e => upd("concentracionLugar", e.target.value)} placeholder="Ej: Carpa de organización junto a la línea de salida" />
            <div className="cfg-hint">Lugar exacto donde deben concentrarse los voluntarios al llegar.</div>
          </div>
          <div className="cfg-field">
            <label className="cfg-label">Instrucciones generales</label>
            <textarea className="cfg-input" rows={3} value={form.instruccionesGenerales ?? ""} onChange={e => upd("instruccionesGenerales", e.target.value)} placeholder="Ej: Llega 15 min antes de tu turno. Recoge tu peto identificativo en la carpa de organización." style={{ resize: "vertical", lineHeight: 1.6 }} />
            <div className="cfg-hint">Texto libre visible en el portal del voluntario.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
