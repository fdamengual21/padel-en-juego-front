import type { AxiosInstance } from "axios";
import { readData } from "@/config/axiosInstance";
import type { ApiEnvelope } from "@/lib/apiClient";
import type { PlayerReservation } from "@/modules/reservations";
import { normalizeMine, normalizeReservation } from "@/modules/reservations/repositories/ReservationRepository";
import {
  PLAYER_COVER_PATHS,
  emptyClubDashboard,
  emptyCourtsAgendaBoard,
  emptyCourtsDayOverview,
  emptyPaginated,
  notConnectedError,
  type AuthSession,
  type Club,
  type ClubClientDetail,
  type ClubClientSummary,
  type ClubDashboardView,
  type ConfigBoardView,
  type Court,
  type CourtAgendaBoardView,
  type CourtAvailableSlot,
  type CourtPriceRule,
  type CourtReservation,
  type CourtSlotQuote,
  type CourtsAgendaBoardView,
  type CourtsDayOverviewView,
  type CreateClientInput,
  type CreateCourtInput,
  type CreateCourtReservationInput,
  type CreatePlayerInput,
  type CuadroBoardView,
  type FindIdentityMatchesInput,
  type FindIdentityMatchesResult,
  type GenerateGroupsConfig,
  type GroupStanding,
  type LoginInput,
  type Match,
  type MatchResultInput,
  type MatchSlot,
  type MatchStatus,
  type MatchesBoardView,
  type MyTournamentRegistration,
  type PageQuery,
  type PaginatedResult,
  type PairAvailability,
  type ParticipantsBoardView,
  type Player,
  type PlayerDashboard,
  type PlayerFeed,
  type PlayerWeekEvent,
  type RegisterAccountInput,
  type RegisterPairInput,
  type RegisterPairResult,
  type ScheduleResult,
  type SyncCategoryStructureOptions,
  type AcceptRegistrationResult,
  type TournamentCategory,
  type TournamentGroup,
  type TournamentPair,
  type TournamentRegistration,
  type TournamentRound,
  type TournamentRuleset,
  type UpdateClubInput,
  type UpdateCourtReservationInput,
  type UpdatePairPlayersInput,
  type UpdatePlayerInput,
  type ZonesBoardView,
  type Client,
  type GroupConfigValidation,
} from "@/domain";

