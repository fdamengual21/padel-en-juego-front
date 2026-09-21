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

/** Ej. "De Lun a Sáb · 08:00–23:00" o "Todos los días · 08:00–00:00" */
export function formatClubScheduleEs(
  openTime: string,
  closeTime: string,
  openDays: readonly WeekdayIso[],
): string {
  const [oH, oM] = openTime.split(":").map(Number);
  const [cH, cM] = closeTime.split(":").map(Number);
  const openMin = (oH || 0) * 60 + (oM || 0);
  const closeMin = (cH || 0) * 60 + (cM || 0);
  const hours =
    closeMin <= openMin
      ? `${openTime}–${closeTime} (cierra día siguiente)`
      : `${openTime}–${closeTime}`;
  return `${formatOpenDaysEs(openDays)} · ${hours}`;
}
