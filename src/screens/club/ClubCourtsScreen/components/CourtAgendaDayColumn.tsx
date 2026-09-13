import { useMemo } from "react";
import {
  CALENDAR_AGENDA_HOUR_SLOT_PX,
  layoutAgendaDayItems,
  type CalendarEventGridItemDto,
} from "@/modules/schedule";
import CourtAgendaEventBlock from "./CourtAgendaEventBlock";
import CourtAgendaEventGroupBlock from "./CourtAgendaEventGroupBlock";

interface CourtAgendaDayColumnProps {
  events: CalendarEventGridItemDto[];
  startHour: number;
  modules: number;
  onSelectEvent?: (eventId: string) => void;
  onEmptySlotClick?: (hour: number) => void;
}

/**
 * Same slot model as concesionarias: fixed 120px rows + inner top rule.
 * Same-minute starts collapse into a group chip + list.
 */
export default function CourtAgendaDayColumn({
  events,
  startHour,
  modules,
  onSelectEvent,
  onEmptySlotClick,
}: CourtAgendaDayColumnProps) {
  const items = useMemo(
    () => layoutAgendaDayItems(events, startHour),
    [events, startHour],
  );

  return (
    <div className="relative min-w-[92px] flex-1 basis-0">
      {Array.from({ length: modules }, (_, index) => {
        const hour = startHour + index;
        return (
          <div
            key={hour}
            className="relative box-border overflow-hidden"
            style={{ height: CALENDAR_AGENDA_HOUR_SLOT_PX }}
            data-agenda-slot={hour}
          >
            <div className="w-full border-t border-border" />
            <button
              type="button"
              className="absolute inset-0 z-0 m-0 block w-full appearance-none border-0 bg-transparent p-0 hover:bg-muted/40"
              aria-label={`Crear reserva a las ${String(hour).padStart(2, "0")}:00`}
              onClick={() => onEmptySlotClick?.(hour)}
            />
          </div>
        );
      })}
      {items.map((item) =>
        item.kind === "group" ? (
          <CourtAgendaEventGroupBlock
            key={item.group.id}
            group={item.group}
            onSelectEvent={onSelectEvent}
          />
        ) : (
          <CourtAgendaEventBlock
            key={item.placement.event.id}
            placement={item.placement}
            onSelect={onSelectEvent}
          />
        ),
      )}
    </div>
  );
}
