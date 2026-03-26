/**
 * useEventConfig — hook de lectura/escritura de la configuración del evento.
 * Persiste en dataService bajo la clave teg_event_config_v1.
 * Hace merge con los defaults para que nuevos campos añadidos en el futuro
 * aparezcan automáticamente sin romper configuraciones guardadas.
 */
import { useState, useEffect, useCallback } from "react";
import dataService from "../lib/dataService";
import { EVENT_CONFIG_DEFAULT, LS_KEY_CONFIG } from "../constants/eventConfig";

export const useEventConfig = () => {
  const [config, setConfigState] = useState(EVENT_CONFIG_DEFAULT);
  const [loaded, setLoaded]      = useState(false);

  useEffect(() => {
    dataService.get(LS_KEY_CONFIG, null).then(saved => {
      if (saved) {
        // Merge: los defaults cubren campos nuevos no presentes en versiones antiguas
        setConfigState({ ...EVENT_CONFIG_DEFAULT, ...saved });
      }
      setLoaded(true);
    });
  }, []);

  const saveConfig = useCallback(async (next) => {
    const merged = { ...EVENT_CONFIG_DEFAULT, ...next };
    setConfigState(merged);
    await dataService.set(LS_KEY_CONFIG, merged);
  }, []);

  const updateField = useCallback((key, value) => {
    setConfigState(prev => {
      const next = { ...prev, [key]: value };
      dataService.set(LS_KEY_CONFIG, next);
      return next;
    });
  }, []);

  return { config, saveConfig, updateField, loaded };
};
