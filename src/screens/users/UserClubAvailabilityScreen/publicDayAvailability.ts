import dayjs, { type Dayjs } from "dayjs";
import { isoWeekdayFromDate } from "@/domain";
import { formatArs } from "@/lib/money";
import type { PublicClubSlot } from "@/modules/clubs";
import {
  agendaJornadaColumnDay,
  type AgendaJornadaSchedule,
  type CalendarEventGridItemDto,
} from "@/modules/schedule";

export interface PublicDaySummary {
  dateKey: string;
  label: string;
  tone: "available" | "unavailable";
  freeSlots: PublicClubSlot[];
}

export function slotEventId(slot: PublicClubSlot): string {
  return `${slot.courtId}|${slot.startsAt}`;
}

/** Un resumen por día de apertura. Los días cerrados del predio no entran. */
export function summarizeOpenDays(
  days: readonly Dayjs[],
  slots: readonly PublicClubSlot[],
  openDays: readonly number[],
  jornada: AgendaJornadaSchedule | undefined,
  now = dayjs(),
): PublicDaySummary[] {
  const byDay = new Map<string, PublicClubSlot[]>();
  for (const slot of slots) {
    const column = agendaJornadaColumnDay(dayjs(slot.startsAt), jornada).format("YYYY-MM-DD");
    const list = byDay.get(column);
    if (list) list.push(slot);
    else byDay.set(column, [slot]);
  }

  const summaries: PublicDaySummary[] = [];
  for (const day of days) {
    if (!openDays.includes(isoWeekdayFromDate(day.toDate()))) continue;
    const dateKey = day.format("YYYY-MM-DD");
    const daySlots = byDay.get(dateKey) ?? [];
    const freeSlots = daySlots
      .filter((slot) => slot.status === "free" && dayjs(slot.endsAt).isAfter(now))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.courtName.localeCompare(b.courtName, "es"));
    const stillOpen = daySlots.some((slot) => dayjs(slot.endsAt).isAfter(now));
    if (stillOpen && freeSlots.length > 0) {
      const count = freeSlots.length;
      summaries.push({
        dateKey,
        label: count === 1 ? "1 turno libre" : `${count} turnos libres`,
        tone: "available",
        freeSlots,
      });
      continue;
    }
    summaries.push({
      dateKey,
      label: "Sin turnos",
      tone: "unavailable",
      freeSlots: [],
    });
  }
  return summaries;
}

export function toDaySummaryEvent(summary: PublicDaySummary): CalendarEventGridItemDto {
  const start = dayjs(summary.dateKey).hour(12);
  return {
    id: `day|${summary.dateKey}`,
    type: "availability",
    title: summary.label,
    subtitle: null,
    startAt: start.toISOString(),
    endAt: start.add(1, "hour").toISOString(),
    allDay: true,
    status: summary.tone === "available" ? "Booked" : "Cancelled",
  };
}

/** Bloque de la grilla horaria: hora del turno, cancha y tarifa. Sin persona. */
export function toFreeSlotBlock(slot: PublicClubSlot): CalendarEventGridItemDto {
  return {
    id: slotEventId(slot),
    type: "availability",
    title: slot.courtName,
    subtitle: formatArs(slot.price),
    startAt: slot.startsAt,
    endAt: slot.endsAt,
    allDay: false,
    status: "Booked",
  };
}

/** Fila del listado del día: horario, cancha y tarifa. */
export function toFreeSlotListItem(slot: PublicClubSlot): CalendarEventGridItemDto {
  return {
    id: slotEventId(slot),
    type: "availability",
    title: slot.label,
    subtitle: `${slot.courtName} · ${formatArs(slot.price)}`,
    startAt: slot.startsAt,
    endAt: slot.endsAt,
    allDay: false,
    status: "Booked",
  };
}
