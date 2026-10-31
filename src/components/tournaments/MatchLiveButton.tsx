import { Pause, Play } from "lucide-react";
import type { MatchLiveKind } from "@/domain";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MatchLiveButtonProps {
  matchId: string;
  kind: MatchLiveKind;
  blockedReason: string | null;
  isSaving?: boolean;
  onPlay: (matchId: string) => void;
  onPause: (matchId: string) => void;
}

export default function MatchLiveButton({
  matchId,
  kind,
  blockedReason,
  isSaving = false,
  onPlay,
  onPause,
}: MatchLiveButtonProps) {
  const disabled = blockedReason != null || isSaving;
  const label = kind === "play" ? "Marcar en juego" : "Volver a programado";
  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <button
            type="button"
            aria-label={label}
            data-testid={`match-live-${kind}-${matchId}`}
            disabled={disabled}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            onClick={(event) => {
              event.stopPropagation();
              if (disabled) return;
              if (kind === "play") onPlay(matchId);
              else onPause(matchId);
            }}
          >
            {kind === "play" ? (
              <Play className="h-3 w-3" />
            ) : (
              <Pause className="h-3 w-3" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {blockedReason ?? label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
