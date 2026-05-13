/**
 * ImagenUploader.jsx — componente común (extraído de Voluntarios.jsx, CORE-14)
 * Sube, comprime y previsualiza una imagen en base64.
 * Props: label, img, onImg, accent
 */
import { useState } from "react";
import { SHIRT_PLACEHOLDER_FRONT, SHIRT_PLACEHOLDER_BACK } from "@/constants/camisetasConstants";

export function ImagenUploader({ label, img, onImg, accent }) {
  const isPlaceholder = !img || img === SHIRT_PLACEHOLDER_FRONT || img === SHIRT_PLACEHOLDER_BACK;
  const [compressing, setCompressing] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setCompressing(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 900;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL("image/jpeg", 0.75);
        onImg(compressed);
        setCompressing(false);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <label style={{ display: "block", cursor: "pointer", marginBottom: "0.25rem" }}>
      <input type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} disabled={compressing} />
      <div
        style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--surface2)", border: `1px solid ${accent}33`, borderRadius: "var(--radius-sm)", padding: "0.35rem 0.6rem", transition: "all 0.15s" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = accent; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = `${accent}33`; }}>
        {compressing ? (
          <div style={{ width: 24, height: 24, borderRadius: 4, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--fs-sm)", flexShrink: 0 }}>⏳</div>
        ) : !isPlaceholder ? (
          <img src={img} alt={label} style={{ width: 24, height: 24, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
        ) : (
          <div style={{ width: 24, height: 24, borderRadius: 4, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--fs-sm)", flexShrink: 0 }}>📷</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", fontWeight: 700, color: accent }}>{label}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", color: "var(--text-dim)" }}>
            {compressing ? "Comprimiendo…" : !isPlaceholder ? "✓ Imagen cargada" : "Subir imagen"}
          </div>
        </div>
        {!isPlaceholder && (
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); onImg(null); }}
            style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "var(--fs-sm)", flexShrink: 0 }}
            title="Eliminar imagen">✕</button>
        )}
      </div>
    </label>
  );
}
