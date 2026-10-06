import { Link } from "react-router-dom";
import dayjs from "dayjs";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import StatusBadge from "@/components/tournaments/StatusBadge";
import { Badge } from "@/components/ui/badge";
import type { Tournament } from "@/domain";
import { parseIsoDateOnly } from "@/lib/dates";

interface HomeTournamentCardProps {
  tournament: Tournament;
  to: string;
  /** En el club la foto del predio se repite en todas las filas. */
  showImage?: boolean;
  /** En el club el nombre del predio también se repite. */
  showClubName?: boolean;
}

const inscriptionChip: Record<string, { label: string; className: string }> = {
  ACCEPTED: {
    label: "Inscripto",
    className: "border-transparent! bg-success/15! text-success",
  },
  PENDING: {
    label: "Pendiente",
    className:
      "border-transparent! bg-[color-mix(in_oklch,var(--warning)_18%,var(--card))]! text-warning",
  },
  WAITLIST: {
    label: "Lista de espera",
    className: "border-transparent! bg-muted! text-muted-foreground",
  },
};

export default function HomeTournamentCard({
  tournament,
  to,
  showImage = true,
  showClubName = true,
}: HomeTournamentCardProps) {
  const [failed, setFailed] = useState(false);
  const photo = failed ? null : (tournament.clubCoverUrl ?? tournament.clubAvatarUrl);
  const category =
    tournament.categories?.map((item) => item.name).filter(Boolean).join(" · ") || "Sin categoría";
  const chip = tournament.myRegistrationStatus
    ? inscriptionChip[tournament.myRegistrationStatus]
    : undefined;

  return (
    <Link
      to={to}
      className="flex gap-3 rounded-xl border border-border bg-card p-3.5 text-left"
      data-testid={`home-tournament-${tournament.id}`}
    >
      {showImage ? (
        <div className="relative size-[72px] shrink-0 overflow-hidden rounded-md bg-muted">
          {photo ? (
            <img
              src={photo}
              alt=""
              className="absolute inset-0 size-full object-cover"
              onError={() => setFailed(true)}
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-muted-foreground">
              {initials(tournament.clubName || tournament.name)}
            </span>
          )}
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold tracking-tight">{tournament.name}</p>
          <StatusBadge status={tournament.status} className="shrink-0" />
        </div>
        {showClubName && tournament.clubName ? (
          <p className="truncate text-sm text-muted-foreground">{tournament.clubName}</p>
        ) : null}
        <p className="truncate text-sm text-muted-foreground">{category}</p>
        <div className="mt-auto flex items-center gap-2 pt-2">
          {chip ? (
            <Badge
              variant="secondary"
              className={`h-auto shrink-0 px-1.5 py-0.5 text-xs font-medium ${chip.className}`}
            >
              {chip.label}
            </Badge>
          ) : (
            <span className="min-w-0 flex-1" />
          )}
          <span className="ml-auto shrink-0 text-xs font-bold text-foreground">
            {formatRange(tournament.startDate, tournament.endDate)}
          </span>
          <span className="inline-flex shrink-0 items-center text-xs font-medium text-primary-strong">
            Ver torneo
            <ChevronRight className="size-3.5" aria-hidden />
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
  return letters || "T";
}

function formatRange(startIso: string, endIso: string | null | undefined): string {
  const start = parseIsoDateOnly(startIso);
  const end = parseIsoDateOnly(endIso ?? startIso);
  if (!start) return "";
  const sameDay = !end || dayjs(start).isSame(end, "day");
  if (sameDay) return stamp(start, true);
  return `${stamp(start, false)} – ${stamp(end, true)}`;
}

function stamp(date: Date, withYear: boolean): string {
  return dayjs(date)
    .format(withYear ? "DD MMM YYYY" : "DD MMM")
    .replace(/\./g, "");
}
