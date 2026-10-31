import { useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import ImageViewerDialog from "@/components/ImageViewerDialog";
import CourtListingCard, { type CourtListingStatus } from "@/components/courts/CourtListingCard";
import CourtScheduleStatusChip from "@/components/courts/CourtScheduleStatusChip";
import {
  COURT_STATUS_LABELS,
  isoWeekdayFromDate,
  isCourtBookable,
  listDayPriceRanges,
  type WeekdayIso,
} from "@/domain";
import type { PublicClubSlot, PublicCourt } from "@/modules/clubs";

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
  const [viewerOpen, setViewerOpen] = useState(false);
  const weekday = isoWeekdayFromDate(selectedDate.toDate());
  const bookable = isCourtBookable(court.status);
  const priceRanges = listDayPriceRanges({
    openTime,
    closeTime,
    openDays,
    weekday,
    basePrice: court.basePrice,
    rules: court.priceRules,
  });
  const clubOpensToday = openDays.includes(weekday);
  const scheduleStatus =
    court.status === "comingSoon" || court.status === "maintenance" ? court.status : null;
  const status = listingStatus(court, freeSlots.length, clubOpensToday);

  return (
    <>
      <CourtListingCard
        name={court.name}
        imageUrl={court.imageUrl}
        testId={`public-court-card-${court.id}`}
        durationMinutes={court.slotDurationMinutes}
        dateLabel={dayjs(selectedDate).format("dddd D [de] MMMM")}
        priceRanges={priceRanges}
        pricesEmptyMessage={
          clubOpensToday ? "Sin horario de precios." : "El club no abre este día."
        }
        slots={
          bookable
            ? freeSlots.map((slot) => ({
                key: slot.startsAt,
                label: slot.label,
                price: slot.price,
                onSelect: () => onSelectSlot(slot),
              }))
            : []
        }
        slotsEmptyMessage="Sin turnos libres este día."
        slotsEmpty={
          scheduleStatus ? <CourtScheduleStatusChip status={scheduleStatus} /> : undefined
        }
        status={status}
        onImageClick={court.imageUrl ? () => setViewerOpen(true) : undefined}
        imageClickLabel={`Ver foto de ${court.name}`}
      />
      <ImageViewerDialog
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        mode="cover"
        title={court.name}
        imageUrl={court.imageUrl}
        fallbackName={court.name}
      />
    </>
  );
}

function listingStatus(
  court: PublicCourt,
  freeCount: number,
  clubOpensToday: boolean,
): CourtListingStatus | null {
  if (court.status === "maintenance") {
    return { label: COURT_STATUS_LABELS.maintenance, tone: "occupied" };
  }
  if (court.status === "comingSoon") {
    return { label: COURT_STATUS_LABELS.comingSoon, tone: "available" };
  }
  if (freeCount > 0) return { label: "Disponible", tone: "available" };
  if (!clubOpensToday) return { label: "Cerrado", tone: "closed" };
  return null;
}
