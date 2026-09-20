import type { DashboardPlayerRef } from "@/domain";
import Avatar from "@/components/Avatar";
import { cn } from "@/lib/utils";

interface DashboardPlayerChipProps {
  player: DashboardPlayerRef;
  muted?: boolean;
  onOpenClient?: (clientId: string) => void;
}

export default function DashboardPlayerChip({
  player,
  muted = false,
  onOpenClient,
}: DashboardPlayerChipProps) {
  const clickable = Boolean(player.clientId && onOpenClient);
  const className = cn(
    "flex min-w-0 max-w-full items-center gap-2 rounded-md text-left",
    muted ? "text-muted-foreground" : "text-foreground",
    clickable &&
      "transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
  );

  const body = (
    <>
      <Avatar
        name={player.displayName}
        imageUrl={player.avatarUrl}
        size="xs"
        alt={player.displayName}
      />
      <span className="truncate text-sm font-medium">{player.displayName}</span>
    </>
  );

  if (clickable) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => onOpenClient?.(player.clientId!)}
      >
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}
