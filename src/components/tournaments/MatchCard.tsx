import type { Match } from "@core-api";
import Score from "@/components/tournaments/Score";
import StatusBadge from "@/components/tournaments/StatusBadge";

interface MatchCardProps {
  match: Match;
  pairALabel: string;
  pairBLabel: string;
  courtLabel?: string | null;
  phaseLabel?: string;
}

export default function MatchCard({
  match,
  pairALabel,
  pairBLabel,
  courtLabel,
  phaseLabel,
}: MatchCardProps) {
  return (
    <article
      data-testid={`match-card-${match.id}`}
      className="rounded-xl border border-border bg-card px-4 py-3 text-left"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {phaseLabel ?? match.phase}
          {match.scheduledAt ? ` · ${new Date(match.scheduledAt).toLocaleString("es-AR")}` : ""}
        </p>
        <StatusBadge status={match.status} />
      </div>
      {courtLabel ? <p className="text-xs text-muted-foreground mb-2">{courtLabel}</p> : null}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium">{pairALabel}</p>
          <Score sets={match.sets.map((s) => ({ gamesA: s.gamesA, gamesB: s.gamesB }))} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium text-muted-foreground">{pairBLabel}</p>
        </div>
      </div>
    </article>
  );
}
