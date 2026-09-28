import { useEffect, useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";
import type { Dayjs } from "dayjs";
import {
  buildAgendaMonthGridDays,
  CALENDAR_AGENDA_MONTH_MAX_VISIBLE_CHIPS,
  CALENDAR_AGENDA_MONTH_MAX_VISIBLE_CHIPS_MOBILE,
  CALENDAR_AGENDA_WEEK_DAYS,
  groupEventsByCalendarDays,
  startOfAgendaWeek,
  type AgendaJornadaSchedule,
  type CalendarEventGridItemDto,
} from "@/modules/schedule";
import CourtAgendaMonthDayCell from "./CourtAgendaMonthDayCell";

interface CourtAgendaMonthGridProps {
  selectedDate: Dayjs;
  events: CalendarEventGridItemDto[];
  /** Popover del día. Si viene, reemplaza la lista de `events`. */
  listEvents?: CalendarEventGridItemDto[];
  loading?: boolean;
  turnsLoading?: boolean;
  jornada?: AgendaJornadaSchedule;
  onSelectEvent?: (eventId: string) => void;
  onEmptyDayClick?: (day: Dayjs) => void;
}

function useMaxVisibleChips(): number {
  const [max, setMax] = useState(CALENDAR_AGENDA_MONTH_MAX_VISIBLE_CHIPS);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 768px)");
    const apply = () =>
      setMax(
        query.matches
          ? CALENDAR_AGENDA_MONTH_MAX_VISIBLE_CHIPS_MOBILE
          : CALENDAR_AGENDA_MONTH_MAX_VISIBLE_CHIPS,
      );
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
  return max;
}

export default function CourtAgendaMonthGrid({
  selectedDate,
  events,
  listEvents,
  loading = false,
  turnsLoading = false,
  jornada,
  onSelectEvent,
  onEmptyDayClick,
}: CourtAgendaMonthGridProps) {
  const maxVisibleChips = useMaxVisibleChips();
  const days = useMemo(() => buildAgendaMonthGridDays(selectedDate), [selectedDate]);
  const buckets = useMemo(
    () => groupEventsByCalendarDays(events, days, jornada),
    [events, days, jornada],
  );
  const listBuckets = useMemo(
    () => (listEvents ? groupEventsByCalendarDays(listEvents, days, jornada) : null),
    [listEvents, days, jornada],
  );
  const weekdayLabels = useMemo(() => {
    const monday = startOfAgendaWeek(selectedDate);
    return Array.from({ length: CALENDAR_AGENDA_WEEK_DAYS }, (_, index) => {
      const label = monday.add(index, "day").format("ddd").replace(".", "");
      return label.charAt(0).toUpperCase() + label.slice(1);
    });
  }, [selectedDate]);
  const showSpinner = loading || turnsLoading;

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border bg-card"
      data-testid="court-agenda-month-grid"
    >
      {showSpinner ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-card/70">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
          <span className="sr-only">Cargando turnos…</span>
        </div>
      ) : null}
      <div
        className="grid border-b border-border"
        style={{ gridTemplateColumns: `repeat(${CALENDAR_AGENDA_WEEK_DAYS}, minmax(0, 1fr))` }}
      >
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>
      <div
        className="grid border-l border-t border-border"
        style={{ gridTemplateColumns: `repeat(${CALENDAR_AGENDA_WEEK_DAYS}, minmax(0, 1fr))` }}
      >
        {days.map((day, index) => (
          <CourtAgendaMonthDayCell
            key={day.format("YYYY-MM-DD")}
            day={day}
            events={buckets[index] ?? []}
            listEvents={listBuckets ? (listBuckets[index] ?? []) : undefined}
            inCurrentMonth={day.isSame(selectedDate, "month")}
            maxVisibleChips={maxVisibleChips}
            onSelectEvent={onSelectEvent}
            onEmptyDayClick={onEmptyDayClick}
          />
        ))}
      </div>
    </div>
  );
}
