import { cn } from "@/lib/utils";

export interface CourtStatusChipStatus {
  label: string;
  tone: "available" | "occupied" | "closed" | "neutral";
}

interface CourtStatusChipProps {
  status: CourtStatusChipStatus;
}

export default function CourtStatusChip({ status }: CourtStatusChipProps) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute top-3 left-3 z-10 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm",
        status.tone === "available" && "border-primary/40 bg-card/90 text-foreground",
        status.tone === "occupied" && "border-warning/50 bg-card/90 text-foreground",
        status.tone === "closed" && "border-border bg-card/90 text-muted-foreground",
        status.tone === "neutral" && "border-border bg-card/90 text-muted-foreground",
      )}
    >
      {status.tone !== "neutral" ? (
        <span
          className={cn(
            "size-1.5 rounded-full",
            status.tone === "available" && "bg-primary",
            status.tone === "occupied" && "bg-warning",
            status.tone === "closed" && "bg-muted-foreground",
          )}
          aria-hidden
        />
      ) : null}
      {status.label}
    </span>
  );
}
