import type { CourtAvailableSlot, WeekdayIso } from "@/domain";
import { isoWeekdayFromDate } from "@/domain";
import { parseClockMinutes } from "@/lib/clubSchedule";

export type ClubOpenStatus = "open" | "closed";

export interface ClubOpenStatusInput {
  openTime: string | null;
  closeTime: string | null;
  openDays: readonly WeekdayIso[];
  /** Instante a evaluar. */
  at: Date;
}

function previousWeekday(day: WeekdayIso): WeekdayIso {
  return (day === 1 ? 7 : day - 1) as WeekdayIso;
}

function clockLabel(totalMinutes: number): string {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(wrapped / 60);
  const minutes = wrapped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Abierto o cerrado según horario persistido del club y el instante dado.
 * Si el cierre es anterior a la apertura, la madrugada pertenece al día anterior.
 */
export function resolveClubOpenStatus(input: ClubOpenStatusInput): ClubOpenStatus {
  const openMin = input.openTime ? parseClockMinutes(input.openTime) : null;
  const closeMin = input.closeTime ? parseClockMinutes(input.closeTime) : null;
  if (openMin == null || closeMin == null || input.openDays.length === 0) {
    return "closed";
  }

  const weekday = isoWeekdayFromDate(input.at);
  const nowMin = input.at.getHours() * 60 + input.at.getMinutes();

  if (closeMin > openMin) {
    const inside = nowMin >= openMin && nowMin < closeMin;
    return input.openDays.includes(weekday) && inside ? "open" : "closed";
  }

  if (closeMin === openMin) return "closed";

  const evening = input.openDays.includes(weekday) && nowMin >= openMin;
  const morning =
    input.openDays.includes(previousWeekday(weekday)) && nowMin < closeMin;
  return evening || morning ? "open" : "closed";
}

/** El día calendario tiene jornada si a la hora de apertura el club está abierto. */
export function isClubOperatingOnDate(
  input: Omit<ClubOpenStatusInput, "at"> & { date: string },
): boolean {
  if (!input.openTime) return false;
  const at = new Date(`${input.date}T${input.openTime}:00`);
  if (Number.isNaN(at.getTime())) return false;
  return resolveClubOpenStatus({ ...input, at }) === "open";
}

/** Turnos del día a partir de apertura, cierre y duración. Vacío si ese día no opera. */
export function listOperatingSlots(
  input: Omit<ClubOpenStatusInput, "at"> & {
    date: string;
    slotDurationMinutes: number;
  },
): CourtAvailableSlot[] {
  if (!isClubOperatingOnDate(input)) return [];
  const openMin = parseClockMinutes(input.openTime ?? "");
  const closeMin = parseClockMinutes(input.closeTime ?? "");
  const duration = input.slotDurationMinutes;
  if (openMin == null || closeMin == null || duration <= 0) return [];

  const endMin = closeMin > openMin ? closeMin : closeMin + 1440;
  const slots: CourtAvailableSlot[] = [];
  for (let start = openMin; start + duration <= endMin; start += duration) {
    const end = start + duration;
    const startsAt = new Date(`${input.date}T00:00:00`);
    startsAt.setMinutes(start);
    const endsAt = new Date(`${input.date}T00:00:00`);
    endsAt.setMinutes(end);
    if (endsAt.getTime() <= Date.now()) continue;
    slots.push({
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      label: `${clockLabel(start)} – ${clockLabel(end)}`,
    });
  }
  return slots;
}
