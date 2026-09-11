import type { CoreApiDb } from "../store/db";
import type {
  Club,
  Court,
  GenerateGroupsConfig,
  GroupStanding,
  Match,
  MatchResultInput,
  MatchRules,
  MatchSlot,
  MatchStatus,
  PairAvailability,
  Player,
  ScheduleResult,
  SyncCategoryStructureOptions,
  Tournament,
  TournamentCategory,
  TournamentGroup,
  TournamentPair,
  TournamentRegistration,
  TournamentRound,
  TournamentRuleset,
} from "../types";
import {
  advanceBracketWinner,
  applyResultToMatch,
  applyWalkoverToMatch,
  buildEliminationBracket,
  computeStandings,
  createId,
  delay,
  generateGroups,
  generateRoundRobinMatches,
  groupsRespectPairsPerGroup,
  appendPairsToZones,
  assignPairsToZonesPreservingPlayed,
  matchPairingKey,
  intersectWindows,
  resolveGroupConfig,
  validateGroupConfig,
  walkoverSetsForWinner,
  type AvailabilityWindow,
} from "../domain/tournamentLogic";
import {
  isMatchResultComplete,
  validateMatchResultSets,
} from "../domain/matchResultRules";
import { validateMatchStatusTransition } from "../domain/matchPlayStatus";
import { findScheduleConflicts, matchesOverlap } from "../domain/scheduleConflicts";
import type { ScheduleConflict } from "../domain/scheduleConflicts";
import {
  buildClubClientDetail,
  ensureClientFromPlayer,
  listClubClientSummaries,
} from "../domain/clients";
import type { ClubClientDetail, ClubClientSummary } from "../types";
import type { PageQuery, PaginatedResult } from "../domain/pagination";

export class TournamentEngine {
  private readonly db: CoreApiDb;

  constructor(db: CoreApiDb) {
    this.db = db;
  }

  async listClubs(): Promise<Club[]> {
    await delay();
    return this.db.clubs.getAll();
  }

  async getClub(id: string): Promise<Club | null> {
    await delay();
    return this.db.clubs.getById(id);
  }

  async listPlayers(): Promise<Player[]> {
    await delay();
    return this.db.players.getAll().map((p) => ({
      ...p,
      email: p.email ?? null,
    }));
  }

