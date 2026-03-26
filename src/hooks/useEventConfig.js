/**
 * useEventConfig — hook de lectura/escritura de la configuración del evento.
 * Persiste en dataService bajo la clave teg_event_config_v1.
 *
 * Usa useData internamente para aprovechar la carga síncrona desde localStorage,
 * garantizando que config nunca sea null — siempre tiene al menos EVENT_CONFIG_DEFAULT.
 */
import { useMemo, useCallback } from "react";
import dataService, { useData } from "../lib/dataService";
import { EVENT_CONFIG_DEFAULT, LS_KEY_CONFIG } from "../constants/eventConfig";

export const useEventConfig = () => {
  // useData carga síncronamente desde localStorage en el primer render,
  // con EVENT_CONFIG_DEFAULT como fallback — config nunca es null
  const [rawConfig, setRawConfig] = useData(LS_KEY_CONFIG, EVENT_CONFIG_DEFAULT);

  // Merge siempre con defaults para cubrir campos nuevos añadidos en el futuro
  const config = useMemo(() => ({
    ...EVENT_CONFIG_DEFAULT,
    ...(rawConfig && typeof rawConfig === 'object' ? rawConfig : {}),
  }), [rawConfig]);

  const saveConfig = useCallback(async (next) => {
    const merged = { ...EVENT_CONFIG_DEFAULT, ...next };
    setRawConfig(merged);
    await dataService.set(LS_KEY_CONFIG, merged);
  }, [setRawConfig]);

  const updateField = useCallback((key, value) => {
    const merged = { ...config, [key]: value };
    setRawConfig(merged);
    dataService.set(LS_KEY_CONFIG, merged);
  }, [config, setRawConfig]);

  return { config, saveConfig, updateField, loaded: true };
};
