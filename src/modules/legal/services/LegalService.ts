import type { ILegalRepository } from "../repositories/LegalRepository";

export class LegalService {
  private readonly repository: ILegalRepository;

  constructor(repository: ILegalRepository) {
    this.repository = repository;
  }

  getCurrent() {
    return this.repository.getCurrent();
  }
}
