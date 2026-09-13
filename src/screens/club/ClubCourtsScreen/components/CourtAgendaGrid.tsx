import type { Dayjs } from "dayjs";
import {
  CALENDAR_AGENDA_WEEK_DAYS,
  groupEventsByWeekDays,
  resolveAgendaHours,
  startOfAgendaWeek,
  type CalendarAgendaViewMode,
  type CalendarEventGridItemDto,
} from "@/modules/schedule";
import CourtAgendaDayColumn from "./CourtAgendaDayColumn";
import CourtAgendaDayHeader from "./CourtAgendaDayHeader";
import CourtAgendaHourColumn from "./CourtAgendaHourColumn";

interface CourtAgendaGridProps {
  viewMode: CalendarAgendaViewMode;
  selectedDate: Dayjs;
  events: CalendarEventGridItemDto[];
  loading?: boolean;
  openHour?: number;
  closeHour?: number;
  onSelectEvent?: (eventId: string) => void;
  onEmptySlotClick?: (day: Dayjs, hour: number) => void;
}

export default function CourtAgendaGrid({
  viewMode,
  selectedDate,
  events,
  loading = false,
  openHour,
  closeHour,
  onSelectEvent,
  onEmptySlotClick,
}: CourtAgendaGridProps) {
  const mode = viewMode === "month" ? "week" : viewMode;
  const weekStart = startOfAgendaWeek(selectedDate);
  const days = groupEventsByWeekDays(events, weekStart);
  const { startHour, modules } = resolveAgendaHours(events, {
    openHour,
    closeHour,
  });
  const visibleIndexes =
    mode === "day"
      ? [selectedDate.startOf("day").diff(weekStart.startOf("day"), "day")]
      : Array.from({ length: CALENDAR_AGENDA_WEEK_DAYS }, (_, index) => index);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Cargando agenda…
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-xl border border-border bg-card"
      data-testid="court-agenda-grid"
    >
      <div
        className={
          mode === "week"
            ? "flex min-w-[720px] flex-col"
            : "flex flex-col"
        }
      >
        {/* Day headers above the hour grid. */}
        <div className="flex items-end gap-2 px-2 py-2">
          <div className="w-14 shrink-0 pb-1 text-center text-xs uppercase tracking-wide text-muted-foreground">
            Hrs.
          </div>
          {visibleIndexes.map((index) => {
            if (index < 0 || index >= CALENDAR_AGENDA_WEEK_DAYS) return null;
            const day = weekStart.add(index, "day");
            return (
              <div
                key={day.format("YYYY-MM-DD")}
                className="min-w-[92px] flex-1 basis-0"
              >
                <CourtAgendaDayHeader
                  day={day}
                  selected={day.isSame(selectedDate, "day")}
                />
              </div>
            );
          })}
        </div>

        <div className="px-2 pb-2">
          <div className="flex items-start gap-2">
            <CourtAgendaHourColumn startHour={startHour} modules={modules} />
            {visibleIndexes.map((index) => {
              if (index < 0 || index >= CALENDAR_AGENDA_WEEK_DAYS) return null;
              const day = weekStart.add(index, "day");
              return (
                <CourtAgendaDayColumn
                  key={day.format("YYYY-MM-DD")}
                  events={days[index] ?? []}
                  startHour={startHour}
                  modules={modules}
                  onSelectEvent={onSelectEvent}
                  onEmptySlotClick={(hour) => onEmptySlotClick?.(day, hour)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
