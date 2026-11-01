import type { Tournament } from "@/domain";
import { rankingEventFlow, rankingEventStatusView } from "./rankingEventFlow";
import { standaloneTournamentFlow } from "./standaloneTournamentFlow";
import type { TournamentFlow, TournamentStatusInput, TournamentStatusView } from "./types";

/** Estado a mostrar: la fecha de ranking usa su calendario; el torneo suelto, su estado tal cual. */
export function tournamentStatusView(input: TournamentStatusInput): TournamentStatusView {
  if (input.rankingCircuitId) return rankingEventStatusView(input);
  return { status: input.status, hint: null };
}

/** Fecha de ranking o torneo suelto. Sin torneo cargado, suelto. */
export function resolveTournamentFlow(
  tournament: Pick<Tournament, "rankingCircuitId" | "weekIndex" | "rankingWeekCount"> | null | undefined,
): TournamentFlow {
  if (!tournament?.rankingCircuitId) return standaloneTournamentFlow;
  return rankingEventFlow({
    circuitId: tournament.rankingCircuitId,
    weekIndex: tournament.weekIndex,
    weekCount: tournament.rankingWeekCount,
  });
}

export {
  RANKING_EVENT_MIN_PAIRS,
  rankingEventCalendar,
  rankingEventFlow,
  rankingEventStatusView,
} from "./rankingEventFlow";
export { standaloneTournamentFlow } from "./standaloneTournamentFlow";
export type {
  TournamentFlow,
  TournamentFlowCopy,
  TournamentFlowKind,
  TournamentFormIssue,
  TournamentFormPolicy,
  TournamentStatusInput,
  TournamentStatusView,
} from "./types";
