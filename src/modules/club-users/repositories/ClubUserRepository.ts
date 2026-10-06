import type { AxiosInstance } from "axios";
import { readData } from "@/config/axiosInstance";
import type { ApiEnvelope } from "@/lib/apiClient";
import type {
  AssignClubStaffRoleInput,
  ClubUserCandidate,
  ClubUserCandidateDetail,
  ClubRoleOption,
  ClubStaffMember,
  ClubStaffStatusFilter,
  InviteClubStaffInput,
} from "../types";

export interface IClubUserRepository {
  list(status: ClubStaffStatusFilter): Promise<ClubStaffMember[]>;
  listRoles(): Promise<ClubRoleOption[]>;
  searchCandidates(query: string): Promise<ClubUserCandidate[]>;
  getCandidate(userId: string): Promise<ClubUserCandidateDetail>;
  invite(input: InviteClubStaffInput): Promise<ClubStaffMember>;
  assignRole(userId: string, input: AssignClubStaffRoleInput): Promise<ClubStaffMember>;
  deactivate(userId: string): Promise<ClubStaffMember>;
  reactivate(userId: string): Promise<ClubStaffMember>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeMember(raw: Record<string, unknown>): ClubStaffMember {
  return {
    userId: asString(raw.userId),
    email: asString(raw.email),
    firstName: asString(raw.firstName),
    lastName: asString(raw.lastName),
    role: asString(raw.role),
    isActive: raw.isActive === true,
    canEdit: raw.canEdit === true,
    avatarUrl: asNullableString(raw.avatarUrl),
    maskedEmail: asString(raw.maskedEmail),
    documentNumber: asNullableString(raw.documentNumber),
    phone: asNullableString(raw.phone),
    permissions: asStringList(raw.permissions),
  };
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeCandidate(raw: Record<string, unknown>): ClubUserCandidate {
  return {
    userId: asString(raw.userId),
    fullName: asString(raw.fullName),
    avatarUrl: asNullableString(raw.avatarUrl),
    maskedEmail: asString(raw.maskedEmail),
  };
}

function normalizeCandidateDetail(raw: Record<string, unknown>): ClubUserCandidateDetail {
  return {
    userId: asString(raw.userId),
    fullName: asString(raw.fullName),
    avatarUrl: asNullableString(raw.avatarUrl),
    email: asString(raw.email),
    documentNumber: asNullableString(raw.documentNumber),
  };
}
function normalizeRole(raw: Record<string, unknown>): ClubRoleOption {
  const permissions = Array.isArray(raw.permissions)
    ? raw.permissions.filter((item): item is string => typeof item === "string")
    : [];
  return {
    code: asString(raw.code),
    name: asString(raw.name),
    description: asString(raw.description),
    permissions,
  };
}

const statusParam: Record<ClubStaffStatusFilter, string> = {
  all: "All",
  active: "Active",
  inactive: "Inactive",
};

export class ClubUserRepository implements IClubUserRepository {
  private readonly axiosInstance: AxiosInstance;

  constructor(axiosInstance: AxiosInstance) {
    this.axiosInstance = axiosInstance;
  }

  async list(status: ClubStaffStatusFilter): Promise<ClubStaffMember[]> {
    const response = await this.axiosInstance.get<ApiEnvelope<Record<string, unknown>[]>>(
      "/club/users",
      { params: { status: statusParam[status] } },
    );
    return (readData(response) ?? []).map(normalizeMember);
  }

  async listRoles(): Promise<ClubRoleOption[]> {
    const response = await this.axiosInstance.get<ApiEnvelope<Record<string, unknown>[]>>(
      "/club/roles",
    );
    return (readData(response) ?? []).map(normalizeRole);
  }

  async searchCandidates(query: string): Promise<ClubUserCandidate[]> {
    const response = await this.axiosInstance.get<ApiEnvelope<Record<string, unknown>[]>>(
      "/club/users/candidates",
      { params: { q: query.trim() } },
    );
    return (readData(response) ?? []).map(normalizeCandidate);
  }

  async getCandidate(userId: string): Promise<ClubUserCandidateDetail> {
    const response = await this.axiosInstance.get<ApiEnvelope<Record<string, unknown>>>(
      `/club/users/candidates/${userId}`,
    );
    return normalizeCandidateDetail(readData(response));
  }

  async invite(input: InviteClubStaffInput): Promise<ClubStaffMember> {
    const response = await this.axiosInstance.post<ApiEnvelope<Record<string, unknown>>>(
      "/club/users",
      input,
    );
    return normalizeMember(readData(response));
  }

  async assignRole(userId: string, input: AssignClubStaffRoleInput): Promise<ClubStaffMember> {
    const response = await this.axiosInstance.patch<ApiEnvelope<Record<string, unknown>>>(
      `/club/users/${userId}`,
      input,
    );
    return normalizeMember(readData(response));
  }

  async deactivate(userId: string): Promise<ClubStaffMember> {
    const response = await this.axiosInstance.post<ApiEnvelope<Record<string, unknown>>>(
      `/club/users/${userId}/deactivate`,
    );
    return normalizeMember(readData(response));
  }

  async reactivate(userId: string): Promise<ClubStaffMember> {
    const response = await this.axiosInstance.post<ApiEnvelope<Record<string, unknown>>>(
      `/club/users/${userId}/reactivate`,
    );
    return normalizeMember(readData(response));
  }
}
