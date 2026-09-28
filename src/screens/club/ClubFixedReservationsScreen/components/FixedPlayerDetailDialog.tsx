import { useEffect, useState } from "react";
import { PERMISSION_CLUB_RESERVATIONS_WRITE } from "@/authorization";
import { PermissionsGuard } from "@/components/guards";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CourtFixedReservation, CourtFixedReservationPlayer } from "@/modules/reservations";
import { upcomingOccurrences, weeklyCountLabel, weeklyLine } from "../fixedSchedule";

interface FixedPlayerDetailDialogProps {
  group: CourtFixedReservationPlayer | null;
  onOpenChange: (open: boolean) => void;
  onCancelDay: (series: CourtFixedReservation, date: string) => void;
  onRestoreDay: (series: CourtFixedReservation, date: string) => void;
  onCancelSeries: (series: CourtFixedReservation) => void;
}

export default function FixedPlayerDetailDialog({
  group,
  onOpenChange,
  onCancelDay,
  onRestoreDay,
  onCancelSeries,
}: FixedPlayerDetailDialogProps) {
  const [shown, setShown] = useState(group);
  useEffect(() => {
    if (group) setShown(group);
  }, [group]);
  const current = group ?? shown;
  const name = current
    ? `${current.playerFirstName} ${current.playerLastName}`.trim() || "Sin nombre"
    : "";
  const series = [...(current?.series ?? [])].sort(
    (left, right) => left.weekday - right.weekday || left.startTime.localeCompare(right.startTime),
  );
  const occurrences = upcomingOccurrences(series);

  return (
    <Dialog open={group != null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>{weeklyCountLabel(series.length)}</DialogDescription>
        </DialogHeader>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Horarios fijos</h3>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {series.map((item) => (
              <li key={item.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="min-w-0 text-sm">{weeklyLine(item)}</p>
                <PermissionsGuard permission={PERMISSION_CLUB_RESERVATIONS_WRITE}>
                  <Button type="button" variant="outline" size="sm" onClick={() => onCancelSeries(item)}>
                    Cancelar turno fijo
                  </Button>
                </PermissionsGuard>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Próximas dos semanas</h3>
          {occurrences.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay turnos en las próximas dos semanas.</p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {occurrences.map((item) => (
                <li
                  key={`${item.series.id}-${item.date}`}
                  className={
                    item.cancelled
                      ? "flex flex-col gap-2 bg-destructive/10 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                      : "flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  }
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.courtName}</p>
                    <p className="text-sm text-muted-foreground">{item.whenLabel}</p>
                    {item.cancelled && item.note ? (
                      <p className="text-sm text-destructive">Motivo de cancelación: {item.note}</p>
                    ) : null}
                  </div>
                  <PermissionsGuard permission={PERMISSION_CLUB_RESERVATIONS_WRITE}>
                    {item.cancelled ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => onRestoreDay(item.series, item.date)}
                      >
                        Devolver turno
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => onCancelDay(item.series, item.date)}
                      >
                        Cancelar este día
                      </Button>
                    )}
                  </PermissionsGuard>
                </li>
              ))}
            </ul>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
