import type { CourtAvailableSlot, PaginatedResult } from "@/domain";

export interface ReservationPlayer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
}

export interface CourtSlotList {
  closed: boolean;
  message: string | null;
  slots: CourtSlot[];
}

export interface CourtSlot extends CourtAvailableSlot {
  courtId: string;
  price: number;
  priceLabel: string | null;
}

export interface CreateReservationInput {
  courtId: string;
  bookedByPlayerId: string;
  startsAt: string;
}

export interface UpdateReservationInput {
  courtId?: string;
  bookedByPlayerId?: string;
  startsAt?: string;
}

/** Turno propio que Inicio lista. */
export type PlayerReservationStatus = "pending" | "booked" | "rejected";

/** Club tal como llega en la reserva propia. */
export interface PlayerReservationClub {
  id: string;
  name: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  municipalityName: string | null;
  provinceName: string | null;
}

export interface PlayerReservation {
  id: string;
  club: PlayerReservationClub;
  courtName: string;
  courtImageUrl: string | null;
  startsAt: string;
  endsAt: string;
  status: PlayerReservationStatus;
  price: number;
  rejectedReason: string | null;
  /** Ocurrencia de un turno fijo. No se cancela como una reserva suelta. */
  isFixed?: boolean;
}

/** Card de ocupación del mes. */
export interface ClubMonthOccupancy {
  percent: number | null;
  /** Puntos contra el mes anterior. Null si alguno de los dos meses no tiene turnos. */
  deltaPercent: number | null;
}

/** Card de ocupación de hoy: mañana, tarde y punta. */
export interface ClubTodayOccupancy {
  morningPercent: number | null;
  afternoonPercent: number | null;
  peakPercent: number | null;
}

/** Card de turnos libres de hoy. */
export interface ClubFreeSlots {
  count: number;
  /** Libres cuyo inicio cae dentro de las próximas 3 horas. */
  withinThreeHours: number;
}

/** Ingresos del día según el precio del turno, no una caja. */
export interface ClubDayIncome {
  amount: number;
  /** Porcentaje contra ayer. Null si ayer no hubo ingresos. */
  deltaPercent: number | null;
}

/** Cards del resumen. Los turnos de hoy y los pendientes llegan por otro request. */
export interface ClubReservationSummary {
  month: ClubMonthOccupancy;
  today: ClubTodayOccupancy;
  freeSlots: ClubFreeSlots;
  income: ClubDayIncome;
}

/** Turno de hoy en el resumen del club. */
export type ClubTodayTurnStatus = "free" | "pending" | "booked" | "completed";

export interface ClubTodayTurn {
  reservationId: string | null;
  courtId: string;
  courtName: string;
  startsAt: string;
  endsAt: string;
  status: ClubTodayTurnStatus;
  playerFirstName: string | null;
  playerLastName: string | null;
}

export interface CourtFixedSkip {
  date: string;
  note: string | null;
}

export interface CourtFixedReservation {
  id: string;
  playerId: string;
  playerFirstName: string;
  playerLastName: string;
  courtId: string;
  courtName: string;
  weekday: number;
  startTime: string;
  endTime: string;
  startsOn: string;
  skippedDays: CourtFixedSkip[];
}

export interface CourtFixedReservationPlayer {
  playerId: string;
  playerFirstName: string;
  playerLastName: string;
  playerAvatarUrl: string | null;
  series: CourtFixedReservation[];
}

export interface CourtFixedReservationQuery {
  q?: string;
  page?: number;
  pageSize?: number;
}

/** Página de fijos. totalItems cuenta jugadores; seriesCount cuenta series. */
export interface CourtFixedReservationPage extends PaginatedResult<CourtFixedReservationPlayer> {
  seriesCount: number;
}

export interface CreateFixedReservationInput {
  playerId: string;
  courtId: string;
  weekday: number;
  startTime: string;
  startsOn?: string;
}
