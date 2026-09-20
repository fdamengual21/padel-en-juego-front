/**
 * Resumen del usuario autenticado (`UserSummaryDto` en la API, JSON camelCase).
 * Fuente de verdad: `GET /api/users/me`.
 */
export interface UserClubContext {
  id: string;
  name: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  role: string;
  permissions: string[];
}

export interface UserMeDto {
  id: string;
  email: string;
  emailConfirmed: boolean;
  firstName: string;
  lastName: string;
  roles: string[];
  isRootPlatformAdmin: boolean;
  activeClubId: string | null;
  activeClubRole: string;
  scopedPermissions: string[];
  clubs: UserClubContext[];
  playerId: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  documentNumber: string | null;
  sexId: number | null;
  provinceId: number | null;
  municipalityId: number | null;
  phone: string | null;
  isPhonePublic: boolean;
  dateOfBirth: string | null;
  categoryLevel: number | null;
  age: number | null;
  canPublishPhone: boolean;
}

export interface UpdateMeInput {
  firstName: string;
  lastName: string;
  documentNumber: string;
  sexId: number;
  dateOfBirth: string | null;
  categoryLevel: number | null;
  provinceId: number | null;
  municipalityId: number | null;
  phone: string | null;
  isPhonePublic: boolean;
}
