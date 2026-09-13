import type {
  ClientTournamentOutcome,
  Match,
  MatchPhase,
  Player,
  PlayerDashboard,
  PlayerMatchView,
  PlayerTournamentHistoryEntry,
  Tournament,
  TournamentCategory,
  TournamentPair,
} from "../types";
import type { CoreApiDb } from "../store/db";
import { defaultPlayerCoverPath } from "./playerCovers";

const PHASE_RANK: Record<MatchPhase, number> = {
  CONSOLATION: 0,
  GROUP: 1,
  PLAY_IN: 2,
  R32: 3,
  R16: 4,
  QF: 5,
  SF: 6,
  FINAL: 7,
};

export function matchPhaseLabel(phase: MatchPhase): string {
  switch (phase) {
    case "GROUP":
      return "Zonas";
    case "PLAY_IN":
      return "Previas";
    case "R32":
      return "Dieciseisavos";
    case "R16":
      return "Octavos";
    case "QF":
      return "Cuartos";
    case "SF":
      return "Semifinal";
    case "FINAL":
      return "Final";
    case "CONSOLATION":
      return "Consolación";
    default:
      return phase;
  }
}

function pairDisplayLabel(
  pair: TournamentPair | undefined,
  playersById: Map<string, Player>,
): string {
  if (!pair) return "Por definir";
  const p1 = playersById.get(pair.player1Id)?.displayName ?? "?";
  const p2 = pair.player2Id
    ? (playersById.get(pair.player2Id)?.displayName ?? "?")
    : "Compañero pendiente";
  return `${p1} / ${p2}`;
}

function matchesForPair(matches: Match[], pairId: string): Match[] {
  return matches.filter(
    (m) => m.pairAId === pairId || m.pairBId === pairId,
  );
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

function resolvePhaseReached(
  matches: Match[],
  pairId: string,
): MatchPhase | null {
  let best: MatchPhase | null = null;
  let bestRank = -1;
  for (const match of matchesForPair(matches, pairId)) {
    if (match.phase === "CONSOLATION") continue;
    const rank = PHASE_RANK[match.phase] ?? 0;
    if (rank > bestRank) {
      bestRank = rank;
      best = match.phase;
    }
  }
  return best;
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

function pairsForPlayer(
  db: CoreApiDb,
  playerId: string,
): { pair: TournamentPair; category: TournamentCategory; tournament: Tournament }[] {
  const tournamentById = new Map(db.tournaments.getAll().map((t) => [t.id, t]));
  const categoryById = new Map(db.categories.getAll().map((c) => [c.id, c]));
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

function toMatchView(
  match: Match,
  pairById: Map<string, TournamentPair>,
  playersById: Map<string, Player>,
  courtNameById: Map<string, string>,
): PlayerMatchView {
  return {
    match,
    phaseLabel: matchPhaseLabel(match.phase),
    pairALabel: pairDisplayLabel(
      match.pairAId ? pairById.get(match.pairAId) : undefined,
      playersById,
    ),
    pairBLabel: pairDisplayLabel(
      match.pairBId ? pairById.get(match.pairBId) : undefined,
      playersById,
    ),
    courtLabel: match.courtId
      ? (courtNameById.get(match.courtId) ?? null)
      : null,
  };
}

function resolvePlayerLocation(
  db: CoreApiDb,
  player: Player,
): { city: string | null; province: string | null } {
  if (player.userId) {
    const user = db.users.getById(player.userId);
    if (user?.city || user?.province) {
      return { city: user.city ?? null, province: user.province ?? null };
    }
  }
  const client = db.clients
    .getAll()
    .find((c) => c.playerId === player.id && (c.city || c.province));
  return {
    city: client?.city ?? null,
    province: client?.province ?? null,
  };
}

export function buildPlayerDashboard(
  db: CoreApiDb,
  playerId: string,
): PlayerDashboard {
  const player = db.players.getById(playerId);
  if (!player) throw new Error("Jugador no encontrado");

  const playersById = new Map(db.players.getAll().map((p) => [p.id, p]));
  const pairById = new Map(db.pairs.getAll().map((p) => [p.id, p]));
  const courtNameById = new Map(
    db.courts.getAll().map((c) => [c.id, c.name]),
  );
  const clubsById = new Map(db.clubs.getAll().map((c) => [c.id, c]));
  const allMatches = db.matches.getAll();
  const participations = pairsForPlayer(db, playerId);
  const pairIds = new Set(participations.map((p) => p.pair.id));

  let matchesWon = 0;
  let matchesLost = 0;
  let tournamentsWon = 0;
  let tournamentsLost = 0;
  const tournamentIds = new Set<string>();

  const tournaments: PlayerTournamentHistoryEntry[] = participations.map(
    ({ pair, category, tournament }) => {
      tournamentIds.add(tournament.id);
      const stats = matchStatsForPair(allMatches, pair.id);
      matchesWon += stats.won;
      matchesLost += stats.lost;
      if (stats.wonFinal) tournamentsWon += 1;
      else if (tournament.status === "finished") tournamentsLost += 1;

      const partnerId =
        pair.player1Id === playerId ? pair.player2Id : pair.player1Id;
      const partnerName = partnerId
        ? (playersById.get(partnerId)?.displayName ?? null)
        : null;
      const club = clubsById.get(tournament.clubId);
      const phaseReached = resolvePhaseReached(allMatches, pair.id);
      const pairMatches = matchesForPair(allMatches, pair.id)
        .slice()
        .sort((a, b) =>
          (a.scheduledAt ?? a.id).localeCompare(b.scheduledAt ?? b.id),
        )
        .map((m) => toMatchView(m, pairById, playersById, courtNameById));

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
        phaseReached,
        phaseReachedLabel: phaseReached ? matchPhaseLabel(phaseReached) : null,
        matches: pairMatches,
      };
    },
  );

  tournaments.sort((a, b) => {
    const byDate = b.startDate.localeCompare(a.startDate);
    if (byDate !== 0) return byDate;
    return a.tournamentName.localeCompare(b.tournamentName, "es");
  });

  const playerMatches = allMatches
    .filter(
      (m) =>
        pairIds.has(m.pairAId ?? "") || pairIds.has(m.pairBId ?? ""),
    )
    .slice()
    .sort((a, b) =>
      (a.scheduledAt ?? a.id).localeCompare(b.scheduledAt ?? b.id),
    );

  const nextRaw =
    playerMatches.find(
      (m) => m.status !== "finished" && m.status !== "walkover",
    ) ?? null;
  const recentRaw = playerMatches
    .filter((m) => m.status === "finished" || m.status === "walkover")
    .slice(-5)
    .reverse();

  const location = resolvePlayerLocation(db, player);
  const coverUrl = player.coverUrl ?? defaultPlayerCoverPath();

  return {
    player: { ...player, coverUrl },
    city: location.city,
    province: location.province,
    matchesPlayed: matchesWon + matchesLost,
    matchesWon,
    matchesLost,
    tournamentsCount: tournamentIds.size,
    tournamentsWon,
    tournamentsLost,
    nextMatch: nextRaw
      ? toMatchView(nextRaw, pairById, playersById, courtNameById)
      : null,
    recentMatches: recentRaw.map((m) =>
      toMatchView(m, pairById, playersById, courtNameById),
    ),
    tournaments,
  };
}
