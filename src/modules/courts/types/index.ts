import type { Court, CourtPriceRule } from "@/domain";

export type { Court, CourtPriceRule };

export interface CreateCourtInput {
  name: string;
  slotDurationMinutes?: number;
  basePrice: number;
  isActive?: boolean;
}

export interface UpdateCourtInput {
  name?: string;
  slotDurationMinutes?: number;
  basePrice?: number;
  isActive?: boolean;
  priceRules?: CourtPriceRuleInput[];
}

export interface CourtPriceRuleInput {
  startTime: string;
  endTime: string;
  daysOfWeek: CourtPriceRule["daysOfWeek"];
  price: number;
  label?: string | null;
}
