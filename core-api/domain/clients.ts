import type {
  Client,
  ClubClientCategoryStat,
  ClubClientDetail,
  ClubClientSummary,
  ClubClientTournamentEntry,
  ClientTournamentOutcome,
  CourtReservation,
  Match,
  Player,
  Tournament,
  TournamentCategory,
  TournamentPair,
} from "../types";
import type { CoreApiDb } from "../store/db";
import { createId } from "./tournamentLogic";
import {
  normalizePageQuery,
  paginateItems,
  type PageQuery,
  type PaginatedResult,
} from "./pagination";

/** Asegura un Cliente del club enlazado a un Player (p. ej. al inscribirse a torneo). */
export function ensureClientFromPlayer(
  db: CoreApiDb,
  clubId: string,
  player: Player,
): Client {
  const existing = db.clients
    .getAll()
    .find((c) => c.clubId === clubId && c.playerId === player.id);
  if (existing) {
    const patched: Client = {
      ...existing,
      displayName: player.displayName,
      firstName: player.firstName,
      lastName: player.lastName,
      phone: player.phone ?? existing.phone,
      email: player.email ?? existing.email,
      userId: player.userId ?? existing.userId,
      updatedAt: new Date().toISOString(),
    };
    return db.clients.upsert(patched);
  }

  const now = new Date().toISOString();
  const client: Client = {
    id: createId("client"),
    clubId,
    playerId: player.id,
    userId: player.userId,
    displayName: player.displayName,
    firstName: player.firstName,
    lastName: player.lastName,
    phone: player.phone,
    email: player.email,
    province: null,
    city: null,
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
  };
  return db.clients.upsert(client);
}

function activeReservations(
  reservations: CourtReservation[],
  clientId: string,
): CourtReservation[] {
  return reservations.filter(
    (r) => r.clientId === clientId && r.status !== "cancelled",
  );
}

function clubTournaments(db: CoreApiDb, clubId: string): Tournament[] {
  return db.tournaments.getAll().filter((t) => t.clubId === clubId);
}

/** Cliente con cuenta de usuario: historial de torneos en todos los clubes. */
function includesCrossClubTournamentHistory(client: Client): boolean {
  return Boolean(client.userId);
}

function pairsForPlayer(
  db: CoreApiDb,
  playerId: string | null,
  clubIdFilter: string | null,
): { pair: TournamentPair; category: TournamentCategory; tournament: Tournament }[] {
  if (!playerId) return [];
  const tournaments = clubIdFilter
    ? clubTournaments(db, clubIdFilter)
    : db.tournaments.getAll();
  const tournamentById = new Map(tournaments.map((t) => [t.id, t]));
  const categories = db.categories
    .getAll()
    .filter((c) => tournamentById.has(c.tournamentId));
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const out: {
    pair: TournamentPair;
    category: TournamentCategory;
    tournament: Tournament;
  }[] = [];

  for (const pair of db.pairs.getAll()) {
    if (pair.player1Id !== playerId && pair.player2Id !== playerId) continue;
    const category = categoryById.get(pair.tournamentCategoryId);
    if (!category) continue;
    const tournament = tournamentById.get(category.tournamentId);
    if (!tournament) continue;
    out.push({ pair, category, tournament });
  }
  return out;
}

function participationsForClient(db: CoreApiDb, client: Client) {
  const clubFilter = includesCrossClubTournamentHistory(client)
    ? null
    : client.clubId;
  return pairsForPlayer(db, client.playerId, clubFilter);
}

function matchStatsForPair(
  matches: Match[],
  pairId: string,
): { won: number; lost: number; wonFinal: boolean } {
  let won = 0;
  let lost = 0;
  let wonFinal = false;
  for (const match of matches) {
    if (match.status !== "finished" && match.status !== "walkover") continue;
    const isA = match.pairAId === pairId;
    const isB = match.pairBId === pairId;
    if (!isA && !isB) continue;
    if (!match.winnerPairId) continue;
    if (match.winnerPairId === pairId) {
      won += 1;
      if (match.phase === "FINAL") wonFinal = true;
    } else {
      lost += 1;
    }
  }
  return { won, lost, wonFinal };
}

function resolveOutcome(input: {
  tournamentStatus: Tournament["status"];
  wonFinal: boolean;
  matchesPlayed: number;
}): ClientTournamentOutcome {
  if (input.wonFinal) return "champion";
  if (input.tournamentStatus === "finished") return "eliminated";
  if (input.tournamentStatus === "inProgress" || input.matchesPlayed > 0) {
    return "in_progress";
  }
  return "registered";
}

