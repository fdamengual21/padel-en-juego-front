import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, CircleAlert } from "lucide-react";
import Api from "@/api/Api";
import { EmptyState } from "@/components/EmptyState";
import RankingDetailView, { type RankingDetailTab } from "@/components/rankings/RankingDetailView";
import { ROUTES } from "@/router/routes";

export default function UserClubRankingDetailScreen() {
  const { clubId = "", circuitId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: RankingDetailTab = searchParams.get("tab") === "fechas" ? "fechas" : "ranking";
  const query = useQuery({
    queryKey: ["public-ranking", circuitId],
    queryFn: () => Api.RankingService().getPublic(circuitId),
    enabled: Boolean(circuitId),
  });

  return (
    <div className="space-y-4 p-4 md:p-0" data-testid="public-ranking-detail">
      <Link
        to={clubId ? ROUTES.player.clubRanking(clubId) : ROUTES.player.ranking}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Rankings
      </Link>
      {query.isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p> : null}
      {query.isError || (!query.isLoading && !query.data) ? (
        <EmptyState tone="error" icon={CircleAlert} title="No se pudo cargar el ranking" />
      ) : null}
      {query.data ? (
        <RankingDetailView
          circuit={query.data}
          standingsSource="public"
          tournamentTo={(id) => ROUTES.player.tournamentDetail(id)}
          activeTab={activeTab}
          onTabChange={(tab) => {
            const next = new URLSearchParams(searchParams);
            if (tab === "fechas") next.set("tab", tab);
            else next.delete("tab");
            setSearchParams(next, { replace: true });
          }}
        />
      ) : null}
    </div>
  );
}
