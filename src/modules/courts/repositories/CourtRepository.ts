import type { AxiosInstance } from "axios";
import { readData } from "@/config/axiosInstance";
import type { Court, CourtPriceRule, WeekdayIso } from "@/domain";
import type { ApiEnvelope } from "@/lib/apiClient";
import { resolveClubHeaderId } from "@/modules/auth/clubContext";
import { useAuthStore } from "@/stores/authStore";
import type { CreateCourtInput, UpdateCourtInput } from "../types";

export interface ICourtRepository {
  list(): Promise<Court[]>;
  getById(id: string): Promise<Court>;
  create(input: CreateCourtInput): Promise<Court>;
  update(id: string, patch: UpdateCourtInput): Promise<Court>;
  deactivate(id: string): Promise<Court>;
  uploadPhoto(id: string, file: File): Promise<Court>;
  deletePhoto(id: string): Promise<Court>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNullableString(value: unknown): string | null {
  if (value == null) return null;
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asDaysOfWeek(value: unknown): WeekdayIso[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (day): day is WeekdayIso =>
      day === 1 || day === 2 || day === 3 || day === 4 || day === 5 || day === 6 || day === 7,
  );
}

function asHour(value: unknown): string {
  const raw = asNullableString(value);
  if (!raw) return "00:00";
  return raw.slice(0, 5);
}

function normalizePriceRule(
  raw: Record<string, unknown>,
  courtId: string,
): CourtPriceRule {
  return {
    id: asString(raw.id),
    courtId: asString(raw.courtId) || courtId,
    startTime: asHour(raw.startTime),
    endTime: asHour(raw.endTime),
    daysOfWeek: asDaysOfWeek(raw.daysOfWeek),
    price: asNumber(raw.price),
    label: asNullableString(raw.label),
  };
}

export function normalizeCourt(raw: Record<string, unknown>): Court {
  const id = asString(raw.id);
  const rulesRaw = Array.isArray(raw.priceRules) ? raw.priceRules : [];
  return {
    id,
    clubId: asString(raw.clubId),
    name: asString(raw.name),
    status: raw.isActive === false ? "inactive" : "active",
    imageUrl: asNullableString(raw.imageUrl),
    slotDurationMinutes: asNumber(raw.slotDurationMinutes, 90) === 120 ? 120 : 90,
    basePrice: asNumber(raw.basePrice),
    priceRules: rulesRaw
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item) => normalizePriceRule(item, id)),
  };
}

export class CourtRepository implements ICourtRepository {
  private readonly axiosInstance: AxiosInstance;

  constructor(axiosInstance: AxiosInstance) {
    this.axiosInstance = axiosInstance;
  }

  async list(): Promise<Court[]> {
    this.assertClubHeader();
    const response = await this.axiosInstance.get<ApiEnvelope<Record<string, unknown>[]>>(
      "/club/courts",
    );
    const items = readData(response) ?? [];
    return items
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map(normalizeCourt);
  }

  async getById(id: string): Promise<Court> {
    this.assertClubHeader();
    const response = await this.axiosInstance.get<ApiEnvelope<Record<string, unknown>>>(
      `/club/courts/${id}`,
    );
    return normalizeCourt(readData(response) ?? {});
  }

  async create(input: CreateCourtInput): Promise<Court> {
    this.assertClubHeader();
    const response = await this.axiosInstance.post<ApiEnvelope<Record<string, unknown>>>(
      "/club/courts",
      input,
    );
    return normalizeCourt(readData(response) ?? {});
  }

  async update(id: string, patch: UpdateCourtInput): Promise<Court> {
    this.assertClubHeader();
    const response = await this.axiosInstance.patch<ApiEnvelope<Record<string, unknown>>>(
      `/club/courts/${id}`,
      patch,
    );
    return normalizeCourt(readData(response) ?? {});
  }

  async deactivate(id: string): Promise<Court> {
    this.assertClubHeader();
    const response = await this.axiosInstance.delete<ApiEnvelope<Record<string, unknown>>>(
      `/club/courts/${id}`,
    );
    return normalizeCourt(readData(response) ?? {});
  }

  uploadPhoto(id: string, file: File) {
    return this.sendPhoto(`/club/courts/${id}/photo`, file);
  }

  async deletePhoto(id: string): Promise<Court> {
    this.assertClubHeader();
    const response = await this.axiosInstance.delete<ApiEnvelope<Record<string, unknown>>>(
      `/club/courts/${id}/photo`,
    );
    return normalizeCourt(readData(response) ?? {});
  }

  private assertClubHeader() {
    if (!resolveClubHeaderId(useAuthStore.getState())) {
      throw new Error("Seleccioná un club para gestionar canchas");
    }
  }

  private async sendPhoto(path: string, file: File): Promise<Court> {
    this.assertClubHeader();
    const form = new FormData();
    form.append("file", file);
    const response = await this.axiosInstance.post<ApiEnvelope<Record<string, unknown>>>(
      path,
      form,
      { headers: { "Content-Type": false as unknown as string } },
    );
    return normalizeCourt(readData(response) ?? {});
  }
}
