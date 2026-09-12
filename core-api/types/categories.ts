export type CategoryGender = "male" | "female" | "mixed";

/** Nivel de categoría (1 … 8). La etiqueta visible se arma con el sufijo. */
export type CategoryLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/**
 * kind=level → una sola categoría de nivel (ej. 6ta masculina).
 * kind=suma → pareja cuya suma de niveles = sumaTarget (ej. 7+5 o 6+6 = 12).
 */
export type CategoryKind = "level" | "suma";

export const CATEGORY_LEVELS: CategoryLevel[] = [1, 2, 3, 4, 5, 6, 7, 8];

/**
 * Terminaciones ordinales por categoría.
 * Uso: `${level}${CATEGORY_LEVEL_SUFFIX[level]}` → "1ra", "2da", …
 */
export const CATEGORY_LEVEL_SUFFIX: Record<CategoryLevel, string> = {
  1: "ra",
  2: "da",
  3: "ra",
  4: "ta",
  5: "ta",
  6: "ta",
  7: "ma",
  8: "va",
};

/** Etiqueta de UI: 6 → "6ta". */
export function formatCategoryLevel(level: CategoryLevel): string {
  return `${level}${CATEGORY_LEVEL_SUFFIX[level]}`;
}

export function isCategoryLevel(value: unknown): value is CategoryLevel {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 8
  );
}

/**
 * Acepta número (1–8) o etiqueta legacy ("6ta", "7ma") y normaliza a CategoryLevel.
 */
export function parseCategoryLevel(value: unknown): CategoryLevel | null {
  if (isCategoryLevel(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    const asNumber = Number(trimmed);
    if (isCategoryLevel(asNumber)) return asNumber;
    const match = /^([1-8])(?:ra|da|ta|ma|va)?$/i.exec(trimmed);
    if (match) {
      const n = Number(match[1]);
      if (isCategoryLevel(n)) return n;
    }
  }
  return null;
}

/** Motivo de un cambio en la categoría oficial del jugador. */
export type PlayerCategoryChangeReason =
  | "initial"
  | "self_update"
  | "club_override"
  | "auto_promotion"
  | "auto_demotion"
  | "inactivity";

export type PlayerCategoryChangeActor = "system" | "player" | "club";

/** Entrada del historial de categoría del jugador. */
export interface PlayerCategoryHistoryEntry {
  id: string;
  level: CategoryLevel;
  previousLevel: CategoryLevel | null;
  reason: PlayerCategoryChangeReason;
  at: string;
  by: PlayerCategoryChangeActor;
}
