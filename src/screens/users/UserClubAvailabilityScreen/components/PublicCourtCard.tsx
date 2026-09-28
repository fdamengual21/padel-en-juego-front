import { useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import { Clock3 } from "lucide-react";
import { isoWeekdayFromDate, listDayPriceRanges, type WeekdayIso } from "@/domain";
import type { PublicClubSlot, PublicCourt } from "@/modules/clubs";
import { formatArs } from "@/lib/money";
import { cn } from "@/lib/utils";

interface PublicCourtCardProps {
  court: PublicCourt;
  selectedDate: Dayjs;
  openTime: string | null;
  closeTime: string | null;
  openDays: readonly WeekdayIso[];
  freeSlots: PublicClubSlot[];
  onSelectSlot: (slot: PublicClubSlot) => void;
}

export default function PublicCourtCard({
  court,
  selectedDate,
  openTime,
  closeTime,
  openDays,
  freeSlots,
  onSelectSlot,
}: PublicCourtCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(court.imageUrl) && !imageFailed;
  const weekday = isoWeekdayFromDate(selectedDate.toDate());
  const priceRanges = listDayPriceRanges({
    openTime,
    closeTime,
    openDays,
    weekday,
    basePrice: court.basePrice,
    rules: court.priceRules,
  });
  const clubOpensToday = openDays.includes(weekday);

  return (
    <article
      className="overflow-hidden rounded-2xl border border-border bg-card"
      data-testid={`public-court-card-${court.id}`}
    >
      <div className="grid lg:grid-cols-[minmax(220px,32%)_minmax(0,1fr)]">
        <div className="relative min-h-28 bg-muted lg:min-h-full">
          {showImage ? (
            <img
              src={court.imageUrl ?? ""}
              alt={court.name}
              className="absolute inset-0 size-full object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              Sin imagen
            </div>
          )}
          <div className="absolute bottom-3 left-3 inline-flex items-center rounded-full bg-sidebar/80 px-2.5 py-1 text-xs font-medium text-sidebar-foreground backdrop-blur-sm">
            {court.name}
          </div>
        </div>

        <div className="flex flex-col gap-3 p-3 sm:p-4">
          <div className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-border sm:p-0 sm:py-3">
            <div className="space-y-1 sm:px-3">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock3 className="size-3.5" />
                <p className="text-xs">Duración del turno</p>
              </div>
              <p className="text-base font-semibold">{court.slotDurationMinutes} min</p>
            </div>
            <div className="space-y-1 sm:px-3">
              <p className="text-xs text-muted-foreground">Precios del día</p>
              {!clubOpensToday ? (
                <p className="text-sm text-muted-foreground">El club no abre este día.</p>
              ) : priceRanges.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin horario de precios.</p>
              ) : (
                <ul className="space-y-0.5">
                  {priceRanges.map((band) => (
                    <li
                      key={`${band.startTime}-${band.endTime}-${band.price}-${band.label ?? ""}`}
                      className="flex items-baseline justify-between gap-2 text-sm"
                    >
                      <span className="text-muted-foreground">
                        {band.startTime} — {band.endTime}
                        {band.label ? ` · ${band.label}` : ""}
                      </span>
                      <span className="font-semibold tabular-nums">{formatArs(band.price)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Horarios disponibles{" "}
              <span className="font-medium capitalize text-muted-foreground">
                {dayjs(selectedDate).format("dddd D [de] MMMM")}
              </span>
            </p>
            {freeSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin turnos libres este día.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {freeSlots.map((slot) => (
                  <button
                    key={slot.startsAt}
                    type="button"
                    className={cn(
                      "rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    )}
                    onClick={() => onSelectSlot(slot)}
                  >
                    {slot.label}
                    <span className="text-foreground"> · {formatArs(slot.price)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
