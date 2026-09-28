import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, ChevronRight, CircleAlert } from "lucide-react";
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
              <UpcomingTurnsMobileHeader />
              <div className="flex items-start gap-6 rounded-2xl bg-primary/15 p-5">
                <UpcomingTurnsSummary
                  count={(reservationsQuery.data ?? []).length}
                  loading={reservationsQuery.isLoading}
                />
                {(reservationsQuery.data ?? []).length > 0 ? (
                  <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {(reservationsQuery.data ?? []).map((reservation, index) => (
                      <div key={reservation.id} className="flex min-w-60 flex-1">
                        {index > 0 ? (
                          <div className="mx-3 w-px shrink-0 self-stretch bg-border" aria-hidden />
                        ) : null}
                        <PlayerReservationCard
                          reservation={reservation}
                          onOpen={setSelected}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
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

function UpcomingTurnsMobileHeader() {
  return (
    <div className="flex items-center justify-between gap-3 md:hidden">
      <p className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        <Calendar className="size-3.5 shrink-0" aria-hidden />
        Próximos turnos · 7 días
      </p>
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
        Ver todos
        <ChevronRight className="size-3.5" aria-hidden />
      </span>
    </div>
  );
}

function UpcomingTurnsSummary({ count, loading }: { count: number; loading: boolean }) {
  const line = loading
    ? "Cargando turnos…"
    : count === 0
      ? "No tenés turnos próximos"
      : count === 1
        ? "Tenés 1 turno próximo"
        : `Tenés ${count} turnos próximos`;

  return (
    <div className="hidden shrink-0 items-start gap-2.5 md:flex">
      <Calendar className="mt-px size-3.5 shrink-0 text-foreground" aria-hidden />
      <div className="flex min-w-0 flex-col gap-2.5">
        <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
          Próximos turnos · 7 días
        </p>
        <p className="flex items-center gap-0.5 text-sm font-medium whitespace-nowrap text-foreground">
          {line}
          {count > 0 ? <ChevronRight className="size-3.5 shrink-0" aria-hidden /> : null}
        </p>
      </div>
    </div>
  );
}
