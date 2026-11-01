import {
  isCategoryLevel,
  isPlayerSidePreference,
  type PaginatedResult,
  type PublicPlayerCircuit,
  type PublicPlayerCompetition,
  type PublicPlayerPartner,
  type PublicPlayerProfile,
  type PublicPlayerSeason,
  type PublicPlayerTournament,
  type PublicPlayerTournamentResult,
} from "@/domain";

type Row = Record<string, unknown>;

const RESULTS: readonly PublicPlayerTournamentResult[] = [
  "champion",
  "finalist",
  "semi",
  "quarter",
  "r16",
  "r32",
  "group",
  "playing",
];

export function toPublicPlayerProfile(raw: unknown): PublicPlayerProfile {
  const source = asRow(raw);
  const player = asRow(source.player);
  return {
    player: {
      userId: asString(player.userId),
      displayName: asString(player.displayName),
      categoryLevel: isCategoryLevel(player.categoryLevel) ? player.categoryLevel : null,
      avatarUrl: asNullableString(player.avatarUrl),
      coverUrl: asNullableString(player.coverUrl),
      sidePreference: isPlayerSidePreference(player.sidePreference) ? player.sidePreference : null,
      phone: asNullableString(player.phone),
    },
    city: asNullableString(source.city),
    province: asNullableString(source.province),
    season: toSeason(source.season),
    frequentPartner: toPartner(source.frequentPartner),
  };
}

export function toPublicPlayerCompetitionPage(
  raw: unknown,
  fallback: { page: number; pageSize: number },
): PaginatedResult<PublicPlayerCompetition> {
  const source = asRow(raw);
  const items = Array.isArray(source.items)
    ? source.items
        .map(toCompetition)
        .filter((item): item is PublicPlayerCompetition => item !== null)
    : [];
  return {
    items,
    page: asNumber(source.page, fallback.page),
    pageSize: asNumber(source.pageSize, fallback.pageSize),
    totalItems: asNumber(source.totalItems, 0),
    totalPages: asNumber(source.totalPages, 0),
  };
}

export function toPublicPlayerTournament(raw: unknown): PublicPlayerTournament | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Row;
  const tournamentId = asString(row.tournamentId);
  const pairId = asString(row.pairId);
  if (!tournamentId || !pairId) return null;
  const result = RESULTS.find((item) => item === row.result) ?? "group";
  return {
    tournamentId,
    name: asString(row.name),
    status: asString(row.status),
    startDate: asString(row.startDate),
    endDate: asString(row.endDate),
    clubName: asString(row.clubName),
    imageUrl: asNullableString(row.imageUrl),
    categoryName: asString(row.categoryName),
    pairId,
    partnerName: asNullableString(row.partnerName),
    partnerUserId: asNullableString(row.partnerUserId),
    matchesWon: asNumber(row.matchesWon, 0),
    matchesLost: asNumber(row.matchesLost, 0),
    result,
    points: asNullableNumber(row.points),
    rankingCircuitId: asNullableString(row.rankingCircuitId),
    rankingCircuitName: asNullableString(row.rankingCircuitName),
    weekIndex: asNullableNumber(row.weekIndex),
    rankingWeekCount: asNullableNumber(row.rankingWeekCount),
  };
}

function toCompetition(raw: unknown): PublicPlayerCompetition | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Row;
  if (row.kind === "tournament") {
    const tournament = toPublicPlayerTournament(row.tournament);
    return tournament ? { kind: "tournament", tournament } : null;
  }
  if (row.kind === "circuit") {
    const circuit = toCircuit(row.circuit);
    return circuit ? { kind: "circuit", circuit } : null;
  }
  return null;
}

function toCircuit(raw: unknown): PublicPlayerCircuit | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Row;
  const circuitId = asString(row.circuitId);
  if (!circuitId) return null;
  return {
    circuitId,
    name: asString(row.name),
    clubName: asString(row.clubName),
    imageUrl: asNullableString(row.imageUrl),
    categoryName: asString(row.categoryName),
    startDate: asString(row.startDate),
    endDate: asString(row.endDate),
    place: asNullableNumber(row.place),
    rankedPlayers: asNumber(row.rankedPlayers, 0),
    points: asNumber(row.points, 0),
    datesPlayed: asNumber(row.datesPlayed, 0),
    weekCount: asNumber(row.weekCount, 0),
    prizeLabel: asNullableString(row.prizeLabel),
  };
}

function toSeason(raw: unknown): PublicPlayerSeason {
  const row = asRow(raw);
  return {
    year: asNumber(row.year, new Date().getFullYear()),
    tournamentsPlayed: asNumber(row.tournamentsPlayed, 0),
    matchesPlayed: asNumber(row.matchesPlayed, 0),
    matchesWon: asNumber(row.matchesWon, 0),
    matchesLost: asNumber(row.matchesLost, 0),
    setsWon: asNumber(row.setsWon, 0),
    setsLost: asNumber(row.setsLost, 0),
    matchesPerWeek: asNumber(row.matchesPerWeek, 0),
    weekStreak: asNumber(row.weekStreak, 0),
  };
}

function toPartner(raw: unknown): PublicPlayerPartner | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Row;
  const displayName = asString(row.displayName);
  if (!displayName) return null;
  return {
    userId: asNullableString(row.userId),
    displayName,
    avatarUrl: asNullableString(row.avatarUrl),
    tournamentsTogether: asNumber(row.tournamentsTogether, 0),
    matchesPlayed: asNumber(row.matchesPlayed, 0),
    matchesWon: asNumber(row.matchesWon, 0),
  };
}

function asRow(value: unknown): Row {
  return value && typeof value === "object" ? (value as Row) : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function asNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
