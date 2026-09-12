import type { IClubRepository } from "../repositories/ClubRepository";
import type { UpdateClubInput } from "../types";

export class ClubService {
  private readonly repository: IClubRepository;

  constructor(repository: IClubRepository) {
    this.repository = repository;
  }

  list() {
    return this.repository.list();
  }

  getById(id: string) {
    return this.repository.getById(id);
  }

  update(id: string, patch: UpdateClubInput) {
    return this.repository.update(id, patch);
  }
}
