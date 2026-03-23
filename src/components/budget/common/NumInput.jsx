import React from "react";
import { cls } from "../../../lib/budgetUtils";

export const NumInput = ({ value, onChange, step = 1, small = false, className = "" }) => (
  <input
    type="number"
    className={cls("num-input", small && "num-input-sm", className)}
    value={value}
    step={step}
    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
    onFocus={(e) => e.target.select()}
  />
);
