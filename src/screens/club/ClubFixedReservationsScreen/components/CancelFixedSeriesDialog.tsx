import { useEffect, useState } from "react";
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
import { weeklyLine } from "../fixedSchedule";

interface CancelFixedSeriesDialogProps {
  series: CourtFixedReservation | null;
  onOpenChange: (open: boolean) => void;
  onCancelled: () => void;
}

export default function CancelFixedSeriesDialog({
  series,
  onOpenChange,
  onCancelled,
}: CancelFixedSeriesDialogProps) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNote("");
  }, [series]);

  const cancel = async () => {
    if (!series) return;
    setBusy(true);
    try {
      await Api.ReservationService().cancelFixed(series.id, note);
      toastSuccess("Turno fijo cancelado");
      onCancelled();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cancelar el turno fijo";
      toastError("No se pudo cancelar el turno fijo", message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={series != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar turno fijo</DialogTitle>
          <DialogDescription>
            {series ? `${weeklyLine(series)}. ` : ""}
            Deja de repetirse. Lo que ya se jugó sigue en el historial.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="cancel-fixed-note">Nota</Label>
          <Input
            id="cancel-fixed-note"
            value={note}
            maxLength={500}
            placeholder="Opcional. Queda para no reasignar el horario sin querer"
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Volver
          </Button>
          <Button type="button" variant="destructive" disabled={busy} onClick={() => void cancel()}>
            {busy ? "Cancelando…" : "Cancelar turno fijo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
