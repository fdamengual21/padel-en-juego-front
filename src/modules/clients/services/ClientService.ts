import type { IClientRepository } from "../repositories/ClientRepository";
import type { ClubClientListQuery, SaveClubClientInput } from "../types";

export class ClientService {
  private readonly repository: IClientRepository;

  constructor(repository: IClientRepository) {
    this.repository = repository;
  }

  list(query: ClubClientListQuery) {
    return this.repository.list(query);
  }

  getById(id: string) {
    return this.repository.getById(id);
  }

  create(input: SaveClubClientInput) {
    return this.repository.create(input);
  }

  update(id: string, input: SaveClubClientInput) {
    return this.repository.update(id, input);
  }

  remove(id: string) {
    return this.repository.remove(id);
  }
}
