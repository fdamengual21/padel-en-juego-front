import type { IAuthRepository } from "../repositories/AuthRepository";
import type {
  ConfirmEmailInput,
  LoginInput,
  LoginResponse,
  RegisterInput,
} from "../types";

function requireLoginTokens(data: LoginResponse | undefined): LoginResponse {
  const token = data?.token?.trim() ?? "";
  const refreshToken = data?.refreshToken?.trim() ?? "";
  const expiresAt =
    data?.expiresAt == null ? "" : String(data.expiresAt).trim();
  if (!data || !token || !refreshToken || !expiresAt) {
    throw new Error("La respuesta de autenticación es inválida.");
  }
  return {
    ...data,
    token,
    refreshToken,
    expiresAt,
  };
}

export class AuthService {
  private readonly repository: IAuthRepository;

  constructor(repository: IAuthRepository) {
    this.repository = repository;
  }

  register(input: RegisterInput) {
    return this.repository.register(input);
  }

  async login(input: LoginInput) {
    const data = await this.repository.login(input);
    return requireLoginTokens(data);
  }

  async confirmEmail(input: ConfirmEmailInput) {
    const data = await this.repository.confirmEmail(input);
    return requireLoginTokens(data);
  }

  resendConfirmation(email: string) {
    return this.repository.resendConfirmation(email);
  }
}
