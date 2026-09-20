import type { AxiosInstance } from "axios";
import { readData } from "@/config/axiosInstance";
import type { ApiEnvelope } from "@/lib/apiClient";
import type {
  ConfirmEmailInput,
  LoginInput,
  LoginResponse,
  RegisterInput,
  RegisterResponse,
} from "../types";

export interface IAuthRepository {
  register(input: RegisterInput): Promise<RegisterResponse>;
  login(input: LoginInput): Promise<LoginResponse>;
  confirmEmail(input: ConfirmEmailInput): Promise<LoginResponse>;
  resendConfirmation(email: string): Promise<string>;
}

function compactRegister(input: RegisterInput): RegisterInput {
  return {
    firstName: input.firstName,
    lastName: input.lastName,
    documentNumber: input.documentNumber,
    sexId: input.sexId,
    email: input.email,
    password: input.password,
    ...(input.dateOfBirth ? { dateOfBirth: input.dateOfBirth } : {}),
    ...(input.categoryLevel != null ? { categoryLevel: input.categoryLevel } : {}),
    ...(input.provinceId != null ? { provinceId: input.provinceId } : {}),
    ...(input.municipalityId != null ? { municipalityId: input.municipalityId } : {}),
    acceptedPrivacyDocumentId: input.acceptedPrivacyDocumentId,
    acceptedTermsDocumentId: input.acceptedTermsDocumentId,
  };
}

export class AuthRepository implements IAuthRepository {
  private readonly axiosInstance: AxiosInstance;

  constructor(axiosInstance: AxiosInstance) {
    this.axiosInstance = axiosInstance;
  }

  async register(input: RegisterInput) {
    const response = await this.axiosInstance.post<ApiEnvelope<RegisterResponse>>(
      "/auth/register",
      compactRegister(input),
    );
    return readData(response);
  }

  async login(input: LoginInput) {
    const response = await this.axiosInstance.post<ApiEnvelope<LoginResponse>>(
      "/auth/login",
      input,
    );
    return readData(response);
  }

  async confirmEmail(input: ConfirmEmailInput) {
    const response = await this.axiosInstance.post<ApiEnvelope<LoginResponse>>(
      "/auth/confirm-email",
      input,
    );
    return readData(response);
  }

  async resendConfirmation(email: string) {
    const response = await this.axiosInstance.post<ApiEnvelope<string>>(
      "/auth/resend-confirmation",
      { email },
    );
    return readData(response);
  }
}
