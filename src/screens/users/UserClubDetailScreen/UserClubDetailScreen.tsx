import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, CircleAlert } from "lucide-react";
import Api from "@/api/Api";
import { EmptyState } from "@/components/EmptyState";
import { isFeatureEnabled } from "@/config/features";
import { ROUTES } from "@/router/routes";
import ClubCourtsByDay from "./components/ClubCourtsByDay";
import ClubTopPlayers from "./components/ClubTopPlayers";
import ClubUpcomingTournaments from "./components/ClubUpcomingTournaments";
import PublicClubHero from "./components/PublicClubHero";

export default function UserClubDetailScreen() {
  const { clubId = "" } = useParams();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["public-club", clubId],
    queryFn: () => Api.ClubService().getPublic(clubId),
    enabled: Boolean(clubId),
    staleTime: 2 * 60_000,
  });

  return (
    <div className="space-y-6 p-4 md:p-0" data-testid="public-club-detail">
      <Link
        to={ROUTES.player.clubs}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Clubes
      </Link>

      {isError ? (
        <EmptyState
          tone="error"
          icon={CircleAlert}
          title={error instanceof Error ? error.message : "No se pudo cargar el club."}
        />
      ) : (
        <>
          {isLoading || !data ? <DetailSkeleton /> : null}
          {data ? (
            <>
              <PublicClubHero club={data} />
              <ClubCourtsByDay club={data} />
            </>
          ) : null}
          <ClubUpcomingTournaments clubId={clubId} />
          {isFeatureEnabled("ranking") ? <ClubTopPlayers clubId={clubId} /> : null}
        </>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="h-80 animate-pulse rounded-2xl bg-muted sm:h-96" />
      <div className="space-y-3">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="h-20 animate-pulse rounded-xl bg-muted" />
        <div className="h-48 animate-pulse rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
