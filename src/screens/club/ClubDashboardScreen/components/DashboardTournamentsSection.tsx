import { memo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, Plus, Trophy } from "lucide-react";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import { PERMISSION_CLUB_TOURNAMENTS_WRITE } from "@/authorization";
import { EmptyState } from "@/components/EmptyState";
import { PermissionsGuard } from "@/components/guards";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/router/routes";
import DashboardTournamentRow from "./DashboardTournamentRow";

const PAGE_SIZE = 6;

function DashboardTournamentsSection() {
  const { clubId } = useMockSession();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["club-tournaments", "open", clubId, PAGE_SIZE],
    queryFn: () =>
      Api.TournamentService().list({ scope: "open", page: 1, pageSize: PAGE_SIZE }),
    enabled: Boolean(clubId),
  });

  const items = data?.items ?? [];

  return (
    <section className="space-y-3" data-testid="dashboard-tournaments">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-foreground">Torneos pendientes y en juego</h3>
        <div className="flex items-center gap-3">
          <PermissionsGuard permission={PERMISSION_CLUB_TOURNAMENTS_WRITE}>
            <Link to={ROUTES.club.tournamentNew} className={cn(buttonVariants({ size: "sm" }))}>
              <Plus />
              Crear torneo
            </Link>
          </PermissionsGuard>
          <Link
            to={ROUTES.club.tournaments}
            className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            Ver todos
          </Link>
        </div>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando torneos…</p>
      ) : null}
      {isError ? (
        <EmptyState
          tone="error"
          icon={CircleAlert}
          title="No se pudieron cargar los torneos."
        />
      ) : null}
      {!isLoading && !isError && items.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No hay torneos pendientes ni en juego."
        />
      ) : null}
      {items.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((tournament) => (
            <DashboardTournamentRow
              key={tournament.id}
              tournament={tournament}
              to={ROUTES.club.tournamentDetail(tournament.id)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default memo(DashboardTournamentsSection);
