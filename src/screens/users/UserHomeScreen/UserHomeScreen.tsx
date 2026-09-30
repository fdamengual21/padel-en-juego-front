import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import { EmptyState } from "@/components/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/router/routes";
import { cn } from "@/lib/utils";
import type { PlayerReservation } from "@/modules/reservations";
import HomeTournamentCard from "./components/HomeTournamentCard";
import PlayerReservationDetailModal from "./components/PlayerReservationDetailModal";
import PlayerWeekBoard from "./components/PlayerWeekBoard";

export default function UserHomeScreen() {
  const { clubId, playerId, isAuthenticated } = useMockSession();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<PlayerReservation | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["player-feed", clubId, playerId],
    queryFn: () => Api.TournamentOpsService().getPlayerFeed(clubId, playerId),
  });
  const weekQuery = useQuery({
    queryKey: ["player-week", playerId],
    queryFn: () => Api.TournamentOpsService().getMyWeek(),
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
          <p className="text-sm text-muted-foreground">No hay torneos próximos.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.upcomingTournaments.map((tournament) => (
              <HomeTournamentCard
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
          {weekQuery.isError ? (
            <EmptyState
              tone="error"
              icon={CircleAlert}
              title={
                weekQuery.error instanceof Error
                  ? weekQuery.error.message
                  : "No se pudo cargar la semana."
              }
            />
          ) : (
            <PlayerWeekBoard
              reservations={weekQuery.data?.reservations ?? []}
              events={weekQuery.data?.events ?? []}
              loading={weekQuery.isLoading}
              onOpenReservation={setSelected}
            />
          )}
          <PlayerReservationDetailModal
            reservation={selected}
            onOpenChange={(open) => {
              if (!open) setSelected(null);
            }}
            onCancelled={() => {
              void queryClient.invalidateQueries({ queryKey: ["player-week"] });
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