export interface ITournamentOpsRepository {
  listCategories(tournamentId: string): Promise<TournamentCategory[]>;
  createCategory(
    input: Omit<TournamentCategory, "id">,
  ): Promise<TournamentCategory>;
  listPairs(categoryId: string): Promise<TournamentPair[]>;
  listRegistrations(categoryId: string): Promise<TournamentRegistration[]>;
  getRuleset(categoryId: string): Promise<TournamentRuleset | null>;
  listGroups(categoryId: string): Promise<TournamentGroup[]>;
  listStandings(categoryId: string): Promise<GroupStanding[]>;
  listMatches(categoryId: string): Promise<Match[]>;
  getBracket(categoryId: string): Promise<{
    rounds: TournamentRound[];
    matches: Match[];
    slots: MatchSlot[];
  }>;
  getCuadroBoard(categoryId: string): Promise<CuadroBoardView>;
  getZonesBoard(categoryId: string): Promise<ZonesBoardView>;
  getParticipantsBoard(categoryId: string): Promise<ParticipantsBoardView>;
  getMatchesBoard(categoryId: string): Promise<MatchesBoardView>;
  getConfigBoard(categoryId: string): Promise<ConfigBoardView>;
  generateGroups(
    categoryId: string,
    config: GenerateGroupsConfig,
  ): Promise<{ groups: TournamentGroup[]; validation: GroupConfigValidation }>;
  generateGroupMatches(categoryId: string): Promise<Match[]>;
  submitMatchResult(matchId: string, input: MatchResultInput): Promise<Match>;
  generateBracket(categoryId: string): Promise<{
    rounds: TournamentRound[];
    matches: Match[];
    slots: MatchSlot[];
  }>;
  scheduleCategory(categoryId: string): Promise<ScheduleResult>;
  listCourts(clubId: string): Promise<Court[]>;
  createCourt(input: CreateCourtInput): Promise<Court>;
  updateClub(id: string, patch: UpdateClubInput): Promise<Club>;
  updateCourt(
    id: string,
    patch: Partial<Omit<Court, "id" | "clubId">>,
  ): Promise<Court>;
  listCourtPriceRules(courtId: string): Promise<CourtPriceRule[]>;
  upsertCourtPriceRule(
    rule: Omit<CourtPriceRule, "id"> & { id?: string },
  ): Promise<CourtPriceRule>;
  deleteCourtPriceRule(id: string): Promise<boolean>;
  listCourtReservations(
    clubId: string,
    options?: { from?: string; to?: string; courtId?: string },
  ): Promise<CourtReservation[]>;
  listPairAvailability(pairId: string): Promise<PairAvailability[]>;
  setPairAvailability(
    items: Omit<PairAvailability, "id">[],
  ): Promise<PairAvailability[]>;
  createCourtReservation(
    input: CreateCourtReservationInput,
  ): Promise<CourtReservation>;
  updateCourtReservation(
    id: string,
    patch: UpdateCourtReservationInput,
  ): Promise<CourtReservation>;
  cancelCourtReservation(id: string): Promise<CourtReservation>;
  getCourtAgendaBoard(
    clubId: string,
    courtId: string,
    options: { from: string; to: string; summaryDate: string },
  ): Promise<CourtAgendaBoardView>;
  listCourtsDayOverview(
    clubId: string,
    date: string,
  ): Promise<CourtsDayOverviewView>;
  getCourtsAgendaBoard(
    clubId: string,
    options: { from: string; to: string },
  ): Promise<CourtsAgendaBoardView>;
  quoteCourtSlot(courtId: string, startsAt: string): Promise<CourtSlotQuote>;
  listAvailableCourtSlots(
    courtId: string,
    dateIso: string,
    options?: { ignoreReservationId?: string },
  ): Promise<CourtAvailableSlot[]>;
  searchClubClients(
    clubId: string,
    query: string,
    options?: { signal?: AbortSignal },
  ): Promise<Client[]>;
  createClient(input: CreateClientInput): Promise<Client>;
  getDashboard(clubId: string): Promise<ClubDashboardView>;
  getRanking(categoryId?: string): Promise<GroupStanding[]>;
  getPlayerHome(playerId: string): Promise<PlayerDashboard>;
  getPlayerFeed(location?: {
    provinceId?: number | null;
    municipalityId?: number | null;
  }): Promise<PlayerFeed>;
  getMyWeek(): Promise<{ reservations: PlayerReservation[]; events: PlayerWeekEvent[] }>;
  listProvinces(): Promise<Array<{ id: string; name: string }>>;
  listCities(
    provinceIdOrName: string,
  ): Promise<Array<{ id: string; name: string; provinceId: string }>>;
  listPlayerCoverImages(): string[];
  listPlayers(): Promise<Player[]>;
  listClubClients(
    clubId: string,
    query?: PageQuery,
  ): Promise<PaginatedResult<ClubClientSummary>>;
  getClubClientDetail(
    clubId: string,
    clientId: string,
  ): Promise<ClubClientDetail | null>;
  searchPlayers(
    query: string,
    options?: { signal?: AbortSignal },
  ): Promise<Player[]>;
  findIdentityMatches(
    input: FindIdentityMatchesInput,
  ): Promise<FindIdentityMatchesResult>;
  createPlayer(input: CreatePlayerInput): Promise<Player>;
  login(input: LoginInput): Promise<AuthSession>;
  registerAccount(input: RegisterAccountInput): Promise<AuthSession>;
  updatePlayer(playerId: string, input: UpdatePlayerInput): Promise<Player>;
  registerPair(input: RegisterPairInput): Promise<RegisterPairResult>;
  registerPairByAdmin(input: RegisterPairInput): Promise<RegisterPairResult>;
  registerPairByPlayer(input: RegisterPairInput): Promise<RegisterPairResult>;
  cancelMyRegistration(categoryId: string): Promise<TournamentRegistration>;
  updatePairPlayers(
    pairId: string,
    input: UpdatePairPlayersInput,
  ): Promise<TournamentPair>;
  syncCategoryStructure(
    categoryId: string,
    options?: SyncCategoryStructureOptions,
  ): Promise<{
    synced: boolean;
    message: string;
    groups: TournamentGroup[];
    matches: Match[];
  }>;
  acceptRegistration(registrationId: string): Promise<AcceptRegistrationResult>;
  rejectRegistration(
    registrationId: string,
    note?: string | null,
  ): Promise<TournamentRegistration>;
  disqualifyRegistration(
    registrationId: string,
    note: string,
  ): Promise<TournamentRegistration>;
  removeRegistration(
    registrationId: string,
    note: string,
  ): Promise<TournamentRegistration>;
  updateMatchSchedule(
    matchId: string,
    input: { scheduledAt: string | null; courtId: string | null },
    options?: { force?: boolean; pairLabels?: Record<string, string> },
  ): Promise<Match>;
  setMatchStatus(matchId: string, status: MatchStatus): Promise<Match>;
  updateCategory(
    id: string,
    patch: Partial<Omit<TournamentCategory, "id" | "tournamentId">>,
  ): Promise<TournamentCategory>;
  upsertRuleset(ruleset: TournamentRuleset): Promise<TournamentRuleset>;
  listPublicCategories(tournamentId: string): Promise<TournamentCategory[]>;
  listPublicPairs(categoryId: string): Promise<TournamentPair[]>;
  listPublicRegistrations(categoryId: string): Promise<TournamentRegistration[]>;
  getPublicRuleset(categoryId: string): Promise<TournamentRuleset | null>;
  listPublicGroups(categoryId: string): Promise<TournamentGroup[]>;
  listPublicMatches(categoryId: string): Promise<Match[]>;
  getPublicCuadroBoard(categoryId: string): Promise<CuadroBoardView>;
  getPublicZonesBoard(categoryId: string): Promise<ZonesBoardView>;
  getPublicParticipantsBoard(categoryId: string): Promise<ParticipantsBoardView>;
  getPublicMatchesBoard(categoryId: string): Promise<MatchesBoardView>;
  getMyRegistration(categoryId: string): Promise<MyTournamentRegistration>;
}

