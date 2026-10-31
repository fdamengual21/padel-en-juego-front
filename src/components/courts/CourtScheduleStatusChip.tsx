import { Sparkles, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

interface CourtScheduleStatusChipProps {
  status: "comingSoon" | "maintenance";
}

export default function CourtScheduleStatusChip({ status }: CourtScheduleStatusChipProps) {
  const comingSoon = status === "comingSoon";
  const Icon = comingSoon ? Sparkles : Wrench;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        comingSoon
          ? "border-primary/40 bg-primary/15 text-foreground"
          : "border-warning/50 bg-warning-muted text-foreground",
      )}
    >
      <Icon className="size-3" aria-hidden />
      {comingSoon ? "Próximamente" : "En mantenimiento"}
    </span>
  );
}
