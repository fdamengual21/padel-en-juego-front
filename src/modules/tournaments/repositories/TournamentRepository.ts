import { coreApi } from "@/config/coreApiClient";
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
  list(clubId?: string) {
    return coreApi().listTournaments(clubId);
  }

  getById(id: string) {
    return coreApi().getTournament(id);
  }

  create(input: CreateTournamentRequest) {
    return coreApi().createTournament(input);
  }

  update(
    id: string,
    patch: Partial<Omit<Tournament, "id" | "createdAt" | "clubId">>,
  ) {
    return coreApi().updateTournament(id, patch);
  }
}
