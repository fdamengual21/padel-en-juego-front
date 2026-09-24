import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, MapPin } from "lucide-react";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import TournamentCard from "@/components/tournaments/TournamentCard";
import { buttonVariants } from "@/components/ui/button";
import { formatScheduleShortEs } from "@/lib/dates";
import { ROUTES } from "@/router/routes";
import { cn } from "@/lib/utils";
import type { PlayerUpcomingReservation } from "@/domain";

function ReservationCard({ item }: { item: PlayerUpcomingReservation }) {
  const { reservation, courtName, clubName } = item;
  return (
    <article
      className="rounded-xl border border-border bg-card px-4 py-3"
      data-testid={`player-reservation-${reservation.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium text-foreground">{courtName}</p>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            {clubName}
          </p>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarClock className="size-3.5 shrink-0" />
            {formatScheduleShortEs(reservation.startsAt)}
            {" – "}
            {new Date(reservation.endsAt).toLocaleTimeString("es-AR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
          Reservada
        </span>
      </div>
    </article>
  );
}

export default function UserHomeScreen() {
  const { clubId, playerId, isAuthenticated } = useMockSession();
  const { data, isLoading } = useQuery({
    queryKey: ["player-feed", clubId, playerId],
    queryFn: () =>
      Api.TournamentOpsService().getPlayerFeed(clubId, playerId),
  });

  return (
    <div className="space-y-6 p-4 md:p-0" data-testid="player-home">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Inicio</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAuthenticated
            ? "Próximos torneos y tus reservas."
            : "Explorá torneos. Ingresá para ver tus reservas."}
        </p>
      </div>

      {isLoading || !data ? (
        <p className="text-sm text-muted-foreground">Cargando inicio…</p>
      ) : (
        <>
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-foreground">
                Próximos torneos
              </h3>
              <Link
                to={ROUTES.player.tournaments}
                className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
              >
                Ver todos
              </Link>
            </div>
            {data.upcomingTournaments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tenés torneos próximos.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.upcomingTournaments.map((t) => (
                  <TournamentCard
                    key={t.id}
                    tournament={t}
                    to={ROUTES.player.tournamentDetail(t.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {isAuthenticated ? (
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">
                Próximas reservas
              </h3>
              {data.upcomingReservations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tenés reservas próximas.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.upcomingReservations.map((item) => (
                    <ReservationCard key={item.reservation.id} item={item} />
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="space-y-3 rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-medium text-foreground">
                Tus reservas
              </h3>
              <p className="text-sm text-muted-foreground">
                Ingresá para ver y gestionar tus reservas de cancha.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  to={ROUTES.auth.login}
                  className={cn(buttonVariants(), "h-9")}
                >
                  Ingresar
                </Link>
                <Link
                  to={ROUTES.auth.register}
                  className={cn(buttonVariants({ variant: "outline" }), "h-9")}
                >
                  Crear cuenta
                </Link>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