export class TournamentOpsRepository implements ITournamentOpsRepository {
  private readonly http: AxiosInstance;

  constructor(http: AxiosInstance) {
    this.http = http;
  }

  private async read<T>(path: string, method: "get" | "post" | "patch" | "put" | "delete" = "get", body?: unknown): Promise<T> {
    const response = await this.http.request<ApiEnvelope<T>>({ url: path, method, data: body });
    return readData(response);
  }
  async listCategories(tournamentId: string) {
    return this.read<TournamentCategory[]>(`/club/tournaments/${tournamentId}/categories`);
  }

  async createCategory(input: Omit<TournamentCategory, "id">) {
    return this.read<TournamentCategory>(
      `/club/tournaments/${input.tournamentId}/categories`,
      "post",
      input,
    );
  }

  async listPairs(categoryId: string) {
    return this.read<TournamentPair[]>(`/club/tournaments/categories/${categoryId}/pairs`);
  }

  async listRegistrations(categoryId: string) {
    return this.read<TournamentRegistration[]>(
      `/club/tournaments/categories/${categoryId}/registrations`,
    );
  }

  async getRuleset(categoryId: string) {
    return this.read<TournamentRuleset | null>(
      `/club/tournaments/categories/${categoryId}/ruleset`,
    );
  }

  async listGroups(categoryId: string) {
    return this.read<TournamentGroup[]>(`/club/tournaments/categories/${categoryId}/groups`);
  }

  async listStandings(categoryId: string) {
    return this.read<GroupStanding[]>(`/club/tournaments/categories/${categoryId}/standings`);
  }

  async listMatches(categoryId: string) {
    return this.read<Match[]>(`/club/tournaments/categories/${categoryId}/matches`);
  }

  async getBracket(categoryId: string) {
    return this.read<{ rounds: TournamentRound[]; matches: Match[]; slots: MatchSlot[] }>(
      `/club/tournaments/categories/${categoryId}/bracket`,
    );
  }

  async getCuadroBoard(categoryId: string) {
    return this.read<CuadroBoardView>(`/club/tournaments/categories/${categoryId}/boards/cuadro`);
  }

  async getZonesBoard(categoryId: string) {
    return this.read<ZonesBoardView>(`/club/tournaments/categories/${categoryId}/boards/zones`);
  }

