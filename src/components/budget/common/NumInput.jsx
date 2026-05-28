import React, { useState, useEffect, useRef, useCallback } from "react";
import { cls } from "../../../lib/budgetUtils";

// MEJORA-08: NumInput con debounce de 300ms.
// El valor local se actualiza inmediatamente (el usuario ve lo que escribe),
// pero el recálculo de la cadena de presupuesto solo se dispara 300ms después
// de que el usuario deje de pulsar teclas.
// Cuando el prop `value` cambia desde fuera (autosave, escenarios), se sincroniza
// siempre que el input no tenga el foco — evita sobreescribir lo que el usuario escribe.
export const NumInput = ({ value, onChange, step = 1, small = false, className = "", disabled = false }) => {
  const [localValue, setLocalValue] = useState(value);
  const debounceTimer = useRef(null);
  const isFocused = useRef(false);

  // Sincronizar valor externo solo cuando el input no tiene el foco
  useEffect(() => {
    if (!isFocused.current) {
      setLocalValue(value);
    }
  }, [value]);

  const handleChange = useCallback((e) => {
    if (disabled) return;
    const raw = e.target.value;
    setLocalValue(raw); // actualización visual inmediata

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      onChange(parseFloat(raw) || 0);
    }, 300);
  }, [disabled, onChange]);

  // Al perder el foco: disparar inmediatamente si hay un timer pendiente
  const handleBlur = useCallback(() => {
    isFocused.current = false;
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
      onChange(parseFloat(localValue) || 0);
    }
  }, [onChange, localValue]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  return (
    <input
      type="number"
      className={cls("num-input", small && "num-input-sm", className)}
      value={localValue}
      step={step}
      disabled={disabled}
      onChange={handleChange}
      onFocus={(e) => { isFocused.current = true; e.target.select(); }}
      onBlur={handleBlur}
      style={disabled ? { opacity: 0.35, cursor: "not-allowed", pointerEvents: "none" } : undefined}
    />
  );
};
