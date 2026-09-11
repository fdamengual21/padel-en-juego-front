import type { SetScore } from "@core-api";
import { cn } from "@/lib/utils";

interface ScoreProps {
  sets: SetScore[];
  className?: string;
}

export function formatMatchScoreLine(sets: SetScore[]): string {
  if (!sets.length) return "Cargar";
  return sets
    .map((s) =>
      s.tiebreakA != null && s.tiebreakB != null
        ? `${s.gamesA}-${s.gamesB}(${Math.min(s.tiebreakA, s.tiebreakB)})`
        : `${s.gamesA}-${s.gamesB}`,
    )
    .join(" ");
}

/** Resultado legible: sets + quién ganó. */
export function formatMatchResultLabel(
  match: {
    status: string;
    sets: SetScore[];
    winnerPairId: string | null;
    pairAId: string | null;
    pairBId: string | null;
  },
  pairLabels: Record<string, string>,
): string {
  if (match.status !== "finished" || !match.sets.length) return "Cargar";
  const score = formatMatchScoreLine(match.sets);
  const winnerLabel = match.winnerPairId
    ? pairLabels[match.winnerPairId] ?? "Ganador"
    : null;
  if (!winnerLabel) return score;
  return `${score} · gana ${winnerLabel}`;
}

export default function Score({ sets, className }: ScoreProps) {
  if (!sets.length) {
    return <span className={cn("text-muted-foreground text-sm", className)}>—</span>;
  }
  return (
    <div className={cn("flex gap-2 font-semibold tracking-tight tabular-nums", className)}>
      {sets.map((set, index) => (
        <span key={index} className="min-w-8 text-center">
          {set.gamesA}-{set.gamesB}
        </span>
      ))}
    </div>
  );
}
