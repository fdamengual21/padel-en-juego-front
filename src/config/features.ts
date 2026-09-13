/**
 * Feature flags globales (Vite env).
 * Convención: `VITE_FEATURE_<NAME>=true|false`
 * Default: todas en true salvo Ranking.
 */

function envFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || String(value).trim() === "") return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
}

export const FEATURES = {
  /** Inicio del jugador (feed torneos/reservas) */
  home: envFlag(import.meta.env.VITE_FEATURE_HOME, true),
  /** Torneos (jugador y club) */
  tournaments: envFlag(import.meta.env.VITE_FEATURE_TOURNAMENTS, true),
  /** Ranking (off por default) */
  ranking: envFlag(import.meta.env.VITE_FEATURE_RANKING, false),
  /** Historial del jugador */
  history: envFlag(import.meta.env.VITE_FEATURE_HISTORY, true),
  /** Perfil del jugador (resumen + cuenta) */
  profile: envFlag(import.meta.env.VITE_FEATURE_PROFILE, true),
  /** Dashboard club */
  clubDashboard: envFlag(import.meta.env.VITE_FEATURE_CLUB_DASHBOARD, true),
  /** Clientes del club */
  clients: envFlag(import.meta.env.VITE_FEATURE_CLIENTS, true),
  /** Canchas (incluye agenda de reservas) */
  courts: envFlag(import.meta.env.VITE_FEATURE_COURTS, true),
  /** Configuración del club */
  clubSettings: envFlag(import.meta.env.VITE_FEATURE_CLUB_SETTINGS, true),
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isFeatureEnabled(feature: FeatureKey): boolean {
  return FEATURES[feature];
}

export function filterByFeature<T extends { feature?: FeatureKey }>(
  items: readonly T[],
): T[] {
  return items.filter((item) => {
    if (!item.feature) return true;
    return isFeatureEnabled(item.feature);
  });
}
