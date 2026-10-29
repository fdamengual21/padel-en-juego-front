import type {
  GroupStanding,
  Match,
  MatchRules,
  MatchSlot,
  TournamentGroup,
  TournamentRound,
  UnresolvedTie,
} from "@/domain";

/** Tab Repechaje público: zonas + cuadro, sin mutaciones. */
export interface PublicRepechageBoard {
  categoryId: string;
  generatedAt: string;
  groups: TournamentGroup[];
  groupMatches: Match[];
  standings: GroupStanding[];
  rounds: TournamentRound[];
  elimMatches: Match[];
  slots: MatchSlot[];
  pairLabels: Record<string, string>;
  pairPlayerNames: Record<string, [string, string]>;
  matchRules: MatchRules;
  allMatches: Match[];
  finishedGroupIds: string[];
  unresolvedTies: UnresolvedTie[];
  notice: string | null;
}
