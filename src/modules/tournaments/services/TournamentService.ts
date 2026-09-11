import type { ITournamentRepository } from "../repositories/TournamentRepository";
import type { CreateTournamentRequest, Tournament } from "../types";

export class TournamentService {
  private readonly repository: ITournamentRepository;

  constructor(repository: ITournamentRepository) {
    this.repository = repository;
  }

  list(clubId?: string) {
    return this.repository.list(clubId);
  }

  getById(id: string) {
    return this.repository.getById(id);
  }

  create(input: CreateTournamentRequest) {
    return this.repository.create(input);
  }

  update(
    id: string,
    patch: Partial<Omit<Tournament, "id" | "createdAt" | "clubId">>,
  ) {
    return this.repository.update(id, patch);
  }
}
