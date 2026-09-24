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

export type { CourtReservation, CourtReservationStatus };
