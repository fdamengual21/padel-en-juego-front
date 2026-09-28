import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, CircleAlert, Trophy } from "lucide-react";
import Api from "@/api/Api";
import { EmptyState } from "@/components/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/router/routes";
import { cn } from "@/lib/utils";
import PublicClubFacts from "./components/PublicClubFacts";
import PublicClubHero from "./components/PublicClubHero";
import TodayFreeSlots from "./components/TodayFreeSlots";

export default function UserClubDetailScreen() {
  const { clubId = "" } = useParams();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["public-club", clubId],
    queryFn: () => Api.ClubService().getPublic(clubId),
    enabled: Boolean(clubId),
  });

  return (
    <div className="space-y-5 p-4 md:p-0" data-testid="public-club-detail">
      <Link
        to={ROUTES.player.clubs}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Clubes
      </Link>

      {isLoading ? <DetailSkeleton /> : null}

      {isError ? (
        <EmptyState
          tone="error"
          icon={CircleAlert}
          title={error instanceof Error ? error.message : "No se pudo cargar el club."}
        />
      ) : null}

      {data ? (
        <>
          <PublicClubHero club={data} />
          <PublicClubFacts club={data} />
          <TodayFreeSlots club={data} />
          <Link
            to={ROUTES.player.clubAvailability(data.id)}
            className={cn(buttonVariants(), "h-9")}
            data-testid="public-club-availability-link"
          >
            Ver disponibilidad
          </Link>
          <section className="space-y-3" data-testid="public-club-tournaments">
            <h3 className="text-lg font-semibold tracking-tight">Próximos torneos</h3>
            <EmptyState
              icon={Trophy}
              title="Todavía no hay torneos próximos."
              description="Cuando el club publique un torneo, va a aparecer acá."
              className="min-h-40"
            />
          </section>
        </>
      ) : null}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="h-52 animate-pulse rounded-2xl bg-muted" />
      <div className="h-16 animate-pulse rounded-xl bg-muted" />
      <div className="h-24 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
