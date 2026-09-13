import clubsSeed from "../data/clubs.json";
import usersSeed from "../data/users.json";
import clubMembersSeed from "../data/clubMembers.json";
import playersSeed from "../data/players.json";
import clientsSeed from "../data/clients.json";
import courtReservationsSeed from "../data/courtReservations.json";
import tournamentsSeed from "../data/tournaments.json";
import categoriesSeed from "../data/categories.json";
import pairsSeed from "../data/pairs.json";
import registrationsSeed from "../data/registrations.json";
import rulesetsSeed from "../data/rulesets.json";
import groupsSeed from "../data/groups.json";
import standingsSeed from "../data/standings.json";
import roundsSeed from "../data/rounds.json";
import matchesSeed from "../data/matches.json";
import matchSlotsSeed from "../data/matchSlots.json";
import courtsSeed from "../data/courts.json";
import courtPriceRulesSeed from "../data/courtPriceRules.json";
import courtAvailabilitySeed from "../data/courtAvailability.json";
import pairAvailabilitySeed from "../data/pairAvailability.json";
import type {
  Client,
  Club,
  ClubMember,
  CoreApiSnapshot,
  Court,
  CourtAvailability,
  CourtPriceRule,
  CourtReservation,
  GroupStanding,
  Match,
  MatchSlot,
  PairAvailability,
  Player,
  Tournament,
  TournamentCategory,
  TournamentGroup,
  TournamentPair,
  TournamentRegistration,
  TournamentRound,
  TournamentRuleset,
  User,
} from "../types";
import {
  clearPersistedSnapshot,
  CollectionStore,
  loadPersistedSnapshot,
  persistSnapshot,
} from "./collectionStore";
import {
  parseCategoryLevel,
  type CategoryLevel,
  type PlayerCategoryHistoryEntry,
} from "../types/categories";

const DEFAULT_CLUB_OPEN = "08:00";
const DEFAULT_CLUB_CLOSE = "23:00";
const DEFAULT_SLOT_MINUTES = 90;
const DEFAULT_BASE_PRICE = 0;

function seedSnapshot(): CoreApiSnapshot {
  return {
    clubs: clubsSeed as Club[],
    users: usersSeed as User[],
    clubMembers: clubMembersSeed as ClubMember[],
    players: playersSeed as Player[],
    clients: clientsSeed as Client[],
    courtReservations: courtReservationsSeed as CourtReservation[],
    tournaments: tournamentsSeed as Tournament[],
    categories: categoriesSeed as TournamentCategory[],
    pairs: pairsSeed as TournamentPair[],
    registrations: registrationsSeed as TournamentRegistration[],
    rulesets: rulesetsSeed as TournamentRuleset[],
    groups: groupsSeed as TournamentGroup[],
    standings: standingsSeed as GroupStanding[],
    rounds: roundsSeed as TournamentRound[],
    matches: matchesSeed as Match[],
    matchSlots: matchSlotsSeed as MatchSlot[],
    courts: courtsSeed as Court[],
    courtPriceRules: courtPriceRulesSeed as CourtPriceRule[],
    courtAvailability: courtAvailabilitySeed as CourtAvailability[],
    pairAvailability: pairAvailabilitySeed as PairAvailability[],
  };
}

function withClientDefaults<
  T extends {
    province?: string | null;
    city?: string | null;
    avatarUrl?: string | null;
  },
>(item: T): T & {
  province: string | null;
  city: string | null;
  avatarUrl: string | null;
} {
  return {
    ...item,
    province: item.province ?? null,
    city: item.city ?? null,
    avatarUrl: item.avatarUrl ?? null,
  };
}

function withLocation<T extends { province?: string | null; city?: string | null }>(
  item: T,
): T & { province: string | null; city: string | null } {
  return {
    ...item,
    province: item.province ?? null,
    city: item.city ?? null,
  };
}

