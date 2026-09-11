import type { Match, MatchRules, MatchStatus } from "../types";
import { isMatchResultComplete } from "./matchResultRules";

export type MatchPlayStatus = "pending" | "started" | "finished";

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
