import { coreApi } from '@/config/coreApiClient'
import type { GenerateGroupsConfig, MatchResultInput } from '../types'

export interface ITournamentOpsRepository {
  listCategories(tournamentId: string): ReturnType<ReturnType<typeof coreApi>['listCategories']>
  createCategory: ReturnType<typeof coreApi>['createCategory']
  listPairs(categoryId: string): ReturnType<ReturnType<typeof coreApi>['listPairs']>
  listRegistrations(categoryId: string): ReturnType<ReturnType<typeof coreApi>['listRegistrations']>
  getRuleset(categoryId: string): ReturnType<ReturnType<typeof coreApi>['getRuleset']>
  listGroups(categoryId: string): ReturnType<ReturnType<typeof coreApi>['listGroups']>
  listStandings(categoryId: string): ReturnType<ReturnType<typeof coreApi>['listStandings']>
  listMatches(categoryId: string): ReturnType<ReturnType<typeof coreApi>['listMatches']>
  getBracket(categoryId: string): ReturnType<ReturnType<typeof coreApi>['getBracket']>
  getCuadroBoard(categoryId: string): ReturnType<ReturnType<typeof coreApi>['getCuadroBoard']>
  getZonesBoard(categoryId: string): ReturnType<ReturnType<typeof coreApi>['getZonesBoard']>
  getParticipantsBoard(categoryId: string): ReturnType<ReturnType<typeof coreApi>['getParticipantsBoard']>
  getMatchesBoard(categoryId: string): ReturnType<ReturnType<typeof coreApi>['getMatchesBoard']>
  getConfigBoard(categoryId: string): ReturnType<ReturnType<typeof coreApi>['getConfigBoard']>
  generateGroups(categoryId: string, config: GenerateGroupsConfig): ReturnType<ReturnType<typeof coreApi>['generateGroupsForCategory']>
  generateGroupMatches(categoryId: string): ReturnType<ReturnType<typeof coreApi>['generateGroupMatches']>
  submitMatchResult(matchId: string, input: MatchResultInput): ReturnType<ReturnType<typeof coreApi>['submitMatchResult']>
  generateBracket(categoryId: string): ReturnType<ReturnType<typeof coreApi>['generateBracket']>
  scheduleCategory(categoryId: string): ReturnType<ReturnType<typeof coreApi>['scheduleCategory']>
  listCourts(clubId: string): ReturnType<ReturnType<typeof coreApi>['listCourts']>
  createCourt(
    input: Parameters<ReturnType<typeof coreApi>["createCourt"]>[0],
  ): ReturnType<ReturnType<typeof coreApi>["createCourt"]>
  updateClub(
    id: string,
    patch: Parameters<ReturnType<typeof coreApi>["updateClub"]>[1],
  ): ReturnType<ReturnType<typeof coreApi>["updateClub"]>
  updateCourt(
    id: string,
    patch: Parameters<ReturnType<typeof coreApi>["updateCourt"]>[1],
  ): ReturnType<ReturnType<typeof coreApi>["updateCourt"]>
  listCourtPriceRules(
    courtId: string,
  ): ReturnType<ReturnType<typeof coreApi>["listCourtPriceRules"]>
  upsertCourtPriceRule(
    rule: Parameters<ReturnType<typeof coreApi>["upsertCourtPriceRule"]>[0],
  ): ReturnType<ReturnType<typeof coreApi>["upsertCourtPriceRule"]>
  deleteCourtPriceRule(
    id: string,
  ): ReturnType<ReturnType<typeof coreApi>["deleteCourtPriceRule"]>
  listCourtReservations(
    clubId: string,
    options?: Parameters<ReturnType<typeof coreApi>["listCourtReservations"]>[1],
  ): ReturnType<ReturnType<typeof coreApi>["listCourtReservations"]>
  listPairAvailability(
    pairId: string,
  ): ReturnType<ReturnType<typeof coreApi>["listPairAvailability"]>
  setPairAvailability(
    items: Parameters<ReturnType<typeof coreApi>["setPairAvailability"]>[0],
  ): ReturnType<ReturnType<typeof coreApi>["setPairAvailability"]>
  createCourtReservation(
    input: Parameters<ReturnType<typeof coreApi>["createCourtReservation"]>[0],
  ): ReturnType<ReturnType<typeof coreApi>["createCourtReservation"]>
  updateCourtReservation(
    id: string,
    patch: Parameters<ReturnType<typeof coreApi>["updateCourtReservation"]>[1],
  ): ReturnType<ReturnType<typeof coreApi>["updateCourtReservation"]>
  cancelCourtReservation(
    id: string,
  ): ReturnType<ReturnType<typeof coreApi>["cancelCourtReservation"]>
  getCourtAgendaBoard(
    clubId: string,
    courtId: string,
    options: Parameters<ReturnType<typeof coreApi>["getCourtAgendaBoard"]>[2],
  ): ReturnType<ReturnType<typeof coreApi>["getCourtAgendaBoard"]>
  listCourtsDayOverview(
    clubId: string,
    date: string,
  ): ReturnType<ReturnType<typeof coreApi>["listCourtsDayOverview"]>
  getCourtsAgendaBoard(
    clubId: string,
    options: { from: string; to: string },
  ): ReturnType<ReturnType<typeof coreApi>["getCourtsAgendaBoard"]>
  quoteCourtSlot(
    courtId: string,
    startsAt: string,
  ): ReturnType<ReturnType<typeof coreApi>["quoteCourtSlot"]>
  listAvailableCourtSlots(
    courtId: string,
    dateIso: string,
    options?: { ignoreReservationId?: string },
  ): ReturnType<ReturnType<typeof coreApi>["listAvailableCourtSlots"]>
  searchClubClients(
    clubId: string,
    query: string,
    options?: { signal?: AbortSignal },
  ): ReturnType<ReturnType<typeof coreApi>["searchClubClients"]>
  createClient(
    input: Parameters<ReturnType<typeof coreApi>["createClient"]>[0],
  ): ReturnType<ReturnType<typeof coreApi>["createClient"]>
  getDashboard(clubId: string): ReturnType<ReturnType<typeof coreApi>['getDashboard']>
  getRanking(categoryId?: string): ReturnType<ReturnType<typeof coreApi>['getRanking']>
  getPlayerHome(playerId: string): ReturnType<ReturnType<typeof coreApi>['getPlayerHome']>
  listPlayers(): ReturnType<ReturnType<typeof coreApi>["listPlayers"]>;
  listClubClients(
    clubId: string,
    query?: import("@core-api").PageQuery,
  ): ReturnType<ReturnType<typeof coreApi>["listClubClients"]>;
  getClubClientDetail(
    clubId: string,
    clientId: string,
  ): ReturnType<ReturnType<typeof coreApi>["getClubClientDetail"]>;
  searchPlayers(
    query: string,
    options?: { signal?: AbortSignal },
  ): ReturnType<ReturnType<typeof coreApi>["searchPlayers"]>;
  createPlayer(
    input: import("@core-api").CreatePlayerInput,
  ): ReturnType<ReturnType<typeof coreApi>["createPlayer"]>;
  updatePlayer(
    playerId: string,
    input: import("@core-api").UpdatePlayerInput,
  ): ReturnType<ReturnType<typeof coreApi>["updatePlayer"]>;
  registerPair(
    input: import("@core-api").RegisterPairInput,
  ): ReturnType<ReturnType<typeof coreApi>["registerPair"]>;
  updatePairPlayers(
    pairId: string,
    input: import("@core-api").UpdatePairPlayersInput,
  ): ReturnType<ReturnType<typeof coreApi>["updatePairPlayers"]>;
  syncCategoryStructure(
    categoryId: string,
    options?: import("@core-api").SyncCategoryStructureOptions,
  ): ReturnType<ReturnType<typeof coreApi>["syncCategoryStructure"]>;
  acceptRegistration(
    registrationId: string,
  ): ReturnType<ReturnType<typeof coreApi>["acceptRegistration"]>;
  rejectRegistration(
    registrationId: string,
    note?: string | null,
  ): ReturnType<ReturnType<typeof coreApi>["rejectRegistration"]>;
  disqualifyRegistration(
    registrationId: string,
    note: string,
  ): ReturnType<ReturnType<typeof coreApi>["disqualifyRegistration"]>;
  removeRegistration(
    registrationId: string,
    note: string,
  ): ReturnType<ReturnType<typeof coreApi>["removeRegistration"]>;
  updateMatchSchedule(
    matchId: string,
    input: { scheduledAt: string | null; courtId: string | null },
    options?: { force?: boolean; pairLabels?: Record<string, string> },
  ): ReturnType<ReturnType<typeof coreApi>["updateMatchSchedule"]>;
  setMatchStatus(
    matchId: string,
    status: import("@core-api").MatchStatus,
  ): ReturnType<ReturnType<typeof coreApi>["setMatchStatus"]>;
  updateCategory(
    id: string,
    patch: Partial<Omit<import("@core-api").TournamentCategory, "id" | "tournamentId">>,
  ): ReturnType<ReturnType<typeof coreApi>["updateCategory"]>;
  upsertRuleset(
    ruleset: import("@core-api").TournamentRuleset,
  ): ReturnType<ReturnType<typeof coreApi>["upsertRuleset"]>;
}

