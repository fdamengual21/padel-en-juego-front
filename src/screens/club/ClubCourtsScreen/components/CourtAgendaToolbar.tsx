import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatAgendaWeekRangeLabel,
  shiftAgendaDate,
  type CalendarAgendaViewMode,
} from "@/modules/schedule";
import { cn } from "@/lib/utils";

export type CourtAgendaToolbarMode = Extract<CalendarAgendaViewMode, "day" | "week">;

interface CourtAgendaToolbarProps {
  mode: CourtAgendaToolbarMode;
  date: Dayjs;
  onModeChange: (mode: CourtAgendaToolbarMode) => void;
  onDateChange: (date: Dayjs) => void;
  onAddReservation?: () => void;
}

export default function CourtAgendaToolbar({
  mode,
  date,
  onModeChange,
  onDateChange,
  onAddReservation,
}: CourtAgendaToolbarProps) {
  const label =
    mode === "day"
      ? date.format("dddd D [de] MMMM YYYY")
      : formatAgendaWeekRangeLabel(date);

  return (
    <div
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      data-testid="court-agenda-toolbar"
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-border p-0.5">
          {(
            [
              { value: "day", label: "Día" },
              { value: "week", label: "Semana" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                "rounded-md px-3 py-1.5 text-sm",
                mode === option.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => onModeChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label="Anterior"
            onClick={() => onDateChange(shiftAgendaDate(date, mode, -1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onDateChange(dayjs())}
          >
            Hoy
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label="Siguiente"
            onClick={() => onDateChange(shiftAgendaDate(date, mode, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            className="w-auto"
            value={date.format("YYYY-MM-DD")}
            onChange={(e) => {
              if (!e.target.value) return;
              onDateChange(dayjs(e.target.value).hour(12));
            }}
          />
          <p className="text-sm font-medium capitalize text-foreground">{label}</p>
        </div>
      </div>
      {onAddReservation ? (
        <Button type="button" onClick={onAddReservation}>
          <Plus className="size-4" />
          Agregar reserva
        </Button>
      ) : null}
    </div>
  );
}
