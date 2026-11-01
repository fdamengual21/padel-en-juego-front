import { Check, X } from "lucide-react";
import { StatusChip, type StatusTone } from "@/components/StatusChip";
import type { PlayerReservationStatus } from "@/modules/reservations";

interface PlayerReservationStatusChipProps {
  status: PlayerReservationStatus;
  isFixed?: boolean;
  withIcon?: boolean;
  className?: string;
}

const chips: Record<PlayerReservationStatus, { label: string; tone: StatusTone }> = {
  pending: { label: "Pendiente", tone: "warning" },
  booked: { label: "Confirmado", tone: "success" },
  rejected: { label: "Rechazada", tone: "danger" },
  completed: { label: "Jugado", tone: "done" },
};

export default function PlayerReservationStatusChip({
  status,
  isFixed = false,
  withIcon = true,
  className,
}: PlayerReservationStatusChipProps) {
  const chip = chips[status];
  const icon = !withIcon
    ? null
    : status === "booked" && !isFixed
      ? Check
      : status === "rejected"
        ? X
        : undefined;
  return (
    <StatusChip
      tone={chip.tone}
      label={isFixed ? "Fijo" : chip.label}
      icon={icon}
      className={className}
      data-testid="player-reservation-status"
    />
  );
}
