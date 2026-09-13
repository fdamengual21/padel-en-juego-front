import type { ITournamentOpsRepository } from "../repositories/TournamentOpsRepository";
import type { GenerateGroupsConfig, MatchResultInput } from "../types";

export class TournamentOpsService {
  private readonly repository: ITournamentOpsRepository;

  constructor(repository: ITournamentOpsRepository) {
    this.repository = repository;
  }

  listCategories(tournamentId: string) {
    return this.repository.listCategories(tournamentId);
  }

  createCategory(...args: Parameters<ITournamentOpsRepository["createCategory"]>) {
    return this.repository.createCategory(...args);
  }

  listPairs(categoryId: string) {
    return this.repository.listPairs(categoryId);
  }

  listRegistrations(categoryId: string) {
    return this.repository.listRegistrations(categoryId);
  }

  getRuleset(categoryId: string) {
    return this.repository.getRuleset(categoryId);
  }

  listGroups(categoryId: string) {
    return this.repository.listGroups(categoryId);
  }

  listStandings(categoryId: string) {
    return this.repository.listStandings(categoryId);
  }

  listMatches(categoryId: string) {
    return this.repository.listMatches(categoryId);
  }

  getBracket(categoryId: string) {
    return this.repository.getBracket(categoryId);
  }

  getCuadroBoard(categoryId: string) {
    return this.repository.getCuadroBoard(categoryId);
  }

  getZonesBoard(categoryId: string) {
    return this.repository.getZonesBoard(categoryId);
  }

  getParticipantsBoard(categoryId: string) {
    return this.repository.getParticipantsBoard(categoryId);
  }

  getMatchesBoard(categoryId: string) {
    return this.repository.getMatchesBoard(categoryId);
  }

  getConfigBoard(categoryId: string) {
    return this.repository.getConfigBoard(categoryId);
  }

  generateGroups(categoryId: string, config: GenerateGroupsConfig) {
    return this.repository.generateGroups(categoryId, config);
  }

  generateGroupMatches(categoryId: string) {
    return this.repository.generateGroupMatches(categoryId);
  }

  submitMatchResult(matchId: string, input: MatchResultInput) {
    return this.repository.submitMatchResult(matchId, input);
  }

  generateBracket(categoryId: string) {
    return this.repository.generateBracket(categoryId);
  }

  scheduleCategory(categoryId: string) {
    return this.repository.scheduleCategory(categoryId);
  }

  listCourts(clubId: string) {
    return this.repository.listCourts(clubId);
  }

  createCourt(...args: Parameters<ITournamentOpsRepository["createCourt"]>) {
    return this.repository.createCourt(...args);
  }

  updateClub(...args: Parameters<ITournamentOpsRepository["updateClub"]>) {
    return this.repository.updateClub(...args);
  }

  updateCourt(...args: Parameters<ITournamentOpsRepository["updateCourt"]>) {
    return this.repository.updateCourt(...args);
  }

  listCourtPriceRules(courtId: string) {
    return this.repository.listCourtPriceRules(courtId);
  }

  upsertCourtPriceRule(
    ...args: Parameters<ITournamentOpsRepository["upsertCourtPriceRule"]>
  ) {
    return this.repository.upsertCourtPriceRule(...args);
  }

  deleteCourtPriceRule(id: string) {
    return this.repository.deleteCourtPriceRule(id);
  }

  listCourtReservations(
    ...args: Parameters<ITournamentOpsRepository["listCourtReservations"]>
  ) {
    return this.repository.listCourtReservations(...args);
  }

  listPairAvailability(pairId: string) {
    return this.repository.listPairAvailability(pairId);
  }

  setPairAvailability(
    ...args: Parameters<ITournamentOpsRepository["setPairAvailability"]>
  ) {
    return this.repository.setPairAvailability(...args);
  }

  createCourtReservation(
    ...args: Parameters<ITournamentOpsRepository["createCourtReservation"]>
  ) {
    return this.repository.createCourtReservation(...args);
  }

  updateCourtReservation(
    ...args: Parameters<ITournamentOpsRepository["updateCourtReservation"]>
  ) {
    return this.repository.updateCourtReservation(...args);
  }

