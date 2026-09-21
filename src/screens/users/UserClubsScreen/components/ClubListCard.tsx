import { useState } from "react";
import { ChevronRight, Clock, MapPin } from "lucide-react";
import type { PublicClubListItem } from "@/modules/clubs";
import { Badge } from "@/components/ui/badge";
import { formatLocationEs } from "@/lib/dates";
import { formatClubScheduleEs } from "@/lib/clubSchedule";
import { cn } from "@/lib/utils";

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
      <div className="relative aspect-[5/3] w-full bg-muted md:aspect-[16/10]">
        {showImage ? (
          <img
            src={club.coverUrl ?? ""}
            alt=""
            className="size-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[11px] text-muted-foreground md:text-sm">
            Sin imagen
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-2 md:gap-2 md:p-3">
        <div className="flex items-start justify-between gap-1">
          <h3 className="min-w-0 truncate text-sm font-semibold tracking-tight md:text-base">
            {club.name}
          </h3>
          <ChevronRight
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </div>

        <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground md:gap-1.5 md:text-sm">
          <MapPin className="size-3 shrink-0 md:size-3.5" />
          <span className="truncate">{location ?? "Ubicación no informada"}</span>
        </p>
        <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground md:gap-1.5 md:text-sm">
          <Clock className="size-3 shrink-0 md:size-3.5" />
          <span className="truncate">{schedule ?? "Horario no informado"}</span>
        </p>

        <div className="mt-auto flex items-center justify-between gap-1 pt-0.5">
          <Badge
            variant="secondary"
            className={cn(
              "h-auto max-w-full truncate px-1.5 py-0.5 text-[10px] font-medium md:text-xs",
              hasSlots
                ? "bg-success/15 text-success"
                : "bg-warning/15 text-warning",
            )}
          >
            {slots} turno{slots === 1 ? "" : "s"} hoy
          </Badge>
          <p className="min-w-0 truncate text-right text-[11px] text-muted-foreground md:text-xs">
            {formatCourtPriceRange(club.minCourtPrice, club.maxCourtPrice)}
          </p>
        </div>
      </div>
    </article>
  );
}

function formatCourtPriceRange(
  min: number | null,
  max: number | null,
): string {
  if (min == null || max == null) return "Sin precio definido";
  const fmt = (value: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(value);
  if (min === max) return fmt(min);
  return `${fmt(min)} – ${fmt(max)}`;
}
