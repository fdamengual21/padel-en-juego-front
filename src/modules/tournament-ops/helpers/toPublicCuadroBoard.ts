import { toMatchRules } from "./toMatchRules";
import { toPairPlayerNames } from "./toPairPlayerNames";
import type { PublicCuadroBoard } from "../types/publicCuadroBoard";
import type { PublicCuadroBoardDto } from "../types/publicCuadroBoardDto";

/** DTO del tab Cuadro público → entidad de UI. */
export function toPublicCuadroBoard(dto: PublicCuadroBoardDto): PublicCuadroBoard {
  return {
    categoryId: dto.categoryId,
    generatedAt: dto.generatedAt,
    groups: dto.groups ?? [],
    groupMatches: dto.groupMatches ?? [],
    rounds: dto.rounds ?? [],
    elimMatches: dto.elimMatches ?? [],
    slots: dto.slots ?? [],
    pairLabels: dto.pairLabels ?? {},
    pairPlayerNames: toPairPlayerNames(dto.pairPlayerNames),
    matchRules: toMatchRules(dto.matchRules),
    courts: (dto.courts ?? []).map((court) => ({ id: court.id, name: court.name })),
    unresolvedTies: dto.unresolvedTies ?? [],
    notice: dto.notice ?? null,
  };
}
