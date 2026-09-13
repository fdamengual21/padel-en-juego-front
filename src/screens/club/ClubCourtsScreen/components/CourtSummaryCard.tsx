import {
  CalendarClock,
  CalendarPlus,
  Clock3,
  MapPin,
} from "lucide-react";
import type { Club, Court, CourtDaySummary } from "@core-api";
import { Button } from "@/components/ui/button";
import { formatLocationEs } from "@/lib/dates";
import { cn } from "@/lib/utils";

interface CourtSummaryCardProps {
  club: Club;
  court: Court;
  daySummary: CourtDaySummary;
  onConfigure: () => void;
  onSelectSlot: (startsAt: string) => void;
}

function formatMoney(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CourtSummaryCard({
  club,
  court,
  daySummary,
  onConfigure,
  onSelectSlot,
}: CourtSummaryCardProps) {
  const location = formatLocationEs(club.city, club.province);
  const liveStatus = daySummary.liveStatus ?? "closed";
  const statusLabel =
    liveStatus === "available"
      ? "Disponible"
      : liveStatus === "occupied"
        ? "Ocupada"
        : "Cerrado";
  const available = liveStatus === "available";
  const openLabel = `${club.openTime} – ${club.closeTime}`;

  return (
    <article
      className="overflow-hidden rounded-2xl border border-border bg-card"
      data-testid="court-summary-card"
    >
      <div className="grid lg:grid-cols-[minmax(220px,32%)_minmax(0,1fr)]">
        <div className="relative min-h-48 bg-muted lg:min-h-full">
          {court.imageUrl ? (
            <img
              src={court.imageUrl}
              alt={court.name}
              className="absolute inset-0 size-full object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20" />

          <span
            className={cn(
              "absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm",
              available
                ? "border-primary/80 bg-sidebar/75"
                : liveStatus === "occupied"
                  ? "border-warning/80 bg-sidebar/75"
                  : "border-white/30 bg-sidebar/75",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                available
                  ? "bg-primary"
                  : liveStatus === "occupied"
                    ? "bg-warning"
                    : "bg-muted-foreground",
              )}
            />
            {statusLabel}
          </span>

          <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-sidebar/80 px-2.5 py-1 text-xs font-medium text-sidebar-foreground backdrop-blur-sm">
            {court.name}
          </div>
        </div>

        <div className="flex flex-col gap-4 bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Cancha
              </p>
              <h3 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {court.name}
              </h3>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" />
                <span className="truncate">
                  {club.name}
                  {location ? ` · ${location}` : ""}
                </span>
              </p>
            </div>
            <span className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Cancha de pádel
            </span>
          </div>

          <div className="grid gap-3 rounded-xl border border-border bg-card p-3 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border sm:p-0 sm:py-3">
            <div className="space-y-1 px-3">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock3 className="size-3.5" />
                <p className="text-xs">Duración del turno</p>
              </div>
              <p className="text-base font-semibold text-foreground">
                {court.slotDurationMinutes} min
              </p>
              <p className="text-xs text-muted-foreground">
                Base: {formatMoney(court.basePrice)}
              </p>
            </div>

            <div className="space-y-1 px-3">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock3 className="size-3.5" />
                <p className="text-xs">Horario</p>
              </div>
              <p className="text-base font-semibold tabular-nums text-foreground">
                {openLabel}
              </p>
              <p className="text-xs text-muted-foreground">Apertura del día</p>
            </div>

            <div className="space-y-1 px-3">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarClock className="size-3.5" />
                <p className="text-xs">Precios por horario</p>
              </div>
              {(daySummary.priceBands ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin tarifas</p>
              ) : (
                <ul className="space-y-0.5">
                  {daySummary.priceBands.map((band) => (
                    <li
                      key={`${band.startTime}-${band.endTime}-${band.price}`}
                      className="flex items-baseline justify-between gap-2 text-sm"
                    >
                      <span className="text-muted-foreground">
                        {band.startTime} — {band.endTime}
                      </span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatMoney(band.price)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <CalendarClock className="size-3.5 text-muted-foreground" />
              Horarios disponibles
            </p>
            {(daySummary.availableSlots ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin turnos libres este día.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {daySummary.availableSlots.map((slot) => (
                  <button
                    key={slot.startsAt}
                    type="button"
                    className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-sidebar transition-colors hover:bg-muted"
                    onClick={() => onSelectSlot(slot.startsAt)}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <Button type="button" className="gap-2" onClick={onConfigure}>
              <CalendarPlus className="size-4" />
              Configurar cancha
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
