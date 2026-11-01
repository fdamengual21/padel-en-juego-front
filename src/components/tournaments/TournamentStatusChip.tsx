import { Check, type LucideIcon } from "lucide-react";
import { StatusChip, type StatusTone } from "@/components/StatusChip";
import type { TournamentStatusView } from "@/modules/tournaments/flows";
import StatusBadge from "./StatusBadge";

interface TournamentStatusChipProps {
  view: Pick<TournamentStatusView, "status" | "label">;
  className?: string;
}

/** Torneo o fecha: tonos propios; el resto de los estados sale de `StatusBadge`. */
const tournamentChips: Record<string, { label: string; tone: StatusTone; icon?: LucideIcon }> = {
  scheduled: { label: "Programado", tone: "upcoming" },
  finished: { label: "Finalizado", tone: "success", icon: Check },
};

export default function TournamentStatusChip({ view, className }: TournamentStatusChipProps) {
  const chip = tournamentChips[view.status];
  if (!chip) return <StatusBadge status={view.status} label={view.label} className={className} />;
  return (
    <StatusChip
      tone={chip.tone}
      icon={chip.icon}
      label={view.label ?? chip.label}
      className={className}
    />
  );
}
