/** Cupo del torneo puntuable. Se controla al inscribir, no al armar el ranking. */
export const SCORING_MIN_PAIRS = 16;
export const SCORING_MAX_PAIRS = 32;

export function clampScoringMaxPairs(value: number): number {
  if (!Number.isFinite(value)) return SCORING_MAX_PAIRS;
  return Math.min(SCORING_MAX_PAIRS, Math.max(SCORING_MIN_PAIRS, Math.trunc(value)));
}
