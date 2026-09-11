import type { Court, Match } from "../types";

export const DEFAULT_MATCH_DURATION_MINUTES = 90;

export interface ScheduleConflictMatchInfo {
  matchId: string;
  courtId: string | null;
  courtName: string | null;
  scheduledAt: string;
  pairAId: string | null;
  pairBId: string | null;
}

export interface ScheduleConflict {
  type: "court" | "capacity";
  /** Resumen corto sin listar partidos (para UI). */
  summary: string;
  /** Mensaje completo (logs / errores de API). */
  message: string;
  conflictingMatches: ScheduleConflictMatchInfo[];
}

export interface FindScheduleConflictsInput {
  matchId: string;
  scheduledAt: string | null;
  courtId: string | null;
  matches: Match[];
  courts: Court[];
  /** Etiquetas opcionales para armar el mensaje. */
  pairLabels?: Record<string, string>;
  courtNames?: Record<string, string>;
  matchDurationMinutes?: number;
}

function toMs(iso: string): number | null {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

export function matchesOverlap(
  aStartIso: string,
  bStartIso: string,
  durationMinutes = DEFAULT_MATCH_DURATION_MINUTES,
): boolean {
  const a0 = toMs(aStartIso);
  const b0 = toMs(bStartIso);
  if (a0 == null || b0 == null) return false;
  const durationMs = durationMinutes * 60_000;
  const a1 = a0 + durationMs;
  const b1 = b0 + durationMs;
  return a0 < b1 && b0 < a1;
}

function isSchedulable(match: Match): boolean {
  return match.status !== "cancelled";
}

export function describeScheduleConflictMatch(
  m: ScheduleConflictMatchInfo,
  pairLabels: Record<string, string>,
): string {
  const a = m.pairAId ? pairLabels[m.pairAId] ?? "Pareja A" : "Pareja A";
  const b = m.pairBId ? pairLabels[m.pairBId] ?? "Pareja B" : "Pareja B";
  const court = m.courtName ? ` · ${m.courtName}` : " · sin cancha";
  return `${a} vs ${b}${court}`;
}

export function pairLabelForMatch(
  m: Pick<ScheduleConflictMatchInfo, "pairAId" | "pairBId">,
  pairLabels: Record<string, string>,
): string {
  const a = m.pairAId ? pairLabels[m.pairAId] ?? "Pareja A" : "Pareja A";
  const b = m.pairBId ? pairLabels[m.pairBId] ?? "Pareja B" : "Pareja B";
  return `${a} vs ${b}`;
}

function overlappingMatches(
  matchId: string,
  scheduledAt: string,
  matches: Match[],
  matchDurationMinutes: number,
): Match[] {
  return matches.filter(
    (m) =>
      m.id !== matchId &&
      isSchedulable(m) &&
      m.scheduledAt != null &&
      matchesOverlap(scheduledAt, m.scheduledAt, matchDurationMinutes),
  );
}

/**
 * Canchas activas libres en ese horario (sin partido solapado asignado).
 */
export function listAvailableCourtsAt(input: {
  matchId: string;
  scheduledAt: string | null;
  matches: Match[];
  courts: Court[];
  matchDurationMinutes?: number;
}): Court[] {
  const {
    matchId,
    scheduledAt,
    matches,
    courts,
    matchDurationMinutes = DEFAULT_MATCH_DURATION_MINUTES,
  } = input;
  if (!scheduledAt) return courts.filter((c) => c.status === "active");

  const activeCourts = courts.filter((c) => c.status === "active");
  const overlapping = overlappingMatches(
    matchId,
    scheduledAt,
    matches,
    matchDurationMinutes,
  );
  const usedCourtIds = new Set(
    overlapping.map((m) => m.courtId).filter((id): id is string => Boolean(id)),
  );
  return activeCourts.filter((c) => !usedCourtIds.has(c.id));
}

/**
 * Conflictos al asignar horario/cancha.
 * - Sin cancha: no avisa por cancha puntual.
 * - Con cancha: avisa si esa cancha ya tiene partido solapado.
 * - Capacidad: si en ese horario hay tantos partidos como canchas activas (u más),
 *   avisa que no hay canchas disponibles.
 */
export function findScheduleConflicts(
  input: FindScheduleConflictsInput,
): ScheduleConflict[] {
  const {
    matchId,
    scheduledAt,
    courtId,
    matches,
    courts,
    pairLabels = {},
    matchDurationMinutes = DEFAULT_MATCH_DURATION_MINUTES,
  } = input;

  if (!scheduledAt) return [];

  const activeCourts = courts.filter((c) => c.status === "active");
  const courtNameById: Record<string, string> = {
    ...Object.fromEntries(activeCourts.map((c) => [c.id, c.name])),
    ...(input.courtNames ?? {}),
  };

  const overlapping = overlappingMatches(
    matchId,
    scheduledAt,
    matches,
    matchDurationMinutes,
  );

  const toInfo = (m: Match): ScheduleConflictMatchInfo => ({
    matchId: m.id,
    courtId: m.courtId,
    courtName: m.courtId ? courtNameById[m.courtId] ?? m.courtId : null,
    scheduledAt: m.scheduledAt!,
    pairAId: m.pairAId,
    pairBId: m.pairBId,
  });

  const conflicts: ScheduleConflict[] = [];

  if (courtId) {
    const sameCourt = overlapping.filter((m) => m.courtId === courtId);
    if (sameCourt.length > 0) {
      const infos = sameCourt.map(toInfo);
      const listed = infos
        .map((i) => pairLabelForMatch(i, pairLabels))
        .join("; ");
      const courtName = courtNameById[courtId] ?? "La cancha";
      const summary = `La cancha seleccionada (${courtName}) se encuentra ocupada por ${listed}.`;
      conflicts.push({
        type: "court",
        summary,
        message: summary,
        conflictingMatches: infos,
      });
    }
  }

  const occupiedSlots = overlapping.length + 1;
  if (activeCourts.length > 0 && occupiedSlots > activeCourts.length) {
    const infos = overlapping.map(toInfo);
    const summary = "No hay canchas disponibles a esa hora.";
    conflicts.push({
      type: "capacity",
      summary,
      message: summary,
      conflictingMatches: infos,
    });
  }

  return conflicts;
}
