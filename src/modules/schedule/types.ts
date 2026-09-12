export type CalendarEventStatusApi = "Pending" | "Completed" | "Cancelled";

export interface CalendarEventGridItemDto {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  status: CalendarEventStatusApi;
}

export function calendarEventDurationMinutes(
  startAt: string,
  endAt: string,
): number {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.round((end - start) / 60_000);
}

export function calendarEventTypeLabelEs(type: string): string {
  if (type === "reservation") return "Reserva";
  if (type === "tournament_match") return "Partido";
  return type;
}
