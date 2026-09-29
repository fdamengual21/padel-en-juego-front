import { useState } from "react";
import { Clock3 } from "lucide-react";
import { formatArs } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface CourtListingPriceRange {
  startTime: string;
  endTime: string;
  price: number;
  label?: string | null;
}

export interface CourtListingSlot {
  key: string;
  label: string;
  price?: number | null;
  pending?: boolean;
  onSelect?: () => void;
}

export interface CourtListingStatus {
  label: string;
  tone: "available" | "occupied" | "closed" | "neutral";
}

interface CourtListingCardProps {
  name: string;
  imageUrl?: string | null;
  testId?: string;
  durationMinutes: number;
  dateLabel: string;
  priceRanges: CourtListingPriceRange[];
  pricesEmptyMessage?: string;
  slots: CourtListingSlot[];
  slotsEmptyMessage: string;
  status?: CourtListingStatus | null;
  /** Click en la foto. En el club abre el detalle; en el jugador, el visor. */
  onImageClick?: () => void;
  imageClickLabel?: string;
  /** Texto al pasar el mouse, solo cuando el click no es el visor. */
  imageHint?: string;
}

export default function CourtListingCard({
  name,
  imageUrl,
  testId,
  durationMinutes,
  dateLabel,
  priceRanges,
  pricesEmptyMessage = "Sin horario de precios.",
  slots,
  slotsEmptyMessage,
  status,
  onImageClick,
  imageClickLabel,
  imageHint,
}: CourtListingCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !imageFailed;
  const imageClickable = Boolean(onImageClick) && (showImage || Boolean(imageHint));

  const media = showImage ? (
    <img
      src={imageUrl ?? ""}
      alt=""
      className="absolute inset-0 size-full object-cover"
      onError={() => setImageFailed(true)}
    />
  ) : (
    <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
      Sin imagen
    </div>
  );

  return (
    <article
      className="overflow-hidden rounded-2xl border border-border bg-card"
      data-testid={testId}
    >
      <div className="grid lg:grid-cols-[minmax(220px,32%)_minmax(0,1fr)]">
        <div className="relative min-h-28 bg-muted lg:min-h-full">
          {imageClickable ? (
            <button
              type="button"
              className="group absolute inset-0 cursor-pointer"
              aria-label={imageClickLabel ?? name}
              onClick={onImageClick}
            >
              {media}
              {imageHint ? (
                <span className="absolute inset-0 flex items-center justify-center bg-sidebar/60 text-xs font-medium text-sidebar-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  {imageHint}
                </span>
              ) : null}
            </button>
          ) : (
            media
          )}
          {status ? <StatusChip status={status} /> : null}
          <div className="pointer-events-none absolute bottom-3 left-3 z-10 inline-flex items-center rounded-full bg-sidebar/80 px-2.5 py-1 text-xs font-medium text-sidebar-foreground backdrop-blur-sm">
            {name}
          </div>
        </div>

        <div className="flex flex-col gap-3 p-3 sm:p-4">
          <div className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-border sm:p-0 sm:py-3">
            <div className="space-y-1 sm:px-3">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock3 className="size-3.5" />
                <p className="text-xs">Duración del turno</p>
              </div>
              <p className="text-base font-semibold">{durationMinutes} min</p>
            </div>
            <div className="space-y-1 sm:px-3">
              <p className="text-xs text-muted-foreground">Precios del día</p>
              {priceRanges.length === 0 ? (
                <p className="text-sm text-muted-foreground">{pricesEmptyMessage}</p>
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
              <span className="font-medium capitalize text-muted-foreground">{dateLabel}</span>
            </p>
            {slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">{slotsEmptyMessage}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {slots.map((slot) => {
                  const pending = slot.pending === true;
                  const className = cn(
                    "rounded-full border px-3 py-1 text-xs font-medium",
                    pending
                      ? "border-warning bg-warning/15 text-sidebar"
                      : "border-border bg-card text-muted-foreground",
                  );
                  const body = (
                    <>
                      {slot.label}
                      {slot.price != null ? (
                        <span className="text-foreground"> · {formatArs(slot.price)}</span>
                      ) : null}
                    </>
                  );
                  return slot.onSelect ? (
                    <button
                      key={slot.key}
                      type="button"
                      className={cn(
                        className,
                        pending ? "hover:bg-warning/25" : "transition-colors hover:bg-muted hover:text-foreground",
                      )}
                      onClick={slot.onSelect}
                    >
                      {body}
                    </button>
                  ) : (
                    <span key={slot.key} className={className}>
                      {body}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function StatusChip({ status }: { status: CourtListingStatus }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute top-3 left-3 z-10 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm",
        status.tone === "available" && "border-primary/40 bg-card/90 text-sidebar",
        status.tone === "occupied" && "border-warning/50 bg-card/90 text-foreground",
        status.tone === "closed" && "border-border bg-card/90 text-muted-foreground",
        status.tone === "neutral" && "border-border bg-card/90 text-muted-foreground",
      )}
    >
      {status.tone !== "neutral" ? (
        <span
          className={cn(
            "size-1.5 rounded-full",
            status.tone === "available" && "bg-primary",
            status.tone === "occupied" && "bg-warning",
            status.tone === "closed" && "bg-muted-foreground",
          )}
          aria-hidden
        />
      ) : null}
      {status.label}
    </span>
  );
}
