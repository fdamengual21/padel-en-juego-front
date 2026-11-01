import { StatusChip, type StatusTone } from "@/components/StatusChip";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  matchPlayStatusLabel,
  type MatchPlayStatus,
} from "@/lib/matchPlayStatus";

interface MatchPlayStatusChipProps {
  status: MatchPlayStatus;
  /** Explicación corta (p. ej. por qué clasificó sin jugar). Se muestra como tooltip. */
  hint?: string | null;
  className?: string;
}

const toneByStatus: Record<MatchPlayStatus, StatusTone> = {
  pending: "scheduled",
  started: "live",
  finished: "done",
  qualified: "success",
};

export default function MatchPlayStatusChip({
  status,
  hint,
  className,
}: MatchPlayStatusChipProps) {
  const badge = (
    <StatusChip
      tone={toneByStatus[status]}
      label={matchPlayStatusLabel(status)}
      className={className}
      data-testid={`match-play-status-${status}`}
    />
  );
  if (!hint) return badge;
  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex pointer-events-auto" />}>
          {badge}
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">{hint}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
