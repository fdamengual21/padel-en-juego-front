import { Badge } from "@/components/ui/badge";
import {
  matchPlayStatusLabel,
  type MatchPlayStatus,
} from "@/lib/matchPlayStatus";
import { cn } from "@/lib/utils";

interface MatchPlayStatusChipProps {
  status: MatchPlayStatus;
  className?: string;
}

const variantByStatus: Record<
  MatchPlayStatus,
  "outline" | "default" | "secondary"
> = {
  pending: "outline",
  started: "default",
  finished: "secondary",
};

export default function MatchPlayStatusChip({
  status,
  className,
}: MatchPlayStatusChipProps) {
  return (
    <Badge
      variant={variantByStatus[status]}
      className={cn(
        "font-semibold",
        status === "started" && "bg-amber-500 text-white border-transparent",
        status === "finished" && "bg-emerald-100 text-emerald-900 border-transparent",
        className,
      )}
      data-testid={`match-play-status-${status}`}
    >
      {matchPlayStatusLabel(status)}
    </Badge>
  );
}
