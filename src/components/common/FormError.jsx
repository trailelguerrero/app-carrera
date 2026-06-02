/**
 * FormError — mensaje de error de validación de formulario.
 *
 * Unifica los tres patrones que existían en la app:
 *   1. <div className="mono xs" style={{color:"#f87171"}}>⚠ texto</div>   (Proyecto)
 *   2. <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--fs-xs)",color:"var(--red)"}}>⚠ texto</div>  (Voluntarios)
 *   3. <div className="xs mono" style={{color:"var(--red)"}}>⚠ texto</div>  (Camisetas)
 *
 * Uso:
 *   <FormError msg={errores.nombre} />
 *   <FormError msg="El campo es obligatorio" />
 *   // Cuando msg es falsy, no renderiza nada.
 */
export const FormError = ({ msg }) => {
  if (!msg) return null;
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "var(--fs-xs)",
        color: "var(--red)",
        marginTop: "0.2rem",
        lineHeight: 1.4,
      }}
    >
      ⚠ {msg}
    </div>
  );
};

export default FormError;
