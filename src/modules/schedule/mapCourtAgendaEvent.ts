import type { CourtAgendaEvent } from "@/domain";
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
  options?: { courtName?: string | null },
): CalendarEventGridItemDto {
  const courtName = options?.courtName?.trim() || null;
  const baseSubtitle = event.subtitle?.trim() || null;
  const subtitle = [courtName, baseSubtitle].filter(Boolean).join(" · ") || null;

  return {
    id: event.id,
    type: event.kind,
    title: event.title,
    subtitle,
    startAt: event.startAt,
    endAt: event.endAt,
    allDay: event.allDay,
    status: mapAgendaStatus(event.status),
  };
}
