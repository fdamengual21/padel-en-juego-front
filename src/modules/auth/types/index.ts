import type { UserClubContext, UserMeDto } from "@/modules/users";

export type { UserClubContext, UserMeDto };

/** Alias del DTO de `GET /api/users/me`. */
export type UserSummary = UserMeDto;

export interface LoginResponse {
  token: string;
  expiresAt: string;
  refreshToken: string;
  user: UserSummary;
}

export interface RegisterResponse {
  userId: string;
  email: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  documentNumber: string;
  sexId: number;
  email: string;
  password: string;
  dateOfBirth?: string | null;
  categoryLevel?: number | null;
  provinceId?: number | null;
  municipalityId?: number | null;
  acceptedPrivacyDocumentId: string;
  acceptedTermsDocumentId: string;
}

export interface ConfirmEmailInput {
  userId: string;
  token: string;
}
