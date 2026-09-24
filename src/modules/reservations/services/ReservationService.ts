import type { IReservationRepository } from "../repositories/ReservationRepository";
import type { CreateReservationInput, UpdateReservationInput } from "../types";

export class ReservationService {
  private readonly repository: IReservationRepository;

  constructor(repository: IReservationRepository) {
    this.repository = repository;
  }

  list(date: string, courtId?: string) {
    return this.repository.list(date, courtId);
  }

  listSlots(date: string, courtId?: string, ignoreReservationId?: string) {
    return this.repository.listSlots(date, courtId, ignoreReservationId);
  }

  searchPlayers(query: string) {
    return this.repository.searchPlayers(query);
  }

  create(input: CreateReservationInput) {
    return this.repository.create(input);
  }

  update(id: string, patch: UpdateReservationInput) {
    return this.repository.update(id, patch);
  }

  cancel(id: string) {
    return this.repository.cancel(id);
  }

  complete(id: string) {
    return this.repository.complete(id);
  }
}
