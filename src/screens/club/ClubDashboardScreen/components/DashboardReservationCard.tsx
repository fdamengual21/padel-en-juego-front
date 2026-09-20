import type { DashboardUpcomingReservation } from "@/domain";
import StatusBadge from "@/components/tournaments/StatusBadge";
import DashboardPlayerChip from "./DashboardPlayerChip";

interface DashboardReservationCardProps {
  item: DashboardUpcomingReservation;
  onOpenClient: (clientId: string) => void;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(value: number | null): string | null {
  if (value == null) return null;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DashboardReservationCard({
  item,
  onOpenClient,
}: DashboardReservationCardProps) {
  const { reservation, client } = item;
  const price = formatMoney(reservation.price);

  return (
    <article
      data-testid={`dashboard-reservation-${reservation.id}`}
      className="rounded-xl border border-border bg-card px-4 py-3"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Reserva de cancha
          </p>
          <p className="truncate text-sm font-medium text-foreground">
            {item.courtName}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatWhen(reservation.startsAt)}
            {" – "}
            {new Date(reservation.endsAt).toLocaleTimeString("es-AR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {price ? ` · ${price}` : ""}
          </p>
        </div>
        <StatusBadge status={reservation.status} />
      </div>

      {client ? (
        <DashboardPlayerChip
          player={{
            playerId: null,
            clientId: client.id,
            displayName: client.displayName,
            avatarUrl: client.avatarUrl,
          }}
          onOpenClient={onOpenClient}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Cliente no encontrado</p>
      )}
    </article>
  );
}
