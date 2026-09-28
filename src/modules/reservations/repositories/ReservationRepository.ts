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
  PlayerReservation,
  PlayerReservationClub,
  PlayerReservationStatus,
  UpdateReservationInput,
} from "../types";

export interface IReservationRepository {
  list(date: string, courtId?: string): Promise<CourtReservation[]>;
  listPending(): Promise<CourtReservation[]>;
  listCalendar(from: string, to: string, courtId?: string): Promise<CourtReservation[]>;
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
  accept(id: string): Promise<CourtReservation>;
  reject(id: string, reason?: string): Promise<CourtReservation>;
  listMine(): Promise<PlayerReservation[]>;
  cancelMine(id: string): Promise<void>;
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
  if (
    value === "booked" ||
    value === "pending" ||
    value === "rejected" ||
    value === "cancelled" ||
    value === "completed"
  ) {
    return value;
  }
  return "booked";
}

function asNullable(value: unknown): string | null {
  const text = asString(value).trim();
  return text || null;
}

function asMineStatus(value: unknown): PlayerReservationStatus | null {
  if (value === "pending" || value === "booked" || value === "rejected") return value;
  return null;
}

function normalizeClub(raw: unknown): PlayerReservationClub | null {
  if (!raw || typeof raw !== "object") return null;
  const club = raw as Record<string, unknown>;
  const id = asString(club.id);
  if (!id) return null;
  return {
    id,
    name: asString(club.name),
    avatarUrl: asNullable(club.avatarUrl),
    coverUrl: asNullable(club.coverUrl),
    municipalityName: asNullable(club.municipalityName),
    provinceName: asNullable(club.provinceName),
  };
}

function normalizeMine(raw: Record<string, unknown>): PlayerReservation | null {
  const status = asMineStatus(raw.status);
  const id = asString(raw.id);
  const club = normalizeClub(raw.club);
  if (!status || !id || !club) return null;
  return {
    id,
    club,
    courtName: asString(raw.courtName),
    startsAt: asString(raw.startsAt),
    endsAt: asString(raw.endsAt),
    status,
    price: asNumber(raw.price),
    rejectedReason: asNullable(raw.rejectedReason),
  };
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
    playerAvatarUrl: asString(raw.playerAvatarUrl) || null,
    playerHasAccount: raw.playerHasAccount === true,
    isClubPlayer: raw.isClubPlayer === true,
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
    status: raw.status === "pending" ? "pending" : "available",
    reservationId: asString(raw.reservationId) || null,
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

  async listPending(): Promise<CourtReservation[]> {
    this.assertClubHeader();
    const response = await this.axiosInstance.get<ApiEnvelope<Record<string, unknown>[]>>(
      "/club/reservations/pending",
    );
    return (readData(response) ?? [])
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map(normalizeReservation);
  }

  async listCalendar(from: string, to: string, courtId?: string): Promise<CourtReservation[]> {
    this.assertClubHeader();
    const response = await this.axiosInstance.get<ApiEnvelope<Record<string, unknown>[]>>(
      "/club/reservations/calendar",
      { params: { from, to, courtId } },
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

  async accept(id: string) {
    this.assertClubHeader();
    const response = await this.axiosInstance.post<ApiEnvelope<Record<string, unknown>>>(
      `/club/reservations/${id}/accept`,
    );
    return normalizeReservation(readData(response) ?? {});
  }

  async reject(id: string, reason?: string) {
    this.assertClubHeader();
    const response = await this.axiosInstance.post<ApiEnvelope<Record<string, unknown>>>(
      `/club/reservations/${id}/reject`,
      { reason: reason?.trim() || null },
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

  async listMine() {
    const response = await this.axiosInstance.get<ApiEnvelope<Record<string, unknown>[]>>(
      "/users/me/reservations",
    );
    return (readData(response) ?? [])
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map(normalizeMine)
      .filter((item): item is PlayerReservation => item != null);
  }

  async cancelMine(id: string) {
    await this.axiosInstance.post<ApiEnvelope<unknown>>(`/users/me/reservations/${id}/cancel`);
  }

  private assertClubHeader() {
    if (!resolveClubHeaderId(useAuthStore.getState())) {
      throw new Error("Seleccioná un club para gestionar reservas");
    }
  }
}
