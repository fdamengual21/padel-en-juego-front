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
  | "ACCEPTED"
  | "REJECTED"
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

/** Día ISO: 1=lunes … 7=domingo. */
export type WeekdayIso = 1 | 2 | 3 | 4 | 5 | 6 | 7;

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
  /** Horario de apertura del club (HH:mm). */
  openTime: string;
  /** Horario de cierre del club (HH:mm). */
  closeTime: string;
  /**
   * Días de apertura del club (ISO: 1=lunes … 7=domingo).
   * Configurado desde Configuración; las canchas lo heredan.
   */
  openDays: WeekdayIso[];
  createdAt: string;
  updatedAt: string;
}

/** Patch de propiedades/configuración del club. */
export interface UpdateClubInput {
  name?: string;
  status?: EntityStatus;
  province?: string | null;
  city?: string | null;
  openTime?: string;
  closeTime?: string;
  openDays?: WeekdayIso[];
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

export type PublicUser = User;

export interface AuthSession {
  user: PublicUser;
  player: Player;
}

export interface RegisterAccountInput {
  firstName: string;
  lastName: string;
  age: number;
  email: string;
  password: string;
  categoryLevel: import("./categories").CategoryLevel;
  province: string;
  city: string;
}

/** Provincia del catálogo geo. */
export interface LocationProvince {
  id: string;
  name: string;
  cities: LocationCity[];
}

/** Localidad / ciudad perteneciente a una provincia. */
export interface LocationCity {
  id: string;
  name: string;
  provinceId: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ClubMember {
  id: string;
  clubId: string;
  userId: string;
  status: EntityStatus;
  joinedAt: string;
  role: ClubRoleCode;
}

/** Posición de lado en cancha (drive / revés). */
export type SidePosition = "drive" | "reves";

export interface Player {
  id: string;
  userId: string | null;
  displayName: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  /** Edad declarada (registro / alta). */
  age: number | null;
  /** Nivel oficial vigente del jugador (1–8). */
  categoryLevel: import("./categories").CategoryLevel;
  /** Historial de categorías (más reciente al final). */
  categoryHistory: import("./categories").PlayerCategoryHistoryEntry[];
  /**
   * Preferencia de lado principal (Drive / Revés).
   * Null = sin preferencia / ambos por igual.
   */
  sidePreferencePrimary: SidePosition | null;
  /**
   * Preferencia secundaria (opcional). Solo válida si difiere de la principal.
   * Indica que también juega el otro lado.
   */
  sidePreferenceSecondary: SidePosition | null;
  /** URL de avatar (mock local / CDN). */
  avatarUrl: string | null;
  /** URL de portada del perfil (mock local / CDN). */
  coverUrl: string | null;
  createdAt: string;
}

export type {
  CategoryGender,
  CategoryKind,
  CategoryLevel,
  PlayerCategoryChangeActor,
  PlayerCategoryChangeReason,
  PlayerCategoryHistoryEntry,
} from "./categories";
export {
  CATEGORY_LEVELS,
  CATEGORY_LEVEL_SUFFIX,
  formatCategoryLevel,
  isCategoryLevel,
  parseCategoryLevel,
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
  /**
   * Precio de inscripción del torneo (moneda local).
   * 0 = sin cargo / a definir.
   */
  registrationFee: number;
  createdAt: string;
  updatedAt: string;
}

/** Circuito de ranking asociado a la categoría (MVP: snapshot manual). */
export type TournamentCircuitType = "NONE" | "CICUPA";

export interface TournamentCategory {
  id: string;
  tournamentId: string;
  name: string;
  gender: import("./categories").CategoryGender;
  kind: import("./categories").CategoryKind;
  /** Nivel fijo si kind=level; null si kind=suma. */
  level: import("./categories").CategoryLevel | null;
  /** Objetivo de suma (12, 15, …) si kind=suma. */
  sumaTarget: number | null;
  maxPairs: number;
  /** Circuito de ranking (NONE = sin ranking externo). */
  circuitType: TournamentCircuitType;
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
  age?: number | null;
  categoryLevel?: import("./categories").CategoryLevel;
  userId?: string | null;
  sidePreferencePrimary?: SidePosition | null;
  sidePreferenceSecondary?: SidePosition | null;
}

export interface UpdatePlayerInput {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  email?: string | null;
  age?: number | null;
  categoryLevel?: import("./categories").CategoryLevel;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  sidePreferencePrimary?: SidePosition | null;
  sidePreferenceSecondary?: SidePosition | null;
}

export interface RegisterPairInput {
  tournamentCategoryId: string;
  player1Id: string;
  player2Id?: string | null;
  sidePreference?: PairSidePreference | null;
  /** Snapshot de puntos de ranking al inscribir (jugador 1). */
  rankingPointsPlayer1?: number | null;
  /** Snapshot de puntos de ranking al inscribir (jugador 2). */
  rankingPointsPlayer2?: number | null;
  /**
   * Disponibilidad de la pareja (día + franja).
   * Obligatoria en torneos no Quality; se ignora en Quality.
   */
  availability?: Array<{
    date: string;
    startTime: string;
    endTime: string;
  }>;
}

/** Resultado de inscripción (jugador o admin). */
export interface RegisterPairResult {
  pair: TournamentPair;
  registration: TournamentRegistration;
  /** Si un solo aceptado se unió automáticamente con otro. */
  autoMatch: SoloPairAutoMatchResult | null;
}

export interface AcceptRegistrationResult {
  registration: TournamentRegistration;
  autoMatch: SoloPairAutoMatchResult | null;
}

/** Detalle de un auto-match de dos solos por preferencia de lado. */
export interface SoloPairAutoMatchResult {
  survivingPairId: string;
  absorbedPairId: string;
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
}

export interface UpdatePairPlayersInput {
  player1Id?: string;
  player2Id?: string | null;
  sidePreference?: PairSidePreference | null;
  rankingPointsPlayer1?: number | null;
  rankingPointsPlayer2?: number | null;
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
  /**
   * Puntos de ranking informados al momento de la inscripción (jugador 1).
   * No es el ranking oficial del circuito; es un snapshot manual.
   */
  rankingPointsPlayer1: number | null;
  /** Idem jugador 2 (null si se anotó solo). */
  rankingPointsPlayer2: number | null;
  /**
   * Puntos que este torneo otorgó según el resultado (cuando se cargue).
   * Independiente del snapshot de ranking.
   */
  tournamentPointsAwarded: number | null;
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
  /** URL pública de la foto. */
  imageUrl: string | null;
  /** Duración del turno en minutos (90 o 120). */
  slotDurationMinutes: number;
  /** Precio base del turno (ARS). */
  basePrice: number;
  /** Tarifas por franja. Vacío si solo aplica el precio base. */
  priceRules: CourtPriceRule[];
}

/** Precio especial por franja horaria de una cancha. */
export interface CourtPriceRule {
  id: string;
  courtId: string;
  startTime: string;
  endTime: string;
  daysOfWeek: WeekdayIso[];
  price: number;
  label: string | null;
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
  /** Precio cobrado al reservar (snapshot). */
  price: number | null;
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
  /** Club donde se jugó el torneo (puede diferir del club de la ficha). */
  clubId: string;
  clubName: string;
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
  /** Categoría oficial del jugador vinculado, si existe. */
  categoryLevel: import("./categories").CategoryLevel | null;
}

/** Partido enriquecido para UI de jugador (versus + fase en español). */
export interface PlayerMatchView {
  match: Match;
  phaseLabel: string;
  pairALabel: string;
  pairBLabel: string;
  courtLabel: string | null;
}

/** Participación de torneo del jugador con partidos y fase alcanzada. */
export interface PlayerTournamentHistoryEntry {
  tournamentId: string;
  tournamentName: string;
  clubId: string;
  clubName: string;
  tournamentStatus: TournamentStatus;
  startDate: string;
  endDate: string | null;
  categoryId: string;
  categoryName: string;
  pairId: string;
  partnerName: string | null;
  matchesWon: number;
  matchesLost: number;
  outcome: ClientTournamentOutcome;
  /** Fase más avanzada jugada (excluye consolación). */
  phaseReached: MatchPhase | null;
  phaseReachedLabel: string | null;
  matches: PlayerMatchView[];
}

export interface PlayerDashboard {
  player: Player;
  city: string | null;
  province: string | null;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  tournamentsCount: number;
  tournamentsWon: number;
  tournamentsLost: number;
  nextMatch: PlayerMatchView | null;
  recentMatches: PlayerMatchView[];
  tournaments: PlayerTournamentHistoryEntry[];
}

/** Reserva próxima enriquecida para el inicio del jugador. */
export interface PlayerUpcomingReservation {
  reservation: CourtReservation;
  courtName: string;
  clubName: string;
}

/** Feed de Inicio (torneos futuros + reservas si hay sesión). */
export interface PlayerFeed {
  upcomingTournaments: Tournament[];
  upcomingReservations: PlayerUpcomingReservation[];
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
  courtPriceRules: CourtPriceRule[];
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
  /** Parejas aceptadas y completas que aún no están en ninguna zona. */
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
  /** Zonas con todos los partidos finalizados (pueden mostrar clasificados). */
  finishedGroupIds: string[];
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
    /** Avatar por jugador (cliente del club); null → iniciales. */
    playerAvatars: [string | null, string | null];
    /** Id de cliente del club por jugador; null si no hay ficha. */
    playerClientIds: [string | null, string | null];
    incomplete: boolean;
    disqualified: boolean;
  }>;
  tournamentStarted: boolean;
  notice: string | null;
  /** Matches de solos aplicados (y persistidos) al armar este board. */
  autoMatches: SoloPairAutoMatchResult[];
}

/** Jugador enriquecido para cards del dashboard club. */
export interface DashboardPlayerRef {
  playerId: string | null;
  clientId: string | null;
  displayName: string;
  avatarUrl: string | null;
}

export interface DashboardUpcomingMatch {
  match: Match;
  tournamentName: string;
  categoryName: string;
  courtName: string | null;
  /** Etiqueta de fase en lenguaje de club (ej. Zonas, Semifinal). */
  phaseLabel: string;
  pairA: [DashboardPlayerRef, DashboardPlayerRef];
  pairB: [DashboardPlayerRef, DashboardPlayerRef];
}

export interface DashboardUpcomingReservation {
  reservation: CourtReservation;
  courtName: string;
  client: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    phone: string | null;
  } | null;
}

