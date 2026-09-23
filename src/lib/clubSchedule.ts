import type { WeekdayIso } from "@/domain";

const WEEKDAY_LABELS: Record<WeekdayIso, string> = {
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
  7: "Dom",
};

const WEEKDAY_FULL: Record<WeekdayIso, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};

export function weekdayShortLabel(day: WeekdayIso): string {
  return WEEKDAY_LABELS[day];
}

export function weekdayFullLabel(day: WeekdayIso): string {
  return WEEKDAY_FULL[day];
}

/** Ej. "De Lun a Vie" o "Lun, Mié, Vie". */
export function formatOpenDaysEs(openDays: readonly WeekdayIso[]): string {
  const days = [...new Set(openDays)].sort((a, b) => a - b) as WeekdayIso[];
  if (days.length === 7) return "Todos los días";
  if (days.length === 0) return "Sin días";

  const ranges: Array<[WeekdayIso, WeekdayIso]> = [];
  let start = days[0]!;
  let end = days[0]!;
  for (let i = 1; i < days.length; i++) {
    const day = days[i]!;
    if (day === end + 1) {
      end = day;
      continue;
    }
    ranges.push([start, end]);
    start = day;
    end = day;
  }
  ranges.push([start, end]);

  return ranges
    .map(([from, to]) =>
      from === to
        ? weekdayShortLabel(from)
        : `De ${weekdayShortLabel(from)} a ${weekdayShortLabel(to)}`,
    )
    .join(", ");
}

/** Minutos desde medianoche, o null si el texto no es HH:mm. */
export function parseClockMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** El cierre cae el día calendario siguiente al día en que arranca la jornada. */
export function clubClosesNextDay(openTime: string, closeTime: string): boolean {
  const openMin = parseClockMinutes(openTime);
  const closeMin = parseClockMinutes(closeTime);
  if (openMin == null || closeMin == null) return false;
  return closeMin < openMin;
}

/** Ej. "08:00–23:00" o "09:00–02:00 (cierra día siguiente)". */
export function formatClubHoursEs(openTime: string, closeTime: string): string {
  return clubClosesNextDay(openTime, closeTime)
    ? `${openTime}–${closeTime} (cierra día siguiente)`
    : `${openTime}–${closeTime}`;
}

/** Ej. "De Lun a Sáb · 08:00–23:00" o "Todos los días · 09:00–02:00 (cierra día siguiente)". */
export function formatClubScheduleEs(
  openTime: string,
  closeTime: string,
  openDays: readonly WeekdayIso[],
): string {
  return `${formatOpenDaysEs(openDays)} · ${formatClubHoursEs(openTime, closeTime)}`;
}
