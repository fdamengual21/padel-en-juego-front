import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import { ArrowUpRight, CalendarDays, CircleAlert, LayoutGrid, MapPin, Tag } from "lucide-react";
import Api from "@/api/Api";
import Avatar from "@/components/Avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatLocationEs } from "@/lib/dates";
import { formatArs } from "@/lib/money";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { PlayerReservation } from "@/modules/reservations";
import { ROUTES } from "@/router/routes";
import { PlayerReservationStatusChip } from "@/components/reservations";

interface PlayerReservationDetailModalProps {
  reservation: PlayerReservation | null;
  onOpenChange: (open: boolean) => void;
  onCancelled: () => void;
}

export default function PlayerReservationDetailModal({
  reservation,
  onOpenChange,
  onCancelled,
}: PlayerReservationDetailModalProps) {
  const [busy, setBusy] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const reservationId = reservation?.id;

  useEffect(() => {
    setCoverFailed(false);
  }, [reservationId]);
  const canCancel =
    reservation?.status === "pending" || reservation?.status === "booked";
  const club = reservation?.club;
  const location = club
    ? formatLocationEs(club.municipalityName, club.provinceName)
    : null;
  const start = reservation ? dayjs(reservation.startsAt) : null;
  const end = reservation ? dayjs(reservation.endsAt) : null;
  const showCover = Boolean(club?.coverUrl) && !coverFailed;

  const cancel = async () => {
    if (!reservation) return;
    setBusy(true);
    try {
      await Api.ReservationService().cancelMine(reservation.id);
      toastSuccess("Reserva cancelada");
      onCancelled();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cancelar";
      toastError("No se pudo cancelar", message);
    } finally {
      setBusy(false);
    }
  };

  const weekday = start?.isValid() ? start.format("dddd") : "";
  const dateLabel = start?.isValid()
    ? `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${start.format("D [de] MMMM")}`
    : "Sin fecha";
  const timeLabel =
    start?.isValid() && end?.isValid()
      ? `${start.format("HH:mm")} – ${end.format("HH:mm")}`
      : "Sin horario";

  return (
    <Dialog
      open={reservation != null}
      onOpenChange={(open) => {
        if (!open && !busy) {
          setCoverFailed(false);
          onOpenChange(false);
        }
      }}
    >
      <DialogContent className="max-w-xl gap-5 pt-12" data-testid="player-reservation-detail">
        <DialogHeader className="sr-only">
          <DialogTitle>{club?.name || "Reserva"}</DialogTitle>
          <DialogDescription>
            {reservation?.courtName || "Cancha"}
            {location ? ` · ${location}` : ""}
          </DialogDescription>
        </DialogHeader>
        {reservation && club ? (
          <>
            <div className="relative overflow-hidden rounded-xl bg-muted">
              {showCover ? (
                <img
                  src={club.coverUrl ?? ""}
                  alt=""
                  className="absolute inset-0 size-full object-cover"
                  onError={() => setCoverFailed(true)}
                />
              ) : null}
              {showCover ? (
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-black/20" />
              ) : null}
              <div className="relative flex items-center gap-3 p-4 pr-28">
                <Avatar
                  name={club.name || "Club"}
                  imageUrl={club.avatarUrl}
                  size="lg"
                  alt={club.name}
                  className={showCover ? "ring-2 ring-white/80" : undefined}
                />
                <div className={cn("min-w-0", showCover ? "text-white" : "text-foreground")}>
                  <p className="truncate text-lg font-semibold tracking-tight">
                    {club.name || "Club"}
                  </p>
                  <p
                    className={cn(
                      "mt-1 flex items-center gap-1 text-xs",
                      showCover ? "text-white/80" : "text-muted-foreground",
                    )}
                  >
                    <MapPin className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{location ?? "Ubicación no informada"}</span>
                  </p>
                </div>
              </div>
              <PlayerReservationStatusChip
                status={reservation.status}
                className="absolute top-3 right-3"
              />
            </div>

            <div className="grid grid-cols-2">
              <Fact icon={CalendarDays} label="Fecha y horario">
                <span className="block">{dateLabel}</span>
                <span className="mt-0.5 block text-muted-foreground">{timeLabel}</span>
              </Fact>
              <Fact icon={LayoutGrid} label="Cancha" divided>
                {reservation.courtName || "Cancha"}
              </Fact>
              <Fact icon={MapPin} label="Ubicación" stacked>
                {location ?? "Ubicación no informada"}
              </Fact>
              <Fact icon={Tag} label="Precio" divided stacked>
                {formatArs(reservation.price)}
              </Fact>
            </div>

            {reservation.status === "rejected" ? (
              <div className="flex gap-2 rounded-lg bg-destructive/10 p-3">
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                <div className="min-w-0">
                  <p className="font-medium text-destructive">Turno rechazado</p>
                  <p className="mt-0.5 text-foreground" data-testid="player-reservation-reason">
                    {reservation.rejectedReason?.trim() || "El club no dejó un motivo."}
                  </p>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          {club?.id ? (
            <Link
              to={ROUTES.player.clubDetail(club.id)}
              className={cn(buttonVariants({ variant: "outline" }))}
              onClick={() => onOpenChange(false)}
            >
              <ArrowUpRight />
              Ver club
            </Link>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {canCancel ? (
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                data-testid="player-reservation-cancel"
                onClick={() => void cancel()}
              >
                {busy ? "Cancelando…" : "Cancelar reserva"}
              </Button>
            ) : null}
            <DialogClose
              render={<Button type="button" variant="outline" disabled={busy} />}
            >
              Cerrar
            </DialogClose>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Fact({
  icon: Icon,
  label,
  divided = false,
  stacked = false,
  children,
}: {
  icon: typeof CalendarDays;
  label: string;
  divided?: boolean;
  stacked?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex gap-2.5 py-3 pr-3",
        divided && "border-l border-border pl-4",
        stacked && "border-t border-border",
        !divided && "pl-0",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-1 text-sm font-medium">{children}</div>
      </div>
    </div>
  );
}
