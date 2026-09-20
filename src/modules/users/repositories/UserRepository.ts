import type { AxiosInstance } from "axios";
import { readData } from "@/config/axiosInstance";
import type { ApiEnvelope } from "@/lib/apiClient";
import type { UpdateMeInput, UserClubContext, UserMeDto } from "../types";

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNullableString(value: unknown): string | null {
  if (value == null) return null;
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
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

function normalizeClub(raw: Record<string, unknown>): UserClubContext {
  return {
    id: asString(raw.id),
    name: asString(raw.name),
    avatarUrl: asNullableString(raw.avatarUrl),
    coverUrl: asNullableString(raw.coverUrl),
    role: asString(raw.role),
    permissions: asStringArray(raw.permissions),
  };
}

export function normalizeUserMeDto(raw: Record<string, unknown>): UserMeDto {
  const clubsRaw = Array.isArray(raw.clubs) ? raw.clubs : [];
  return {
    id: asString(raw.id),
    email: asString(raw.email),
    emailConfirmed: raw.emailConfirmed === true,
    firstName: asString(raw.firstName),
    lastName: asString(raw.lastName),
    roles: asStringArray(raw.roles),
    isRootPlatformAdmin: raw.isRootPlatformAdmin === true,
    activeClubId: asNullableString(raw.activeClubId),
    activeClubRole: asString(raw.activeClubRole),
    scopedPermissions: asStringArray(raw.scopedPermissions),
    clubs: clubsRaw
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map(normalizeClub),
    playerId: asNullableString(raw.playerId),
    avatarUrl: asNullableString(raw.avatarUrl),
    coverUrl: asNullableString(raw.coverUrl),
    documentNumber: asNullableString(raw.documentNumber),
    sexId: asNullableNumber(raw.sexId),
    provinceId: asNullableNumber(raw.provinceId),
    municipalityId: asNullableNumber(raw.municipalityId),
    phone: asNullableString(raw.phone),
    isPhonePublic: raw.isPhonePublic === true,
    dateOfBirth: asNullableString(raw.dateOfBirth),
    categoryLevel: asNullableNumber(raw.categoryLevel),
    age: asNullableNumber(raw.age),
    canPublishPhone: raw.canPublishPhone === true,
  };
}

export interface IUserRepository {
  me(): Promise<UserMeDto>;
  updateMe(payload: UpdateMeInput): Promise<UserMeDto>;
  uploadAvatar(file: File): Promise<UserMeDto>;
  uploadCover(file: File): Promise<UserMeDto>;
}

export class UserRepository implements IUserRepository {
  private readonly axiosInstance: AxiosInstance;

  constructor(axiosInstance: AxiosInstance) {
    this.axiosInstance = axiosInstance;
  }

  async me() {
    const response = await this.axiosInstance.get<ApiEnvelope<Record<string, unknown>>>(
      "/users/me",
    );
    return normalizeUserMeDto(readData(response) ?? {});
  }

  async updateMe(payload: UpdateMeInput) {
    const response = await this.axiosInstance.patch<
      ApiEnvelope<Record<string, unknown>>
    >("/users/me", payload);
    return normalizeUserMeDto(readData(response) ?? {});
  }

  uploadAvatar(file: File) {
    return this.uploadMyImage("/users/me/avatar", file);
  }

  uploadCover(file: File) {
    return this.uploadMyImage("/users/me/cover", file);
  }

  private async uploadMyImage(path: string, file: File) {
    const form = new FormData();
    form.append("file", file);
    const response = await this.axiosInstance.post<
      ApiEnvelope<Record<string, unknown>>
    >(path, form, {
      headers: { "Content-Type": false as unknown as string },
    });
    return normalizeUserMeDto(readData(response) ?? {});
  }
}
