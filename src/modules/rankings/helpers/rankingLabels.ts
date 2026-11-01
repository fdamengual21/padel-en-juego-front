import type { ClubRankingCircuit, ClubRankingEvent } from "../types";

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** Día de la semana del ranking en minúscula: "jueves". */
export function rankingWeekdayLabel(weekday: number): string {
  return WEEKDAYS[weekday] ?? "";
}

/** "jueves 19:00" o "jueves" si no hay horario. */
export function rankingScheduleLabel(circuit: Pick<ClubRankingCircuit, "weekday" | "dailyStartTime">): string {
  const day = rankingWeekdayLabel(circuit.weekday);
  const time = circuit.dailyStartTime?.slice(0, 5);
  return time ? `${day} ${time}` : day;
}

/** Primera fecha que todavía no terminó ni se canceló. */
export function nextRankingEvent(events: ClubRankingEvent[] | undefined): ClubRankingEvent | null {
  return (
    (events ?? [])
      .slice()
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .find((item) => item.status !== "finished" && item.status !== "cancelled") ?? null
  );
}