function withClubDefaults(club: Club): Club {
  const rawDays = Array.isArray(club.openDays) ? club.openDays : [];
  const openDays = [
    ...new Set(rawDays.filter((d) => d >= 1 && d <= 7)),
  ].sort((a, b) => a - b) as import("../types").WeekdayIso[];
  return {
    ...withLocation(club),
    openTime: club.openTime ?? DEFAULT_CLUB_OPEN,
    closeTime: club.closeTime ?? DEFAULT_CLUB_CLOSE,
    openDays: openDays.length > 0 ? openDays : [1, 2, 3, 4, 5, 6, 7],
  };
}

function withCourtDefaults(court: Court): Court {
  return {
    id: court.id,
    clubId: court.clubId,
    name: court.name,
    status: court.status,
    imageUrl: court.imageUrl ?? null,
    slotDurationMinutes: court.slotDurationMinutes ?? DEFAULT_SLOT_MINUTES,
    basePrice: court.basePrice ?? DEFAULT_BASE_PRICE,
  };
}

function withReservationDefaults(reservation: CourtReservation): CourtReservation {
  return {
    ...reservation,
    price: reservation.price ?? null,
  };
}

function normalizeCategoryLevel(
  value: unknown,
  fallback: CategoryLevel = 6,
): CategoryLevel {
  return parseCategoryLevel(value) ?? fallback;
}

function withPlayerDefaults(player: Player): Player {
  const categoryLevel = normalizeCategoryLevel(
    (player as Player & { categoryLevel?: unknown }).categoryLevel,
  );
  const rawHistory = Array.isArray(player.categoryHistory)
    ? player.categoryHistory
    : [];
  const categoryHistory: PlayerCategoryHistoryEntry[] = rawHistory.map(
    (entry, index) => {
      const { note: _legacyNote, ...rest } = entry as PlayerCategoryHistoryEntry & {
        note?: unknown;
      };
      return {
        ...rest,
        level: normalizeCategoryLevel(entry.level, categoryLevel),
        previousLevel:
          entry.previousLevel == null
            ? null
            : normalizeCategoryLevel(entry.previousLevel),
        id: entry.id || `${player.id}-pch-${index}`,
      };
    },
  );
  if (categoryHistory.length === 0) {
    categoryHistory.push({
      id: `${player.id}-pch-seed`,
      level: categoryLevel,
      previousLevel: null,
      reason: "initial",
      at: player.createdAt,
      by: "system",
    });
  }
  return { ...player, categoryLevel, categoryHistory };
}

function withTournamentDefaults(tournament: Tournament): Tournament {
  return {
    ...tournament,
    registrationFee: Math.max(0, Number(tournament.registrationFee) || 0),
  };
}

function withTournamentCategoryDefaults(
  category: TournamentCategory,
): TournamentCategory {
  const withLevel =
    category.level == null
      ? category
      : {
          ...category,
          level: normalizeCategoryLevel(category.level),
        };
  return {
    ...withLevel,
    circuitType: withLevel.circuitType === "CICUPA" ? "CICUPA" : "NONE",
  };
}

function withRegistrationDefaults(
  registration: TournamentRegistration,
): TournamentRegistration {
  const legacyStatus = registration.status as string;
  const status =
    legacyStatus === "CONFIRMED"
      ? ("ACCEPTED" as TournamentRegistration["status"])
      : registration.status;
  return {
    ...registration,
    status,
    statusNote: registration.statusNote ?? null,
    statusChangedAt: registration.statusChangedAt ?? null,
    rankingPointsPlayer1: registration.rankingPointsPlayer1 ?? null,
    rankingPointsPlayer2: registration.rankingPointsPlayer2 ?? null,
    tournamentPointsAwarded: registration.tournamentPointsAwarded ?? null,
  };
}

