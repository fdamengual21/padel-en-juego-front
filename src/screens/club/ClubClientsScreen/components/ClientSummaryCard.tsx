import { Link } from "react-router-dom";
import type { ClubClientSummary } from "@core-api";
import Avatar from "@/components/Avatar";
import { formatLocationEs } from "@/lib/dates";
import { ROUTES } from "@/router/routes";

interface ClientSummaryCardProps {
  summary: ClubClientSummary;
}

export default function ClientSummaryCard({ summary }: ClientSummaryCardProps) {
  const { client } = summary;
  const location = formatLocationEs(client.city, client.province);

  return (
    <Link
      to={ROUTES.club.clientDetail(client.id)}
      className="flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/30"
      data-testid={`client-card-${client.id}`}
    >
      <div className="flex items-center gap-3">
        <Avatar
          name={client.displayName}
          imageUrl={client.avatarUrl}
          size="md"
        />
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">
            {client.displayName}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {client.phone ?? "Sin teléfono"}
          </p>
          {location ? (
            <p className="truncate text-xs text-muted-foreground">{location}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
        <div>
          <p className="text-[11px] uppercase tracking-wide">Reservas</p>
          <p className="text-sm font-semibold tabular-nums text-foreground">
            {summary.reservationsCount}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide">Torneos</p>
          <p className="text-sm font-semibold tabular-nums text-foreground">
            {summary.tournamentsCount}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide">Ganados</p>
          <p className="text-sm font-semibold tabular-nums text-emerald-700">
            {summary.tournamentsWon}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide">Perdidos</p>
          <p className="text-sm font-semibold tabular-nums text-foreground">
            {summary.tournamentsLost}
          </p>
        </div>
      </div>
    </Link>
  );
}
