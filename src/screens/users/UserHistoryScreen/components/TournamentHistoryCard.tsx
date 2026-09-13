import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type {
  ClientTournamentOutcome,
  PlayerTournamentHistoryEntry,
} from "@core-api";
import MatchCard from "@/components/tournaments/MatchCard";
import {
  formatTournamentDayEs,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

function outcomeLabel(outcome: ClientTournamentOutcome): string {
  switch (outcome) {
    case "champion":
      return "Campeón";
    case "eliminated":
      return "Eliminado";
    case "in_progress":
      return "En curso";
    case "registered":
      return "Inscripto";
  }
}

function phaseSummary(entry: PlayerTournamentHistoryEntry): string {
  if (entry.outcome === "champion") return "Campeón · Final";
  if (entry.phaseReachedLabel) {
    if (entry.outcome === "eliminated") {
      return `Eliminado · llegó a ${entry.phaseReachedLabel}`;
    }
    return `Fase: ${entry.phaseReachedLabel}`;
  }
  return outcomeLabel(entry.outcome);
}

interface TournamentHistoryCardProps {
  entry: PlayerTournamentHistoryEntry;
}

export default function TournamentHistoryCard({
  entry,
}: TournamentHistoryCardProps) {
  const [open, setOpen] = useState(false);
  const title = `${entry.tournamentName} · ${entry.clubName}`;

  return (
    <article
      className="overflow-hidden rounded-xl border border-border bg-card"
      data-testid={`tournament-history-${entry.tournamentId}-${entry.categoryId}`}
    >
      <button
        type="button"
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-foreground">{title}</p>
            <span className="text-xs font-medium text-muted-foreground">
              {phaseSummary(entry)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatTournamentDayEs(entry.startDate)}
            {entry.endDate && entry.endDate !== entry.startDate
              ? ` → ${formatTournamentDayEs(entry.endDate)}`
              : ""}
          </p>
          <p className="text-sm text-muted-foreground">
            {entry.categoryName}
            {entry.partnerName ? ` · con ${entry.partnerName}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            Partidos {entry.matchesWon}–{entry.matchesLost}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "mt-1 size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="space-y-2 border-t border-border bg-muted/20 px-3 py-3">
          <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Partidos del torneo
          </p>
          {entry.matches.length === 0 ? (
            <p className="px-1 text-sm text-muted-foreground">
              Sin partidos registrados en esta participación.
            </p>
          ) : (
            entry.matches.map((item) => (
              <MatchCard
                key={item.match.id}
                match={item.match}
                pairALabel={item.pairALabel}
                pairBLabel={item.pairBLabel}
                courtLabel={item.courtLabel}
                phaseLabel={item.phaseLabel}
              />
            ))
          )}
        </div>
      ) : null}
    </article>
  );
}
