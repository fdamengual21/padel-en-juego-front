/** Instancia alcanzada (códigos de la API). */
export type AwardRound =
  | "champion"
  | "final"
  | "semi"
  | "quarter"
  | "roundOf16"
  | "roundOf32"
  | "group";

/** Zona en la que quedó la pareja (fase de grupos). */
export interface PairZoneResult {
  groupId: string;
  name: string;
  position: number;
  qualified: boolean;
}

/** Resultado final de una pareja en la categoría. */
export interface PairResult {
  pairId: string;
  round: AwardRound;
  zone: PairZoneResult | null;
  repechagePosition: number | null;
  points: number | null;
}

/** JSON de GET .../categories/{id}/results (club y público). */
export interface CategoryResults {
  categoryId: string;
  finished: boolean;
  scoring: boolean;
  rankingCircuitId: string | null;
  items: PairResult[];
}
