import dayjs from "dayjs";
import "dayjs/locale/es";
import type { CourtFixedReservation } from "@/modules/reservations";

const FULL_WEEKDAYS = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const SHORT_WEEKDAYS = ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export const UPCOMING_DAYS = 14;

export function weeklyCountLabel(count: number): string {
  return count === 1 ? "1 turno fijo por semana" : `${count} turnos fijos por semana`;
}

export function weeklyLine(series: CourtFixedReservation): string {
  const day = FULL_WEEKDAYS[series.weekday] ?? "día";
  return `Todos los ${day} · ${series.startTime}–${series.endTime} · ${series.courtName}`;
}

export function shortSlot(series: CourtFixedReservation): string {
  const day = SHORT_WEEKDAYS[series.weekday] ?? "Día";
  return `${day} ${series.startTime}`;
}

export interface FixedOccurrence {
  series: CourtFixedReservation;
  date: string;
  courtName: string;
  whenLabel: string;
  cancelled: boolean;
  note: string | null;
}

export function upcomingOccurrences(
  series: CourtFixedReservation[],
  withinDays = UPCOMING_DAYS,
): FixedOccurrence[] {
  const today = dayjs().startOf("day");
  const last = today.add(withinDays, "day");
  const now = dayjs();
  const occurrences: FixedOccurrence[] = [];

  for (const item of series) {
    const startsOn = dayjs(item.startsOn).startOf("day");
    const skipped = new Map(item.skippedDays.map((skip) => [skip.date, skip.note]));
    const [hour, minute] = item.startTime.split(":").map((part) => Number(part));
    let cursor = today;
    while (!cursor.isAfter(last, "day")) {
      const iso = cursor.day() === 0 ? 7 : cursor.day();
      const date = cursor.format("YYYY-MM-DD");
      const startsAt = dayjs(cursor).hour(hour || 0).minute(minute || 0);
      if (iso === item.weekday && !cursor.isBefore(startsOn, "day") && startsAt.isAfter(now)) {
        const formatted = cursor.locale("es").format("dddd D [de] MMMM");
        const heading = formatted.charAt(0).toUpperCase() + formatted.slice(1);
        occurrences.push({
          series: item,
          date,
          courtName: item.courtName,
          whenLabel: `${heading} · ${item.startTime}–${item.endTime}`,
          cancelled: skipped.has(date),
          note: skipped.get(date) ?? null,
        });
      }
      cursor = cursor.add(1, "day");
    }
  }

  return occurrences.sort(
    (left, right) => left.date.localeCompare(right.date) || left.whenLabel.localeCompare(right.whenLabel),
  );
}
