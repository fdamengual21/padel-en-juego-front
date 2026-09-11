export type EntityStatus = "active" | "inactive" | "archived";

export type ClubRoleCode =
  | "CLUB_ADMIN"
  | "TOURNAMENT_ORGANIZER"
  | "STAFF"
  | "PLAYER";

export type TournamentStatus =
  | "draft"
  | "registrationOpen"
  | "inProgress"
  | "finished"
  | "cancelled";

export type TournamentFormat =
  | "GROUPS_ELIMINATION"
  | "DIRECT_ELIMINATION"
  | "ROUND_ROBIN"
  | "QUALITY";

export type RegistrationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "WAITLIST"
  | "CANCELLED"
  | "DISQUALIFIED";

export type PairStatus = "active" | "withdrawn" | "disqualified";

export type MatchPhase =
  | "GROUP"
  | "PLAY_IN"
  | "R32"
  | "R16"
  | "QF"
  | "SF"
  | "FINAL"
  | "CONSOLATION";

export type MatchStatus =
  | "scheduled"
  | "inProgress"
  | "finished"
  | "walkover"
  | "cancelled";

export type MatchSlotSourceType =
  | "PAIR"
  | "GROUP_POSITION"
  | "MATCH_WINNER"
  | "MATCH_LOSER";

export type TieBreaker =
  | "POINTS"
  | "HEAD_TO_HEAD"
  | "SET_DIFFERENCE"
  | "GAME_DIFFERENCE"
  | "GAMES_WON"
  | "DRAW";

export type RulesetPreset = "QUALITY" | "STANDARD" | "CUSTOM";

/** Cómo se resuelven los iguales (40-40). */
export type EqualsResolution = "goldenPoint" | "advantage";

export type AdvantageType = "advantage" | "goldenPoint";

/** Ubicación para búsqueda de torneos / clubes (provincia + ciudad). */
export interface EntityLocation {
  province: string | null;
  city: string | null;
}

export interface Club {
  id: string;
  name: string;
  status: EntityStatus;
  province: string | null;
  city: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: EntityStatus;
  province: string | null;
  city: string | null;
  createdAt: string;
}

export interface ClubMember {
  id: string;
  clubId: string;
  userId: string;
  status: EntityStatus;
  joinedAt: string;
  role: ClubRoleCode;
}

export interface Player {
  id: string;
  userId: string | null;
  displayName: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  /** Nivel del jugador para validar categorías suma. */
  categoryLevel: import("./categories").CategoryLevelCode;
  createdAt: string;
}

export type {
  CategoryGender,
  CategoryKind,
  CategoryLevelCode,
} from "./categories";
export {
  CATEGORY_LEVELS,
  CATEGORY_LEVEL_VALUE,
} from "./categories";

