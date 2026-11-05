import type { AxiosInstance } from "axios";
import { readData } from "@/config/axiosInstance";
import type { PaginatedResult, TournamentCard, TournamentPhoto } from "@/domain";
import { asTournamentFormat } from "@/domain";
import type { ApiEnvelope } from "@/lib/apiClient";
import { resolveClubHeaderId } from "@/modules/auth/clubContext";
import { useAuthStore } from "@/stores/authStore";
import { normalizeTournamentCardPage } from "../mapTournamentCard";
import type { CreateTournamentRequest, PublicTournamentPageDto, Tournament } from "../types";

export interface PublicTournamentListQuery {
  q?: string | null;
  provinceId?: number | null;
  municipalityId?: number | null;
  clubId?: string | null;
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
  listPublic(query?: PublicTournamentListQuery): Promise<PaginatedResult<TournamentCard>>;
  getById(id: string): Promise<Tournament | null>;
  getPublic(id: string): Promise<Tournament | null>;
  getPublicView(id: string, categoryId?: string): Promise<PublicTournamentPageDto>;
  create(input: CreateTournamentRequest): Promise<Tournament>;
  update(
    id: string,
    patch: Partial<Omit<Tournament, "id" | "createdAt" | "clubId">>,
  ): Promise<Tournament>;
  uploadBanner(id: string, file: File): Promise<Tournament>;
  deleteBanner(id: string): Promise<Tournament>;
  listPhotos(tournamentId: string): Promise<TournamentPhoto[]>;
  uploadPhoto(
    tournamentId: string,
    file: File,
    description?: string | null,
  ): Promise<TournamentPhoto>;
  updatePhotoDescription(
    tournamentId: string,
    photoId: string,
    description: string | null,
  ): Promise<TournamentPhoto>;
  deletePhoto(tournamentId: string, photoId: string): Promise<TournamentPhoto[]>;
}

function asTournament(raw: Tournament): Tournament {
  return {
    ...raw,
    description: raw.description ?? null,
    endDate: raw.endDate ?? raw.startDate,
    dailyStartTime: raw.dailyStartTime ?? "",
    dailyEndTime: raw.dailyEndTime ?? "",
    format: asTournamentFormat(raw.format),
    registrationFee: Number(raw.registrationFee ?? 0),
    clubName: raw.clubName ?? null,
    clubPhone: raw.clubPhone ?? null,
    clubAvatarUrl: raw.clubAvatarUrl ?? null,
    clubCoverUrl: raw.clubCoverUrl ?? null,
    bannerUrl: raw.bannerUrl ?? null,
    photos: asPhotos(raw.photos),
    myRegistrationStatus: raw.myRegistrationStatus ?? null,
    rankingCircuitId: raw.rankingCircuitId ?? null,
    weekIndex: raw.weekIndex ?? null,
    rankingWeekCount: raw.rankingWeekCount ?? null,
    registrationOpensAt: raw.registrationOpensAt ?? null,
    visibleFrom: raw.visibleFrom ?? null,
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

function asPhotos(raw: unknown): TournamentPhoto[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      id: String(item.id ?? ""),
      url: typeof item.url === "string" ? item.url : "",
      description:
        typeof item.description === "string" && item.description.trim()
          ? item.description.trim()
          : null,
      sortOrder: Number(item.sortOrder ?? 0),
    }))
    .filter((item) => item.id && item.url)
    .sort((a, b) => a.sortOrder - b.sortOrder);
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

  async listPublic(query: PublicTournamentListQuery = {}): Promise<PaginatedResult<TournamentCard>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;
    const response = await this.http.get<ApiEnvelope<Record<string, unknown>>>(
      "/public/tournaments",
      {
        params: {
          q: query.q?.trim() || undefined,
          provinceId: query.provinceId ?? undefined,
          municipalityId: query.municipalityId ?? undefined,
          clubId: query.clubId?.trim() || undefined,
          page,
          pageSize,
        },
      },
    );
    return normalizeTournamentCardPage(readData(response), { page, pageSize });
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

  async getPublicView(id: string, categoryId?: string): Promise<PublicTournamentPageDto> {
    const response = await this.http.get<ApiEnvelope<PublicTournamentPageDto>>(
      `/public/tournaments/${id}/view`,
      { params: categoryId ? { categoryId } : undefined },
    );
    return readData(response);
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

  uploadBanner(id: string, file: File) {
    return this.sendBanner(`/club/tournaments/${id}/banner`, file);
  }

  async deleteBanner(id: string): Promise<Tournament> {
    this.assertClubHeader();
    const response = await this.http.delete<ApiEnvelope<Tournament>>(
      `/club/tournaments/${id}/banner`,
    );
    return asTournament(readData(response));
  }

  private assertClubHeader() {
    if (!resolveClubHeaderId(useAuthStore.getState())) {
      throw new Error("Seleccioná un club para gestionar torneos");
    }
  }

  private async sendBanner(path: string, file: File): Promise<Tournament> {
    this.assertClubHeader();
    const form = new FormData();
    form.append("file", file);
    const response = await this.http.post<ApiEnvelope<Tournament>>(path, form, {
      headers: { "Content-Type": false as unknown as string },
    });
    return asTournament(readData(response));
  }

  async listPhotos(tournamentId: string): Promise<TournamentPhoto[]> {
    this.assertClubHeader();
    const response = await this.http.get<ApiEnvelope<TournamentPhoto[]>>(
      `/club/tournaments/${tournamentId}/photos`,
    );
    return asPhotos(readData(response));
  }

  async uploadPhoto(
    tournamentId: string,
    file: File,
    description?: string | null,
  ): Promise<TournamentPhoto> {
    this.assertClubHeader();
    const form = new FormData();
    form.append("file", file);
    const trimmed = description?.trim();
    if (trimmed) form.append("description", trimmed);
    const response = await this.http.post<ApiEnvelope<TournamentPhoto>>(
      `/club/tournaments/${tournamentId}/photos`,
      form,
      { headers: { "Content-Type": false as unknown as string } },
    );
    const photo = asPhotos([readData(response)])[0];
    if (!photo) throw new Error("No se pudo subir la foto");
    return photo;
  }

  async updatePhotoDescription(
    tournamentId: string,
    photoId: string,
    description: string | null,
  ): Promise<TournamentPhoto> {
    this.assertClubHeader();
    const response = await this.http.patch<ApiEnvelope<TournamentPhoto>>(
      `/club/tournaments/${tournamentId}/photos/${photoId}`,
      { description },
    );
    const photo = asPhotos([readData(response)])[0];
    if (!photo) throw new Error("No se pudo actualizar la foto");
    return photo;
  }

  async deletePhoto(tournamentId: string, photoId: string): Promise<TournamentPhoto[]> {
    this.assertClubHeader();
    const response = await this.http.delete<ApiEnvelope<TournamentPhoto[]>>(
      `/club/tournaments/${tournamentId}/photos/${photoId}`,
    );
    return asPhotos(readData(response));
  }
}
