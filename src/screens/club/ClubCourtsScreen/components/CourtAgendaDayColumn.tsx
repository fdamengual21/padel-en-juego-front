import { useMemo } from "react";
import {
  CALENDAR_AGENDA_HOUR_SLOT_PX,
  layoutAgendaDayItems,
  type CalendarEventGridItemDto,
} from "@/modules/schedule";
import CourtAgendaEventBlock from "./CourtAgendaEventBlock";

interface CourtAgendaDayColumnProps {
  events: CalendarEventGridItemDto[];
  startHour: number;
  modules: number;
  onSelectEvent?: (eventId: string) => void;
  onEmptySlotClick?: (hour: number) => void;
}

/**
 * Same slot model as concesionarias Hour/Day columns: fixed 120px rows with an
 * inner top rule. Empty-slot clicks use an overlay so the button chrome cannot
 * change the measured row height (the original `button`+`border-t` drift).
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
              className="absolute inset-0 m-0 block w-full appearance-none border-0 bg-transparent p-0 hover:bg-muted/40"
              aria-label={`Crear reserva a las ${String(hour).padStart(2, "0")}:00`}
              onClick={() => onEmptySlotClick?.(hour)}
            />
          </div>
        );
      })}
      {items.map((item) =>
        item.kind === "group" ? (
          <CourtAgendaEventBlock
            key={item.group.id}
            placement={{
              event: item.group.events[0]!,
              top: item.group.top,
              height: item.group.height,
              columnIndex: 0,
              columnCount: 1,
            }}
            onSelect={onSelectEvent}
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
