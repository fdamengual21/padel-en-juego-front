import { Trophy } from "lucide-react";
import ParticipantPairLine from "@/components/tournaments/ParticipantPairLine";

interface TournamentChampionBannerProps {
  names: [string, string];
  avatars?: [string | null, string | null];
  onOpen: () => void;
}

export default function TournamentChampionBanner({
  names,
  avatars,
  onOpen,
}: TournamentChampionBannerProps) {
  return (
    <button
      type="button"
      data-testid="tournament-champion-banner"
      className="flex w-full items-center gap-3 rounded-xl border border-primary/40 bg-primary/15 px-4 py-3 text-left transition-colors hover:bg-primary/25"
      onClick={onOpen}
    >
      <Trophy className="size-6 shrink-0 text-primary-strong" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-strong">
          Campeones
        </p>
        <ParticipantPairLine names={names} avatars={avatars} size="sm" />
      </div>
    </button>
  );
}
