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
