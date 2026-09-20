import { useAuthStore } from "@/stores/authStore";
import type { IUserRepository } from "../repositories/UserRepository";
import type { UpdateMeInput, UserMeDto } from "../types";

export class UserService {
  private readonly repository: IUserRepository;

  constructor(repository: IUserRepository) {
    this.repository = repository;
  }

  async me(): Promise<UserMeDto> {
    if (!useAuthStore.getState().token?.trim()) {
      throw new Error("No hay sesión");
    }

    const user = await this.repository.me();
    if (!user.id || !user.email) {
      throw new Error("La respuesta del usuario es inválida");
    }
    return user;
  }

  async updateMe(payload: UpdateMeInput): Promise<UserMeDto> {
    if (!useAuthStore.getState().token?.trim()) {
      throw new Error("No hay sesión");
    }
    return this.repository.updateMe(payload);
  }

  async uploadAvatar(file: File): Promise<UserMeDto> {
    if (!useAuthStore.getState().token?.trim()) {
      throw new Error("No hay sesión");
    }
    return this.repository.uploadAvatar(file);
  }

  async uploadCover(file: File): Promise<UserMeDto> {
    if (!useAuthStore.getState().token?.trim()) {
      throw new Error("No hay sesión");
    }
    return this.repository.uploadCover(file);
  }
}