export class TournamentOpsRepository implements ITournamentOpsRepository {
  listCategories(tournamentId: string) {
    return coreApi().listCategories(tournamentId)
  }

  createCategory: ITournamentOpsRepository['createCategory'] = (input) =>
    coreApi().createCategory(input)

  listPairs(categoryId: string) {
    return coreApi().listPairs(categoryId)
  }

  listRegistrations(categoryId: string) {
    return coreApi().listRegistrations(categoryId)
  }

  getRuleset(categoryId: string) {
    return coreApi().getRuleset(categoryId)
  }

  listGroups(categoryId: string) {
    return coreApi().listGroups(categoryId)
  }

  listStandings(categoryId: string) {
    return coreApi().listStandings(categoryId)
  }

  listMatches(categoryId: string) {
    return coreApi().listMatches(categoryId)
  }

  getBracket(categoryId: string) {
    return coreApi().getBracket(categoryId)
  }

  getCuadroBoard(categoryId: string) {
    return coreApi().getCuadroBoard(categoryId)
  }

  getZonesBoard(categoryId: string) {
    return coreApi().getZonesBoard(categoryId)
  }

  getParticipantsBoard(categoryId: string) {
    return coreApi().getParticipantsBoard(categoryId)
  }

  getMatchesBoard(categoryId: string) {
    return coreApi().getMatchesBoard(categoryId)
  }

