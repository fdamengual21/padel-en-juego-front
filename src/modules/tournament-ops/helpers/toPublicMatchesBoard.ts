import { toMatchRules } from "./toMatchRules";
import type { PublicMatchesBoard } from "../types/publicMatchesBoard";
import type { PublicMatchesBoardDto } from "../types/publicMatchesBoardDto";

/** DTO del tab Partidos público → entidad de UI. */
export function toPublicMatchesBoard(dto: PublicMatchesBoardDto): PublicMatchesBoard {
  return {
    categoryId: dto.categoryId,
    generatedAt: dto.generatedAt,
    groupMatches: dto.groupMatches ?? [],
    elimMatches: dto.elimMatches ?? [],
    pairLabels: dto.pairLabels ?? {},
    courtLabels: dto.courtLabels ?? {},
    matchRules: toMatchRules(dto.matchRules),
    notice: dto.notice ?? null,
  };
}
