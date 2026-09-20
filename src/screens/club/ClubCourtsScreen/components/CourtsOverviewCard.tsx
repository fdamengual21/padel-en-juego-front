import type { CourtDayOverviewItem, CourtLiveStatus } from "@/domain";
import { cn } from "@/lib/utils";

interface CourtsOverviewCardProps {
  items: CourtDayOverviewItem[];
  selectedCourtId: string | null;
  onSelectCourt: (courtId: string) => void;
  onSelectSlot?: (courtId: string, startsAt: string) => void;
  onOpenDetail: (courtId: string) => void;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function statusLabel(status: CourtLiveStatus): string {
  if (status === "available") return "Disponible";
  if (status === "occupied") return "Ocupada";
  return "Cerrado";
}

export default function CourtsOverviewCard({
  items,
  selectedCourtId,
  onSelectCourt,
  onSelectSlot,
  onOpenDetail,
}: CourtsOverviewCardProps) {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2"
      data-testid="courts-overview-card"
    >
      {items.map((item) => {
        const selected = item.court.id === selectedCourtId;
        const { liveStatus } = item;
        const prices =
          item.priceBands.length > 0
            ? item.priceBands
                .map(
                  (band) =>
                    `${band.startTime}–${band.endTime} ${formatMoney(band.price)}`,
                )
                .join(" · ")
            : `Base ${formatMoney(item.court.basePrice)}`;

        return (
          <article
            key={item.court.id}
            className={cn(
              "overflow-hidden rounded-2xl border border-border bg-card transition-colors",
              selected && "border-primary bg-primary/5 ring-1 ring-primary/30",
            )}
          >
            <div className="relative aspect-[16/9] bg-muted">
              {item.court.imageUrl ? (
                <img
                  src={item.court.imageUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                  Sin imagen
                </div>
              )}
            </div>
            <div className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <button
                type="button"
                className="min-w-0 text-left"
                onClick={() => onSelectCourt(item.court.id)}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-foreground">
                    {item.court.name}
                  </p>
                  {item.court.status === "inactive" ? (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Inactiva
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      liveStatus === "available"
                        ? "border-primary/40 text-sidebar"
                        : liveStatus === "occupied"
                          ? "border-warning/50 text-foreground"
                          : "border-border text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        liveStatus === "available"
                          ? "bg-primary"
                          : liveStatus === "occupied"
                            ? "bg-warning"
                            : "bg-muted-foreground",
                      )}
                    />
                    {statusLabel(liveStatus)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="text-foreground">
                    Duración: {item.court.slotDurationMinutes} min
                  </span>
                  <span className="mx-1.5 text-border">·</span>
                  <span>Precios por horario: {prices}</span>
                </p>
              </button>
              <button
                type="button"
                className="shrink-0 text-xs font-medium text-sidebar underline-offset-2 hover:underline"
                onClick={() => onOpenDetail(item.court.id)}
              >
                Ver detalle
              </button>
            </div>

            <div className="mt-3 space-y-1.5">
              <p className="text-xs font-medium text-foreground">
                Turnos disponibles
              </p>
              {item.availableSlots.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Sin turnos libres este día.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {item.availableSlots.map((slot) =>
                    onSelectSlot ? (
                      <button
                        key={slot.startsAt}
                        type="button"
                        className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-sidebar transition-colors hover:bg-muted"
                        onClick={() =>
                          onSelectSlot(item.court.id, slot.startsAt)
                        }
                      >
                        {slot.label}
                      </button>
                    ) : (
                      <span
                        key={slot.startsAt}
                        className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground"
                      >
                        {slot.label}
                      </span>
                    ),
                  )}
                </div>
              )}
            </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
