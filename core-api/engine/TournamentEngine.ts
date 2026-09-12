import type { CoreApiDb } from "../store/db";
import type {
  Client,
  Club,
  Court,
  CourtAgendaBoardView,
  CourtAgendaEvent,
  CourtDaySummary,
  CourtPriceRule,
  CourtReservation,
  CourtSlotQuote,
  CourtAvailableSlot,
  CreateClientInput,
  CreateCourtInput,
  CreateCourtReservationInput,
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
  UpdateCourtReservationInput,
} from "../types";
import {
  advanceBracketWinner,
  applyResultToMatch,
  applyWalkoverToMatch,
  buildEliminationBracket,
  buildTournamentDayWindows,
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
import {
  findScheduleConflicts,
  isQualityPreset,
  matchesOverlap,
  resolveMatchDurationMinutes,
  slotOverlapsReservation,
} from "../domain/scheduleConflicts";
import { pickRandomCourtImagePath } from "../domain/courtImages";
import type { ScheduleConflict } from "../domain/scheduleConflicts";
import {
  buildClubClientDetail,
  ensureClientFromPlayer,
  listClubClientSummaries,
} from "../domain/clients";
import { resolvePriceForSlot, validateCourtPriceRules } from "../domain/courtPricing";
import {
  generateDaySlots,
  intervalsOverlap,
  isClubOpenOnDate,
  isCourtOpenAt,
  isZeroLengthHours,
  localDateIsoFromInstant,
  resolveCourtHours,
  weekdayIsoFromDateIso,
} from "../domain/courtSlots";
import type {
  ClubClientDetail,
  ClubClientSummary,
  CourtDayPriceBand,
  CourtLiveStatus,
} from "../types";
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

  async updateClub(
    id: string,
    patch: import("../types").UpdateClubInput,
  ): Promise<Club> {
    await delay();
    const current = this.db.clubs.getById(id);
    if (!current) throw new Error("Club no encontrado");

    const openTime = patch.openTime ?? current.openTime;
    const closeTime = patch.closeTime ?? current.closeTime;
    if (!isValidHhMm(openTime) || !isValidHhMm(closeTime)) {
      throw new Error("Horario inválido (usá HH:mm)");
    }
    if (isZeroLengthHours(openTime, closeTime)) {
      throw new Error("La apertura y el cierre no pueden ser la misma hora");
    }

    let openDays = current.openDays;
    if (patch.openDays !== undefined) {
      const normalized = [
        ...new Set(
          patch.openDays.filter((d) => d >= 1 && d <= 7),
        ),
      ].sort((a, b) => a - b) as import("../types").WeekdayIso[];
      if (normalized.length === 0) {
        throw new Error("Seleccioná al menos un día de apertura");
      }
      openDays = normalized;
    }

    return this.db.clubs.upsert({
      ...current,
      ...patch,
      openTime,
      closeTime,
      openDays,
      updatedAt: new Date().toISOString(),
    });
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
    const categoryLevel = input.categoryLevel ?? 6;
    const createdAt = new Date().toISOString();
    const player: Player = {
      id: createId("player"),
      userId: input.userId ?? null,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      categoryLevel,
      categoryHistory: [
        {
          id: createId("pch"),
          level: categoryLevel,
          previousLevel: null,
          reason: "initial",
          at: createdAt,
          by: "club",
        },
      ],
      createdAt,
    };
    return this.db.players.upsert(player);
  }

  async updatePlayer(
    playerId: string,
    input: import("../types").UpdatePlayerInput,
  ): Promise<Player> {
    await delay();
    const existing = this.db.players.getById(playerId);
    if (!existing) throw new Error("Jugador no encontrado");

    const firstName =
      input.firstName !== undefined ? input.firstName.trim() : existing.firstName;
    const lastName =
      input.lastName !== undefined ? input.lastName.trim() : existing.lastName;
    if (!firstName || !lastName) {
      throw new Error("Nombre y apellido son obligatorios");
    }

    const nextLevel = input.categoryLevel ?? existing.categoryLevel;
    const history = [...(existing.categoryHistory ?? [])];
    if (input.categoryLevel !== undefined && nextLevel !== existing.categoryLevel) {
      history.push({
        id: createId("pch"),
        level: nextLevel,
        previousLevel: existing.categoryLevel,
        reason: "self_update",
        at: new Date().toISOString(),
        by: "player",
      });
    }

    const player: Player = {
      ...existing,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      phone:
        input.phone !== undefined
          ? input.phone?.trim() || null
          : existing.phone,
      email:
        input.email !== undefined
          ? input.email?.trim() || null
          : existing.email,
      categoryLevel: nextLevel,
      categoryHistory: history,
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
      status: "PENDING",
      registeredAt: new Date().toISOString(),
      statusNote: null,
      statusChangedAt: null,
      rankingPointsPlayer1: normalizeOptionalPoints(input.rankingPointsPlayer1),
      rankingPointsPlayer2: player2Id
        ? normalizeOptionalPoints(input.rankingPointsPlayer2)
        : null,
      tournamentPointsAwarded: null,
    };
    this.db.registrations.upsert(registration);

    const tournament = this.db.tournaments.getById(category.tournamentId);
    const ruleset =
      this.db.rulesets.find((r) => r.tournamentCategoryId === category.id)[0] ??
      null;
    const quality = isQualityPreset(ruleset?.preset);

    if (!quality) {
      const availability = input.availability ?? [];
      if (availability.length === 0) {
        throw new Error(
          "Indicá al menos un día y franja horaria de disponibilidad",
        );
      }
      for (const slot of availability) {
        if (!slot.date || !isValidHhMm(slot.startTime) || !isValidHhMm(slot.endTime)) {
          throw new Error("Disponibilidad inválida (día y HH:mm)");
        }
        if (toMinutes(slot.startTime) >= toMinutes(slot.endTime)) {
          throw new Error("En disponibilidad, desde debe ser anterior a hasta");
        }
      }
      await this.setPairAvailability(
        availability.map((slot) => ({
          pairId: pair.id,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          priority: null,
        })),
      );
    }

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

    const registration = this.db.registrations.find((r) => r.pairId === pairId)[0];
    if (registration) {
      const nextReg = { ...registration };
      if (input.rankingPointsPlayer1 !== undefined) {
        nextReg.rankingPointsPlayer1 = normalizeOptionalPoints(
          input.rankingPointsPlayer1,
        );
      }
      if (input.rankingPointsPlayer2 !== undefined) {
        nextReg.rankingPointsPlayer2 = player2Id
          ? normalizeOptionalPoints(input.rankingPointsPlayer2)
          : null;
      } else if (!player2Id) {
        nextReg.rankingPointsPlayer2 = null;
      }
      this.db.registrations.upsert(nextReg);
    }

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

  async searchClubClients(
    clubId: string,
    query: string,
    options?: { signal?: AbortSignal },
  ): Promise<Client[]> {
    await delay(350);
    if (options?.signal?.aborted) {
      const err = new Error("Aborted");
      err.name = "AbortError";
      throw err;
    }
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return this.db.clients
      .getAll()
      .filter((c) => c.clubId === clubId)
      .filter((c) => {
        const hay =
          `${c.displayName} ${c.firstName} ${c.lastName} ${c.phone ?? ""} ${c.email ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 12);
  }

  async createClient(input: CreateClientInput): Promise<Client> {
    await delay();
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    if (!firstName || !lastName) {
      throw new Error("Nombre y apellido son obligatorios");
    }
    if (input.playerId) {
      const player = this.db.players.getById(input.playerId);
      if (player) {
        return ensureClientFromPlayer(this.db, input.clubId, player);
      }
    }
    const now = new Date().toISOString();
    const client: Client = {
      id: createId("client"),
      clubId: input.clubId,
      playerId: input.playerId ?? null,
      userId: input.userId ?? null,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      province: null,
      city: null,
      avatarUrl: null,
      createdAt: now,
      updatedAt: now,
    };
    return this.db.clients.upsert(client);
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
      registrationFee: Math.max(0, Number(input.registrationFee) || 0),
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
    const nextFee =
      patch.registrationFee !== undefined
        ? Math.max(0, Number(patch.registrationFee) || 0)
        : current.registrationFee;
    return this.db.tournaments.upsert({
      ...current,
      ...patch,
      registrationFee: nextFee,
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
   * inscripciones aceptadas + pairsPerGroup del ruleset.
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
      (r) => r.tournamentCategoryId === categoryId && r.status === "ACCEPTED",
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
        message: `Hay ${pairs.length} pareja(s) aceptada(s) completa(s). Hacen falta al menos 2 para armar zonas.`,
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
    const ruleset = category
      ? this.db.rulesets.find((r) => r.tournamentCategoryId === category.id)[0]
      : null;
    const matchDurationMinutes = resolveMatchDurationMinutes(ruleset?.preset);
    const courts = tournament
      ? this.db.courts.find((c) => c.clubId === tournament.clubId && c.status === "active")
      : [];
    const clubCategoryIds = tournament
      ? this.db.categories
          .getAll()
          .filter((c) => {
            const t = this.db.tournaments.getById(c.tournamentId);
            return t?.clubId === tournament.clubId;
          })
          .map((c) => c.id)
      : [match.tournamentCategoryId];
    const clubMatches = this.db.matches.find((m) =>
      clubCategoryIds.includes(m.tournamentCategoryId),
    );
    const reservations = tournament
      ? this.db.courtReservations.find(
          (r) => r.clubId === tournament.clubId && r.status !== "cancelled",
        )
      : [];

    const conflicts = findScheduleConflicts({
      matchId,
      scheduledAt: input.scheduledAt,
      courtId: input.courtId,
      matches: clubMatches,
      courts,
      reservations,
      pairLabels: options?.pairLabels,
      matchDurationMinutes,
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

    // Force con cancha: liberar esa cancha en partidos solapados (no toca reservas).
    if (options?.force && input.courtId && input.scheduledAt) {
      for (const other of clubMatches) {
        if (other.id === matchId) continue;
        if (other.status === "cancelled") continue;
        if (!other.scheduledAt || other.courtId !== input.courtId) continue;
        if (
          !matchesOverlap(
            input.scheduledAt,
            other.scheduledAt,
            matchDurationMinutes,
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
    return this.db.categories.upsert({
      ...input,
      circuitType: input.circuitType ?? "NONE",
      id: createId("cat"),
    });
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
        rankingPointsPlayer1: r.rankingPointsPlayer1 ?? null,
        rankingPointsPlayer2: r.rankingPointsPlayer2 ?? null,
        tournamentPointsAwarded: r.tournamentPointsAwarded ?? null,
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
    const allPairs = this.db.pairs.find((p) => {
      if (p.tournamentCategoryId !== categoryId) return false;
      if (p.status !== "withdrawn") return true;
      return regByPair.get(p.id)?.status === "REJECTED";
    });

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
      const playerNames =
        ctx.pairPlayerNames[pair.id] ?? (["?", "?"] as [string, string]);
      const avatarFor = (playerId: string | null): string | null => {
        if (!playerId || !tournament) return null;
        const client = this.db.clients
          .find((c) => c.clubId === tournament.clubId && c.playerId === playerId)[0];
        return client?.avatarUrl ?? null;
      };
      const clientIdFor = (playerId: string | null): string | null => {
        if (!playerId || !tournament) return null;
        const client = this.db.clients
          .find((c) => c.clubId === tournament.clubId && c.playerId === playerId)[0];
        return client?.id ?? null;
      };
      return {
        pair,
        registration,
        label: ctx.pairLabels[pair.id] ?? pair.id,
        playerNames,
        playerAvatars: [
          avatarFor(pair.player1Id),
          avatarFor(pair.player2Id),
        ] as [string | null, string | null],
        playerClientIds: [
          clientIdFor(pair.player1Id),
          clientIdFor(pair.player2Id),
        ] as [string | null, string | null],
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
      (r) => r.tournamentCategoryId === categoryId && r.status === "ACCEPTED",
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
      structureNotice = `${unassignedPairs.length} pareja(s) aceptada(s) aún no están en el cuadro de zonas.`;
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
    return this.db.courts
      .find((c) => c.clubId === clubId)
      .map((court) => ({
        ...court,
        imageUrl: court.imageUrl ?? pickRandomCourtImagePath(),
      }));
  }

  async createCourt(input: CreateCourtInput): Promise<Court> {
    await delay();
    const club = this.db.clubs.getById(input.clubId);
    if (!club) throw new Error("Club no encontrado");
    const name = input.name.trim();
    if (!name) throw new Error("Ingresá el nombre de la cancha");

    const slotDurationMinutes =
      input.slotDurationMinutes === 120 ? 120 : 90;
    const basePrice =
      typeof input.basePrice === "number" && Number.isFinite(input.basePrice)
        ? Math.max(0, input.basePrice)
        : 12000;

    const court: Court = {
      id: createId("court"),
      clubId: input.clubId,
      name,
      status: "active",
      imageUrl: input.imageUrl ?? pickRandomCourtImagePath(),
      slotDurationMinutes,
      basePrice,
      openTime: input.openTime ?? null,
      closeTime: input.closeTime ?? null,
    };
    return this.db.courts.upsert(court);
  }

  async updateCourt(
    id: string,
    patch: Partial<
      Pick<
        Court,
        | "name"
        | "status"
        | "imageUrl"
        | "slotDurationMinutes"
        | "basePrice"
        | "openTime"
        | "closeTime"
      >
    >,
  ): Promise<Court> {
    await delay();
    const current = this.db.courts.getById(id);
    if (!current) throw new Error("Cancha no encontrada");

    const openTime =
      patch.openTime !== undefined ? patch.openTime : current.openTime;
    const closeTime =
      patch.closeTime !== undefined ? patch.closeTime : current.closeTime;
    if (openTime != null || closeTime != null) {
      if (
        openTime == null ||
        closeTime == null ||
        !isValidHhMm(openTime) ||
        !isValidHhMm(closeTime)
      ) {
        throw new Error("Horario de cancha inválido (usá HH:mm en ambos)");
      }
      if (isZeroLengthHours(openTime, closeTime)) {
        throw new Error("La apertura y el cierre no pueden ser la misma hora");
      }
    }

    return this.db.courts.upsert({ ...current, ...patch });
  }

  async listCourtPriceRules(courtId: string): Promise<CourtPriceRule[]> {
    await delay();
    return this.db.courtPriceRules
      .find((r) => r.courtId === courtId)
      .sort(
        (a, b) =>
          a.startTime.localeCompare(b.startTime) ||
          a.endTime.localeCompare(b.endTime),
      );
  }

  async upsertCourtPriceRule(
    rule: Omit<CourtPriceRule, "id"> & { id?: string },
  ): Promise<CourtPriceRule> {
    await delay();
    const court = this.db.courts.getById(rule.courtId);
    if (!court) throw new Error("Cancha no encontrada");

    const next: CourtPriceRule = {
      id: rule.id ?? createId("cpr"),
      courtId: rule.courtId,
      startTime: rule.startTime,
      endTime: rule.endTime,
      daysOfWeek: [...rule.daysOfWeek],
      price: rule.price,
      label: rule.label ?? null,
    };

    const siblings = this.db.courtPriceRules
      .find((r) => r.courtId === rule.courtId && r.id !== next.id)
      .map((r) => ({
        startTime: r.startTime,
        endTime: r.endTime,
        daysOfWeek: r.daysOfWeek,
        price: r.price,
      }));
    const overlapError = validateCourtPriceRules([
      ...siblings,
      {
        startTime: next.startTime,
        endTime: next.endTime,
        daysOfWeek: next.daysOfWeek,
        price: next.price,
      },
    ]);
    if (overlapError) throw new Error(overlapError);

    return this.db.courtPriceRules.upsert(next);
  }

  async deleteCourtPriceRule(id: string): Promise<boolean> {
    await delay();
    return this.db.courtPriceRules.remove(id);
  }

  async listCourtReservations(
    clubId: string,
    options?: { from?: string; to?: string; courtId?: string },
  ): Promise<CourtReservation[]> {
    await delay();
    const fromMs = options?.from ? new Date(options.from).getTime() : null;
    const toMs = options?.to ? new Date(options.to).getTime() : null;
    return this.db.courtReservations
      .getAll()
      .filter((r) => r.clubId === clubId)
      .filter((r) => (options?.courtId ? r.courtId === options.courtId : true))
      .filter((r) => {
        if (fromMs == null && toMs == null) return true;
        const start = new Date(r.startsAt).getTime();
        const end = new Date(r.endsAt).getTime();
        if (Number.isNaN(start) || Number.isNaN(end)) return false;
        if (fromMs != null && end <= fromMs) return false;
        if (toMs != null && start >= toMs) return false;
        return true;
      })
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  async quoteCourtSlot(courtId: string, startsAt: string): Promise<CourtSlotQuote> {
    await delay();
    const court = this.db.courts.getById(courtId);
    if (!court) throw new Error("Cancha no encontrada");
    const club = this.db.clubs.getById(court.clubId);
    if (!club) throw new Error("Club no encontrado");
    const rules = this.db.courtPriceRules.find((r) => r.courtId === courtId);
    const quoted = resolvePriceForSlot(court, rules, startsAt);
    const endsAt = new Date(
      new Date(startsAt).getTime() + court.slotDurationMinutes * 60_000,
    ).toISOString();
    return { price: quoted.price, label: quoted.label, endsAt };
  }

  /**
   * Turnos fijos del día (apertura→cierre / duración de cancha),
   * excluyendo los ya ocupados por reserva o partido de torneo.
   */
  async listAvailableCourtSlots(
    courtId: string,
    dateIso: string,
    options?: { ignoreReservationId?: string },
  ): Promise<CourtAvailableSlot[]> {
    await delay();
    const court = this.db.courts.getById(courtId);
    if (!court) throw new Error("Cancha no encontrada");
    const club = this.db.clubs.getById(court.clubId);
    if (!club) throw new Error("Club no encontrado");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
      throw new Error("Fecha inválida");
    }
    if (!isClubOpenOnDate(club, dateIso)) return [];

    const hours = resolveCourtHours(court, club);
    const slots = generateDaySlots(
      dateIso,
      hours.openTime,
      hours.closeTime,
      court.slotDurationMinutes,
    );

    return slots
      .filter(
        (slot) =>
          !this.isCourtSlotOccupied(
            court.clubId,
            court.id,
            slot.startsAt,
            slot.endsAt,
            options?.ignoreReservationId,
          ),
      )
      .map((slot) => ({
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        label: `${formatLocalHm(slot.startsAt)} – ${formatLocalHm(slot.endsAt)}`,
      }));
  }

  async createCourtReservation(
    input: CreateCourtReservationInput,
  ): Promise<CourtReservation> {
    await delay();
    const court = this.db.courts.getById(input.courtId);
    if (!court || court.clubId !== input.clubId) {
      throw new Error("Cancha no encontrada");
    }
    const club = this.db.clubs.getById(input.clubId);
    if (!club) throw new Error("Club no encontrado");
    const reservationDate = localDateIsoFromInstant(input.startsAt);
    if (!reservationDate || !isClubOpenOnDate(club, reservationDate)) {
      throw new Error("El club no abre ese día");
    }
    const client = this.db.clients.getById(input.clientId);
    if (!client || client.clubId !== input.clubId) {
      throw new Error("Cliente no encontrado");
    }
    const rules = this.db.courtPriceRules.find((r) => r.courtId === input.courtId);
    const quoted = resolvePriceForSlot(court, rules, input.startsAt);
    const endsAt =
      input.endsAt ??
      new Date(
        new Date(input.startsAt).getTime() + court.slotDurationMinutes * 60_000,
      ).toISOString();
    this.assertCourtSlotFree(input.clubId, input.courtId, input.startsAt, endsAt);

    const reservation: CourtReservation = {
      id: createId("reservation"),
      clubId: input.clubId,
      clientId: input.clientId,
      courtId: input.courtId,
      startsAt: input.startsAt,
      endsAt,
      status: "booked",
      price: input.price ?? quoted.price,
      createdAt: new Date().toISOString(),
    };
    return this.db.courtReservations.upsert(reservation);
  }

  async updateCourtReservation(
    id: string,
    patch: UpdateCourtReservationInput,
  ): Promise<CourtReservation> {
    await delay();
    const current = this.db.courtReservations.getById(id);
    if (!current) throw new Error("Reserva no encontrada");

    const courtId = patch.courtId === undefined ? current.courtId : patch.courtId;
    const startsAt = patch.startsAt ?? current.startsAt;
    let endsAt = patch.endsAt ?? current.endsAt;
    if (patch.startsAt && courtId && !patch.endsAt) {
      const court = this.db.courts.getById(courtId);
      if (court) {
        endsAt = new Date(
          new Date(patch.startsAt).getTime() + court.slotDurationMinutes * 60_000,
        ).toISOString();
      }
    }

    if (courtId && (patch.startsAt || patch.endsAt || patch.courtId !== undefined)) {
      this.assertCourtSlotFree(
        current.clubId,
        courtId,
        startsAt,
        endsAt,
        current.id,
      );
    }

    if (patch.clientId) {
      const client = this.db.clients.getById(patch.clientId);
      if (!client || client.clubId !== current.clubId) {
        throw new Error("Cliente no encontrado");
      }
    }

    return this.db.courtReservations.upsert({
      ...current,
      ...patch,
      courtId,
      startsAt,
      endsAt,
    });
  }

  async cancelCourtReservation(id: string): Promise<CourtReservation> {
    return this.updateCourtReservation(id, { status: "cancelled" });
  }

  async getCourtAgendaBoard(
    clubId: string,
    courtId: string,
    options: { from: string; to: string; summaryDate: string },
  ): Promise<CourtAgendaBoardView> {
    await delay();
    const club = this.db.clubs.getById(clubId);
    if (!club) throw new Error("Club no encontrado");
    const court = this.db.courts.getById(courtId);
    if (!court || court.clubId !== clubId) throw new Error("Cancha no encontrada");

    const courts = this.db.courts
      .find((c) => c.clubId === clubId)
      .map((c) => ({
        ...c,
        imageUrl: c.imageUrl ?? pickRandomCourtImagePath(),
      }));
    const selectedCourt =
      courts.find((c) => c.id === courtId) ?? {
        ...court,
        imageUrl: court.imageUrl ?? pickRandomCourtImagePath(),
      };

    const priceRules = this.db.courtPriceRules
      .find((r) => r.courtId === courtId)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const events = this.buildCourtAgendaEvents(
      clubId,
      courtId,
      options.from,
      options.to,
    );
    const daySummary = this.buildCourtDaySummary(
      club,
      selectedCourt,
      priceRules,
      options.summaryDate,
    );

    return {
      clubId,
      courtId,
      generatedAt: new Date().toISOString(),
      club,
      court: selectedCourt,
      courts,
      priceRules,
      daySummary,
      events,
      notice: null,
    };
  }

  private isCourtSlotOccupied(
    clubId: string,
    courtId: string,
    startsAt: string,
    endsAt: string,
    ignoreReservationId?: string,
  ): boolean {
    const overlappingReservation = this.db.courtReservations.getAll().find((r) => {
      if (r.clubId !== clubId || r.courtId !== courtId) return false;
      if (r.status === "cancelled") return false;
      if (ignoreReservationId && r.id === ignoreReservationId) return false;
      return intervalsOverlap(r.startsAt, r.endsAt, startsAt, endsAt);
    });
    if (overlappingReservation) return true;

    const overlappingMatch = this.db.matches.getAll().find((m) => {
      if (m.courtId !== courtId || !m.scheduledAt) return false;
      if (m.status === "cancelled") return false;
      const ruleset = this.db.rulesets.find(
        (r) => r.tournamentCategoryId === m.tournamentCategoryId,
      )[0];
      const durationMs =
        resolveMatchDurationMinutes(ruleset?.preset) * 60_000;
      const matchEnd = new Date(
        new Date(m.scheduledAt).getTime() + durationMs,
      ).toISOString();
      return intervalsOverlap(m.scheduledAt, matchEnd, startsAt, endsAt);
    });
    return Boolean(overlappingMatch);
  }

  private assertCourtSlotFree(
    clubId: string,
    courtId: string,
    startsAt: string,
    endsAt: string,
    ignoreReservationId?: string,
  ): void {
    if (
      this.isCourtSlotOccupied(
        clubId,
        courtId,
        startsAt,
        endsAt,
        ignoreReservationId,
      )
    ) {
      const reservationBusy = this.db.courtReservations.getAll().some((r) => {
        if (r.clubId !== clubId || r.courtId !== courtId) return false;
        if (r.status === "cancelled") return false;
        if (ignoreReservationId && r.id === ignoreReservationId) return false;
        return intervalsOverlap(r.startsAt, r.endsAt, startsAt, endsAt);
      });
      throw new Error(
        reservationBusy
          ? "Ese horario ya está reservado en la cancha"
          : "Hay un partido de torneo en ese horario",
      );
    }
  }

  private buildCourtDaySummary(
    club: Club,
    court: Court,
    priceRules: CourtPriceRule[],
    summaryDate: string,
  ): CourtDaySummary {
    const hours = resolveCourtHours(court, club);
    const priceBands = buildDayPriceBands(
      court,
      priceRules,
      summaryDate,
      hours.openTime,
      hours.closeTime,
    );
    const liveStatus = this.resolveCourtLiveStatus(club, court);

    if (!isClubOpenOnDate(club, summaryDate)) {
      return {
        date: summaryDate,
        totalSlots: 0,
        occupiedSlots: 0,
        freeSlots: 0,
        nextFreeAt: null,
        minPrice: null,
        message: "Club cerrado este día",
        priceBands,
        availableSlots: [],
        liveStatus,
      };
    }

    const slots = generateDaySlots(
      summaryDate,
      hours.openTime,
      hours.closeTime,
      court.slotDurationMinutes,
    );

    const reservations = this.db.courtReservations
      .getAll()
      .filter(
        (r) =>
          r.courtId === court.id &&
          r.status !== "cancelled" &&
          intervalsOverlap(
            r.startsAt,
            r.endsAt,
            `${summaryDate}T00:00:00`,
            `${summaryDate}T23:59:59.999`,
          ),
      );

    const matches = this.db.matches.getAll().filter((m) => {
      if (m.courtId !== court.id || !m.scheduledAt || m.status === "cancelled") {
        return false;
      }
      const ruleset = this.db.rulesets.find(
        (r) => r.tournamentCategoryId === m.tournamentCategoryId,
      )[0];
      const durationMs =
        resolveMatchDurationMinutes(ruleset?.preset) * 60_000;
      const matchEnd = new Date(
        new Date(m.scheduledAt).getTime() + durationMs,
      ).toISOString();
      return intervalsOverlap(
        m.scheduledAt,
        matchEnd,
        `${summaryDate}T00:00:00`,
        `${summaryDate}T23:59:59.999`,
      );
    });

    let occupiedSlots = 0;
    let nextFreeAt: string | null = null;
    const prices: number[] = [];
    const availableSlots: CourtAvailableSlot[] = [];

    for (const slot of slots) {
      const busy =
        reservations.some((r) =>
          intervalsOverlap(r.startsAt, r.endsAt, slot.startsAt, slot.endsAt),
        ) ||
        matches.some((m) => {
          const ruleset = this.db.rulesets.find(
            (r) => r.tournamentCategoryId === m.tournamentCategoryId,
          )[0];
          const durationMs =
            resolveMatchDurationMinutes(ruleset?.preset) * 60_000;
          const matchEnd = new Date(
            new Date(m.scheduledAt!).getTime() + durationMs,
          ).toISOString();
          return intervalsOverlap(
            m.scheduledAt!,
            matchEnd,
            slot.startsAt,
            slot.endsAt,
          );
        });
      if (busy) {
        occupiedSlots += 1;
        continue;
      }
      if (!nextFreeAt) nextFreeAt = slot.startsAt;
      const quoted = resolvePriceForSlot(court, priceRules, slot.startsAt);
      prices.push(quoted.price);
      availableSlots.push({
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        label: `${formatLocalHm(slot.startsAt)} – ${formatLocalHm(slot.endsAt)}`,
      });
    }

    const freeSlots = Math.max(0, slots.length - occupiedSlots);
    const minPrice = prices.length ? Math.min(...prices) : null;
    const message =
      freeSlots === 0
        ? "Sin turnos libres hoy"
        : freeSlots === slots.length
          ? "Cancha libre todo el día"
          : `${freeSlots} turno${freeSlots === 1 ? "" : "s"} libre${freeSlots === 1 ? "" : "s"}`;

    return {
      date: summaryDate,
      totalSlots: slots.length,
      occupiedSlots,
      freeSlots,
      nextFreeAt,
      minPrice,
      message,
      priceBands,
      availableSlots,
      liveStatus,
    };
  }

  private resolveCourtLiveStatus(club: Club, court: Court): CourtLiveStatus {
    const now = new Date();
    if (!isCourtOpenAt(club, court, now)) return "closed";
    const nowIso = now.toISOString();
    const probeEnd = new Date(now.getTime() + 60_000).toISOString();
    if (this.isCourtSlotOccupied(club.id, court.id, nowIso, probeEnd)) {
      return "occupied";
    }
    return "available";
  }

  private buildCourtAgendaEvents(
    clubId: string,
    courtId: string,
    from: string,
    to: string,
  ): CourtAgendaEvent[] {
    const events: CourtAgendaEvent[] = [];
    const clientsById = new Map(
      this.db.clients.getAll().map((c) => [c.id, c] as const),
    );
    const priceRules = this.db.courtPriceRules.find((r) => r.courtId === courtId);
    const court = this.db.courts.getById(courtId);

    for (const reservation of this.db.courtReservations.getAll()) {
      if (reservation.clubId !== clubId || reservation.courtId !== courtId) continue;
      if (
        !intervalsOverlap(reservation.startsAt, reservation.endsAt, from, to)
      ) {
        continue;
      }
      const client = clientsById.get(reservation.clientId);
      const quoted =
        court != null
          ? resolvePriceForSlot(court, priceRules, reservation.startsAt)
          : { price: reservation.price ?? 0, label: null as string | null };
      events.push({
        id: `res-${reservation.id}`,
        kind: "reservation",
        title: client?.displayName ?? "Reserva",
        subtitle: quoted.label ?? "Reserva de cancha",
        startAt: reservation.startsAt,
        endAt: reservation.endsAt,
        allDay: false,
        status: reservation.status,
        courtId,
        reservationId: reservation.id,
        matchId: null,
        clientId: reservation.clientId,
        price: reservation.price,
        priceLabel: quoted.label,
      });
    }

    const playersById = new Map(
      this.db.players.getAll().map((p) => [p.id, p] as const),
    );
    const pairLabel = (pairId: string | null): string => {
      if (!pairId) return "Pareja";
      const pair = this.db.pairs.getById(pairId);
      if (!pair) return "Pareja";
      const p1 = playersById.get(pair.player1Id)?.displayName ?? "?";
      const p2 = pair.player2Id
        ? (playersById.get(pair.player2Id)?.displayName ?? "?")
        : "busca pareja";
      return `${p1} / ${p2}`;
    };

    const categoriesById = new Map(
      this.db.categories.getAll().map((c) => [c.id, c] as const),
    );
    const tournamentsById = new Map(
      this.db.tournaments.getAll().map((t) => [t.id, t] as const),
    );
    const rulesetsByCategory = new Map(
      this.db.rulesets.getAll().map((r) => [r.tournamentCategoryId, r] as const),
    );

    for (const match of this.db.matches.getAll()) {
      if (match.courtId !== courtId || !match.scheduledAt) continue;
      if (match.status === "cancelled") continue;
      const ruleset = rulesetsByCategory.get(match.tournamentCategoryId);
      const matchDurationMs =
        resolveMatchDurationMinutes(ruleset?.preset) * 60_000;
      const matchEnd = new Date(
        new Date(match.scheduledAt).getTime() + matchDurationMs,
      ).toISOString();
      if (!intervalsOverlap(match.scheduledAt, matchEnd, from, to)) continue;

      const category = categoriesById.get(match.tournamentCategoryId);
      const tournament = category
        ? tournamentsById.get(category.tournamentId)
        : null;
      if (tournament && tournament.clubId !== clubId) continue;

      const status =
        match.status === "finished" || match.status === "walkover"
          ? ("finished" as const)
          : match.status === "inProgress"
            ? ("inProgress" as const)
            : ("scheduled" as const);

      events.push({
        id: `match-${match.id}`,
        kind: "tournament_match",
        title: `${pairLabel(match.pairAId)} vs ${pairLabel(match.pairBId)}`,
        subtitle: tournament
          ? `${tournament.name}${category ? ` · ${category.name}` : ""}`
          : "Partido de torneo",
        startAt: match.scheduledAt,
        endAt: matchEnd,
        allDay: false,
        status,
        courtId,
        reservationId: null,
        matchId: match.id,
        clientId: null,
        price: null,
        priceLabel: null,
      });
    }

    return events.sort((a, b) => a.startAt.localeCompare(b.startAt));
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
    const acceptedPairIds = new Set(
      this.db.registrations
        .find(
          (r) =>
            r.tournamentCategoryId === categoryId && r.status === "ACCEPTED",
        )
        .map((r) => r.pairId),
    );
    const pairs = this.db.pairs.find(
      (p) =>
        p.tournamentCategoryId === categoryId &&
        p.status === "active" &&
        acceptedPairIds.has(p.id) &&
        Boolean(p.player1Id && p.player2Id),
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

  /** Acepta una inscripción pendiente: habilita la pareja para zonas y partidos. */
  async acceptRegistration(
    registrationId: string,
  ): Promise<TournamentRegistration> {
    await delay();
    const registration = this.db.registrations.getById(registrationId);
    if (!registration) throw new Error("Inscripción no encontrada");
    if (registration.status === "ACCEPTED") {
      return registration;
    }
    if (registration.status !== "PENDING" && registration.status !== "WAITLIST") {
      throw new Error("Solo se pueden aceptar inscripciones pendientes");
    }

    const pair = this.db.pairs.getById(registration.pairId);
    if (!pair) throw new Error("Pareja no encontrada");
    if (pair.status === "withdrawn" || pair.status === "disqualified") {
      throw new Error("La pareja no está activa");
    }

    const now = new Date().toISOString();
    return this.db.registrations.upsert({
      ...registration,
      status: "ACCEPTED",
      statusNote: null,
      statusChangedAt: now,
    });
  }

  /** Rechaza una inscripción pendiente. La pareja no entra a zonas ni partidos. */
  async rejectRegistration(
    registrationId: string,
    note?: string | null,
  ): Promise<TournamentRegistration> {
    await delay();
    const registration = this.db.registrations.getById(registrationId);
    if (!registration) throw new Error("Inscripción no encontrada");
    if (registration.status === "REJECTED") {
      return registration;
    }
    if (registration.status !== "PENDING" && registration.status !== "WAITLIST") {
      throw new Error("Solo se pueden rechazar inscripciones pendientes");
    }

    const pair = this.db.pairs.getById(registration.pairId);
    if (!pair) throw new Error("Pareja no encontrada");

    const trimmed = note?.trim() || "Inscripción rechazada";
    const now = new Date().toISOString();
    const updatedReg = this.db.registrations.upsert({
      ...registration,
      status: "REJECTED",
      statusNote: trimmed,
      statusChangedAt: now,
    });
    this.db.pairs.upsert({ ...pair, status: "withdrawn" });

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
    const ruleset =
      this.db.rulesets.find((r) => r.tournamentCategoryId === categoryId)[0] ??
      null;
    const quality = isQualityPreset(ruleset?.preset);
    const durationMinutes = resolveMatchDurationMinutes(ruleset?.preset);
    const courts = tournament
      ? this.db.courts.find((c) => c.clubId === tournament.clubId && c.status === "active")
      : [];

    let scheduledCount = 0;
    let suboptimalCount = 0;
    const occupied: { courtId: string; start: number; end: number; date: string }[] =
      [];

    // Sembrar ocupación con partidos ya agendados + reservas del club.
    if (tournament) {
      const clubCategoryIds = this.db.categories
        .getAll()
        .filter((c) => {
          const t = this.db.tournaments.getById(c.tournamentId);
          return t?.clubId === tournament.clubId;
        })
        .map((c) => c.id);
      for (const m of this.db.matches.getAll()) {
        if (!clubCategoryIds.includes(m.tournamentCategoryId)) continue;
        if (!m.scheduledAt || !m.courtId || m.status === "cancelled") continue;
        const mRuleset = this.db.rulesets.find(
          (r) => r.tournamentCategoryId === m.tournamentCategoryId,
        )[0];
        const dur = resolveMatchDurationMinutes(mRuleset?.preset);
        const start = new Date(m.scheduledAt);
        if (Number.isNaN(start.getTime())) continue;
        const date = m.scheduledAt.slice(0, 10);
        const startMin = start.getUTCHours() * 60 + start.getUTCMinutes();
        occupied.push({
          courtId: m.courtId,
          date,
          start: startMin,
          end: startMin + dur,
        });
      }
      for (const r of this.db.courtReservations.getAll()) {
        if (r.clubId !== tournament.clubId || r.status === "cancelled") continue;
        if (!r.courtId) continue;
        const start = new Date(r.startsAt);
        const end = new Date(r.endsAt);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
        occupied.push({
          courtId: r.courtId,
          date: r.startsAt.slice(0, 10),
          start: start.getUTCHours() * 60 + start.getUTCMinutes(),
          end: end.getUTCHours() * 60 + end.getUTCMinutes(),
        });
      }
    }

    const tournamentDays =
      tournament != null
        ? buildTournamentDayWindows({
            startDate: tournament.startDate,
            endDate: tournament.endDate,
            dailyStartTime: tournament.dailyStartTime,
            dailyEndTime: tournament.dailyEndTime,
          })
        : [];

    for (const match of matches) {
      let candidateWindows: AvailabilityWindow[] = [];

      if (quality || !tournament) {
        // Quality: se acomoda desde el horario de comienzo del torneo (días del evento).
        candidateWindows = tournamentDays;
      } else {
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
        const pairOverlap = intersectWindows(
          pairAWindows,
          pairBWindows,
          durationMinutes,
        );
        candidateWindows = intersectWindows(
          pairOverlap,
          tournamentDays,
          durationMinutes,
        );
      }

      let best: {
        score: number;
        date: string;
        startTime: string;
        courtId: string;
      } | null = null;

      for (const court of courts) {
        const courtWindowsRaw: AvailabilityWindow[] = this.db.courtAvailability
          .find((a) => a.courtId === court.id)
          .map((a) => ({
            date: a.date,
            startTime: a.startTime,
            endTime: a.endTime,
            courtId: court.id,
          }));
        // Si no hay courtAvailability seed, la cancha está libre en los días del torneo.
        const courtWindows =
          courtWindowsRaw.length > 0
            ? courtWindowsRaw
            : candidateWindows.map((w) => ({ ...w, courtId: court.id }));
        const slots = intersectWindows(
          candidateWindows,
          courtWindows,
          durationMinutes,
        );
        for (const slot of slots) {
          const startMin =
            Number(slot.startTime.slice(0, 2)) * 60 +
            Number(slot.startTime.slice(3, 5));
          // Quality: preferir arrancar en dailyStartTime.
          const preferredStart = quality
            ? toMinutes(tournament?.dailyStartTime ?? slot.startTime)
            : startMin;
          const tryStart = quality
            ? Math.max(startMin, preferredStart)
            : startMin;
          const slotEndMin =
            Number(slot.endTime.slice(0, 2)) * 60 +
            Number(slot.endTime.slice(3, 5));
          if (tryStart + durationMinutes > slotEndMin) continue;

          const conflict = occupied.some(
            (o) =>
              o.courtId === court.id &&
              o.date === slot.date &&
              !(tryStart + durationMinutes <= o.start || tryStart >= o.end),
          );
          if (conflict) continue;

          const startsAtIso = `${slot.date}T${String(Math.floor(tryStart / 60)).padStart(2, "0")}:${String(tryStart % 60).padStart(2, "0")}:00.000Z`;
          const endsAtIso = new Date(
            new Date(startsAtIso).getTime() + durationMinutes * 60_000,
          ).toISOString();
          const reservationHit = this.db.courtReservations.getAll().some(
            (r) =>
              r.clubId === tournament?.clubId &&
              r.courtId === court.id &&
              r.status !== "cancelled" &&
              slotOverlapsReservation(startsAtIso, endsAtIso, r),
          );
          if (reservationHit) continue;

          let score = 80;
          if (quality && tryStart === preferredStart) score += 20;
          if (tryStart >= 18 * 60) score += 15;
          if (tryStart < 12 * 60) score -= 10;
          if (!best || score > best.score) {
            best = {
              score,
              date: slot.date,
              startTime: `${String(Math.floor(tryStart / 60)).padStart(2, "0")}:${String(tryStart % 60).padStart(2, "0")}`,
              courtId: court.id,
            };
          }
        }
      }

      if (best) {
        const startMin =
          Number(best.startTime.slice(0, 2)) * 60 +
          Number(best.startTime.slice(3, 5));
        occupied.push({
          courtId: best.courtId,
          date: best.date,
          start: startMin,
          end: startMin + durationMinutes,
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
      .filter((r) => categoryIds.includes(r.tournamentCategoryId) && r.status === "ACCEPTED");
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

function normalizeOptionalPoints(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(Number(value))) return null;
  return Math.max(0, Math.round(Number(value)));
}

function formatLocalHm(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function buildDayPriceBands(
  court: Court,
  priceRules: CourtPriceRule[],
  dateIso: string,
  openTime: string,
  closeTime: string,
): CourtDayPriceBand[] {
  const weekday = weekdayIsoFromDateIso(dateIso);
  const dayRules = priceRules
    .filter((rule) => rule.daysOfWeek.includes(weekday))
    .slice()
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (dayRules.length === 0) {
    return [
      {
        startTime: openTime,
        endTime: closeTime,
        price: court.basePrice,
        label: "Base",
      },
    ];
  }

  return dayRules.map((rule) => ({
    startTime: rule.startTime,
    endTime: rule.endTime,
    price: rule.price,
    label: rule.label,
  }));
}

function isValidHhMm(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim());
}

function toMinutes(hm: string): number {
  const [h, m] = hm.split(":").map((part) => Number(part));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}
