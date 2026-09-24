import dayjs from "dayjs";
import "dayjs/locale/es";
import type { CourtDayOverviewItem, CourtLiveStatus } from "@/domain";
import { COURT_STATUS_LABELS } from "@/domain";
import { cn } from "@/lib/utils";

interface CourtsOverviewCardProps {
  items: CourtDayOverviewItem[];
  onSelectSlot?: (courtId: string, startsAt: string) => void;
  onOpenDetail: (courtId: string) => void;
}

dayjs.locale("es");

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
  onSelectSlot,
  onOpenDetail,
}: CourtsOverviewCardProps) {
  return (
    <div className="flex flex-col gap-2" data-testid="courts-overview-card">
      {items.map((item) => {
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
              "flex min-h-28 flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary hover:bg-primary/5 md:flex-row",
            )}
          >
            <button
              type="button"
              className="group relative h-40 w-full shrink-0 bg-muted md:h-auto md:w-44 md:self-stretch"
              aria-label={`Ver detalle de ${item.court.name}`}
              onClick={() => onOpenDetail(item.court.id)}
            >
              {item.court.imageUrl ? (
                <img
                  src={item.court.imageUrl}
                  alt=""
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center px-2 text-center text-xs text-muted-foreground">
                  Sin imagen
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-sidebar/60 text-xs font-medium text-sidebar-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                Ver detalle
              </span>
            </button>

            <div className="flex min-w-0 flex-1 flex-col justify-start gap-1.5 px-4 py-2">
              <div className="min-w-0 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {item.court.name}
                  </p>
                  {item.court.status !== "active" ? (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {COURT_STATUS_LABELS[item.court.status]}
                    </span>
                  ) : (
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
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground md:truncate">
                  <span className="font-medium capitalize text-foreground">
                    {dayjs(item.date).format("dddd D [de] MMMM YYYY")}
                  </span>
                  <span className="mx-1.5 text-border">·</span>
                  <span className="text-foreground">
                    Duración: {item.court.slotDurationMinutes} min
                  </span>
                  <span className="mx-1.5 text-border">·</span>
                  <span>Precios por horario: {prices}</span>
                </p>
              </div>

              <div className="min-w-0">
                {item.availableSlots.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {item.message || "Sin turnos libres este día."}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {item.availableSlots.map((slot) =>
                      onSelectSlot ? (
                        <button
                          key={slot.startsAt}
                          type="button"
                          className="shrink-0 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-sidebar transition-colors hover:bg-muted"
                          onClick={() =>
                            onSelectSlot(item.court.id, slot.startsAt)
                          }
                        >
                          {slot.label}
                        </button>
                      ) : (
                        <span
                          key={slot.startsAt}
                          className="shrink-0 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground"
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
