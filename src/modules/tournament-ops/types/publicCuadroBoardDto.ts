import type {
  Match,
  MatchRules,
  MatchSlot,
  TournamentGroup,
  TournamentRound,
  UnresolvedTie,
} from "@/domain";

/** JSON de GET .../boards/cuadro público. */
export interface PublicCuadroBoardDto {
  categoryId: string;
  generatedAt: string;
  groups: TournamentGroup[];
  groupMatches: Match[];
  rounds: TournamentRound[];
  elimMatches: Match[];
  slots: MatchSlot[];
  pairLabels: Record<string, string>;
  pairPlayerNames: Record<string, string[]>;
  matchRules: MatchRules;
  unresolvedTies: UnresolvedTie[];
  notice: string | null;
}
