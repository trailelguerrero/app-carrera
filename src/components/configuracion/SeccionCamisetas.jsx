export function SeccionCamisetas({ imgFront, imgBack, imgGuia, imgPreviews, imgError, imgSaving, handleImgFile, handleImgRemove }) {
  const slots = [
    { slot: "front", label: "Camiseta delantera", stored: imgFront },
    { slot: "back",  label: "Camiseta trasera",   stored: imgBack  },
    { slot: "guia",  label: "Guía de tallas",     stored: imgGuia  },
  ];

  return (
    <div className="card cfg-section">
      <div className="cfg-section-title">👕 Imágenes de camisetas</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.6 }}>
        Estas imágenes se muestran en el portal de voluntarios al elegir talla.<br />
        Formatos: JPEG, PNG, WEBP · Máximo 500 KB por imagen.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {slots.map(({ slot, label, stored }) => {
          const preview = imgPreviews[slot] || stored;
          const error   = imgError[slot];
          const saving  = imgSaving[slot];
          return (
            <div key={slot} style={{ display: "flex", gap: "1rem", alignItems: "flex-start", padding: ".85rem", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <div style={{ width: 80, height: 80, flexShrink: 0, borderRadius: 8, background: "var(--surface3)", border: "1px solid var(--border)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {preview ? <img src={preview} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: "1.6rem", opacity: 0.4 }}>🖼️</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--text)", marginBottom: ".3rem" }}>{label}</div>
                {error && <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--red)", marginBottom: ".4rem" }}>⚠️ {error}</div>}
                <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                  <label className="backup-btn export" style={{ cursor: "pointer", padding: ".38rem .75rem", fontSize: "var(--fs-sm)" }}>
                    {saving ? "⏳ Guardando…" : preview ? "🔄 Cambiar" : "📂 Subir imagen"}
                    <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleImgFile(slot)} />
                  </label>
                  {preview && (
                    <button className="backup-btn" style={{ padding: ".38rem .75rem", fontSize: "var(--fs-sm)", background: "var(--surface3)", color: "var(--text-muted)", border: "1px solid var(--border)" }} onClick={() => handleImgRemove(slot)}>
                      🗑 Eliminar
                    </button>
                  )}
                </div>
                {stored && !imgPreviews[slot] && (
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)", marginTop: ".3rem" }}>✓ Imagen guardada</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
