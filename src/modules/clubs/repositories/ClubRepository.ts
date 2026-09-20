import type { AxiosInstance } from "axios";
import { readData } from "@/config/axiosInstance";
import { notConnectedError } from "@/domain";
import type { PaginatedResult } from "@/domain";
import type { WeekdayIso } from "@/domain";
import type { ApiEnvelope } from "@/lib/apiClient";
import { resolveClubHeaderId } from "@/modules/auth/clubContext";
import { useAuthStore } from "@/stores/authStore";
import type {
  Club,
  ClubSettings,
  PublicClubListItem,
  PublicClubListQuery,
  UpdateClubInput,
  UpdateClubSettingsInput,
} from "../types";

export interface IClubRepository {
  list(): Promise<Club[]>;
  getById(id: string): Promise<Club | null>;
  getSettings(): Promise<ClubSettings>;
  updateSettings(payload: UpdateClubSettingsInput): Promise<ClubSettings>;
  uploadAvatar(file: File): Promise<ClubSettings>;
  uploadCover(file: File): Promise<ClubSettings>;
  deleteAvatar(): Promise<ClubSettings>;
  deleteCover(): Promise<ClubSettings>;
  listPublic(query: PublicClubListQuery): Promise<PaginatedResult<PublicClubListItem>>;
  update(id: string, patch: UpdateClubInput): Promise<Club>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNullableString(value: unknown): string | null {
  if (value == null) return null;
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function asNullableNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asOpenDays(value: unknown): WeekdayIso[] {
  if (!Array.isArray(value)) return [];
  return value.filter((day): day is WeekdayIso =>
    day === 1 || day === 2 || day === 3 || day === 4 || day === 5 || day === 6 || day === 7,
  );
}

function asHour(value: unknown): string | null {
  const raw = asNullableString(value);
  if (!raw) return null;
  return raw.slice(0, 5);
}

function normalizePublicClub(raw: Record<string, unknown>): PublicClubListItem {
  return {
    id: asString(raw.id),
    name: asString(raw.name),
    coverUrl: asNullableString(raw.coverUrl),
    provinceName: asNullableString(raw.provinceName),
    municipalityName: asNullableString(raw.municipalityName),
    openTime: asHour(raw.openTime),
    closeTime: asHour(raw.closeTime),
    openDays: asOpenDays(raw.openDays),
    minCourtPrice: asNullableNumber(raw.minCourtPrice),
    maxCourtPrice: asNullableNumber(raw.maxCourtPrice),
    availableSlotsToday:
      typeof raw.availableSlotsToday === "number" && Number.isFinite(raw.availableSlotsToday)
        ? Math.max(0, Math.trunc(raw.availableSlotsToday))
        : 0,
  };
}

function normalizePublicClubPage(
  raw: Record<string, unknown>,
): PaginatedResult<PublicClubListItem> {
  const items = Array.isArray(raw.items)
    ? raw.items
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map(normalizePublicClub)
    : [];
  const page = asNullableNumber(raw.page) ?? 1;
  const pageSize = asNullableNumber(raw.pageSize) ?? 12;
  const totalItems = asNullableNumber(raw.totalItems) ?? 0;
  const totalPages = asNullableNumber(raw.totalPages) ?? 0;
  return { items, page, pageSize, totalItems, totalPages };
}

function normalizeClubSettings(raw: Record<string, unknown>): ClubSettings {
  return {
    id: asString(raw.id),
    name: asString(raw.name),
    isActive: raw.isActive === true,
    provinceId: asNullableNumber(raw.provinceId),
    municipalityId: asNullableNumber(raw.municipalityId),
    street: asNullableString(raw.street),
    streetNumber: asNullableString(raw.streetNumber),
    latitude: asNullableNumber(raw.latitude),
    longitude: asNullableNumber(raw.longitude),
    googleMapsUrl: asNullableString(raw.googleMapsUrl),
    phone: asNullableString(raw.phone),
    instagramHandle: asNullableString(raw.instagramHandle),
    avatarUrl: asNullableString(raw.avatarUrl),
    coverUrl: asNullableString(raw.coverUrl),
    openTime: asHour(raw.openTime),
    closeTime: asHour(raw.closeTime),
    openDays: asOpenDays(raw.openDays),
  };
}

export class ClubRepository implements IClubRepository {
  private readonly axiosInstance: AxiosInstance;

  constructor(axiosInstance: AxiosInstance) {
    this.axiosInstance = axiosInstance;
  }

  async list(): Promise<Club[]> {
    return [];
  }

  async getById(_id: string): Promise<Club | null> {
    return null;
  }

  async getSettings(): Promise<ClubSettings> {
    this.assertClubHeader();
    const response = await this.axiosInstance.get<
      ApiEnvelope<Record<string, unknown>>
    >("/club/settings");
    return normalizeClubSettings(readData(response) ?? {});
  }

  async updateSettings(payload: UpdateClubSettingsInput): Promise<ClubSettings> {
    this.assertClubHeader();
    const response = await this.axiosInstance.patch<
      ApiEnvelope<Record<string, unknown>>
    >("/club/settings", payload);
    return normalizeClubSettings(readData(response) ?? {});
  }

  uploadAvatar(file: File) {
    return this.uploadImage("/club/settings/avatar", file);
  }

  uploadCover(file: File) {
    return this.uploadImage("/club/settings/cover", file);
  }

  deleteAvatar() {
    return this.deleteImage("/club/settings/avatar");
  }

  deleteCover() {
    return this.deleteImage("/club/settings/cover");
  }

  async listPublic(
    query: PublicClubListQuery,
  ): Promise<PaginatedResult<PublicClubListItem>> {
    const response = await this.axiosInstance.get<
      ApiEnvelope<Record<string, unknown>>
    >("/public/clubs", {
      params: {
        q: query.q?.trim() || undefined,
        provinceId: query.provinceId ?? undefined,
        municipalityId: query.municipalityId ?? undefined,
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 12,
      },
    });
    return normalizePublicClubPage(readData(response) ?? {});
  }

  async update(_id: string, _patch: UpdateClubInput): Promise<Club> {
    return notConnectedError();
  }

  private assertClubHeader() {
    if (!resolveClubHeaderId(useAuthStore.getState())) {
      throw new Error("Seleccioná un club para cargar la configuración");
    }
  }

  private async uploadImage(path: string, file: File): Promise<ClubSettings> {
    this.assertClubHeader();
    const form = new FormData();
    form.append("file", file);
    const response = await this.axiosInstance.post<
      ApiEnvelope<Record<string, unknown>>
    >(path, form, {
      headers: { "Content-Type": false as unknown as string },
    });
    return normalizeClubSettings(readData(response) ?? {});
  }

  private async deleteImage(path: string): Promise<ClubSettings> {
    this.assertClubHeader();
    const response = await this.axiosInstance.delete<
      ApiEnvelope<Record<string, unknown>>
    >(path);
    return normalizeClubSettings(readData(response) ?? {});
  }
}
