export interface ClubStaffMember {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  canEdit: boolean;
  avatarUrl: string | null;
  maskedEmail: string;
  documentNumber: string | null;
  phone: string | null;
  permissions: string[];
}

export interface ClubRoleOption {
  code: string;
  name: string;
  description: string;
  permissions: string[];
}

export type ClubStaffStatusFilter = "all" | "active" | "inactive";

export interface InviteClubStaffInput {
  userId: string;
  role: string;
}

export interface ClubUserCandidate {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  maskedEmail: string;
}

export interface ClubUserCandidateDetail {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  email: string;
  documentNumber: string | null;
}

export interface AssignClubStaffRoleInput {
  role: string;
}
