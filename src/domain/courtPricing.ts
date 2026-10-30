import type { Court, CourtPriceRule, WeekdayIso } from "./types";

function parseHm(hm: string): number {
  const [h, m] = hm.split(":").map((part) => Number(part));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

const WEEKDAY_LABEL_ES: Record<WeekdayIso, string> = {
  1: "lunes",
  2: "martes",
  3: "miércoles",
  4: "jueves",
  5: "viernes",
  6: "sábado",
  7: "domingo",
};

/** ISO weekday: 1=lunes … 7=domingo (Date.getDay: 0=dom → 7). */
export function isoWeekdayFromDate(date: Date): WeekdayIso {
  const day = date.getDay();
  return (day === 0 ? 7 : day) as WeekdayIso;
}

export type CourtPriceRuleDraft = Pick<
  CourtPriceRule,
  "startTime" | "endTime" | "daysOfWeek" | "price"
> & {
  label?: string | null;
};

const MINUTES_PER_DAY = 24 * 60;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

function previousIsoWeekday(day: WeekdayIso): WeekdayIso {
  return (day === 1 ? 7 : day - 1) as WeekdayIso;
}

function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Franja en minutos de la semana. Si cierra al día siguiente, incluye esa madrugada. */
function expandRuleIntervals(
  startTime: string,
  endTime: string,
  daysOfWeek: readonly WeekdayIso[],
): Array<[number, number]> {
  const from = parseHm(startTime);
  const to = parseHm(endTime);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return [];

  const intervals: Array<[number, number]> = [];
  for (const day of daysOfWeek) {
    const origin = (day - 1) * MINUTES_PER_DAY;
    const start = origin + from;
    const end = origin + (to < from ? to + MINUTES_PER_DAY : to);
    if (end <= MINUTES_PER_WEEK) {
      intervals.push([start, end]);
      continue;
    }
    intervals.push([start, MINUTES_PER_WEEK]);
    intervals.push([0, end - MINUTES_PER_WEEK]);
  }
  return intervals;
}

function ruleCoversStart(
  rule: Pick<CourtPriceRuleDraft, "startTime" | "endTime" | "daysOfWeek">,
  weekday: WeekdayIso,
  startMinutes: number,
): boolean {
  const from = parseHm(rule.startTime);
  const to = parseHm(rule.endTime);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return false;
  if (from < to) {
    return (
      rule.daysOfWeek.includes(weekday) &&
      startMinutes >= from &&
      startMinutes < to
    );
  }
  const evening =
    rule.daysOfWeek.includes(weekday) && startMinutes >= from;
  const morningAfter =
    rule.daysOfWeek.includes(previousIsoWeekday(weekday)) && startMinutes < to;
  return evening || morningAfter;
}

export interface ClubJornada {
  openTime: string | null;
  closeTime: string | null;
  openDays: readonly WeekdayIso[];
}

export interface PriceRuleJornadaIssues {
  startTime?: string;
  endTime?: string;
  daysOfWeek?: string;
  price?: string;
  label?: string;
}

function jornadaHoursLabel(openTime: string, closeTime: string): string {
  const open = parseHm(openTime);
  const close = parseHm(closeTime);
  if (Number.isFinite(open) && Number.isFinite(close) && close < open) {
    return `${openTime}–${closeTime} (cierra día siguiente)`;
  }
  return `${openTime}–${closeTime}`;
}

/**
 * La franja de una tarifa, en minutos desde el mediodía de apertura.
 * Si "hasta" es menor, cruza medianoche y sigue siendo del día marcado
 * (sábado 02:00 = jornada del viernes si abre 14:00–02:00).
 */
function ruleIntervalMinutes(
  startTime: string,
  endTime: string,
): { start: number; end: number } | null {
  const start = parseHm(startTime);
  const end = parseHm(endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start === end) {
    return null;
  }
  return { start, end: end > start ? end : end + MINUTES_PER_DAY };
}

function jornadaWindowMinutes(
  openTime: string,
  closeTime: string,
): { start: number; end: number } | null {
  const open = parseHm(openTime);
  const close = parseHm(closeTime);
  if (!Number.isFinite(open) || !Number.isFinite(close) || open === close) {
    return null;
  }
  return { start: open, end: close > open ? close : close + MINUTES_PER_DAY };
}

/**
 * Marca desde/hasta/días que quedan fuera de la jornada del club.
 * La madrugada del cierre (p. ej. sábado 01:00 si cierra 02:00) es del día
 * en que abre (viernes), no del día calendario siguiente.
 */
export function inspectPriceRuleJornada(
  rule: Pick<CourtPriceRuleDraft, "startTime" | "endTime" | "daysOfWeek">,
  club: ClubJornada,
): PriceRuleJornadaIssues | null {
  const issues: PriceRuleJornadaIssues = {};
  if (!club.openTime || !club.closeTime) {
    issues.startTime = "El club no tiene horario de apertura.";
    issues.endTime = "El club no tiene horario de apertura.";
    return issues;
  }

  const closedDays = rule.daysOfWeek.filter(
    (day) => !club.openDays.includes(day),
  );
  if (rule.daysOfWeek.length > 0 && closedDays.length > 0) {
    issues.daysOfWeek = "La tarifa solo puede usar días en que abre el club.";
  }

  const window = jornadaWindowMinutes(club.openTime, club.closeTime);
  const interval = ruleIntervalMinutes(rule.startTime, rule.endTime);
  if (!window || !interval) {
    return Object.keys(issues).length > 0 ? issues : null;
  }

  const hoursLabel = jornadaHoursLabel(club.openTime, club.closeTime);
  const outOfHours = `Ese horario está fuera de la apertura del club (${hoursLabel}).`;
  if (interval.start < window.start || interval.start >= window.end) {
    issues.startTime = outOfHours;
  }
  if (interval.end <= window.start || interval.end > window.end) {
    issues.endTime = outOfHours;
  }

  return Object.keys(issues).length > 0 ? issues : null;
}

/**
 * Valida franjas de tarifa: días, horarios y que no se solapen
 * en el mismo día. Devuelve mensaje en español o `null` si OK.
 */
export function validateCourtPriceRules(
  rules: readonly CourtPriceRuleDraft[],
  club?: ClubJornada,
): string | null {
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i]!;
    if (rule.daysOfWeek.length === 0) {
      return `La tarifa ${i + 1} debe tener al menos un día`;
    }
    if (!Number.isFinite(rule.price) || rule.price < 0) {
      return `La tarifa ${i + 1} tiene un precio inválido`;
    }
    const from = parseHm(rule.startTime);
    const to = parseHm(rule.endTime);
    if (!Number.isFinite(from) || !Number.isFinite(to)) {
      return `La tarifa ${i + 1} tiene un horario inválido`;
    }
    if (from === to) {
      return `La tarifa ${i + 1}: "desde" y "hasta" no pueden coincidir`;
    }
    if (club) {
      const issues = inspectPriceRuleJornada(rule, club);
      if (issues?.daysOfWeek) {
        return `La tarifa ${i + 1}: ${issues.daysOfWeek}`;
      }
      if (issues?.startTime) {
        return `La tarifa ${i + 1}: ${issues.startTime}`;
      }
      if (issues?.endTime) {
        return `La tarifa ${i + 1}: ${issues.endTime}`;
      }
    }
  }

  const overlap = findPriceRuleOverlap(rules);
  return overlap?.message ?? null;
}

