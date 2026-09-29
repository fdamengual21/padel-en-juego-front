import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, CircleAlert } from "lucide-react";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import { EmptyState } from "@/components/EmptyState";
import TournamentCard from "@/components/tournaments/TournamentCard";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/router/routes";
import { cn } from "@/lib/utils";
import type { PlayerReservation } from "@/modules/reservations";
import PlayerReservationCard from "./components/PlayerReservationCard";
import PlayerReservationDetailModal from "./components/PlayerReservationDetailModal";

export default function UserHomeScreen() {
  const { clubId, playerId, isAuthenticated } = useMockSession();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<PlayerReservation | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["player-feed", clubId, playerId],
    queryFn: () => Api.TournamentOpsService().getPlayerFeed(clubId, playerId),
  });
  const reservationsQuery = useQuery({
    queryKey: ["player-reservations", playerId],
    queryFn: () => Api.ReservationService().listMine(),
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  return (
    <div className="space-y-6 p-4 md:p-0" data-testid="player-home">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Inicio</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAuthenticated
            ? "Próximos torneos y tus turnos."
            : "Explorá torneos. Ingresá para ver tus turnos."}
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-foreground">Próximos torneos</h3>
          <Link
            to={ROUTES.player.tournaments}
            className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            Ver todos
          </Link>
        </div>
        {isLoading || !data ? (
          <p className="text-sm text-muted-foreground">Cargando torneos…</p>
        ) : data.upcomingTournaments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tenés torneos próximos.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.upcomingTournaments.map((tournament) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                to={ROUTES.player.tournamentDetail(tournament.id)}
              />
            ))}
          </div>
        )}
      </section>

      {isAuthenticated ? (
        <section data-testid="player-upcoming-reservations">
          {reservationsQuery.isError ? (
            <EmptyState
              tone="error"
              icon={CircleAlert}
              title={
                reservationsQuery.error instanceof Error
                  ? reservationsQuery.error.message
                  : "No se pudieron cargar tus turnos."
              }
            />
          ) : (
            <div className="space-y-3">
              <UpcomingTurnsSummary
                count={(reservationsQuery.data ?? []).length}
                loading={reservationsQuery.isLoading}
              />
              {(reservationsQuery.data ?? []).length > 0 ? (
                <div className="flex items-stretch gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {(reservationsQuery.data ?? []).map((reservation) => (
                    <PlayerReservationCard
                      key={reservation.id}
                      reservation={reservation}
                      onOpen={setSelected}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          )}
          <PlayerReservationDetailModal
            reservation={selected}
            onOpenChange={(open) => {
              if (!open) setSelected(null);
            }}
            onCancelled={() => {
              void queryClient.invalidateQueries({ queryKey: ["player-reservations"] });
            }}
          />
        </section>
      ) : (
        <section className="space-y-3 rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-medium text-foreground">Tus turnos</h3>
          <p className="text-sm text-muted-foreground">
            Ingresá para ver y gestionar tus reservas de cancha.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to={ROUTES.auth.login} className={cn(buttonVariants(), "h-9")}>
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
    </div>
  );
}

function UpcomingTurnsSummary({ count, loading }: { count: number; loading: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Calendar className="size-4" aria-hidden />
      </span>
      <h3 className="text-lg font-semibold tracking-tight text-foreground">Próximos 7 días</h3>
      {!loading ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-success px-1.5 text-[11px] font-semibold leading-none text-white tabular-nums">
          {count}
        </span>
      ) : null}
    </div>
  );
}
