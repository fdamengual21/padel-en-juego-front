import type { Match, MatchRules } from "@/domain";

/** Tab Partidos público. */
export interface PublicMatchesBoard {
  categoryId: string;
  generatedAt: string;
  groupMatches: Match[];
  elimMatches: Match[];
  pairLabels: Record<string, string>;
  courtLabels: Record<string, string>;
  matchRules: MatchRules;
  notice: string | null;
}
