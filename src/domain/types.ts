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

/** Respuesta al cerrar un torneo. */
export interface FinishTournamentResult {
  status: string;
  pointsAwarded: boolean;
  reason: "scoring" | "belowMinimum" | "overMaximum" | "notScoring";
  message: string;
}

/** Respuesta de «Comenzar torneo». */
export interface StartTournamentResult {
  status: string;
  message: string;
  /** Solos que se unieron entre sí al comenzar. */
  autoMatches: SoloPairAutoMatchResult[];
  /** Nombres de los solos que quedaron sin pareja y se dieron de baja. */
  leftOut: string[];
}

/** Respuesta al cancelar un torneo. */
export interface CancelTournamentResult {
  status: string;
  message: string;
}

export type TournamentFormat =
  | "GROUPS_ELIMINATION"
  | "DIRECT_ELIMINATION"
  | "ROUND_ROBIN";

/** Convierte un formato persistido. Quality viejo pasa a todos contra todos. */
export function asTournamentFormat(value: string | null | undefined): TournamentFormat {
  if (value === "DIRECT_ELIMINATION" || value === "ROUND_ROBIN") return value;
  if (value === "QUALITY") return "ROUND_ROBIN";
  return "GROUPS_ELIMINATION";
}

export type RegistrationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "WAITLIST"
  | "CANCELLED"
  | "DISQUALIFIED";

/** Inscripciones que siguen ocupando un lugar en la categoría. */
export const OCCUPYING_REGISTRATION_STATUSES = new Set<RegistrationStatus>([
  "PENDING",
  "ACCEPTED",
  "WAITLIST",
  "DISQUALIFIED",
]);

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
  | "MATCH_LOSER"
  /** Lugar sin rival: la pareja del otro lado pasa directo. */
  | "BYE";

/**
 * Criterio de desempate (orden FIP). Entre dos: enfrentamiento directo. Entre tres o más: sets y games
 * contando solo los partidos entre las empatadas; después games de toda la zona; y por último lo que
 * fije el club (sorteo). `UNRESOLVED`: el reglamento no alcanzó y el club todavía no resolvió.
 */
export type TieBreaker =
  | "POINTS"
  | "HEAD_TO_HEAD"
  | "SET_DIFFERENCE"
  | "GAME_DIFFERENCE"
  | "TOTAL_GAME_DIFFERENCE"
  | "TOTAL_GAMES_WON"
  | "MANUAL"
  | "UNRESOLVED";

export type RulesetPreset = "QUALITY" | "STANDARD" | "CUSTOM";

/** Ocupación de una cancha en el horario de un partido Quality. */
export interface CourtOccupancyItem {
  courtId: string;
  courtName: string;
  status: "free" | "occupied";
  reason: "reservation" | "fixed" | "match" | null;
}

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
  /**
   * Lado de la ficha (`left` | `right` | `both`). Opcional.
   * Si está, precarga la inscripción de un solo.
   */
  sidePreference?: import("./playerSidePreference").PlayerSidePreference | null;
  /** URL de avatar (mock local / CDN). */
  avatarUrl: string | null;
  /** URL de portada del perfil (mock local / CDN). */
  coverUrl: string | null;
  createdAt: string;
}

/** Resultado de buscar un jugador con cuenta (compañero al inscribirse). */
export interface RegisteredPlayerSearchItem {
  id: string;
  fullName: string;
  categoryLevel: import("./categories").CategoryLevel | null;
  avatarUrl: string | null;
  /** Solo si el perfil lo publicó. */
  phone: string | null;
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
  /** Inicio de la ventana de juego (HH:mm). */
  dailyStartTime: string;
  /** Legado. El autoasignado usa el cierre del club. */
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
  /** Nombre del predio. Lo trae el listado publico. */
  clubName?: string | null;
  /** Teléfono de contacto del club. Null si el predio no lo cargó. */
  clubPhone?: string | null;
  /** Avatar publico del club, cuando el listado lo trae. */
  clubAvatarUrl?: string | null;
  /** Portada publica del club, cuando el listado la trae. */
  clubCoverUrl?: string | null;
  /** Flyer publico del torneo. Null si el club no cargo uno. */
  bannerUrl?: string | null;
  /** Inscripcion del jugador logueado en alguna categoria del torneo. */
  myRegistrationStatus?: "PENDING" | "ACCEPTED" | "WAITLIST" | null;
  /** Categorias, cuando el listado publico las trae. */
  categories?: Array<{ id: string; name: string }>;
  /** Dias (desde 1) en los que se juega cada fase. */
  phaseDays?: Array<{ phase: string; dayNumber: number }>;
}

