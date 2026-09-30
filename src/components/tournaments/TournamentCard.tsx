import { Link } from "react-router-dom";
import type { Tournament } from "@/domain";
import StatusBadge from "@/components/tournaments/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { parseIsoDateOnly } from "@/lib/dates";
import { cn } from "@/lib/utils";

interface TournamentCardProps {
  tournament: Tournament;
  categoryLabel?: string;
  pairsCount?: number;
  to: string;
}

export default function TournamentCard({
  tournament,
  categoryLabel,
  pairsCount,
  to,
}: TournamentCardProps) {
  const embedded =
    tournament.categories?.map((category) => category.name).filter(Boolean).join(" · ") ||
    undefined;
  return (
    <article
      data-testid={`tournament-card-${tournament.id}`}
      className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{tournament.name}</h3>
          <p className="text-sm text-muted-foreground">
            {tournament.clubName ? `${tournament.clubName} · ` : ""}
            {(parseIsoDateOnly(tournament.startDate) ?? new Date(tournament.startDate)).toLocaleDateString(
              "es-AR",
              { day: "2-digit", month: "short" },
            )}
          </p>
        </div>
        <StatusBadge status={tournament.status} />
      </div>
      <p className="text-sm text-muted-foreground">
        {categoryLabel ?? embedded ?? "Sin categoría"}
        {typeof pairsCount === "number" ? ` · ${pairsCount} parejas` : ""}
      </p>
      <Link to={to} className={cn(buttonVariants({ variant: "outline" }), "self-start")}>
        Ver torneo
      </Link>
    </article>
  );
}
