export * from "./types";
export { getCoreApiDb, resetCoreApiDb, CoreApiDb } from "./store/db";
export { TournamentEngine } from "./engine/TournamentEngine";
export {
  validateGroupConfig,
  suggestGroupConfig,
  resolveGroupConfig,
  delay,
  createId,
  intersectWindows,
  buildTournamentDayWindows,
  eachDateInclusive,
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
  slotOverlapsReservation,
  describeScheduleConflictMatch,
  pairLabelForMatch,
  resolveMatchDurationMinutes,
  isQualityPreset,
  DEFAULT_MATCH_DURATION_MINUTES,
  NON_QUALITY_MATCH_DURATION_MINUTES,
  QUALITY_MATCH_DURATION_MINUTES,
  type ScheduleConflict,
  type ScheduleConflictMatchInfo,
  type ScheduleConflictReservationInfo,
} from "./domain/scheduleConflicts";
export {
  COURT_IMAGE_PATHS,
  pickRandomCourtImagePath,
  type CourtImagePath,
} from "./domain/courtImages";
export {
  ensureClientFromPlayer,
  buildClubClientSummary,
  buildClubClientDetail,
  listClubClientSummaries,
} from "./domain/clients";
export {
  resolvePriceForSlot,
  validateCourtPriceRules,
  isoWeekdayFromDate,
} from "./domain/courtPricing";
export {
  generateDaySlots,
  resolveCourtHours,
  intervalsOverlap,
  isClubOpenOnDate,
  isCourtOpenAt,
  isOvernightHours,
  isZeroLengthHours,
  weekdayIsoFromDateIso,
  localDateIsoFromInstant,
  type CourtDaySlot,
} from "./domain/courtSlots";
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
