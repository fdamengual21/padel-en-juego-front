import type { AxiosInstance } from "axios";
import { readData } from "@/config/axiosInstance";
import type { ApiEnvelope } from "@/lib/apiClient";
import { resolveClubHeaderId } from "@/modules/auth/clubContext";
import { useAuthStore } from "@/stores/authStore";
import type { CourtReservation, CourtReservationStatus } from "@/domain";
import type {
  CourtSlot,
  CourtSlotList,
  CreateReservationInput,
  ReservationPlayer,
  UpdateReservationInput,
} from "../types";

export interface IReservationRepository {
  list(date: string, courtId?: string): Promise<CourtReservation[]>;
  listSlots(
    date: string,
    courtId?: string,
    ignoreReservationId?: string,
  ): Promise<CourtSlotList>;
  searchPlayers(query: string): Promise<ReservationPlayer[]>;
  create(input: CreateReservationInput): Promise<CourtReservation>;
  update(id: string, patch: UpdateReservationInput): Promise<CourtReservation>;
  cancel(id: string): Promise<CourtReservation>;
  complete(id: string): Promise<CourtReservation>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function asStatus(value: unknown): CourtReservationStatus {
  if (value === "booked" || value === "cancelled" || value === "completed") return value;
  return "booked";
}

export function normalizeReservation(raw: Record<string, unknown>): CourtReservation {
  const playerId = asString(raw.bookedByPlayerId);
  return {
    id: asString(raw.id),
    clubId: asString(raw.clubId),
    clientId: playerId,
    courtId: asString(raw.courtId) || null,
    bookedByPlayerId: playerId,
    playerFirstName: asString(raw.playerFirstName),
    playerLastName: asString(raw.playerLastName),
    courtName: asString(raw.courtName),
    startsAt: asString(raw.startsAt),
    endsAt: asString(raw.endsAt),
    status: asStatus(raw.status),
    price: asNumber(raw.price),
    createdAt: asString(raw.createdAt),
    cancelledAt: asString(raw.cancelledAt) || null,
  };
}

function normalizeSlot(raw: Record<string, unknown>): CourtSlot {
  const startsAt = asString(raw.startsAt);
  const endsAt = asString(raw.endsAt);
  return {
    courtId: asString(raw.courtId),
    startsAt,
    endsAt,
    label: asString(raw.label),
    price: asNumber(raw.price),
    priceLabel: asString(raw.priceLabel) || null,
  };
}

function normalizePlayer(raw: Record<string, unknown>): ReservationPlayer {
  return {
    id: asString(raw.id),
    firstName: asString(raw.firstName),
    lastName: asString(raw.lastName),
    phone: asString(raw.phone) || null,
  };
}

export class ReservationRepository implements IReservationRepository {
  private readonly axiosInstance: AxiosInstance;

  constructor(axiosInstance: AxiosInstance) {
    this.axiosInstance = axiosInstance;
  }

  async list(date: string, courtId?: string): Promise<CourtReservation[]> {
    this.assertClubHeader();
    const response = await this.axiosInstance.get<ApiEnvelope<Record<string, unknown>[]>>(
      "/club/reservations",
      { params: { date, courtId } },
    );
    return (readData(response) ?? [])
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map(normalizeReservation);
  }

  async listSlots(date: string, courtId?: string, ignoreReservationId?: string): Promise<CourtSlotList> {
    this.assertClubHeader();
    const response = await this.axiosInstance.get<ApiEnvelope<Record<string, unknown>>>(
      "/club/reservations/slots",
      { params: { date, courtId, ignoreReservationId } },
    );
    const raw = readData(response);
    const slotsRaw = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.slots)
        ? raw.slots
        : [];
    const body = raw && !Array.isArray(raw) ? raw : {};
    return {
      closed: body.closed === true,
      message: typeof body.message === "string" && body.message.trim() ? body.message : null,
      slots: slotsRaw
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map(normalizeSlot)
        .filter((slot) => new Date(slot.endsAt).getTime() > Date.now()),
    };
  }

  async searchPlayers(query: string) {
    this.assertClubHeader();
    const response = await this.axiosInstance.get<ApiEnvelope<Record<string, unknown>[]>>(
      "/club/reservations/players",
      { params: { query } },
    );
    return (readData(response) ?? [])
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map(normalizePlayer);
  }

  async create(input: CreateReservationInput) {
    this.assertClubHeader();
    const response = await this.axiosInstance.post<ApiEnvelope<Record<string, unknown>>>(
      "/club/reservations",
      input,
    );
    return normalizeReservation(readData(response) ?? {});
  }

  async update(id: string, patch: UpdateReservationInput) {
    this.assertClubHeader();
    const response = await this.axiosInstance.patch<ApiEnvelope<Record<string, unknown>>>(
      `/club/reservations/${id}`,
      patch,
    );
    return normalizeReservation(readData(response) ?? {});
  }

  async cancel(id: string) {
    this.assertClubHeader();
    const response = await this.axiosInstance.post<ApiEnvelope<Record<string, unknown>>>(
      `/club/reservations/${id}/cancel`,
    );
    return normalizeReservation(readData(response) ?? {});
  }

  async complete(id: string) {
    this.assertClubHeader();
    const response = await this.axiosInstance.post<ApiEnvelope<Record<string, unknown>>>(
      `/club/reservations/${id}/complete`,
    );
    return normalizeReservation(readData(response) ?? {});
  }

  private assertClubHeader() {
    if (!resolveClubHeaderId(useAuthStore.getState())) {
      throw new Error("Seleccioná un club para gestionar reservas");
    }
  }
}
