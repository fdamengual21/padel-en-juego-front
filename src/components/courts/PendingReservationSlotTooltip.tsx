import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PendingReservationSlotTooltipProps {
  children: ReactNode;
}

export default function PendingReservationSlotTooltip({
  children,
}: PendingReservationSlotTooltipProps) {
  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          {children}
        </TooltipTrigger>
        <TooltipContent>Hay un pedido pendiente de confirmar.</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
