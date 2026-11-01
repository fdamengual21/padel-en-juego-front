import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CircleAlert, Medal } from "lucide-react";
import Api from "@/api/Api";
import Avatar from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { formatCategoryLevel, isCategoryLevel } from "@/domain";
import { cn } from "@/lib/utils";
import type { ClubRankingStanding } from "@/modules/rankings";
import { ROUTES } from "@/router/routes";

const TOP_SIZE = 5;

interface ClubTopPlayersProps {
  clubId: string;
}

const placeClass: Record<number, string> = {
  1: "bg-primary text-primary-foreground",
  2: "bg-sidebar text-sidebar-foreground",
  3: "bg-muted text-foreground ring-1 ring-border",
};

export default function ClubTopPlayers({ clubId }: ClubTopPlayersProps) {
  const [circuitId, setCircuitId] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["public-club-rankings", clubId, "live", "top", TOP_SIZE],
    queryFn: () => Api.RankingService().listPublicByClub(clubId, { scope: "live", top: TOP_SIZE }),
    enabled: Boolean(clubId),
  });

  const circuits = (query.data ?? []).filter((item) => (item.topStandings?.length ?? 0) > 0);
  const current = circuits.find((item) => item.id === circuitId) ?? circuits[0];

  if (query.isSuccess && circuits.length === 0) return null;

  return (
    <section className="space-y-3" data-testid="public-club-top-players">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Medal className="size-5 text-primary-strong" aria-hidden />
            Top jugadores del club
          </h3>
          <p className="text-xs text-muted-foreground">
            Puntos sumados en el ranking en curso del club.
          </p>
        </div>
        {current ? (
          <Link
            to={ROUTES.player.clubRankingDetail(clubId, current.id)}
            className="inline-flex items-center gap-1 text-xs font-medium text-foreground hover:underline"
          >
            Ver ranking completo
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>

      {query.isLoading ? (
        <div
          className="space-y-2 rounded-2xl border border-border bg-card p-3"
          role="status"
          aria-label="Cargando ranking"
        >
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : query.isError ? (
        <EmptyState
          tone="error"
          icon={CircleAlert}
          title="No se pudo cargar el ranking."
          className="min-h-0 py-8"
        />
      ) : current ? (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-3">
          {circuits.length > 1 ? (
            <div className="flex flex-wrap gap-1.5">
              {circuits.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  size="sm"
                  variant={item.id === current.id ? "default" : "outline"}
                  onClick={() => setCircuitId(item.id)}
                >
                  {item.categoryName || item.name}
                </Button>
              ))}
            </div>
          ) : null}
          <ol className="space-y-2">
            {(current.topStandings ?? []).map((row) => (
              <TopPlayerRow key={row.player.id} row={row} />
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}

function TopPlayerRow({ row }: { row: ClubRankingStanding }) {
  const name = `${row.player.firstName} ${row.player.lastName}`.trim();
  const level = row.player.categoryLevel;
  const meta = [
    isCategoryLevel(level) ? `Categoría ${formatCategoryLevel(level)}` : null,
    `${row.points} pts`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex items-center gap-3 rounded-xl bg-muted/50 p-2.5">
      <span
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums",
          placeClass[row.place] ?? "bg-card text-muted-foreground ring-1 ring-border",
        )}
      >
        {row.place}
      </span>
      <Avatar name={name} imageUrl={row.player.avatarUrl} size="sm" />
      <div className="min-w-0 flex-1">
        {row.player.userId ? (
          <Link
            to={ROUTES.player.playerProfile(row.player.userId)}
            className="block truncate text-sm font-semibold text-foreground hover:underline"
          >
            {name}
          </Link>
        ) : (
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
        )}
        <p className="truncate text-xs text-muted-foreground">{meta}</p>
      </div>
      <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
        {row.datesPlayed === 1 ? "1 fecha" : `${row.datesPlayed} fechas`}
      </span>
    </li>
  );
}
