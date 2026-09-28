import dayjs from "dayjs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatArs } from "@/lib/money";
import type { PublicClubSlot } from "@/modules/clubs";

interface DayFreeSlotsDialogProps {
  dateKey: string | null;
  slots: PublicClubSlot[];
  onClose: () => void;
  onSelect: (slot: PublicClubSlot) => void;
}

export default function DayFreeSlotsDialog({
  dateKey,
  slots,
  onClose,
  onSelect,
}: DayFreeSlotsDialogProps) {
  const day = dateKey ? dayjs(dateKey) : null;
  if (!day?.isValid()) return null;

  const label = `${day.format("dddd")} ${day.format("D [de] MMMM")}`;
  const title = label.charAt(0).toUpperCase() + label.slice(1);

  return (
    <Dialog
      open={dateKey != null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md" data-testid="public-day-slot-list">
        <DialogHeader>
          <DialogTitle>Turnos del {title}</DialogTitle>
          <DialogDescription>Elegí un horario libre para pedirlo.</DialogDescription>
        </DialogHeader>
        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No quedan turnos libres ese día.</p>
        ) : (
          <ul className="max-h-80 space-y-1 overflow-auto">
            {slots.map((slot) => (
              <li key={`${slot.courtId}|${slot.startsAt}`}>
                <button
                  type="button"
                  className="flex w-full flex-col rounded-md px-2 py-2 text-left hover:bg-muted"
                  onClick={() => onSelect(slot)}
                >
                  <span className="truncate text-sm font-medium">{slot.label}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {slot.courtName} · {formatArs(slot.price)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
