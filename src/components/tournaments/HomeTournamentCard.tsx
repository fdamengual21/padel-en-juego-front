import { Link } from "react-router-dom";
import { useState } from "react";
import { StatusChip, type StatusTone } from "@/components/StatusChip";
import StatusBadge from "@/components/tournaments/StatusBadge";
import type { Tournament } from "@/domain";
import { formatDateRangeShortEs } from "@/lib/dates";
import { tournamentStatusView } from "@/modules/tournaments/flows";

/** Campos que pinta la card. Un `Tournament` completo también entra. */
export type HomeTournamentCardData = Pick<
  Tournament,
  "id" | "name" | "status" | "startDate" | "endDate"
> &
  Partial<
    Pick<
      Tournament,
      | "clubName"
      | "clubCoverUrl"
      | "clubAvatarUrl"
      | "bannerUrl"
      | "categories"
      | "myRegistrationStatus"
      | "weekIndex"
      | "rankingWeekCount"
      | "rankingCircuitId"
      | "registrationOpensAt"
      | "visibleFrom"
    >
  >;

interface HomeTournamentCardProps {
  tournament: HomeTournamentCardData;
  to: string;
}

const inscriptionChip: Record<string, { label: string; tone: StatusTone }> = {
  ACCEPTED: { label: "Inscripto", tone: "success" },
  PENDING: { label: "Pendiente", tone: "warning" },
  WAITLIST: { label: "Lista de espera", tone: "neutral" },
};

export default function HomeTournamentCard({
  tournament,
  to,
}: HomeTournamentCardProps) {
  const [failed, setFailed] = useState(false);
  const photo = failed
    ? null
    : (tournament.bannerUrl ?? tournament.clubCoverUrl ?? tournament.clubAvatarUrl);
  const category =
    tournament.categories?.map((item) => item.name).filter(Boolean).join(" · ") || "Sin categoría";
  const week =
    tournament.weekIndex && tournament.rankingWeekCount
      ? `Fecha ${tournament.weekIndex} de ${tournament.rankingWeekCount}`
      : null;
  const meta = [tournament.clubName, category, week].filter(Boolean).join(" · ");
  const chip = tournament.myRegistrationStatus
    ? inscriptionChip[tournament.myRegistrationStatus]
    : undefined;
  const statusView = tournamentStatusView(tournament);

  return (
    <Link
      to={to}
      className="flex min-w-0 cursor-pointer gap-3 overflow-hidden rounded-xl border border-border bg-card p-3.5 text-left"
      data-testid={`home-tournament-${tournament.id}`}
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
            {initials(tournament.clubName || tournament.name)}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="min-w-0 truncate text-sm font-semibold tracking-tight">
          {tournament.name}
        </p>
        <div className="flex min-w-0 items-center gap-2">
          <p className="min-w-0 truncate text-sm text-muted-foreground">{meta}</p>
          {chip ? <StatusChip tone={chip.tone} label={chip.label} /> : null}
        </div>
        <div className="mt-auto flex min-w-0 items-center gap-2">
          <StatusBadge
            status={statusView.status}
            label={statusView.label}
            className="min-w-0 w-fit max-w-full shrink"
          />
          <span className="ml-auto shrink-0 text-xs font-bold text-foreground">
            {formatDateRangeShortEs(tournament.startDate, tournament.endDate)}
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
