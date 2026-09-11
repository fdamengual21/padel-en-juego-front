export * from "./types";
export { getCoreApiDb, resetCoreApiDb, CoreApiDb } from "./store/db";
export { TournamentEngine } from "./engine/TournamentEngine";
export {
  validateGroupConfig,
  suggestGroupConfig,
  resolveGroupConfig,
  delay,
  createId,
} from "./domain/tournamentLogic";
export {
  scoreboardSlotCount,
  scoreboardSlotLabel,
  isDecidingTiebreakMoment,
  isValidRegularSet,
  isValidDecidingTiebreak,
  validateMatchResultSets,
  isMatchResultComplete,
  deriveWinnerPairIdFromSets,
  setWinnerSide,
} from "./domain/matchResultRules";
export {
  hasMatchStartedBySchedule,
  resolveMatchPlayStatus,
  matchPlayStatusLabel,
  validateMatchStatusTransition,
  type MatchPlayStatus,
} from "./domain/matchPlayStatus";
export {
  findScheduleConflicts,
  listAvailableCourtsAt,
  matchesOverlap,
  describeScheduleConflictMatch,
  pairLabelForMatch,
  DEFAULT_MATCH_DURATION_MINUTES,
  type ScheduleConflict,
  type ScheduleConflictMatchInfo,
} from "./domain/scheduleConflicts";
export {
  ensureClientFromPlayer,
  buildClubClientSummary,
  buildClubClientDetail,
  listClubClientSummaries,
} from "./domain/clients";
export {
  paginateItems,
  normalizePageQuery,
  type PageQuery,
  type PaginatedResult,
} from "./domain/pagination";

import { getCoreApiDb } from "./store/db";
import { TournamentEngine } from "./engine/TournamentEngine";

let engine: TournamentEngine | null = null;

export function getTournamentEngine(): TournamentEngine {
  if (!engine) {
    engine = new TournamentEngine(getCoreApiDb());
  }
  return engine;
}
