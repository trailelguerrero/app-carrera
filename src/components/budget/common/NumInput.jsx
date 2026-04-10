import React from "react";
import { cls } from "../../../lib/budgetUtils";

export const NumInput = ({ value, onChange, step = 1, small = false, className = "", disabled = false }) => (
  <input
    type="number"
    className={cls("num-input", small && "num-input-sm", className)}
    value={value}
    step={step}
    disabled={disabled}
    onChange={(e) => !disabled && onChange(parseFloat(e.target.value) || 0)}
    onFocus={(e) => e.target.select()}
    style={disabled ? { opacity: 0.35, cursor: "not-allowed", pointerEvents: "none" } : undefined}
  />
);