export function findPriceRuleOverlap(
  rules: readonly CourtPriceRuleDraft[],
): { left: number; right: number; message: string } | null {
  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      const a = rules[i]!;
      const b = rules[j]!;
      const sharedDays = a.daysOfWeek.filter((d) => b.daysOfWeek.includes(d));

      const aIntervals = expandRuleIntervals(
        a.startTime,
        a.endTime,
        a.daysOfWeek,
      );
      const bIntervals = expandRuleIntervals(
        b.startTime,
        b.endTime,
        b.daysOfWeek,
      );
      const overlaps = aIntervals.some(([aFrom, aTo]) =>
        bIntervals.some(([bFrom, bTo]) =>
          rangesOverlap(aFrom, aTo, bFrom, bTo),
        ),
      );
      if (!overlaps) continue;

      const days =
        sharedDays.length > 0
          ? sharedDays
          : [...new Set([...a.daysOfWeek, ...b.daysOfWeek])].sort(
              (left, right) => left - right,
            );
      const daysLabel = days.map((d) => WEEKDAY_LABEL_ES[d]).join(", ");
      return {
        left: i,
        right: j,
        message: `Las tarifas ${i + 1} y ${j + 1} se solapan el ${daysLabel} (${a.startTime}–${a.endTime} y ${b.startTime}–${b.endTime})`,
      };
    }
  }

  return null;
}

