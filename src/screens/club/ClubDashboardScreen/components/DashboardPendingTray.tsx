import { useState } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/es";
import Api from "@/api/Api";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";
import type { CourtReservation } from "@/domain";
import ClubPlayerLink from "@/screens/club/components/ClubPlayerLink";

dayjs.locale("es");

interface DashboardPendingTrayProps {
  reservations: CourtReservation[];
  canMutate: boolean;
  viewAllTo?: string;
  onChanged: () => void;
}

export default function DashboardPendingTray({
  reservations,
  canMutate,
  viewAllTo,
  onChanged,
}: DashboardPendingTrayProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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
    void run(
      "all",
      async () => {
        for (const reservation of reservations) {
          await Api.ReservationService().accept(reservation.id);
        }
      },
      reservations.length === 1 ? "Pedido aceptado" : "Pedidos aceptados",
    );
  };

  return (
    <section className="rounded-xl border border-warning/50 bg-warning/15 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">Pendientes de atención</h3>
        <div className="flex flex-wrap items-center gap-3">
          {viewAllTo ? (
            <Link to={viewAllTo} className="text-sm text-muted-foreground hover:text-foreground">
              Ver todas
            </Link>
          ) : null}
          {canMutate && reservations.length > 0 ? (
            <Button type="button" size="sm" variant="outline" disabled={busyId != null} onClick={acceptAll}>
              {`Aceptar todas (${reservations.length})`}
            </Button>
          ) : null}
        </div>
      </div>
      {reservations.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No hay pedidos pendientes.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {reservations.map((reservation) => {
            const rejecting = rejectId === reservation.id;
            const name = playerName(reservation);
            return (
              <li key={reservation.id} className="rounded-lg border border-border bg-card px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-40">
                    <p className="text-sm font-medium">{formatWhen(reservation)}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{reservation.courtName || "Cancha"}</p>
                  </div>
                  <div className="flex min-w-0 flex-1 items-center">
                    <ClubPlayerLink
                      playerId={reservation.bookedByPlayerId}
                      name={name}
                      avatarUrl={reservation.playerAvatarUrl}
                    />
                  </div>
                  {canMutate && !rejecting ? (
                    <div className="flex gap-2">
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
                  ) : null}
                </div>
                {rejecting ? (
                  <div className="mt-3 space-y-2">
                    <label className="text-sm text-muted-foreground" htmlFor={`dash-reject-${reservation.id}`}>
                      Nota (opcional)
                    </label>
                    <textarea
                      id={`dash-reject-${reservation.id}`}
                      className="min-h-16 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                      value={rejectReason}
                      placeholder="Motivo del rechazo"
                      onChange={(event) => setRejectReason(event.target.value)}
                    />
                    <div className="flex gap-2">
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
                        onClick={() => setRejectId(null)}
                      >
                        Volver
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function playerName(reservation: CourtReservation): string {
  return `${reservation.playerFirstName ?? ""} ${reservation.playerLastName ?? ""}`.trim() || "Jugador";
}

function formatWhen(reservation: CourtReservation): string {
  const start = dayjs(reservation.startsAt);
  const end = dayjs(reservation.endsAt);
  if (!start.isValid()) return "Sin horario";
  const weekday = start.format("ddd").replace(".", "");
  const short = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1, 3)}`;
  return `${short} ${start.format("D")} · ${start.format("HH:mm")}–${end.format("HH:mm")}`;
}