  async getParticipantsBoard(categoryId: string) {
    return this.read<ParticipantsBoardView>(
      `/club/tournaments/categories/${categoryId}/boards/participants`,
    );
  }

  async getMatchesBoard(categoryId: string) {
    return this.read<MatchesBoardView>(`/club/tournaments/categories/${categoryId}/boards/matches`);
  }

  async getConfigBoard(categoryId: string): Promise<ConfigBoardView> {
    return this.read<ConfigBoardView>(`/club/tournaments/categories/${categoryId}/boards/config`);
  }

  async generateGroups(
    _categoryId: string,
    _config: GenerateGroupsConfig,
  ) {
    return notConnectedError();
  }

  async generateGroupMatches(_categoryId: string) {
    return notConnectedError();
  }

  async submitMatchResult(matchId: string, input: MatchResultInput) {
    return this.read<Match>(`/club/tournaments/matches/${matchId}/result`, "post", input);
  }

  async generateBracket(_categoryId: string) {
    return notConnectedError();
  }

  async scheduleCategory(categoryId: string) {
    return this.read<ScheduleResult>(`/club/tournaments/categories/${categoryId}/schedule`, "post");
  }

  async listCourts(_clubId: string) {
    return [];
  }

  async createCourt(_input: CreateCourtInput) {
    return notConnectedError();
  }

  async updateClub(_id: string, _patch: UpdateClubInput) {
    return notConnectedError();
  }

  async updateCourt(
    _id: string,
    _patch: Partial<Omit<Court, "id" | "clubId">>,
  ) {
    return notConnectedError();
  }

  async listCourtPriceRules(_courtId: string) {
    return [];
  }

  async upsertCourtPriceRule(_rule: Omit<CourtPriceRule, "id"> & { id?: string }) {
    return notConnectedError();
  }

  async deleteCourtPriceRule(_id: string) {
    return notConnectedError();
  }

  async listCourtReservations(
    _clubId: string,
    options?: { from?: string; to?: string; courtId?: string },
  ) {
    const from = options?.from ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const to = options?.to ?? new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString();
    const response = await this.http.get<ApiEnvelope<Record<string, unknown>[]>>(
      "/club/reservations/calendar",
      { params: { from, to, courtId: options?.courtId } },
    );
    return (readData(response) ?? [])
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map(normalizeReservation);
  }

  async listPairAvailability(_pairId: string) {
    return [];
  }

  async setPairAvailability(_items: Omit<PairAvailability, "id">[]) {
    return notConnectedError();
  }

  async createCourtReservation(_input: CreateCourtReservationInput) {
    return notConnectedError();
  }

  async updateCourtReservation(
    _id: string,
    _patch: UpdateCourtReservationInput,
  ) {
    return notConnectedError();
  }

  async cancelCourtReservation(_id: string) {
    return notConnectedError();
  }

  async getCourtAgendaBoard(
    _clubId: string,
    _courtId: string,
    _options: { from: string; to: string; summaryDate: string },
  ): Promise<CourtAgendaBoardView> {
    return notConnectedError();
  }

  async listCourtsDayOverview(clubId: string, date: string) {
    return emptyCourtsDayOverview(clubId, date);
  }

  async getCourtsAgendaBoard(
    clubId: string,
    _options: { from: string; to: string },
  ) {
    return emptyCourtsAgendaBoard(clubId);
  }

  async quoteCourtSlot(_courtId: string, _startsAt: string) {
    return notConnectedError();
  }

  async listAvailableCourtSlots(
    _courtId: string,
    _dateIso: string,
    _options?: { ignoreReservationId?: string },
  ) {
    return [];
  }

  async searchClubClients(
    _clubId: string,
    _query: string,
    _options?: { signal?: AbortSignal },
  ) {
    return [];
  }

  async createClient(_input: CreateClientInput) {
    return notConnectedError();
  }

  async getDashboard(_clubId: string) {
    return emptyClubDashboard();
  }

  async getRanking(_categoryId?: string) {
    return [];
  }

  async getPlayerHome(_playerId: string) {
    return this.read<PlayerDashboard>("/users/me/tournaments/home");
  }

