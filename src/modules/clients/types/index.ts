export interface ClubClientListItem {
  id: string;
  fullName: string;
  phone: string | null;
  categoryLevel: number | null;
  avatarUrl: string | null;
}

export interface ClubClient {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  documentNumber: string | null;
  sexId: number | null;
  phone: string | null;
  categoryLevel: number | null;
  avatarUrl: string | null;
  hasAccount: boolean;
  reservationsCount: number;
}

export interface ClubClientListQuery {
  q?: string;
  categoryLevel?: number | null;
  page?: number;
  pageSize?: number;
}

export interface SaveClubClientInput {
  firstName: string;
  lastName: string;
  documentNumber: string;
  sexId: number;
  phone: string;
  categoryLevel: number;
}
