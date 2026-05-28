/**
 * useDocumentosPublic.js — Mejora 4: Contrato público del módulo Documentos
 *
 * Ventanilla oficial del módulo Documentos para consumidores externos.
 *
 * REGLA: Los consumidores externos (Dashboard, SemaforoRiesgos)
 *        SOLO leen datos de documentos a través de este hook.
 *
 * @module useDocumentosPublic
 */
import { useMemo } from "react";
import { useData } from "@/hooks/useData";
import {
  SK_DOC_DOCS,
  SK_DOC_GESTIONES,
} from "@/constants/storageKeys";

/**
 * @typedef {object} DocumentosPublic
 * @property {object[]} documentos          - Lista completa de documentos (solo lectura)
 * @property {object[]} gestiones           - Lista completa de gestiones legales (solo lectura)
 * @property {object[]} docsVencidos        - Docs vencidos y no aprobados
 * @property {object[]} docsProxVencer      - Docs que vencen en ≤30 días
 * @property {object[]} gestionesDenegadas  - Gestiones con estado "denegado"
 * @property {object[]} gestionesVencidas   - Gestiones vencidas y no aprobadas
 * @property {object[]} gestionesUrgentes   - Gestiones que vencen en ≤30 días
 * @property {boolean}  loaded
 */

/**
 * Calcula los días hasta una fecha ISO.
 * @param {string|undefined} iso
 * @returns {number|null}
 */
function diasHasta(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(iso) - new Date()) / 86400000);
}

/**
 * Hook público del módulo Documentos.
 *
 * @returns {DocumentosPublic}
 */
export function useDocumentosPublic() {
  const [documentos] = useData(SK_DOC_DOCS,      []);
  const [gestiones]  = useData(SK_DOC_GESTIONES, []);

  return useMemo(() => {
    const safeDocs  = Array.isArray(documentos) ? documentos : [];
    const safeGests = Array.isArray(gestiones)  ? gestiones  : [];

    const docsVencidos = safeDocs.filter(d => {
      const dias = diasHasta(d.fechaVencimiento);
      return dias !== null && dias < 0 && d.estado !== "aprobado";
    });

    const docsProxVencer = safeDocs.filter(d => {
      const dias = diasHasta(d.fechaVencimiento);
      return dias !== null && dias >= 0 && dias <= 30 && d.estado !== "aprobado";
    });

    const gestionesDenegadas = safeGests.filter(g => g.estado === "denegado");

    const gestionesVencidas = safeGests.filter(g => {
      const dias = diasHasta(g.fechaVencimiento);
      return (
        dias !== null && dias < 0 &&
        g.estado !== "aprobado" &&
        g.estado !== "denegado"
      );
    });

    const gestionesUrgentes = safeGests.filter(g => {
      const dias = diasHasta(g.fechaVencimiento);
      return dias !== null && dias >= 0 && dias <= 30 && g.estado !== "aprobado";
    });

    return {
      documentos:         safeDocs,
      gestiones:          safeGests,
      docsVencidos,
      docsProxVencer,
      gestionesDenegadas,
      gestionesVencidas,
      gestionesUrgentes,
      loaded: true,
    };
  }, [documentos, gestiones]);
}