function hydrateSnapshot(
  persisted: CoreApiSnapshot | null,
): CoreApiSnapshot {
  const seed = seedSnapshot();
  if (!persisted) {
    return {
      ...seed,
      players: seed.players.map(withPlayerDefaults),
      tournaments: seed.tournaments.map(withTournamentDefaults),
      categories: seed.categories.map(withTournamentCategoryDefaults),
      registrations: seed.registrations.map(withRegistrationDefaults),
    };
  }
  const partial = persisted as Partial<CoreApiSnapshot>;
  const clients = (Array.isArray(partial.clients) ? partial.clients : seed.clients).map(
    withClientDefaults,
  );
  const clubs = (partial.clubs ?? seed.clubs).map(withClubDefaults);
  const users = (partial.users ?? seed.users).map(withLocation);
  const players = (partial.players ?? seed.players).map(withPlayerDefaults);
  const tournaments = (partial.tournaments ?? seed.tournaments).map(
    withTournamentDefaults,
  );
  const categories = (partial.categories ?? seed.categories).map(
    withTournamentCategoryDefaults,
  );
  const registrations = (partial.registrations ?? seed.registrations).map(
    withRegistrationDefaults,
  );
  const courts = (partial.courts ?? seed.courts).map(withCourtDefaults);
  const courtReservations = (
    Array.isArray(partial.courtReservations)
      ? partial.courtReservations
      : seed.courtReservations
  ).map(withReservationDefaults);
  const courtPriceRules = (
    Array.isArray(partial.courtPriceRules)
      ? partial.courtPriceRules
      : seed.courtPriceRules
  ).map((rule) => {
    const raw = rule as CourtPriceRule & { priority?: number };
    return {
      id: raw.id,
      courtId: raw.courtId,
      startTime: raw.startTime,
      endTime: raw.endTime,
      daysOfWeek: [...raw.daysOfWeek],
      price: raw.price,
      label: raw.label ?? null,
    } satisfies CourtPriceRule;
  });

  return {
    ...seed,
    ...persisted,
    clubs,
    users,
    clients,
    players,
    tournaments,
    categories,
    registrations,
    courts,
    courtReservations,
    courtPriceRules,
  };
}

export class CoreApiDb {
  readonly clubs: CollectionStore<Club>;
  readonly users: CollectionStore<User>;
  readonly clubMembers: CollectionStore<ClubMember>;
  readonly players: CollectionStore<Player>;
  readonly clients: CollectionStore<Client>;
  readonly courtReservations: CollectionStore<CourtReservation>;
  readonly tournaments: CollectionStore<Tournament>;
  readonly categories: CollectionStore<TournamentCategory>;
  readonly pairs: CollectionStore<TournamentPair>;
  readonly registrations: CollectionStore<TournamentRegistration>;
  readonly rulesets: CollectionStore<TournamentRuleset>;
  readonly groups: CollectionStore<TournamentGroup>;
  readonly standings: CollectionStore<GroupStanding>;
  readonly rounds: CollectionStore<TournamentRound>;
  readonly matches: CollectionStore<Match>;
  readonly matchSlots: CollectionStore<MatchSlot>;
  readonly courts: CollectionStore<Court>;
  readonly courtPriceRules: CollectionStore<CourtPriceRule>;
  readonly courtAvailability: CollectionStore<CourtAvailability>;
  readonly pairAvailability: CollectionStore<PairAvailability>;

  private persistScheduled = false;

