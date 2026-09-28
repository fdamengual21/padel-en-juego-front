import { useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { ChevronDown } from "lucide-react";
import type { CourtReservation } from "@/domain";
import Api from "@/api/Api";
import { PERMISSION_CLUB_CLIENTS_READ, usePermissions } from "@/authorization";
import Avatar from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import ClientDetailModal from "@/screens/club/ClubClientDetailScreen/components/ClientDetailModal";

dayjs.locale("es");

interface PendingReservationsCardProps {
  clubId: string;
  reservations: CourtReservation[];
  canMutate: boolean;
  onChanged: () => void;
}

function playerName(reservation: CourtReservation): string {
  const name = `${reservation.playerFirstName ?? ""} ${reservation.playerLastName ?? ""}`.trim();
  return name || "Jugador";
}

export default function PendingReservationsCard({
  clubId,
  reservations,
  canMutate,
  onChanged,
}: PendingReservationsCardProps) {
  const { can } = usePermissions();
  const canOpenClient = can(PERMISSION_CLUB_CLIENTS_READ);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);

  if (reservations.length === 0) return null;

  const title =
    reservations.length === 1
      ? "1 pedido pendiente"
      : `${reservations.length} pedidos pendientes`;

  const run = async (id: string, action: () => Promise<void>, success: string) => {
    setBusyId(id);
    try {
      await action();
      toastSuccess(success);
      setRejectId(null);
      setRejectReason("");
      onChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo guardar";
      toastError("No se pudo guardar", message);
    } finally {
      setBusyId(null);
    }
  };

  const acceptAll = () => {
    void run("all", async () => {
      for (const reservation of reservations) {
        await Api.ReservationService().accept(reservation.id);
      }
    }, reservations.length === 1 ? "Pedido aceptado" : "Pedidos aceptados");
  };

  return (
    <div
      className="overflow-hidden rounded-xl border border-warning/60 bg-warning/15"
      data-testid="pending-reservations-card"
    >
      <div
        role="button"
        tabIndex={0}
        className="flex cursor-pointer items-center gap-3 px-3 py-2"
        aria-expanded={open}
        aria-label={open ? "Cerrar pedidos" : "Abrir pedidos"}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          setOpen((current) => !current);
        }}
      >
        <span className="text-sm font-semibold text-sidebar">{title}</span>
        {canMutate ? (
          <Button
            type="button"
            size="sm"
            disabled={busyId != null}
            onClick={(event) => {
              event.stopPropagation();
              acceptAll();
            }}
            onKeyDown={(event) => event.stopPropagation()}
          >
            Aceptar todas
          </Button>
        ) : null}
        <ChevronDown className={cn("ml-auto size-4 shrink-0 text-sidebar", open && "rotate-180")} />
      </div>
      {open ? (
        <div className="space-y-2 border-t border-warning/40 px-3 py-3">
          <ul className="space-y-2">
            {reservations.map((reservation) => {
              const rejecting = rejectId === reservation.id;
              return (
                <li
                  key={reservation.id}
                  className="rounded-lg border border-border bg-card px-3 py-2"
                >
                  <p className="text-sm font-medium">
                    {dayjs(reservation.startsAt).format("dddd D [de] MMMM")}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
                    <span>
                      {dayjs(reservation.startsAt).format("HH:mm")}
                      {" – "}
                      {dayjs(reservation.endsAt).format("HH:mm")}
                      {" · "}
                      {reservation.courtName || "Cancha"}
                      {" ·"}
                    </span>
                    <ReservationPlayer
                      reservation={reservation}
                      clickable={
                        canOpenClient &&
                        Boolean(reservation.bookedByPlayerId) &&
                        (reservation.playerHasAccount === true || reservation.isClubPlayer === true)
                      }
                      onOpen={setClientId}
                    />
                  </p>
                  {canMutate ? (
                    rejecting ? (
                      <div className="mt-2 space-y-2">
                        <label className="text-sm text-muted-foreground" htmlFor={`reject-${reservation.id}`}>
                          Nota (opcional)
                        </label>
                        <textarea
                          id={`reject-${reservation.id}`}
                          className="min-h-16 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                          value={rejectReason}
                          onChange={(event) => setRejectReason(event.target.value)}
                          placeholder="Motivo del rechazo"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={busyId != null}
                            onClick={() => {
                              void run(
                                reservation.id,
                                () => Api.ReservationService().reject(reservation.id, rejectReason),
                                "Pedido rechazado",
                              );
                            }}
                          >
                            Confirmar rechazo
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busyId != null}
                            onClick={() => {
                              setRejectId(null);
                              setRejectReason("");
                            }}
                          >
                            Volver
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={busyId != null}
                          onClick={() => {
                            void run(
                              reservation.id,
                              () => Api.ReservationService().accept(reservation.id),
                              "Pedido aceptado",
                            );
                          }}
                        >
                          Aceptar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busyId != null}
                          onClick={() => {
                            setRejectId(reservation.id);
                            setRejectReason("");
                          }}
                        >
                          Rechazar
                        </Button>
                      </div>
                    )
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      <ClientDetailModal
        open={Boolean(clientId)}
        clubId={clubId}
        clientId={clientId}
        onOpenChange={(next) => {
          if (!next) setClientId(null);
        }}
      />
    </div>
  );
}

function ReservationPlayer({
  reservation,
  clickable,
  onOpen,
}: {
  reservation: CourtReservation;
  clickable: boolean;
  onOpen: (playerId: string) => void;
}) {
  const name = playerName(reservation);
  const body = (
    <>
      <Avatar name={name} imageUrl={reservation.playerAvatarUrl} size="xs" alt={name} />
      <span className="truncate text-sm font-medium text-foreground">{name}</span>
    </>
  );

  if (!clickable || !reservation.bookedByPlayerId) {
    return <span className="inline-flex min-w-0 items-center gap-2">{body}</span>;
  }

  return (
    <button
      type="button"
      className="inline-flex min-w-0 items-center gap-2 rounded-md text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      onClick={() => onOpen(reservation.bookedByPlayerId!)}
    >
      {body}
    </button>
  );
}