export function buildClubClientSummary(
  db: CoreApiDb,
  client: Client,
): ClubClientSummary {
  const reservations = activeReservations(
    db.courtReservations.getAll().filter((r) => r.clubId === client.clubId),
    client.id,
  );
  const participations = participationsForClient(db, client);
  const matches = db.matches.getAll();

  let matchesWon = 0;
  let matchesLost = 0;
  let tournamentsWon = 0;
  let tournamentsLost = 0;
  const tournamentIds = new Set<string>();
  const categoryMap = new Map<string, ClubClientCategoryStat>();

  for (const { pair, category, tournament } of participations) {
    tournamentIds.add(tournament.id);
    const prev = categoryMap.get(category.id);
    if (prev) {
      prev.tournamentCount += 1;
    } else {
      categoryMap.set(category.id, {
        categoryId: category.id,
        categoryName: category.name,
        tournamentCount: 1,
      });
    }

    const stats = matchStatsForPair(matches, pair.id);
    matchesWon += stats.won;
    matchesLost += stats.lost;
    if (stats.wonFinal) tournamentsWon += 1;
    else if (tournament.status === "finished") tournamentsLost += 1;
  }

  return {
    client,
    reservationsCount: reservations.length,
    tournamentsCount: tournamentIds.size,
    tournamentsWon,
    tournamentsLost,
    matchesWon,
    matchesLost,
    byCategory: [...categoryMap.values()].sort((a, b) =>
      a.categoryName.localeCompare(b.categoryName, "es"),
    ),
  };
}

export function buildClubClientDetail(
  db: CoreApiDb,
  client: Client,
): ClubClientDetail {
  const summary = buildClubClientSummary(db, client);
  const participations = participationsForClient(db, client);
  const matches = db.matches.getAll();
  const playersById = new Map(db.players.getAll().map((p) => [p.id, p]));
  const clubsById = new Map(db.clubs.getAll().map((c) => [c.id, c]));

  const tournaments: ClubClientTournamentEntry[] = participations.map(
    ({ pair, category, tournament }) => {
      const stats = matchStatsForPair(matches, pair.id);
      const partnerId =
        pair.player1Id === client.playerId ? pair.player2Id : pair.player1Id;
      const partnerName = partnerId
        ? (playersById.get(partnerId)?.displayName ?? null)
        : null;
      const club = clubsById.get(tournament.clubId);
      return {
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        clubId: tournament.clubId,
        clubName: club?.name ?? "Club",
        tournamentStatus: tournament.status,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        categoryId: category.id,
        categoryName: category.name,
        pairId: pair.id,
        partnerName,
        matchesWon: stats.won,
        matchesLost: stats.lost,
        outcome: resolveOutcome({
          tournamentStatus: tournament.status,
          wonFinal: stats.wonFinal,
          matchesPlayed: stats.won + stats.lost,
        }),
      };
    },
  );

  tournaments.sort((a, b) => {
    const byDate = b.startDate.localeCompare(a.startDate);
    if (byDate !== 0) return byDate;
    return a.tournamentName.localeCompare(b.tournamentName, "es");
  });

  const recentReservations = activeReservations(
    db.courtReservations.getAll().filter((r) => r.clubId === client.clubId),
    client.id,
  )
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
    .slice(0, 10);

  const linkedPlayer = client.playerId
    ? playersById.get(client.playerId) ?? null
    : null;

  return {
    ...summary,
    tournaments,
    recentReservations,
    categoryLevel: linkedPlayer?.categoryLevel ?? null,
  };
}

export function listClubClientSummaries(
  db: CoreApiDb,
  clubId: string,
  query?: PageQuery,
): PaginatedResult<ClubClientSummary> {
  const { page, pageSize, q } = normalizePageQuery(query, { pageSize: 8 });
  const needle = q.toLowerCase();

  const filtered = db.clients
    .getAll()
    .filter((c) => c.clubId === clubId)
    .filter((c) => {
      if (!needle) return true;
      const hay = [
        c.displayName,
        c.firstName,
        c.lastName,
        c.phone ?? "",
        c.email ?? "",
        c.city ?? "",
        c.province ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    })
    .map((c) => buildClubClientSummary(db, c))
    .sort((a, b) =>
      a.client.displayName.localeCompare(b.client.displayName, "es"),
    );

  return paginateItems(filtered, page, pageSize);
}
