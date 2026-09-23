import dayjs, { type Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import "dayjs/locale/es";
import type { CalendarEventGridItemDto, CalendarEventStatusApi } from "./types";

dayjs.extend(isoWeek);
dayjs.locale("es");

export type CalendarAgendaViewMode = "week" | "day" | "month";

export const CALENDAR_AGENDA_WEEK_DAYS = 7;
export const CALENDAR_AGENDA_HOUR_SLOT_PX = 120;
export const CALENDAR_AGENDA_PX_PER_MINUTE = 2;
export const CALENDAR_AGENDA_DEFAULT_START_HOUR = 8;
export const CALENDAR_AGENDA_DEFAULT_END_HOUR = 20;
/** Chips de evento visibles por celda en vista mes (el overflow ocupa un slot extra si hace falta). */
export const CALENDAR_AGENDA_MONTH_MAX_VISIBLE_CHIPS = 3;
/** En viewports chicos: menos chips para dejar aire al número del día. */
export const CALENDAR_AGENDA_MONTH_MAX_VISIBLE_CHIPS_MOBILE = 2;

export interface CalendarAgendaRange {
  from: string;
  to: string;
}

/** Horario del club para ubicar la madrugada en el día en que arranca la jornada. */
export interface AgendaJornadaSchedule {
  openMinutes: number;
  closeMinutes: number;
  openDays: readonly number[];
}

export interface CalendarAgendaHours {
  startHour: number;
  modules: number;
}

export interface CalendarAgendaEventLayout {
  top: number;
  height: number;
}

export type CalendarAgendaEventDensity = "compact" | "normal" | "large";

export interface CalendarAgendaPlacedEvent {
  event: CalendarEventGridItemDto;
  top: number;
  height: number;
  columnIndex: number;
  columnCount: number;
}

export interface CalendarAgendaEventGroup {
  id: string;
  events: CalendarEventGridItemDto[];
  top: number;
  height: number;
}

export type CalendarAgendaDayItem =
  | { kind: "event"; placement: CalendarAgendaPlacedEvent }
  | { kind: "group"; group: CalendarAgendaEventGroup };

export type CalendarAgendaStatusTone = "primary" | "success" | "error";

/**
 * Tono de paleta del bloque de agenda según estado operativo.
 * Pending (u otro valor) → primary; Completed → success; Cancelled → error.
 */
export function calendarAgendaEventStatusTone(
  status: CalendarEventStatusApi,
): CalendarAgendaStatusTone {
  if (status === "Completed") {
    return "success";
  }
  if (status === "Cancelled") {
    return "error";
  }
  return "primary";
}

/**
 * Tono del chip de grupo: el del estado compartido si todos coinciden; si no, primary.
 * Lista vacía → primary.
 */
export function calendarAgendaGroupStatusTone(
  events: readonly Pick<CalendarEventGridItemDto, "status">[],
): CalendarAgendaStatusTone {
  const first = events[0]?.status;
  if (!first) {
    return "primary";
  }
  const allSame = events.every((event) => event.status === first);
  return allSame ? calendarAgendaEventStatusTone(first) : "primary";
}

export const CALENDAR_AGENDA_COMPACT_MAX_HEIGHT = 40;
export const CALENDAR_AGENDA_NORMAL_MAX_HEIGHT = 90;

/**
 * Lunes de la semana ISO de `date` (inicio de día local).
 */
export function startOfAgendaWeek(date: Dayjs): Dayjs {
  return date.startOf("isoWeek");
}

/**
 * Lunes ISO de la semana que contiene el día 1 del mes de `date`.
 */
export function startOfAgendaMonthGrid(date: Dayjs): Dayjs {
  return startOfAgendaWeek(date.startOf("month"));
}

/**
 * Días de la grilla mes (lun–dom), desde el lunes de la semana del 1 hasta el
 * domingo de la semana del último día del mes. Suele ser 28–42 días.
 */
export function buildAgendaMonthGridDays(date: Dayjs): Dayjs[] {
  const start = startOfAgendaMonthGrid(date).startOf("day");
  const end = startOfAgendaWeek(date.endOf("month")).add(6, "day").startOf("day");
  const days: Dayjs[] = [];
  let cursor = start;
  while (cursor.isBefore(end) || cursor.isSame(end, "day")) {
    days.push(cursor);
    cursor = cursor.add(1, "day");
  }
  return days;
}

/**
 * Rango `from`/`to` (ISO) para el listado de agenda.
 * Semana: lunes 00:00 → lunes siguiente 00:00. Día: inicio → fin de ese día.
 * Mes: primer día de la grilla 00:00 → día siguiente al último de la grilla 00:00.
 */
export function rangeForAgendaView(
  mode: CalendarAgendaViewMode,
  date: Dayjs,
  options?: { tailMinutes?: number },
): CalendarAgendaRange {
  const tailMinutes = options?.tailMinutes ?? 0;
  if (mode === "day") {
    const start = date.startOf("day");
    const end = tailMinutes > 0 ? start.add(1, "day").add(tailMinutes, "minute") : start.endOf("day");
    return {
      from: start.toISOString(),
      to: end.toISOString(),
    };
  }
  if (mode === "month") {
    const days = buildAgendaMonthGridDays(date);
    const first = days[0] ?? date.startOf("month");
    const last = days[days.length - 1] ?? date.endOf("month");
    const end = last.add(1, "day").startOf("day");
    return {
      from: first.startOf("day").toISOString(),
      to: (tailMinutes > 0 ? end.add(tailMinutes, "minute") : end).toISOString(),
    };
  }
  const weekStart = startOfAgendaWeek(date);
  const end = weekStart.add(CALENDAR_AGENDA_WEEK_DAYS, "day").startOf("day");
  return {
    from: weekStart.startOf("day").toISOString(),
    to: (tailMinutes > 0 ? end.add(tailMinutes, "minute") : end).toISOString(),
  };
}

/**
 * Día de columna de un evento. Si cae en la madrugada previa al cierre,
 * pertenece a la jornada que arrancó el día anterior.
 */
export function agendaJornadaColumnDay(
  startAt: Dayjs,
  schedule?: AgendaJornadaSchedule,
): Dayjs {
  const day = startAt.startOf("day");
  if (!schedule || schedule.closeMinutes >= schedule.openMinutes) {
    return day;
  }
  const minutes = startAt.hour() * 60 + startAt.minute();
  if (minutes >= schedule.closeMinutes) {
    return day;
  }
  const previous = day.subtract(1, "day");
  if (schedule.openDays.includes(previous.isoWeekday())) {
    return previous;
  }
  return day;
}

/**
 * Agrupa eventos en 7 columnas lun–dom a partir del lunes de `weekStart`.
 * Un evento cae en el día de su `startAt` local.
 */
export function groupEventsByWeekDays(
  events: readonly CalendarEventGridItemDto[],
  weekStart: Dayjs,
  schedule?: AgendaJornadaSchedule,
): CalendarEventGridItemDto[][] {
  const start = startOfAgendaWeek(weekStart).startOf("day");
  const buckets: CalendarEventGridItemDto[][] = Array.from(
    { length: CALENDAR_AGENDA_WEEK_DAYS },
    () => [],
  );

  for (const event of events) {
    const eventDay = dayjs(event.startAt);
    if (!eventDay.isValid()) {
      continue;
    }
    const index = agendaJornadaColumnDay(eventDay, schedule)
      .startOf("day")
      .diff(start, "day");
    if (index >= 0 && index < CALENDAR_AGENDA_WEEK_DAYS) {
      buckets[index].push(event);
    }
  }

  return buckets;
}

/**
 * Horas visibles: default 8–20, o el rango que cubran los eventos (hora inicio/fin).
 */
export function resolveAgendaHours(
  events: readonly CalendarEventGridItemDto[],
  options?: { openHour?: number; closeHour?: number },
): CalendarAgendaHours {
  const openHour = options?.openHour ?? CALENDAR_AGENDA_DEFAULT_START_HOUR;
  const requestedEnd = options?.closeHour ?? CALENDAR_AGENDA_DEFAULT_END_HOUR;
  const closesNextDay = requestedEnd > 24;
  let minHour = openHour;
  let maxHour = requestedEnd;
  const hourCap = Math.min(48, Math.max(24, requestedEnd));

  for (const event of events) {
    if (event.allDay) {
      continue;
    }
    const start = dayjs(event.startAt);
    const end = dayjs(event.endAt);
    if (!start.isValid()) {
      continue;
    }
    if (!closesNextDay || start.hour() >= openHour) {
      minHour = Math.min(minHour, start.hour());
    }
    const endHour = end.isValid()
      ? Math.max(end.hour() + (end.minute() > 0 ? 1 : 0), start.hour() + 1)
      : start.hour() + 1;
    maxHour = Math.max(maxHour, endHour);
  }

  minHour = Math.max(0, minHour);
  maxHour = Math.min(hourCap, Math.max(maxHour, minHour + 1));
  return { startHour: minHour, modules: maxHour - minHour };
}

/**
 * Posición absoluta del bloque: 2px por minuto desde `startHour` (120px/hora).
 * All-day: barra de 28px al tope. Duración mínima visual 24px.
 */
export function layoutAgendaEventBlock(
  event: CalendarEventGridItemDto,
  startHour: number,
  columnDay?: Dayjs,
): CalendarAgendaEventLayout {
  if (event.allDay) {
    return { top: 0, height: 28 };
  }
  const start = dayjs(event.startAt);
  const end = dayjs(event.endAt);
  const dayStart = (columnDay ?? start)
    .hour(startHour)
    .minute(0)
    .second(0)
    .millisecond(0);
  const top = Math.max(0, start.diff(dayStart, "minute") * CALENDAR_AGENDA_PX_PER_MINUTE);
  const durationMinutes = end.isValid()
    ? Math.max(end.diff(start, "minute"), 15)
    : 30;
  const height = Math.max(durationMinutes * CALENDAR_AGENDA_PX_PER_MINUTE - 2, 24);
  return { top, height };
}

/**
 * Densidad visual del chip según altura en px.
 * Menos de 40: compacto. Menos de 90: normal. Resto: grande. No achica tipografía.
 */
export function resolveAgendaEventDensity(height: number): CalendarAgendaEventDensity {
  if (height < CALENDAR_AGENDA_COMPACT_MAX_HEIGHT) {
    return "compact";
  }
  if (height < CALENDAR_AGENDA_NORMAL_MAX_HEIGHT) {
    return "normal";
  }
  return "large";
}

function visualIntervalsOverlap(
  a: CalendarAgendaEventLayout,
  b: CalendarAgendaEventLayout,
): boolean {
  return a.top < b.top + b.height && b.top < a.top + a.height;
}

/**
 * Coloca eventos del mismo día en columnas si se solapan visualmente.
 * Un cluster comparte `columnCount`; cada evento recibe `columnIndex` 0..n-1.
 * Eventos que solo se tocan en el borde no se consideran solapados.
 */
export function placeAgendaDayEvents(
  events: readonly CalendarEventGridItemDto[],
  startHour: number,
  columnDay?: Dayjs,
): CalendarAgendaPlacedEvent[] {
  const positioned = events.map((event) => ({
    event,
    ...layoutAgendaEventBlock(event, startHour, columnDay),
  }));

  const sorted = [...positioned].sort((a, b) => {
    if (a.top !== b.top) {
      return a.top - b.top;
    }
    return b.height - a.height;
  });

  const placed: CalendarAgendaPlacedEvent[] = [];
  let cluster: typeof sorted = [];
  let clusterEnd = -1;

  const flushCluster = () => {
    if (cluster.length === 0) {
      return;
    }

    const columnEnds: number[] = [];
    const assignments: number[] = [];

    for (const item of cluster) {
      let columnIndex = columnEnds.findIndex((end) => end <= item.top);
      if (columnIndex < 0) {
        columnIndex = columnEnds.length;
        columnEnds.push(item.top + item.height);
      } else {
        columnEnds[columnIndex] = item.top + item.height;
      }
      assignments.push(columnIndex);
    }

    const columnCount = Math.max(columnEnds.length, 1);
    cluster.forEach((item, index) => {
      placed.push({
        event: item.event,
        top: item.top,
        height: item.height,
        columnIndex: assignments[index] ?? 0,
        columnCount,
      });
    });
    cluster = [];
    clusterEnd = -1;
  };

  for (const item of sorted) {
    const overlapsCluster =
      cluster.length > 0 &&
      item.top < clusterEnd &&
      cluster.some((member) => visualIntervalsOverlap(member, item));

    if (!overlapsCluster) {
      flushCluster();
    }

    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.top + item.height);
  }
  flushCluster();

  return placed;
}

