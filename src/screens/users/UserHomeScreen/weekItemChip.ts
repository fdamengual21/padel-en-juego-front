import type { StatusTone } from "@/components/StatusChip";
import type { PlayerWeekItem } from "@/domain";
import { roundSectionLabel } from "@/lib/tournamentLabels";
import type { PlayerReservation, PlayerReservationStatus } from "@/modules/reservations";

export interface WeekItemChip {
  label: string;
  tone: StatusTone;
}

const reservationChips: Record<PlayerReservationStatus, WeekItemChip> = {
  pending: { label: "Pendiente", tone: "warning" },
  booked: { label: "Confirmado", tone: "success" },
  rejected: { label: "Rechazada", tone: "danger" },
  completed: { label: "Jugado", tone: "done" },
};

const registrationChips: Record<string, WeekItemChip> = {
  ACCEPTED: { label: "Inscripto", tone: "success" },
  PENDING: { label: "Pendiente", tone: "warning" },
  WAITLIST: { label: "Lista de espera", tone: "neutral" },
};

/** Chip de la fila de agenda según el tipo de ítem. */
export function weekChip(item: PlayerWeekItem): WeekItemChip | null {
  switch (item.type) {
    case "reservation":
      if (item.isFixed) return { label: "Fijo", tone: "success" };
      return reservationChips[item.status as PlayerReservationStatus] ?? null;
    case "quality":
      return registrationChips[item.status] ?? null;
    case "match":
      return { label: roundSectionLabel(item.status), tone: "upcoming" };
    default:
      return null;
  }
}

/** Reconstruye la reserva del modal desde el ítem unificado. */
export function toReservation(item: PlayerWeekItem): PlayerReservation | null {
  if (item.type !== "reservation" || !item.club) return null;
  const status =
    item.status === "pending" ||
    item.status === "booked" ||
    item.status === "rejected" ||
    item.status === "completed"
      ? item.status
      : null;
  if (!status) return null;
  return {
    id: item.id,
    club: item.club,
    courtName: item.courtName ?? "",
    courtImageUrl: item.imageUrl,
    startsAt: item.startsAt,
    endsAt: item.endsAt ?? item.startsAt,
    status,
    price: item.price ?? 0,
    rejectedReason: item.rejectedReason,
    isFixed: item.isFixed,
  };
}
