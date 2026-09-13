import type {
  Court,
  CourtReservation,
  Match,
  RulesetPreset,
} from "../types";

/** Partidos estándar / no Quality: ~1 h. */
export const NON_QUALITY_MATCH_DURATION_MINUTES = 60;

/** Quality: referencia 2 h 15 (rango 2 h – 2 h 30). */
export const QUALITY_MATCH_DURATION_MINUTES = 135;

/** Alias histórico; preferir `resolveMatchDurationMinutes`. */
export const DEFAULT_MATCH_DURATION_MINUTES = NON_QUALITY_MATCH_DURATION_MINUTES;

export function resolveMatchDurationMinutes(
  preset: RulesetPreset | null | undefined,
): number {
  return preset === "QUALITY"
    ? QUALITY_MATCH_DURATION_MINUTES
    : NON_QUALITY_MATCH_DURATION_MINUTES;
}

export function isQualityPreset(
  preset: RulesetPreset | null | undefined,
): boolean {
  return preset === "QUALITY";
}

export interface ScheduleConflictMatchInfo {
  matchId: string;
  courtId: string | null;
  courtName: string | null;
  scheduledAt: string;
  pairAId: string | null;
  pairBId: string | null;
}

export interface ScheduleConflictReservationInfo {
  reservationId: string;
  courtId: string;
  courtName: string | null;
  startsAt: string;
  endsAt: string;
  clientLabel: string | null;
}

export interface ScheduleConflict {
  type: "court" | "capacity" | "reservation" | "pair";
  /** Resumen corto sin listar partidos (para UI). */
  summary: string;
  /** Mensaje completo (logs / errores de API). */
  message: string;
  conflictingMatches: ScheduleConflictMatchInfo[];
  conflictingReservations: ScheduleConflictReservationInfo[];
}

