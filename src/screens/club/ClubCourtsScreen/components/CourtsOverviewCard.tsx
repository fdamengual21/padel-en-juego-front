import dayjs from "dayjs";
import "dayjs/locale/es";
import CourtListingCard, { type CourtListingStatus } from "@/components/courts/CourtListingCard";
import type { CourtAvailableSlot, CourtDayOverviewItem, CourtLiveStatus } from "@/domain";
import { COURT_STATUS_LABELS } from "@/domain";

interface CourtsOverviewCardProps {
  items: CourtDayOverviewItem[];
  onSelectSlot?: (courtId: string, slot: CourtAvailableSlot) => void;
  onOpenDetail: (courtId: string) => void;
}

dayjs.locale("es");

function statusOf(item: CourtDayOverviewItem): CourtListingStatus {
  if (item.court.status !== "active") {
    return { label: COURT_STATUS_LABELS[item.court.status], tone: "neutral" };
  }
  return liveStatusChip(item.liveStatus);
}

function liveStatusChip(status: CourtLiveStatus): CourtListingStatus {
  if (status === "available") return { label: "Disponible", tone: "available" };
  if (status === "occupied") return { label: "Ocupada", tone: "occupied" };
  return { label: "Cerrado", tone: "closed" };
}

export default function CourtsOverviewCard({
  items,
  onSelectSlot,
  onOpenDetail,
}: CourtsOverviewCardProps) {
  return (
    <div className="flex flex-col gap-3" data-testid="courts-overview-card">
      {items.map((item) => (
        <CourtListingCard
          key={item.court.id}
          name={item.court.name}
          imageUrl={item.court.imageUrl}
          testId={`club-court-card-${item.court.id}`}
          durationMinutes={item.court.slotDurationMinutes}
          dateLabel={dayjs(item.date).format("dddd D [de] MMMM")}
          priceRanges={item.priceBands}
          pricesEmptyMessage={item.message || "Sin horario de precios."}
          slots={item.availableSlots.map((slot) => ({
            key: slot.startsAt,
            label: slot.label,
            pending: slot.status === "pending",
            onSelect: onSelectSlot ? () => onSelectSlot(item.court.id, slot) : undefined,
          }))}
          slotsEmptyMessage={item.message || "Sin turnos libres este día."}
          status={statusOf(item)}
          onImageClick={() => onOpenDetail(item.court.id)}
          imageClickLabel={`Ver detalle de ${item.court.name}`}
          imageHint="Ver detalle"
        />
      ))}
    </div>
  );
}
