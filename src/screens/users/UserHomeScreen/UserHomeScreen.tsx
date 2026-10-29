import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, CircleAlert, Trophy } from "lucide-react";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import { useUser } from "@/app/UserProvider";
import { useAuthStore } from "@/stores/authStore";
import { EmptyState } from "@/components/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/router/routes";
import { cn } from "@/lib/utils";
import type { PlayerReservation } from "@/modules/reservations";
import HomeTournamentCard from "../components/HomeTournamentCard";
import PlayerReservationDetailModal from "./components/PlayerReservationDetailModal";
import PlayerWeekBoard from "./components/PlayerWeekBoard";

export default function UserHomeScreen() {
  const { playerId, isAuthenticated } = useMockSession();
  const { isResolvingUser } = useUser();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const profilePending = Boolean(token?.trim()) && !user;
  const locationReady = !isResolvingUser && !profilePending;
  const provinceId = locationReady ? (user?.provinceId ?? null) : null;
  const municipalityId = locationReady ? (user?.municipalityId ?? null) : null;
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<PlayerReservation | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["player-feed", provinceId, municipalityId],
    queryFn: () =>
      Api.TournamentOpsService().getPlayerFeed({
        provinceId,
        municipalityId,
      }),
    enabled: locationReady,
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
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Trophy className="size-4" aria-hidden />
          </span>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            Próximos torneos
          </h3>
          {data && data.upcomingTournaments.length > 0 ? (
            <Link
              to={ROUTES.player.tournaments}
              className="inline-flex items-center text-sm font-medium text-primary-strong underline-offset-4 hover:underline"
            >
              Ver todos
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : null}
        </div>
        {isLoading || !data ? (
          <p className="text-sm text-muted-foreground">Cargando torneos…</p>
        ) : data.upcomingTournaments.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="No hay torneos próximos"
            description="Cuando haya torneos cerca, van a aparecer acá."
            className="min-h-0 py-8"
          >
            <Link
              to={ROUTES.player.tournaments}
              className={cn(buttonVariants({ variant: "outline" }), "h-9")}
            >
              Ver torneos
            </Link>
          </EmptyState>
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
