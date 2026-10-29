import type {
  Court,
  GroupStanding,
  Match,
  MatchRules,
  MatchSlot,
  TournamentGroup,
  TournamentRound,
  UnresolvedTie,
} from "@/domain";

/** JSON de GET .../boards/repechage público. */
export interface PublicRepechageBoardDto {
  categoryId: string;
  generatedAt: string;
  groups: TournamentGroup[];
  groupMatches: Match[];
  standings: GroupStanding[];
  rounds: TournamentRound[];
  elimMatches: Match[];
  slots: MatchSlot[];
  pairLabels: Record<string, string>;
  pairPlayerNames: Record<string, string[]>;
  matchRules: MatchRules;
  courts?: Array<Pick<Court, "id" | "name">>;
  allMatches: Match[];
  finishedGroupIds: string[];
  unresolvedTies: UnresolvedTie[];
  notice: string | null;
}
