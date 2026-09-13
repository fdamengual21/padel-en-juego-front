import type { Club, WeekdayIso } from "../types";

function parseHm(hm: string): { hour: number; minute: number } {
  const [h, m] = hm.split(":").map((part) => Number(part));
  return {
    hour: Number.isFinite(h) ? h : 0,
    minute: Number.isFinite(m) ? m : 0,
  };
}

function hmToMinutes(hm: string): number {
  const { hour, minute } = parseHm(hm);
  return hour * 60 + minute;
}

/**
 * Cierre ≤ apertura (p. ej. 08:00–00:00) = horario que cruza medianoche
 * (el cierre cuenta como día siguiente).
 */
export function isOvernightHours(openTime: string, closeTime: string): boolean {
  return hmToMinutes(closeTime) < hmToMinutes(openTime);
}

/** Misma hora de apertura y cierre = ventana vacía. */
export function isZeroLengthHours(openTime: string, closeTime: string): boolean {
  return hmToMinutes(openTime) === hmToMinutes(closeTime);
}

/**
 * Horario de apertura/cierre del club (único para todas las canchas).
 */
export function resolveClubHours(
  club: Pick<Club, "openTime" | "closeTime">,
): { openTime: string; closeTime: string } {
  return {
    openTime: club.openTime,
    closeTime: club.closeTime,
  };
}

/** @deprecated Use resolveClubHours — el horario es solo del club. */
export function resolveCourtHours(
  _court: unknown,
  club: Pick<Club, "openTime" | "closeTime">,
): { openTime: string; closeTime: string } {
  return resolveClubHours(club);
}

/** ISO weekday 1=lunes … 7=domingo a partir de YYYY-MM-DD (mediodía local). */
export function weekdayIsoFromDateIso(dateIso: string): WeekdayIso {
  const day = new Date(`${dateIso}T12:00:00`).getDay();
  return (day === 0 ? 7 : day) as WeekdayIso;
}

export function localDateIsoFromInstant(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isClubOpenOnDate(
  club: Pick<Club, "openDays">,
  dateIso: string,
): boolean {
  const days =
    Array.isArray(club.openDays) && club.openDays.length > 0
      ? club.openDays
      : ([1, 2, 3, 4, 5, 6, 7] as WeekdayIso[]);
  return days.includes(weekdayIsoFromDateIso(dateIso));
}

/**
 * ¿El club está dentro del horario de apertura en el instante `at`?
 * Contempla cierre overnight (p. ej. 08:00–00:00).
 * El horario es único del club (no por cancha).
 */
export function isCourtOpenAt(
  club: Pick<Club, "openTime" | "closeTime" | "openDays">,
  _court: unknown = null,
  at: Date = new Date(),
): boolean {
  if (Number.isNaN(at.getTime())) return false;
  const { openTime, closeTime } = resolveClubHours(club);
  const openMin = hmToMinutes(openTime);
  const closeMin = hmToMinutes(closeTime);
  if (openMin === closeMin) return false;

  const nowMin = at.getHours() * 60 + at.getMinutes();
  const todayIso = localDateIsoFromInstant(at.toISOString());

  if (closeMin < openMin) {
    // Overnight: [open → 24h) ∪ [0 → close)
    if (nowMin >= openMin) {
      return isClubOpenOnDate(club, todayIso);
    }
    if (nowMin < closeMin) {
      const yesterday = new Date(at);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayIso = localDateIsoFromInstant(yesterday.toISOString());
      return isClubOpenOnDate(club, yesterdayIso);
    }
    return false;
  }

  if (!isClubOpenOnDate(club, todayIso)) return false;
  return nowMin >= openMin && nowMin < closeMin;
}

export interface CourtDaySlot {
  startsAt: string;
  endsAt: string;
}

/**
 * Genera turnos del día local `dateIso` (YYYY-MM-DD) entre open/close
 * con duración `slotDurationMinutes`. El último turno debe terminar ≤ close.
 * Si close ≤ open (p. ej. cierre 00:00), el cierre es al día siguiente.
 */
export function generateDaySlots(
  dateIso: string,
  openTime: string,
  closeTime: string,
  slotDurationMinutes: number,
): CourtDaySlot[] {
  const duration = Math.max(15, slotDurationMinutes);
  const open = parseHm(openTime);
  const close = parseHm(closeTime);
  const dayStart = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(dayStart.getTime())) return [];

  const openMs =
    dayStart.getTime() + (open.hour * 60 + open.minute) * 60_000;
  let closeMs =
    dayStart.getTime() + (close.hour * 60 + close.minute) * 60_000;
  // 00:00 u horario overnight: cierre al día siguiente.
  if (closeMs <= openMs) {
    closeMs += 24 * 60 * 60_000;
  }
  const durationMs = duration * 60_000;

  const slots: CourtDaySlot[] = [];
  for (let cursor = openMs; cursor + durationMs <= closeMs; cursor += durationMs) {
    slots.push({
      startsAt: new Date(cursor).toISOString(),
      endsAt: new Date(cursor + durationMs).toISOString(),
    });
  }
  return slots;
}

/** True if `startsAt` is exactly one of the fixed turns from open→close. */
export function isAlignedCourtSlotStart(
  dateIso: string,
  openTime: string,
  closeTime: string,
  slotDurationMinutes: number,
  startsAt: string,
): boolean {
  const target = new Date(startsAt).getTime();
  if (Number.isNaN(target)) return false;
  return generateDaySlots(
    dateIso,
    openTime,
    closeTime,
    slotDurationMinutes,
  ).some((slot) => new Date(slot.startsAt).getTime() === target);
}

/** Nearest generated slot start to `targetIso` (by absolute ms distance). */
export function nearestCourtSlotStart(
  slots: readonly CourtDaySlot[],
  targetIso: string,
): string | null {
  const target = new Date(targetIso).getTime();
  if (Number.isNaN(target) || slots.length === 0) return null;
  let best: CourtDaySlot | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const slot of slots) {
    const dist = Math.abs(new Date(slot.startsAt).getTime() - target);
    if (dist < bestDist) {
      bestDist = dist;
      best = slot;
    }
  }
  return best?.startsAt ?? null;
}

export function intervalsOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  const a0 = new Date(aStart).getTime();
  const a1 = new Date(aEnd).getTime();
  const b0 = new Date(bStart).getTime();
  const b1 = new Date(bEnd).getTime();
  if ([a0, a1, b0, b1].some((t) => Number.isNaN(t))) return false;
  return a0 < b1 && b0 < a1;
}
