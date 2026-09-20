import {
  PLAYER_COVER_PATHS,
  emptyClubDashboard,
  emptyCourtsAgendaBoard,
  emptyCourtsDayOverview,
  emptyCuadroBoard,
  emptyMatchesBoard,
  emptyPaginated,
  emptyParticipantsBoard,
  emptyPlayer,
  emptyPlayerDashboard,
  emptyPlayerFeed,
  emptyZonesBoard,
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
  type PageQuery,
  type PaginatedResult,
  type PairAvailability,
  type ParticipantsBoardView,
  type Player,
  type PlayerDashboard,
  type PlayerFeed,
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
  getPlayerFeed(
    clubId: string,
    playerId: string | null,
  ): Promise<PlayerFeed>;
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
}

export class TournamentOpsRepository implements ITournamentOpsRepository {
  async listCategories(_tournamentId: string) {
    return [];
  }

  async createCategory(_input: Omit<TournamentCategory, "id">) {
    return notConnectedError();
  }

  async listPairs(_categoryId: string) {
    return [];
  }

  async listRegistrations(_categoryId: string) {
    return [];
  }

  async getRuleset(_categoryId: string) {
    return null;
  }

  async listGroups(_categoryId: string) {
    return [];
  }

  async listStandings(_categoryId: string) {
    return [];
  }

  async listMatches(_categoryId: string) {
    return [];
  }

  async getBracket(_categoryId: string) {
    return { rounds: [], matches: [], slots: [] };
  }

  async getCuadroBoard(categoryId: string) {
    return emptyCuadroBoard(categoryId);
  }

  async getZonesBoard(categoryId: string) {
    return emptyZonesBoard(categoryId);
  }

  async getParticipantsBoard(categoryId: string) {
    return emptyParticipantsBoard(categoryId);
  }

  async getMatchesBoard(categoryId: string) {
    return emptyMatchesBoard(categoryId);
  }

  async getConfigBoard(_categoryId: string): Promise<ConfigBoardView> {
    return notConnectedError();
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

  async submitMatchResult(_matchId: string, _input: MatchResultInput) {
    return notConnectedError();
  }

  async generateBracket(_categoryId: string) {
    return notConnectedError();
  }

  async scheduleCategory(_categoryId: string) {
    return notConnectedError();
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
    _options?: { from?: string; to?: string; courtId?: string },
  ) {
    return [];
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

  async getPlayerHome(playerId: string) {
    return emptyPlayerDashboard(emptyPlayer(playerId));
  }

  async getPlayerFeed(_clubId: string, _playerId: string | null) {
    return emptyPlayerFeed();
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
    return [];
  }

  async listClubClients(_clubId: string, _query?: PageQuery) {
    return emptyPaginated<ClubClientSummary>();
  }

  async getClubClientDetail(_clubId: string, _clientId: string) {
    return null;
  }

  async searchPlayers(
    _query: string,
    _options?: { signal?: AbortSignal },
  ) {
    return [];
  }

  async findIdentityMatches(_input: FindIdentityMatchesInput) {
    return { matches: [] };
  }

  async createPlayer(_input: CreatePlayerInput) {
    return notConnectedError();
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

  async registerPairByAdmin(_input: RegisterPairInput) {
    return notConnectedError();
  }

  async registerPairByPlayer(_input: RegisterPairInput) {
    return notConnectedError();
  }

  async updatePairPlayers(
    _pairId: string,
    _input: UpdatePairPlayersInput,
  ) {
    return notConnectedError();
  }

  async syncCategoryStructure(
    _categoryId: string,
    _options?: SyncCategoryStructureOptions,
  ) {
    return notConnectedError();
  }

  async acceptRegistration(_registrationId: string) {
    return notConnectedError();
  }

  async rejectRegistration(
    _registrationId: string,
    _note?: string | null,
  ) {
    return notConnectedError();
  }

  async disqualifyRegistration(_registrationId: string, _note: string) {
    return notConnectedError();
  }

  async removeRegistration(_registrationId: string, _note: string) {
    return notConnectedError();
  }

  async updateMatchSchedule(
    _matchId: string,
    _input: { scheduledAt: string | null; courtId: string | null },
    _options?: { force?: boolean; pairLabels?: Record<string, string> },
  ) {
    return notConnectedError();
  }

  async setMatchStatus(_matchId: string, _status: MatchStatus) {
    return notConnectedError();
  }

  async updateCategory(
    _id: string,
    _patch: Partial<Omit<TournamentCategory, "id" | "tournamentId">>,
  ) {
    return notConnectedError();
  }

  async upsertRuleset(_ruleset: TournamentRuleset) {
    return notConnectedError();
  }
}
