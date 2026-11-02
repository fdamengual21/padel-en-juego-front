import dayjs from "dayjs";
import { formatTournamentDayEs, formatWeekdayShortEs, todayIsoAr } from "@/lib/dates";
import { ROUTES } from "@/router/routes";
import type { TournamentFormValues } from "../types";
import type { TournamentFlow, TournamentStatusInput, TournamentStatusView } from "./types";

/** Igual que la API: ClubRankingPoints. */
export const RANKING_EVENT_MIN_PAIRS = 6;
const VISIBLE_DAYS_BEFORE = 7;
const REGISTRATION_DAYS_BEFORE = 2;

interface RankingEventContext {
  circuitId: string;
  weekIndex?: number | null;
  weekCount?: number | null;
}

function shiftDays(iso: string, days: number): string {
  return dayjs(iso).add(days, "day").format("YYYY-MM-DD");
}

function dateWarnings(next: TournamentFormValues, saved: TournamentFormValues): string[] {
  if (next.startDate === saved.startDate) return [];
  const opens = shiftDays(next.startDate, -REGISTRATION_DAYS_BEFORE);
  const visible = shiftDays(next.startDate, -VISIBLE_DAYS_BEFORE);
  const today = todayIsoAr();
  const items = [
    `La fecha pasa del ${formatTournamentDayEs(saved.startDate)} al ${formatTournamentDayEs(next.startDate)}.`,
    today >= opens
      ? "Ya está dentro de los 2 días previos: la inscripción de los jugadores abre al guardar."
      : `Los jugadores la ven desde el ${formatTournamentDayEs(visible)} y se pueden anotar desde el ${formatTournamentDayEs(opens)}.`,
    "Las demás fechas del ranking no cambian.",
  ];
  return items;
}

function cupoWarnings(next: TournamentFormValues, saved: TournamentFormValues): string[] {
  if (next.maxPairs === saved.maxPairs) return [];
  return [
    `El cupo pasa de ${saved.maxPairs} a ${next.maxPairs} parejas solo en esta fecha. Las demás fechas mantienen el suyo.`,
  ];
}

/** Día en que la fecha aparece en el catálogo (T−7) y en que abre la inscripción (T−2). */
export function rankingEventCalendar(
  input: Pick<TournamentStatusInput, "startDate" | "registrationOpensAt" | "visibleFrom">,
): { visible: string; opens: string } {
  return {
    visible: input.visibleFrom ?? shiftDays(input.startDate, -VISIBLE_DAYS_BEFORE),
    opens: input.registrationOpensAt ?? shiftDays(input.startDate, -REGISTRATION_DAYS_BEFORE),
  };
}

/**
 * Una fecha de ranking nunca es un "borrador": se publica y abre sola por calendario.
 * Antes de T−7 Programada (solo la ve el club), entre T−7 y T−2 Próximamente, desde T−2 abierta.
 */
export function rankingEventStatusView(
  input: TournamentStatusInput,
  today: string = todayIsoAr(),
): TournamentStatusView {
  if (input.status === "finished") return { status: "finished", label: "Finalizada", hint: null };
  if (input.status === "cancelled") return { status: "cancelled", label: "Cancelada", hint: null };
  if (input.status !== "draft") return { status: input.status, hint: null };
  const { visible, opens } = rankingEventCalendar(input);
  if (today >= opens) return { status: "registrationOpen", hint: null };
  if (today >= visible) {
    return { status: "upcoming", hint: `Inscripción abre el ${formatWeekdayShortEs(opens)}` };
  }
  return {
    status: "scheduled",
    label: "Programada",
    hint: `Se publica el ${formatWeekdayShortEs(visible)}`,
  };
}

export function rankingEventFlow({ circuitId, weekIndex, weekCount }: RankingEventContext): TournamentFlow {
  const which = weekIndex && weekCount ? `Fecha ${weekIndex} de ${weekCount}` : "Fecha";
  return {
    kind: "rankingEvent",
    backTo: `${ROUTES.club.rankingDetail(circuitId)}?tab=fechas`,
    copy: {
      backLabel: "← Volver al ranking",
      cancelButton: "Cancelar fecha",
      cancelTitle: "Cancelar fecha",
      cancelDescription:
        "La fecha queda cancelada y no suma puntos al ranking. Las demás fechas siguen igual. Esta acción no se deshace.",
      cancelSuccess: "Fecha cancelada",
      cancelError: "No se pudo cancelar la fecha",
      configNotice: `${which} del ranking. La categoría, el formato y el tipo de partido los fija el ranking. Acá cambiás el día, el horario, el cupo, el precio, la descripción y el flyer de esta fecha.`,
    },
    form: {
      singleDay: true,
      lockCategory: true,
      lockMatchPlayType: true,
      lockFormat: true,
      minPairs: RANKING_EVENT_MIN_PAIRS,
      maxPairsHint: `Mínimo ${RANKING_EVENT_MIN_PAIRS} parejas. Hacen falta ${RANKING_EVENT_MIN_PAIRS} aceptadas para comenzar la fecha.`,
      lockedHint: "Lo fija el ranking.",
      validate: (values) =>
        values.maxPairs < RANKING_EVENT_MIN_PAIRS
          ? {
            title: "Cupo insuficiente",
            detail: `Una fecha del ranking necesita al menos ${RANKING_EVENT_MIN_PAIRS} parejas de cupo.`,
          }
          : null,
    },
    saveWarnings: (next, saved) => [...dateWarnings(next, saved), ...cupoWarnings(next, saved)],
    relatedQueries: [["club-ranking"], ["club-rankings"]],
  };
}
