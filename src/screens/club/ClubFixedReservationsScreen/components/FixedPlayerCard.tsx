import type { CourtFixedReservationPlayer } from "@/modules/reservations";
import ClubPlayerLink from "@/screens/club/components/ClubPlayerLink";
import { shortSlot, weeklyCountLabel } from "../fixedSchedule";

interface FixedPlayerCardProps {
  group: CourtFixedReservationPlayer;
  onOpen: () => void;
}

export default function FixedPlayerCard({ group, onOpen }: FixedPlayerCardProps) {
  const name = `${group.playerFirstName} ${group.playerLastName}`.trim() || "Sin nombre";
  const slots = [...group.series]
    .sort((left, right) => left.weekday - right.weekday || left.startTime.localeCompare(right.startTime))
    .map(shortSlot);

  return (
    <article
      className="flex min-w-0 flex-col rounded-xl border border-border bg-card"
      data-testid={`fixed-player-${group.playerId}`}
    >
      <div className="border-b border-border px-3 py-3">
        <ClubPlayerLink
          playerId={group.playerId}
          name={name}
          avatarUrl={group.playerAvatarUrl}
          size="sm"
          className="w-full min-w-0"
        />
      </div>
      <button
        type="button"
        className="flex flex-1 flex-col gap-1 px-3 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        aria-label={`Ver turnos fijos de ${name}`}
        onClick={onOpen}
      >
        <p className="text-sm font-medium">{weeklyCountLabel(group.series.length)}</p>
        <p className="text-sm text-muted-foreground">{slots.join(" · ")}</p>
      </button>
    </article>
  );
}
