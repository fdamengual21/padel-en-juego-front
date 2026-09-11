import type {
  EqualsResolution,
  MatchRules,
  RulesetPreset,
  TournamentFormat,
} from "@core-api";

export type { Tournament, TournamentFormat, TournamentStatus } from "@core-api";

export interface CreateTournamentRequest {
  clubId: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  dailyStartTime: string;
  dailyEndTime: string;
  status: import("@core-api").TournamentStatus;
  format: TournamentFormat;
}

export interface TournamentFormValues {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  dailyStartTime: string;
  dailyEndTime: string;
  /** Estructura del cuadro (grupos, eliminación, etc.). */
  format: TournamentFormat;
  /** Tipo de partido: Quality / Estándar / Personalizado. */
  matchPlayType: RulesetPreset;
  /** Resolución de iguales (40-40). */
  equalsResolution: EqualsResolution;
  /** Sets para ganar (Personalizado). Quality=1, Estándar=2. */
  setsToWin: number;
  /** Puntos del tie-break (Personalizado; default 7). */
  tiebreakPoints: number;
  categoryKind: import("@core-api").CategoryKind;
  categoryLevel: import("@core-api").CategoryLevelCode | null;
  categoryGender: import("@core-api").CategoryGender;
  sumaTarget: number | null;
  categoryName: string;
  maxPairs: number;
  pairsPerGroup: number;
  qualifyPerGroup: number;
}

export function buildMatchRulesFromForm(values: TournamentFormValues): MatchRules {
  const playType = values.matchPlayType;
  const setsToWin =
    playType === "QUALITY" ? 1 : playType === "STANDARD" ? 2 : Math.max(1, values.setsToWin);
  const goldenPoint = values.equalsResolution === "goldenPoint";
  const tiebreakPoints =
    playType === "CUSTOM" ? Math.max(1, values.tiebreakPoints) : 7;

  return {
    setFormat: setsToWin === 1 ? "one_set" : "best_of_3",
    setsToWin,
    gamesPerSet: 6,
    advantageType: goldenPoint ? "goldenPoint" : "advantage",
    goldenPoint,
    tiebreakEnabled: true,
    tiebreakPoints,
    tiebreakWinByTwo: true,
    superTiebreakEnabled: setsToWin >= 2,
    superTiebreakPoints: 10,
    superTiebreakWinByTwo: true,
  };
}

export function matchPlayTypeLabel(type: RulesetPreset): string {
  switch (type) {
    case "QUALITY":
      return "Quality (1 set)";
    case "STANDARD":
      return "Estándar (mejor de 3)";
    case "CUSTOM":
      return "Personalizado";
  }
}

export function equalsResolutionLabel(value: EqualsResolution): string {
  return value === "goldenPoint"
    ? "Punto de oro"
    : "Con ventaja (diferencia de 2)";
}

export function tournamentFormatLabel(format: TournamentFormat): string {
  switch (format) {
    case "GROUPS_ELIMINATION":
      return "Zonas + eliminación";
    case "DIRECT_ELIMINATION":
      return "Eliminación directa";
    case "ROUND_ROBIN":
      return "Todos contra todos";
    default:
      return "Zonas + eliminación";
  }
}
