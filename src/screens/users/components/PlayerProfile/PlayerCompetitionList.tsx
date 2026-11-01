import { useInfiniteQuery } from "@tanstack/react-query";
import { Award, Loader2 } from "lucide-react";
import Api from "@/api/Api";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import type { PlayerMatchView, PublicPlayerSeason } from "@/domain";
import PlayerCircuitItem from "./PlayerCircuitItem";
import PlayerTournamentItem from "./PlayerTournamentItem";

const PAGE_SIZE = 10;

interface PlayerCompetitionListProps {
  userId: string;
  season: PublicPlayerSeason;
  onOpenResult: (item: PlayerMatchView) => void;
  onOpenPair: (item: PlayerMatchView, pairId: string) => void;
}

export default function PlayerCompetitionList({
  userId,
  season,
  onOpenResult,
  onOpenPair,
}: PlayerCompetitionListProps) {
  const query = useInfiniteQuery({
    queryKey: ["public-player-competitions", userId],
    queryFn: ({ pageParam }) =>
      Api.TournamentOpsService().getPublicPlayerCompetitions(userId, {
        page: pageParam,
        pageSize: PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });

  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <section className="space-y-3" data-testid="public-player-competitions">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h3 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
            <Award className="size-5 text-primary-strong" aria-hidden />
            Últimos torneos jugados
          </h3>
          <p className="text-xs text-muted-foreground">
            Torneos, fechas de circuito y circuitos terminados.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Temporada {season.year}:</span>
          <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-bold text-foreground tabular-nums">
            {season.tournamentsPlayed} {season.tournamentsPlayed === 1 ? "Torneo" : "Torneos"}
          </span>
        </div>
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-8" role="status" aria-label="Cargando">
          <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : query.isError && items.length === 0 ? (
        <EmptyState
          icon={Award}
          tone="error"
          title="No pudimos cargar los torneos"
          description={query.error instanceof Error ? query.error.message : undefined}
        />
      ) : items.length === 0 ? (
        <EmptyState icon={Award} title="Todavía no jugó torneos" />
      ) : (
        <div className="space-y-2">
          {items.map((item) =>
            item.kind === "circuit" ? (
              <PlayerCircuitItem
                key={`circuit-${item.circuit.circuitId}`}
                userId={userId}
                circuit={item.circuit}
                onOpenResult={onOpenResult}
                onOpenPair={onOpenPair}
              />
            ) : (
              <PlayerTournamentItem
                key={`tournament-${item.tournament.pairId}`}
                userId={userId}
                tournament={item.tournament}
                onOpenResult={onOpenResult}
                onOpenPair={onOpenPair}
              />
            ),
          )}
        </div>
      )}

      {query.isFetchNextPageError ? (
        <p className="text-center text-sm text-destructive">No pudimos cargar más torneos.</p>
      ) : null}

      {query.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {query.isFetchingNextPage ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {query.isFetchingNextPage ? "Cargando…" : "Ver más"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
