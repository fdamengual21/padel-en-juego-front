import type { DashboardUpcomingMatch } from "@/domain";
import StatusBadge from "@/components/tournaments/StatusBadge";
import DashboardPlayerChip from "./DashboardPlayerChip";

interface DashboardMatchCardProps {
  item: DashboardUpcomingMatch;
  onOpenClient: (clientId: string) => void;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardMatchCard({
  item,
  onOpenClient,
}: DashboardMatchCardProps) {
  const { match } = item;

  return (
    <article
      data-testid={`dashboard-match-${match.id}`}
      className="rounded-xl border border-border bg-card px-4 py-3"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Partido de torneo · {item.phaseLabel}
          </p>
          <p className="truncate text-sm font-medium text-foreground">
            {item.tournamentName}
            <span className="font-normal text-muted-foreground">
              {" "}
              · {item.categoryName}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {formatWhen(match.scheduledAt)}
            {item.courtName ? ` · ${item.courtName}` : ""}
          </p>
        </div>
        <StatusBadge status={match.status} />
      </div>

      <div className="flex justify-start">
        <div className="inline-grid max-w-full grid-cols-[auto_auto_auto] items-center gap-x-2">
          <div className="min-w-0 max-w-[40vw] space-y-1.5 sm:max-w-56">
            {item.pairA.map((player, index) => (
              <DashboardPlayerChip
                key={`${match.id}-a${index}`}
                player={player}
                onOpenClient={onOpenClient}
              />
            ))}
          </div>
          <span
            className="shrink-0 self-center px-1 text-center text-[10px] font-semibold uppercase tracking-wide text-sidebar"
            aria-hidden
          >
            VS
          </span>
          <div className="min-w-0 max-w-[40vw] space-y-1.5 sm:max-w-56">
            {item.pairB.map((player, index) => (
              <DashboardPlayerChip
                key={`${match.id}-b${index}`}
                player={player}
                muted
                onOpenClient={onOpenClient}
              />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
