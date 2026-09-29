import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardIconWellProps {
  icon: LucideIcon;
  tone?: "muted" | "warning" | "accent";
}

export default function DashboardIconWell({
  icon: Icon,
  tone = "muted",
}: DashboardIconWellProps) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg",
        tone === "muted" && "bg-muted text-muted-foreground",
        tone === "warning" && "bg-warning/15 text-warning",
        tone === "accent" && "bg-primary/40 text-primary-foreground",
      )}
    >
      <Icon className="size-4" aria-hidden />
    </span>
  );
}
