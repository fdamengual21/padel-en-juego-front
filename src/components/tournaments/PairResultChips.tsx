import { Medal, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AwardRound, PairResult } from "@/modules/tournament-ops";
import { displayZoneName } from "./BracketView";

const ROUND_LABELS: Record<AwardRound, string> = {
  champion: "Campeón",
  final: "Finalista",
  semi: "Semifinalista",
  quarter: "Cuartos de final",
  roundOf16: "Octavos",
  roundOf32: "16avos",
  group: "Quedó en zona",
};

export function awardRoundLabel(round: AwardRound): string {
  return ROUND_LABELS[round] ?? "Participó";
}

type FinishTier = "champion" | "podium" | "draw" | "group";

function finishTier(round: AwardRound): FinishTier {
  if (round === "champion") return "champion";
  if (round === "final" || round === "semi") return "podium";
  if (round === "group") return "group";
  return "draw";
}

function finishLabel(result: PairResult): string {
  if (result.round === "group" && result.zone) {
    return `${result.zone.position}° ${displayZoneName(result.zone.name)}`;
  }
  return awardRoundLabel(result.round);
}

const TIER_CLASSES: Record<FinishTier, string> = {
  champion: "",
  podium: "border-foreground/30 font-semibold text-foreground",
  draw: "text-foreground",
  group: "text-muted-foreground",
};

interface PairResultChipsProps {
  result: PairResult | undefined;
  scoring: boolean;
  className?: string;
}

export default function PairResultChips({ result, scoring, className }: PairResultChipsProps) {
  if (!result) return null;
  const tier = finishTier(result.round);

  return (
    <div
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      data-testid={`pair-result-${result.pairId}`}
    >
      <Badge
        variant={tier === "champion" ? "default" : tier === "group" ? "secondary" : "outline"}
        className={TIER_CLASSES[tier]}
      >
        {tier === "champion" ? <Trophy data-icon="inline-start" /> : null}
        {tier === "podium" ? <Medal data-icon="inline-start" /> : null}
        {finishLabel(result)}
      </Badge>
      {scoring && result.points != null && result.points > 0 ? (
        <Badge variant="outline" className="border-primary/40 font-semibold">
          +{result.points} pts
        </Badge>
      ) : null}
    </div>
  );
}