  async getPlayerFeed(location?: {
    provinceId?: number | null;
    municipalityId?: number | null;
  }) {
    const response = await this.http.get<
      ApiEnvelope<{ items?: import("@/domain").Tournament[] } | import("@/domain").Tournament[]>
    >("/public/tournaments", {
      params: {
        page: 1,
        pageSize: 6,
        provinceId: location?.provinceId ?? undefined,
        municipalityId: location?.municipalityId ?? undefined,
      },
    });
    const payload = readData(response);
    const rows = Array.isArray(payload) ? payload : (payload?.items ?? []);
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const upcoming = rows.filter((tournament) => {
      const end = tournament.endDate ?? tournament.startDate;
      return (
        tournament.status === "inProgress" ||
        (tournament.status === "registrationOpen" && end >= today)
      );
    });
    return { upcomingTournaments: upcoming.slice(0, 6), upcomingReservations: [] };
  }

  async getMyWeek() {
    const response = await this.http.get<
      ApiEnvelope<{ reservations?: unknown[]; events?: unknown[] }>
    >("/users/me/week");
    const data = readData(response);
    const reservations = (data?.reservations ?? [])
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map(normalizeMine)
      .filter((item): item is PlayerReservation => item !== null);
    const events = (data?.events ?? [])
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map(asWeekEvent)
      .filter((item): item is PlayerWeekEvent => item !== null);
    return { reservations, events };
  }

  async listProvinces() {
    return [];
  }

  async listCities(_provinceIdOrName: string) {
    return [];
  }

  listPlayerCoverImages() {
    return [...PLAYER_COVER_PATHS];
  }

  async listPlayers() {
    return this.read<Player[]>("/club/tournaments/players");
  }

  async listClubClients(_clubId: string, _query?: PageQuery) {
    return emptyPaginated<ClubClientSummary>();
  }

  async getClubClientDetail(_clubId: string, _clientId: string) {
    return null;
  }

  async searchPlayers(query: string, options?: { signal?: AbortSignal }) {
    const response = await this.http.get<ApiEnvelope<Player[]>>("/club/tournaments/players", {
      params: { q: query },
      signal: options?.signal,
    });
    return readData(response) ?? [];
  }

  async findIdentityMatches(_input: FindIdentityMatchesInput) {
    return { matches: [] };
  }

  async createPlayer(input: CreatePlayerInput) {
    return this.read<Player>("/club/tournaments/players", "post", input);
  }

  async login(_input: LoginInput) {
    return notConnectedError();
  }

  async registerAccount(_input: RegisterAccountInput) {
    return notConnectedError();
  }

  async updatePlayer(_playerId: string, _input: UpdatePlayerInput) {
    return notConnectedError();
  }

  async registerPair(_input: RegisterPairInput) {
    return notConnectedError();
  }

  async registerPairByAdmin(input: RegisterPairInput) {
    return this.read<RegisterPairResult>(
      `/club/tournaments/categories/${input.tournamentCategoryId}/pairs`,
      "post",
      input,
    );
  }

  async registerPairByPlayer(input: RegisterPairInput) {
    return this.read<RegisterPairResult>(
      `/users/me/tournaments/categories/${input.tournamentCategoryId}`,
      "post",
      {
        sidePreference: input.sidePreference ?? null,
        player2Id: input.player2Id ?? null,
        availability: input.availability ?? [],
      },
    );
  }

  async cancelMyRegistration(categoryId: string) {
    return this.read<TournamentRegistration>(
      `/users/me/tournaments/categories/${categoryId}`,
      "delete",
    );
  }

  async listPublicCategories(tournamentId: string) {
    return this.read<TournamentCategory[]>(`/public/tournaments/${tournamentId}/categories`);
  }

  async listPublicPairs(categoryId: string) {
    return this.read<TournamentPair[]>(`/public/tournaments/categories/${categoryId}/pairs`);
  }

  async listPublicRegistrations(categoryId: string) {
    return this.read<TournamentRegistration[]>(
      `/public/tournaments/categories/${categoryId}/registrations`,
    );
  }

  async getPublicRuleset(categoryId: string) {
    return this.read<TournamentRuleset | null>(
      `/public/tournaments/categories/${categoryId}/ruleset`,
    );
  }

  async listPublicGroups(categoryId: string) {
    return this.read<TournamentGroup[]>(`/public/tournaments/categories/${categoryId}/groups`);
  }

  async listPublicMatches(categoryId: string) {
    return this.read<Match[]>(`/public/tournaments/categories/${categoryId}/matches`);
  }

