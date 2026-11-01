import { StatusChip, type StatusTone } from "@/components/StatusChip";

export interface CourtStatusChipStatus {
  label: string;
  tone: "available" | "occupied" | "closed" | "neutral";
}

interface CourtStatusChipProps {
  status: CourtStatusChipStatus;
  className?: string;
}

const toneByCourtTone: Record<CourtStatusChipStatus["tone"], StatusTone> = {
  available: "open",
  occupied: "warning",
  closed: "neutral",
  neutral: "neutral",
};

export default function CourtStatusChip({ status, className }: CourtStatusChipProps) {
  return (
    <StatusChip tone={toneByCourtTone[status.tone]} label={status.label} className={className} />
  );
}
