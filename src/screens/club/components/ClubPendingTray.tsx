import { useState } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { Bell, ChevronRight } from "lucide-react";
import Api from "@/api/Api";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { PlayerReservationStatusChip } from "@/components/reservations";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { CourtReservation } from "@/domain";
import ClubPlayerLink from "@/screens/club/components/ClubPlayerLink";
import DashboardIconWell from "@/screens/club/components/DashboardIconWell";

dayjs.locale("es");

interface DashboardPendingTrayProps {
  reservations: CourtReservation[];
  isLoading: boolean;
  isError: boolean;
  canMutate: boolean;
  viewAllTo?: string;
  /** Alto máximo del listado. En el resumen entra un pedido; el resto se scrollea. */
  listClassName?: string;
  className?: string;
  onChanged: () => void;
}

export default function DashboardPendingTray({
  reservations,
  isLoading,
  isError,
  canMutate,
  viewAllTo,
  listClassName = "max-h-80",
  className,
  onChanged,
}: DashboardPendingTrayProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const run = async (id: string, action: () => Promise<unknown>, success: string) => {
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
    <section
      id="reservas-pendientes"
      className={cn("rounded-xl border border-border bg-card p-4", className)}
      data-testid="pending-reservations-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <DashboardIconWell icon={Bell} />
          <h3 className="text-sm font-semibold text-foreground">Pendientes de atención</h3>
          {!isLoading && !isError && reservations.length > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold leading-none text-white tabular-nums">
              {reservations.length}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {viewAllTo ? (
            <Link
              to={viewAllTo}
              className="inline-flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground"
            >
              Ver todas
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : null}
          {canMutate && reservations.length > 0 ? (
            <Button type="button" size="sm" variant="outline" className="bg-card" disabled={busyId != null} onClick={acceptAll}>
              {`Aceptar todas (${reservations.length})`}
            </Button>
          ) : null}
        </div>
      </div>
      {isLoading ? (
        <PendingTraySkeleton />
      ) : isError ? (
        <EmptyState
          className="mt-3 bg-card"
          icon={Bell}
          tone="error"
          title="No se pudieron cargar los pedidos"
          description="Reintentá en un momento."
        />
      ) : reservations.length === 0 ? (
        <EmptyState
          className="mt-3 bg-card"
          icon={Bell}
          title="No hay pedidos pendientes"
          description="Cuando alguien pida un turno, aparece acá."
        />
      ) : (
        <ul className={cn("mt-2 overflow-y-auto", listClassName)}>
          {reservations.map((reservation) => {
            const rejecting = rejectId === reservation.id;
            const name = playerName(reservation);
            const when = formatWhen(reservation);
            const price = formatMoney(reservation.price);
            const court = reservation.courtName || "Cancha";
            return (
              <li key={reservation.id} className="border-b border-border py-3 last:border-b-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
                <CourtThumb name={court} imageUrl={reservation.courtImageUrl} />
                <div className="grid min-w-0 flex-1 grid-cols-1 items-center gap-y-1 sm:grid-cols-[9.5rem_minmax(0,1fr)_auto] sm:gap-x-6">
                  <p className="order-1 text-sm font-medium sm:order-0">{when.day}</p>
                  <ClubPlayerLink
                    className="order-4 sm:order-0"
                    playerId={reservation.bookedByPlayerId}
                    name={name}
                    avatarUrl={reservation.playerAvatarUrl}
                  />
                  <div className="order-7 mt-1 flex flex-wrap items-center gap-2 sm:order-0 sm:row-span-3 sm:mt-0 sm:justify-end sm:self-center">
                    {canMutate && !rejecting ? (
                      <>
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
                      </>
                    ) : null}
                  </div>
                  <p className="order-2 text-sm text-muted-foreground sm:order-0">{when.time}</p>
                  <p className="order-5 text-sm tabular-nums sm:order-0 sm:pl-11">{price ?? ""}</p>
                  <p className="order-3 text-sm text-muted-foreground sm:order-0">{court}</p>
                  <div className="order-6 sm:order-0 sm:pl-11">
                    <PlayerReservationStatusChip status="pending" />
                  </div>
                </div>
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

function PendingTraySkeleton() {
  return (
    <div className="mt-3 space-y-3" aria-hidden>
      <div className="h-16 animate-pulse rounded-md bg-muted" />
      <div className="h-16 animate-pulse rounded-md bg-muted" />
    </div>
  );
}

function CourtThumb({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  return (
    <div className="relative h-20 w-full shrink-0 overflow-hidden rounded-md bg-muted sm:h-auto sm:w-16 sm:self-stretch">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-muted-foreground">
          {initials(name)}
        </span>
      )}
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((part) => part.charAt(0).toUpperCase()).join("");
  return letters || "C";
}

function playerName(reservation: CourtReservation): string {
  return `${reservation.playerFirstName ?? ""} ${reservation.playerLastName ?? ""}`.trim() || "Jugador";
}

function formatWhen(reservation: CourtReservation): { day: string; time: string } {
  const start = dayjs(reservation.startsAt);
  const end = dayjs(reservation.endsAt);
  if (!start.isValid()) return { day: "Sin horario", time: "" };
  const weekday = start.format("ddd").replace(".", "");
  const short = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1, 3)}`;
  const month = start.format("MMM").replace(".", "");
  return {
    day: `${short} ${start.format("D")} ${month}`,
    time: `${start.format("HH:mm")} – ${end.format("HH:mm")}`,
  };
}

function formatMoney(value: number | null | undefined): string | null {
  if (value == null || value <= 0) return null;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}