export interface ClubDashboardView {
  upcomingMatches: DashboardUpcomingMatch[];
  upcomingReservations: DashboardUpcomingReservation[];
  registeredPairs: number;
  liveMatches: number;
  courtsInUse: number;
  courtsTotal: number;
  tournaments: Tournament[];
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

export type CourtAgendaEventKind = "reservation" | "tournament_match";

export type CourtAgendaEventStatus =
  | "booked"
  | "completed"
  | "cancelled"
  | "scheduled"
  | "inProgress"
  | "finished";

export interface CourtAgendaEvent {
  id: string;
  kind: CourtAgendaEventKind;
  title: string;
  subtitle: string | null;
  startAt: string;
  endAt: string;
  allDay: false;
  status: CourtAgendaEventStatus;
  courtId: string;
  reservationId: string | null;
  matchId: string | null;
  clientId: string | null;
  price: number | null;
  priceLabel: string | null;
}

export interface CourtDayPriceBand {
  startTime: string;
  endTime: string;
  price: number;
  label: string | null;
}

export type CourtLiveStatus = "available" | "occupied" | "closed";

export interface CourtDaySummary {
  date: string;
  totalSlots: number;
  occupiedSlots: number;
  freeSlots: number;
  nextFreeAt: string | null;
  minPrice: number | null;
  message: string;
  /** Tarifas del día (rangos horarios). */
  priceBands: CourtDayPriceBand[];
  /** Turnos libres del día (chips). */
  availableSlots: CourtAvailableSlot[];
  /** Estado en tiempo real: horario de apertura + ocupación actual. */
  liveStatus: CourtLiveStatus;
}

export interface CourtAgendaBoardView {
  clubId: string;
  courtId: string;
  generatedAt: string;
  club: Club;
  court: Court;
  courts: Court[];
  priceRules: CourtPriceRule[];
  daySummary: CourtDaySummary;
  events: CourtAgendaEvent[];
  notice: string | null;
}

/** Resumen liviano de una cancha para la vista “Todas” del día. */
export interface CourtDayOverviewItem {
  court: Court;
  date: string;
  liveStatus: CourtLiveStatus;
  freeSlots: number;
  totalSlots: number;
  nextFreeAt: string | null;
  minPrice: number | null;
  priceBands: CourtDayPriceBand[];
  availableSlots: CourtAvailableSlot[];
}

export interface CourtsDayOverviewView {
  clubId: string;
  date: string;
  generatedAt: string;
  items: CourtDayOverviewItem[];
}

/** Agenda global: eventos de todas las canchas del club. */
export interface CourtsAgendaBoardView {
  clubId: string;
  generatedAt: string;
  club: Club;
  courts: Court[];
  events: CourtAgendaEvent[];
  /** Horario abierto/cerrado del club (para la grilla). */
  openTime: string;
  closeTime: string;
}

export interface CourtSlotQuote {
  price: number;
  label: string | null;
  endsAt: string;
}

/** Turno fijo disponible para reservar en una cancha. */
export interface CourtAvailableSlot {
  startsAt: string;
  endsAt: string;
  /** Ej. "09:00 – 10:30" */
  label: string;
}

export interface CreateCourtInput {
  clubId: string;
  name: string;
  slotDurationMinutes?: number;
  basePrice?: number;
  imageUrl?: string | null;
}

export interface CreateCourtReservationInput {
  clubId: string;
  courtId: string;
  clientId: string;
  startsAt: string;
  endsAt?: string;
  price?: number | null;
}

export interface UpdateCourtReservationInput {
  clientId?: string;
  courtId?: string | null;
  startsAt?: string;
  endsAt?: string;
  status?: CourtReservationStatus;
  price?: number | null;
}

export interface CreateClientInput {
  clubId: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  playerId?: string | null;
  userId?: string | null;
}

/** Coincidencia por email/teléfono al dar de alta en el club. */
export type IdentityMatchKind = "club_client" | "app_user" | "club_player";

export interface IdentityMatch {
  kind: IdentityMatchKind;
  displayName: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  age: number | null;
  categoryLevel: number | null;
  clientId: string | null;
  playerId: string | null;
  userId: string | null;
  clubId: string | null;
  /** Texto UX, ej. "Cliente del club" / "Usuario registrado en la app". */
  sourceLabel: string;
}

export interface FindIdentityMatchesInput {
  clubId: string;
  email?: string | null;
  phone?: string | null;
}

export interface FindIdentityMatchesResult {
  matches: IdentityMatch[];
}

/** Opciones al sincronizar zonas / partidos / cuadro. */
export interface SyncCategoryStructureOptions {
  /**
   * Si hay partidos jugados: conservar zonas y resultados (no regenerar).
   * Si false, regenera anclando parejas ya jugadas a su zona.
   */
  preserveResults?: boolean;
  /**
   * Limpia agendas automáticas (!scheduleManual) y vuelve a auto-agendar.
   * Usar al cambiar fechas / franja / tipo de partido del torneo.
   */
  rescheduleAuto?: boolean;
}

export interface DisqualifyRegistrationInput {
  registrationId: string;
  note: string;
}

/** Aceptar una inscripción pendiente (habilita armado de zonas/partidos). */
export interface AcceptRegistrationInput {
  registrationId: string;
}

/** Rechazar una inscripción pendiente. */
export interface RejectRegistrationInput {
  registrationId: string;
  /** Motivo opcional; queda en statusNote. */
  note?: string | null;
}
