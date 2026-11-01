import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CircleAlert, Info, Medal, Trophy } from "lucide-react";
import Api from "@/api/Api";
import Avatar from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import ListPagination from "@/components/ListPagination";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { ClubRankingStanding } from "@/modules/rankings";
import RankingPodiumBanner from "./RankingPodiumBanner";
import RankingPlayerDialog from "./RankingPlayerDialog";

const PAGE_SIZE = 20;

const PODIUM: Record<number, string> = {
  1: "bg-primary text-primary-foreground",
  2: "bg-muted text-foreground ring-1 ring-border",
  3: "bg-warning-muted text-warning-foreground",
};

const ROW_GRID = "grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[3.5rem_minmax(0,1fr)_6rem_5rem]";

export type RankingStandingsSource = "club" | "public";

interface RankingStandingsTableProps {
  circuitId: string;
  /** `club` usa la sesión del club; `public` la ficha pública. */
  source: RankingStandingsSource;
  /** Ya se jugaron todas las fechas: se muestra el podio y se destaca al campeón. */
  finished?: boolean;
}

/** Tabla del circuito, paginada de a 20. Solo jugadores con puntos de fechas finalizadas. Sin título: la tab ya lo indica. */
export default function RankingStandingsTable({ circuitId, source, finished = false }: RankingStandingsTableProps) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ClubRankingStanding | null>(null);
  const standingsKey = (p: number) => [source === "club" ? "club-ranking" : "public-ranking", circuitId, "standings", p];
  const fetchPage = (p: number) =>
    source === "club"
      ? Api.RankingService().getClubStandings(circuitId, { page: p, pageSize: PAGE_SIZE })
      : Api.RankingService().getPublicStandings(circuitId, { page: p, pageSize: PAGE_SIZE });
  const query = useQuery({
    queryKey: standingsKey(page),
    queryFn: () => fetchPage(page),
    enabled: Boolean(circuitId),
    placeholderData: keepPreviousData,
  });
  const data = query.data;
  const podiumQuery = useQuery({
    queryKey: standingsKey(1),
    queryFn: () => fetchPage(1),
    enabled: Boolean(circuitId) && finished,
  });
  const podium = finished ? (podiumQuery.data?.items.filter((row) => row.place <= 3) ?? []) : [];

  return (
    <div className="space-y-3" data-testid="ranking-standings">
      {podium.length > 0 ? (
        <RankingPodiumBanner rows={podium} onOpen={setSelected} />
      ) : !finished ? (
        <Alert variant="info">
          <Info />
          <AlertDescription>El ranking se actualiza solo cuando se finaliza cada fecha.</AlertDescription>
        </Alert>
      ) : null}

      {query.isLoading ? <p className="text-sm text-muted-foreground">Cargando tabla…</p> : null}
      {query.isError ? (
        <EmptyState
          tone="error"
          icon={CircleAlert}
          title="No se pudo cargar la tabla"
          className="min-h-0 py-10"
        />
      ) : null}

      {data && data.totalItems === 0 ? (
        <EmptyState
          icon={Medal}
          title="Todavía no hay puntos"
          description="Los jugadores aparecen cuando se finaliza la primera fecha."
          className="min-h-0 py-10"
        />
      ) : null}

      {data && data.totalItems > 0 ? (
        <>
          <div
            className={cn(
              "overflow-hidden rounded-xl border border-border bg-card transition-opacity",
              query.isPlaceholderData && "opacity-60",
            )}
          >
            <div
              className={cn(
                ROW_GRID,
                "border-b border-border bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground sm:px-4",
              )}
            >
              <span className="text-center">Pos.</span>
              <span>Jugador</span>
              <span className="hidden text-center sm:block">Fechas</span>
              <span className="text-right">Puntos</span>
            </div>
            <ol className="divide-y divide-border">
              {data.items.map((row) => {
                const name = `${row.player.firstName} ${row.player.lastName}`.trim();
                const dates = `${row.datesPlayed}/${data.totalDates}`;
                const champion = finished && row.place === 1;
                return (
                  <li
                    key={row.player.id}
                    className={cn(ROW_GRID, "px-3 py-2.5 text-sm sm:px-4", champion && "bg-primary/10")}
                    data-testid={`ranking-row-${row.player.id}`}
                  >
                    <span className="flex justify-center">
                      <Place place={row.place} champion={champion} />
                    </span>
                    <button
                      type="button"
                      className="-mx-1.5 -my-1 flex min-w-0 cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      onClick={() => setSelected(row)}
                      data-testid={`ranking-player-${row.player.id}`}
                    >
                      <Avatar name={name} imageUrl={row.player.avatarUrl} size="xs" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">{name}</span>
                        <span className="block text-xs text-muted-foreground sm:hidden">{dates} fechas</span>
                      </span>
                    </button>
                    <span className="hidden text-center tabular-nums text-muted-foreground sm:block">
                      {dates}
                    </span>
                    <span className="text-right font-semibold tabular-nums text-foreground">
                      {row.points.toLocaleString("es-AR")}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
          <ListPagination
            page={data.page}
            totalPages={data.totalPages}
            totalItems={data.totalItems}
            itemLabel={["jugador", "jugadores"]}
            disabled={query.isFetching}
            onPageChange={setPage}
            testId="ranking-standings-pagination"
          />
        </>
      ) : null}

      <RankingPlayerDialog
        row={selected}
        totalDates={data?.totalDates ?? 0}
        source={source}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}

function Place({ place, champion }: { place: number; champion: boolean }) {
  if (champion) {
    return (
      <span
        className="inline-flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
        aria-label={`${place}° · Campeón`}
      >
        <Trophy className="size-3.5" />
      </span>
    );
  }
  const podium = PODIUM[place];
  if (!podium) return <span className="font-medium tabular-nums text-foreground">{place}</span>;
  return (
    <span
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
        podium,
      )}
    >
      {place}
    </span>
  );
}
