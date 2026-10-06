import type {
  EqualsResolution,
  MatchRules,
  RulesetPreset,
  TournamentCircuitType,
  TournamentFormat,
} from "@/domain";
import { parseIsoDateOnly, toIsoDateOnly } from "@/lib/dates";

export type {
  Tournament,
  TournamentCircuitType,
  TournamentFormat,
  TournamentStatus,
} from "@/domain";

export interface CreateTournamentRequest {
  clubId: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  dailyStartTime: string;
  dailyEndTime: string;
  courtHoldStartTime?: string;
  courtHoldEndTime?: string;
  courtHoldCourtIds?: string[];
  status: import("@/domain").TournamentStatus;
  format: TournamentFormat;
  registrationFee: number;
  phaseDays?: Array<{ phase: string; dayNumber: number }>;
}

export interface TournamentFormValues {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  dailyStartTime: string;
  dailyEndTime: string;
  /** Inicio del bloqueo de canchas. Solo Quality. */
  courtHoldStartTime: string;
  /** Fin del bloqueo de canchas. Solo Quality. */
  courtHoldEndTime: string;
  /** Canchas que ocupa el bloqueo. Solo Quality. */
  courtHoldCourtIds: string[];
  /** Precio de inscripción del torneo. */
  registrationFee: number;
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
  categoryKind: import("@/domain").CategoryKind;
  categoryLevel: import("@/domain").CategoryLevel | null;
  categoryGender: import("@/domain").CategoryGender;
  sumaTarget: number | null;
  categoryName: string;
  maxPairs: number;
  /** Circuito de ranking de la categoría. */
  circuitType: TournamentCircuitType;
  /** Dias elegidos por fase. La clave es el codigo de fase. */
  phaseDays: Record<string, number[]>;
}

export function buildMatchRulesFromForm(values: TournamentFormValues): MatchRules {
  const playType = values.matchPlayType;
  const setsToWin =
    playType === "QUALITY" ? 1 : playType === "STANDARD" ? 2 : Math.max(1, values.setsToWin);
  const goldenPoint =
    playType === "STANDARD" ? false : values.equalsResolution === "goldenPoint";
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
    superTiebreakEnabled: playType === "STANDARD" ? false : setsToWin >= 2,
    superTiebreakPoints: 10,
    superTiebreakWinByTwo: true,
  };
}

export function matchPlayTypeLabel(type: RulesetPreset): string {
  switch (type) {
    case "QUALITY":
      return "Quality (1 set)";
    case "STANDARD":
      return "Torneo puntuable";
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
    case "QUALITY":
      return "Quality";
    default:
      return "Zonas + eliminación";
  }
}

export interface PhaseOption {
  code: string;
  label: string;
}

/** Fases que se pueden ubicar en el calendario. Quality no usa esta grilla. */
export function phasesForFormat(format: TournamentFormat): PhaseOption[] {
  switch (format) {
    case "ROUND_ROBIN":
      return [{ code: "GROUP", label: "Zonas" }];
    case "DIRECT_ELIMINATION":
      return [
        { code: "R32", label: "Dieciseisavos" },
        { code: "R16", label: "Octavos" },
        { code: "QF", label: "Cuartos" },
        { code: "SF", label: "Semifinal" },
        { code: "FINAL", label: "Final" },
      ];
    case "QUALITY":
      return [];
    default:
      return [
        { code: "GROUP", label: "Zonas" },
        { code: "R32", label: "Dieciseisavos" },
        { code: "R16", label: "Octavos" },
        { code: "QF", label: "Cuartos" },
        { code: "SF", label: "Semifinal" },
        { code: "FINAL", label: "Final" },
      ];
  }
}

export function countTournamentDays(startDate: string, endDate: string): number {
  return enumerateTournamentDays(startDate, endDate).length;
}

export function enumerateTournamentDays(
  startDate: string,
  endDate: string,
): Array<{ dayNumber: number; iso: string }> {
  const start = parseIsoDateOnly(startDate);
  const end = parseIsoDateOnly(endDate) ?? start;
  if (!start || !end) return [];
  const last = end < start ? start : end;
  const days: Array<{ dayNumber: number; iso: string }> = [];
  const cursor = new Date(start);
  while (cursor <= last) {
    days.push({ dayNumber: days.length + 1, iso: toIsoDateOnly(cursor) });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/** Mismo reparto que usa la API cuando nadie elige los dias. */
export function defaultPhaseDays(format: TournamentFormat, dayCount: number): Record<string, number[]> {
  const phases = phasesForFormat(format).map((phase) => phase.code);
  const count = Math.max(0, dayCount);
  const map: Record<string, number[]> = {};
  if (count < 1) return map;
  if (count === 1) {
    for (const phase of phases) map[phase] = [1];
    return map;
  }
  const range = (from: number, to: number) => {
    const days: number[] = [];
    for (let day = from; day <= to; day += 1) days.push(day);
    return days;
  };
  if (phases.includes("GROUP")) map.GROUP = range(1, count - 1);
  const knockout = phases.filter((phase) => phase !== "GROUP");
  if (count >= 3) {
    for (const phase of knockout.filter((phase) => phase === "R32" || phase === "R16")) {
      map[phase] = [count - 1];
    }
    for (const phase of knockout.filter((phase) => phase === "QF" || phase === "SF" || phase === "FINAL")) {
      map[phase] = [count];
    }
    if (!knockout.includes("R32") && !knockout.includes("R16")) {
      for (const phase of knockout) map[phase] = [count];
    }
  } else {
    for (const phase of knockout) map[phase] = [count];
  }
  return map;
}

export function reconcilePhaseDays(values: TournamentFormValues): Record<string, number[]> {
  const count = countTournamentDays(values.startDate, values.endDate);
  const defaults = defaultPhaseDays(values.format, count);
  const next: Record<string, number[]> = {};
  for (const phase of phasesForFormat(values.format)) {
    const kept = (values.phaseDays[phase.code] ?? [])
      .filter((day) => day >= 1 && day <= count);
    const unique = [...new Set(kept)].sort((left, right) => left - right);
    next[phase.code] = unique.length > 0 ? unique : (defaults[phase.code] ?? [1]);
  }
  return next;
}

export function phaseDayMapFromList(
  items: Array<{ phase: string; dayNumber: number }> | undefined,
  format: TournamentFormat,
  dayCount: number,
): Record<string, number[]> {
  const defaults = defaultPhaseDays(format, dayCount);
  if (!items || items.length === 0) return defaults;
  const next: Record<string, number[]> = {};
  for (const phase of phasesForFormat(format)) {
    const picked = [
      ...new Set(
        items
          .filter((item) => item.phase === phase.code)
          .map((item) => item.dayNumber)
          .filter((day) => day >= 1 && day <= dayCount),
      ),
    ].sort((left, right) => left - right);
    next[phase.code] = picked.length > 0 ? picked : (defaults[phase.code] ?? []);
  }
  return next;
}

export function phaseDayListFromMap(
  map: Record<string, number[]>,
): Array<{ phase: string; dayNumber: number }> {
  return Object.entries(map).flatMap(([phase, days]) =>
    days.map((dayNumber) => ({ phase, dayNumber })),
  );
}

export function circuitTypeLabel(circuit: TournamentCircuitType): string {
  switch (circuit) {
    case "CICUPA":
      return "CICUPA";
    case "NONE":
      return "Sin circuito";
  }
}
