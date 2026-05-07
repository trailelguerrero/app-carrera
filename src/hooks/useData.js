/**
 * useData.js — T4.2
 * Hook React para sincronización con dataService.
 * Separado de dataService.js (INC-ORG-04: los hooks no deben vivir en lib/).
 *
 * Importar desde aquí en código nuevo:
 *   import { useData, saveAll } from "@/hooks/useData";
 *
 * Los imports anteriores desde "@/lib/dataService" siguen funcionando
 * (dataService.js re-exporta para compatibilidad hacia atrás).
 */
export { useData, saveAll } from "@/lib/dataService";
