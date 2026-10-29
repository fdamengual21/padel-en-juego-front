import { asTournamentFormat, type MatchRules, type RulesetPreset, type TournamentStatus } from "@/domain";
import type { PublicTournamentPage, PublicTournamentCategoryRef } from "../types/publicTournamentPage";
import type {
  PublicTournamentCategoryRefDto,
  PublicTournamentPageDto,
} from "../types/publicTournamentPageDto";

const STATUSES = new Set<string>([
  "draft",
  "registrationOpen",
  "inProgress",
  "finished",
  "cancelled",
]);

const PRESETS = new Set<string>(["QUALITY", "STANDARD", "CUSTOM"]);

const FALLBACK_MATCH_RULES: MatchRules = {
  setFormat: "best_of_3",
  setsToWin: 2,
  gamesPerSet: 6,
  advantageType: "goldenPoint",
  goldenPoint: true,
  tiebreakEnabled: true,
  tiebreakPoints: 7,
  tiebreakWinByTwo: true,
  superTiebreakEnabled: true,
  superTiebreakPoints: 10,
  superTiebreakWinByTwo: true,
};

/** DTO de la página pública → entidad de UI. */
export function toPublicTournamentPage(dto: PublicTournamentPageDto): PublicTournamentPage {
  const category = toCategory(dto.category);
  const categories = (dto.categories ?? []).map(toCategory);
  return {
    tournament: {
      id: dto.tournament.id,
      clubId: dto.tournament.clubId,
      clubName: dto.tournament.clubName ?? null,
      clubPhone: dto.tournament.clubPhone ?? null,
      name: dto.tournament.name,
      description: dto.tournament.description ?? null,
      startDate: dto.tournament.startDate,
      endDate: dto.tournament.endDate || dto.tournament.startDate,
      dailyStartTime: dto.tournament.dailyStartTime ?? "",
      dailyEndTime: dto.tournament.dailyEndTime ?? "",
      status: asStatus(dto.tournament.status),
      format: asTournamentFormat(dto.tournament.format),
      registrationFee: Number(dto.tournament.registrationFee ?? 0),
      bannerUrl: dto.tournament.bannerUrl ?? null,
    },
    categories: categories.length ? categories : [category],
    category,
    matchRules: dto.matchRules ?? FALLBACK_MATCH_RULES,
    preset: asPreset(dto.preset),
    tournamentStarted: Boolean(dto.tournamentStarted),
    summary: {
      pairCount: Number(dto.summary?.pairCount ?? 0),
      zones: Number(dto.summary?.zones ?? 0),
      qualify: Number(dto.summary?.qualify ?? 0),
      liveCount: Number(dto.summary?.liveCount ?? 0),
      finishedCount: Number(dto.summary?.finishedCount ?? 0),
    },
    quotaFull: Boolean(dto.quotaFull),
    canRegister: Boolean(dto.canRegister),
    repechageCreated: Boolean(dto.repechageCreated),
  };
}

function toCategory(dto: PublicTournamentCategoryRefDto): PublicTournamentCategoryRef {
  return {
    id: dto.id,
    name: dto.name,
    circuitType: dto.circuitType === "CICUPA" ? "CICUPA" : "NONE",
  };
}

function asStatus(value: string): TournamentStatus {
  return STATUSES.has(value) ? (value as TournamentStatus) : "registrationOpen";
}

function asPreset(value: string | null | undefined): RulesetPreset | null {
  return value && PRESETS.has(value) ? (value as RulesetPreset) : null;
}
