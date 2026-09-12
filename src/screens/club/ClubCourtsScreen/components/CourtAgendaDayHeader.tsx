import dayjs, { type Dayjs } from "dayjs";
import { cn } from "@/lib/utils";

interface CourtAgendaDayHeaderProps {
  day: Dayjs;
  selected: boolean;
}

export default function CourtAgendaDayHeader({
  day,
  selected,
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
          isToday && "bg-primary text-primary-foreground",
          selected && !isToday && "bg-muted",
        )}
      >
        {day.format("D")}
      </span>
    </div>
  );
}