  getConfigBoard(categoryId: string) {
    return coreApi().getConfigBoard(categoryId)
  }

  generateGroups(categoryId: string, config: GenerateGroupsConfig) {
    return coreApi().generateGroupsForCategory(categoryId, config)
  }

  generateGroupMatches(categoryId: string) {
    return coreApi().generateGroupMatches(categoryId)
  }

  submitMatchResult(matchId: string, input: MatchResultInput) {
    return coreApi().submitMatchResult(matchId, input)
  }

  generateBracket(categoryId: string) {
    return coreApi().generateBracket(categoryId)
  }

  scheduleCategory(categoryId: string) {
    return coreApi().scheduleCategory(categoryId)
  }

  listCourts(clubId: string) {
    return coreApi().listCourts(clubId)
  }

  createCourt(input: Parameters<ReturnType<typeof coreApi>["createCourt"]>[0]) {
    return coreApi().createCourt(input)
  }

  updateClub(
    id: string,
    patch: Parameters<ReturnType<typeof coreApi>["updateClub"]>[1],
  ) {
    return coreApi().updateClub(id, patch)
  }

  updateCourt(
    id: string,
    patch: Parameters<ReturnType<typeof coreApi>["updateCourt"]>[1],
  ) {
    return coreApi().updateCourt(id, patch)
  }

  listCourtPriceRules(courtId: string) {
    return coreApi().listCourtPriceRules(courtId)
  }

  upsertCourtPriceRule(
    rule: Parameters<ReturnType<typeof coreApi>["upsertCourtPriceRule"]>[0],
  ) {
    return coreApi().upsertCourtPriceRule(rule)
  }

  deleteCourtPriceRule(id: string) {
    return coreApi().deleteCourtPriceRule(id)
  }

  listCourtReservations(
    clubId: string,
    options?: Parameters<ReturnType<typeof coreApi>["listCourtReservations"]>[1],
  ) {
    return coreApi().listCourtReservations(clubId, options)
  }

  listPairAvailability(pairId: string) {
    return coreApi().listPairAvailability(pairId)
  }

  setPairAvailability(
    items: Parameters<ReturnType<typeof coreApi>["setPairAvailability"]>[0],
  ) {
    return coreApi().setPairAvailability(items)
  }

  createCourtReservation(
    input: Parameters<ReturnType<typeof coreApi>["createCourtReservation"]>[0],
  ) {
    return coreApi().createCourtReservation(input)
  }

