import { Link } from "react-router-dom";
import type { ClubClientDetail, ClientTournamentOutcome } from "@/domain";
import {
  formatScheduleShortEs,
  formatTournamentDayEs,
} from "@/lib/dates";
import { ROUTES } from "@/router/routes";
import { cn } from "@/lib/utils";
import ClientProfileCard from "./ClientProfileCard";

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

interface ClientDetailContentProps {
  data: ClubClientDetail;
  /** Si false, los torneos no son links (útil en modal). Default true. */
  linkTournaments?: boolean;
  className?: string;
}

export default function ClientDetailContent({
  data,
  linkTournaments = true,
  className,
}: ClientDetailContentProps) {
  return (
    <div className={cn("space-y-6", className)} data-testid="client-detail-content">
      <ClientProfileCard
        client={data.client}
        categoryLevel={data.categoryLevel}
        matchesWon={data.matchesWon}
        matchesLost={data.matchesLost}
        tournamentsCount={data.tournamentsCount}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStat label="Reservas" value={data.reservationsCount} />
        <SummaryStat label="Torneos" value={data.tournamentsCount} />
        <SummaryStat
          label="Torneos ganados"
          value={data.tournamentsWon}
          valueClassName="text-success"
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
            {data.client.userId
              ? "Todavía no jugó torneos."
              : "Todavía no jugó torneos en este club."}
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {data.tournaments.map((entry) => {
              const title = `${entry.tournamentName} - ${entry.clubName}`;
              const canLink =
                linkTournaments && entry.clubId === data.client.clubId;
              const body = (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{title}</p>
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
                </>
              );

              return (
                <li key={`${entry.tournamentId}-${entry.categoryId}`}>
                  {canLink ? (
                    <Link
                      to={ROUTES.club.tournamentDetail(entry.tournamentId)}
                      className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/40"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="flex flex-col gap-1 px-4 py-3">{body}</div>
                  )}
                </li>
              );
            })}
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
