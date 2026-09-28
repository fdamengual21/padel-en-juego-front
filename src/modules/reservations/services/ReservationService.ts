import type { IReservationRepository } from "../repositories/ReservationRepository";
import type {
  CourtFixedReservationQuery,
  CreateFixedReservationInput,
  CreateReservationInput,
  UpdateReservationInput,
} from "../types";

export class ReservationService {
  private readonly repository: IReservationRepository;

  constructor(repository: IReservationRepository) {
    this.repository = repository;
  }

  list(date: string, courtId?: string) {
    return this.repository.list(date, courtId);
  }

  listPending() {
    return this.repository.listPending();
  }

  getSummary() {
    return this.repository.getSummary();
  }

  listToday() {
    return this.repository.listToday();
  }

  listCalendar(from: string, to: string, courtId?: string) {
    return this.repository.listCalendar(from, to, courtId);
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

  accept(id: string) {
    return this.repository.accept(id);
  }

  reject(id: string, reason?: string) {
    return this.repository.reject(id, reason);
  }

  listMine() {
    return this.repository.listMine();
  }

  cancelMine(id: string) {
    return this.repository.cancelMine(id);
  }

  listFixed(query?: CourtFixedReservationQuery) {
    return this.repository.listFixed(query);
  }

  createFixed(input: CreateFixedReservationInput) {
    return this.repository.createFixed(input);
  }

  cancelFixed(id: string, note?: string) {
    return this.repository.cancelFixed(id, note);
  }

  skipFixed(id: string, date: string, note?: string) {
    return this.repository.skipFixed(id, date, note);
  }

  restoreFixed(id: string, date: string) {
    return this.repository.restoreFixed(id, date);
  }
}
