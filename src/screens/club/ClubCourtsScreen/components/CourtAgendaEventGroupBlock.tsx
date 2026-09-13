import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import StatusBadge from "@/components/tournaments/StatusBadge";
import {
  calendarAgendaGroupStatusTone,
  calendarEventTypeLabelEs,
  formatAgendaBlockClock,
  formatAgendaEventGroupLabel,
  type CalendarAgendaEventGroup,
  type CalendarEventGridItemDto,
} from "@/modules/schedule";
import { cn } from "@/lib/utils";

interface CourtAgendaEventGroupBlockProps {
  group: CalendarAgendaEventGroup;
  onSelectEvent?: (eventId: string) => void;
}

const toneClasses = {
  primary:
    "border-border bg-primary/10 text-sidebar border-l-primary",
  success:
    "border-border bg-success/10 text-sidebar border-l-success",
  error:
    "border-border bg-destructive/10 text-sidebar border-l-destructive",
} as const;

function groupCountLabel(events: readonly CalendarEventGridItemDto[]): string {
  const count = events.length;
  const allReservations = events.every((e) => e.type === "reservation");
  const allMatches = events.every((e) => e.type === "tournament_match");
  if (allReservations) {
    return count === 1 ? "1 reserva" : `${count} reservas`;
  }
  if (allMatches) {
    return count === 1 ? "1 partido" : `${count} partidos`;
  }
  return formatAgendaEventGroupLabel(count);
}

function gridStatusToBadge(status: CalendarEventGridItemDto["status"]): string {
  if (status === "Completed") return "completed";
  if (status === "Cancelled") return "cancelled";
  return "booked";
}

export default function CourtAgendaEventGroupBlock({
  group,
  onSelectEvent,
}: CourtAgendaEventGroupBlockProps) {
  const listId = useId();
  const chipRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null,
  );
  const first = group.events[0];
  const startClock = first ? formatAgendaBlockClock(first.startAt) : "";
  const allDay = Boolean(first?.allDay);
  const countLabel = groupCountLabel(group.events);
  const ariaLabel = allDay
    ? `${countLabel} de todo el día`
    : startClock
      ? `${countLabel} a las ${startClock}`
      : countLabel;
  const tone = useMemo(
    () => calendarAgendaGroupStatusTone(group.events),
    [group.events],
  );
  const groupCancelled = tone === "error";

  useLayoutEffect(() => {
    if (!open || !chipRef.current) {
      setMenuPos(null);
      return;
    }
    const rect = chipRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => setOpen(false);
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [open]);

  return (
    <>
      <button
        ref={chipRef}
        type="button"
        className={cn(
          "absolute z-10 overflow-hidden rounded-md border border-l-[3px] px-1.5 py-0.5 text-left outline-none",
          toneClasses[tone],
          groupCancelled && "opacity-55",
          "cursor-pointer hover:brightness-95",
        )}
        style={{
          top: group.top,
          height: group.height,
          left: 2,
          width: "calc(100% - 4px)",
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        <span
          className={cn(
            "block truncate text-[13px] font-bold leading-tight",
            groupCancelled && "line-through",
          )}
        >
          {countLabel}
        </span>
        {startClock && !allDay ? (
          <span className="block truncate text-xs opacity-85">
            {startClock}
          </span>
        ) : allDay ? (
          <span className="block truncate text-xs opacity-85">
            Todo el día
          </span>
        ) : null}
      </button>

      {open && menuPos
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default bg-transparent"
                aria-label="Cerrar lista"
                onClick={() => setOpen(false)}
              />
              <ul
                id={listId}
                role="listbox"
                aria-label={ariaLabel}
                className="fixed z-50 max-h-80 min-w-[260px] max-w-[360px] overflow-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
                style={{ top: menuPos.top, left: menuPos.left }}
              >
                {group.events.map((event) => {
                  const title =
                    event.title.trim() || calendarEventTypeLabelEs(event.type);
                  const clock = formatAgendaBlockClock(event.startAt);
                  const typeLabel = calendarEventTypeLabelEs(event.type);
                  const secondary = event.allDay
                    ? `Todo el día · ${typeLabel}`
                    : clock
                      ? `${clock} · ${typeLabel}`
                      : typeLabel;
                  const cancelled = event.status === "Cancelled";
                  return (
                    <li key={event.id} role="option">
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-muted",
                          cancelled && "opacity-70",
                        )}
                        onClick={() => {
                          setOpen(false);
                          onSelectEvent?.(event.id);
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "truncate text-sm font-medium",
                              cancelled && "line-through",
                            )}
                          >
                            {title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {event.subtitle?.trim()
                              ? `${secondary} · ${event.subtitle}`
                              : secondary}
                          </p>
                        </div>
                        <StatusBadge status={gridStatusToBadge(event.status)} />
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
