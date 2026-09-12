import { CALENDAR_AGENDA_HOUR_SLOT_PX } from "@/modules/schedule";

interface CourtAgendaHourColumnProps {
  startHour: number;
  modules: number;
}

/**
 * Same slot model as concesionarias: fixed-height row, rule as first child,
 * label below the rule (not centered on the line).
 */
export default function CourtAgendaHourColumn({
  startHour,
  modules,
}: CourtAgendaHourColumnProps) {
  return (
    <div className="w-14 shrink-0">
      {Array.from({ length: modules }, (_, index) => {
        const hour = startHour + index;
        const label = `${String(hour).padStart(2, "0")}:00`;
        return (
          <div
            key={label}
            className="box-border flex flex-col items-center overflow-hidden"
            style={{ height: CALENDAR_AGENDA_HOUR_SLOT_PX }}
            data-agenda-hour={hour}
          >
            <div className="w-full shrink-0 border-t border-border" />
            <span className="px-1 pt-0.5 text-xs leading-none text-muted-foreground">
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
