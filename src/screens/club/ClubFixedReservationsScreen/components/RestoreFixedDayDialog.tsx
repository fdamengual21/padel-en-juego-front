import { useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import Api from "@/api/Api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toastError, toastSuccess } from "@/lib/toast";
import type { CourtFixedReservation } from "@/modules/reservations";

interface RestoreFixedDayDialogProps {
  series: CourtFixedReservation | null;
  date: string | null;
  onOpenChange: (open: boolean) => void;
  onRestored: () => void;
}

export default function RestoreFixedDayDialog({
  series,
  date,
  onOpenChange,
  onRestored,
}: RestoreFixedDayDialogProps) {
  const [busy, setBusy] = useState(false);
  const when = date ? dayjs(date).locale("es") : null;
  const rawWhen = when?.isValid() ? when.format("dddd D [de] MMMM") : date;
  const whenLabel = rawWhen ? rawWhen.charAt(0).toUpperCase() + rawWhen.slice(1) : null;

  const restore = async () => {
    if (!series || !date) return;
    setBusy(true);
    try {
      await Api.ReservationService().restoreFixed(series.id, date);
      toastSuccess("El turno volvió a esa persona");
      onRestored();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo devolver el turno";
      toastError("No se pudo devolver el turno", message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={series != null && Boolean(date)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Devolver turno</DialogTitle>
          <DialogDescription>
            {whenLabel ? `${whenLabel}. ` : ""}
            Ese día vuelve a ser de esta persona.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Volver
          </Button>
          <Button type="button" disabled={busy} onClick={() => void restore()}>
            {busy ? "Devolviendo…" : "Devolver turno"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
