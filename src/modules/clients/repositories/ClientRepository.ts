import type { AxiosInstance } from "axios";
import { readData } from "@/config/axiosInstance";
import type { PaginatedResult } from "@/domain";
import { isCategoryLevel } from "@/domain";
import type { ApiEnvelope } from "@/lib/apiClient";
import { resolveClubHeaderId } from "@/modules/auth/clubContext";
import { useAuthStore } from "@/stores/authStore";
import type {
  ClubClient,
  ClubClientListItem,
  ClubClientListQuery,
  SaveClubClientInput,
} from "../types";

export interface IClientRepository {
  list(query: ClubClientListQuery): Promise<PaginatedResult<ClubClientListItem>>;
  getById(id: string): Promise<ClubClient>;
  create(input: SaveClubClientInput): Promise<ClubClient>;
  update(id: string, input: SaveClubClientInput): Promise<ClubClient>;
  remove(id: string): Promise<void>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function normalizeListItem(raw: Record<string, unknown>): ClubClientListItem {
  const level = asNullableNumber(raw.categoryLevel);
  return {
    id: asString(raw.id),
    fullName: asString(raw.fullName),
    phone: asNullableString(raw.phone),
    categoryLevel: isCategoryLevel(level) ? level : null,
    avatarUrl: asNullableString(raw.avatarUrl),
  };
}

function normalizeClient(raw: Record<string, unknown>): ClubClient {
  const item = normalizeListItem(raw);
  const sexId = asNullableNumber(raw.sexId);
  return {
    ...item,
    firstName: asString(raw.firstName),
    lastName: asString(raw.lastName),
    documentNumber: asNullableString(raw.documentNumber),
    sexId: sexId != null && sexId > 0 ? sexId : null,
    categoryLevel: item.categoryLevel,
    hasAccount: raw.hasAccount === true,
    reservationsCount: asNullableNumber(raw.reservationsCount) ?? 0,
  };
}

export class ClientRepository implements IClientRepository {
  private readonly axiosInstance: AxiosInstance;

  constructor(axiosInstance: AxiosInstance) {
    this.axiosInstance = axiosInstance;
  }

  async list(query: ClubClientListQuery): Promise<PaginatedResult<ClubClientListItem>> {
    this.assertClubHeader();
    const response = await this.axiosInstance.get<
      ApiEnvelope<Record<string, unknown>>
    >("/club/clients", {
      params: {
        q: query.q?.trim() || undefined,
        categoryLevel: query.categoryLevel ?? undefined,
        page: query.page,
        pageSize: query.pageSize,
      },
    });
    const data = readData(response) ?? {};
    const itemsRaw = Array.isArray(data.items) ? data.items : [];
    return {
      items: itemsRaw.map((item) =>
        normalizeListItem((item ?? {}) as Record<string, unknown>),
      ),
      page: asNullableNumber(data.page) ?? query.page ?? 1,
      pageSize: asNullableNumber(data.pageSize) ?? query.pageSize ?? 12,
      totalItems: asNullableNumber(data.totalItems) ?? 0,
      totalPages: asNullableNumber(data.totalPages) ?? 1,
    };
  }

  async getById(id: string): Promise<ClubClient> {
    this.assertClubHeader();
    const response = await this.axiosInstance.get<ApiEnvelope<Record<string, unknown>>>(
      `/club/clients/${id}`,
    );
    return normalizeClient(readData(response) ?? {});
  }

  async create(input: SaveClubClientInput): Promise<ClubClient> {
    this.assertClubHeader();
    const response = await this.axiosInstance.post<ApiEnvelope<Record<string, unknown>>>(
      "/club/clients",
      input,
    );
    return normalizeClient(readData(response) ?? {});
  }

  async update(id: string, input: SaveClubClientInput): Promise<ClubClient> {
    this.assertClubHeader();
    const response = await this.axiosInstance.patch<ApiEnvelope<Record<string, unknown>>>(
      `/club/clients/${id}`,
      input,
    );
    return normalizeClient(readData(response) ?? {});
  }

  async remove(id: string): Promise<void> {
    this.assertClubHeader();
    await this.axiosInstance.delete(`/club/clients/${id}`);
  }

  private assertClubHeader() {
    if (!resolveClubHeaderId(useAuthStore.getState())) {
      throw new Error("Seleccioná un club para gestionar clientes");
    }
  }
}