/** Partido o torneo Quality dentro de la semana del jugador. */
export interface PlayerWeekEvent {
  kind: "match" | "quality";
  id: string;
  tournamentId: string;
  tournamentName: string;
  categoryName: string;
  clubName: string;
  imageUrl: string | null;
  phaseLabel: string | null;
  courtName: string | null;
  detail: string | null;
  startsAt: string;
  endsAt: string | null;
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
  /** Cupo tomado: pendientes, aceptadas y lista de espera. Null si el listado no lo trae. */
  occupiedPairs?: number | null;
  /** Circuito de ranking (NONE = sin ranking externo). */
  circuitType: TournamentCircuitType;
  status: EntityStatus;
  /** El club creo un repechaje para esta categoria. */
  repechageCreated?: boolean;
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
  email: string;
  sexId: number;
  phone?: string | null;
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

/** Inscripcion del jugador autenticado en una categoria. */
export interface MyTournamentRegistration {
  registration: TournamentRegistration | null;
  pair: TournamentPair | null;
  partnerName: string | null;
  partner: RegisteredPlayerSearchItem | null;
  availability: RegistrationAvailability[];
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

export interface RegistrationMutationResult {
  registration: TournamentRegistration;
  rebuilt: boolean;
  blocked: boolean;
  message: string | null;
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
  /** player si canceló un jugador de la pareja; club si la baja la hizo el club. */
  cancelledBy?: "player" | "club" | null;
  /**
   * Quién canceló. Si cancelledBy es player, es el id del jugador.
   * Si es club, es el id del usuario del club.
   */
  cancelledById?: string | null;
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
  /** Derivado al sincronizar. No se configura a mano. */
  groupCount: number | null;
  /** Rondas extra de la llave (R16, R32), separadas por coma. */
  extraKnockoutPhases?: string;
}

export interface TournamentGroup {
  id: string;
  tournamentCategoryId: string;
  name: string;
  order: number;
  pairIds: string[];
  /** Parejas de esta zona que entran al cuadro. Cero si el formato no tiene llave. */
  qualifies: number;
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
  /** Criterio que ubicó a la pareja respecto de las que empataron en puntos. Null si no hizo falta. */
  tieBreak: TieBreaker | null;
  /** El reglamento no alcanzó: el puesto espera el desempate del club. */
  unresolved: boolean;
  /** Cómo resolvió el club, cuando `tieBreak` es MANUAL. */
  tieBreakNote: string | null;
}

/** Zona con parejas empatadas que esperan el desempate del club. */
export interface UnresolvedTie {
  groupId: string;
  pairIds: string[];
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
  /** El club fijó las parejas del cruce a mano; el motor no las recalcula. */
  pairingManual: boolean;
  /** Motivo del cruce manual. */
  pairingNote: string | null;
  /** Orden dentro de la zona o de la ronda. */
  sortOrder: number;
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

export type CourtStatus = "active" | "inactive" | "comingSoon" | "maintenance";

export const COURT_STATUS_LABELS: Record<CourtStatus, string> = {
  active: "Activa",
  inactive: "Inactiva",
  comingSoon: "Próximamente",
  maintenance: "En mantenimiento",
};

export function isCourtListedForPlayers(status: CourtStatus): boolean {
  return status !== "inactive";
}

export function isCourtBookable(status: CourtStatus): boolean {
  return status === "active";
}

export interface Court {
  id: string;
  clubId: string;
  name: string;
  status: CourtStatus;
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

export type CourtReservationStatus = "booked" | "pending" | "rejected" | "cancelled" | "completed";

/** Reserva de cancha del club (actividad que convierte a alguien en Cliente). */
export interface CourtReservation {
  id: string;
  clubId: string;
  clientId: string;
  courtId: string | null;
  bookedByPlayerId?: string;
  playerFirstName?: string;
  playerLastName?: string;
  /** URL publica del avatar. Null si no tiene cuenta o no hay foto. */
  playerAvatarUrl?: string | null;
  /** True si el jugador tiene cuenta en la app. */
  playerHasAccount?: boolean;
  /** True si ya es cliente de este club. */
  isClubPlayer?: boolean;
  /** True si el bloque sale de un turno fijo y no de una reserva persistida. */
  isFixed?: boolean;
  /** True si el bloque es un rango de torneo y no una reserva de jugador. */
  isTournamentBlock?: boolean;
  courtName?: string;
  /** URL pública de la foto de la cancha. */
  courtImageUrl?: string | null;
  startsAt: string;
  endsAt: string;
  status: CourtReservationStatus;
  /** Precio cobrado al reservar (snapshot). */
  price: number | null;
  createdAt: string;
  cancelledAt?: string | null;
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
  pairANames: [string, string];
  pairAAvatars: [string | null, string | null];
  pairBNames: [string, string];
  pairBAvatars: [string | null, string | null];
  courtLabel: string | null;
  matchRules: MatchRules;
}

/** Lo que pinta la card de torneo en el catálogo y en el historial. */
export interface TournamentCard {
  id: string;
  name: string;
  status: TournamentStatus;
  startDate: string;
  endDate: string;
  clubName: string | null;
  clubAvatarUrl: string | null;
  clubCoverUrl: string | null;
  bannerUrl: string | null;
  myRegistrationStatus: "PENDING" | "ACCEPTED" | "WAITLIST" | null;
  /** Pareja del jugador. Null en el catálogo público. */
  pairId: string | null;
  categories: Array<{ id: string; name: string }>;
}

export interface PlayerDashboard {
  player: Player;
  city: string | null;
  province: string | null;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  /** Torneos con al menos un partido terminado. */
  tournamentsCount: number;
  tournamentsWon: number;
  /** Reservas confirmadas o ya jugadas. */
  reservationsCount: number;
  nextMatch: PlayerMatchView | null;
  recentMatches: PlayerMatchView[];
}

/** Reserva próxima enriquecida para el inicio del jugador. */
export interface PlayerUpcomingReservation {
  reservation: CourtReservation;
  courtName: string;
  clubName: string;
}

/** Feed de Inicio (torneos futuros + reservas si hay sesión). */
export interface PlayerFeed {
  upcomingTournaments: TournamentCard[];
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
}

/** Rondas default, extra y las que el club puede agregar o quitar. */
export interface KnockoutStructure {
  pairCount: number;
  extra: MatchPhase[];
  defaultPhases: MatchPhase[];
  addable: MatchPhase[];
  removable: MatchPhase[];
  active: MatchPhase[];
  /** Por qué no se puede rearmar la llave (mover o cambiar fases). Null si se puede. */
  rebuildBlockedReason?: string | null;
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
  /** Canchas del club (id + nombre) para el diagrama. */
  courts: Array<Pick<Court, "id" | "name">>;
  /** Zonas con empates que esperan al club; sus puestos no pasan al cuadro. */
  unresolvedTies: UnresolvedTie[];
  /** Parejas que pueden ocupar un cruce a mano: aceptadas, en el cuadro y sin retiro. */
  pairingCandidates: string[];
  /** Solo backoffice: rondas extra y acciones. El tab público no lo manda. */
  knockoutStructure?: KnockoutStructure | null;
  notice: string | null;
}

/** Tab Repechaje: zonas + cuadro del subdraw, con agenda de club. */
export interface RepechageBoardView extends CuadroBoardView {
  standings: GroupStanding[];
  courts: Court[];
  allMatches: Match[];
  finishedGroupIds: string[];
}

/** Pareja del picker de repechaje. */
export interface RepechageCandidate {
  pairId: string;
  playerNames: [string, string];
  playerAvatars: [string | null, string | null];
  outcome: "stillIn" | "eliminated" | "champion";
  eliminatedPhase: string | null;
  label: string;
  alreadyInRepechage: boolean;
  selectable: boolean;
  removable: boolean;
}

/** Altas y bajas del roster de repechaje. */
export interface RepechageEntriesInput {
  addPairIds: string[];
  removePairIds: string[];
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
  slots: MatchSlot[];
  /** Zonas con todos los partidos finalizados (pueden mostrar clasificados). */
  finishedGroupIds: string[];
  /** Zonas con empates que esperan al club. */
  unresolvedTies: UnresolvedTie[];
  notice: string | null;
  autoAssign: AutoAssignPreview;
}

/** Respuesta del desempate manual de una zona. */
export interface ResolveTieResult {
  groupId: string;
  standings: GroupStanding[];
  message: string;
}

/** Respuesta del cruce manual. */
export interface SetMatchPairingResult {
  match: Match;
  message: string;
}

/** Respuesta al agregar, quitar o mover en la llave. */
export interface KnockoutPhaseResult {
  knockoutStructure: KnockoutStructure;
  message: string;
}

/** Si la categoría puede recibir otra pareja y, si no, el motivo para mostrar. */
export interface PairAdmission {
  allowed: boolean;
  reason: string | null;
}

/** Cupo de la categoría con la misma cuenta que valida la API: completas + solos de a dos. */
export interface CategoryCapacity {
  maxPairs: number;
  completePairs: number;
  soloPlayers: number;
  /** Parejas completas aceptadas. No incluye pendientes ni lista de espera. */
  acceptedPairs: number;
  /** Jugadores solos aceptados. */
  acceptedSoloPlayers: number;
  heldSpots: number;
  /** Parejas sentadas en alguna zona del cuadro. */
  inDraw: number;
  /** Alta cerrada: cupo de aceptadas lleno y ya hay 2 suplentes. */
  full: boolean;
  /** No se puede aceptar otra pareja al cuadro. */
  acceptedFull?: boolean;
}

/** Jugador de una inscripción, para el detalle de la tarjeta. */
export interface RegistrationPlayerDetail {
  id: string;
  displayName: string;
  phone: string | null;
  categoryLevel: import("./categories").CategoryLevel | null;
  /** `left` | `right` | `both`. Null si no cargó lado. */
  sidePreference: import("./playerSidePreference").PlayerSidePreference | null;
}

/** Franja que la pareja declaró al inscribirse. */
export interface RegistrationAvailability {
  date: string;
  startTime: string;
  endTime: string;
}

/** Pareja tal como la muestra el tab Participantes. */
export interface ParticipantPairView {
  id: string;
  player1Id: string;
  player2Id: string | null;
  user1Id: string | null;
  user2Id: string | null;
  sidePreference: PairSidePreference | null;
}

/** Inscripción tal como la muestra el tab Participantes. */
export interface ParticipantRegistrationView {
  id: string;
  status: RegistrationStatus;
  registeredAt: string;
  statusNote: string | null;
  /** `player` si canceló un jugador de la pareja; `club` si la baja la hizo el club. */
  cancelledBy?: "player" | "club" | null;
  /** Id del jugador o del usuario del club, según `cancelledBy`. */
  cancelledById?: string | null;
}

/** Tab Participantes. */
export interface ParticipantsBoardView {
  generatedAt: string;
  rows: Array<{
    pair: ParticipantPairView;
    registration: ParticipantRegistrationView | null;
    playerNames: [string, string];
    /** Avatar por jugador (cliente del club); null → iniciales. */
    playerAvatars: [string | null, string | null];
    /** Id de cliente del club por jugador; null si no hay ficha. */
    playerClientIds: [string | null, string | null];
    /** Horarios declarados. Solo los trae el tablero del club; el publico no. */
    availability?: RegistrationAvailability[];
    incomplete: boolean;
    disqualified: boolean;
    /** La pareja está sentada en alguna zona del cuadro. */
    inDraw: boolean;
    /** Aceptada pero fuera del cuadro con el torneo comenzado: por qué. Null si no aplica. */
    outOfDrawReason: string | null;
  }>;
  /** El club dio comienzo al torneo (o ya terminó). No depende de horarios ni fechas. */
  tournamentStarted: boolean;
  admission: PairAdmission;
  capacity: CategoryCapacity;
  notice: string | null;
  /** Matches de solos aplicados (y persistidos) al armar este board. */
  autoMatches: SoloPairAutoMatchResult[];
  repechageCreated?: boolean;
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

/** Tab Configuración: snapshot para el formulario. */
export interface ConfigBoardView {
  categoryId: string;
  generatedAt: string;
  tournament: Tournament;
  category: TournamentCategory;
  ruleset: TournamentRuleset | null;
  structureLocked: boolean;
  repechageCreated?: boolean;
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
  phase?: string | null;
  phaseLabel?: string;
  manualSkipped?: number;
  message?: string | null;
}

export interface AutoAssignPreview {
  phase: string | null;
  phaseLabel: string;
  eligibleCount: number;
  manualCount: number;
  alreadyUsed: boolean;
  blockedReason: string | null;
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
  /** Por qué no hay turnos, o vacío si el día opera. */
  message?: string;
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
  /** pending ocupa el hueco y no abre un alta. */
  status?: "available" | "pending";
  reservationId?: string | null;
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

export interface DisqualifyRegistrationInput {
  registrationId: string;
  note: string;
}

/** Aceptar una inscripción pendiente y completa (habilita armado de zonas/partidos). */
export interface AcceptRegistrationInput {
  registrationId: string;
}

/** Rechazar una inscripción pendiente. */
export interface RejectRegistrationInput {
  registrationId: string;
  /** Motivo opcional; queda en statusNote. */
  note?: string | null;
}