  constructor(snapshot: CoreApiSnapshot) {
    const onChange = () => this.schedulePersist();
    this.clubs = new CollectionStore("clubs", snapshot.clubs, onChange);
    this.users = new CollectionStore("users", snapshot.users, onChange);
    this.clubMembers = new CollectionStore("clubMembers", snapshot.clubMembers, onChange);
    this.players = new CollectionStore("players", snapshot.players, onChange);
    this.clients = new CollectionStore("clients", snapshot.clients, onChange);
    this.courtReservations = new CollectionStore(
      "courtReservations",
      snapshot.courtReservations,
      onChange,
    );
    this.tournaments = new CollectionStore("tournaments", snapshot.tournaments, onChange);
    this.categories = new CollectionStore("categories", snapshot.categories, onChange);
    this.pairs = new CollectionStore("pairs", snapshot.pairs, onChange);
    this.registrations = new CollectionStore(
      "registrations",
      snapshot.registrations,
      onChange,
    );
    this.rulesets = new CollectionStore("rulesets", snapshot.rulesets, onChange);
    this.groups = new CollectionStore("groups", snapshot.groups, onChange);
    this.standings = new CollectionStore("standings", snapshot.standings, onChange);
    this.rounds = new CollectionStore("rounds", snapshot.rounds, onChange);
    this.matches = new CollectionStore("matches", snapshot.matches, onChange);
    this.matchSlots = new CollectionStore("matchSlots", snapshot.matchSlots, onChange);
    this.courts = new CollectionStore("courts", snapshot.courts, onChange);
    this.courtPriceRules = new CollectionStore(
      "courtPriceRules",
      snapshot.courtPriceRules,
      onChange,
    );
    this.courtAvailability = new CollectionStore(
      "courtAvailability",
      snapshot.courtAvailability,
      onChange,
    );
    this.pairAvailability = new CollectionStore(
      "pairAvailability",
      snapshot.pairAvailability,
      onChange,
    );
  }

  toSnapshot(): CoreApiSnapshot {
    return {
      clubs: this.clubs.getAll(),
      users: this.users.getAll(),
      clubMembers: this.clubMembers.getAll(),
      players: this.players.getAll(),
      clients: this.clients.getAll(),
      courtReservations: this.courtReservations.getAll(),
      tournaments: this.tournaments.getAll(),
      categories: this.categories.getAll(),
      pairs: this.pairs.getAll(),
      registrations: this.registrations.getAll(),
      rulesets: this.rulesets.getAll(),
      groups: this.groups.getAll(),
      standings: this.standings.getAll(),
      rounds: this.rounds.getAll(),
      matches: this.matches.getAll(),
      matchSlots: this.matchSlots.getAll(),
      courts: this.courts.getAll(),
      courtPriceRules: this.courtPriceRules.getAll(),
      courtAvailability: this.courtAvailability.getAll(),
      pairAvailability: this.pairAvailability.getAll(),
    };
  }

  resetToSeed(): void {
    clearPersistedSnapshot();
    const seed = seedSnapshot();
    this.clubs.replaceAll(seed.clubs);
    this.users.replaceAll(seed.users);
    this.clubMembers.replaceAll(seed.clubMembers);
    this.players.replaceAll(seed.players);
    this.clients.replaceAll(seed.clients);
    this.courtReservations.replaceAll(seed.courtReservations);
    this.tournaments.replaceAll(seed.tournaments);
    this.categories.replaceAll(seed.categories);
    this.pairs.replaceAll(seed.pairs);
    this.registrations.replaceAll(seed.registrations);
    this.rulesets.replaceAll(seed.rulesets);
    this.groups.replaceAll(seed.groups);
    this.standings.replaceAll(seed.standings);
    this.rounds.replaceAll(seed.rounds);
    this.matches.replaceAll(seed.matches);
    this.matchSlots.replaceAll(seed.matchSlots);
    this.courts.replaceAll(seed.courts);
    this.courtPriceRules.replaceAll(seed.courtPriceRules);
    this.courtAvailability.replaceAll(seed.courtAvailability);
    this.pairAvailability.replaceAll(seed.pairAvailability);
  }

  private schedulePersist(): void {
    if (this.persistScheduled) return;
    this.persistScheduled = true;
    queueMicrotask(() => {
      this.persistScheduled = false;
      persistSnapshot(this.toSnapshot());
    });
  }
}

let dbInstance: CoreApiDb | null = null;

export function getCoreApiDb(): CoreApiDb {
  if (!dbInstance) {
    const persisted = loadPersistedSnapshot();
    dbInstance = new CoreApiDb(hydrateSnapshot(persisted));
  }
  return dbInstance;
}

export function resetCoreApiDb(): CoreApiDb {
  const db = getCoreApiDb();
  db.resetToSeed();
  return db;
}