/**
 * Clave de agrupación: mismo día + mismo minuto de inicio.
 * All-day comparte clave por fecha (`#allDay`). Fecha inválida → id del evento (no se agrupa).
 */
export function agendaEventGroupKey(event: CalendarEventGridItemDto): string {
  const start = dayjs(event.startAt);
  if (!start.isValid()) {
    return event.id;
  }
  if (event.allDay) {
    return `${start.format("YYYY-MM-DD")}#allDay`;
  }
  return start.format("YYYY-MM-DDTHH:mm");
}

/**
 * Label del chip de grupo. `count` menor a 1 se trata como 1.
 */
export function formatAgendaEventGroupLabel(count: number): string {
  const safe = Math.max(1, Math.floor(count));
  return safe === 1 ? "1 evento" : `${safe} eventos`;
}

/**
 * Label del overflow en celda mes (`+N evento(s)`). `hiddenCount` menor a 1 → `+1 evento`.
 */
export function formatAgendaMonthOverflowLabel(hiddenCount: number): string {
  const safe = Math.max(1, Math.floor(hiddenCount));
  return safe === 1 ? "+1 evento" : `+${safe} eventos`;
}

/**
 * Ordena eventos de un día de mes: `startAt` asc, luego título, luego `id`.
 * Fechas inválidas van al final.
 */
