import type { WeekdayIso } from "@/domain";

export type { Club, UpdateClubInput } from "@/domain";

export interface ClubSettings {
  id: string;
  name: string;
  isActive: boolean;
  provinceId: number | null;
  municipalityId: number | null;
  street: string | null;
  streetNumber: string | null;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  phone: string | null;
  instagramHandle: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  openTime: string | null;
  closeTime: string | null;
  openDays: WeekdayIso[];
}

export interface UpdateClubSettingsInput {
  name: string;
  provinceId: number;
  municipalityId: number;
  street: string;
  streetNumber: string;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  phone: string;
  instagramHandle?: string | null;
  openTime?: string | null;
  closeTime?: string | null;
  openDays?: WeekdayIso[] | null;
}

export interface PublicClubListItem {
  id: string;
  name: string;
  coverUrl: string | null;
  provinceName: string | null;
  municipalityName: string | null;
  openTime: string | null;
  closeTime: string | null;
  openDays: WeekdayIso[];
  minCourtPrice: number | null;
  maxCourtPrice: number | null;
  availableSlotsToday: number;
}

export interface PublicClubListQuery {
  q?: string;
  provinceId?: number | null;
  municipalityId?: number | null;
  page?: number;
  pageSize?: number;
}
