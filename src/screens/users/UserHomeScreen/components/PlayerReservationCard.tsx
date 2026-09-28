import { useState } from "react";
import dayjs from "dayjs";
import { ChevronRight, MapPin } from "lucide-react";
import { PlayerReservationStatusChip } from "@/components/reservations";
import { formatLocationEs } from "@/lib/dates";
import type { PlayerReservation } from "@/modules/reservations";

interface PlayerReservationCardProps {
  reservation: PlayerReservation;
  onOpen: (reservation: PlayerReservation) => void;
}

export default function PlayerReservationCard({
  reservation,
  onOpen,
}: PlayerReservationCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const location = formatLocationEs(
    reservation.club.municipalityName,
    reservation.club.provinceName,
  );
  const imageUrl = reservation.club.avatarUrl ?? reservation.club.coverUrl;
  const showImage = Boolean(imageUrl) && !imageFailed;

  return (
    <div className="min-w-0 flex-1">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-2.5 px-2 py-1 text-left"
        data-testid={`player-reservation-card-${reservation.id}`}
        onClick={() => onOpen(reservation)}
      >
        <div className="relative size-11 shrink-0 self-start overflow-hidden rounded-md bg-muted">
          {showImage ? (
            <img
              src={imageUrl ?? ""}
              alt=""
              className="absolute inset-0 size-full object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex size-full items-center justify-center px-0.5 text-center text-[8px] text-muted-foreground">
              Sin imagen
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="truncate text-sm font-semibold tracking-tight">{reservation.club.name}</p>
          <p className="flex items-center gap-1 truncate text-[11px] leading-none text-muted-foreground">
            <MapPin className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{location ?? "Ubicación no informada"}</span>
          </p>
          <p className="truncate pl-4 text-[11px] leading-none text-muted-foreground">
            {formatTurnoCompact(reservation)}
          </p>
          <PlayerReservationStatusChip
            status={reservation.status}
            isFixed={reservation.isFixed}
            className="self-start"
          />
        </div>
        <ChevronRight className="size-4 shrink-0 self-center text-muted-foreground" aria-hidden />
      </button>
    </div>
  );
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
