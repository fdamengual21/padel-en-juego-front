import type { CourtAgendaEvent } from "@core-api";
import type { CalendarEventGridItemDto, CalendarEventStatusApi } from "./types";

function mapAgendaStatus(
  status: CourtAgendaEvent["status"],
): CalendarEventStatusApi {
  if (status === "completed" || status === "finished") return "Completed";
  if (status === "cancelled") return "Cancelled";
  return "Pending";
}

export function mapCourtAgendaEventToGridItem(
  event: CourtAgendaEvent,
): CalendarEventGridItemDto {
  return {
    id: event.id,
    type: event.kind,
    title: event.title,
    subtitle: event.subtitle,
    startAt: event.startAt,
    endAt: event.endAt,
    allDay: event.allDay,
    status: mapAgendaStatus(event.status),
  };
}
