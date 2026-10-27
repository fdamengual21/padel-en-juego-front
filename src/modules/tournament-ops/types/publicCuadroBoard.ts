import type {
  Match,
  MatchRules,
  MatchSlot,
  TournamentGroup,
  TournamentRound,
  UnresolvedTie,
} from "@/domain";

/** Tab Cuadro público: seguimiento, sin candidatos de cruce. */
export interface PublicCuadroBoard {
  categoryId: string;
  generatedAt: string;
  groups: TournamentGroup[];
  groupMatches: Match[];
  rounds: TournamentRound[];
  elimMatches: Match[];
  slots: MatchSlot[];
  pairLabels: Record<string, string>;
  pairPlayerNames: Record<string, [string, string]>;
  matchRules: MatchRules;
  unresolvedTies: UnresolvedTie[];
  notice: string | null;
}
