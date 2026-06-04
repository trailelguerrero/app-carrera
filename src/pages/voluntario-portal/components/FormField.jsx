export function FormField({ label, error, hint, children }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:".5rem" }}>
      <label style={{ fontFamily:"var(--font-display)", fontSize:"var(--fs-sm)", fontWeight:700,
        color:error?"var(--red)":"var(--text)" }}>{label}</label>
      {hint && <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--text-muted)", marginTop:"-.2rem", lineHeight:1.6 }}>{hint}</div>}
      {children}
      {error && <div style={{ fontFamily:"var(--font-mono)", fontSize:"var(--fs-xs)", color:"var(--red)", fontWeight:700 }}>⚠ {error}</div>}
    </div>
  );
}