export interface FindScheduleConflictsInput {
  matchId: string;
  scheduledAt: string | null;
  courtId: string | null;
  matches: Match[];
  courts: Court[];
  reservations?: CourtReservation[];
  /** Etiquetas opcionales para armar el mensaje. */
  pairLabels?: Record<string, string>;
  courtNames?: Record<string, string>;
  clientLabels?: Record<string, string>;
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

export function slotOverlapsReservation(
  startsAt: string,
  endsAt: string,
  reservation: Pick<CourtReservation, "startsAt" | "endsAt" | "status">,
): boolean {
  if (reservation.status === "cancelled") return false;
  const a0 = toMs(startsAt);
  const a1 = toMs(endsAt);
  const b0 = toMs(reservation.startsAt);
  const b1 = toMs(reservation.endsAt);
  if (a0 == null || a1 == null || b0 == null || b1 == null) return false;
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

function matchPairIds(
  match: Pick<Match, "pairAId" | "pairBId">,
): string[] {
  return [match.pairAId, match.pairBId].filter(
    (id): id is string => Boolean(id),
  );
}

/** True si los dos partidos comparten al menos una pareja. */
export function matchesSharePair(
  a: Pick<Match, "pairAId" | "pairBId">,
  b: Pick<Match, "pairAId" | "pairBId">,
): boolean {
  const aIds = matchPairIds(a);
  if (aIds.length === 0) return false;
  const bIds = new Set(matchPairIds(b));
  return aIds.some((id) => bIds.has(id));
}

function describePairBusyConflict(input: {
  subject: Pick<Match, "pairAId" | "pairBId">;
  others: ScheduleConflictMatchInfo[];
  pairLabels: Record<string, string>;
}): string {
  const subjectPairIds = matchPairIds(input.subject);
  const parts: string[] = [];

  for (const pairId of subjectPairIds) {
    const busy = input.others.filter(
      (m) => m.pairAId === pairId || m.pairBId === pairId,
    );
    if (busy.length === 0) continue;

    const pairLabel = input.pairLabels[pairId] ?? "Una pareja";
    const details = busy
      .map((m) => {
        const opponentId = m.pairAId === pairId ? m.pairBId : m.pairAId;
        const opponent = opponentId
          ? (input.pairLabels[opponentId] ?? "otra pareja")
          : "otra pareja";
        const court = m.courtName ? m.courtName : "sin cancha";
        return `vs ${opponent} (${court})`;
      })
      .join("; ");
    parts.push(
      `${pairLabel} ya tiene otro partido a esa hora: ${details}.`,
    );
  }

  return (
    parts.join(" ") ||
    "Una de las parejas ya tiene otro partido a esa hora."
  );
}

function overlappingReservations(input: {
  courtId: string | null;
  startsAt: string;
  endsAt: string;
  reservations: CourtReservation[];
}): CourtReservation[] {
  const { courtId, startsAt, endsAt, reservations } = input;
  return reservations.filter((r) => {
    if (r.status === "cancelled") return false;
    if (courtId && r.courtId !== courtId) return false;
    if (!courtId && !r.courtId) return false;
    return slotOverlapsReservation(startsAt, endsAt, r);
  });
}

/**
 * Canchas activas libres en ese horario (sin partido ni reserva solapados).
 */
export function listAvailableCourtsAt(input: {
  matchId: string;
  scheduledAt: string | null;
  matches: Match[];
  courts: Court[];
  reservations?: CourtReservation[];
  matchDurationMinutes?: number;
}): Court[] {
  const {
    matchId,
    scheduledAt,
    matches,
    courts,
    reservations = [],
    matchDurationMinutes = DEFAULT_MATCH_DURATION_MINUTES,
  } = input;
  if (!scheduledAt) return courts.filter((c) => c.status === "active");

  const endsAt = new Date(
    new Date(scheduledAt).getTime() + matchDurationMinutes * 60_000,
  ).toISOString();

  const activeCourts = courts.filter((c) => c.status === "active");
  const overlapping = overlappingMatches(
    matchId,
    scheduledAt,
    matches,
    matchDurationMinutes,
  );
  const usedByMatch = new Set(
    overlapping.map((m) => m.courtId).filter((id): id is string => Boolean(id)),
  );
  const usedByReservation = new Set(
    overlappingReservations({
      courtId: null,
      startsAt: scheduledAt,
      endsAt,
      reservations,
    })
      .map((r) => r.courtId)
      .filter((id): id is string => Boolean(id)),
  );

  return activeCourts.filter(
    (c) => !usedByMatch.has(c.id) && !usedByReservation.has(c.id),
  );
}

/**
 * Conflictos al asignar horario/cancha.
 * Incluye solapes de pareja, cancha, reservas y capacidad.
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
    reservations = [],
    pairLabels = {},
    clientLabels = {},
    matchDurationMinutes = DEFAULT_MATCH_DURATION_MINUTES,
  } = input;

  if (!scheduledAt) return [];

  const endsAt = new Date(
    new Date(scheduledAt).getTime() + matchDurationMinutes * 60_000,
  ).toISOString();

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

  const toReservationInfo = (
    r: CourtReservation,
  ): ScheduleConflictReservationInfo => ({
    reservationId: r.id,
    courtId: r.courtId ?? "",
    courtName: r.courtId ? courtNameById[r.courtId] ?? r.courtId : null,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    clientLabel: clientLabels[r.clientId] ?? null,
  });

  const conflicts: ScheduleConflict[] = [];
  const subject = matches.find((m) => m.id === matchId) ?? null;

  if (subject && matchPairIds(subject).length > 0) {
    const pairOverlaps = overlapping.filter((m) =>
      matchesSharePair(subject, m),
    );
    if (pairOverlaps.length > 0) {
      const infos = pairOverlaps.map(toInfo);
      const summary = describePairBusyConflict({
        subject,
        others: infos,
        pairLabels,
      });
      conflicts.push({
        type: "pair",
        summary,
        message: summary,
        conflictingMatches: infos,
        conflictingReservations: [],
      });
    }
  }

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
        conflictingReservations: [],
      });
    }

    const reserved = overlappingReservations({
      courtId,
      startsAt: scheduledAt,
      endsAt,
      reservations,
    });
    if (reserved.length > 0) {
      const infos = reserved.map(toReservationInfo);
      const courtName = courtNameById[courtId] ?? "La cancha";
      const labels = infos
        .map((i) => i.clientLabel ?? "una reserva")
        .join("; ");
      const summary = `Hay una reserva de cancha en ${courtName} (${labels}).`;
      conflicts.push({
        type: "reservation",
        summary,
        message: summary,
        conflictingMatches: [],
        conflictingReservations: infos,
      });
    }
  }

  const courtsBusyByReservation = new Set(
    overlappingReservations({
      courtId: null,
      startsAt: scheduledAt,
      endsAt,
      reservations,
    })
      .map((r) => r.courtId)
      .filter((id): id is string => Boolean(id)),
  );
  const courtsBusyByMatch = new Set(
    overlapping
      .map((m) => m.courtId)
      .filter((id): id is string => Boolean(id)),
  );
  const freeCourts = activeCourts.filter(
    (c) => !courtsBusyByMatch.has(c.id) && !courtsBusyByReservation.has(c.id),
  );
  const proposedStillFree =
    !courtId ||
    (freeCourts.some((c) => c.id === courtId) &&
      !conflicts.some((c) => c.type === "court" || c.type === "reservation"));

  if (
    activeCourts.length > 0 &&
    freeCourts.length === 0 &&
    !proposedStillFree
  ) {
    const infos = overlapping.map(toInfo);
    const summary = "No hay canchas disponibles a esa hora (partidos o reservas).";
    conflicts.push({
      type: "capacity",
      summary,
      message: summary,
      conflictingMatches: infos,
      conflictingReservations: overlappingReservations({
        courtId: null,
        startsAt: scheduledAt,
        endsAt,
        reservations,
      }).map(toReservationInfo),
    });
  } else if (activeCourts.length > 0) {
    const occupiedSlots = overlapping.length + 1;
    if (occupiedSlots > activeCourts.length) {
      const infos = overlapping.map(toInfo);
      const summary = "No hay canchas disponibles a esa hora.";
      conflicts.push({
        type: "capacity",
        summary,
        message: summary,
        conflictingMatches: infos,
        conflictingReservations: [],
      });
    }
  }

  return conflicts;
}
