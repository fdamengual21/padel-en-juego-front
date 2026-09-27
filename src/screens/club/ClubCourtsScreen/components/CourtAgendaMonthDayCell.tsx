import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dayjs, { type Dayjs } from "dayjs";
import StatusBadge from "@/components/tournaments/StatusBadge";
import {
  calendarAgendaEventStatusTone,
  calendarEventTypeLabelEs,
  formatAgendaBlockClock,
  formatAgendaMonthOverflowLabel,
  splitAgendaMonthDayEvents,
  type CalendarAgendaStatusTone,
  type CalendarEventGridItemDto,
} from "@/modules/schedule";
import { cn } from "@/lib/utils";
import { placeAgendaPopover } from "./placeAgendaPopover";

interface CourtAgendaMonthDayCellProps {
  day: Dayjs;
  events: CalendarEventGridItemDto[];
  inCurrentMonth: boolean;
  maxVisibleChips: number;
  onSelectEvent?: (eventId: string) => void;
  onEmptyDayClick?: (day: Dayjs) => void;
}

const toneClasses: Record<CalendarAgendaStatusTone | "warning", string> = {
  primary: "border-l-primary bg-primary/10 text-sidebar",
  success: "border-l-success bg-success/10 text-sidebar",
  error: "border-l-destructive bg-destructive/10 text-sidebar",
  warning: "border-l-warning bg-warning/15 text-sidebar",
};

function eventTone(event: CalendarEventGridItemDto) {
  if (event.type === "reservation" && event.status === "Pending") return "warning" as const;
  return calendarAgendaEventStatusTone(event.status);
}

function badgeStatus(status: CalendarEventGridItemDto["status"]): string {
  if (status === "Completed") return "completed";
  if (status === "Cancelled") return "cancelled";
  if (status === "Pending") return "PENDING";
  return "booked";
}

function overflowLabel(events: readonly CalendarEventGridItemDto[], hiddenCount: number): string {
  if (events.every((event) => event.type === "reservation")) {
    return hiddenCount === 1 ? "+1 reserva" : `+${hiddenCount} reservas`;
  }
  return formatAgendaMonthOverflowLabel(hiddenCount);
}

export default function CourtAgendaMonthDayCell({
  day,
  events,
  inCurrentMonth,
  maxVisibleChips,
  onSelectEvent,
  onEmptyDayClick,
}: CourtAgendaMonthDayCellProps) {
  const listId = useId();
  const cellRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const isToday = day.isSame(dayjs(), "day");
  const { visible, hidden } = splitAgendaMonthDayEvents(events, maxVisibleChips);
  const multiple = events.length > 1;
  const dayLabel = day.format("D [de] MMMM");

  useLayoutEffect(() => {
    if (!open || !cellRef.current || !menuRef.current) {
      setMenuPos(null);
      return;
    }
    const next = placeAgendaPopover(cellRef.current, menuRef.current);
    setMenuPos((current) =>
      current?.top === next.top && current.left === next.left ? current : next,
    );
  }, [open, events]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => setOpen(false);
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [open]);

  const openList = () => setOpen(true);

  const activateEvent = (eventId: string) => {
    if (multiple) {
      openList();
      return;
    }
    onSelectEvent?.(eventId);
  };

  return (
    <>
      <div
        ref={cellRef}
        className={cn(
          "flex min-h-28 flex-col gap-1 border-r border-b border-border p-1.5",
          inCurrentMonth ? "bg-card" : "bg-muted/40",
          !inCurrentMonth && "opacity-70",
          events.length === 0 && onEmptyDayClick && "cursor-pointer hover:bg-muted/40",
        )}
        onClick={() => {
          if (events.length === 0) {
            onEmptyDayClick?.(day);
            return;
          }
          if (multiple) openList();
          else if (events[0]) onSelectEvent?.(events[0].id);
        }}
      >
        <div className="flex justify-center">
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-full text-sm font-semibold",
              isToday
                ? "bg-primary text-primary-foreground"
                : inCurrentMonth
                  ? "text-foreground"
                  : "text-muted-foreground",
            )}
          >
            {day.format("D")}
          </span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-0.5">
          {visible.map((event) => {
            const title = event.title.trim() || calendarEventTypeLabelEs(event.type);
            const clock = formatAgendaBlockClock(event.startAt);
            return (
              <button
                key={event.id}
                type="button"
                className={cn(
                  "truncate rounded-md border-l-2 px-1 py-0.5 text-left text-[11px] font-semibold leading-tight",
                  toneClasses[eventTone(event)],
                  event.status === "Cancelled" && "line-through opacity-60",
                )}
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation();
                  activateEvent(event.id);
                }}
              >
                {clock ? `${clock} ${title}` : title}
              </button>
            );
          })}
          {hidden.length > 0 ? (
            <button
              type="button"
              className="truncate rounded-md bg-muted px-1 py-0.5 text-left text-[11px] font-semibold text-sidebar"
              aria-label={overflowLabel(events, hidden.length)}
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                openList();
              }}
            >
              {overflowLabel(events, hidden.length)}
            </button>
          ) : null}
        </div>
      </div>

      {open
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default bg-transparent"
                aria-label="Cerrar lista"
                onClick={() => setOpen(false)}
              />
              <ul
                ref={menuRef}
                id={listId}
                role="listbox"
                aria-label={`Turnos del ${dayLabel}`}
                className="fixed z-50 max-h-80 min-w-[260px] max-w-[360px] overflow-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
                style={{
                  top: menuPos?.top ?? 0,
                  left: menuPos?.left ?? 0,
                  visibility: menuPos ? "visible" : "hidden",
                }}
              >
                {events.map((event) => {
                  const title = event.title.trim() || calendarEventTypeLabelEs(event.type);
                  const clock = formatAgendaBlockClock(event.startAt);
                  const secondary = [
                    clock,
                    calendarEventTypeLabelEs(event.type),
                    event.subtitle?.trim(),
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li key={event.id} role="option">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-muted"
                        onClick={() => {
                          setOpen(false);
                          onSelectEvent?.(event.id);
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{title}</p>
                          <p className="truncate text-xs text-muted-foreground">{secondary}</p>
                        </div>
                        <StatusBadge status={badgeStatus(event.status)} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
