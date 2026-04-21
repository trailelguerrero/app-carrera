import { useState, useCallback } from "react";

/**
 * Hook para animar el cierre de un modal antes de desmontarlo.
 * 
 * Uso:
 *   const { closing, handleClose } = useModalClose(onClose);
 *   
 *   <div className={`modal-backdrop${closing ? " modal-backdrop-closing" : ""}`}>
 *     <div className={`modal${closing ? " modal-closing" : ""}`}>
 *       <button onClick={handleClose}>✕</button>
 *     </div>
 *   </div>
 */
export function useModalClose(onClose, delayMs = 175) {
  const [closing, setClosing] = useState(false);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, delayMs);
  }, [onClose, delayMs]);

  return { closing, handleClose };
}
