// Auto-extracted from Voluntarios.jsx — Sprint 2 refactor
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { TALLAS, SHIRT_PLACEHOLDER_FRONT, SHIRT_PLACEHOLDER_BACK, GUIA_TALLAS } from "@/constants/camisetasConstants";
import { createPortal } from "react-dom";
import { toast } from "@/lib/toast";
import { genIdNum } from "@/lib/utils";
import { useModalClose } from "@/hooks/useModalClose";
import EmptyState from "@/components/EmptyState";
import { usePaginacion } from "@/hooks/usePaginacion.jsx";
import { Tooltip, TooltipIcon } from "@/components/common/Tooltip";
import { EVENT_CONFIG_DEFAULT } from "@/constants/eventConfig";
import { blockCls as cls } from "@/lib/blockStyles";

// ─── MODAL CONFIRMAR ──────────────────────────────────────────────────────────
function ModalConfirm({ mensaje, onConfirm, onCancel, zIndex }) {
  return (
    <div className="modal-backdrop" style={zIndex ? { zIndex } : undefined} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 380 }}>
        <div className="modal-body" style={{ paddingTop: "1.5rem", textAlign: "center" }}>
          <div style={{ fontSize: "var(--fs-xl)", marginBottom: "0.75rem" }}>⚠️</div>
          <div style={{ fontWeight: 700, fontSize: "var(--fs-md)", marginBottom: "0.5rem" }}>Confirmar acción</div>
          <div style={{ color: "var(--text-muted)", fontSize: "var(--fs-base)", fontFamily: "var(--font-mono)", lineHeight: 1.5 }}>{mensaje}</div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-red" onClick={onConfirm}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}

// Exports
export { ModalConfirm };
