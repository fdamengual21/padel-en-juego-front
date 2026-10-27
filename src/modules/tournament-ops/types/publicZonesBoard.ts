import type {
  GroupStanding,
  Match,
  MatchRules,
  MatchSlot,
  TournamentGroup,
  UnresolvedTie,
} from "@/domain";

/** Tab Zonas público: seguimiento, sin autoasignar. */
export interface PublicZonesBoard {
  categoryId: string;
  generatedAt: string;
  groups: TournamentGroup[];
  groupMatches: Match[];
  standings: GroupStanding[];
  pairLabels: Record<string, string>;
  pairPlayerNames: Record<string, [string, string]>;
  matchRules: MatchRules;
  courts: Array<{ id: string; name: string }>;
  allMatches: Match[];
  slots: MatchSlot[];
  finishedGroupIds: string[];
  unresolvedTies: UnresolvedTie[];
  notice: string | null;
}
