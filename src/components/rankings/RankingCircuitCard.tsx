import { useState } from "react";
import { Link } from "react-router-dom";
import StatusBadge from "@/components/tournaments/StatusBadge";
import { formatDateRangeShortEs } from "@/lib/dates";
import type { ClubRankingCircuit } from "@/modules/rankings";

interface RankingCircuitCardProps {
  circuit: ClubRankingCircuit;
  to: string;
  /** En el backoffice del club el nombre del club sobra. */
  showClub?: boolean;
}

export default function RankingCircuitCard({
  circuit,
  to,
  showClub = true,
}: RankingCircuitCardProps) {
  const [failed, setFailed] = useState(false);
  const photo = failed
    ? null
    : (circuit.flyerUrl ?? circuit.clubCoverUrl ?? circuit.clubAvatarUrl);
  const meta = [
    showClub ? circuit.clubName : null,
    circuit.categoryName,
    `${circuit.weekCount} fechas`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      to={to}
      className="flex min-w-0 cursor-pointer gap-3 overflow-hidden rounded-xl border border-border bg-card p-3.5 text-left"
      data-testid={`ranking-circuit-${circuit.id}`}
    >
      <div className="relative w-[72px] shrink-0 self-stretch overflow-hidden rounded-md bg-muted">
        {photo ? (
          <img
            src={photo}
            alt=""
            className="absolute inset-0 size-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-muted-foreground">
            {initials(circuit.clubName || circuit.name)}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="min-w-0 truncate text-sm font-semibold tracking-tight">{circuit.name}</p>
        <p className="min-w-0 truncate text-sm text-muted-foreground">{meta}</p>
        <div className="mt-auto flex min-w-0 items-center gap-2">
          <StatusBadge status={circuit.status} className="min-w-0 w-fit max-w-full shrink" />
          <span className="ml-auto shrink-0 text-xs font-bold text-foreground">
            {formatDateRangeShortEs(circuit.firstDate, circuit.lastDate)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  return letters || "R";
}
