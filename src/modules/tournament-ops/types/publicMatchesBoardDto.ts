import type { Match, MatchRules } from "@/domain";

/** JSON de GET .../boards/matches público. */
export interface PublicMatchesBoardDto {
  categoryId: string;
  generatedAt: string;
  groupMatches: Match[];
  elimMatches: Match[];
  pairLabels: Record<string, string>;
  courtLabels: Record<string, string>;
  matchRules: MatchRules;
  notice: string | null;
}