export interface DayPriceRange {
  startTime: string;
  endTime: string;
  price: number;
  label: string | null;
}

function formatClock(totalMinutes: number): string {
  const wrapped = ((totalMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = Math.floor(wrapped / 60);
  const minutes = wrapped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Tarifas del día dentro del horario del club. Los huecos sin franja
 * quedan como rangos al precio base, sin etiqueta.
 */
export function listDayPriceRanges(input: {
  openTime: string | null;
  closeTime: string | null;
  openDays: readonly WeekdayIso[];
  weekday: WeekdayIso;
  basePrice: number;
  rules: readonly CourtPriceRuleDraft[];
}): DayPriceRange[] {
  const openMin = input.openTime ? parseHm(input.openTime) : NaN;
  const closeMin = input.closeTime ? parseHm(input.closeTime) : NaN;
  if (!Number.isFinite(openMin) || !Number.isFinite(closeMin) || openMin === closeMin) {
    return [];
  }
  if (!input.openDays.includes(input.weekday)) return [];

  const windowEnd = closeMin > openMin ? closeMin : closeMin + MINUTES_PER_DAY;
  const covered: Array<{ start: number; end: number; price: number; label: string | null }> = [];

  for (const rule of input.rules) {
    if (!rule.daysOfWeek.includes(input.weekday)) continue;
    const from = parseHm(rule.startTime);
    const to = parseHm(rule.endTime);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) continue;
    let start = from;
    let end = to > from ? to : to + MINUTES_PER_DAY;
    if (end <= openMin || start >= windowEnd) continue;
    start = Math.max(start, openMin);
    end = Math.min(end, windowEnd);
    if (start >= end) continue;
    covered.push({ start, end, price: rule.price, label: rule.label ?? null });
  }

  covered.sort((left, right) => left.start - right.start || left.end - right.end);

  const ranges: Array<{ start: number; end: number; price: number; label: string | null }> = [];
  let cursor = openMin;
  for (const band of covered) {
    if (band.end <= cursor) continue;
    const start = Math.max(band.start, cursor);
    if (start > cursor) {
      ranges.push({ start: cursor, end: start, price: input.basePrice, label: null });
    }
    ranges.push({ start, end: band.end, price: band.price, label: band.label });
    cursor = band.end;
  }
  if (cursor < windowEnd) {
    ranges.push({ start: cursor, end: windowEnd, price: input.basePrice, label: null });
  }

  return ranges.map((range) => ({
    startTime: formatClock(range.start),
    endTime: formatClock(range.end),
    price: range.price,
    label: range.label,
  }));
}

/**
 * Precio del turno según día y hora de inicio.
 * 1) Si una franja cubre el inicio → esa tarifa.
 * 2) Si ese día tiene una sola tarifa y el horario no entra en su rango →
 *    se usa esa tarifa (cubre el resto del día).
 * 3) Si no → precio base de la cancha.
 * Los solapes se rechazan al guardar; acá no hay “prioridad”.
 */
export function resolvePriceForSlot(
  court: Pick<Court, "basePrice">,
  rules: readonly CourtPriceRule[],
  startsAt: Date | string,
): { price: number; label: string | null; rule: CourtPriceRule | null } {
  const start = typeof startsAt === "string" ? new Date(startsAt) : startsAt;
  if (Number.isNaN(start.getTime())) {
    return { price: court.basePrice, label: null, rule: null };
  }

  const weekday = isoWeekdayFromDate(start);
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const dayRules = rules.filter((rule) => rule.daysOfWeek.includes(weekday));

  const matching = rules.filter((rule) =>
    ruleCoversStart(rule, weekday, startMinutes),
  );

  if (matching.length >= 1) {
    const chosen =
      matching.length === 1
        ? matching[0]!
        : [...matching].sort((a, b) =>
            a.startTime.localeCompare(b.startTime),
          )[0]!;
    return { price: chosen.price, label: chosen.label, rule: chosen };
  }

  if (dayRules.length === 1) {
    const only = dayRules[0]!;
    return { price: only.price, label: only.label, rule: only };
  }

  return { price: court.basePrice, label: null, rule: null };
}
