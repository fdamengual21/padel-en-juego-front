import Avatar, { type AvatarSize } from "@/components/Avatar";
import { cn } from "@/lib/utils";

interface ParticipantPairLineProps {
  names: [string, string];
  avatars?: [string | null, string | null];
  size?: AvatarSize;
  muted?: boolean;
}

export default function ParticipantPairLine({
  names,
  avatars = [null, null],
  size = "sm",
  muted = false,
}: ParticipantPairLineProps) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex min-w-0 items-center gap-2">
        <Avatar name={names[0]} imageUrl={avatars[0]} size={size} alt={names[0]} />
        <span className={cn("truncate font-medium", muted && "text-muted-foreground")}>
          {names[0]}
        </span>
      </div>
      {names[1] ? (
        <div className="flex min-w-0 items-center gap-2">
          <Avatar name={names[1]} imageUrl={avatars[1]} size={size} alt={names[1]} />
          <span className={cn("truncate font-medium", muted && "text-muted-foreground")}>
            {names[1]}
          </span>
        </div>
      ) : null}
    </div>
  );
}