  updateCourtReservation(
    id: string,
    patch: Parameters<ReturnType<typeof coreApi>["updateCourtReservation"]>[1],
  ) {
    return coreApi().updateCourtReservation(id, patch)
  }

  cancelCourtReservation(id: string) {
    return coreApi().cancelCourtReservation(id)
  }

  getCourtAgendaBoard(
    clubId: string,
    courtId: string,
    options: Parameters<ReturnType<typeof coreApi>["getCourtAgendaBoard"]>[2],
  ) {
    return coreApi().getCourtAgendaBoard(clubId, courtId, options)
  }

  listCourtsDayOverview(clubId: string, date: string) {
    return coreApi().listCourtsDayOverview(clubId, date)
  }

  getCourtsAgendaBoard(clubId: string, options: { from: string; to: string }) {
    return coreApi().getCourtsAgendaBoard(clubId, options)
  }

  quoteCourtSlot(courtId: string, startsAt: string) {
    return coreApi().quoteCourtSlot(courtId, startsAt)
  }

  listAvailableCourtSlots(
    courtId: string,
    dateIso: string,
    options?: { ignoreReservationId?: string },
  ) {
    return coreApi().listAvailableCourtSlots(courtId, dateIso, options)
  }

  searchClubClients(
    clubId: string,
    query: string,
    options?: { signal?: AbortSignal },
  ) {
    return coreApi().searchClubClients(clubId, query, options)
  }

  createClient(input: Parameters<ReturnType<typeof coreApi>["createClient"]>[0]) {
    return coreApi().createClient(input)
  }

  getDashboard(clubId: string) {
    return coreApi().getDashboard(clubId)
  }

  getRanking(categoryId?: string) {
    return coreApi().getRanking(categoryId)
  }

  getPlayerHome(playerId: string) {
    return coreApi().getPlayerHome(playerId)
  }

  listPlayers() {
    return coreApi().listPlayers()
  }

  listClubClients(clubId: string, query?: import("@core-api").PageQuery) {
    return coreApi().listClubClients(clubId, query)
  }

  getClubClientDetail(clubId: string, clientId: string) {
    return coreApi().getClubClientDetail(clubId, clientId)
  }

  searchPlayers(query: string, options?: { signal?: AbortSignal }) {
    return coreApi().searchPlayers(query, options)
  }

  createPlayer(input: import("@core-api").CreatePlayerInput) {
    return coreApi().createPlayer(input)
  }

  updatePlayer(
    playerId: string,
    input: import("@core-api").UpdatePlayerInput,
  ) {
    return coreApi().updatePlayer(playerId, input)
  }

  registerPair(input: import("@core-api").RegisterPairInput) {
    return coreApi().registerPair(input)
  }

  updatePairPlayers(
    pairId: string,
    input: import("@core-api").UpdatePairPlayersInput,
  ) {
    return coreApi().updatePairPlayers(pairId, input)
  }

  syncCategoryStructure(
    categoryId: string,
    options?: import("@core-api").SyncCategoryStructureOptions,
  ) {
    return coreApi().syncCategoryStructure(categoryId, options)
  }

  acceptRegistration(registrationId: string) {
    return coreApi().acceptRegistration(registrationId)
  }

  rejectRegistration(registrationId: string, note?: string | null) {
    return coreApi().rejectRegistration(registrationId, note)
  }

  disqualifyRegistration(registrationId: string, note: string) {
    return coreApi().disqualifyRegistration(registrationId, note)
  }

  removeRegistration(registrationId: string, note: string) {
    return coreApi().removeRegistration(registrationId, note)
  }

  updateMatchSchedule(
    matchId: string,
    input: { scheduledAt: string | null; courtId: string | null },
    options?: { force?: boolean; pairLabels?: Record<string, string> },
  ) {
    return coreApi().updateMatchSchedule(matchId, input, options)
  }

  setMatchStatus(matchId: string, status: import("@core-api").MatchStatus) {
    return coreApi().setMatchStatus(matchId, status)
  }

  updateCategory(
    id: string,
    patch: Partial<Omit<import("@core-api").TournamentCategory, "id" | "tournamentId">>,
  ) {
    return coreApi().updateCategory(id, patch)
  }

  upsertRuleset(ruleset: import("@core-api").TournamentRuleset) {
    return coreApi().upsertRuleset(ruleset)
  }
}
