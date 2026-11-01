import { useQuery } from "@tanstack/react-query";
import { CircleAlert, Trophy } from "lucide-react";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import { EmptyState } from "@/components/EmptyState";
import HomeTournamentCard from "@/components/tournaments/HomeTournamentCard";
import { ROUTES } from "@/router/routes";

const UPCOMING_PAGE_SIZE = 6;

interface ClubUpcomingTournamentsProps {
  clubId: string;
}

export default function ClubUpcomingTournaments({ clubId }: ClubUpcomingTournamentsProps) {
  const { userId } = useMockSession();
  const query = useQuery({
    queryKey: ["public-club-tournaments", clubId, userId ?? "guest"],
    queryFn: () =>
      Api.TournamentService().listPublic({ clubId, page: 1, pageSize: UPCOMING_PAGE_SIZE }),
    enabled: Boolean(clubId),
  });

  return (
    <section className="space-y-3" data-testid="public-club-tournaments">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Trophy className="size-5 text-primary-strong" aria-hidden />
          Próximos torneos
        </h3>
        <p className="text-xs text-muted-foreground">Torneos que organiza el club.</p>
      </div>

      {query.isLoading ? (
        <div
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
          role="status"
          aria-label="Cargando torneos"
        >
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-[104px] animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : query.isError && !query.data ? (
        <EmptyState
          tone="error"
          icon={CircleAlert}
          title={
            query.error instanceof Error ? query.error.message : "No se pudieron cargar los torneos."
          }
          className="min-h-0 py-8"
        />
      ) : !query.data || query.data.items.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Todavía no hay torneos próximos."
          description="Cuando el club publique un torneo, va a aparecer acá."
          className="min-h-0 py-8"
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {query.data.items.map((tournament) => (
            <HomeTournamentCard
              key={tournament.id}
              tournament={tournament}
              to={ROUTES.player.tournamentDetail(tournament.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