export function sortAgendaMonthDayEvents(
  events: readonly CalendarEventGridItemDto[],
): CalendarEventGridItemDto[] {
  return [...events].sort((a, b) => {
    const aStart = dayjs(a.startAt);
    const bStart = dayjs(b.startAt);
    const aValid = aStart.isValid();
    const bValid = bStart.isValid();
    if (aValid && bValid) {
      const byStart = aStart.valueOf() - bStart.valueOf();
      if (byStart !== 0) {
        return byStart;
      }
    } else if (aValid !== bValid) {
      return aValid ? -1 : 1;
    }
    const byTitle = a.title.trim().localeCompare(b.title.trim(), "es");
    if (byTitle !== 0) {
      return byTitle;
    }
    return a.id.localeCompare(b.id);
  });
}

export interface CalendarAgendaMonthDaySplit {
  visible: CalendarEventGridItemDto[];
  hidden: CalendarEventGridItemDto[];
}

/**
 * Parte eventos del día para la celda mes: deja un slot para el chip de overflow
 * cuando no entran todos. `maxVisibleChips` menor a 1 se trata como 1.
 * Si caben todos, `hidden` queda vacío.
 */
export function splitAgendaMonthDayEvents(
  events: readonly CalendarEventGridItemDto[],
  maxVisibleChips: number = CALENDAR_AGENDA_MONTH_MAX_VISIBLE_CHIPS,
): CalendarAgendaMonthDaySplit {
  const sorted = sortAgendaMonthDayEvents(events);
  const maxSlots = Math.max(1, Math.floor(maxVisibleChips));
  if (sorted.length <= maxSlots) {
    return { visible: sorted, hidden: [] };
  }
  const visibleCount = Math.max(0, maxSlots - 1);
  return {
    visible: sorted.slice(0, visibleCount),
    hidden: sorted.slice(visibleCount),
  };
}

