import { useState } from "react";
import { useMockSession } from "@/app/MockSessionProvider";
import { PERMISSION_CLUB_CLIENTS_READ, usePermissions } from "@/authorization";
import Avatar, { type AvatarSize } from "@/components/Avatar";
import { cn } from "@/lib/utils";
import ClientDetailModal from "@/screens/club/ClubClientDetailScreen/components/ClientDetailModal";

interface ClubPlayerLinkProps {
  playerId?: string | null;
  name: string;
  avatarUrl?: string | null;
  size?: AvatarSize;
  className?: string;
}

export default function ClubPlayerLink({
  playerId,
  name,
  avatarUrl,
  size = "sm",
  className,
}: ClubPlayerLinkProps) {
  const { clubId } = useMockSession();
  const { can } = usePermissions();
  const [open, setOpen] = useState(false);
  const clickable = Boolean(playerId) && Boolean(clubId) && can(PERMISSION_CLUB_CLIENTS_READ);

  const body = (
    <>
      <Avatar name={name} imageUrl={avatarUrl} size={size} alt={name} />
      <span className="truncate text-sm font-medium">{name}</span>
    </>
  );

  return (
    <>
      {clickable ? (
        <button
          type="button"
          className={cn(
            "inline-flex min-w-0 max-w-full cursor-pointer items-center gap-2 rounded-md text-left text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            className,
          )}
          data-testid="club-player-link"
          onClick={(event) => {
            event.stopPropagation();
            setOpen(true);
          }}
        >
          {body}
        </button>
      ) : (
        <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>{body}</span>
      )}
      {clickable ? (
        <ClientDetailModal
          open={open}
          clubId={clubId}
          clientId={playerId ?? null}
          onOpenChange={setOpen}
        />
      ) : null}
    </>
  );
}
