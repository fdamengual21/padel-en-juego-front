import type { AxiosInstance } from "axios";
import { readData } from "@/config/axiosInstance";
import type { PaginatedResult } from "@/domain";
import type { ApiEnvelope } from "@/lib/apiClient";
import type { CreateTournamentRequest, Tournament } from "../types";

export interface PublicTournamentListQuery {
  q?: string | null;
  provinceId?: number | null;
  municipalityId?: number | null;
  page?: number;
  pageSize?: number;
}

export interface ClubTournamentListQuery {
  q?: string | null;
  /** `open` pendientes y activos. `all` incluye finalizados y cancelados. */
  scope?: "open" | "all";
  page?: number;
  pageSize?: number;
}

export interface ITournamentRepository {
  list(query?: ClubTournamentListQuery): Promise<PaginatedResult<Tournament>>;
  listPublic(query?: PublicTournamentListQuery): Promise<PaginatedResult<Tournament>>;
  getById(id: string): Promise<Tournament | null>;
  getPublic(id: string): Promise<Tournament | null>;
  create(input: CreateTournamentRequest): Promise<Tournament>;
  update(
    id: string,
    patch: Partial<Omit<Tournament, "id" | "createdAt" | "clubId">>,
  ): Promise<Tournament>;
}

function asTournament(raw: Tournament): Tournament {
  return {
    ...raw,
    description: raw.description ?? null,
    endDate: raw.endDate ?? raw.startDate,
    dailyStartTime: raw.dailyStartTime ?? "",
    dailyEndTime: raw.dailyEndTime ?? "",
    courtHoldStartTime: raw.courtHoldStartTime ?? "",
    courtHoldEndTime: raw.courtHoldEndTime ?? "",
    courtHoldCourtIds: raw.courtHoldCourtIds ?? [],
    registrationFee: Number(raw.registrationFee ?? 0),
    clubName: raw.clubName ?? null,
    clubAvatarUrl: raw.clubAvatarUrl ?? null,
    clubCoverUrl: raw.clubCoverUrl ?? null,
    myRegistrationStatus: raw.myRegistrationStatus ?? null,
    phaseDays: raw.phaseDays ?? [],
  };
}

function normalizePublicTournamentPage(raw: Record<string, unknown>): PaginatedResult<Tournament> {
  const items = Array.isArray(raw.items)
    ? raw.items
        .filter((item): item is Tournament => Boolean(item) && typeof item === "object")
        .map((item) => asTournament(item))
    : [];
  const page = asPageNumber(raw.page, 1);
  const pageSize = asPageNumber(raw.pageSize, 12);
  const totalItems = asPageNumber(raw.totalItems, 0);
  const totalPages = asPageNumber(raw.totalPages, 0);
  return { items, page, pageSize, totalItems, totalPages };
}

function asPageNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export class TournamentRepository implements ITournamentRepository {
  private readonly http: AxiosInstance;

  constructor(http: AxiosInstance) {
    this.http = http;
  }

  async list(query: ClubTournamentListQuery = {}): Promise<PaginatedResult<Tournament>> {
    const response = await this.http.get<ApiEnvelope<Record<string, unknown>>>("/club/tournaments", {
      params: {
        q: query.q?.trim() || undefined,
        scope: query.scope ?? "open",
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 12,
      },
    });
    return normalizePublicTournamentPage(readData(response) ?? {});
  }

  async listPublic(query: PublicTournamentListQuery = {}): Promise<PaginatedResult<Tournament>> {
    const response = await this.http.get<ApiEnvelope<Record<string, unknown>>>(
      "/public/tournaments",
      {
        params: {
          q: query.q?.trim() || undefined,
          provinceId: query.provinceId ?? undefined,
          municipalityId: query.municipalityId ?? undefined,
          page: query.page ?? 1,
          pageSize: query.pageSize ?? 12,
        },
      },
    );
    return normalizePublicTournamentPage(readData(response) ?? {});
  }

  async getById(id: string): Promise<Tournament | null> {
    const response = await this.http.get<ApiEnvelope<Tournament>>(`/club/tournaments/${id}`);
    const data = readData(response);
    return data ? asTournament(data) : null;
  }

  async getPublic(id: string): Promise<Tournament | null> {
    const response = await this.http.get<ApiEnvelope<Tournament>>(`/public/tournaments/${id}`);
    const data = readData(response);
    return data ? asTournament(data) : null;
  }

  async create(input: CreateTournamentRequest): Promise<Tournament> {
    const response = await this.http.post<ApiEnvelope<Tournament>>("/club/tournaments", input);
    return asTournament(readData(response));
  }

  async update(
    id: string,
    patch: Partial<Omit<Tournament, "id" | "createdAt" | "clubId">>,
  ): Promise<Tournament> {
    const response = await this.http.patch<ApiEnvelope<Tournament>>(
      `/club/tournaments/${id}`,
      patch,
    );
    return asTournament(readData(response));
  }
}
