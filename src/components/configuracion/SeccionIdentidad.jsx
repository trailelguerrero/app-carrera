export function SeccionIdentidad({ form, upd, fechaEvento, diasRestantes }) {
  return (
    <>
      <div className="card cfg-section">
        <div className="cfg-section-title">🏔️ Identidad del evento</div>
        <div className="cfg-grid">
          <div className="cfg-field cfg-field-full">
            <label className="cfg-label">Nombre del evento</label>
            <input className="cfg-input" value={form.nombre} onChange={e => upd("nombre", e.target.value)} placeholder="Ej: Trail del Pirineo" />
          </div>
          <div className="cfg-field">
            <label className="cfg-label">Edición / Año</label>
            <input className="cfg-input" value={form.edicion} onChange={e => upd("edicion", e.target.value)} placeholder="2026" />
          </div>
          <div className="cfg-field">
            <label className="cfg-label">Fecha del evento</label>
            <input className="cfg-input" type="date" value={form.fecha} onChange={e => upd("fecha", e.target.value)} />
            {diasRestantes !== null && (
              <div className="cfg-hint">
                {diasRestantes > 0 ? `${diasRestantes} días hasta la carrera` : diasRestantes === 0 ? "¡La carrera es hoy!" : `La carrera fue hace ${Math.abs(diasRestantes)} días`}
              </div>
            )}
          </div>
          <div className="cfg-field">
            <label className="cfg-label">Lugar</label>
            <input className="cfg-input" value={form.lugar} onChange={e => upd("lugar", e.target.value)} placeholder="Ej: Candeleda" />
          </div>
          <div className="cfg-field">
            <label className="cfg-label">Provincia / Región</label>
            <input className="cfg-input" value={form.provincia} onChange={e => upd("provincia", e.target.value)} placeholder="Ej: Ávila" />
          </div>
          <div className="cfg-field">
            <label className="cfg-label">Organizador</label>
            <input className="cfg-input" value={form.organizador} onChange={e => upd("organizador", e.target.value)} placeholder="Ej: Club Trail El Guerrero" />
          </div>
          <div className="cfg-field">
            <label className="cfg-label">Email de contacto</label>
            <input className="cfg-input" type="email" value={form.emailContacto || ""} onChange={e => upd("emailContacto", e.target.value)} placeholder="info@trailelguerrero.es" />
          </div>
          <div className="cfg-field">
            <label className="cfg-label">Teléfono de contacto</label>
            <input className="cfg-input" type="tel" value={form.telefonoContacto || ""} onChange={e => upd("telefonoContacto", e.target.value)} placeholder="+34 600 000 000" />
          </div>
          <div className="cfg-field" style={{ gridColumn: "1/-1" }}>
            <label className="cfg-label" style={{ color: "var(--cyan)", fontSize: ".72rem", fontWeight: 800 }}>
              👥 Contactos visibles para los voluntarios en su portal
            </label>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: ".65rem", lineHeight: 1.7, background: "rgba(34,211,238,.05)", padding: ".5rem .75rem", borderRadius: 8, borderLeft: "2px solid var(--cyan)" }}>
              💡 Los voluntarios verán estos nombres y teléfonos en la sección "📞 Contacto organizadores" de su ficha personal.
            </div>
            {(form.organizadores || []).length === 0 && (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--amber)", padding: ".4rem .75rem", borderRadius: 6, background: "var(--amber-dim)", border: "1px solid var(--amber-border)", marginBottom: ".5rem" }}>
                ⚠ Sin contactos configurados — los voluntarios no verán a quién llamar
              </div>
            )}
            {(form.organizadores || []).map((org, i) => (
              <div key={i} style={{ display: "flex", gap: ".4rem", marginBottom: ".4rem", alignItems: "center", flexWrap: "wrap" }}>
                <input className="cfg-input" style={{ flex: "2 1 120px", minWidth: 100 }} placeholder="Nombre" value={org.nombre || ""} onChange={e => { const arr = [...(form.organizadores || [])]; arr[i] = { ...arr[i], nombre: e.target.value }; upd("organizadores", arr); }} />
                <input className="cfg-input" style={{ flex: "2 1 120px", minWidth: 100 }} placeholder="Teléfono" type="tel" value={org.telefono || ""} onChange={e => { const arr = [...(form.organizadores || [])]; arr[i] = { ...arr[i], telefono: e.target.value }; upd("organizadores", arr); }} />
                <input className="cfg-input" style={{ flex: "3 1 150px", minWidth: 120 }} placeholder="Email (opcional)" type="email" value={org.email || ""} onChange={e => { const arr = [...(form.organizadores || [])]; arr[i] = { ...arr[i], email: e.target.value }; upd("organizadores", arr); }} />
                <button className="btn btn-red btn-sm" style={{ flexShrink: 0, padding: ".25rem .5rem" }} onClick={() => { const arr = [...(form.organizadores || [])]; arr.splice(i, 1); upd("organizadores", arr); }}>✕</button>
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" style={{ marginTop: ".3rem" }} onClick={() => upd("organizadores", [...(form.organizadores || []), { nombre: "", telefono: "", email: "" }])}>
              + Añadir organizador
            </button>
          </div>
          <div className="cfg-field">
            <label className="cfg-label">Web del evento</label>
            <input className="cfg-input" type="url" value={form.webEvento || ""} onChange={e => upd("webEvento", e.target.value)} placeholder="https://trailelguerrero.es" />
          </div>
        </div>
      </div>

      <div className="card cfg-section">
        <div className="cfg-section-title">⏱️ Umbrales de alerta de voluntarios</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.6 }}>
          Define cuándo se activan las alertas de cobertura de voluntarios en el Dashboard.
        </div>
        <div className="cfg-threshold-row">
          <div className="cfg-threshold-label">
            <div className="cfg-threshold-name" style={{ color: "var(--red)" }}>🔴 Alerta crítica</div>
            <div className="cfg-threshold-desc">Puestos sin cubrir generan alerta roja. Acción inmediata requerida.</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexShrink: 0 }}>
            <input type="number" min={1} max={365} className="cfg-input cfg-input-num" value={form.volDiasCritico} onChange={e => upd("volDiasCritico", Math.max(1, parseInt(e.target.value) || 1))} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>días antes</span>
          </div>
        </div>
        <div className="cfg-threshold-row">
          <div className="cfg-threshold-label">
            <div className="cfg-threshold-name" style={{ color: "var(--amber)" }}>🟡 Aviso</div>
            <div className="cfg-threshold-desc">Puestos sin cubrir generan aviso amarillo.</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexShrink: 0 }}>
            <input type="number" min={1} max={365} className="cfg-input cfg-input-num" value={form.volDiasAviso} onChange={e => upd("volDiasAviso", Math.max((form.volDiasCritico || 1) + 1, parseInt(e.target.value) || 1))} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>días antes</span>
          </div>
        </div>
        {fechaEvento && (
          <div style={{ marginTop: "1rem", padding: ".75rem .85rem", background: "var(--surface2)", borderRadius: 8, border: "1px solid var(--border)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: ".5rem", textTransform: "uppercase", letterSpacing: ".06em" }}>Ventanas de alerta</div>
            {[
              { label: "Sin alertas",    color: "var(--green)", desde: "Hoy",                         hasta: `${form.volDiasAviso}d antes` },
              { label: "Aviso amarillo", color: "var(--amber)", desde: `${form.volDiasAviso}d antes`, hasta: `${form.volDiasCritico}d antes` },
              { label: "Alerta roja",    color: "var(--red)",   desde: `${form.volDiasCritico}d antes`, hasta: "Día carrera" },
            ].map(w => (
              <div key={w.label} style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: ".3rem" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: w.color, flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: w.color, fontWeight: 700, width: 110 }}>{w.label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)" }}>{w.desde} → {w.hasta}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
