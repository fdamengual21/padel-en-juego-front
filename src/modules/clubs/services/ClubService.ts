import type { IClubRepository } from "../repositories/ClubRepository";

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
}
