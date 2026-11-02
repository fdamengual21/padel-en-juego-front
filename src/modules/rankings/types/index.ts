import type { PaginatedResult } from "@/domain";

export type ClubRankingStatus = "scheduled" | "live" | "finished" | "cancelled";

export interface ClubRankingPrize {
  id?: string;
  place: number;
  label: string;
}

export interface ClubRankingStanding {
  place: number;
  points: number;
  /** Fechas del circuito en las que sumó puntos. */
  datesPlayed: number;
  player: {
    id: string;
    /** Cuenta del jugador. Null si es una ficha del club sin cuenta. */
    userId?: string | null;
    /** Con cuenta, el nombre del perfil; si no, el de la ficha. */
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    categoryLevel?: number | null;
    sidePreference?: string | null;
    /** El club lo ve siempre; en público solo si el jugador lo publicó. */
    phone?: string | null;
  };
}

/** Página de la tabla de un circuito. Solo jugadores con puntos asignados. */
export interface ClubRankingStandingsPage extends PaginatedResult<ClubRankingStanding> {
  circuitId: string;
  /** Fechas no canceladas del circuito. */
  totalDates: number;
}

export interface ClubRankingEvent {
  id: string;
  weekIndex: number | null;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  visible: boolean;
  visibleFrom?: string;
  registrationOpensAt: string;
  registrationOpen: boolean;
  categoryId: string | null;
  maxPairs: number | null;
  bannerUrl: string | null;
  description: string | null;
}

export interface ClubRankingCircuit {
  id: string;
  clubId: string;
  clubName: string | null;
  /** Contacto del club. Solo en el detalle. */
  clubPhone?: string | null;
  clubCoverUrl?: string | null;
  clubAvatarUrl?: string | null;
  name: string;
  description: string | null;
  flyerUrl: string | null;
  weekday: number;
  weekCount: number;
  firstDate: string;
  /** Última fecha no cancelada. Solo en listados. */
  lastDate?: string;
  gender: string;
  kind: string;
  level: number | null;
  sumaTarget: number | null;
  categoryName: string;
  format: string;
  defaultMaxPairs: number;
  minPairs: number;
  dailyStartTime: string | null;
  registrationFee: number;
  status: ClubRankingStatus;
  createdAt: string;
  updatedAt: string;
  eventCount?: number;
  prizes: ClubRankingPrize[];
  /** Jugadores con puntos en la tabla. Solo en el detalle. */
  playerCount?: number;
  /** Fechas no canceladas. Solo en el detalle. */
  totalDates?: number;
  events?: ClubRankingEvent[];
  /** Primeros puestos de la tabla. Solo en el listado público del club pedido con `top`. */
  topStandings?: ClubRankingStanding[] | null;
}

export interface CreateClubRankingRequest {
  name: string;
  description: string | null;
  weekday: number;
  weekCount: number;
  firstDate: string;
  gender: string;
  kind: string;
  level: number | null;
  sumaTarget: number | null;
  categoryName: string;
  format: string;
  defaultMaxPairs: number;
  dailyStartTime: string | null;
  registrationFee: number;
  prizes: Array<{ place: number; label: string }>;
}

export interface UpdateClubRankingRequest {
  name: string;
  description: string | null;
  dailyStartTime: string | null;
  registrationFee: number;
  /**
   * Calendario, categoría y cupo: solo mientras no se jugó ninguna fecha; se aplican a cada fecha.
   * Achicar `weekCount` borra las últimas fechas con sus inscripciones. Sin valor, no cambia.
   */
  weekCount?: number;
  weekday?: number;
  firstDate?: string;
  gender?: string;
  kind?: string;
  level?: number | null;
  sumaTarget?: number | null;
  categoryName?: string;
  defaultMaxPairs?: number;
  prizes: Array<{ place: number; label: string }>;
}

export interface RankingBannerDraft {
  file: File | null;
  remove: boolean;
}
