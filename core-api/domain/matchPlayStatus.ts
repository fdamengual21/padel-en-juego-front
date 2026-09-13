import type {
  Match,
  MatchRules,
  MatchStatus,
  TournamentStatus,
} from "../types";
import { isMatchResultComplete } from "./matchResultRules";

export type MatchPlayStatus = "pending" | "started" | "finished";

/** Mutaciones de partido que el club puede disparar desde la UI. */
export type MatchMutationKind = "schedule" | "status" | "result";

export type MatchMutationValidationResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Bloquea mutaciones si el torneo está cerrado o el partido cancelado.
 * Agenda/estado: también si el partido ya tiene resultado.
 * Resultado: se puede corregir mientras el torneo siga abierto.
 */
export function validateMatchMutation(
  match: Pick<
    Match,
    "status" | "sets" | "winnerPairId" | "pairAId" | "pairBId" | "scheduledAt"
  >,
  context: {
    tournamentStatus: TournamentStatus | null | undefined;
    matchRules?: MatchRules | null;
  },
  kind: MatchMutationKind,
): MatchMutationValidationResult {
  if (context.tournamentStatus === "finished") {
    return {
      ok: false,
      message: "No se puede modificar un partido de un torneo finalizado.",
    };
  }

  if (context.tournamentStatus === "cancelled") {
    return {
      ok: false,
      message: "No se puede modificar un partido de un torneo cancelado.",
    };
  }

  if (match.status === "cancelled") {
    return {
      ok: false,
      message: "No se puede modificar un partido cancelado.",
    };
  }

  if (kind === "result") return { ok: true };

  const matchClosed =
    match.status === "finished" ||
    match.status === "walkover" ||
    (context.matchRules
      ? isMatchResultComplete(match, context.matchRules)
      : Boolean(match.winnerPairId && match.sets.length > 0));

  if (matchClosed) {
    return {
      ok: false,
      message:
        kind === "schedule"
          ? "No se puede cambiar el horario de un partido finalizado."
          : "El partido ya está cerrado y no se puede cambiar el estado.",
    };
  }

  return { ok: true };
}

/** El horario asignado ya pasó (o es ahora). */
export function hasMatchStartedBySchedule(
  scheduledAt: string | null | undefined,
  now: Date | string | number = Date.now(),
): boolean {
  if (!scheduledAt) return false;
  const start = new Date(scheduledAt).getTime();
  if (Number.isNaN(start)) return false;
  return start <= new Date(now).getTime();
}

/**
 * Estado de juego para UI/tablas.
 * Prioridad: resultado → inProgress (mutación "Marcar en juego") → horario.
 */
export function resolveMatchPlayStatus(
  match: Pick<
    Match,
    "scheduledAt" | "sets" | "winnerPairId" | "pairAId" | "pairBId" | "status"
  >,
  rules: MatchRules,
  now: Date | string | number = Date.now(),
): MatchPlayStatus {
  if (match.status === "walkover" && match.winnerPairId && match.sets.length) {
    return "finished";
  }
  if (isMatchResultComplete(match, rules)) return "finished";
  if (match.status === "inProgress") return "started";
  if (hasMatchStartedBySchedule(match.scheduledAt, now)) return "started";
  return "pending";
}

export function matchPlayStatusLabel(status: MatchPlayStatus): string {
  switch (status) {
    case "pending":
      return "Pendiente";
    case "started":
      return "Ya comenzó";
    case "finished":
      return "Finalizado";
  }
}

const TERMINAL_STATUSES: ReadonlySet<MatchStatus> = new Set([
  "finished",
  "walkover",
  "cancelled",
]);

export type MatchStatusTransitionResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Reglas de transición como endpoint real de mutación de estado.
 * `finished` / `walkover` se cierran por resultado o desclasificación, no por este PATCH.
 */
export function validateMatchStatusTransition(
  match: Pick<Match, "status" | "pairAId" | "pairBId">,
  next: MatchStatus,
): MatchStatusTransitionResult {
  const current = match.status;
  if (current === next) return { ok: true };

  if (TERMINAL_STATUSES.has(current)) {
    return {
      ok: false,
      message: "El partido ya está cerrado y no se puede cambiar el estado.",
    };
  }

  if (next === "finished" || next === "walkover") {
    return {
      ok: false,
      message:
        "Para cerrar el partido cargá el resultado o usá desclasificación (walkover).",
    };
  }

  if (next === "cancelled") {
    if (current === "inProgress") {
      return {
        ok: false,
        message: "No se puede cancelar un partido en juego. Primero volvelo a programado.",
      };
    }
    return { ok: true };
  }

  if (next === "inProgress") {
    if (!match.pairAId || !match.pairBId) {
      return {
        ok: false,
        message: "No se puede marcar en juego: faltan las dos parejas.",
      };
    }
    if (current !== "scheduled" && current !== "inProgress") {
      return {
        ok: false,
        message: "Solo se puede marcar en juego un partido programado.",
      };
    }
    return { ok: true };
  }

  if (next === "scheduled") {
    if (current === "inProgress" || current === "scheduled") return { ok: true };
    return {
      ok: false,
      message: "No se puede volver a programado desde el estado actual.",
    };
  }

  return { ok: false, message: "Transición de estado no permitida." };
}
