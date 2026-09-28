import type { IClubRepository } from "../repositories/ClubRepository";
import type {
  PublicClubAvailabilityQuery,
  PublicClubListQuery,
  UpdateClubInput,
  UpdateClubSettingsInput,
} from "../types";

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

  getContext() {
    return this.repository.getContext();
  }

  getSettings() {
    return this.repository.getSettings();
  }

  updateSettings(payload: UpdateClubSettingsInput) {
    return this.repository.updateSettings(payload);
  }

  uploadAvatar(file: File) {
    return this.repository.uploadAvatar(file);
  }

  uploadCover(file: File) {
    return this.repository.uploadCover(file);
  }

  deleteAvatar() {
    return this.repository.deleteAvatar();
  }

  deleteCover() {
    return this.repository.deleteCover();
  }

  listPublic(query: PublicClubListQuery) {
    return this.repository.listPublic(query);
  }

  getPublic(id: string) {
    return this.repository.getPublic(id);
  }

  listPublicAvailability(id: string, query: PublicClubAvailabilityQuery) {
    return this.repository.listPublicAvailability(id, query);
  }

  requestPublicReservation(id: string, input: { courtId: string; startsAt: string }) {
    return this.repository.requestPublicReservation(id, input);
  }

  update(id: string, patch: UpdateClubInput) {
    return this.repository.update(id, patch);
  }
}

