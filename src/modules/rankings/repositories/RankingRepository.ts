import type { AxiosInstance } from "axios";
import { readData } from "@/config/axiosInstance";
import {
  CATEGORY_GENDERS,
  CATEGORY_LEVELS,
  isCategoryGender,
  isCategoryLevel,
} from "@/domain";
import type { ApiEnvelope } from "@/lib/apiClient";
import { resolveClubHeaderId } from "@/modules/auth/clubContext";
import { useAuthStore } from "@/stores/authStore";
import type {
  ClubRankingCircuit,
  ClubRankingStandingsPage,
  CreateClubRankingRequest,
  RankingBannerDraft,
  UpdateClubRankingRequest,
} from "../types";

function uniqueSortedLevels(values: number[] | null | undefined): number[] {
  const levels = [...new Set((values ?? []).filter(isCategoryLevel))].sort(
    (a, b) => a - b,
  );
  if (levels.length === 0 || levels.length === CATEGORY_LEVELS.length) return [];
  return levels;
}

function uniqueSortedGenders(values: string[] | null | undefined): string[] {
  const order = CATEGORY_GENDERS;
  const selected = new Set((values ?? []).filter(isCategoryGender));
  const genders = order.filter((gender) => selected.has(gender));
  if (genders.length === 0 || genders.length === order.length) return [];
  return genders;
}

export interface PublicRankingListQuery {
  /** `all` trae en curso, programados y finalizados (primero los no terminados). Default `live`. */
  scope?: "live" | "finished" | "all";
  clubId?: string | null;
  /** Nombre del circuito o club, búsqueda parcial. */
  q?: string | null;
  provinceId?: number | null;
  municipalityId?: number | null;
  /** Niveles 1–8. Vacío o los 8 = sin filtro. */
  levels?: number[] | null;
  /** male / female / mixed. Vacío o los 3 = sin filtro. */
  genders?: string[] | null;
  kind?: string | null;
  sumaTarget?: number | null;
}

export interface RankingStandingsQuery {
  page?: number;
  pageSize?: number;
}

export interface PublicClubRankingQuery {
  scope?: "live" | "finished";
  /** 1 a 10: cada circuito trae sus primeros puestos en `topStandings`. */
  top?: number;
}

export interface IRankingRepository {
  listClub(scope?: "live" | "finished" | "all"): Promise<ClubRankingCircuit[]>;
  getClub(id: string): Promise<ClubRankingCircuit>;
  getClubStandings(circuitId: string, query?: RankingStandingsQuery): Promise<ClubRankingStandingsPage>;
  getPublicStandings(circuitId: string, query?: RankingStandingsQuery): Promise<ClubRankingStandingsPage>;
  create(input: CreateClubRankingRequest): Promise<ClubRankingCircuit>;
  update(id: string, input: UpdateClubRankingRequest): Promise<ClubRankingCircuit>;
  cancel(id: string): Promise<ClubRankingCircuit>;
  uploadFlyer(id: string, file: File): Promise<ClubRankingCircuit>;
  deleteFlyer(id: string): Promise<ClubRankingCircuit>;
  listPublic(query?: PublicRankingListQuery): Promise<ClubRankingCircuit[]>;
  listPublicByClub(clubId: string, query?: PublicClubRankingQuery): Promise<ClubRankingCircuit[]>;
  getPublic(id: string): Promise<ClubRankingCircuit>;
  applyFlyer(id: string, banner: RankingBannerDraft): Promise<void>;
}

function asList(raw: unknown): ClubRankingCircuit[] {
  return Array.isArray(raw) ? (raw as ClubRankingCircuit[]) : [];
}

function standingsParams(query: RankingStandingsQuery) {
  return { page: query.page ?? 1, pageSize: query.pageSize ?? 20 };
}

export class RankingRepository implements IRankingRepository {
  private readonly http: AxiosInstance;

  constructor(http: AxiosInstance) {
    this.http = http;
  }

  async listClub(scope: "live" | "finished" | "all" = "live"): Promise<ClubRankingCircuit[]> {
    this.assertClubHeader();
    const response = await this.http.get<ApiEnvelope<ClubRankingCircuit[]>>("/club/rankings", {
      params: { scope },
    });
    return asList(readData(response));
  }

