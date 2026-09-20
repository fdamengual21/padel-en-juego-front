import type {
  Club,
  ClubDashboardView,
  ConfigBoardView,
  CuadroBoardView,
  CourtsAgendaBoardView,
  CourtsDayOverviewView,
  MatchRules,
  Player,
  PlayerDashboard,
  PlayerFeed,
  TournamentCategory,
  Tournament,
  ZonesBoardView,
  ParticipantsBoardView,
  MatchesBoardView,
} from "./types";
import type { PaginatedResult } from "./pagination";

export const DEFAULT_MATCH_RULES: MatchRules = {
  setFormat: "best_of_3",
  setsToWin: 2,
  gamesPerSet: 6,
  advantageType: "goldenPoint",
  goldenPoint: true,
  tiebreakEnabled: true,
  tiebreakPoints: 7,
  tiebreakWinByTwo: true,
  superTiebreakEnabled: true,
  superTiebreakPoints: 10,
  superTiebreakWinByTwo: true,
};

export function emptyClub(id: string): Club {
  return {
    id,
    name: "Club",
    status: "active",
    province: null,
    city: null,
    openTime: "08:00",
    closeTime: "23:00",
    openDays: [1, 2, 3, 4, 5, 6, 7],
    createdAt: "",
    updatedAt: "",
  };
}

export function emptyPlayer(id: string): Player {
  return {
    id,
    userId: null,
    displayName: "Jugador",
    firstName: "",
    lastName: "",
    phone: null,
    email: null,
    age: null,
    categoryLevel: 6,
    categoryHistory: [],
    sidePreferencePrimary: null,
    sidePreferenceSecondary: null,
    avatarUrl: null,
    coverUrl: null,
    createdAt: "",
  };
}

export function emptyPlayerDashboard(player: Player): PlayerDashboard {
  return {
    player,
    city: null,
    province: null,
    matchesPlayed: 0,
    matchesWon: 0,
    matchesLost: 0,
    tournamentsCount: 0,
    tournamentsWon: 0,
    tournamentsLost: 0,
    nextMatch: null,
    recentMatches: [],
    tournaments: [],
  };
}

export function emptyPlayerFeed(): PlayerFeed {
  return { upcomingTournaments: [], upcomingReservations: [] };
}

export function emptyClubDashboard(): ClubDashboardView {
  return {
    upcomingMatches: [],
    upcomingReservations: [],
    registeredPairs: 0,
    liveMatches: 0,
    courtsInUse: 0,
    courtsTotal: 0,
    tournaments: [],
  };
}

export function emptyPaginated<T>(): PaginatedResult<T> {
  return { items: [], page: 1, pageSize: 8, totalItems: 0, totalPages: 1 };
}

export function emptyCuadroBoard(categoryId: string): CuadroBoardView {
  return {
    categoryId,
    generatedAt: new Date().toISOString(),
    groups: [],
    groupMatches: [],
    rounds: [],
    elimMatches: [],
    slots: [],
    pairLabels: {},
    pairPlayerNames: {},
    matchRules: DEFAULT_MATCH_RULES,
    unassignedPairs: [],
    notice: null,
  };
}

export function emptyZonesBoard(categoryId: string): ZonesBoardView {
  return {
    categoryId,
    generatedAt: new Date().toISOString(),
    groups: [],
    groupMatches: [],
    standings: [],
    pairLabels: {},
    pairPlayerNames: {},
    matchRules: DEFAULT_MATCH_RULES,
    courts: [],
    allMatches: [],
    qualifyPerGroup: 2,
    pairsPerGroup: 4,
    finishedGroupIds: [],
    unassignedPairs: [],
    notice: null,
  };
}

export function emptyParticipantsBoard(
  categoryId: string,
): ParticipantsBoardView {
  return {
    categoryId,
    generatedAt: new Date().toISOString(),
    rows: [],
    tournamentStarted: false,
    notice: null,
    autoMatches: [],
  };
}

export function emptyMatchesBoard(categoryId: string): MatchesBoardView {
  return {
    categoryId,
    generatedAt: new Date().toISOString(),
    groupMatches: [],
    elimMatches: [],
    pairLabels: {},
    courtLabels: {},
    matchRules: DEFAULT_MATCH_RULES,
    notice: null,
  };
}

export function emptyCourtsDayOverview(
  clubId: string,
  date: string,
): CourtsDayOverviewView {
  return {
    clubId,
    date,
    generatedAt: new Date().toISOString(),
    items: [],
  };
}

export function emptyCourtsAgendaBoard(
  clubId: string,
): CourtsAgendaBoardView {
  const club = emptyClub(clubId);
  return {
    clubId,
    generatedAt: new Date().toISOString(),
    club,
    courts: [],
    events: [],
    openTime: club.openTime,
    closeTime: club.closeTime,
  };
}

export function emptyConfigBoard(
  categoryId: string,
  tournament: Tournament,
  category: TournamentCategory,
): ConfigBoardView {
  return {
    categoryId,
    generatedAt: new Date().toISOString(),
    tournament,
    category,
    ruleset: null,
    structureLocked: false,
    pairsPerGroup: 4,
    qualifyPerGroup: 2,
    notice: null,
  };
}

export function notConnectedError(): never {
  throw new Error("Todavía no está conectado a la API");
}