/**
 * Agrupa eventos en columnas paralelas a `days` (clave local `YYYY-MM-DD` de `startAt`).
 * Cada bucket queda ordenado con `sortAgendaMonthDayEvents`.
 */
export function groupEventsByCalendarDays(
  events: readonly CalendarEventGridItemDto[],
  days: readonly Dayjs[],
): CalendarEventGridItemDto[][] {
  const buckets: CalendarEventGridItemDto[][] = days.map(() => []);
  const indexByKey = new Map(
    days.map((day, index) => [day.format("YYYY-MM-DD"), index] as const),
  );

  for (const event of events) {
    const eventDay = dayjs(event.startAt);
    if (!eventDay.isValid()) {
      continue;
    }
    const index = indexByKey.get(eventDay.format("YYYY-MM-DD"));
    if (index != null) {
      buckets[index]?.push(event);
    }
  }

  return buckets.map((bucket) => sortAgendaMonthDayEvents(bucket));
}

function sortGroupedAgendaEvents(
  events: readonly CalendarEventGridItemDto[],
): CalendarEventGridItemDto[] {
  return [...events].sort((a, b) => {
    const byTitle = a.title.trim().localeCompare(b.title.trim(), "es");
    if (byTitle !== 0) {
      return byTitle;
    }
    return a.id.localeCompare(b.id);
  });
}

