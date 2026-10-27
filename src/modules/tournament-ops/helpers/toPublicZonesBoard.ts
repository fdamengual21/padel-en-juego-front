import { toMatchRules } from "./toMatchRules";
import { toPairPlayerNames } from "./toPairPlayerNames";
import type { PublicZonesBoard } from "../types/publicZonesBoard";
import type { PublicZonesBoardDto } from "../types/publicZonesBoardDto";

/** DTO del tab Zonas público → entidad de UI. */
export function toPublicZonesBoard(dto: PublicZonesBoardDto): PublicZonesBoard {
  return {
    categoryId: dto.categoryId,
    generatedAt: dto.generatedAt,
    groups: dto.groups ?? [],
    groupMatches: dto.groupMatches ?? [],
    standings: dto.standings ?? [],
    pairLabels: dto.pairLabels ?? {},
    pairPlayerNames: toPairPlayerNames(dto.pairPlayerNames),
    matchRules: toMatchRules(dto.matchRules),
    courts: (dto.courts ?? []).map((court) => ({ id: court.id, name: court.name })),
    allMatches: dto.allMatches ?? [],
    slots: dto.slots ?? [],
    finishedGroupIds: dto.finishedGroupIds ?? [],
    unresolvedTies: dto.unresolvedTies ?? [],
    notice: dto.notice ?? null,
  };
}
