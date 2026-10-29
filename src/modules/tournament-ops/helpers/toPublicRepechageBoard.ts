import { toMatchRules } from "./toMatchRules";
import { toPairPlayerNames } from "./toPairPlayerNames";
import type { PublicRepechageBoard } from "../types/publicRepechageBoard";
import type { PublicRepechageBoardDto } from "../types/publicRepechageBoardDto";

/** DTO del tab Repechaje público → entidad de UI. */
export function toPublicRepechageBoard(dto: PublicRepechageBoardDto): PublicRepechageBoard {
  return {
    categoryId: dto.categoryId,
    generatedAt: dto.generatedAt,
    groups: dto.groups ?? [],
    groupMatches: dto.groupMatches ?? [],
    standings: dto.standings ?? [],
    rounds: dto.rounds ?? [],
    elimMatches: dto.elimMatches ?? [],
    slots: dto.slots ?? [],
    pairLabels: dto.pairLabels ?? {},
    pairPlayerNames: toPairPlayerNames(dto.pairPlayerNames),
    matchRules: toMatchRules(dto.matchRules),
    allMatches: dto.allMatches ?? dto.groupMatches ?? [],
    finishedGroupIds: dto.finishedGroupIds ?? [],
    unresolvedTies: dto.unresolvedTies ?? [],
    notice: dto.notice ?? null,
  };
}
