import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

interface MatchPlayStatusChipProps {
  status: MatchPlayStatus;
  /** Explicación corta (p. ej. por qué clasificó sin jugar). Se muestra como tooltip. */
  hint?: string | null;
  className?: string;
}

const variantByStatus: Record<
  MatchPlayStatus,
  "outline" | "default" | "secondary"
> = {
  pending: "outline",
  started: "default",
  finished: "secondary",
  qualified: "secondary",
};

export default function MatchPlayStatusChip({
  status,
  hint,
  className,
}: MatchPlayStatusChipProps) {
  const badge = (
    <Badge
      variant={variantByStatus[status]}
      className={cn(
        "font-semibold",
        status === "started" && "bg-amber-500 text-white border-transparent",
        status === "finished" && "bg-emerald-100 text-emerald-900 border-transparent",
        status === "qualified" && "bg-primary/25 text-primary-strong border-transparent",
        className,
      )}
      data-testid={`match-play-status-${status}`}
    >
      {matchPlayStatusLabel(status)}
    </Badge>
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
