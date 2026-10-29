import { DEFAULT_MATCH_RULES, type PlayerMatchView } from "@/domain";
import MatchResultModal from "@/screens/club/ClubTournamentDetailScreen/components/MatchResultModal";

interface PlayerMatchResultDialogProps {
  item: PlayerMatchView | null;
  onOpenChange: (open: boolean) => void;
}

export default function PlayerMatchResultDialog({
  item,
  onOpenChange,
}: PlayerMatchResultDialogProps) {
  return (
    <MatchResultModal
      open={Boolean(item)}
      readOnly
      onOpenChange={onOpenChange}
      match={item?.match ?? null}
      pairANames={item?.pairANames ?? ["Pareja A", ""]}
      pairBNames={item?.pairBNames ?? ["Pareja B", ""]}
      matchRules={item?.matchRules ?? DEFAULT_MATCH_RULES}
      onSubmit={() => undefined}
    />
  );
}
