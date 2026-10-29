import { canOpenMatchResult, type PlayerMatchView } from "@/domain";
import MatchCard from "@/components/tournaments/MatchCard";

interface PlayerMatchCardProps {
  item: PlayerMatchView;
  onOpenResult?: (item: PlayerMatchView) => void;
  onOpenPair?: (item: PlayerMatchView, pairId: string) => void;
}

export default function PlayerMatchCard({
  item,
  onOpenResult,
  onOpenPair,
}: PlayerMatchCardProps) {
  // El modal es solo lectura; canEdit acá solo habilita abrir un partido programado.
  const canOpenResult = Boolean(onOpenResult) && canOpenMatchResult(item.match, true);
  return (
    <MatchCard
      match={item.match}
      pairALabel={item.pairALabel}
      pairBLabel={item.pairBLabel}
      pairANames={item.pairANames}
      pairBNames={item.pairBNames}
      pairAAvatars={item.pairAAvatars}
      pairBAvatars={item.pairBAvatars}
      courtLabel={item.courtLabel}
      phaseLabel={item.phaseLabel}
      onOpenResult={canOpenResult ? () => onOpenResult?.(item) : undefined}
      onOpenPair={
        onOpenPair
          ? (side) => {
              const pairId = side === "A" ? item.match.pairAId : item.match.pairBId;
              if (pairId) onOpenPair(item, pairId);
            }
          : undefined
      }
    />
  );
}
