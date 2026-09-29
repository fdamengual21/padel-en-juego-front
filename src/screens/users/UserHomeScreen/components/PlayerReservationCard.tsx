import { useState } from "react";
import dayjs from "dayjs";
import { ChevronRight } from "lucide-react";
import { PlayerReservationStatusChip } from "@/components/reservations";
import type { PlayerReservation } from "@/modules/reservations";

interface PlayerReservationCardProps {
  reservation: PlayerReservation;
  onOpen: (reservation: PlayerReservation) => void;
}

export default function PlayerReservationCard({
  reservation,
  onOpen,
}: PlayerReservationCardProps) {
  const [courtFailed, setCourtFailed] = useState(false);
  const [clubFailed, setClubFailed] = useState(false);
  const courtUrl = reservation.courtImageUrl;
  const clubUrl = reservation.club.avatarUrl ?? reservation.club.coverUrl;
  const imageUrl = courtUrl && !courtFailed ? courtUrl : clubUrl && !clubFailed ? clubUrl : null;
  const showingCourt = Boolean(courtUrl) && !courtFailed;
  const court = reservation.courtName || "Cancha";

  return (
    <button
      type="button"
      className="flex w-96 shrink-0 cursor-pointer items-stretch gap-3 rounded-xl border border-border bg-card p-3.5 text-left"
      data-testid={`player-reservation-card-${reservation.id}`}
      onClick={() => onOpen(reservation)}
    >
      <div className="relative w-16 shrink-0 overflow-hidden rounded-md bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
            onError={() => {
              if (showingCourt) setCourtFailed(true);
              else setClubFailed(true);
            }}
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-muted-foreground">
            {initials(reservation.club.name)}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-0.5">
        <p className="truncate text-sm font-semibold tracking-tight">{reservation.club.name}</p>
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 text-sm leading-snug text-muted-foreground">
            {`${court} · ${formatTurnoCompact(reservation)}`}
          </p>
          <PlayerReservationStatusChip
            status={reservation.status}
            isFixed={reservation.isFixed}
            withIcon={false}
            className="shrink-0"
          />
        </div>
      </div>
      <ChevronRight className="size-4 shrink-0 self-center text-muted-foreground" aria-hidden />
    </button>
  );
}

function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  return letters || "C";
}

function formatTurnoCompact(reservation: PlayerReservation): string {
  const start = dayjs(reservation.startsAt);
  const end = dayjs(reservation.endsAt);
  if (!start.isValid()) return "Sin horario";
  const weekday = start.format("ddd").replace(".", "");
  const dayName = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1, 3)}`;
  const month = start.format("MMM").replace(".", "").toLowerCase();
  return `${dayName} ${start.format("D")} ${month} · ${start.format("HH:mm")} – ${end.format("HH:mm")}`;
}
