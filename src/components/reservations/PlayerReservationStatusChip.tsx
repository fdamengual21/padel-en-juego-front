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
    className: "border-transparent! bg-warning-muted! text-warning-foreground",
  },
  booked: {
    label: "Confirmado",
    className: "border-transparent! bg-success-muted! text-success-foreground",
  },
  rejected: {
    label: "Rechazada",
    className: "border-transparent! bg-destructive-muted! text-destructive",
  },
  completed: {
    label: "Jugado",
    className: "border-transparent! bg-muted! text-muted-foreground",
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
