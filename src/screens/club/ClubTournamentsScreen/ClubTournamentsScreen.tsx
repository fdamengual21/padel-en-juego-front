import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import TournamentCard from "@/components/tournaments/TournamentCard";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/router/routes";
import { cn } from "@/lib/utils";

export default function ClubTournamentsScreen() {
  const { clubId } = useMockSession();
  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ["tournaments", clubId],
    queryFn: () => Api.TournamentService().list(clubId),
  });

  const categoryQueries = useQueries({
    queries: tournaments.map((t) => ({
      queryKey: ["categories", t.id],
      queryFn: () => Api.TournamentOpsService().listCategories(t.id),
    })),
  });

  return (
    <div className="space-y-6" data-testid="club-tournaments">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Torneos</h2>
        <Link to={ROUTES.club.tournamentNew} className={cn(buttonVariants())}>
          Crear torneo
        </Link>
      </div>
      {isLoading ? <p>Cargando…</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {tournaments.map((t, index) => {
          const categories = categoryQueries[index]?.data ?? [];
          const categoryLabel =
            categories.length > 0
              ? categories.map((c) => c.name).join(" · ")
              : undefined;
          return (
            <TournamentCard
              key={t.id}
              tournament={t}
              categoryLabel={categoryLabel}
              to={ROUTES.club.tournamentDetail(t.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
