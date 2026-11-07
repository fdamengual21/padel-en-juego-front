import { StatusChip, type StatusTone } from "@/components/StatusChip";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  matchPlayStatusLabel,
  type MatchPlayStatus,
} from "@/lib/matchPlayStatus";

interface MatchPlayStatusChipProps {
  status: MatchPlayStatus;
  /** Explicación corta (p. ej. por qué clasificó sin jugar). Se muestra al hacer click. */
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
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="inline-flex cursor-pointer pointer-events-auto"
            aria-label={hint}
            onClick={(event) => event.stopPropagation()}
          />
        }
      >
        {badge}
      </PopoverTrigger>
      <PopoverContent side="top" className="w-auto max-w-sm p-2">
        <PopoverDescription className="text-xs text-popover-foreground">
          {hint}
        </PopoverDescription>
      </PopoverContent>
    </Popover>
  );
}
