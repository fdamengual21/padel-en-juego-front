import type { ICourtRepository } from "../repositories/CourtRepository";
import type { CreateCourtInput, UpdateCourtInput } from "../types";

export class CourtService {
  private readonly repository: ICourtRepository;

  constructor(repository: ICourtRepository) {
    this.repository = repository;
  }

  list() {
    return this.repository.list();
  }

  getById(id: string) {
    return this.repository.getById(id);
  }

  create(input: CreateCourtInput) {
    return this.repository.create(input);
  }

  update(id: string, patch: UpdateCourtInput) {
    return this.repository.update(id, patch);
  }

  deactivate(id: string) {
    return this.repository.deactivate(id);
  }

  uploadPhoto(id: string, file: File) {
    return this.repository.uploadPhoto(id, file);
  }

  deletePhoto(id: string) {
    return this.repository.deletePhoto(id);
  }
}
