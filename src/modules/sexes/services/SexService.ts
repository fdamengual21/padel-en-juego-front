import type { ISexRepository } from "../repositories/SexRepository";

export class SexService {
  private readonly repository: ISexRepository;

  constructor(repository: ISexRepository) {
    this.repository = repository;
  }

  list() {
    return this.repository.list();
  }
}
