import { Sparkles, Wrench } from "lucide-react";
import { StatusChip } from "@/components/StatusChip";

interface CourtScheduleStatusChipProps {
  status: "comingSoon" | "maintenance";
}

export default function CourtScheduleStatusChip({ status }: CourtScheduleStatusChipProps) {
  return status === "comingSoon" ? (
    <StatusChip tone="upcoming" label="Próximamente" icon={Sparkles} className="h-auto px-3 py-1" />
  ) : (
    <StatusChip tone="warning" label="En mantenimiento" icon={Wrench} className="h-auto px-3 py-1" />
  );
}
