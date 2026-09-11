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
import courtAvailabilitySeed from "../data/courtAvailability.json";
import pairAvailabilitySeed from "../data/pairAvailability.json";
import type {
  Client,
  Club,
  ClubMember,
  CoreApiSnapshot,
  Court,
  CourtAvailability,
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

function hydrateSnapshot(
  persisted: CoreApiSnapshot | null,
): CoreApiSnapshot {
  const seed = seedSnapshot();
  if (!persisted) return seed;
  const partial = persisted as Partial<CoreApiSnapshot>;
  const clients = (Array.isArray(partial.clients) ? partial.clients : seed.clients).map(
    withClientDefaults,
  );
  const clubs = (partial.clubs ?? seed.clubs).map(withLocation);
  const users = (partial.users ?? seed.users).map(withLocation);
  return {
    ...seed,
    ...persisted,
    clubs,
    users,
    clients,
    courtReservations: Array.isArray(partial.courtReservations)
      ? partial.courtReservations
      : seed.courtReservations,
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
