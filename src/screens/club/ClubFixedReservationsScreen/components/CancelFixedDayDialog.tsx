import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toastError, toastSuccess } from "@/lib/toast";
import type { CourtFixedReservation } from "@/modules/reservations";

interface CancelFixedDayDialogProps {
  series: CourtFixedReservation | null;
  date: string | null;
  onOpenChange: (open: boolean) => void;
  onCancelled: () => void;
}

export default function CancelFixedDayDialog({
  series,
  date,
  onOpenChange,
  onCancelled,
}: CancelFixedDayDialogProps) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const when = date ? dayjs(date).locale("es") : null;
  const rawWhen = when?.isValid() ? when.format("dddd D [de] MMMM") : date;
  const whenLabel = rawWhen ? rawWhen.charAt(0).toUpperCase() + rawWhen.slice(1) : null;

  useEffect(() => {
    setNote("");
  }, [series, date]);

  const cancel = async () => {
    if (!series || !date) return;
    setBusy(true);
    try {
      await Api.ReservationService().skipFixed(series.id, date, note);
      toastSuccess("Ese día quedó libre");
      onCancelled();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cancelar el día";
      toastError("No se pudo cancelar el día", message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={series != null && Boolean(date)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar este día</DialogTitle>
          <DialogDescription>
            {whenLabel ? `${whenLabel}. ` : ""}
            Solo esa fecha queda libre. Las demás semanas siguen.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="cancel-fixed-day-note">Nota</Label>
          <Input
            id="cancel-fixed-day-note"
            value={note}
            maxLength={500}
            placeholder="Opcional. Para no reasignar ese hueco sin querer"
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Volver
          </Button>
          <Button type="button" disabled={busy} onClick={() => void cancel()}>
            {busy ? "Cancelando…" : "Cancelar este día"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
