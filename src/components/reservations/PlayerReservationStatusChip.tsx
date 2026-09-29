import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PlayerReservationStatus } from "@/modules/reservations";

interface PlayerReservationStatusChipProps {
  status: PlayerReservationStatus;
  isFixed?: boolean;
  withIcon?: boolean;
  className?: string;
}

const chips: Record<PlayerReservationStatus, { label: string; className: string }> = {
  pending: {
    label: "Pendiente",
    className:
      "border-transparent! bg-[color-mix(in_oklch,var(--warning)_18%,var(--card))]! text-warning",
  },
  booked: {
    label: "Confirmada",
    className: "border-transparent! bg-success/15! text-success",
  },
  rejected: {
    label: "Rechazada",
    className:
      "border-transparent! bg-[color-mix(in_oklch,var(--destructive)_16%,var(--card))]! text-destructive",
  },
};

export default function PlayerReservationStatusChip({
  status,
  isFixed = false,
  withIcon = true,
  className,
}: PlayerReservationStatusChipProps) {
  const chip = chips[status];
  return (
    <Badge
      variant="secondary"
      className={cn("h-auto max-w-full gap-1 px-1.5 py-0.5 text-xs font-medium", chip.className, className)}
      data-testid="player-reservation-status"
    >
      {withIcon && status === "booked" && !isFixed ? <Check aria-hidden /> : null}
      {withIcon && status === "rejected" ? <X aria-hidden /> : null}
      <span className="truncate">{isFixed ? "Fijo" : chip.label}</span>
    </Badge>
  );
}