  async searchPlayers(
    query: string,
    options?: { signal?: AbortSignal },
  ): Promise<Player[]> {
    await delay(350);
    if (options?.signal?.aborted) {
      const err = new Error("Aborted");
      err.name = "AbortError";
      throw err;
    }
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return this.db.players
      .getAll()
      .map((p) => ({ ...p, email: p.email ?? null }))
      .filter((p) => {
        const hay = `${p.displayName} ${p.firstName} ${p.lastName} ${p.phone ?? ""} ${p.email ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 12);
  }

  async createPlayer(input: import("../types").CreatePlayerInput): Promise<Player> {
    await delay();
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    if (!firstName || !lastName) {
      throw new Error("Nombre y apellido son obligatorios");
    }
    const player: Player = {
      id: createId("player"),
      userId: input.userId ?? null,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      categoryLevel: input.categoryLevel ?? "6ta",
      createdAt: new Date().toISOString(),
    };
    return this.db.players.upsert(player);
  }

  async registerPair(
    input: import("../types").RegisterPairInput,
  ): Promise<{ pair: TournamentPair; registration: TournamentRegistration }> {
    await delay();
    const category = this.db.categories.getById(input.tournamentCategoryId);
    if (!category) throw new Error("Categoría no encontrada");
    const p1 = this.db.players.getById(input.player1Id);
    if (!p1) throw new Error("Jugador 1 no encontrado");
    const player2Id = input.player2Id ?? null;
    if (player2Id) {
      const p2 = this.db.players.getById(player2Id);
      if (!p2) throw new Error("Jugador 2 no encontrado");
      if (player2Id === input.player1Id) {
        throw new Error("Los dos jugadores deben ser distintos");
      }
    }

    const existingPairs = this.db.pairs.find(
      (p) => p.tournamentCategoryId === input.tournamentCategoryId && p.status === "active",
    );
    for (const pair of existingPairs) {
      const ids = [pair.player1Id, pair.player2Id].filter(Boolean);
      if (ids.includes(input.player1Id) || (player2Id && ids.includes(player2Id))) {
        throw new Error("Uno de los jugadores ya está inscripto en esta categoría");
      }
    }

    const pair: TournamentPair = {
      id: createId("pair"),
      tournamentCategoryId: input.tournamentCategoryId,
      player1Id: input.player1Id,
      player2Id,
      user1Id: p1.userId,
      user2Id: player2Id ? this.db.players.getById(player2Id)?.userId ?? null : null,
      seed: existingPairs.length + 1,
      status: "active",
      sidePreference: player2Id ? null : input.sidePreference ?? "any",
    };
    this.db.pairs.upsert(pair);

    const registration: TournamentRegistration = {
      id: createId("reg"),
      tournamentCategoryId: input.tournamentCategoryId,
      pairId: pair.id,
      status: "CONFIRMED",
      registeredAt: new Date().toISOString(),
      statusNote: null,
      statusChangedAt: null,
    };
    this.db.registrations.upsert(registration);

    const tournament = this.db.tournaments.getById(category.tournamentId);
    if (tournament) {
      ensureClientFromPlayer(this.db, tournament.clubId, p1);
      if (player2Id) {
        const p2 = this.db.players.getById(player2Id);
        if (p2) ensureClientFromPlayer(this.db, tournament.clubId, p2);
      }
    }

    return { pair, registration };
  }

  async updatePairPlayers(
    pairId: string,
    input: import("../types").UpdatePairPlayersInput,
  ): Promise<TournamentPair> {
    await delay();
    const pair = this.db.pairs.getById(pairId);
    if (!pair) throw new Error("Pareja no encontrada");

    const player1Id = input.player1Id ?? pair.player1Id;
    const player2Id =
      input.player2Id !== undefined ? input.player2Id : pair.player2Id;
    if (!player1Id) throw new Error("La pareja necesita al menos un jugador");
    const p1 = this.db.players.getById(player1Id);
    if (!p1) throw new Error("Jugador 1 no encontrado");
    if (player2Id) {
      const p2 = this.db.players.getById(player2Id);
      if (!p2) throw new Error("Jugador 2 no encontrado");
      if (player2Id === player1Id) {
        throw new Error("Los dos jugadores deben ser distintos");
      }
    }

    const siblings = this.db.pairs.find(
      (p) =>
        p.tournamentCategoryId === pair.tournamentCategoryId &&
        p.status === "active" &&
        p.id !== pairId,
    );
    for (const other of siblings) {
      const ids = [other.player1Id, other.player2Id].filter(Boolean);
      if (ids.includes(player1Id) || (player2Id && ids.includes(player2Id))) {
        throw new Error("Uno de los jugadores ya está inscripto en esta categoría");
      }
    }

    const updated = this.db.pairs.upsert({
      ...pair,
      player1Id,
      player2Id,
      user1Id: p1.userId,
      user2Id: player2Id
        ? this.db.players.getById(player2Id)?.userId ?? null
        : null,
      sidePreference: player2Id
        ? null
        : (input.sidePreference ?? pair.sidePreference ?? "any"),
    });

    const category = this.db.categories.getById(pair.tournamentCategoryId);
    const tournament = category
      ? this.db.tournaments.getById(category.tournamentId)
      : null;
    if (tournament) {
      ensureClientFromPlayer(this.db, tournament.clubId, p1);
      if (player2Id) {
        const p2 = this.db.players.getById(player2Id);
        if (p2) ensureClientFromPlayer(this.db, tournament.clubId, p2);
      }
    }

    return updated;
  }

  async listClubClients(
    clubId: string,
    query?: PageQuery,
  ): Promise<PaginatedResult<ClubClientSummary>> {
    await delay(480);
    return listClubClientSummaries(this.db, clubId, query);
  }

  async getClubClientDetail(
    clubId: string,
    clientId: string,
  ): Promise<ClubClientDetail | null> {
    await delay();
    const client = this.db.clients.getById(clientId);
    if (!client || client.clubId !== clubId) return null;
    return buildClubClientDetail(this.db, client);
  }

  async listTournaments(clubId?: string): Promise<Tournament[]> {
    await delay();
    const all = this.db.tournaments.getAll();
    return clubId ? all.filter((t) => t.clubId === clubId) : all;
  }

  async getTournament(id: string): Promise<Tournament | null> {
    await delay();
    return this.db.tournaments.getById(id);
  }

  async createTournament(
    input: Omit<Tournament, "id" | "createdAt" | "updatedAt">,
  ): Promise<Tournament> {
    await delay();
    const now = new Date().toISOString();
    const tournament: Tournament = {
      ...input,
      dailyStartTime: input.dailyStartTime || "10:00",
      dailyEndTime: input.dailyEndTime || "22:00",
      id: createId("tournament"),
      createdAt: now,
      updatedAt: now,
    };
    return this.db.tournaments.upsert(tournament);
  }

  async updateTournament(
    id: string,
    patch: Partial<Omit<Tournament, "id" | "createdAt" | "clubId">>,
  ): Promise<Tournament> {
    await delay();
    const current = this.db.tournaments.getById(id);
    if (!current) throw new Error("Torneo no encontrado");
    return this.db.tournaments.upsert({
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  }

  async updateCategory(
    id: string,
    patch: Partial<Omit<TournamentCategory, "id" | "tournamentId">>,
  ): Promise<TournamentCategory> {
    await delay();
    const current = this.db.categories.getById(id);
    if (!current) throw new Error("Categoría no encontrada");
    return this.db.categories.upsert({ ...current, ...patch });
  }

  /**
   * Regenera grupos, partidos de grupo y bracket provisional según
   * inscripciones confirmadas + pairsPerGroup del ruleset.
   * Las zonas se derivan: ceil(parejas / pairsPerGroup); la última puede quedar corta.
   */
  async syncCategoryStructure(
    categoryId: string,
    options?: SyncCategoryStructureOptions,
  ): Promise<{
    synced: boolean;
    message: string;
    groups: TournamentGroup[];
    matches: Match[];
  }> {
    await delay();
    const regs = this.db.registrations.find(
      (r) => r.tournamentCategoryId === categoryId && r.status === "CONFIRMED",
    );
    const pairIds = new Set(regs.map((r) => r.pairId));
    const pairs = this.db.pairs.find(
      (p) =>
        p.tournamentCategoryId === categoryId &&
        p.status === "active" &&
        pairIds.has(p.id) &&
        Boolean(p.player1Id && p.player2Id),
    );

    const ruleset = this.db.rulesets.find((r) => r.tournamentCategoryId === categoryId)[0];
    const usable = resolveGroupConfig(pairs.length, {
      pairsPerGroup: ruleset?.pairsPerGroup ?? 4,
      qualifyPerGroup: ruleset?.qualifyPerGroup ?? 2,
    });

    if (!usable) {
      return {
        synced: false,
        message: `Hay ${pairs.length} pareja(s) confirmada(s) completa(s). Hacen falta al menos 2 para armar zonas.`,
        groups: this.db.groups.find((g) => g.tournamentCategoryId === categoryId),
        matches: this.db.matches.find((m) => m.tournamentCategoryId === categoryId),
      };
    }

    const existingGroups = this.db.groups.find((g) => g.tournamentCategoryId === categoryId);
    const assigned = new Set(existingGroups.flatMap((g) => g.pairIds));
    const hasUnassigned = pairs.some((p) => !assigned.has(p.id));
    const packingOk = groupsRespectPairsPerGroup(existingGroups, usable.pairsPerGroup);

    const hasPlayedGroup = this.db.matches
      .find((m) => m.tournamentCategoryId === categoryId && m.phase === "GROUP")
      .some(
        (m) =>
          m.status === "finished" ||
          m.status === "walkover" ||
          m.status === "inProgress",
      );

    const softPreserve = options?.preserveResults !== false;
    let structureNote = "";

    if (!hasPlayedGroup) {
      await this.generateGroupsForCategory(categoryId, usable);
      await this.generateGroupMatches(categoryId);
    } else {
      const playedMatches = this.db.matches.find(
        (m) =>
          m.tournamentCategoryId === categoryId &&
          m.phase === "GROUP" &&
          (m.status === "finished" ||
            m.status === "walkover" ||
            m.status === "inProgress"),
      );

      if (softPreserve && packingOk && !hasUnassigned) {
        structureNote = " Se conservaron zonas y resultados ya jugados.";
      } else if (softPreserve && packingOk && hasUnassigned) {
        const unassignedIds = pairs
          .filter((p) => !assigned.has(p.id))
          .map((p) => p.id);
        const buckets = appendPairsToZones(
          existingGroups,
          unassignedIds,
          usable.pairsPerGroup,
        );
        this.applyZoneMembership(categoryId, buckets, pairs);
        structureNote =
          " Se incorporaron parejas nuevas sin tocar los VS ya jugados.";
      } else if (softPreserve && !packingOk) {
        // Cupo de config distinto al armado actual: reaplica cupo manteniendo VS jugados.
        const buckets = assignPairsToZonesPreservingPlayed(
          pairs.map((p) => p.id),
          usable.pairsPerGroup,
          playedMatches,
          existingGroups,
        );
        this.applyZoneMembership(categoryId, buckets, pairs);
        structureNote =
          " Se ajustaron las zonas al nuevo cupo; se mantuvieron los VS ya jugados.";
      } else {
        // Regenerar: redistribuye libres / cupo, sin partir VS ya jugados.
        const buckets = assignPairsToZonesPreservingPlayed(
          pairs.map((p) => p.id),
          usable.pairsPerGroup,
          playedMatches,
          existingGroups,
        );
        this.applyZoneMembership(categoryId, buckets, pairs);
        structureNote =
          " Se rearmaron zonas respetando el cupo; se mantuvieron los VS ya jugados.";
      }

      this.reconcileGroupMatchesPreservingPlayed(categoryId);
    }

    const groups = this.db.groups.find((g) => g.tournamentCategoryId === categoryId);
    if (groups.length > 0) {
      const elimBusy = this.db.matches
        .find((m) => m.tournamentCategoryId === categoryId && m.phase !== "GROUP")
        .some((m) => m.status === "finished" || m.status === "walkover" || m.status === "inProgress");
      if (!elimBusy) {
        await this.generateBracket(categoryId);
      }
      await this.scheduleCategory(categoryId);
    }

    const rulesetAfter = this.db.rulesets.find(
      (r) => r.tournamentCategoryId === categoryId,
    )[0];
    if (rulesetAfter) {
      this.db.rulesets.upsert({
        ...rulesetAfter,
        groupCount: groups.length,
        pairsPerGroup: usable.pairsPerGroup,
        qualifyPerGroup: usable.qualifyPerGroup,
      });
    }

    return {
      synced: true,
      message: `Estructura actualizada: ${groups.length} zonas · ${usable.qualifyPerGroup * groups.length} clasificados.${structureNote}`,
      groups,
      matches: this.db.matches.find((m) => m.tournamentCategoryId === categoryId),
    };
  }

  /** Aplica membresía de zonas reutilizando ids/orden cuando se puede. */
  private applyZoneMembership(
    categoryId: string,
    buckets: string[][],
    pairs: TournamentPair[],
  ): void {
    const existing = this.db.groups
      .find((g) => g.tournamentCategoryId === categoryId)
      .sort((a, b) => a.order - b.order);
    const pairSet = new Set(pairs.map((p) => p.id));

    for (let i = 0; i < buckets.length; i += 1) {
      const pairIds = buckets[i]!.filter((id) => pairSet.has(id));
      const prev = existing[i];
      if (prev) {
        this.db.groups.upsert({
          ...prev,
          name: `Zona ${String.fromCharCode(65 + i)}`,
          order: i + 1,
          pairIds,
        });
      } else {
        this.db.groups.upsert({
          id: createId("group"),
          tournamentCategoryId: categoryId,
          name: `Zona ${String.fromCharCode(65 + i)}`,
          order: i + 1,
          pairIds,
        });
      }
    }

    for (let i = buckets.length; i < existing.length; i += 1) {
      const g = existing[i]!;
      this.db.standings.removeWhere((s) => s.groupId === g.id);
      this.db.groups.removeWhere((x) => x.id === g.id);
    }

    const groups = this.db.groups.find((g) => g.tournamentCategoryId === categoryId);
    for (const group of groups) {
      this.db.standings.removeWhere((s) => s.groupId === group.id);
      for (const pairId of group.pairIds) {
        this.db.standings.upsert({
          id: createId("standing"),
          groupId: group.id,
          pairId,
          played: 0,
          won: 0,
          lost: 0,
          points: 0,
          setsWon: 0,
          setsLost: 0,
          gamesWon: 0,
          gamesLost: 0,
          position: 0,
        });
      }
    }
  }

  /**
   * Mantiene partidos de zona ya jugados (y pendientes válidos); solo crea VS faltantes.
   */
  private reconcileGroupMatchesPreservingPlayed(categoryId: string): void {
    const groups = this.db.groups.find((g) => g.tournamentCategoryId === categoryId);
    const groupByPair = new Map<string, TournamentGroup>();
    for (const g of groups) {
      for (const pairId of g.pairIds) groupByPair.set(pairId, g);
    }

    const existing = this.db.matches.find(
      (m) => m.tournamentCategoryId === categoryId && m.phase === "GROUP",
    );
    const keptKeys = new Set<string>();

    for (const match of existing) {
      const a = match.pairAId;
      const b = match.pairBId;
      const isPlayed =
        match.status === "finished" ||
        match.status === "walkover" ||
        match.status === "inProgress";

      if (!a || !b) {
        if (!isPlayed) this.db.matches.removeWhere((m) => m.id === match.id);
        continue;
      }

      const groupA = groupByPair.get(a);
      const groupB = groupByPair.get(b);
      const sameGroup = Boolean(groupA && groupB && groupA.id === groupB.id);

      if (isPlayed) {
        const groupId = sameGroup
          ? groupA!.id
          : (groupA?.id ?? groupB?.id ?? match.groupId);
        this.db.matches.upsert({ ...match, groupId });
        keptKeys.add(matchPairingKey(a, b));
        continue;
      }

      if (match.status === "scheduled" && sameGroup) {
        this.db.matches.upsert({ ...match, groupId: groupA!.id });
        keptKeys.add(matchPairingKey(a, b));
        continue;
      }

      this.db.matches.removeWhere((m) => m.id === match.id);
    }

    for (const group of groups) {
      for (const generated of generateRoundRobinMatches(categoryId, group)) {
        if (!generated.pairAId || !generated.pairBId) continue;
        const key = matchPairingKey(generated.pairAId, generated.pairBId);
        if (keptKeys.has(key)) continue;
        this.db.matches.upsert(generated);
        keptKeys.add(key);
      }
    }

    const ruleset = this.db.rulesets.find((r) => r.tournamentCategoryId === categoryId)[0];
    for (const group of groups) {
      const groupMatches = this.db.matches.find((m) => m.groupId === group.id);
      const standings = computeStandings(
        group,
        groupMatches,
        ruleset?.tieBreakers ?? ["SET_DIFFERENCE", "POINTS", "GAME_DIFFERENCE"],
      );
      this.db.standings.removeWhere((s) => s.groupId === group.id);
      for (const row of standings) this.db.standings.upsert(row);
    }
  }

  async updateMatchSchedule(
    matchId: string,
    input: { scheduledAt: string | null; courtId: string | null },
    options?: { force?: boolean; pairLabels?: Record<string, string> },
  ): Promise<{ match: Match; conflicts: ScheduleConflict[] }> {
    await delay();
    const match = this.db.matches.getById(matchId);
    if (!match) throw new Error("Partido no encontrado");

    const category = this.db.categories.getById(match.tournamentCategoryId);
    const tournament = category
      ? this.db.tournaments.getById(category.tournamentId)
      : null;
    const courts = tournament
      ? this.db.courts.find((c) => c.clubId === tournament.clubId && c.status === "active")
      : [];
    const categoryMatches = this.db.matches.find(
      (m) => m.tournamentCategoryId === match.tournamentCategoryId,
    );

    const conflicts = findScheduleConflicts({
      matchId,
      scheduledAt: input.scheduledAt,
      courtId: input.courtId,
      matches: categoryMatches,
      courts,
      pairLabels: options?.pairLabels,
    });

    if (conflicts.length > 0 && !options?.force) {
      const err = new Error(conflicts.map((c) => c.message).join("\n")) as Error & {
        conflicts: ScheduleConflict[];
        code: string;
      };
      err.conflicts = conflicts;
      err.code = "SCHEDULE_CONFLICT";
      throw err;
    }

    // Force con cancha: liberar esa cancha en partidos solapados (se la "quita" a los otros).
    if (options?.force && input.courtId && input.scheduledAt) {
      for (const other of categoryMatches) {
        if (other.id === matchId) continue;
        if (other.status === "cancelled") continue;
        if (!other.scheduledAt || other.courtId !== input.courtId) continue;
        if (
          !matchesOverlap(
            input.scheduledAt,
            other.scheduledAt,
            undefined,
          )
        ) {
          continue;
        }
        this.db.matches.upsert({
          ...other,
          courtId: null,
        });
      }
    }

    const updated = this.db.matches.upsert({
      ...match,
      scheduledAt: input.scheduledAt,
      courtId: input.courtId,
      scheduleManual: true,
    });
    return { match: updated, conflicts };
  }

  async setMatchStatus(matchId: string, status: MatchStatus): Promise<Match> {
    await delay();
    const match = this.db.matches.getById(matchId);
    if (!match) throw new Error("Partido no encontrado");

    const transition = validateMatchStatusTransition(match, status);
    if (!transition.ok) throw new Error(transition.message);

    return this.db.matches.upsert({ ...match, status });
  }

  async listCategories(tournamentId: string): Promise<TournamentCategory[]> {
    await delay();
    return this.db.categories.find((c) => c.tournamentId === tournamentId);
  }

  async getCategory(id: string): Promise<TournamentCategory | null> {
    await delay();
    return this.db.categories.getById(id);
  }

  async createCategory(
    input: Omit<TournamentCategory, "id">,
  ): Promise<TournamentCategory> {
    await delay();
    return this.db.categories.upsert({ ...input, id: createId("cat") });
  }

  async listPairs(categoryId: string): Promise<TournamentPair[]> {
    await delay();
    return this.db.pairs
      .find((p) => p.tournamentCategoryId === categoryId)
      .map((p) => ({
        ...p,
        player2Id: p.player2Id ?? null,
        user1Id: p.user1Id ?? null,
        user2Id: p.user2Id ?? null,
        sidePreference: p.sidePreference ?? null,
      }));
  }

  async listRegistrations(categoryId: string): Promise<TournamentRegistration[]> {
    await delay();
    return this.db.registrations
      .find((r) => r.tournamentCategoryId === categoryId)
      .map((r) => ({
        ...r,
        statusNote: r.statusNote ?? null,
        statusChangedAt: r.statusChangedAt ?? null,
      }));
  }

  async getRuleset(categoryId: string): Promise<TournamentRuleset | null> {
    await delay();
    return this.db.rulesets.find((r) => r.tournamentCategoryId === categoryId)[0] ?? null;
  }

  async upsertRuleset(ruleset: TournamentRuleset): Promise<TournamentRuleset> {
    await delay();
    return this.db.rulesets.upsert(ruleset);
  }

  async listGroups(categoryId: string): Promise<TournamentGroup[]> {
    await delay();
    return this.db.groups
      .find((g) => g.tournamentCategoryId === categoryId)
      .sort((a, b) => a.order - b.order);
  }

  async listStandings(categoryId: string): Promise<GroupStanding[]> {
    await delay();
    const groupIds = new Set(
      this.db.groups
        .find((g) => g.tournamentCategoryId === categoryId)
        .map((g) => g.id),
    );
    return this.db.standings
      .getAll()
      .filter((s) => groupIds.has(s.groupId))
      .sort((a, b) => a.position - b.position);
  }

  async listMatches(categoryId: string): Promise<Match[]> {
    await delay();
    return this.db.matches.find((m) => m.tournamentCategoryId === categoryId);
  }

  async listRounds(categoryId: string): Promise<TournamentRound[]> {
    await delay();
    return this.db.rounds
      .find((r) => r.tournamentCategoryId === categoryId)
      .sort((a, b) => a.order - b.order);
  }

  async getBracket(categoryId: string): Promise<{
    rounds: TournamentRound[];
    matches: Match[];
    slots: MatchSlot[];
  }> {
    await delay();
    const rounds = await this.listRounds(categoryId);
    const matches = this.db.matches.find(
      (m) => m.tournamentCategoryId === categoryId && m.phase !== "GROUP",
    );
    const matchIds = new Set(matches.map((m) => m.id));
    const slots = this.db.matchSlots.getAll().filter((s) => matchIds.has(s.matchId));
    return { rounds, matches, slots };
  }

  /**
   * Recurso único del cuadro: datos ya armados para el gráfico.
   * Refresca bracket si la eliminación aún no tiene partidos en juego.
   */
  async getCuadroBoard(
    categoryId: string,
  ): Promise<import("../types").CuadroBoardView> {
    await delay(120);
    const ctx = this.buildCategoryBoardContext(categoryId);

    const elimBusy = ctx.allMatches
      .filter((m) => m.phase !== "GROUP")
      .some(
        (m) =>
          m.status === "finished" ||
          m.status === "walkover" ||
          m.status === "inProgress",
      );
    if (ctx.groups.length > 0 && !elimBusy) {
      await this.generateBracket(categoryId);
    }

    const bracket = await this.getBracket(categoryId);
    return {
      categoryId,
      generatedAt: new Date().toISOString(),
      groups: ctx.groups,
      groupMatches: ctx.groupMatches,
      rounds: bracket.rounds,
      elimMatches: bracket.matches,
      slots: bracket.slots,
      pairLabels: ctx.pairLabels,
      pairPlayerNames: ctx.pairPlayerNames,
      matchRules: ctx.matchRules,
      unassignedPairs: ctx.unassignedPairs,
      notice: ctx.structureNotice,
    };
  }

  async getZonesBoard(
    categoryId: string,
  ): Promise<import("../types").ZonesBoardView> {
    await delay(100);
    const ctx = this.buildCategoryBoardContext(categoryId);
    const category = this.db.categories.getById(categoryId);
    const tournament = category
      ? this.db.tournaments.getById(category.tournamentId)
      : null;
    const courts = tournament
      ? this.db.courts.find((c) => c.clubId === tournament.clubId)
      : [];
    const standings = this.db.standings
      .getAll()
      .filter((s) => ctx.groups.some((g) => g.id === s.groupId));

    return {
      categoryId,
      generatedAt: new Date().toISOString(),
      groups: ctx.groups,
      groupMatches: ctx.groupMatches,
      standings,
      pairLabels: ctx.pairLabels,
      pairPlayerNames: ctx.pairPlayerNames,
      matchRules: ctx.matchRules,
      courts,
      allMatches: ctx.allMatches,
      qualifyPerGroup: ctx.qualifyPerGroup,
      pairsPerGroup: ctx.pairsPerGroup,
      unassignedPairs: ctx.unassignedPairs,
      notice: ctx.structureNotice,
    };
  }

  async getParticipantsBoard(
    categoryId: string,
  ): Promise<import("../types").ParticipantsBoardView> {
    await delay(100);
    const ctx = this.buildCategoryBoardContext(categoryId);
    const allRegs = this.db.registrations.find(
      (r) => r.tournamentCategoryId === categoryId,
    );
    const regByPair = new Map(allRegs.map((r) => [r.pairId, r]));
    const allPairs = this.db.pairs.find(
      (p) => p.tournamentCategoryId === categoryId && p.status !== "withdrawn",
    );

    const hasPlayed = ctx.groupMatches.some(
      (m) =>
        m.status === "finished" ||
        m.status === "walkover" ||
        m.status === "inProgress",
    );
    const category = this.db.categories.getById(categoryId);
    const tournament = category
      ? this.db.tournaments.getById(category.tournamentId)
      : null;
    const tournamentStarted =
      tournament?.status === "inProgress" ||
      tournament?.status === "finished" ||
      hasPlayed;

    const rows = allPairs.map((pair) => {
      const registration = regByPair.get(pair.id) ?? null;
      const incomplete = !pair.player2Id;
      const disqualified =
        registration?.status === "DISQUALIFIED" || pair.status === "disqualified";
      return {
        pair,
        registration,
        label: ctx.pairLabels[pair.id] ?? pair.id,
        playerNames: ctx.pairPlayerNames[pair.id] ?? (["?", "?"] as [string, string]),
        incomplete,
        disqualified,
      };
    });

    const incompleteCount = rows.filter((r) => r.incomplete).length;
    let notice: string | null = null;
    if (incompleteCount > 0) {
      notice = `${incompleteCount} pareja(s) incompleta(s): no entran a zonas hasta tener dos jugadores.`;
    }

    return {
      categoryId,
      generatedAt: new Date().toISOString(),
      rows,
      tournamentStarted,
      notice,
    };
  }

  async getMatchesBoard(
    categoryId: string,
  ): Promise<import("../types").MatchesBoardView> {
    await delay(100);
    const ctx = this.buildCategoryBoardContext(categoryId);
    const category = this.db.categories.getById(categoryId);
    const tournament = category
      ? this.db.tournaments.getById(category.tournamentId)
      : null;
    const courts = tournament
      ? this.db.courts.find((c) => c.clubId === tournament.clubId)
      : [];
    const courtLabels: Record<string, string> = {};
    for (const c of courts) courtLabels[c.id] = c.name;

    const elimMatches = ctx.allMatches.filter((m) => m.phase !== "GROUP");

    return {
      categoryId,
      generatedAt: new Date().toISOString(),
      groupMatches: ctx.groupMatches,
      elimMatches,
      pairLabels: ctx.pairLabels,
      courtLabels,
      matchRules: ctx.matchRules,
      notice: ctx.structureNotice,
    };
  }

  async getConfigBoard(
    categoryId: string,
  ): Promise<import("../types").ConfigBoardView> {
    await delay(80);
    const category = this.db.categories.getById(categoryId);
    if (!category) throw new Error("Categoría no encontrada");
    const tournament = this.db.tournaments.getById(category.tournamentId);
    if (!tournament) throw new Error("Torneo no encontrado");
    const ruleset =
      this.db.rulesets.find((r) => r.tournamentCategoryId === categoryId)[0] ??
      null;
    const hasPlayed = this.db.matches
      .find((m) => m.tournamentCategoryId === categoryId && m.phase === "GROUP")
      .some(
        (m) =>
          m.status === "finished" ||
          m.status === "walkover" ||
          m.status === "inProgress",
      );

    return {
      categoryId,
      generatedAt: new Date().toISOString(),
      tournament,
      category,
      ruleset,
      structureLocked: hasPlayed,
      pairsPerGroup: ruleset?.pairsPerGroup ?? 4,
      qualifyPerGroup: ruleset?.qualifyPerGroup ?? 2,
      notice: hasPlayed
        ? "Hay partidos de zona jugados: un cambio de cupo rearmará zonas conservando los VS ya jugados."
        : null,
    };
  }

  private buildCategoryBoardContext(categoryId: string): {
    groups: TournamentGroup[];
    groupMatches: Match[];
    allMatches: Match[];
    pairLabels: Record<string, string>;
    pairPlayerNames: Record<string, [string, string]>;
    matchRules: MatchRules;
    unassignedPairs: import("../types").CuadroBoardView["unassignedPairs"];
    structureNotice: string | null;
    pairsPerGroup: number;
    qualifyPerGroup: number;
  } {
    const groups = this.db.groups
      .find((g) => g.tournamentCategoryId === categoryId)
      .sort((a, b) => a.order - b.order);
    const allMatches = this.db.matches.find(
      (m) => m.tournamentCategoryId === categoryId,
    );
    const groupMatches = allMatches.filter((m) => m.phase === "GROUP");
    const ruleset = this.db.rulesets.find(
      (r) => r.tournamentCategoryId === categoryId,
    )[0];
    const matchRules: MatchRules = ruleset?.matchRules ?? {
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
    const pairsPerGroup = ruleset?.pairsPerGroup ?? 4;
    const qualifyPerGroup = ruleset?.qualifyPerGroup ?? 2;

    const regs = this.db.registrations.find(
      (r) => r.tournamentCategoryId === categoryId && r.status === "CONFIRMED",
    );
    const regPairIds = new Set(regs.map((r) => r.pairId));
    const pairs = this.db.pairs.find(
      (p) =>
        p.tournamentCategoryId === categoryId &&
        p.status === "active" &&
        regPairIds.has(p.id),
    );
    const assigned = new Set(groups.flatMap((g) => g.pairIds));
    const players = this.db.players.getAll();
    const playerName = (id: string | null) =>
      id ? (players.find((p) => p.id === id)?.displayName ?? "?") : "?";

    const pairLabels: Record<string, string> = {};
    const pairPlayerNames: Record<string, [string, string]> = {};
    for (const pair of pairs) {
      const p1 = playerName(pair.player1Id);
      const p2 = pair.player2Id
        ? playerName(pair.player2Id)
        : "Buscando pareja";
      pairLabels[pair.id] = `${p1} / ${p2}`;
      pairPlayerNames[pair.id] = [p1, p2];
    }
    // Labels for non-confirmed / withdrawn still useful in participantes
    for (const pair of this.db.pairs.find(
      (p) => p.tournamentCategoryId === categoryId,
    )) {
      if (pairLabels[pair.id]) continue;
      const p1 = playerName(pair.player1Id);
      const p2 = pair.player2Id
        ? playerName(pair.player2Id)
        : "Buscando pareja";
      pairLabels[pair.id] = `${p1} / ${p2}`;
      pairPlayerNames[pair.id] = [p1, p2];
    }

    const unassignedPairs = pairs
      .filter((p) => Boolean(p.player1Id && p.player2Id) && !assigned.has(p.id))
      .map((p) => ({
        pairId: p.id,
        label: pairLabels[p.id] ?? p.id,
        playerNames: pairPlayerNames[p.id] ?? (["?", "?"] as [string, string]),
      }));

    const incompleteCount = pairs.filter((p) => !p.player2Id).length;
    const packingOk = groupsRespectPairsPerGroup(groups, pairsPerGroup);
    let structureNotice: string | null = null;
    if (unassignedPairs.length > 0) {
      structureNotice = `${unassignedPairs.length} pareja(s) confirmada(s) aún no están en el cuadro de zonas.`;
    } else if (!packingOk && groups.length > 0) {
      structureNotice = `Las zonas no respetan el cupo de ${pairsPerGroup} parejas/zona. Al sincronizar se rearmarán conservando VS ya jugados.`;
    } else if (incompleteCount > 0) {
      structureNotice = `${incompleteCount} pareja(s) incompleta(s): no entran al cuadro hasta tener dos jugadores.`;
    }

    return {
      groups,
      groupMatches,
      allMatches,
      pairLabels,
      pairPlayerNames,
      matchRules,
      unassignedPairs,
      structureNotice,
      pairsPerGroup,
      qualifyPerGroup,
    };
  }

  async listCourts(clubId: string): Promise<Court[]> {
    await delay();
    return this.db.courts.find((c) => c.clubId === clubId);
  }

  async listPairAvailability(pairId: string): Promise<PairAvailability[]> {
    await delay();
    return this.db.pairAvailability.find((a) => a.pairId === pairId);
  }

  async setPairAvailability(
    items: Omit<PairAvailability, "id">[],
  ): Promise<PairAvailability[]> {
    await delay();
    const pairIds = [...new Set(items.map((i) => i.pairId))];
    for (const pairId of pairIds) {
      this.db.pairAvailability.removeWhere((a) => a.pairId === pairId);
    }
    return items.map((item) =>
      this.db.pairAvailability.upsert({ ...item, id: createId("pav") }),
    );
  }

  async generateGroupsForCategory(
    categoryId: string,
    config: GenerateGroupsConfig,
    zoneAnchors?: Record<string, number>,
  ): Promise<{ groups: TournamentGroup[]; validation: ReturnType<typeof validateGroupConfig> }> {
    await delay();
    const pairs = this.db.pairs.find(
      (p) => p.tournamentCategoryId === categoryId && p.status === "active",
    );
    const validation = validateGroupConfig(pairs.length, config);
    if (!validation.ok) {
      return { groups: [], validation };
    }

    this.db.standings.removeWhere((s) =>
      this.db.groups.getAll().some(
        (g) => g.id === s.groupId && g.tournamentCategoryId === categoryId,
      ),
    );
    this.db.matches.removeWhere(
      (m) => m.tournamentCategoryId === categoryId && m.phase === "GROUP",
    );
    this.db.groups.removeWhere((g) => g.tournamentCategoryId === categoryId);

    const groups = generateGroups(categoryId, pairs, config, zoneAnchors);
    for (const group of groups) {
      this.db.groups.upsert(group);
      for (const pairId of group.pairIds) {
        this.db.standings.upsert({
          id: createId("standing"),
          groupId: group.id,
          pairId,
          played: 0,
          won: 0,
          lost: 0,
          points: 0,
          setsWon: 0,
          setsLost: 0,
          gamesWon: 0,
          gamesLost: 0,
          position: 0,
        });
      }
    }

    const ruleset = this.db.rulesets.find((r) => r.tournamentCategoryId === categoryId)[0];
    if (ruleset) {
      this.db.rulesets.upsert({
        ...ruleset,
        groupCount: groups.length,
        pairsPerGroup: config.pairsPerGroup,
        qualifyPerGroup: config.qualifyPerGroup,
      });
    }

    return { groups, validation };
  }

  async generateGroupMatches(categoryId: string): Promise<Match[]> {
    await delay();
    this.db.matches.removeWhere(
      (m) => m.tournamentCategoryId === categoryId && m.phase === "GROUP",
    );
    const groups = this.db.groups.find((g) => g.tournamentCategoryId === categoryId);
    const created: Match[] = [];
    for (const group of groups) {
      for (const match of generateRoundRobinMatches(categoryId, group)) {
        this.db.matches.upsert(match);
        created.push(match);
      }
    }
    return created;
  }

  async submitMatchResult(matchId: string, input: MatchResultInput): Promise<Match> {
    await delay();
    const match = this.db.matches.getById(matchId);
    if (!match) throw new Error("Partido no encontrado");
    const ruleset = this.db.rulesets.find(
      (r) => r.tournamentCategoryId === match.tournamentCategoryId,
    )[0];
    if (ruleset?.matchRules) {
      const validation = validateMatchResultSets(input.sets, ruleset.matchRules);
      if (!validation.ok) throw new Error(validation.message);
      const expectedWinner =
        validation.winnerSide === "A" ? match.pairAId : match.pairBId;
      if (!expectedWinner || expectedWinner !== input.winnerPairId) {
        throw new Error("El ganador no coincide con el marcador según las reglas.");
      }
    }
    const updated = applyResultToMatch(match, input);
    this.db.matches.upsert(updated);

    if (updated.phase === "GROUP" && updated.groupId) {
      const group = this.db.groups.getById(updated.groupId);
      if (group) {
        const groupMatches = this.db.matches.find((m) => m.groupId === group.id);
        const standings = computeStandings(
          group,
          groupMatches,
          ruleset?.tieBreakers ?? ["SET_DIFFERENCE", "POINTS", "GAME_DIFFERENCE"],
        );
        this.db.standings.removeWhere((s) => s.groupId === group.id);
        for (const row of standings) this.db.standings.upsert(row);
      }
      const allGroupMatches = this.db.matches.find(
        (m) =>
          m.tournamentCategoryId === updated.tournamentCategoryId && m.phase === "GROUP",
      );
      const zoneStageComplete =
        allGroupMatches.length > 0 &&
        allGroupMatches.every((m) =>
          ruleset?.matchRules
            ? isMatchResultComplete(m, ruleset.matchRules) || m.status === "walkover"
            : m.status === "finished" || m.status === "walkover",
        );
      const elimBusy = this.db.matches
        .find(
          (m) =>
            m.tournamentCategoryId === updated.tournamentCategoryId && m.phase !== "GROUP",
        )
        .some(
          (m) =>
            m.status === "finished" ||
            m.status === "walkover" ||
            m.status === "inProgress",
        );
      if (zoneStageComplete && !elimBusy) {
        await this.generateBracket(updated.tournamentCategoryId);
        await this.scheduleCategory(updated.tournamentCategoryId);
      }
    } else {
      const slots = this.db.matchSlots.getAll();
      const matches = this.db.matches.getAll();
      const advanced = advanceBracketWinner(updated, slots, matches);
      this.db.matchSlots.replaceAll(advanced.slots);
      for (const m of advanced.matches) {
        if (m.tournamentCategoryId === updated.tournamentCategoryId) {
          this.db.matches.upsert(m);
        }
      }
    }

    return this.db.matches.getById(matchId)!;
  }

  async disqualifyRegistration(
    registrationId: string,
    note: string,
  ): Promise<TournamentRegistration> {
    await delay();
    const trimmed = note.trim();
    if (!trimmed) throw new Error("Indicá el motivo de la desclasificación.");

    const registration = this.db.registrations.getById(registrationId);
    if (!registration) throw new Error("Inscripción no encontrada");
    if (registration.status === "DISQUALIFIED") {
      return registration;
    }

    const pair = this.db.pairs.getById(registration.pairId);
    if (!pair) throw new Error("Pareja no encontrada");

    const now = new Date().toISOString();
    const updatedReg = this.db.registrations.upsert({
      ...registration,
      status: "DISQUALIFIED",
      statusNote: trimmed,
      statusChangedAt: now,
    });
    this.db.pairs.upsert({ ...pair, status: "disqualified" });

    const ruleset = this.db.rulesets.find(
      (r) => r.tournamentCategoryId === registration.tournamentCategoryId,
    )[0];
    const setsToWin = ruleset?.matchRules.setsToWin ?? 2;
    const gamesPerSet = ruleset?.matchRules.gamesPerSet ?? 6;

    const pending = this.db.matches.find(
      (m) =>
        m.tournamentCategoryId === registration.tournamentCategoryId &&
        (m.pairAId === pair.id || m.pairBId === pair.id) &&
        m.status !== "finished" &&
        m.status !== "walkover" &&
        m.status !== "cancelled",
    );

    const touchedGroupIds = new Set<string>();
    for (const match of pending) {
      const winnerIsA = match.pairBId === pair.id;
      const winnerPairId = winnerIsA ? match.pairAId : match.pairBId;
      if (!winnerPairId) continue;
      const sets = walkoverSetsForWinner(winnerIsA ? "A" : "B", setsToWin, gamesPerSet);
      const updated = applyWalkoverToMatch(match, winnerPairId, sets);
      this.db.matches.upsert(updated);
      if (updated.groupId) touchedGroupIds.add(updated.groupId);
      if (updated.phase !== "GROUP") {
        const slots = this.db.matchSlots.getAll();
        const matches = this.db.matches.getAll();
        const advanced = advanceBracketWinner(updated, slots, matches);
        this.db.matchSlots.replaceAll(advanced.slots);
        for (const m of advanced.matches) {
          if (m.tournamentCategoryId === updated.tournamentCategoryId) {
            this.db.matches.upsert(m);
          }
        }
      }
    }

    for (const groupId of touchedGroupIds) {
      const group = this.db.groups.getById(groupId);
      if (!group) continue;
      const groupMatches = this.db.matches.find((m) => m.groupId === group.id);
      const standings = computeStandings(
        group,
        groupMatches,
        ruleset?.tieBreakers ?? ["SET_DIFFERENCE", "POINTS", "GAME_DIFFERENCE"],
      );
      this.db.standings.removeWhere((s) => s.groupId === group.id);
      for (const row of standings) this.db.standings.upsert(row);
    }

    return updatedReg;
  }

  /**
   * Baja la inscripción (no es desclasificación): deja nota, retira la pareja
   * y cancela partidos pendientes donde participaba.
   */
  async removeRegistration(
    registrationId: string,
    note: string,
  ): Promise<TournamentRegistration> {
    await delay();
    const trimmed = note.trim();
    if (!trimmed) throw new Error("Indicá el motivo de la baja.");

    const registration = this.db.registrations.getById(registrationId);
    if (!registration) throw new Error("Inscripción no encontrada");
    if (registration.status === "CANCELLED") {
      return registration;
    }

    const pair = this.db.pairs.getById(registration.pairId);
    if (!pair) throw new Error("Pareja no encontrada");

    const now = new Date().toISOString();
    const updatedReg = this.db.registrations.upsert({
      ...registration,
      status: "CANCELLED",
      statusNote: trimmed,
      statusChangedAt: now,
    });
    this.db.pairs.upsert({ ...pair, status: "withdrawn" });

    const pending = this.db.matches.find(
      (m) =>
        m.tournamentCategoryId === registration.tournamentCategoryId &&
        (m.pairAId === pair.id || m.pairBId === pair.id) &&
        m.status !== "finished" &&
        m.status !== "walkover" &&
        m.status !== "cancelled",
    );
    for (const match of pending) {
      this.db.matches.upsert({ ...match, status: "cancelled" });
    }

    const groups = this.db.groups.find(
      (g) =>
        g.tournamentCategoryId === registration.tournamentCategoryId &&
        g.pairIds.includes(pair.id),
    );
    for (const group of groups) {
      this.db.groups.upsert({
        ...group,
        pairIds: group.pairIds.filter((id) => id !== pair.id),
      });
      this.db.standings.removeWhere(
        (s) => s.groupId === group.id && s.pairId === pair.id,
      );
    }

    return updatedReg;
  }

  async generateBracket(categoryId: string) {
    await delay();
    const groups = this.db.groups.find((g) => g.tournamentCategoryId === categoryId);
    const standings = this.db.standings.getAll().filter((s) =>
      groups.some((g) => g.id === s.groupId),
    );
    const ruleset = this.db.rulesets.find((r) => r.tournamentCategoryId === categoryId)[0];
    const qualify = ruleset?.qualifyPerGroup ?? 2;
    const groupMatches = this.db.matches.find(
      (m) => m.tournamentCategoryId === categoryId && m.phase === "GROUP",
    );
    const zoneStageComplete =
      groupMatches.length > 0 && groupMatches.every((m) => m.status === "finished");

    const previousBracketIds = this.db.matches
      .find((m) => m.tournamentCategoryId === categoryId && m.phase !== "GROUP")
      .map((m) => m.id);
    this.db.matchSlots.removeWhere((s) => previousBracketIds.includes(s.matchId));
    this.db.rounds.removeWhere((r) => r.tournamentCategoryId === categoryId);
    this.db.matches.removeWhere(
      (m) => m.tournamentCategoryId === categoryId && m.phase !== "GROUP",
    );

    const built = buildEliminationBracket(categoryId, groups, standings, qualify, {
      resolvePairs: zoneStageComplete,
    });
    for (const round of built.rounds) this.db.rounds.upsert(round);
    for (const match of built.matches) this.db.matches.upsert(match);
    for (const slot of built.slots) this.db.matchSlots.upsert(slot);
    return built;
  }

  async scheduleCategory(categoryId: string): Promise<ScheduleResult> {
    await delay();
    const matches = this.db.matches.find(
      (m) =>
        m.tournamentCategoryId === categoryId &&
        m.status !== "finished" &&
        m.status !== "cancelled" &&
        !m.scheduleManual &&
        m.pairAId != null &&
        m.pairBId != null &&
        m.scheduledAt == null,
    );
    const category = this.db.categories.getById(categoryId);
    const tournament = category
      ? this.db.tournaments.getById(category.tournamentId)
      : null;
    const courts = tournament
      ? this.db.courts.find((c) => c.clubId === tournament.clubId && c.status === "active")
      : [];

    let scheduledCount = 0;
    let suboptimalCount = 0;
    const occupied: { courtId: string; start: number; end: number; date: string }[] = [];

    for (const match of matches) {
      const pairAWindows: AvailabilityWindow[] = this.db.pairAvailability
        .find((a) => a.pairId === match.pairAId)
        .map((a) => ({
          date: a.date,
          startTime: a.startTime,
          endTime: a.endTime,
          pairId: a.pairId,
        }));
      const pairBWindows: AvailabilityWindow[] = this.db.pairAvailability
        .find((a) => a.pairId === match.pairBId)
        .map((a) => ({
          date: a.date,
          startTime: a.startTime,
          endTime: a.endTime,
          pairId: a.pairId,
        }));
      const pairOverlap = intersectWindows(pairAWindows, pairBWindows);
      const tournamentWindow: AvailabilityWindow[] =
        tournament != null
          ? pairOverlap.map((w) => ({
              ...w,
              startTime:
                w.startTime < tournament.dailyStartTime
                  ? tournament.dailyStartTime
                  : w.startTime,
              endTime:
                w.endTime > tournament.dailyEndTime ? tournament.dailyEndTime : w.endTime,
            }))
          : pairOverlap;

      let best: {
        score: number;
        date: string;
        startTime: string;
        courtId: string;
      } | null = null;

      for (const court of courts) {
        const courtWindows: AvailabilityWindow[] = this.db.courtAvailability
          .find((a) => a.courtId === court.id)
          .map((a) => ({
            date: a.date,
            startTime: a.startTime,
            endTime: a.endTime,
            courtId: court.id,
          }));
        const slots = intersectWindows(tournamentWindow, courtWindows);
        for (const slot of slots) {
          const startMin =
            Number(slot.startTime.slice(0, 2)) * 60 + Number(slot.startTime.slice(3, 5));
          const endMin = startMin + 90;
          const conflict = occupied.some(
            (o) =>
              o.courtId === court.id &&
              o.date === slot.date &&
              !(endMin <= o.start || startMin >= o.end),
          );
          if (conflict) continue;
          let score = 80;
          if (startMin >= 18 * 60) score += 15;
          if (startMin < 12 * 60) score -= 10;
          if (!best || score > best.score) {
            best = {
              score,
              date: slot.date,
              startTime: slot.startTime,
              courtId: court.id,
            };
          }
        }
      }

      if (best) {
        const startMin =
          Number(best.startTime.slice(0, 2)) * 60 + Number(best.startTime.slice(3, 5));
        occupied.push({
          courtId: best.courtId,
          date: best.date,
          start: startMin,
          end: startMin + 90,
        });
        this.db.matches.upsert({
          ...match,
          courtId: best.courtId,
          scheduledAt: `${best.date}T${best.startTime}:00.000Z`,
          status: "scheduled",
        });
        scheduledCount += 1;
        if (best.score < 85) suboptimalCount += 1;
      }
    }

    const pendingCount = this.db.matches.find(
      (m) =>
        m.tournamentCategoryId === categoryId &&
        m.status !== "finished" &&
        m.status !== "cancelled" &&
        !m.scheduledAt,
    ).length;

    return { scheduledCount, suboptimalCount, pendingCount };
  }

  async getDashboard(clubId: string) {
    await delay();
    const tournaments = this.db.tournaments.find((t) => t.clubId === clubId);
    const categoryIds = this.db.categories
      .getAll()
      .filter((c) => tournaments.some((t) => t.id === c.tournamentId))
      .map((c) => c.id);
    const matches = this.db.matches
      .getAll()
      .filter((m) => categoryIds.includes(m.tournamentCategoryId));
    const upcoming = matches
      .filter((m) => m.scheduledAt && m.status !== "finished")
      .sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""))
      .slice(0, 8);
    const registrations = this.db.registrations
      .getAll()
      .filter((r) => categoryIds.includes(r.tournamentCategoryId) && r.status === "CONFIRMED");
    const courts = this.db.courts.find((c) => c.clubId === clubId);
    const live = matches.filter((m) => m.status === "inProgress").length;
    return {
      upcoming,
      registeredPairs: registrations.length,
      liveMatches: live,
      courtsInUse: matches.filter((m) => m.status === "inProgress" && m.courtId).length,
      courtsTotal: courts.length,
      tournaments,
      groups: this.db.groups
        .getAll()
        .filter((g) => categoryIds.includes(g.tournamentCategoryId)),
      matches,
    };
  }

  async getRanking(categoryId?: string) {
    await delay();
    const standings = categoryId
      ? await this.listStandings(categoryId)
      : this.db.standings.getAll().sort((a, b) => b.points - a.points || a.position - b.position);
    return standings;
  }

  async getPlayerHome(playerId: string) {
    await delay();
    const pairs = this.db.pairs
      .getAll()
      .filter((p) => p.player1Id === playerId || p.player2Id === playerId);
    const pairIds = new Set(pairs.map((p) => p.id));
    const matches = this.db.matches
      .getAll()
      .filter((m) => pairIds.has(m.pairAId ?? "") || pairIds.has(m.pairBId ?? ""))
      .sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""));
    const next = matches.find((m) => m.status !== "finished") ?? null;
    const recent = matches.filter((m) => m.status === "finished").slice(-5).reverse();
    return { pairs, nextMatch: next, recentMatches: recent };
  }
}
