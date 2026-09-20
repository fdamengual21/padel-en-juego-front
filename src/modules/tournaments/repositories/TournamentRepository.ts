import { notConnectedError } from "@/domain";
import type { CreateTournamentRequest, Tournament } from "../types";

export interface ITournamentRepository {
  list(clubId?: string): Promise<Tournament[]>;
  getById(id: string): Promise<Tournament | null>;
  create(input: CreateTournamentRequest): Promise<Tournament>;
  update(
    id: string,
    patch: Partial<Omit<Tournament, "id" | "createdAt" | "clubId">>,
  ): Promise<Tournament>;
}

export class TournamentRepository implements ITournamentRepository {
  async list(_clubId?: string): Promise<Tournament[]> {
    return [];
  }

  async getById(_id: string): Promise<Tournament | null> {
    return null;
  }

  async create(_input: CreateTournamentRequest): Promise<Tournament> {
    return notConnectedError();
  }

  async update(
    _id: string,
    _patch: Partial<Omit<Tournament, "id" | "createdAt" | "clubId">>,
  ): Promise<Tournament> {
    return notConnectedError();
  }
}
