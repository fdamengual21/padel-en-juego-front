import type {
  PlayerFeed,
  PlayerUpcomingReservation,
  Tournament,
} from "../types";
import type { CoreApiDb } from "../store/db";

function todayIsoDate(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isUpcomingTournament(tournament: Tournament, today: string): boolean {
  if (tournament.status === "finished" || tournament.status === "cancelled") {
    return false;
  }
  const lastDay = tournament.endDate ?? tournament.startDate;
  return lastDay >= today;
}

export function buildPlayerFeed(
  db: CoreApiDb,
  clubId: string,
  playerId: string | null,
): PlayerFeed {
  const today = todayIsoDate();
  const upcomingTournaments = db.tournaments
    .getAll()
    .filter((t) => t.clubId === clubId)
    .filter((t) => isUpcomingTournament(t, today))
    .slice()
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  if (!playerId) {
    return { upcomingTournaments, upcomingReservations: [] };
  }

  const clientIds = new Set(
    db.clients
      .getAll()
      .filter((c) => c.playerId === playerId)
      .map((c) => c.id),
  );
  const nowMs = Date.now();
  const courtsById = new Map(db.courts.getAll().map((c) => [c.id, c]));
  const clubsById = new Map(db.clubs.getAll().map((c) => [c.id, c]));

  const upcomingReservations: PlayerUpcomingReservation[] = db.courtReservations
    .getAll()
    .filter((r) => clientIds.has(r.clientId))
    .filter((r) => r.status === "booked")
    .filter((r) => {
      const end = new Date(r.endsAt).getTime();
      return !Number.isNaN(end) && end > nowMs;
    })
    .slice()
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map((reservation) => {
      const court = reservation.courtId
        ? courtsById.get(reservation.courtId)
        : undefined;
      const club = clubsById.get(reservation.clubId);
      return {
        reservation,
        courtName: court?.name ?? "Cancha",
        clubName: club?.name ?? "Club",
      };
    });

  return { upcomingTournaments, upcomingReservations };
}
