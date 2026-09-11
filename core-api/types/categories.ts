export type CategoryGender = "male" | "female" | "mixed";

/** Categorías fijas por nivel (1ª … 8ª). */
export type CategoryLevelCode =
  | "1ra"
  | "2da"
  | "3ra"
  | "4ta"
  | "5ta"
  | "6ta"
  | "7ma"
  | "8va";

/**
 * kind=level → una sola categoría de nivel (ej. 6ta masculina).
 * kind=suma → pareja cuya suma de niveles = sumaTarget (ej. 7ma+5ta o 6ta+6ta = 12).
 */
export type CategoryKind = "level" | "suma";

export const CATEGORY_LEVELS: CategoryLevelCode[] = [
  "1ra",
  "2da",
  "3ra",
  "4ta",
  "5ta",
  "6ta",
  "7ma",
  "8va",
];

/** Valor numérico para validar suma (1ra=1 … 8va=8). */
export const CATEGORY_LEVEL_VALUE: Record<CategoryLevelCode, number> = {
  "1ra": 1,
  "2da": 2,
  "3ra": 3,
  "4ta": 4,
  "5ta": 5,
  "6ta": 6,
  "7ma": 7,
  "8va": 8,
};