  async getClub(id: string): Promise<ClubRankingCircuit> {
    this.assertClubHeader();
    const response = await this.http.get<ApiEnvelope<ClubRankingCircuit>>(`/club/rankings/${id}`);
    return readData(response);
  }

  async getClubStandings(
    circuitId: string,
    query: RankingStandingsQuery = {},
  ): Promise<ClubRankingStandingsPage> {
    this.assertClubHeader();
    const response = await this.http.get<ApiEnvelope<ClubRankingStandingsPage>>(
      `/club/rankings/${circuitId}/standings`,
      { params: standingsParams(query) },
    );
    return readData(response);
  }

  async getPublicStandings(
    circuitId: string,
    query: RankingStandingsQuery = {},
  ): Promise<ClubRankingStandingsPage> {
    const response = await this.http.get<ApiEnvelope<ClubRankingStandingsPage>>(
      `/public/rankings/${circuitId}/standings`,
      { params: standingsParams(query) },
    );
    return readData(response);
  }

  async create(input: CreateClubRankingRequest): Promise<ClubRankingCircuit> {
    this.assertClubHeader();
    const response = await this.http.post<ApiEnvelope<ClubRankingCircuit>>("/club/rankings", input);
    return readData(response);
  }

  async update(id: string, input: UpdateClubRankingRequest): Promise<ClubRankingCircuit> {
    this.assertClubHeader();
    const response = await this.http.patch<ApiEnvelope<ClubRankingCircuit>>(
      `/club/rankings/${id}`,
      input,
    );
    return readData(response);
  }

  async cancel(id: string): Promise<ClubRankingCircuit> {
    this.assertClubHeader();
    const response = await this.http.post<ApiEnvelope<ClubRankingCircuit>>(
      `/club/rankings/${id}/cancel`,
    );
    return readData(response);
  }

  async uploadFlyer(id: string, file: File): Promise<ClubRankingCircuit> {
    this.assertClubHeader();
    const body = new FormData();
    body.append("file", file);
    const response = await this.http.post<ApiEnvelope<ClubRankingCircuit>>(
      `/club/rankings/${id}/flyer`,
      body,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return readData(response);
  }

  async deleteFlyer(id: string): Promise<ClubRankingCircuit> {
    this.assertClubHeader();
    const response = await this.http.delete<ApiEnvelope<ClubRankingCircuit>>(
      `/club/rankings/${id}/flyer`,
    );
    return readData(response);
  }

  async listPublic(query: PublicRankingListQuery = {}): Promise<ClubRankingCircuit[]> {
    const levels = uniqueSortedLevels(query.levels);
    const genders = uniqueSortedGenders(query.genders);
    const response = await this.http.get<ApiEnvelope<ClubRankingCircuit[]>>("/public/rankings", {
      params: {
        scope: query.scope ?? undefined,
        clubId: query.clubId || undefined,
        q: query.q?.trim() || undefined,
        provinceId: query.provinceId ?? undefined,
        municipalityId: query.municipalityId ?? undefined,
        levels: levels.length ? levels : undefined,
        genders: genders.length ? genders : undefined,
        kind: query.kind || undefined,
        sumaTarget: query.sumaTarget ?? undefined,
      },
      paramsSerializer: { indexes: null },
    });
    return asList(readData(response));
  }

  async listPublicByClub(
    clubId: string,
    query: PublicClubRankingQuery = {},
  ): Promise<ClubRankingCircuit[]> {
    const response = await this.http.get<ApiEnvelope<ClubRankingCircuit[]>>(
      `/public/clubs/${clubId}/rankings`,
      { params: { scope: query.scope ?? "live", top: query.top ?? undefined } },
    );
    return asList(readData(response));
  }

  async getPublic(id: string): Promise<ClubRankingCircuit> {
    const response = await this.http.get<ApiEnvelope<ClubRankingCircuit>>(
      `/public/rankings/${id}`,
    );
    return readData(response);
  }

  async applyFlyer(id: string, banner: RankingBannerDraft): Promise<void> {
    if (banner.file) {
      await this.uploadFlyer(id, banner.file);
      return;
    }
    if (banner.remove) await this.deleteFlyer(id);
  }

  private assertClubHeader() {
    if (resolveClubHeaderId(useAuthStore.getState()) == null) {
      throw new Error("Elegí un club para gestionar el ranking.");
    }
  }
}
