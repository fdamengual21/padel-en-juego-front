import {
  calendarAgendaEventStatusTone,
  calendarEventDurationMinutes,
  calendarEventTypeLabelEs,
  formatAgendaBlockClock,
  resolveAgendaEventDensity,
  type CalendarAgendaPlacedEvent,
} from "@/modules/schedule";
import { cn } from "@/lib/utils";

interface CourtAgendaEventBlockProps {
  placement: CalendarAgendaPlacedEvent;
  onSelect?: (eventId: string) => void;
}

const toneClasses = {
  primary:
    "border-border bg-primary/10 text-sidebar border-l-primary",
  success:
    "border-border bg-success/10 text-sidebar border-l-success",
  error:
    "border-border bg-destructive/10 text-sidebar border-l-destructive",
} as const;

export default function CourtAgendaEventBlock({
  placement,
  onSelect,
}: CourtAgendaEventBlockProps) {
  const { event, top, height, columnIndex, columnCount } = placement;
  const tone = calendarAgendaEventStatusTone(event.status);
  const cancelled = event.status === "Cancelled";
  const density = resolveAgendaEventDensity(height);
  const title = event.title.trim() || calendarEventTypeLabelEs(event.type);
  const subtitle = event.subtitle?.trim() || null;
  const startClock = formatAgendaBlockClock(event.startAt);
  const endClock = formatAgendaBlockClock(event.endAt);
  const durationMinutes = calendarEventDurationMinutes(
    event.startAt,
    event.endAt,
  );
  const timeLine =
    density === "large" && startClock && endClock
      ? `${startClock} – ${endClock}`
      : density === "normal" && startClock
        ? `${startClock}${durationMinutes ? ` · ${durationMinutes} min` : ""}`
        : null;

  const columns = Math.max(columnCount, 1);
  const widthPct = 100 / columns;
  const leftPct = (columnIndex / columns) * 100;

  return (
    <button
      type="button"
      className={cn(
        "absolute z-10 overflow-hidden rounded-md border border-l-[3px] px-1.5 text-left outline-none",
        toneClasses[tone],
        cancelled && "opacity-55",
        density === "compact" ? "py-0.5" : "py-1",
        onSelect ? "cursor-pointer hover:brightness-95" : "cursor-default",
      )}
      style={{
        top,
        height,
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
      }}
      onClick={(clickEvent) => {
        clickEvent.stopPropagation();
        onSelect?.(event.id);
      }}
    >
      {timeLine ? (
        <span className="block truncate text-xs font-semibold opacity-85">
          {timeLine}
        </span>
      ) : null}
      <span
        className={cn(
          "block truncate text-[13px] font-bold leading-tight",
          cancelled && "line-through",
        )}
      >
        {title}
      </span>
      {density !== "compact" && subtitle ? (
        <span className="block truncate text-xs opacity-80">{subtitle}</span>
      ) : null}
    </button>
  );
}
