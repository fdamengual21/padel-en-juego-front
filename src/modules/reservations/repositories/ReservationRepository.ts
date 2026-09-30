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
  ClubReservationSummary,
  ClubTodayTurn,
  ClubTodayTurnStatus,
  CourtFixedReservation,
  CourtFixedReservationPlayer,
  CourtFixedReservationQuery,
  CourtFixedReservationPage,
  CreateFixedReservationInput,
  UpdateReservationInput,
} from "../types";

export interface IReservationRepository {
  list(date: string, courtId?: string): Promise<CourtReservation[]>;
  listPending(): Promise<CourtReservation[]>;
  getSummary(): Promise<ClubReservationSummary>;
  listToday(): Promise<ClubTodayTurn[]>;
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
  listFixed(query?: CourtFixedReservationQuery): Promise<CourtFixedReservationPage>;
  createFixed(input: CreateFixedReservationInput): Promise<CourtFixedReservation>;
  cancelFixed(id: string, note?: string): Promise<void>;
  skipFixed(id: string, date: string, note?: string): Promise<void>;
  restoreFixed(id: string, date: string): Promise<void>;
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

function asTodayStatus(value: unknown): ClubTodayTurnStatus {
  if (value === "free" || value === "pending" || value === "booked" || value === "completed") {
    return value;
  }
  return "free";
}

function asPercent(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function normalizeTodayTurn(item: Record<string, unknown>): ClubTodayTurn {
  return {
    reservationId: asString(item.reservationId) || null,
    courtId: asString(item.courtId),
    courtName: asString(item.courtName),
    startsAt: asString(item.startsAt),
    endsAt: asString(item.endsAt),
    status: asTodayStatus(item.status),
    playerFirstName: asNullable(item.playerFirstName),
    playerLastName: asNullable(item.playerLastName),
  };
}

function normalizeSummary(raw: Record<string, unknown> | null): ClubReservationSummary {
  const month = asRecord(raw?.month);
  const today = asRecord(raw?.today);
  const freeSlots = asRecord(raw?.freeSlots);
  const income = asRecord(raw?.income);
  return {
    month: {
      percent: asPercent(month?.percent),
      deltaPercent: asPercent(month?.deltaPercent),
    },
    today: {
      morningPercent: asPercent(today?.morningPercent),
      afternoonPercent: asPercent(today?.afternoonPercent),
      peakPercent: asPercent(today?.peakPercent),
    },
    freeSlots: {
      count: asNumber(freeSlots?.count),
      withinThreeHours: asNumber(freeSlots?.withinThreeHours),
    },
    income: {
      amount: asNumber(income?.amount),
      deltaPercent: asPercent(income?.deltaPercent),
    },
  };
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

export function normalizeMine(raw: Record<string, unknown>): PlayerReservation | null {
  const status = asMineStatus(raw.status);
  const id = asString(raw.id);
  const club = normalizeClub(raw.club);
  if (!status || !id || !club) return null;
  return {
    id,
    club,
    courtName: asString(raw.courtName),
    courtImageUrl: asNullable(raw.courtImageUrl),
    startsAt: asString(raw.startsAt),
    endsAt: asString(raw.endsAt),
    status,
    price: asNumber(raw.price),
    rejectedReason: asNullable(raw.rejectedReason),
    isFixed: raw.isFixed === true,
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
    isFixed: raw.isFixed === true,
    courtName: asString(raw.courtName),
    courtImageUrl: asString(raw.courtImageUrl) || null,
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

function normalizeFixedPlayer(raw: Record<string, unknown>): CourtFixedReservationPlayer | null {
  const playerId = asString(raw.playerId);
  if (!playerId) return null;
  const seriesRaw = Array.isArray(raw.series) ? raw.series : [];
  return {
    playerId,
    playerFirstName: asString(raw.playerFirstName),
    playerLastName: asString(raw.playerLastName),
    playerAvatarUrl: asString(raw.playerAvatarUrl) || null,
    series: seriesRaw
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map(normalizeFixed)
      .filter((item): item is CourtFixedReservation => item != null),
  };
}

function normalizeSkips(value: unknown): CourtFixedReservation["skippedDays"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const raw = item as Record<string, unknown>;
    const date = asString(raw.date).slice(0, 10);
    if (!date) return [];
    return [{ date, note: asString(raw.note) || null }];
  });
}

function normalizeFixed(raw: Record<string, unknown>): CourtFixedReservation | null {
  const id = asString(raw.id);
  const playerId = asString(raw.playerId);
  const courtId = asString(raw.courtId);
  if (!id || !playerId || !courtId) return null;
  return {
    id,
    playerId,
    playerFirstName: asString(raw.playerFirstName),
    playerLastName: asString(raw.playerLastName),
    courtId,
    courtName: asString(raw.courtName),
    weekday: asNumber(raw.weekday),
    startTime: asString(raw.startTime).slice(0, 5),
    endTime: asString(raw.endTime).slice(0, 5),
    startsOn: asString(raw.startsOn).slice(0, 10),
    skippedDays: normalizeSkips(raw.skippedDays),
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

  async getSummary(): Promise<ClubReservationSummary> {
    this.assertClubHeader();
    const response = await this.axiosInstance.get<ApiEnvelope<Record<string, unknown>>>(
      "/club/reservations/summary",
    );
    return normalizeSummary(readData(response));
  }

  async listToday(): Promise<ClubTodayTurn[]> {
    this.assertClubHeader();
    const response = await this.axiosInstance.get<ApiEnvelope<Record<string, unknown>[]>>(
      "/club/reservations/today",
    );
    return (readData(response) ?? [])
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map(normalizeTodayTurn);
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

  async listFixed(query?: CourtFixedReservationQuery) {
    this.assertClubHeader();
    const response = await this.axiosInstance.get<ApiEnvelope<Record<string, unknown>>>(
      "/club/reservations/fixed",
      {
        params: {
          q: query?.q?.trim() || undefined,
          page: query?.page,
          pageSize: query?.pageSize,
        },
      },
    );
    const data = readData(response) ?? {};
    const itemsRaw = Array.isArray(data.items) ? data.items : [];
    const totalPages = asNumber(data.totalPages);
    return {
      items: itemsRaw
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map(normalizeFixedPlayer)
        .filter((item): item is CourtFixedReservationPlayer => item != null),
      page: asNumber(data.page) || 1,
      pageSize: asNumber(data.pageSize) || query?.pageSize || 8,
      totalItems: asNumber(data.totalItems),
      totalPages: totalPages > 0 ? totalPages : 1,
      seriesCount: asNumber(data.seriesCount),
    };
  }

  async createFixed(input: CreateFixedReservationInput) {
    this.assertClubHeader();
    const response = await this.axiosInstance.post<ApiEnvelope<Record<string, unknown>>>(
      "/club/reservations/fixed",
      {
        playerId: input.playerId,
        courtId: input.courtId,
        weekday: input.weekday,
        startTime: input.startTime,
        startsOn: input.startsOn || null,
      },
    );
    const created = normalizeFixed(readData(response) ?? {});
    if (!created) throw new Error("No se pudo leer el turno fijo creado");
    return created;
  }

  async cancelFixed(id: string, note?: string) {
    this.assertClubHeader();
    await this.axiosInstance.post<ApiEnvelope<unknown>>(`/club/reservations/fixed/${id}/cancel`, {
      note: note?.trim() || null,
    });
  }

  async skipFixed(id: string, date: string, note?: string) {
    this.assertClubHeader();
    await this.axiosInstance.post<ApiEnvelope<unknown>>(`/club/reservations/fixed/${id}/skip`, {
      date,
      note: note?.trim() || null,
    });
  }

  async restoreFixed(id: string, date: string) {
    this.assertClubHeader();
    await this.axiosInstance.post<ApiEnvelope<unknown>>(`/club/reservations/fixed/${id}/restore`, {
      date,
    });
  }

  private assertClubHeader() {
    if (!resolveClubHeaderId(useAuthStore.getState())) {
      throw new Error("Seleccioná un club para gestionar reservas");
    }
  }
}