  cancelCourtReservation(id: string) {
    return this.repository.cancelCourtReservation(id);
  }

  getCourtAgendaBoard(
    ...args: Parameters<ITournamentOpsRepository["getCourtAgendaBoard"]>
  ) {
    return this.repository.getCourtAgendaBoard(...args);
  }

  listCourtsDayOverview(clubId: string, date: string) {
    return this.repository.listCourtsDayOverview(clubId, date);
  }

  getCourtsAgendaBoard(clubId: string, options: { from: string; to: string }) {
    return this.repository.getCourtsAgendaBoard(clubId, options);
  }

  quoteCourtSlot(courtId: string, startsAt: string) {
    return this.repository.quoteCourtSlot(courtId, startsAt);
  }

  listAvailableCourtSlots(
    courtId: string,
    dateIso: string,
    options?: { ignoreReservationId?: string },
  ) {
    return this.repository.listAvailableCourtSlots(courtId, dateIso, options);
  }

  searchClubClients(
    ...args: Parameters<ITournamentOpsRepository["searchClubClients"]>
  ) {
    return this.repository.searchClubClients(...args);
  }

  createClient(...args: Parameters<ITournamentOpsRepository["createClient"]>) {
    return this.repository.createClient(...args);
  }

  getDashboard(clubId: string) {
    return this.repository.getDashboard(clubId);
  }

  getRanking(categoryId?: string) {
    return this.repository.getRanking(categoryId);
  }

  getPlayerHome(playerId: string) {
    return this.repository.getPlayerHome(playerId);
  }

  listPlayers() {
    return this.repository.listPlayers();
  }

  listClubClients(clubId: string, query?: import("@core-api").PageQuery) {
    return this.repository.listClubClients(clubId, query);
  }

  getClubClientDetail(clubId: string, clientId: string) {
    return this.repository.getClubClientDetail(clubId, clientId);
  }

  searchPlayers(query: string, options?: { signal?: AbortSignal }) {
    return this.repository.searchPlayers(query, options);
  }

  createPlayer(input: import("@core-api").CreatePlayerInput) {
    return this.repository.createPlayer(input);
  }

  updatePlayer(
    playerId: string,
    input: import("@core-api").UpdatePlayerInput,
  ) {
    return this.repository.updatePlayer(playerId, input);
  }

  registerPair(input: import("@core-api").RegisterPairInput) {
    return this.repository.registerPair(input);
  }

  updatePairPlayers(
    pairId: string,
    input: import("@core-api").UpdatePairPlayersInput,
  ) {
    return this.repository.updatePairPlayers(pairId, input);
  }

  syncCategoryStructure(
    categoryId: string,
    options?: import("@core-api").SyncCategoryStructureOptions,
  ) {
    return this.repository.syncCategoryStructure(categoryId, options);
  }

  acceptRegistration(registrationId: string) {
    return this.repository.acceptRegistration(registrationId);
  }

  rejectRegistration(registrationId: string, note?: string | null) {
    return this.repository.rejectRegistration(registrationId, note);
  }

  disqualifyRegistration(registrationId: string, note: string) {
    return this.repository.disqualifyRegistration(registrationId, note);
  }

  removeRegistration(registrationId: string, note: string) {
    return this.repository.removeRegistration(registrationId, note);
  }

  updateMatchSchedule(
    matchId: string,
    input: { scheduledAt: string | null; courtId: string | null },
    options?: { force?: boolean; pairLabels?: Record<string, string> },
  ) {
    return this.repository.updateMatchSchedule(matchId, input, options);
  }

  setMatchStatus(matchId: string, status: import("@core-api").MatchStatus) {
    return this.repository.setMatchStatus(matchId, status);
  }

  updateCategory(
    id: string,
    patch: Partial<Omit<import("@core-api").TournamentCategory, "id" | "tournamentId">>,
  ) {
    return this.repository.updateCategory(id, patch);
  }

  upsertRuleset(ruleset: import("@core-api").TournamentRuleset) {
    return this.repository.upsertRuleset(ruleset);
  }
}