  async getPublicCuadroBoard(categoryId: string) {
    return this.read<CuadroBoardView>(`/public/tournaments/categories/${categoryId}/boards/cuadro`);
  }

  async getPublicZonesBoard(categoryId: string) {
    return this.read<ZonesBoardView>(`/public/tournaments/categories/${categoryId}/boards/zones`);
  }

  async getPublicParticipantsBoard(categoryId: string) {
    return this.read<ParticipantsBoardView>(
      `/public/tournaments/categories/${categoryId}/boards/participants`,
    );
  }

  async getPublicMatchesBoard(categoryId: string) {
    return this.read<MatchesBoardView>(
      `/public/tournaments/categories/${categoryId}/boards/matches`,
    );
  }

  async getMyRegistration(categoryId: string) {
    return this.read<MyTournamentRegistration>(
      `/users/me/tournaments/categories/${categoryId}`,
    );
  }

  async updatePairPlayers(pairId: string, input: UpdatePairPlayersInput) {
    return this.read<TournamentPair>(`/club/tournaments/pairs/${pairId}`, "patch", input);
  }

  async syncCategoryStructure(categoryId: string, _options?: SyncCategoryStructureOptions) {
    return this.read<{
      synced: boolean;
      message: string;
      groups: TournamentGroup[];
      matches: Match[];
    }>(`/club/tournaments/categories/${categoryId}/sync`, "post");
  }

  async acceptRegistration(registrationId: string) {
    return this.read<AcceptRegistrationResult>(
      `/club/tournaments/registrations/${registrationId}/accept`,
      "post",
    );
  }

  async rejectRegistration(registrationId: string, note?: string | null) {
    return this.read<TournamentRegistration>(
      `/club/tournaments/registrations/${registrationId}/reject`,
      "post",
      { note },
    );
  }

  async disqualifyRegistration(registrationId: string, note: string) {
    return this.read<TournamentRegistration>(
      `/club/tournaments/registrations/${registrationId}/disqualify`,
      "post",
      { note },
    );
  }

  async removeRegistration(registrationId: string, note: string) {
    return this.read<TournamentRegistration>(
      `/club/tournaments/registrations/${registrationId}/remove`,
      "post",
      { note },
    );
  }

  async updateMatchSchedule(
    matchId: string,
    input: { scheduledAt: string | null; courtId: string | null },
    _options?: { force?: boolean; pairLabels?: Record<string, string> },
  ) {
    return this.read<Match>(`/club/tournaments/matches/${matchId}/schedule`, "patch", input);
  }

  async setMatchStatus(matchId: string, status: MatchStatus) {
    return this.read<Match>(`/club/tournaments/matches/${matchId}/status`, "patch", { status });
  }

  async updateCategory(
    id: string,
    patch: Partial<Omit<TournamentCategory, "id" | "tournamentId">>,
  ) {
    return this.read<TournamentCategory>(`/club/tournaments/categories/${id}`, "patch", patch);
  }

  async upsertRuleset(ruleset: TournamentRuleset) {
    return this.read<TournamentRuleset>(
      `/club/tournaments/categories/${ruleset.tournamentCategoryId}/ruleset`,
      "put",
      ruleset,
    );
  }
}

function asWeekEvent(raw: Record<string, unknown>): PlayerWeekEvent | null {
  const id = typeof raw.id === "string" ? raw.id : "";
  const tournamentId = typeof raw.tournamentId === "string" ? raw.tournamentId : "";
  const startsAt = typeof raw.startsAt === "string" ? raw.startsAt : "";
  const kind = raw.kind === "quality" ? "quality" : raw.kind === "match" ? "match" : null;
  if (!id || !tournamentId || !startsAt || !kind) return null;
  const text = (value: unknown) => (typeof value === "string" && value.trim() ? value : null);
  return {
    kind,
    id,
    tournamentId,
    tournamentName: text(raw.tournamentName) ?? "Torneo",
    categoryName: text(raw.categoryName) ?? "",
    clubName: text(raw.clubName) ?? "Club",
    imageUrl: text(raw.imageUrl),
    phaseLabel: text(raw.phaseLabel),
    courtName: text(raw.courtName),
    detail: text(raw.detail),
    startsAt,
    endsAt: text(raw.endsAt),
  };
}
