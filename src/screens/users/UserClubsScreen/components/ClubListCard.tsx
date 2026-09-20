import { useState } from "react";
import type { PublicClubListItem } from "@/modules/clubs";
import { formatLocationEs } from "@/lib/dates";
import { formatClubScheduleEs } from "@/lib/clubSchedule";
import { Clock, MapPin } from "lucide-react";

interface ClubListCardProps {
  club: PublicClubListItem;
}

export default function ClubListCard({ club }: ClubListCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const location = formatLocationEs(club.municipalityName, club.provinceName);
  const schedule =
    club.openTime && club.closeTime
      ? formatClubScheduleEs(club.openTime, club.closeTime, club.openDays)
      : null;
  const slots = club.availableSlotsToday;
  const hasSlots = slots > 0;
  const showImage = Boolean(club.coverUrl) && !imageFailed;

  return (
    <article
      className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card"
      data-testid={`public-club-card-${club.id}`}
    >
      <div className="relative aspect-[16/9] w-full bg-muted">
        {showImage ? (
          <img
            src={club.coverUrl ?? ""}
            alt=""
            className="size-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
            Sin imagen
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0 space-y-1">
          <h3 className="truncate text-lg font-semibold tracking-tight">
            {club.name}
          </h3>
          <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            {location ?? "Ubicación no informada"}
          </p>
        </div>

        <div className="mt-auto space-y-2 text-sm">
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="size-3.5 shrink-0" />
            <span className="truncate">
              {schedule ?? "Horario no informado"}
            </span>
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-foreground">
              {formatCourtPriceRange(club.minCourtPrice, club.maxCourtPrice)}
            </p>
            {hasSlots ? (
              <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                {slots} turno{slots === 1 ? "" : "s"} hoy
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Sin turnos hoy</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function formatCourtPriceRange(
  min: number | null,
  max: number | null,
): string {
  if (min == null || max == null) return "Precio no informado";
  const fmt = (value: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(value);
  if (min === max) return fmt(min);
  return `${fmt(min)} – ${fmt(max)}`;
}
