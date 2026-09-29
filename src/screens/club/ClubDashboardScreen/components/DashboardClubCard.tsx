import { Link } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { ChevronRight, MapPin, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { isoWeekdayFromDate, type Tournament } from "@/domain";
import { cn } from "@/lib/utils";
import type { ClubSettings } from "@/modules/clubs";
import type { ClubSession } from "@/stores/clubSessionStore";

dayjs.locale("es");

interface StatSlot {
  label: string;
  value: number | null;
  href?: string;
  isLoading: boolean;
  isError: boolean;
  hidden: boolean;
}

interface DashboardClubCardProps {
  session: ClubSession | null;
  settings: ClubSettings | undefined;
  settingsLoading: boolean;
  settingsError: boolean;
  canSeeSettings: boolean;
  courts: StatSlot;
  clients: StatSlot;
  fixed: StatSlot;
  tournament: Tournament | null;
  tournamentLoading: boolean;
  tournamentError: boolean;
  showTournament: boolean;
  tournamentHref?: string;
}

export default function DashboardClubCard({
  session,
  settings,
  settingsLoading,
  settingsError,
  canSeeSettings,
  courts,
  clients,
  fixed,
  tournament,
  tournamentLoading,
  tournamentError,
  showTournament,
  tournamentHref,
}: DashboardClubCardProps) {
  const name = settings?.name?.trim() || session?.name?.trim() || "Club";
  const open = isClubOpenNow(session);
  const place = placeLabel(settings);
  const stats = [courts, clients, fixed].filter((stat) => !stat.hidden);
  const colsClass = stats.length <= 1 ? "grid-cols-1" : stats.length === 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <section className="h-full overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative h-28 bg-muted">
        {settingsLoading ? (
          <div className="h-full animate-pulse bg-muted" aria-hidden />
        ) : settings?.coverUrl ? (
          <img src={settings.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar/80 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-2 p-3">
          <ClubMark name={name} avatarUrl={settingsLoading ? null : settings?.avatarUrl} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">{name}</p>
          </div>
          {session ? (
            <Badge
              variant="secondary"
              className={cn(
                "border-transparent",
                open
                  ? "bg-success/20 text-sidebar-foreground"
                  : "bg-sidebar-foreground/15 text-sidebar-foreground",
              )}
            >
              {open ? "Abierto" : "Cerrado"}
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="space-y-3 p-4">
        {canSeeSettings && settingsLoading ? (
          <div className="h-4 w-40 animate-pulse rounded bg-muted" aria-hidden />
        ) : settingsError ? (
          <p className="text-xs text-muted-foreground">No se pudo cargar la ficha.</p>
        ) : place ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{place}</span>
          </p>
        ) : null}
        {stats.length > 0 ? (
          <div className={cn("grid divide-x divide-border", colsClass)}>
            {stats.map((stat) => (
              <StatCell key={stat.label} stat={stat} />
            ))}
          </div>
        ) : null}
        {showTournament ? (
          <TournamentRow
            tournament={tournament}
            isLoading={tournamentLoading}
            isError={tournamentError}
            href={tournamentHref}
          />
        ) : null}
      </div>
    </section>
  );
}

function StatCell({ stat }: { stat: StatSlot }) {
  const body = (
    <div className="px-2 text-center first:pl-0 last:pr-0">
      {stat.isLoading ? (
        <div className="mx-auto h-6 w-8 animate-pulse rounded bg-muted" aria-hidden />
      ) : (
        <p className="text-xl font-semibold tabular-nums">
          {stat.isError || stat.value == null ? "—" : stat.value}
        </p>
      )}
      <p className="text-xs text-muted-foreground">{stat.label}</p>
    </div>
  );
  if (!stat.href || stat.isLoading) return body;
  return (
    <Link to={stat.href} className="hover:text-foreground">
      {body}
    </Link>
  );
}

function TournamentRow({
  tournament,
  isLoading,
  isError,
  href,
}: {
  tournament: Tournament | null;
  isLoading: boolean;
  isError: boolean;
  href?: string;
}) {
  if (isLoading) {
    return <div className="h-12 animate-pulse rounded-lg bg-muted" aria-hidden />;
  }
  const content = (
    <div className="flex items-center gap-2 border-t border-border pt-3">
      <Trophy className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">Próximo torneo</p>
        {isError ? (
          <p className="text-sm text-muted-foreground">No se pudo cargar.</p>
        ) : tournament ? (
          <>
            <p className="truncate text-sm font-medium">{tournament.name}</p>
            <p className="text-xs text-muted-foreground">{formatRange(tournament)}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Sin torneos próximos</p>
        )}
      </div>
      {href && tournament ? <ChevronRight className="size-4 text-muted-foreground" aria-hidden /> : null}
    </div>
  );
  if (!href || !tournament) return content;
  return <Link to={href}>{content}</Link>;
}

function ClubMark({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt="" className="size-9 rounded-lg object-cover" />;
  }
  const letter = name.trim().charAt(0).toUpperCase() || "C";
  return (
    <span className="flex size-9 items-center justify-center rounded-lg bg-sidebar-foreground/15 text-sm font-semibold text-sidebar-foreground">
      {letter}
    </span>
  );
}

function placeLabel(settings: ClubSettings | undefined): string {
  if (!settings) return "";
  const city = [settings.municipalityName, settings.provinceName].filter(Boolean).join(", ");
  return city;
}

function formatRange(tournament: Tournament): string {
  const start = dayjs(tournament.startDate);
  if (!start.isValid()) return "";
  const startLabel = start.format("D MMM").replace(".", "");
  if (!tournament.endDate) return startLabel;
  const end = dayjs(tournament.endDate);
  if (!end.isValid()) return startLabel;
  return `${startLabel} – ${end.format("D MMM").replace(".", "")}`;
}

function isClubOpenNow(session: ClubSession | null): boolean {
  if (!session?.isActive || !session.openTime || !session.closeTime) return false;
  const now = new Date();
  if (!session.openDays.includes(isoWeekdayFromDate(now))) return false;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const open = toMinutes(session.openTime);
  const close = toMinutes(session.closeTime);
  if (open == null || close == null) return false;
  if (close > open) return nowMin >= open && nowMin < close;
  return nowMin >= open || nowMin < close;
}

function toMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}
