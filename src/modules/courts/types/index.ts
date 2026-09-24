import type { Court, CourtPriceRule, CourtStatus } from "@/domain";

export type { Court, CourtPriceRule };

export interface CreateCourtInput {
  name: string;
  slotDurationMinutes?: number;
  basePrice: number;
  status?: CourtStatus;
}

export interface UpdateCourtInput {
  name?: string;
  slotDurationMinutes?: number;
  basePrice?: number;
  status?: CourtStatus;
  priceRules?: CourtPriceRuleInput[];
}

export interface CourtPriceRuleInput {
  startTime: string;
  endTime: string;
  daysOfWeek: CourtPriceRule["daysOfWeek"];
  price: number;
  label?: string | null;
}
