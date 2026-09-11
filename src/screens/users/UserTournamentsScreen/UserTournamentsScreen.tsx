import { useQueries, useQuery } from "@tanstack/react-query";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import TournamentCard from "@/components/tournaments/TournamentCard";
import { ROUTES } from "@/router/routes";

export default function UserTournamentsScreen() {
  const { clubId } = useMockSession();
  const { data: tournaments = [] } = useQuery({
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
    <div className="p-4 space-y-4" data-testid="player-tournaments">
      <h2 className="text-2xl font-semibold tracking-tight">Torneos</h2>
      <div className="grid gap-3">
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
              to={ROUTES.player.tournamentDetail(t.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
