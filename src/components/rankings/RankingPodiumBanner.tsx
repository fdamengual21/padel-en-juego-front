import { Trophy } from "lucide-react";
import Avatar from "@/components/Avatar";
import { cn } from "@/lib/utils";
import type { ClubRankingStanding } from "@/modules/rankings";

interface RankingPodiumBannerProps {
  /** Puestos 1 a 3 de la tabla final. Con empate, varios jugadores comparten puesto. */
  rows: ClubRankingStanding[];
  onOpen: (row: ClubRankingStanding) => void;
}

const PLACE_BADGE: Record<number, string> = {
  1: "bg-primary text-primary-foreground",
  2: "bg-card text-foreground ring-1 ring-border",
  3: "bg-warning-muted text-warning-foreground",
};

function placeLabel(place: number, count: number): string {
  if (place === 1) return count === 1 ? "Campeón" : "Campeones";
  return `${place}° puesto`;
}

/** Podio de un ranking finalizado: primeros, segundos y terceros con su puesto. */
export default function RankingPodiumBanner({ rows, onOpen }: RankingPodiumBannerProps) {
  const groups = [1, 2, 3]
    .map((place) => ({ place, rows: rows.filter((row) => row.place === place) }))
    .filter((group) => group.rows.length > 0);

  return (
    <section
      className="space-y-3 rounded-xl border border-primary/40 bg-primary/15 px-4 py-3"
      data-testid="ranking-podium-banner"
    >
      <div className="flex items-center gap-2">
        <Trophy className="size-5 shrink-0 text-primary-strong" aria-hidden />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-strong">Podio final</p>
          <p className="text-xs text-muted-foreground">Ranking finalizado. Ya se jugaron todas las fechas.</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {groups.map((group) => (
          <div key={group.place} className="min-w-0 space-y-1.5" data-testid={`ranking-podium-${group.place}`}>
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span
                className={cn(
                  "inline-flex size-5 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
                  PLACE_BADGE[group.place],
                )}
              >
                {group.place}
              </span>
              {placeLabel(group.place, group.rows.length)}
            </p>
            <ul className="space-y-1">
              {group.rows.map((row) => {
                const name = `${row.player.firstName} ${row.player.lastName}`.trim();
                return (
                  <li key={row.player.id}>
                    <button
                      type="button"
                      className="-mx-1.5 flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      onClick={() => onOpen(row)}
                      data-testid={`ranking-podium-player-${row.player.id}`}
                    >
                      <Avatar name={name} imageUrl={row.player.avatarUrl} size={group.place === 1 ? "sm" : "xs"} />
                      <span className="min-w-0">
                        <span
                          className={cn(
                            "block truncate text-foreground",
                            group.place === 1 ? "font-semibold" : "font-medium",
                          )}
                        >
                          {name}
                        </span>
                        <span className="block text-xs tabular-nums text-muted-foreground">
                          {row.points.toLocaleString("es-AR")} puntos
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
