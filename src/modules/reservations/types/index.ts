import type { CourtAvailableSlot, CourtReservation, CourtReservationStatus } from "@/domain";

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
  startsAt: string;
  endsAt: string;
  status: PlayerReservationStatus;
  price: number;
  rejectedReason: string | null;
}

export type { CourtReservation, CourtReservationStatus };
