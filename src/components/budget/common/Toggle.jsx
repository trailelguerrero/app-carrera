import React from "react";
import { cls } from "../../../lib/budgetUtils";

export const Toggle = ({ value, onChange, className = "" }) => (
  <button
    className={cls("toggle-btn", value && "active", className)}
    onClick={() => onChange(!value)}
    type="button"
  >
    <div className="toggle-thumb" />
  </button>
);
