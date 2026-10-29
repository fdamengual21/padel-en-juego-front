import type { MatchRules } from "@/domain";

/** JSON de GET /api/public/tournaments/{id}/view. */
export interface PublicTournamentPageDto {
  tournament: PublicTournamentDto;
  categories: PublicTournamentCategoryRefDto[];
  category: PublicTournamentCategoryRefDto;
  matchRules: MatchRules;
  preset: string | null;
  tournamentStarted: boolean;
  summary: PublicTournamentSummaryDto;
  quotaFull: boolean;
  canRegister: boolean;
  repechageCreated?: boolean;
}

export interface PublicTournamentDto {
  id: string;
  clubId: string;
  clubName: string | null;
  clubPhone: string | null;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  dailyStartTime: string;
  dailyEndTime: string;
  status: string;
  format: string;
  registrationFee: number;
  bannerUrl: string | null;
}

export interface PublicTournamentCategoryRefDto {
  id: string;
  name: string;
  circuitType: string;
}

export interface PublicTournamentSummaryDto {
  pairCount: number;
  zones: number;
  qualify: number;
  liveCount: number;
  finishedCount: number;
}
