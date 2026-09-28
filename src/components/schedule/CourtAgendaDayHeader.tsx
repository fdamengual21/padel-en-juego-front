import dayjs, { type Dayjs } from "dayjs";
import { cn } from "@/lib/utils";

export interface CourtAgendaDayNote {
  label: string;
  tone: "available" | "unavailable";
}

interface CourtAgendaDayHeaderProps {
  day: Dayjs;
  selected: boolean;
  note?: CourtAgendaDayNote | null;
  onNoteClick?: () => void;
}

export default function CourtAgendaDayHeader({
  day,
  selected,
  note,
  onNoteClick,
}: CourtAgendaDayHeaderProps) {
  const isToday = day.isSame(dayjs(), "day");
  const weekday = day.format("ddd").replace(".", "");

  return (
    <div className="flex flex-col items-center gap-1 pb-1">
      <span className="text-[11px] uppercase text-muted-foreground">
        {weekday}
      </span>
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-full text-sm font-semibold",
          selected
            ? "bg-primary text-primary-foreground"
            : isToday
              ? "bg-muted text-foreground"
              : "text-foreground",
        )}
      >
        {day.format("D")}
      </span>
      {isToday ? (
        <span className="text-[10px] font-medium text-primary-strong">Hoy</span>
      ) : (
        <span className="h-3" aria-hidden />
      )}
      {note ? (
        onNoteClick && note.tone === "available" ? (
          <button
            type="button"
            className="w-full truncate rounded-md border-l-2 border-l-primary bg-primary/10 px-1 py-1 text-center text-[11px] font-semibold leading-tight text-sidebar hover:brightness-95"
            onClick={onNoteClick}
          >
            {note.label}
          </button>
        ) : (
          <span
            className={cn(
              "w-full truncate rounded-md border-l-2 px-1 py-1 text-center text-[11px] font-semibold leading-tight",
              note.tone === "unavailable"
                ? "border-l-destructive bg-destructive/10 text-sidebar"
                : "border-l-primary bg-primary/10 text-sidebar",
            )}
          >
            {note.label}
          </span>
        )
      ) : null}
    </div>
  );
}
