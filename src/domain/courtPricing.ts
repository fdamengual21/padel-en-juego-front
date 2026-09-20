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

function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Valida franjas de tarifa: días, horarios y que no se solapen
 * en el mismo día. Devuelve mensaje en español o `null` si OK.
 */
export function validateCourtPriceRules(
  rules: readonly CourtPriceRuleDraft[],
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
    if (from >= to) {
      return `La tarifa ${i + 1}: "desde" debe ser anterior a "hasta"`;
    }
  }

  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      const a = rules[i]!;
      const b = rules[j]!;
      const sharedDays = a.daysOfWeek.filter((d) => b.daysOfWeek.includes(d));
      if (sharedDays.length === 0) continue;

      const aFrom = parseHm(a.startTime);
      const aTo = parseHm(a.endTime);
      const bFrom = parseHm(b.startTime);
      const bTo = parseHm(b.endTime);
      if (!rangesOverlap(aFrom, aTo, bFrom, bTo)) continue;

      const daysLabel = sharedDays.map((d) => WEEKDAY_LABEL_ES[d]).join(", ");
      return `Las tarifas ${i + 1} y ${j + 1} se solapan el ${daysLabel} (${a.startTime}–${a.endTime} y ${b.startTime}–${b.endTime})`;
    }
  }

  return null;
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

  const matching = dayRules.filter((rule) => {
    const from = parseHm(rule.startTime);
    const to = parseHm(rule.endTime);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return false;
    return startMinutes >= from && startMinutes < to;
  });

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