/**
 * Ítems de un día: 2+ eventos con el mismo inicio (minuto) se colapsan en un grupo;
 * el resto se coloca con `placeAgendaDayEvents` (columnas si se solapan).
 */
export function layoutAgendaDayItems(
  events: readonly CalendarEventGridItemDto[],
  startHour: number,
  columnDay?: Dayjs,
): CalendarAgendaDayItem[] {
  const buckets = new Map<string, CalendarEventGridItemDto[]>();
  for (const event of events) {
    const key = agendaEventGroupKey(event);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(event);
    } else {
      buckets.set(key, [event]);
    }
  }

  const singles: CalendarEventGridItemDto[] = [];
  const groups: CalendarAgendaEventGroup[] = [];

  for (const [key, bucket] of buckets) {
    if (bucket.length >= 2) {
      const layouts = bucket.map((item) =>
        layoutAgendaEventBlock(item, startHour, columnDay),
      );
      const top = Math.min(...layouts.map((layout) => layout.top));
      const height = Math.max(
        CALENDAR_AGENDA_COMPACT_MAX_HEIGHT,
        ...layouts.map((layout) => layout.height),
      );
      groups.push({
        id: key,
        events: sortGroupedAgendaEvents(bucket),
        top,
        height,
      });
      continue;
    }
    if (bucket[0]) {
      singles.push(bucket[0]);
    }
  }

  const placed = placeAgendaDayEvents(singles, startHour, columnDay);
  return [
    ...placed.map((placement) => ({ kind: "event" as const, placement })),
    ...groups.map((group) => ({ kind: "group" as const, group })),
  ];
}

/**
 * Hora local `HH:mm` para chips de agenda. Fecha inválida → string vacío.
 */
export function formatAgendaBlockClock(iso: string): string {
  const parsed = dayjs(iso);
  return parsed.isValid() ? parsed.format("HH:mm") : "";
}

/**
 * Etiqueta de rango semanal, p. ej. `10 – 16 ago 2026`.
 */
export function formatAgendaWeekRangeLabel(date: Dayjs): string {
  const start = startOfAgendaWeek(date);
  const end = start.add(6, "day");
  const startFmt = start.format("D");
  const endFmt = end.format("D MMM YYYY");
  return `${startFmt} – ${endFmt}`;
}

/**
 * Etiqueta de mes para la toolbar, p. ej. `agosto de 2026` (locale `es`).
 */
export function formatAgendaMonthLabel(date: Dayjs): string {
  const raw = date.format("MMMM [de] YYYY");
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * Avanza o retrocede un día, una semana o un mes según el modo.
 */
export function shiftAgendaDate(
  date: Dayjs,
  mode: CalendarAgendaViewMode,
  direction: -1 | 1,
): Dayjs {
  if (mode === "day") {
    return date.add(direction, "day");
  }
  if (mode === "month") {
    return date.add(direction, "month");
  }
  return date.add(direction * CALENDAR_AGENDA_WEEK_DAYS, "day");
}
