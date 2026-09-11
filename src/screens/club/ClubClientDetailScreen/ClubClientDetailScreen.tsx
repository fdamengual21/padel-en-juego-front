import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ClientTournamentOutcome } from "@core-api";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import { buttonVariants } from "@/components/ui/button";
import {
  formatLocationEs,
  formatScheduleShortEs,
  formatTournamentDayEs,
} from "@/lib/dates";
import { ROUTES } from "@/router/routes";
import { cn } from "@/lib/utils";

function outcomeLabel(outcome: ClientTournamentOutcome): string {
  switch (outcome) {
    case "champion":
      return "Campeón";
    case "eliminated":
      return "Eliminado";
    case "in_progress":
      return "En curso";
    case "registered":
      return "Inscripto";
  }
}

export default function ClubClientDetailScreen() {
  const { clientId = "" } = useParams();
  const { clubId } = useMockSession();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["club-client", clubId, clientId],
    queryFn: () => Api.TournamentOpsService().getClubClientDetail(clubId, clientId),
    enabled: Boolean(clientId),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando cliente…</p>;
  }

  if (isError || !data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">No se encontró el cliente.</p>
        <Link to={ROUTES.club.clients} className={cn(buttonVariants({ variant: "outline" }))}>
          Volver a clientes
        </Link>
      </div>
    );
  }

  const { client } = data;
  const location = formatLocationEs(client.city, client.province);
  const contact = [client.phone, client.email].filter(Boolean).join(" · ");

  return (
    <div className="space-y-6" data-testid="club-client-detail">
      <div className="space-y-2">
        <Link
          to={ROUTES.club.clients}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Clientes
        </Link>
        <h2 className="text-2xl font-semibold tracking-tight">{client.displayName}</h2>
        <p className="text-sm text-muted-foreground">
          {[contact || null, location].filter(Boolean).join(" · ") || "Sin contacto"}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStat label="Reservas" value={data.reservationsCount} />
        <SummaryStat label="Torneos" value={data.tournamentsCount} />
        <SummaryStat
          label="Torneos ganados"
          value={data.tournamentsWon}
          valueClassName="text-emerald-700"
        />
        <SummaryStat label="Torneos perdidos" value={data.tournamentsLost} />
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">Por categoría</h3>
        {data.byCategory.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin torneos por categoría.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {data.byCategory.map((row) => (
              <li
                key={row.categoryId}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <span className="font-medium">{row.categoryName}</span>
                <span className="text-muted-foreground">
                  {row.tournamentCount} torneo{row.tournamentCount === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">Torneos</h3>
        {data.tournaments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no jugó torneos en este club.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {data.tournaments.map((entry) => (
              <li key={`${entry.tournamentId}-${entry.categoryId}`}>
                <Link
                  to={ROUTES.club.tournamentDetail(entry.tournamentId)}
                  className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{entry.tournamentName}</p>
                    <span className="text-xs font-medium text-muted-foreground">
                      {outcomeLabel(entry.outcome)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatTournamentDayEs(entry.startDate)}
                    {entry.endDate && entry.endDate !== entry.startDate
                      ? ` → ${formatTournamentDayEs(entry.endDate)}`
                      : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {entry.categoryName}
                    {entry.partnerName ? ` · con ${entry.partnerName}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Partidos {entry.matchesWon}–{entry.matchesLost}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">Reservas recientes</h3>
        {data.recentReservations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin reservas registradas.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {data.recentReservations.map((reservation) => (
              <li
                key={reservation.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <span className="font-medium">
                  {formatScheduleShortEs(reservation.startsAt)}
                </span>
                <span className="text-muted-foreground">
                  {reservation.status === "completed"
                    ? "Completada"
                    : reservation.status === "booked"
                      ? "Reservada"
                      : "Cancelada"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

interface SummaryStatProps {
  label: string;
  value: number;
  valueClassName?: string;
}

function SummaryStat({ label, value, valueClassName }: SummaryStatProps) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", valueClassName)}>
        {value}
      </p>
    </div>
  );
}
