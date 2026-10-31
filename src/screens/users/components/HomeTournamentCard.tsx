import { Link } from "react-router-dom";
import dayjs from "dayjs";
import { useState } from "react";
import StatusBadge from "@/components/tournaments/StatusBadge";
import { Badge } from "@/components/ui/badge";
import type { Tournament } from "@/domain";
import { parseIsoDateOnly } from "@/lib/dates";

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
    >
  >;

interface HomeTournamentCardProps {
  tournament: HomeTournamentCardData;
  to: string;
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
}: HomeTournamentCardProps) {
  const [failed, setFailed] = useState(false);
  const photo = failed
    ? null
    : (tournament.bannerUrl ?? tournament.clubCoverUrl ?? tournament.clubAvatarUrl);
  const category =
    tournament.categories?.map((item) => item.name).filter(Boolean).join(" · ") || "Sin categoría";
  const meta = tournament.clubName ? `${tournament.clubName} · ${category}` : category;
  const chip = tournament.myRegistrationStatus
    ? inscriptionChip[tournament.myRegistrationStatus]
    : undefined;

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
          {chip ? (
            <Badge
              variant="secondary"
              className={`h-auto shrink-0 px-1.5 py-0.5 text-xs font-medium ${chip.className}`}
            >
              {chip.label}
            </Badge>
          ) : null}
        </div>
        <div className="mt-auto flex min-w-0 items-center gap-2">
          <StatusBadge status={tournament.status} className="min-w-0 w-fit max-w-full shrink" />
          <span className="ml-auto shrink-0 text-xs font-bold text-foreground">
            {formatRange(tournament.startDate, tournament.endDate)}
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
  const endDate = end ?? start;
  const sameDay = dayjs(start).isSame(endDate, "day");
  const currentYear = dayjs().year();
  const startYear = dayjs(start).year();
  const endYear = dayjs(endDate).year();
  const spansYears = startYear !== endYear;
  const showYear = spansYears || startYear !== currentYear || endYear !== currentYear;

  if (sameDay) return stamp(start, showYear);
  return `${stamp(start, spansYears)} – ${stamp(endDate, showYear)}`;
}

function stamp(date: Date, withYear: boolean): string {
  return dayjs(date)
    .format(withYear ? "DD MMM YYYY" : "DD MMM")
    .replace(/\./g, "");
}