export interface Tournament {
  id: string;
  clubId: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  /** Ventana horaria diaria del torneo (HH:mm). */
  dailyStartTime: string;
  dailyEndTime: string;
  status: TournamentStatus;
  format: TournamentFormat;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentCategory {
  id: string;
  tournamentId: string;
  name: string;
  gender: import("./categories").CategoryGender;
  kind: import("./categories").CategoryKind;
  /** Nivel fijo si kind=level; null si kind=suma. */
  level: import("./categories").CategoryLevelCode | null;
  /** Objetivo de suma (12, 15, …) si kind=suma. */
  sumaTarget: number | null;
  maxPairs: number;
  status: EntityStatus;
}

export interface TournamentPair {
  id: string;
  tournamentCategoryId: string;
  player1Id: string;
  /** Null si se inscribió solo (busca compañero). */
  player2Id: string | null;
  /** Usuarios asociados al equipo en este torneo (pueden ser null si el jugador no tiene cuenta). */
  user1Id: string | null;
  user2Id: string | null;
  seed: number | null;
  status: PairStatus;
  /**
   * Preferencia de lado cuando la pareja está incompleta (solo player1).
   * Null si la pareja está completa.
   */
  sidePreference: PairSidePreference | null;
}

/** Preferencia de lado al inscribirse solo. */
export type PairSidePreference = "drive" | "reves" | "any";

export interface CreatePlayerInput {
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  categoryLevel?: import("./categories").CategoryLevelCode;
  userId?: string | null;
}

export interface RegisterPairInput {
  tournamentCategoryId: string;
  player1Id: string;
  player2Id?: string | null;
  sidePreference?: PairSidePreference | null;
}

export interface UpdatePairPlayersInput {
  player1Id?: string;
  player2Id?: string | null;
  sidePreference?: PairSidePreference | null;
}

export interface TournamentRegistration {
  id: string;
  tournamentCategoryId: string;
  pairId: string;
  status: RegistrationStatus;
  registeredAt: string;
  /** Motivo de desclasificación / baja (asociado a la inscripción). */
  statusNote: string | null;
  statusChangedAt: string | null;
}

export interface MatchRules {
  setFormat: string;
  setsToWin: number;
  gamesPerSet: number;
  advantageType: AdvantageType;
  goldenPoint: boolean;
  tiebreakEnabled: boolean;
  tiebreakPoints: number;
  tiebreakWinByTwo: boolean;
  superTiebreakEnabled: boolean;
  superTiebreakPoints: number;
  superTiebreakWinByTwo: boolean;
}

export interface TournamentRuleset {
  id: string;
  tournamentCategoryId: string;
  preset: RulesetPreset;
  matchRules: MatchRules;
  tieBreakers: TieBreaker[];
  qualifyPerGroup: number;
  /** Tamaño objetivo por zona; la cantidad de zonas se deriva de las parejas. */
  pairsPerGroup: number | null;
  /** Derivado al sincronizar (ceil(parejas / pairsPerGroup)); no se configura a mano. */
  groupCount: number | null;
}

export interface TournamentGroup {
  id: string;
  tournamentCategoryId: string;
  name: string;
  order: number;
  pairIds: string[];
}

export interface GroupStanding {
  id: string;
  groupId: string;
  pairId: string;
  played: number;
  won: number;
  lost: number;
  points: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  position: number;
}

export interface TournamentRound {
  id: string;
  tournamentCategoryId: string;
  name: string;
  order: number;
  type: MatchPhase;
}

export interface SetScore {
  gamesA: number;
  gamesB: number;
  tiebreakA?: number;
  tiebreakB?: number;
}

export interface Match {
  id: string;
  tournamentCategoryId: string;
  phase: MatchPhase;
  roundId: string | null;
  groupId: string | null;
  scheduledAt: string | null;
  courtId: string | null;
  status: MatchStatus;
  winnerPairId: string | null;
  pairAId: string | null;
  pairBId: string | null;
  sets: SetScore[];
  /** Si true, AutoMatch no sobrescribe horario/cancha. */
  scheduleManual: boolean;
}

export interface MatchSlot {
  id: string;
  matchId: string;
  side: "A" | "B";
  sourceType: MatchSlotSourceType;
  pairId: string | null;
  groupId: string | null;
  groupPosition: number | null;
  sourceMatchId: string | null;
}

export interface Court {
  id: string;
  clubId: string;
  name: string;
  status: EntityStatus;
}

export interface CourtAvailability {
  id: string;
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface PairAvailability {
  id: string;
  pairId: string;
  date: string;
  startTime: string;
  endTime: string;
  priority: number | null;
}

/**
 * Cliente del club: persona que reservó cancha o jugó un torneo en ese club.
 * Entidad propia (no es Player ni User); puede enlazarse a ellos si existen.
 */
export interface Client {
  id: string;
  clubId: string;
  playerId: string | null;
  userId: string | null;
  displayName: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  province: string | null;
  city: string | null;
  /** URL de foto de perfil (mock / futuro storage). */
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CourtReservationStatus = "booked" | "cancelled" | "completed";

/** Reserva de cancha del club (actividad que convierte a alguien en Cliente). */
export interface CourtReservation {
  id: string;
  clubId: string;
  clientId: string;
  courtId: string | null;
  startsAt: string;
  endsAt: string;
  status: CourtReservationStatus;
  createdAt: string;
}

export type ClientTournamentOutcome =
  | "champion"
  | "eliminated"
  | "in_progress"
  | "registered";

export interface ClubClientCategoryStat {
  categoryId: string;
  categoryName: string;
  tournamentCount: number;
}

export interface ClubClientSummary {
  client: Client;
  reservationsCount: number;
  tournamentsCount: number;
  tournamentsWon: number;
  tournamentsLost: number;
  matchesWon: number;
  matchesLost: number;
  byCategory: ClubClientCategoryStat[];
}

export interface ClubClientTournamentEntry {
  tournamentId: string;
  tournamentName: string;
  tournamentStatus: TournamentStatus;
  /** Fecha de inicio del torneo (YYYY-MM-DD o ISO). */
  startDate: string;
  endDate: string | null;
  categoryId: string;
  categoryName: string;
  pairId: string;
  partnerName: string | null;
  matchesWon: number;
  matchesLost: number;
  outcome: ClientTournamentOutcome;
}

export interface ClubClientDetail extends ClubClientSummary {
  tournaments: ClubClientTournamentEntry[];
  recentReservations: CourtReservation[];
}

export interface CoreApiSnapshot {
  clubs: Club[];
  users: User[];
  clubMembers: ClubMember[];
  players: Player[];
  clients: Client[];
  courtReservations: CourtReservation[];
  tournaments: Tournament[];
  categories: TournamentCategory[];
  pairs: TournamentPair[];
  registrations: TournamentRegistration[];
  rulesets: TournamentRuleset[];
  groups: TournamentGroup[];
  standings: GroupStanding[];
  rounds: TournamentRound[];
  matches: Match[];
  matchSlots: MatchSlot[];
  courts: Court[];
  courtAvailability: CourtAvailability[];
  pairAvailability: PairAvailability[];
}

export type CollectionName = keyof CoreApiSnapshot;

export interface GenerateGroupsConfig {
  groupCount: number;
  pairsPerGroup: number;
  qualifyPerGroup: number;
}

/** Vista procesada del cuadro (zonas + eliminación) para UI / futuro realtime. */
export interface CuadroBoardView {
  categoryId: string;
  generatedAt: string;
  groups: TournamentGroup[];
  groupMatches: Match[];
  rounds: TournamentRound[];
  elimMatches: Match[];
  slots: MatchSlot[];
  pairLabels: Record<string, string>;
  pairPlayerNames: Record<string, [string, string]>;
  matchRules: MatchRules;
  /** Parejas confirmadas y completas que aún no están en ninguna zona. */
  unassignedPairs: Array<{
    pairId: string;
    label: string;
    playerNames: [string, string];
  }>;
  notice: string | null;
}

/** Tab Zonas: tablas + agenda + standings listos para UI. */
export interface ZonesBoardView {
  categoryId: string;
  generatedAt: string;
  groups: TournamentGroup[];
  groupMatches: Match[];
  standings: GroupStanding[];
  pairLabels: Record<string, string>;
  pairPlayerNames: Record<string, [string, string]>;
  matchRules: MatchRules;
  courts: Court[];
  allMatches: Match[];
  qualifyPerGroup: number;
  pairsPerGroup: number;
  unassignedPairs: CuadroBoardView["unassignedPairs"];
  notice: string | null;
}

/** Tab Participantes. */
export interface ParticipantsBoardView {
  categoryId: string;
  generatedAt: string;
  rows: Array<{
    pair: TournamentPair;
    registration: TournamentRegistration | null;
    label: string;
    playerNames: [string, string];
    incomplete: boolean;
    disqualified: boolean;
  }>;
  tournamentStarted: boolean;
  notice: string | null;
}

/** Tab Partidos. */
export interface MatchesBoardView {
  categoryId: string;
  generatedAt: string;
  groupMatches: Match[];
  elimMatches: Match[];
  pairLabels: Record<string, string>;
  courtLabels: Record<string, string>;
  matchRules: MatchRules;
  notice: string | null;
}

/** Tab Configuración: snapshot para el formulario. */
export interface ConfigBoardView {
  categoryId: string;
  generatedAt: string;
  tournament: Tournament;
  category: TournamentCategory;
  ruleset: TournamentRuleset | null;
  structureLocked: boolean;
  pairsPerGroup: number;
  qualifyPerGroup: number;
  notice: string | null;
}

export interface GroupConfigValidation {
  ok: boolean;
  qualifiedCount: number;
  message: string | null;
  needsComplementaryRule: boolean;
}

export interface MatchResultInput {
  sets: SetScore[];
  winnerPairId: string;
}

export interface ScheduleResult {
  scheduledCount: number;
  suboptimalCount: number;
  pendingCount: number;
}

/** Opciones al sincronizar zonas / partidos / cuadro. */
export interface SyncCategoryStructureOptions {
  /**
   * Si hay partidos jugados: conservar zonas y resultados (no regenerar).
   * Si false, regenera anclando parejas ya jugadas a su zona.
   */
  preserveResults?: boolean;
}

export interface DisqualifyRegistrationInput {
  registrationId: string;
  note: string;
}
