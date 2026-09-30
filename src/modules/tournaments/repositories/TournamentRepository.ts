import type { AxiosInstance } from "axios";
import { readData } from "@/config/axiosInstance";
import type { ApiEnvelope } from "@/lib/apiClient";
import type { CreateTournamentRequest, Tournament } from "../types";

export interface ITournamentRepository {
  list(clubId?: string): Promise<Tournament[]>;
  listPublic(): Promise<Tournament[]>;
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
    registrationFee: Number(raw.registrationFee ?? 0),
    clubName: raw.clubName ?? null,
    clubAvatarUrl: raw.clubAvatarUrl ?? null,
    clubCoverUrl: raw.clubCoverUrl ?? null,
    myRegistrationStatus: raw.myRegistrationStatus ?? null,
  };
}

export class TournamentRepository implements ITournamentRepository {
  private readonly http: AxiosInstance;

  constructor(http: AxiosInstance) {
    this.http = http;
  }

  async list(): Promise<Tournament[]> {
    const response = await this.http.get<ApiEnvelope<Tournament[]>>("/club/tournaments");
    return (readData(response) ?? []).map(asTournament);
  }

  async listPublic(): Promise<Tournament[]> {
    const response = await this.http.get<ApiEnvelope<Tournament[]>>("/public/tournaments");
    return (readData(response) ?? []).map(asTournament);
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
