import { memo } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import { ChevronRight } from "lucide-react";
import StatusBadge from "@/components/tournaments/StatusBadge";
import type { Tournament } from "@/domain";
import { parseIsoDateOnly } from "@/lib/dates";

interface DashboardTournamentRowProps {
  tournament: Tournament;
  to: string;
}

function DashboardTournamentRow({ tournament, to }: DashboardTournamentRowProps) {
  const category =
    tournament.categories?.map((item) => item.name).filter(Boolean).join(" · ") || null;

  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5"
      data-testid={`dashboard-tournament-${tournament.id}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold tracking-tight">{tournament.name}</p>
          <StatusBadge status={tournament.status} className="shrink-0" />
        </div>
        {category ? (
          <p className="mt-1 truncate text-sm text-muted-foreground">{category}</p>
        ) : null}
        <p className="mt-1 text-xs font-bold text-foreground">
          {formatRange(tournament.startDate, tournament.endDate)}
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
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

export default memo(DashboardTournamentRow);
