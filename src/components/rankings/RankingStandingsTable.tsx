import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CircleAlert, Info, Medal } from "lucide-react";
import Api from "@/api/Api";
import Avatar from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import ListPagination from "@/components/ListPagination";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

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
}

/** Tabla del circuito, paginada de a 20. Solo jugadores con puntos de fechas finalizadas. Sin título: la tab ya lo indica. */
export default function RankingStandingsTable({ circuitId, source }: RankingStandingsTableProps) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: [source === "club" ? "club-ranking" : "public-ranking", circuitId, "standings", page],
    queryFn: () =>
      source === "club"
        ? Api.RankingService().getClubStandings(circuitId, { page, pageSize: PAGE_SIZE })
        : Api.RankingService().getPublicStandings(circuitId, { page, pageSize: PAGE_SIZE }),
    enabled: Boolean(circuitId),
    placeholderData: keepPreviousData,
  });
  const data = query.data;

  return (
    <div className="space-y-3" data-testid="ranking-standings">
      <Alert variant="info">
        <Info />
        <AlertDescription>El ranking se actualiza solo cuando se finaliza cada fecha.</AlertDescription>
      </Alert>

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
                return (
                  <li
                    key={row.player.id}
                    className={cn(ROW_GRID, "px-3 py-2.5 text-sm sm:px-4")}
                    data-testid={`ranking-row-${row.player.id}`}
                  >
                    <span className="flex justify-center">
                      <Place place={row.place} />
                    </span>
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Avatar name={name} imageUrl={row.player.avatarUrl} size="xs" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">{name}</span>
                        <span className="block text-xs text-muted-foreground sm:hidden">{dates} fechas</span>
                      </span>
                    </span>
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
    </div>
  );
}

function Place({ place }: { place: number }) {
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
