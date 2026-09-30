/** Lado de cancha del jugador. En la UI se muestra traducido. */
export const PLAYER_SIDE_PREFERENCES = ["left", "right", "both"] as const;

export type PlayerSidePreference = (typeof PLAYER_SIDE_PREFERENCES)[number];

export const PLAYER_SIDE_PREFERENCE_LABELS: Record<PlayerSidePreference, string> = {
  left: "Izquierda",
  right: "Derecha",
  both: "Ambos",
};

export const PLAYER_SIDE_PREFERENCE_OPTIONS = PLAYER_SIDE_PREFERENCES.map((value) => ({
  value,
  label: PLAYER_SIDE_PREFERENCE_LABELS[value],
}));

export function isPlayerSidePreference(value: unknown): value is PlayerSidePreference {
  return (
    value === "left" || value === "right" || value === "both"
  );
}

/** Etiqueta en español. Null si no hay preferencia. */
export function playerSidePreferenceLabel(
  value: string | null | undefined,
): string | null {
  return isPlayerSidePreference(value) ? PLAYER_SIDE_PREFERENCE_LABELS[value] : null;
}
