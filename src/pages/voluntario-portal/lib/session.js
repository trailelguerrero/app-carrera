import { SK_VOL_SESSION } from "@/constants/storageKeys";

export const API_BASE   = "/api/voluntarios";
export const PUBLIC_API = "/api/data/public";
export const SESSION_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

// C4: sessionToken migrado de localStorage a sessionStorage [F4-03]
// sessionStorage no persiste entre pestañas → mitiga robo de token por XSS
export function loadSession() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(SK_VOL_SESSION) || "null");
    if (!raw) return null;
    if (raw.ts && Date.now() - raw.ts > SESSION_TTL) { sessionStorage.removeItem(SK_VOL_SESSION); return null; }
    return raw;
  } catch { return null; }
}

export function saveSession(data) {
  sessionStorage.setItem(SK_VOL_SESSION, JSON.stringify({ ...data, ts: Date.now() }));
}

export function clearSession() {
  sessionStorage.removeItem(SK_VOL_SESSION);
}

export async function fetchPublic(collection) {
  try {
    const res = await fetch(`${PUBLIC_API}?collection=${collection}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}
