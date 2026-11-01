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

function isClosedEvent(event: ClubRankingEvent): boolean {
  return event.status === "finished" || event.status === "cancelled";
}

/** Primera fecha que todavía no terminó ni se canceló. */
export function nextRankingEvent(events: ClubRankingEvent[] | undefined): ClubRankingEvent | null {
  return (
    (events ?? [])
      .slice()
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .find((item) => !isClosedEvent(item)) ?? null
  );
}

/** True si al cerrar esa fecha no queda ninguna otra pendiente: el ranking se cierra con ella. */
export function isLastPendingRankingEvent(events: ClubRankingEvent[] | undefined, eventId: string): boolean {
  if (!events?.some((item) => item.id === eventId)) return false;
  return events.filter((item) => item.id !== eventId).every(isClosedEvent);
}

/** "Campeón: Ana Pérez" o "Campeones: Ana Pérez y Juan Gómez". */
export function rankingChampionsLabel(names: string[]): string {
  if (names.length === 0) return "";
  const list =
    names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
  return `${names.length === 1 ? "Campeón" : "Campeones"}: ${list}`;
}
